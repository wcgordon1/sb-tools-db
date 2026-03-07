import type { APIContext } from "astro";
import { inspectUrl } from "@/lib/worker/client";
import { deriveCallerId } from "@/lib/worker/caller-id";
import { saveInspectionResult } from "@/lib/worker/storage";

export const prerender = false;

export async function POST({ request }: APIContext): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "Request body must be valid JSON",
    });
  }

  if (!body || typeof body !== "object" || !("url" in body)) {
    return jsonResponse(400, {
      ok: false,
      error: 'Missing required field: "url"',
    });
  }

  const { url } = body as { url: unknown };

  if (typeof url !== "string" || !url.trim()) {
    return jsonResponse(400, {
      ok: false,
      error: '"url" must be a non-empty string',
    });
  }

  try {
    new URL(url);
  } catch {
    return jsonResponse(400, {
      ok: false,
      error: "Invalid URL format",
    });
  }

  const callerId = deriveCallerId(request);
  console.log(
    `[api/inspect] incoming request | caller=${callerId} | url=${url}`,
  );

  let result;
  try {
    result = await inspectUrl(url, callerId);
  } catch (err) {
    console.error(
      "[api/inspect] worker call failed:",
      err instanceof Error ? err.message : err,
    );
    return jsonResponse(500, {
      ok: false,
      error: "Internal server error",
      details:
        import.meta.env.DEV && err instanceof Error
          ? err.message
          : undefined,
    });
  }

  if (result.ok) {
    await saveInspectionResult(result.data);
    return jsonResponse(200, result.data);
  }

  const httpStatus = mapErrorStatus(result.status);

  return jsonResponse(httpStatus, {
    ok: false,
    error: result.error,
    details: result.details,
  });
}

function mapErrorStatus(workerStatus: number): number {
  if (workerStatus === 400) return 400;
  if (workerStatus === 429) return 429;
  if (workerStatus === 503) return 503;
  return 502;
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
