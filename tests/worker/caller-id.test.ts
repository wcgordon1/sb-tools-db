import { describe, it, expect, vi, afterEach } from "vitest";
import { deriveCallerId } from "@/lib/worker/caller-id";

vi.stubEnv("CALLER_ID_SALT", "test-salt");

afterEach(() => {
  vi.restoreAllMocks();
});

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://localhost/api/inspect", {
    method: "POST",
    headers,
  });
}

describe("deriveCallerId", () => {
  it("returns a visitor: prefixed hash", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });

    const callerId = deriveCallerId(req);

    expect(callerId).toMatch(/^visitor:[a-f0-9]{32}$/);
  });

  it("produces stable output for same inputs", () => {
    const req1 = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });
    const req2 = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });

    expect(deriveCallerId(req1)).toBe(deriveCallerId(req2));
  });

  it("produces different output for different IPs", () => {
    const req1 = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });
    const req2 = makeRequest({
      "x-forwarded-for": "5.6.7.8",
      "user-agent": "TestBrowser/1.0",
    });

    expect(deriveCallerId(req1)).not.toBe(deriveCallerId(req2));
  });

  it("handles missing user-agent", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });

    const callerId = deriveCallerId(req);

    expect(callerId).toMatch(/^visitor:[a-f0-9]{32}$/);
  });

  it("handles missing IP headers (falls back to 0.0.0.0)", () => {
    const req = makeRequest({ "user-agent": "TestBrowser/1.0" });

    const callerId = deriveCallerId(req);

    expect(callerId).toMatch(/^visitor:[a-f0-9]{32}$/);
  });

  it("uses x-real-ip when x-forwarded-for is missing", () => {
    const reqForwarded = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });
    const reqRealIp = makeRequest({
      "x-real-ip": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });

    expect(deriveCallerId(reqForwarded)).toBe(deriveCallerId(reqRealIp));
  });

  it("uses first IP from x-forwarded-for chain", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.2.3.4, 10.0.0.1, 172.16.0.1",
      "user-agent": "TestBrowser/1.0",
    });

    const reqDirect = makeRequest({
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "TestBrowser/1.0",
    });

    expect(deriveCallerId(req)).toBe(deriveCallerId(reqDirect));
  });
});
