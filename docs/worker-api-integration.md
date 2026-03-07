# Worker API Integration — Technical Reference

> Full documentation of the server-to-server integration between this Astro app and the Bubble Runtime Worker hosted on Fly.dev.

---

## Architecture Overview

```
Browser → Astro API Route (/api/inspect) → Worker Client → Bubble Runtime Worker (Fly.dev)
                ↓                               ↓
        Caller ID derivation            Retry / backoff logic
                                                ↓
                                        Response parsing
                                                ↓
                                    Dev-only local file storage
                                     (data/inspections/*.json)
```

All communication with the worker happens **server-side only**. The browser never talks to Fly.dev directly. Secrets are never exposed to the client.

---

## File Map

| File | Purpose |
|------|---------|
| `src/lib/worker/types.ts` | TypeScript interfaces for request/response payloads |
| `src/lib/worker/client.ts` | HTTP client with retry logic, timeout, rate-limit parsing |
| `src/lib/worker/caller-id.ts` | Per-request caller identity derivation |
| `src/lib/worker/storage.ts` | Dev-only local JSON file persistence |
| `src/pages/api/inspect.ts` | Astro API route — the public endpoint |
| `tests/worker/client.test.ts` | Client tests (success, errors, retries, request shape) |
| `tests/worker/caller-id.test.ts` | Caller ID tests (hashing, stability, IP extraction) |
| `vitest.config.ts` | Vitest configuration with `@` path alias |
| `.env.example` | Environment variable documentation |
| `data/inspections/.gitkeep` | Placeholder so `data/inspections/` is tracked |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WORKER_BASE_URL` | Yes | — | Base URL of the Fly.dev worker (no trailing slash), e.g. `https://bubble-runtime-worker.fly.dev` |
| `WORKER_SECRET` | Yes | — | Shared secret matching the worker's `WORKER_SECRET` env var |
| `CALLER_ID_SALT` | No | `"default-caller-id-salt"` | Salt used for hashed fallback caller identity fingerprint |
| `WORKER_HTTP_TIMEOUT_MS` | No | `35000` | HTTP timeout for worker requests in milliseconds |

Both `import.meta.env.*` and `process.env.*` are checked (in that order) so the variables work in both Astro dev and production/test contexts.

---

## API Route: `POST /api/inspect`

**File:** `src/pages/api/inspect.ts`

This is an Astro server-side route (`export const prerender = false`). It is deployed as a Vercel serverless function in production.

### Request

```json
POST /api/inspect
Content-Type: application/json

{
  "url": "https://app.example.com"
}
```

### Validation Pipeline

1. Parse JSON body — returns `400` if body is not valid JSON.
2. Check `url` field exists — returns `400` if missing.
3. Check `url` is a non-empty string — returns `400` if empty.
4. Validate URL format via `new URL()` — returns `400` if malformed.
5. Derive caller ID from request headers.
6. Forward to worker client.
7. If success: save locally (dev only), return `200` with worker data.
8. If error: map worker status to an appropriate HTTP status and return error JSON.

### Response Status Mapping

| Worker Status | API Route Returns | Reason |
|---------------|-------------------|--------|
| `200` | `200` | Success |
| `400` | `400` | Bad URL or blocked domain |
| `429` | `429` | Rate limited (pass-through) |
| `503` | `503` | Worker busy (pass-through) |
| `401`, `500`, `504`, other | `502` | Upstream error (abstracted) |

### Error Handling

The call to `inspectUrl()` is wrapped in a `try-catch`. If the client throws (e.g. missing `WORKER_BASE_URL`), the route returns a `500` JSON response. In dev mode, the error message is included in the `details` field for debugging.

---

## Worker Client: `src/lib/worker/client.ts`

### `inspectUrl(url: string, callerId: string): Promise<InspectResult>`

Makes a `POST` request to `${WORKER_BASE_URL}/inspect` with:

**Headers:**
- `Content-Type: application/json`
- `x-worker-secret`: The shared secret
- `x-caller-id`: Derived caller identity

**Body:**
```json
{ "url": "<user-submitted-url>" }
```

### Timeout

All requests use `AbortController` with a configurable timeout (default 35s). The `fetchWithTimeout` wrapper handles this.

### Return Types

The client returns a discriminated union `InspectResult`:

```typescript
// Success
{
  ok: true;
  data: InspectSuccessResponse;  // Full worker payload
  rateLimits: RateLimitInfo;     // Parsed rate-limit headers
}

// Error
{
  ok: false;
  status: number;       // HTTP status from worker (0 for network errors)
  error: string;        // Human-readable error message
  details?: string;     // Optional additional context
  retryable: boolean;   // Whether the caller could retry
  rateLimits: RateLimitInfo;
}
```

### Rate Limit Header Parsing

Every response (success or error) has its rate-limit headers parsed:

| Header | Field |
|--------|-------|
| `x-ratelimit-global-limit-minute` | `globalLimitMinute` |
| `x-ratelimit-global-limit-hour` | `globalLimitHour` |
| `x-ratelimit-global-remaining-minute` | `globalRemainingMinute` |
| `x-ratelimit-global-remaining-hour` | `globalRemainingHour` |
| `x-ratelimit-caller-limit-minute` | `callerLimitMinute` |
| `x-ratelimit-caller-limit-hour` | `callerLimitHour` |
| `x-ratelimit-caller-remaining-minute` | `callerRemainingMinute` |
| `x-ratelimit-caller-remaining-hour` | `callerRemainingHour` |
| `retry-after` | `retryAfter` |

---

## Retry & Backoff Logic

### Retry Matrix

| Status | Retries | Max Total Attempts | Delay Strategy |
|--------|---------|--------------------|----------------|
| `400` | 0 | 1 | No retry — bad input |
| `401` | 0 | 1 | No retry — config issue |
| `429` | 1 | 2 | `Retry-After` header → `retryAfterSeconds` body → 1s fallback + jitter |
| `503` | 1 | 2 | Same as 429 |
| `504` | 1 | 2 | Fixed 2s + jitter |
| `500` | 2 | 3 | Exponential: 500ms → 1500ms → 3000ms + jitter |
| Network error | 0 | 1 | No retry — returns `status: 0` |
| Unknown status | 0 | 1 | No retry |

### Retry Delay Resolution (429/503)

Priority order:
1. `Retry-After` HTTP header (seconds × 1000 + jitter)
2. `retryAfterSeconds` from JSON body (seconds × 1000 + jitter)
3. Fallback: 1000ms + jitter

### Jitter

All delays include 0-200ms random jitter (`Math.floor(Math.random() * 200)`) to avoid thundering herd.

### Loop Structure

The retry loop uses a `for` loop with `maxAttempts = MAX_RETRIES_500 + 1` (3). For statuses with fewer retries (429/503/504), the retry guard checks `attempt < MAX_RETRIES_RETRYABLE` (1), so they exit early. The `lastResult` variable tracks the most recent error for return after exhausting retries.

---

## Caller ID Derivation: `src/lib/worker/caller-id.ts`

### `deriveCallerId(request: Request): string`

Produces a stable, per-visitor identity string. The worker uses this for per-caller rate limiting.

### Priority Strategy

| Priority | Format | Source | Status |
|----------|--------|--------|--------|
| 1 | `workspace:<workspaceId>` | Auth context (Clerk) | Placeholder — not yet wired |
| 2 | `user:<userId>` | Auth context (Clerk) | Placeholder — not yet wired |
| 3 | `visitor:<hash>` | Hashed fingerprint | Active fallback |

### Fingerprint Hash

When no authenticated identity is available:

```
SHA-256( clientIp | userAgent | salt ) → first 32 hex chars
```

- **Client IP extraction**: `x-forwarded-for` (first IP in chain) → `x-real-ip` → `"0.0.0.0"` fallback
- **User agent**: From `User-Agent` header, defaults to `"unknown"`
- **Salt**: From `CALLER_ID_SALT` env var, defaults to `"default-caller-id-salt"`

The hash is deterministic for identical inputs, ensuring the same visitor gets the same caller ID across requests.

---

## Dev-Only Storage: `src/lib/worker/storage.ts`

### `saveInspectionResult(data: InspectSuccessResponse): Promise<string | null>`

Saves successful worker responses as pretty-printed JSON files for local UI development.

**Behavior:**
- Only runs when `import.meta.env.DEV` is true — silently no-ops in production
- Creates `data/inspections/` directory if it doesn't exist
- Filename format: `<ISO-timestamp>_<url-slug>.json` (e.g. `2026-03-07T00-00-43-548Z_app-vows-you.json`)
- URL slug: hostname with non-alphanumeric chars replaced by `-`, capped at 60 chars
- Returns the filepath on success, `null` on failure
- Errors are logged but never thrown (fire-and-forget)

**Git setup:**
- `data/` is in `.gitignore`
- `data/inspections/.gitkeep` ensures the directory structure is tracked

---

## Type Definitions: `src/lib/worker/types.ts`

### Worker Response Types

```typescript
interface InspectSuccessResponse {
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

interface BubbleDetection {
  isLikelyBubble: boolean;
  signals?: string[];
  [key: string]: unknown;
}

interface InspectErrorResponse {
  ok: false;
  error: string;
  submittedUrl?: string;
  details?: string;
  limitScope?: string;
  limitWindow?: string;
  limit?: number;
  retryAfterSeconds?: number;
}
```

Subsection types (`database`, `optionSets`, etc.) are typed as `Record<string, unknown>` intentionally. The worker's schema is still evolving, and components consume the data with their own local interfaces.

### Internal Result Wrapper

```typescript
type InspectResult = InspectSuccess | InspectError;
```

This discriminated union is what `inspectUrl()` returns to the API route. It wraps the raw worker response with metadata (rate limits, retryability).

---

## Test Suite

### Framework: Vitest

**Config:** `vitest.config.ts` with `@` → `src` alias, Node environment, tests in `tests/**/*.test.ts`.

**Run:**
```bash
npm test          # single run
npm run test:watch # watch mode
```

### Client Tests (`tests/worker/client.test.ts`)

| Test Group | Tests | What's Covered |
|------------|-------|----------------|
| 200 success | 2 | Parsed data, `isLikelyBubble: false` pass-through |
| 400 bad request | 1 | No retry, correct status/retryable flag |
| 401 unauthorized | 1 | No retry, config error |
| 429 rate limited | 3 | Retry + success, retry + still 429, `Retry-After` header priority |
| 503 service unavailable | 1 | Retry after `retryAfterSeconds` |
| 504 gateway timeout | 2 | Retry + success, retry + still 504 |
| 500 internal error | 2 | 3 total attempts, success on 2nd attempt |
| Network error | 1 | `status: 0`, no retry |
| Request shape | 1 | Correct URL, method, headers, body |

**Mock strategy:** `vi.stubGlobal("fetch", ...)` with `mockFetch` (single response) and `mockFetchSequence` (ordered responses). Fake timers with `shouldAdvanceTime: true` to handle `sleep()` delays.

### Caller ID Tests (`tests/worker/caller-id.test.ts`)

| Test | What's Covered |
|------|----------------|
| Returns `visitor:` prefixed hash | Format validation |
| Stable output for same inputs | Determinism |
| Different output for different IPs | Uniqueness |
| Missing user-agent | Graceful fallback |
| Missing IP headers | Falls back to `0.0.0.0` |
| `x-real-ip` fallback | Header priority |
| First IP from forwarded chain | Multi-proxy handling |

---

## How to Verify Locally

### 1. Set environment variables

```bash
cp .env.example .env.local
# Fill in WORKER_BASE_URL and WORKER_SECRET
```

### 2. Run the dev server

```bash
npm run dev
```

### 3. Test with curl

```bash
curl -X POST http://localhost:4321/api/inspect \
  -H "Content-Type: application/json" \
  -d '{"url": "https://app.vows.you"}'
```

### 4. Check saved fixture

```bash
ls data/inspections/
# Should show a timestamped JSON file
```

### 5. Run tests

```bash
npm test
```

---

## Security Considerations

- `WORKER_SECRET` is never logged, never sent to the browser, never included in error responses
- The API route is server-side only (`prerender = false`) — deployed as a Vercel serverless function
- Caller IDs are hashed — raw IP addresses are never stored or forwarded to the worker
- In production, `saveInspectionResult` is a no-op (guarded by `import.meta.env.DEV`)
- Error details from the worker are only exposed in dev mode (`import.meta.env.DEV` guard)
- The `data/` directory is in `.gitignore` — fixture files never get committed

---

## Transitioning to Live Data

The current `/inspect-bubble-app` page imports fixture data directly:

```typescript
import fixtureData from "../../data/inspections/2026-03-07T00-00-43-548Z_app-vows-you.json";
```

To switch to live data, the page would:
1. Accept a URL via form input or query parameter
2. Call `POST /api/inspect` from a client-side fetch or Astro form action
3. Pass the response data to the same components (no component changes needed — they already accept the data via props)

The components were designed with this transition in mind. Every component takes its data slice as a prop and handles missing/partial data gracefully.
