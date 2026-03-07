import type {
  InspectResult,
  InspectSuccessResponse,
  InspectErrorResponse,
  RateLimitInfo,
  WorkerResponse,
} from "./types";

// ─── Config ──────────────────────────────────────────────────────────────────

function getWorkerBaseUrl(): string {
  const url =
    import.meta.env.WORKER_BASE_URL ?? process.env.WORKER_BASE_URL ?? "";
  if (!url) throw new Error("WORKER_BASE_URL is not configured");
  return url.replace(/\/+$/, "");
}

function getWorkerSecret(): string {
  const secret =
    import.meta.env.WORKER_SECRET ?? process.env.WORKER_SECRET ?? "";
  if (!secret) throw new Error("WORKER_SECRET is not configured");
  return secret;
}

function getHttpTimeout(): number {
  const raw =
    import.meta.env.WORKER_HTTP_TIMEOUT_MS ??
    process.env.WORKER_HTTP_TIMEOUT_MS;
  return raw ? Number(raw) : 35_000;
}

// ─── Retry Constants ─────────────────────────────────────────────────────────

const MAX_RETRIES_500 = 2; // up to 3 total attempts for 500
const MAX_RETRIES_RETRYABLE = 1; // 1 retry for 429/503/504
const BACKOFF_500_MS = [500, 1500, 3000];
const BACKOFF_504_MS = 2000;

// ─── Public API ──────────────────────────────────────────────────────────────

export async function inspectUrl(
  url: string,
  callerId: string,
): Promise<InspectResult> {
  const baseUrl = getWorkerBaseUrl();
  const secret = getWorkerSecret();
  const timeout = getHttpTimeout();
  const endpoint = `${baseUrl}/inspect`;

  let lastResult: InspectResult | null = null;
  const maxAttempts = MAX_RETRIES_500 + 1; // worst case (500s)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const isRetry = attempt > 0;
    if (isRetry) {
      console.log(`[worker-client] retry attempt ${attempt} for ${url}`);
    }

    const start = Date.now();
    let response: Response;

    try {
      response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-worker-secret": secret,
          "x-caller-id": callerId,
        },
        body: JSON.stringify({ url }),
        timeout,
      });
    } catch (err) {
      const elapsed = Date.now() - start;
      console.error(
        `[worker-client] network error after ${elapsed}ms:`,
        err instanceof Error ? err.message : err,
      );
      return {
        ok: false,
        status: 0,
        error: "Network error contacting worker",
        details: err instanceof Error ? err.message : String(err),
        retryable: false,
        rateLimits: {},
      };
    }

    const elapsed = Date.now() - start;
    const rateLimits = parseRateLimitHeaders(response.headers);

    console.log(
      `[worker-client] ${response.status} in ${elapsed}ms | caller=${callerId} | url=${url}`,
    );

    // ── 200 Success ────────────────────────────────────────────────────────
    if (response.status === 200) {
      const data = (await response.json()) as InspectSuccessResponse;
      return { ok: true, data, rateLimits };
    }

    // Parse error body (shared across all error statuses)
    let errorBody: InspectErrorResponse;
    try {
      errorBody = (await response.json()) as InspectErrorResponse;
    } catch {
      errorBody = {
        ok: false,
        error: `Worker returned ${response.status} with unparseable body`,
      };
    }

    // ── 400 Bad Request — no retry ─────────────────────────────────────────
    if (response.status === 400) {
      return {
        ok: false,
        status: 400,
        error: errorBody.error ?? "Invalid URL",
        details: errorBody.details,
        retryable: false,
        rateLimits,
      };
    }

    // ── 401 Unauthorized — no retry ────────────────────────────────────────
    if (response.status === 401) {
      console.error(
        "[worker-client] 401 — WORKER_SECRET mismatch or missing",
      );
      return {
        ok: false,
        status: 401,
        error: "Internal config error: worker authorization failed",
        retryable: false,
        rateLimits,
      };
    }

    // ── 429 Rate Limited — retry once after Retry-After ────────────────────
    if (response.status === 429) {
      lastResult = {
        ok: false,
        status: 429,
        error: errorBody.error ?? "Rate limit exceeded",
        details: errorBody.details,
        retryable: true,
        rateLimits,
      };

      if (attempt < MAX_RETRIES_RETRYABLE) {
        const delay = getRetryDelay(response.headers, errorBody);
        console.log(`[worker-client] 429 — waiting ${delay}ms before retry`);
        await sleep(delay);
        continue;
      }
      return lastResult;
    }

    // ── 503 Service Unavailable — retry once after Retry-After ─────────────
    if (response.status === 503) {
      lastResult = {
        ok: false,
        status: 503,
        error: errorBody.error ?? "Worker is busy",
        details: errorBody.details,
        retryable: true,
        rateLimits,
      };

      if (attempt < MAX_RETRIES_RETRYABLE) {
        const delay = getRetryDelay(response.headers, errorBody);
        console.log(`[worker-client] 503 — waiting ${delay}ms before retry`);
        await sleep(delay);
        continue;
      }
      return lastResult;
    }

    // ── 504 Gateway Timeout — retry once with short backoff ────────────────
    if (response.status === 504) {
      lastResult = {
        ok: false,
        status: 504,
        error: errorBody.error ?? "Inspection timed out",
        details: errorBody.details,
        retryable: true,
        rateLimits,
      };

      if (attempt < MAX_RETRIES_RETRYABLE) {
        const delay = BACKOFF_504_MS + jitter();
        console.log(`[worker-client] 504 — waiting ${delay}ms before retry`);
        await sleep(delay);
        continue;
      }
      return lastResult;
    }

    // ── 500 Internal Server Error — retry with exponential backoff ─────────
    if (response.status === 500) {
      lastResult = {
        ok: false,
        status: 500,
        error: errorBody.error ?? "Worker internal error",
        details: errorBody.details,
        retryable: true,
        rateLimits,
      };

      if (attempt < MAX_RETRIES_500) {
        const delay = (BACKOFF_500_MS[attempt] ?? 3000) + jitter();
        console.log(`[worker-client] 500 — waiting ${delay}ms before retry`);
        await sleep(delay);
        continue;
      }
      return lastResult;
    }

    // ── Unknown status — don't retry ───────────────────────────────────────
    return {
      ok: false,
      status: response.status,
      error: errorBody.error ?? `Unexpected status ${response.status}`,
      details: errorBody.details,
      retryable: false,
      rateLimits,
    };
  }

  // Should only reach here after exhausting 500 retries
  return lastResult!;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface FetchWithTimeoutOptions extends RequestInit {
  timeout: number;
}

async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions,
): Promise<Response> {
  const { timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function getRetryDelay(
  headers: Headers,
  body: InspectErrorResponse,
): number {
  const retryAfterHeader = headers.get("retry-after");
  if (retryAfterHeader) {
    const seconds = Number(retryAfterHeader);
    if (!Number.isNaN(seconds)) return seconds * 1000 + jitter();
  }

  if (body.retryAfterSeconds) {
    return body.retryAfterSeconds * 1000 + jitter();
  }

  return 1000 + jitter();
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const num = (key: string) => {
    const val = headers.get(key);
    return val ? Number(val) : undefined;
  };

  return {
    globalLimitMinute: num("x-ratelimit-global-limit-minute"),
    globalLimitHour: num("x-ratelimit-global-limit-hour"),
    globalRemainingMinute: num("x-ratelimit-global-remaining-minute"),
    globalRemainingHour: num("x-ratelimit-global-remaining-hour"),
    callerLimitMinute: num("x-ratelimit-caller-limit-minute"),
    callerLimitHour: num("x-ratelimit-caller-limit-hour"),
    callerRemainingMinute: num("x-ratelimit-caller-remaining-minute"),
    callerRemainingHour: num("x-ratelimit-caller-remaining-hour"),
    retryAfter: num("retry-after"),
  };
}

function jitter(): number {
  return Math.floor(Math.random() * 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
