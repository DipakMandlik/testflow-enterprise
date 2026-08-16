import { describe, expect, it } from "vitest";
import { canTransition, ExecutionStatus, statusLabel } from "./domain";

describe("canTransition", () => {
  it("allows the documented forward path", () => {
    expect(canTransition(ExecutionStatus.ASSIGNED, ExecutionStatus.IN_PROGRESS)).toBe(true);
    expect(canTransition(ExecutionStatus.IN_PROGRESS, ExecutionStatus.PENDING_REVIEW)).toBe(true);
    expect(canTransition(ExecutionStatus.PENDING_REVIEW, ExecutionStatus.APPROVED)).toBe(true);
    expect(canTransition(ExecutionStatus.APPROVED, ExecutionStatus.COMPLETED)).toBe(true);
  });

  it("allows the check-level retest loop", () => {
    expect(canTransition(ExecutionStatus.PENDING_REVIEW, ExecutionStatus.RETEST_REQUIRED)).toBe(
      true,
    );
    expect(canTransition(ExecutionStatus.RETEST_REQUIRED, ExecutionStatus.RETEST_IN_PROGRESS)).toBe(
      true,
    );
    expect(canTransition(ExecutionStatus.RETEST_IN_PROGRESS, ExecutionStatus.PENDING_REVIEW)).toBe(
      true,
    );
  });

  it("allows a reviewer to reject from pending review", () => {
    expect(canTransition(ExecutionStatus.PENDING_REVIEW, ExecutionStatus.REJECTED)).toBe(true);
  });

  it("rejects skipping states", () => {
    expect(canTransition(ExecutionStatus.ASSIGNED, ExecutionStatus.PENDING_REVIEW)).toBe(false);
    expect(canTransition(ExecutionStatus.ASSIGNED, ExecutionStatus.COMPLETED)).toBe(false);
    expect(canTransition(ExecutionStatus.IN_PROGRESS, ExecutionStatus.APPROVED)).toBe(false);
  });

  it("treats completed and rejected as terminal", () => {
    expect(canTransition(ExecutionStatus.COMPLETED, ExecutionStatus.IN_PROGRESS)).toBe(false);
    expect(canTransition(ExecutionStatus.REJECTED, ExecutionStatus.IN_PROGRESS)).toBe(false);
  });
});

describe("statusLabel", () => {
  it("falls back to the neutral label with no role", () => {
    expect(statusLabel(ExecutionStatus.PENDING_REVIEW)).toBe("Pending Review");
  });

  it("shows the tester-facing label for pending review", () => {
    expect(statusLabel(ExecutionStatus.PENDING_REVIEW, "tester")).toBe("Awaiting Quality Review");
  });

  it("shows the quality-checker-facing label for pending review", () => {
    expect(statusLabel(ExecutionStatus.PENDING_REVIEW, "quality_checker")).toBe(
      "Pending Verification",
    );
  });

  it("shows the same underlying status through different role lenses", () => {
    // The requirement this guards: every screen derives its label from the
    // same ExecutionStatus value — never a page-specific status string.
    const tester = statusLabel(ExecutionStatus.RETEST_REQUIRED, "tester");
    const checker = statusLabel(ExecutionStatus.RETEST_REQUIRED, "quality_checker");
    expect(tester).toBe("Retest Required");
    expect(checker).toBe("Retest Requested");
  });

  it("falls back to the neutral label for a role with no override", () => {
    expect(statusLabel(ExecutionStatus.PENDING_REVIEW, "manager")).toBe("Pending Review");
  });
});
