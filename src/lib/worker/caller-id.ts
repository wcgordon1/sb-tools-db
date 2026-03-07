import { createHash } from "node:crypto";

/**
 * Derives a stable caller identity from the incoming request.
 *
 * Priority:
 *   1. workspace:<workspaceId>  (future — from auth context)
 *   2. user:<userId>            (future — from auth context)
 *   3. visitor:<hash>           (hashed fingerprint fallback)
 */
export function deriveCallerId(request: Request): string {
  // TODO: once auth is integrated, check for workspace/user identity first:
  // const workspaceId = getWorkspaceId(request);
  // if (workspaceId) return `workspace:${workspaceId}`;
  // const userId = getUserId(request);
  // if (userId) return `user:${userId}`;

  return `visitor:${hashFingerprint(request)}`;
}

function hashFingerprint(request: Request): string {
  const ip = extractClientIp(request);
  const ua = request.headers.get("user-agent") ?? "unknown";
  const salt = getCallerIdSalt();

  return createHash("sha256")
    .update(`${ip}|${ua}|${salt}`)
    .digest("hex")
    .slice(0, 32);
}

function extractClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "0.0.0.0";
}

function getCallerIdSalt(): string {
  return (
    import.meta.env.CALLER_ID_SALT ??
    process.env.CALLER_ID_SALT ??
    "default-caller-id-salt"
  );
}
