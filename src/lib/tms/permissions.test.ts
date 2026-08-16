import { describe, expect, it } from "vitest";
import { ExecutionStatus, type Execution, type User } from "@/types/domain";
import {
  canApproveExecution,
  canExecuteTest,
  canManageAssignments,
  canManageDevices,
  canManageFailureCategories,
  canManagePlants,
  canManageStations,
  canManageTemplates,
  canManageUsers,
  canRejectExecution,
  canRequestRetest,
  canSubmitExecution,
  canViewReports,
  canViewSeniorDashboard,
} from "./permissions";

const user = (overrides: Partial<User>): User => ({
  id: "u-1",
  employeeId: "TE-0001",
  name: "Test User",
  email: "test@example.com",
  role: "tester",
  active: true,
  plantIds: [],
  ...overrides,
});

const execution = (overrides: Partial<Execution>): Execution => ({
  id: "exec-1",
  code: "EX-1000",
  assignmentId: "as-1",
  unitId: "unit-1",
  templateId: "tpl-1",
  testerId: "u-1",
  stationId: "sta-1",
  status: ExecutionStatus.IN_PROGRESS,
  locationVerifiedAt: null,
  stationVerifiedAt: null,
  startedAt: null,
  submittedAt: null,
  completedAt: null,
  updatedAt: new Date().toISOString(),
  summary: "",
  round: 1,
  ...overrides,
});

describe("canExecuteTest", () => {
  it("lets the assigned tester execute an in-progress execution", () => {
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

  it("denies non-testers, even the assignee's own quality-checker role", () => {
    expect(canExecuteTest(user({ role: "quality_checker" }), execution({}))).toBe(false);
  });

  it("denies execution once submitted for review or decided", () => {
    expect(
      canExecuteTest(
        user({ role: "tester" }),
        execution({ status: ExecutionStatus.PENDING_REVIEW }),
      ),
    ).toBe(false);
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.APPROVED })),
    ).toBe(false);
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.COMPLETED })),
    ).toBe(false);
    expect(
      canExecuteTest(user({ role: "tester" }), execution({ status: ExecutionStatus.REJECTED })),
    ).toBe(false);
  });

  it("allows a retest-required or retest-in-progress execution to be resumed", () => {
    expect(
      canExecuteTest(
        user({ role: "tester" }),
        execution({ status: ExecutionStatus.RETEST_REQUIRED }),
      ),
    ).toBe(true);
    expect(
      canExecuteTest(
        user({ role: "tester" }),
        execution({ status: ExecutionStatus.RETEST_IN_PROGRESS }),
      ),
    ).toBe(true);
  });
});

describe("canSubmitExecution", () => {
  it("allows submitting in-progress or retest-in-progress work", () => {
    expect(canSubmitExecution(user({}), execution({ status: ExecutionStatus.IN_PROGRESS }))).toBe(
      true,
    );
    expect(
      canSubmitExecution(user({}), execution({ status: ExecutionStatus.RETEST_IN_PROGRESS })),
    ).toBe(true);
  });

  it("refuses to submit an assigned-but-not-started execution", () => {
    expect(canSubmitExecution(user({}), execution({ status: ExecutionStatus.ASSIGNED }))).toBe(
      false,
    );
  });

  it("refuses to submit while a retest has only been requested but not resumed", () => {
    expect(
      canSubmitExecution(user({}), execution({ status: ExecutionStatus.RETEST_REQUIRED })),
    ).toBe(false);
  });
});

describe("review gate (approve / reject / request retest)", () => {
  it("lets a quality checker review someone else's pending-review execution", () => {
    const checker = user({ id: "u-check", role: "quality_checker" });
    expect(
      canApproveExecution(checker, execution({ status: ExecutionStatus.PENDING_REVIEW })),
    ).toBe(true);
    expect(canRejectExecution(checker, execution({ status: ExecutionStatus.PENDING_REVIEW }))).toBe(
      true,
    );
    expect(canRequestRetest(checker, execution({ status: ExecutionStatus.PENDING_REVIEW }))).toBe(
      true,
    );
  });

  it("blocks a quality checker from reviewing their own execution", () => {
    const checker = user({ id: "u-1", role: "quality_checker" });
    expect(
      canApproveExecution(
        checker,
        execution({ status: ExecutionStatus.PENDING_REVIEW, testerId: "u-1" }),
      ),
    ).toBe(false);
  });

  it("blocks testers from reviewing", () => {
    expect(
      canApproveExecution(
        user({ role: "tester", id: "other" }),
        execution({ status: ExecutionStatus.PENDING_REVIEW }),
      ),
    ).toBe(false);
  });

  it("lets managers and admins review too", () => {
    expect(
      canApproveExecution(
        user({ id: "m", role: "manager" }),
        execution({ status: ExecutionStatus.PENDING_REVIEW }),
      ),
    ).toBe(true);
    expect(
      canApproveExecution(
        user({ id: "a", role: "admin" }),
        execution({ status: ExecutionStatus.PENDING_REVIEW }),
      ),
    ).toBe(true);
  });

  it("refuses review once already completed", () => {
    expect(
      canApproveExecution(
        user({ id: "u-check", role: "quality_checker" }),
        execution({ status: ExecutionStatus.COMPLETED }),
      ),
    ).toBe(false);
  });
});

describe("administration permissions", () => {
  it("reserves users, plants, stations, and devices for admins only", () => {
    expect(canManageUsers(user({ role: "admin" }))).toBe(true);
    expect(canManageUsers(user({ role: "manager" }))).toBe(false);
    expect(canManagePlants(user({ role: "admin" }))).toBe(true);
    expect(canManagePlants(user({ role: "manager" }))).toBe(false);
    expect(canManageStations(user({ role: "admin" }))).toBe(true);
    expect(canManageDevices(user({ role: "admin" }))).toBe(true);
    expect(canManageDevices(user({ role: "tester" }))).toBe(false);
  });

  it("lets managers (and admins) manage assignments", () => {
    expect(canManageAssignments(user({ role: "manager" }))).toBe(true);
    expect(canManageAssignments(user({ role: "admin" }))).toBe(true);
    expect(canManageAssignments(user({ role: "quality_checker" }))).toBe(false);
  });

  it("reserves template authoring for template managers (and admins)", () => {
    expect(canManageTemplates(user({ role: "template_manager" }))).toBe(true);
    expect(canManageTemplates(user({ role: "admin" }))).toBe(true);
    expect(canManageTemplates(user({ role: "manager" }))).toBe(false);
  });

  it("lets template managers and admins manage failure categories", () => {
    expect(canManageFailureCategories(user({ role: "template_manager" }))).toBe(true);
    expect(canManageFailureCategories(user({ role: "admin" }))).toBe(true);
    expect(canManageFailureCategories(user({ role: "tester" }))).toBe(false);
  });

  it("lets quality checkers, managers and senior managers view reports but not testers", () => {
    expect(canViewReports(user({ role: "quality_checker" }))).toBe(true);
    expect(canViewReports(user({ role: "manager" }))).toBe(true);
    expect(canViewReports(user({ role: "senior_manager" }))).toBe(true);
    expect(canViewReports(user({ role: "tester" }))).toBe(false);
  });

  it("reserves the senior dashboard for senior managers", () => {
    expect(canViewSeniorDashboard(user({ role: "senior_manager" }))).toBe(true);
    expect(canViewSeniorDashboard(user({ role: "manager" }))).toBe(false);
  });
});
