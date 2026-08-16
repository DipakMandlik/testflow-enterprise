// Domain services: all business rules, state transitions, audit and
// notification side effects live here. UI never mutates state directly.
import {
  canTransition,
  ExecutionStatus,
  type AppState,
  type AuditEvent,
  type Evidence,
  type Notification,
  type Priority,
  type Role,
  type StepResult,
  type StepStatus,
  type TestCase,
  type TestExecution,
  type User,
} from "@/types/domain";
import {
  canApproveExecution,
  canExecuteTest,
  canManageAssignments,
  canManageProjects,
  canManageTestCases,
  canManageUsers,
  canSubmitExecution,
} from "./permissions";

export const DEMO_PASSWORD = "tata@2026";
export const DEMO_OTP = "123456";

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (error: string): Result<never> => ({ ok: false, error });

const uid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

function audit(
  state: AppState,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata: AuditEvent["metadata"] = {},
): AppState {
  return {
    ...state,
    audit: [
      {
        id: uid("au"),
        actorId,
        action,
        entity,
        entityId,
        createdAt: new Date().toISOString(),
        metadata,
      },
      ...state.audit,
    ],
  };
}

function notify(
  state: AppState,
  userIds: string[],
  title: string,
  body: string,
  href: string,
): AppState {
  const items: Notification[] = userIds.map((userId) => ({
    id: uid("n"),
    userId,
    title,
    body,
    href,
    read: false,
    createdAt: new Date().toISOString(),
  }));
  return { ...state, notifications: [...items, ...state.notifications] };
}

const reviewerIds = (state: AppState) =>
  state.users
    .filter((u) => u.active && (u.role === "reviewer" || u.role === "manager"))
    .map((u) => u.id);

function patchExecution(state: AppState, id: string, patch: Partial<TestExecution>): AppState {
  return {
    ...state,
    executions: state.executions.map((e) =>
      e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
    ),
  };
}

// ---- selectors -------------------------------------------------------------

export const currentUser = (state: AppState): User | null =>
  state.session ? (state.users.find((u) => u.id === state.session!.userId) ?? null) : null;

export const userById = (state: AppState, id: string) => state.users.find((u) => u.id === id);
export const testCaseById = (state: AppState, id: string) =>
  state.testCases.find((t) => t.id === id);
export const executionById = (state: AppState, id: string) =>
  state.executions.find((e) => e.id === id);
export const stepsFor = (state: AppState, testCaseId: string) =>
  state.testSteps.filter((s) => s.testCaseId === testCaseId).sort((a, b) => a.index - b.index);
export const resultsFor = (state: AppState, executionId: string) =>
  state.stepResults.filter((r) => r.executionId === executionId);
export const evidenceFor = (state: AppState, executionId: string) =>
  state.evidence.filter((e) => e.executionId === executionId);
export const reviewsFor = (state: AppState, executionId: string) =>
  state.reviews
    .filter((r) => r.executionId === executionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const auditFor = (state: AppState, entityId: string) =>
  state.audit.filter((a) => a.entityId === entityId);
export const moduleById = (state: AppState, id: string) => state.modules.find((m) => m.id === id);
export const projectById = (state: AppState, id: string) => state.projects.find((p) => p.id === id);
export const environmentById = (state: AppState, id: string) =>
  state.environments.find((e) => e.id === id);

export function executionProgress(state: AppState, execution: TestExecution) {
  const steps = stepsFor(state, execution.testCaseId);
  const results = resultsFor(state, execution.id);
  const done = results.filter((r) => ["passed", "failed", "blocked", "skipped"].includes(r.status));
  return {
    total: steps.length,
    completed: done.length,
    passed: results.filter((r) => r.status === "passed").length,
    failed: results.filter((r) => r.status === "failed").length,
    blocked: results.filter((r) => r.status === "blocked").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    percent: steps.length ? Math.round((done.length / steps.length) * 100) : 0,
  };
}

// ---- authentication --------------------------------------------------------

export function login(state: AppState, employeeId: string, password: string): Result<AppState> {
  const user = state.users.find(
    (u) => u.employeeId.toUpperCase() === employeeId.trim().toUpperCase(),
  );
  if (!user) return fail("No employee found with that ID.");
  if (!user.active) return fail("This account is deactivated. Contact the platform administrator.");
  if (password !== DEMO_PASSWORD) return fail("Incorrect password.");
  return ok({ ...state, pendingLoginUserId: user.id });
}

export function verifyOtp(state: AppState, code: string): Result<AppState> {
  if (!state.pendingLoginUserId) return fail("Your sign-in attempt expired. Please start again.");
  if (code !== DEMO_OTP) return fail("Invalid verification code.");
  const userId = state.pendingLoginUserId;
  let next: AppState = {
    ...state,
    pendingLoginUserId: null,
    session: { userId, issuedAt: new Date().toISOString() },
  };
  next = audit(next, userId, "auth.login", "User", userId);
  return ok(next);
}

export function logout(state: AppState): AppState {
  return { ...state, session: null, pendingLoginUserId: null };
}

// ---- execution workflow ----------------------------------------------------

export function startExecution(
  state: AppState,
  actor: User,
  executionId: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("You are not permitted to execute this test.");
  if (execution.status === ExecutionStatus.IN_PROGRESS) return ok(state);
  if (!canTransition(execution.status, ExecutionStatus.IN_PROGRESS))
    return fail("This execution cannot be started from its current state.");

  let next = patchExecution(state, executionId, {
    status: ExecutionStatus.IN_PROGRESS,
    startedAt: execution.startedAt ?? new Date().toISOString(),
    blockReason: null,
  });
  next = audit(next, actor.id, "execution.started", "TestExecution", executionId, {
    code: execution.code,
  });
  return ok(next);
}

export function saveStepResult(
  state: AppState,
  actor: User,
  executionId: string,
  stepId: string,
  patch: Partial<Pick<StepResult, "status" | "actual" | "comment">>,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("This execution is read-only for you.");

  const existing = state.stepResults.find(
    (r) => r.executionId === executionId && r.stepId === stepId,
  );
  const updatedAt = new Date().toISOString();
  const stepResults = existing
    ? state.stepResults.map((r) => (r.id === existing.id ? { ...r, ...patch, updatedAt } : r))
    : [
        ...state.stepResults,
        {
          id: uid("sr"),
          executionId,
          stepId,
          status: "in_progress" as StepStatus,
          actual: "",
          comment: "",
          updatedAt,
          ...patch,
        },
      ];

  let next: AppState = { ...state, stepResults };
  if (execution.status === ExecutionStatus.ASSIGNED) {
    next = patchExecution(next, executionId, {
      status: ExecutionStatus.IN_PROGRESS,
      startedAt: execution.startedAt ?? updatedAt,
    });
  } else {
    next = patchExecution(next, executionId, {});
  }
  if (patch.status) {
    next = audit(next, actor.id, "step.result_changed", "TestExecution", executionId, {
      stepId,
      status: patch.status,
    });
  }
  return ok(next);
}

export function saveExecutionSummary(
  state: AppState,
  actor: User,
  executionId: string,
  summary: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("This execution is read-only for you.");
  return ok(patchExecution(state, executionId, { summary }));
}

export function blockExecution(
  state: AppState,
  actor: User,
  executionId: string,
  reason: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution))
    return fail("You are not permitted to change this execution.");
  if (reason.trim().length < 10) return fail("Provide a block reason of at least 10 characters.");
  if (!canTransition(execution.status, ExecutionStatus.BLOCKED))
    return fail("This execution cannot be blocked from its current state.");

  let next = patchExecution(state, executionId, {
    status: ExecutionStatus.BLOCKED,
    blockReason: reason.trim(),
  });
  next = audit(next, actor.id, "execution.blocked", "TestExecution", executionId, {
    code: execution.code,
  });
  next = notify(
    next,
    reviewerIds(next),
    "Execution blocked",
    `${execution.code} was blocked by ${actor.name}: ${reason.trim()}`,
    `/reviews/${executionId}`,
  );
  return ok(next);
}

export function validateSubmission(state: AppState, execution: TestExecution): string[] {
  const steps = stepsFor(state, execution.testCaseId);
  const results = resultsFor(state, execution.id);
  const evidence = evidenceFor(state, execution.id);
  const problems: string[] = [];

  for (const step of steps) {
    const r = results.find((x) => x.stepId === step.id);
    if (!r || r.status === "not_started" || r.status === "in_progress") {
      problems.push(`Step ${step.index} has no recorded outcome.`);
      continue;
    }
    if (r.status !== "skipped" && !r.actual.trim()) {
      problems.push(`Step ${step.index} is missing an actual result.`);
    }
    if ((r.status === "failed" || r.status === "blocked") && r.comment.trim().length < 5) {
      problems.push(`Step ${step.index} requires a comment explaining the ${r.status} outcome.`);
    }
    const needsEvidence = step.evidenceRequired || r.status === "failed";
    if (needsEvidence && !evidence.some((e) => e.stepId === step.id)) {
      problems.push(`Step ${step.index} requires attached evidence.`);
    }
  }
  return problems;
}

export function submitExecution(
  state: AppState,
  actor: User,
  executionId: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canSubmitExecution(actor, execution)) return fail("You cannot submit this execution.");
  const problems = validateSubmission(state, execution);
  if (problems.length) return fail(problems[0] ?? "Execution is incomplete.");

  // The execution passes through IN_PROGRESS again before resubmission (see
  // reopenForRevision), so its *current* status can't tell a first submission
  // from a resubmission — a prior review record can.
  const resubmission = reviewsFor(state, executionId).length > 0;
  let next = patchExecution(state, executionId, {
    status: ExecutionStatus.SUBMITTED,
    submittedAt: new Date().toISOString(),
    round: resubmission ? execution.round + 1 : execution.round,
  });
  next = audit(
    next,
    actor.id,
    resubmission ? "execution.resubmitted" : "execution.submitted",
    "TestExecution",
    executionId,
    { code: execution.code },
  );
  next = notify(
    next,
    reviewerIds(next),
    resubmission ? "Execution resubmitted" : "Execution submitted for review",
    `${execution.code} (${testCaseById(next, execution.testCaseId)?.code ?? ""}) from ${actor.name}.`,
    `/reviews/${executionId}`,
  );
  return ok(next);
}

// ---- review workflow -------------------------------------------------------

export function claimReview(state: AppState, actor: User, executionId: string): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canApproveExecution(actor, execution)) return fail("You cannot review this execution.");
  if (execution.status !== ExecutionStatus.SUBMITTED) return ok(state);

  let next = patchExecution(state, executionId, { status: ExecutionStatus.UNDER_REVIEW });
  next = audit(next, actor.id, "review.started", "TestExecution", executionId, {
    code: execution.code,
  });
  next = notify(
    next,
    [execution.testerId],
    "Review started",
    `${actor.name} started reviewing ${execution.code}.`,
    `/executions/${executionId}`,
  );
  return ok(next);
}

export function approveExecution(
  state: AppState,
  actor: User,
  executionId: string,
  comment: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canApproveExecution(actor, execution)) return fail("You cannot approve this execution.");

  const timestamp = new Date().toISOString();
  let next: AppState = {
    ...state,
    reviews: [
      {
        id: uid("rv"),
        executionId,
        reviewerId: actor.id,
        decision: "approved",
        comment: comment.trim(),
        createdAt: timestamp,
        round: execution.round,
      },
      ...state.reviews,
    ],
  };
  next = patchExecution(next, executionId, {
    status: ExecutionStatus.COMPLETED,
    completedAt: timestamp,
  });
  next = audit(next, actor.id, "review.approved", "TestExecution", executionId, {
    code: execution.code,
  });
  next = audit(next, actor.id, "execution.completed", "TestExecution", executionId, {
    code: execution.code,
  });
  next = notify(
    next,
    [execution.testerId],
    "Execution approved",
    `${execution.code} was approved by ${actor.name} and is now completed.`,
    `/executions/${executionId}`,
  );
  return ok(next);
}

export function requestRevision(
  state: AppState,
  actor: User,
  executionId: string,
  comment: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canApproveExecution(actor, execution)) return fail("You cannot review this execution.");
  if (comment.trim().length < 15)
    return fail("A revision request needs a comment of at least 15 characters.");

  let next: AppState = {
    ...state,
    reviews: [
      {
        id: uid("rv"),
        executionId,
        reviewerId: actor.id,
        decision: "sent_back",
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
        round: execution.round,
      },
      ...state.reviews,
    ],
  };
  next = patchExecution(next, executionId, { status: ExecutionStatus.SENT_BACK });
  next = audit(next, actor.id, "review.revision_requested", "TestExecution", executionId, {
    code: execution.code,
  });
  next = notify(
    next,
    [execution.testerId],
    "Revision requested",
    `${actor.name} sent ${execution.code} back for revision.`,
    `/executions/${executionId}`,
  );
  return ok(next);
}

export function reopenForRevision(
  state: AppState,
  actor: User,
  executionId: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("You cannot revise this execution.");
  if (
    execution.status !== ExecutionStatus.SENT_BACK &&
    execution.status !== ExecutionStatus.BLOCKED
  )
    return ok(state);
  let next = patchExecution(state, executionId, {
    status: ExecutionStatus.IN_PROGRESS,
    blockReason: null,
  });
  next = audit(next, actor.id, "execution.revision_started", "TestExecution", executionId, {
    code: execution.code,
  });
  return ok(next);
}

// ---- evidence --------------------------------------------------------------

export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
];

export function validateEvidenceFile(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (!file.name.trim()) return "The file needs a valid filename.";
  if (file.size > MAX_EVIDENCE_BYTES) return "Files must be 5 MB or smaller.";
  if (file.type && !ALLOWED_TYPES.includes(file.type))
    return "Allowed formats: PNG, JPEG, WebP, SVG, PDF or plain text.";
  return null;
}

export function addEvidence(
  state: AppState,
  actor: User,
  executionId: string,
  stepId: string | null,
  file: { name: string; size: number; type: string; dataUrl: string },
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("Evidence cannot be added to this execution.");
  const invalid = validateEvidenceFile(file);
  if (invalid) return fail(invalid);

  const item: Evidence = {
    id: uid("ev"),
    executionId,
    stepId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    dataUrl: file.dataUrl,
    uploadedById: actor.id,
    uploadedAt: new Date().toISOString(),
  };
  let next: AppState = { ...state, evidence: [item, ...state.evidence] };
  next = audit(next, actor.id, "evidence.uploaded", "TestExecution", executionId, {
    filename: file.name,
  });
  return ok(next);
}

export function removeEvidence(state: AppState, actor: User, evidenceId: string): Result<AppState> {
  const item = state.evidence.find((e) => e.id === evidenceId);
  if (!item) return fail("Evidence not found.");
  const execution = executionById(state, item.executionId);
  if (!execution || !canExecuteTest(actor, execution))
    return fail("Evidence can only be removed while the execution is editable.");
  let next: AppState = { ...state, evidence: state.evidence.filter((e) => e.id !== evidenceId) };
  next = audit(next, actor.id, "evidence.removed", "TestExecution", item.executionId, {
    filename: item.filename,
  });
  return ok(next);
}

// ---- notifications ---------------------------------------------------------

export function markNotificationRead(state: AppState, id: string): AppState {
  return {
    ...state,
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
  };
}

export function markAllNotificationsRead(state: AppState, userId: string): AppState {
  return {
    ...state,
    notifications: state.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
  };
}

// ---- administration --------------------------------------------------------

export function setUserActive(
  state: AppState,
  actor: User,
  userId: string,
  active: boolean,
): Result<AppState> {
  if (!canManageUsers(actor)) return fail("Only administrators can manage users.");
  let next: AppState = {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, active } : u)),
  };
  next = audit(next, actor.id, active ? "user.activated" : "user.deactivated", "User", userId);
  return ok(next);
}

export function setUserRole(
  state: AppState,
  actor: User,
  userId: string,
  role: Role,
): Result<AppState> {
  if (!canManageUsers(actor)) return fail("Only administrators can manage users.");
  let next: AppState = {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, role } : u)),
  };
  next = audit(next, actor.id, "user.role_changed", "User", userId, { role });
  return ok(next);
}

export function createUser(
  state: AppState,
  actor: User,
  input: { employeeId: string; name: string; email: string; role: Role },
): Result<AppState> {
  if (!canManageUsers(actor)) return fail("Only administrators can create users.");
  if (state.users.some((u) => u.employeeId.toUpperCase() === input.employeeId.toUpperCase()))
    return fail("That Employee ID already exists.");
  const user: User = {
    id: uid("u"),
    employeeId: input.employeeId.toUpperCase(),
    name: input.name,
    email: input.email,
    role: input.role,
    active: true,
    projectIds: state.projects.map((p) => p.id),
  };
  let next: AppState = { ...state, users: [...state.users, user] };
  next = audit(next, actor.id, "user.created", "User", user.id, { employeeId: user.employeeId });
  return ok(next);
}

export function createProject(
  state: AppState,
  actor: User,
  input: { code: string; name: string; description: string },
): Result<AppState> {
  if (!canManageProjects(actor)) return fail("Only administrators can create projects.");
  const project = { id: uid("p"), active: true, ...input, code: input.code.toUpperCase() };
  let next: AppState = { ...state, projects: [...state.projects, project] };
  next = audit(next, actor.id, "project.created", "Project", project.id, { code: project.code });
  return ok(next);
}

export function createTestCase(
  state: AppState,
  actor: User,
  input: {
    code: string;
    title: string;
    description: string;
    projectId: string;
    moduleId: string;
    environmentId: string;
    priority: Priority;
    steps: { action: string; expected: string }[];
  },
): Result<AppState> {
  if (!canManageTestCases(actor)) return fail("You cannot manage test cases.");
  if (state.testCases.some((t) => t.code.toUpperCase() === input.code.toUpperCase()))
    return fail("That test case ID already exists.");
  if (!input.steps.length) return fail("A test case needs at least one step.");

  const id = uid("tc");
  const testCase: TestCase = {
    id,
    code: input.code.toUpperCase(),
    title: input.title,
    description: input.description,
    projectId: input.projectId,
    moduleId: input.moduleId,
    environmentId: input.environmentId,
    priority: input.priority,
    version: "1.0",
    preconditions: [],
    testData: "",
  };
  let next: AppState = {
    ...state,
    testCases: [...state.testCases, testCase],
    testSteps: [
      ...state.testSteps,
      ...input.steps.map((s, i) => ({
        id: `${id}-s${i + 1}`,
        testCaseId: id,
        index: i + 1,
        action: s.action,
        expected: s.expected,
        evidenceRequired: false,
      })),
    ],
  };
  next = audit(next, actor.id, "testcase.created", "TestCase", id, { code: testCase.code });
  return ok(next);
}

export function createAssignment(
  state: AppState,
  actor: User,
  input: { testCaseId: string; testerId: string; dueAt: string; priority: Priority },
): Result<AppState> {
  if (!canManageAssignments(actor)) return fail("You cannot create assignments.");
  const testCase = testCaseById(state, input.testCaseId);
  const tester = userById(state, input.testerId);
  if (!testCase || !tester) return fail("Select a valid test case and tester.");

  const assignmentId = uid("as");
  const executionId = uid("exec");
  const code = `EX-${1100 + state.executions.length}`;
  let next: AppState = {
    ...state,
    assignments: [
      ...state.assignments,
      {
        id: assignmentId,
        testCaseId: input.testCaseId,
        testerId: input.testerId,
        assignedById: actor.id,
        assignedAt: new Date().toISOString(),
        dueAt: input.dueAt,
        priority: input.priority,
      },
    ],
    executions: [
      ...state.executions,
      {
        id: executionId,
        code,
        assignmentId,
        testCaseId: input.testCaseId,
        testerId: input.testerId,
        status: ExecutionStatus.ASSIGNED,
        startedAt: null,
        submittedAt: null,
        completedAt: null,
        updatedAt: new Date().toISOString(),
        blockReason: null,
        summary: "",
        round: 1,
      },
    ],
  };
  next = audit(next, actor.id, "assignment.created", "TestAssignment", assignmentId, {
    testCase: testCase.code,
    tester: tester.name,
  });
  next = notify(
    next,
    [tester.id],
    "New test assigned",
    `${testCase.code} ${testCase.title} is assigned to you.`,
    "/my-tests",
  );
  return ok(next);
}
