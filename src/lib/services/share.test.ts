import { describe, it, expect } from "vitest";
import { isShareLinkExpired } from "./share";

describe("isShareLinkExpired", () => {
  it("returns true for a date in the past", () => {
    const past = new Date(Date.now() - 60_000).toISOString(); // 1 minute ago
    expect(isShareLinkExpired(past)).toBe(true);
  });

  it("returns false for a date in the future", () => {
    const future = new Date(Date.now() + 60_000).toISOString(); // 1 minute from now
    expect(isShareLinkExpired(future)).toBe(false);
  });

  it("returns true when expired by just 1 millisecond", () => {
    const justExpired = new Date(Date.now() - 1).toISOString();
    expect(isShareLinkExpired(justExpired)).toBe(true);
  });

  it("returns false when expiry is 1 millisecond in the future", () => {
    const almostExpired = new Date(Date.now() + 1).toISOString();
    expect(isShareLinkExpired(almostExpired)).toBe(false);
  });
});
