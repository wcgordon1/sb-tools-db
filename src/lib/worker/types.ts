// ─── Worker Response Shapes ──────────────────────────────────────────────────
// Mirrors the contract in docs/fly-worker-integration.md.
// Subsections are loosely typed until we have a full schema from the worker.

export interface InspectSuccessResponse {
  ok: true;
  submittedUrl: string;
  finalUrl: string;
  bubbleDetection: BubbleDetection;
  summary: Record<string, unknown>;
  database: Record<string, unknown>;
  optionSets: Record<string, unknown>;
  pages: Record<string, unknown>;
  colors: Record<string, unknown>;
  debugMeta: Record<string, unknown>;
  consoleMessages: unknown[];
  warnings?: string[];
}

export interface BubbleDetection {
  isLikelyBubble: boolean;
  signals?: string[];
  [key: string]: unknown;
}

export interface InspectErrorResponse {
  ok: false;
  error: string;
  submittedUrl?: string;
  details?: string;
  limitScope?: string;
  limitWindow?: string;
  limit?: number;
  retryAfterSeconds?: number;
}

export type WorkerResponse = InspectSuccessResponse | InspectErrorResponse;

// ─── Internal Result Wrapper ─────────────────────────────────────────────────
// Used by the client module to communicate outcome + metadata back to callers.

export interface InspectSuccess {
  ok: true;
  data: InspectSuccessResponse;
  rateLimits: RateLimitInfo;
}

export interface InspectError {
  ok: false;
  status: number;
  error: string;
  details?: string;
  retryable: boolean;
  rateLimits: RateLimitInfo;
}

export type InspectResult = InspectSuccess | InspectError;

// ─── Rate Limit Info ─────────────────────────────────────────────────────────

export interface RateLimitInfo {
  globalLimitMinute?: number;
  globalLimitHour?: number;
  globalRemainingMinute?: number;
  globalRemainingHour?: number;
  callerLimitMinute?: number;
  callerLimitHour?: number;
  callerRemainingMinute?: number;
  callerRemainingHour?: number;
  retryAfter?: number;
}

// ─── Request Types ───────────────────────────────────────────────────────────

export interface InspectRequest {
  url: string;
}
