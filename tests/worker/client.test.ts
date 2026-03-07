import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { inspectUrl } from "@/lib/worker/client";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.stubEnv("WORKER_BASE_URL", "https://worker.test");
vi.stubEnv("WORKER_SECRET", "test-secret");

const CALLER_ID = "visitor:abc123";

function mockFetch(
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) {
  return vi.fn().mockResolvedValueOnce(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    }),
  );
}

function mockFetchSequence(
  ...responses: Array<{
    status: number;
    body: Record<string, unknown>;
    headers?: Record<string, string>;
  }>
) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce(
      new Response(JSON.stringify(r.body), {
        status: r.status,
        headers: {
          "content-type": "application/json",
          ...(r.headers ?? {}),
        },
      }),
    );
  }
  return fn;
}

const SUCCESS_BODY = {
  ok: true,
  submittedUrl: "https://app.example.com",
  finalUrl: "https://app.example.com",
  bubbleDetection: { isLikelyBubble: true, signals: ["meta-generator"] },
  summary: { appName: "Test App" },
  database: {},
  optionSets: {},
  pages: {},
  colors: {},
  debugMeta: {},
  consoleMessages: [],
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ─── 200 Success ─────────────────────────────────────────────────────────────

describe("200 success", () => {
  it("returns parsed data on success", async () => {
    vi.stubGlobal("fetch", mockFetch(200, SUCCESS_BODY));

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.submittedUrl).toBe("https://app.example.com");
      expect(result.data.bubbleDetection.isLikelyBubble).toBe(true);
    }
  });

  it("returns data as-is when isLikelyBubble is false", async () => {
    const body = {
      ...SUCCESS_BODY,
      bubbleDetection: { isLikelyBubble: false, signals: [] },
    };
    vi.stubGlobal("fetch", mockFetch(200, body));

    const result = await inspectUrl("https://not-bubble.com", CALLER_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.bubbleDetection.isLikelyBubble).toBe(false);
    }
  });
});

// ─── 400 Bad Request ─────────────────────────────────────────────────────────

describe("400 bad request", () => {
  it("does not retry and returns error", async () => {
    const fetchMock = mockFetch(400, {
      ok: false,
      error: "Invalid URL: only http/https URLs are allowed",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("ftp://bad.url", CALLER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.retryable).toBe(false);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ─── 401 Unauthorized ────────────────────────────────────────────────────────

describe("401 unauthorized", () => {
  it("does not retry and returns config error", async () => {
    const fetchMock = mockFetch(401, {
      ok: false,
      error: "Unauthorized: invalid or missing x-worker-secret header",
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.retryable).toBe(false);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ─── 429 Rate Limited ────────────────────────────────────────────────────────

describe("429 rate limited", () => {
  it("retries once after delay and succeeds", async () => {
    const fetchMock = mockFetchSequence(
      {
        status: 429,
        body: {
          ok: false,
          error: "Rate limit exceeded",
          retryAfterSeconds: 1,
        },
      },
      { status: 200, body: SUCCESS_BODY },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once and returns error if still 429", async () => {
    const fetchMock = mockFetchSequence(
      {
        status: 429,
        body: {
          ok: false,
          error: "Rate limit exceeded",
          retryAfterSeconds: 1,
        },
      },
      {
        status: 429,
        body: {
          ok: false,
          error: "Rate limit exceeded",
          retryAfterSeconds: 1,
        },
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(429);
      expect(result.retryable).toBe(true);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("respects Retry-After header over body", async () => {
    const fetchMock = mockFetchSequence(
      {
        status: 429,
        body: { ok: false, error: "Rate limit", retryAfterSeconds: 60 },
        headers: { "retry-after": "2" },
      },
      { status: 200, body: SUCCESS_BODY },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ─── 503 Service Unavailable ─────────────────────────────────────────────────

describe("503 service unavailable", () => {
  it("retries once after retryAfterSeconds", async () => {
    const fetchMock = mockFetchSequence(
      {
        status: 503,
        body: {
          ok: false,
          error: "Worker is busy",
          retryAfterSeconds: 1,
        },
      },
      { status: 200, body: SUCCESS_BODY },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ─── 504 Gateway Timeout ─────────────────────────────────────────────────────

describe("504 gateway timeout", () => {
  it("retries once with backoff", async () => {
    const fetchMock = mockFetchSequence(
      { status: 504, body: { ok: false, error: "Inspection timed out" } },
      { status: 200, body: SUCCESS_BODY },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns error after failed retry", async () => {
    const fetchMock = mockFetchSequence(
      { status: 504, body: { ok: false, error: "Inspection timed out" } },
      { status: 504, body: { ok: false, error: "Inspection timed out" } },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(504);
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ─── 500 Internal Server Error ───────────────────────────────────────────────

describe("500 internal server error", () => {
  it("retries up to 3 total attempts", async () => {
    const fetchMock = mockFetchSequence(
      { status: 500, body: { ok: false, error: "Inspection failed" } },
      { status: 500, body: { ok: false, error: "Inspection failed" } },
      { status: 500, body: { ok: false, error: "Inspection failed" } },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("succeeds on second attempt", async () => {
    const fetchMock = mockFetchSequence(
      { status: 500, body: { ok: false, error: "Inspection failed" } },
      { status: 200, body: SUCCESS_BODY },
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

// ─── Network Error ───────────────────────────────────────────────────────────

describe("network error", () => {
  it("returns error without retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await inspectUrl("https://app.example.com", CALLER_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.retryable).toBe(false);
      expect(result.error).toContain("Network error");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ─── Request Shape ───────────────────────────────────────────────────────────

describe("request shape", () => {
  it("sends correct headers and body", async () => {
    const fetchMock = mockFetch(200, SUCCESS_BODY);
    vi.stubGlobal("fetch", fetchMock);

    await inspectUrl("https://app.example.com", CALLER_ID);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://worker.test/inspect");
    expect(options.method).toBe("POST");
    expect(options.headers["x-worker-secret"]).toBe("test-secret");
    expect(options.headers["x-caller-id"]).toBe(CALLER_ID);
    expect(JSON.parse(options.body)).toEqual({
      url: "https://app.example.com",
    });
  });
});
