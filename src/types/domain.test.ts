import { describe, expect, it } from "vitest";
import { canTransition, ExecutionStatus, statusLabel } from "./domain";

describe("canTransition", () => {
  it("allows the documented forward path", () => {
    expect(canTransition(ExecutionStatus.ASSIGNED, ExecutionStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(ExecutionStatus.IN_PROGRESS, ExecutionStatus.SUBMITTED)).toBe(true);
    expect(canTransition(ExecutionStatus.SUBMITTED, ExecutionStatus.UNDER_REVIEW)).toBe(true);
    expect(canTransition(ExecutionStatus.UNDER_REVIEW, ExecutionStatus.APPROVED)).toBe(true);
    expect(canTransition(ExecutionStatus.APPROVED, ExecutionStatus.COMPLETED)).toBe(true);
  });

  it("allows the revision loop", () => {
    expect(canTransition(ExecutionStatus.UNDER_REVIEW, ExecutionStatus.SENT_BACK)).toBe(true);
    expect(canTransition(ExecutionStatus.SENT_BACK, ExecutionStatus.IN_PROGRESS)).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition(ExecutionStatus.ASSIGNED, ExecutionStatus.SUBMITTED)).toBe(false);
    expect(canTransition(ExecutionStatus.ASSIGNED, ExecutionStatus.COMPLETED)).toBe(false);
    expect(canTransition(ExecutionStatus.SUBMITTED, ExecutionStatus.APPROVED)).toBe(false);
  });

  it("treats completed as terminal", () => {
    expect(canTransition(ExecutionStatus.COMPLETED, ExecutionStatus.IN_PROGRESS)).toBe(false);
  });
});

describe("statusLabel", () => {
  it("falls back to the neutral label with no role", () => {
    expect(statusLabel(ExecutionStatus.SENT_BACK)).toBe("Sent Back");
  });

  it("shows the tester-facing label for sent back", () => {
    expect(statusLabel(ExecutionStatus.SENT_BACK, "tester")).toBe("Revision Required");
  });

  it("shows the reviewer-facing label for sent back", () => {
    expect(statusLabel(ExecutionStatus.SENT_BACK, "reviewer")).toBe("Revision Requested");
  });

  it("shows the same underlying status through different role lenses", () => {
    // The requirement this guards: every screen derives its label from the
    // same ExecutionStatus value — never a page-specific status string.
    const tester = statusLabel(ExecutionStatus.UNDER_REVIEW, "tester");
    const reviewer = statusLabel(ExecutionStatus.UNDER_REVIEW, "reviewer");
    expect(tester).toBe("Under Review");
    expect(reviewer).toBe("Pending Review");
  });
});
