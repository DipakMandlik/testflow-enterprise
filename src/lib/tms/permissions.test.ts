import { describe, expect, it } from "vitest";
import { ExecutionStatus, type TestExecution, type User } from "@/types/domain";
import {
  canApproveExecution,
  canExecuteTest,
  canManageAssignments,
  canManageProjects,
  canManageTestCases,
  canManageUsers,
  canSubmitExecution,
  canViewReports,
} from "./permissions";

const user = (overrides: Partial<User>): User => ({
  id: "u-1",
  employeeId: "TE-0001",
  name: "Test User",
  email: "test@example.com",
  role: "tester",
  active: true,
  projectIds: [],
  ...overrides,
});

const execution = (overrides: Partial<TestExecution>): TestExecution => ({
  id: "exec-1",
  code: "EX-1000",
  assignmentId: "as-1",
  testCaseId: "tc-1",
  testerId: "u-1",
  status: ExecutionStatus.IN_PROGRESS,
  startedAt: null,
  submittedAt: null,
  completedAt: null,
  updatedAt: new Date().toISOString(),
  blockReason: null,
  summary: "",
  round: 1,
  ...overrides,
});

describe("canExecuteTest", () => {
  it("lets the assigned tester execute an in-progress test", () => {
    expect(canExecuteTest(user({ role: "tester" }), execution({}))).toBe(true);
  });

  it("denies a tester who is not the assignee", () => {
    expect(
      canExecuteTest(user({ id: "u-2", role: "tester" }), execution({ testerId: "u-1" })),
    ).toBe(false);
  });

  it("denies a deactivated tester", () => {
    expect(canExecuteTest(user({ role: "tester", active: false }), execution({}))).toBe(false);
  });

  it("denies non-testers, even the assignee's own reviewer role", () => {
    expect(canExecuteTest(user({ role: "reviewer" }), execution({}))).toBe(false);
  });

  it("denies execution once submitted for review", () => {
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.SUBMITTED })),
    ).toBe(false);
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.UNDER_REVIEW })),
    ).toBe(false);
  });

  it("allows a sent-back or blocked execution to be resumed", () => {
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.SENT_BACK })),
    ).toBe(true);
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.BLOCKED })),
    ).toBe(true);
  });
});

describe("canSubmitExecution", () => {
  it("allows submitting in-progress or sent-back work", () => {
    expect(canSubmitExecution(user({}), execution({ status: ExecutionStatus.IN_PROGRESS }))).toBe(
      true,
    );
    expect(canSubmitExecution(user({}), execution({ status: ExecutionStatus.SENT_BACK }))).toBe(
      true,
    );
  });

  it("refuses to submit an assigned-but-not-started execution", () => {
    expect(canSubmitExecution(user({}), execution({ status: ExecutionStatus.ASSIGNED }))).toBe(
      false,
    );
  });
});

describe("canApproveExecution (review gate)", () => {
  it("lets a reviewer approve someone else's submitted execution", () => {
    const reviewer = user({ id: "u-rev", role: "reviewer" });
    expect(canApproveExecution(reviewer, execution({ status: ExecutionStatus.SUBMITTED }))).toBe(
      true,
    );
  });

  it("blocks a reviewer from reviewing their own execution", () => {
    const reviewer = user({ id: "u-1", role: "reviewer" });
    expect(
      canApproveExecution(
        reviewer,
        execution({ status: ExecutionStatus.SUBMITTED, testerId: "u-1" }),
      ),
    ).toBe(false);
  });

  it("blocks testers from approving", () => {
    expect(
      canApproveExecution(
        user({ role: "tester", id: "other" }),
        execution({ status: ExecutionStatus.SUBMITTED }),
      ),
    ).toBe(false);
  });

  it("lets managers and admins review too", () => {
    expect(
      canApproveExecution(
        user({ id: "m", role: "manager" }),
        execution({ status: ExecutionStatus.SUBMITTED }),
      ),
    ).toBe(true);
    expect(
      canApproveExecution(
        user({ id: "a", role: "admin" }),
        execution({ status: ExecutionStatus.SUBMITTED }),
      ),
    ).toBe(true);
  });

  it("refuses review once already completed", () => {
    expect(
      canApproveExecution(
        user({ id: "u-rev", role: "reviewer" }),
        execution({ status: ExecutionStatus.COMPLETED }),
      ),
    ).toBe(false);
  });
});

describe("administration permissions", () => {
  it("reserves user and project management for admins only", () => {
    expect(canManageUsers(user({ role: "admin" }))).toBe(true);
    expect(canManageUsers(user({ role: "manager" }))).toBe(false);
    expect(canManageProjects(user({ role: "admin" }))).toBe(true);
    expect(canManageProjects(user({ role: "manager" }))).toBe(false);
  });

  it("lets managers (and admins) manage test cases and assignments", () => {
    expect(canManageTestCases(user({ role: "manager" }))).toBe(true);
    expect(canManageTestCases(user({ role: "admin" }))).toBe(true);
    expect(canManageTestCases(user({ role: "tester" }))).toBe(false);
    expect(canManageAssignments(user({ role: "manager" }))).toBe(true);
    expect(canManageAssignments(user({ role: "reviewer" }))).toBe(false);
  });

  it("lets reviewers, managers and admins view reports but not testers", () => {
    expect(canViewReports(user({ role: "reviewer" }))).toBe(true);
    expect(canViewReports(user({ role: "manager" }))).toBe(true);
    expect(canViewReports(user({ role: "tester" }))).toBe(false);
  });
});
