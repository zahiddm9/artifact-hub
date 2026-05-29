import { describe, it, expect } from "vitest";
import { isValidSummaryData } from "./summarize";

const valid = {
  overall_assessment: "The artifact was well received by reviewers.",
  open_issues: ["Navigation is confusing", "Missing error state"],
  suggestions: ["Add a loading spinner"],
  questions: [],
  approval_count: 3,
};

describe("isValidSummaryData", () => {
  it("accepts a well-formed Gemini response", () => {
    expect(isValidSummaryData(valid)).toBe(true);
  });

  it("accepts when all arrays are empty and approval_count is 0", () => {
    expect(
      isValidSummaryData({
        overall_assessment: "No issues found.",
        open_issues: [],
        suggestions: [],
        questions: [],
        approval_count: 0,
      })
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidSummaryData(null)).toBe(false);
  });

  it("rejects a string primitive", () => {
    expect(isValidSummaryData("not an object")).toBe(false);
  });

  it("rejects when overall_assessment is missing", () => {
    const { overall_assessment, ...rest } = valid;
    void overall_assessment;
    expect(isValidSummaryData(rest)).toBe(false);
  });

  it("rejects when overall_assessment is not a string", () => {
    expect(isValidSummaryData({ ...valid, overall_assessment: 42 })).toBe(false);
  });

  it("rejects when open_issues is not an array", () => {
    expect(isValidSummaryData({ ...valid, open_issues: "issue string" })).toBe(false);
  });

  it("rejects when open_issues contains a non-string element", () => {
    expect(isValidSummaryData({ ...valid, open_issues: ["ok", 99] })).toBe(false);
  });

  it("rejects when suggestions is missing", () => {
    const { suggestions, ...rest } = valid;
    void suggestions;
    expect(isValidSummaryData(rest)).toBe(false);
  });

  it("rejects when approval_count is not a number", () => {
    expect(isValidSummaryData({ ...valid, approval_count: "3" })).toBe(false);
  });

  it("rejects when approval_count is missing", () => {
    const { approval_count, ...rest } = valid;
    void approval_count;
    expect(isValidSummaryData(rest)).toBe(false);
  });
});
