import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";
import { isMcpAuthorized } from "./auth";

// Minimal fake request — isMcpAuthorized only calls request.headers.get(),
// so this duck-type avoids importing next/server at runtime in the test runner.
function makeRequest(apiKey?: string): NextRequest {
  return {
    headers: {
      get: (name: string) =>
        name === "x-api-key" ? (apiKey ?? null) : null,
    },
  } as unknown as NextRequest;
}

describe("isMcpAuthorized", () => {
  const TEST_KEY = "test-secret-key-abcde";
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.ARTIFACT_HUB_ADMIN_KEY;
    process.env.ARTIFACT_HUB_ADMIN_KEY = TEST_KEY;
  });

  afterEach(() => {
    process.env.ARTIFACT_HUB_ADMIN_KEY = originalKey;
  });

  it("returns true for the correct key", () => {
    expect(isMcpAuthorized(makeRequest(TEST_KEY))).toBe(true);
  });

  it("returns false for a wrong key of the same length", () => {
    // Same length ensures the length-mismatch short-circuit doesn't mask the comparison
    expect(isMcpAuthorized(makeRequest("test-secret-key-xxxxx"))).toBe(false);
  });

  it("returns false for a key of different length", () => {
    expect(isMcpAuthorized(makeRequest("short"))).toBe(false);
  });

  it("returns false when x-api-key header is missing", () => {
    expect(isMcpAuthorized(makeRequest())).toBe(false);
  });

  it("returns false when ARTIFACT_HUB_ADMIN_KEY env var is not set", () => {
    delete process.env.ARTIFACT_HUB_ADMIN_KEY;
    expect(isMcpAuthorized(makeRequest(TEST_KEY))).toBe(false);
  });
});
