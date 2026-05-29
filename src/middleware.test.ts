import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit } from "./middleware";

describe("checkRateLimit", () => {
  let store: Map<string, { count: number; resetAt: number }>;
  const KEY = "127.0.0.1:POST:/api/artifacts";
  const MAX = 3;
  const WINDOW = 60_000;
  const NOW = 1_000_000;

  beforeEach(() => {
    store = new Map();
  });

  it("allows the first request and initialises the window", () => {
    const result = checkRateLimit(store, KEY, MAX, WINDOW, NOW);
    expect(result.allowed).toBe(true);
    expect(store.get(KEY)).toEqual({ count: 1, resetAt: NOW + WINDOW });
  });

  it("allows requests up to the max and increments the counter", () => {
    for (let i = 0; i < MAX; i++) {
      expect(checkRateLimit(store, KEY, MAX, WINDOW, NOW).allowed).toBe(true);
    }
    expect(store.get(KEY)?.count).toBe(MAX);
  });

  it("blocks the request that exceeds max and returns correct retryAfter", () => {
    for (let i = 0; i < MAX; i++) checkRateLimit(store, KEY, MAX, WINDOW, NOW);

    const result = checkRateLimit(store, KEY, MAX, WINDOW, NOW);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(Math.ceil(WINDOW / 1000));
  });

  it("resets the window after windowMs has elapsed and allows again", () => {
    for (let i = 0; i < MAX; i++) checkRateLimit(store, KEY, MAX, WINDOW, NOW);

    const afterReset = NOW + WINDOW + 1;
    const result = checkRateLimit(store, KEY, MAX, WINDOW, afterReset);
    expect(result.allowed).toBe(true);
    expect(store.get(KEY)?.count).toBe(1);
  });
});
