// Domain services: all business rules, state transitions, audit and
// notification side effects live here. UI never mutates state directly.
//
// The check is the central business object. An Execution is a run of one
// Template (a fixed, immutable revision) against one Unit; a CheckResult is
// one attempt at one check within that execution. Retest is modeled at the
// check level: requestRetest creates a fresh, numbered attempt row for each
// flagged check (never mutating the prior attempt), so history — "Attempt 1
// Failed 14:22, Attempt 2 Passed 15:11" — is always a real record, not a
// derived guess.
import {
  canTransition,
  ExecutionStatus,
  RESOLVED_CHECK_STATUSES,
  FAILED_CHECK_STATUSES,
  type AppState,
  type AuditEvent,
  type CheckResult,
  type CheckStatus,
  type CheckType,
  type Device,
  type Evidence,
  type Execution,
  type FailureSeverity,
  type Location,
  type Notification,
  type Plant,
  type Priority,
  type Review,
  type Role,
  type Station,
  type StationStatus,
  type Template,
  type TemplateCategory,
  type TemplateCheck,
  type TemplateStatus,
  type Unit,
  type User,
} from "@/types/domain";
import {
  canExecuteTest,
  canManageAssignments,
  canManageDevices,
  canManageFailureCategories,
  canManagePlants,
  canManageStations,
  canManageTemplates,
  canManageUsers,
  canReviewExecution,
  canSubmitExecution,
} from "./permissions";

export const DEMO_PASSWORD = "pibythree@2026";
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

const qualityCheckerIds = (state: AppState) =>
  state.users
    .filter(
      (u) =>
        u.active && (u.role === "quality_checker" || u.role === "manager" || u.role === "admin"),
    )
    .map((u) => u.id);

function patchExecution(state: AppState, id: string, patch: Partial<Execution>): AppState {
  return {
    ...state,
    executions: state.executions.map((e) =>
      e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
    ),
  };
}

// ---- selectors --------------------------------------------------------------

export const currentUser = (state: AppState): User | null =>
  state.session ? (state.users.find((u) => u.id === state.session!.userId) ?? null) : null;

export const userById = (state: AppState, id: string) => state.users.find((u) => u.id === id);
export const plantById = (state: AppState, id: string) => state.plants.find((p) => p.id === id);
export const locationById = (state: AppState, id: string) =>
  state.locations.find((l) => l.id === id);
export const stationById = (state: AppState, id: string) => state.stations.find((s) => s.id === id);
export const deviceById = (state: AppState, id: string) => state.devices.find((d) => d.id === id);
export const unitById = (state: AppState, id: string) => state.units.find((u) => u.id === id);
export const assignmentById = (state: AppState, id: string) =>
  state.assignments.find((a) => a.id === id);
export const executionById = (state: AppState, id: string) =>
  state.executions.find((e) => e.id === id);
export const templateById = (state: AppState, id: string) =>
  state.templates.find((t) => t.id === id);

export const templatesInFamily = (state: AppState, familyCode: string) =>
  state.templates
    .filter((t) => t.familyCode === familyCode)
    .sort((a, b) => b.revision - a.revision);

export const categoriesFor = (state: AppState, templateId: string) =>
  state.templateCategories
    .filter((c) => c.templateId === templateId)
    .sort((a, b) => a.sequence - b.sequence);

export const checksFor = (state: AppState, templateId: string) =>
  state.templateChecks
    .filter((c) => c.templateId === templateId)
    .sort((a, b) => a.sequence - b.sequence);

export const checksForCategory = (state: AppState, categoryId: string) =>
  state.templateChecks
    .filter((c) => c.categoryId === categoryId)
    .sort((a, b) => a.sequence - b.sequence);

export const checkById = (state: AppState, id: string) =>
  state.templateChecks.find((c) => c.id === id);

export const stationsForPlant = (state: AppState, plantId: string) =>
  state.stations.filter((s) => s.plantId === plantId);

export const stationsForLocation = (state: AppState, locationId: string) =>
  state.stations.filter((s) => s.locationId === locationId);

export const locationsForPlant = (state: AppState, plantId: string) =>
  state.locations.filter((l) => l.plantId === plantId);

// All CheckResult rows for one check, oldest attempt first (the real,
// never-overwritten retest history).
export const attemptsForCheck = (state: AppState, executionId: string, templateCheckId: string) =>
  state.checkResults
    .filter((r) => r.executionId === executionId && r.templateCheckId === templateCheckId)
    .sort((a, b) => a.attempt - b.attempt);

// The current (highest-attempt) result row for a check, if any.
export const currentCheckResult = (
  state: AppState,
  executionId: string,
  templateCheckId: string,
): CheckResult | undefined => {
  const attempts = attemptsForCheck(state, executionId, templateCheckId);
  return attempts[attempts.length - 1];
};

// Current result row per check for a whole execution (one entry per check,
// the latest attempt only) — what every screen should render as "the"
// result.
export function currentResultsFor(state: AppState, executionId: string): CheckResult[] {
  const byCheck = new Map<string, CheckResult>();
  for (const r of state.checkResults.filter((r) => r.executionId === executionId)) {
    const existing = byCheck.get(r.templateCheckId);
    if (!existing || r.attempt > existing.attempt) byCheck.set(r.templateCheckId, r);
  }
  return [...byCheck.values()];
}

export const evidenceFor = (state: AppState, executionId: string) =>
  state.evidence.filter((e) => e.executionId === executionId);

export const evidenceForCheck = (
  state: AppState,
  executionId: string,
  templateCheckId: string,
  attempt: number,
) =>
  state.evidence.filter(
    (e) =>
      e.executionId === executionId &&
      e.templateCheckId === templateCheckId &&
      e.attempt === attempt,
  );

// Current (max-attempt) result per check across every execution — the base
// for every cross-execution quality metric (FPY, failure rate, hotspots).
export function allCurrentResults(state: AppState): CheckResult[] {
  return state.executions.flatMap((e) => currentResultsFor(state, e.id));
}

export interface QualityMetrics {
  totalResolved: number;
  passed: number;
  failed: number;
  firstPassYield: number;
  failureRate: number;
  retestRate: number;
}

export function computeQualityMetrics(results: CheckResult[]): QualityMetrics {
  const resolved = results.filter((r) => RESOLVED_CHECK_STATUSES.includes(r.status));
  const passed = resolved.filter((r) => r.status === "passed" || r.status === "retest_passed");
  const failed = resolved.filter((r) => FAILED_CHECK_STATUSES.includes(r.status));
  const firstAttemptResolved = resolved.filter((r) => r.attempt === 1);
  const firstAttemptPassed = firstAttemptResolved.filter(
    (r) => r.status === "passed" || r.status === "na",
  );
  const everRetested = resolved.filter((r) => r.attempt > 1);
  return {
    totalResolved: resolved.length,
    passed: passed.length,
    failed: failed.length,
    firstPassYield: firstAttemptResolved.length
      ? Math.round((firstAttemptPassed.length / firstAttemptResolved.length) * 100)
      : 0,
    failureRate: resolved.length ? Math.round((failed.length / resolved.length) * 100) : 0,
    retestRate: resolved.length ? Math.round((everRetested.length / resolved.length) * 100) : 0,
  };
}

export function stationPerformance(state: AppState) {
  return state.stations.map((station) => {
    const executionIds = state.executions
      .filter((e) => e.stationId === station.id)
      .map((e) => e.id);
    const results = allCurrentResults(state).filter((r) => executionIds.includes(r.executionId));
    return { station, metrics: computeQualityMetrics(results) };
  });
}

export const reviewsFor = (state: AppState, executionId: string) =>
  state.reviews
    .filter((r) => r.executionId === executionId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const auditFor = (state: AppState, entityId: string) =>
  state.audit.filter((a) => a.entityId === entityId);

export function executionProgress(state: AppState, execution: Execution) {
  const checks = checksFor(state, execution.templateId);
  const results = currentResultsFor(state, execution.id);
  const resultByCheck = new Map(results.map((r) => [r.templateCheckId, r]));
  const done = checks.filter((c) => {
    const r = resultByCheck.get(c.id);
    return r && RESOLVED_CHECK_STATUSES.includes(r.status);
  });
  const failed = checks.filter((c) => {
    const r = resultByCheck.get(c.id);
    return r && FAILED_CHECK_STATUSES.includes(r.status);
  });
  const passed = checks.filter((c) => {
    const r = resultByCheck.get(c.id);
    return r && (r.status === "passed" || r.status === "retest_passed");
  });
  const na = checks.filter((c) => resultByCheck.get(c.id)?.status === "na");
  const retestPending = checks.filter((c) => {
    const r = resultByCheck.get(c.id);
    return r && (r.status === "retest_required" || r.status === "retest_in_progress");
  });
  const mandatoryRemaining = checks.filter((c) => {
    if (!c.mandatory) return false;
    const r = resultByCheck.get(c.id);
    return !r || !RESOLVED_CHECK_STATUSES.includes(r.status);
  });
  // A template can carry many supplementary, non-mandatory checks alongside
  // the small set that actually gates submission (see the OJAS-EQT seed:
  // 113 checks, 17 mandatory). "Progress" means progress toward that gate,
  // not a count diluted by checks nobody is required to touch.
  const mandatoryChecks = checks.filter((c) => c.mandatory);
  const mandatoryDone = done.filter((c) => c.mandatory);
  return {
    total: mandatoryChecks.length,
    completed: mandatoryDone.length,
    passed: passed.length,
    failed: failed.length,
    na: na.length,
    retestPending: retestPending.length,
    mandatoryRemaining,
    percent: mandatoryChecks.length
      ? Math.round((mandatoryDone.length / mandatoryChecks.length) * 100)
      : 0,
  };
}

// ---- authentication -----------------------------------------------------

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
    session: {
      userId,
      issuedAt: new Date().toISOString(),
      plantId: null,
      locationId: null,
      locationVerifiedAt: null,
      stationId: null,
      stationVerifiedAt: null,
      deviceGeo: null,
    },
  };
  next = audit(next, userId, "auth.login", "User", userId);
  return ok(next);
}

export function logout(state: AppState): AppState {
  return { ...state, session: null, pendingLoginUserId: null };
}

// ---- location / station verification --------------------------------------
//
// A real gate, not decorative UI: canAccessWorksheet below is what every
// protected tester route must check, so navigating straight to an
// execution URL without verifying redirects back rather than rendering.

export function verifyLocation(
  state: AppState,
  actor: User,
  plantId: string,
  locationId: string,
  deviceGeo?: { lat: number; lng: number; accuracyM: number } | null,
): Result<AppState> {
  if (!state.session || state.session.userId !== actor.id) return fail("Session expired.");
  const plant = plantById(state, plantId);
  const location = locationById(state, locationId);
  if (!plant || !location || location.plantId !== plantId)
    return fail("Select a valid plant and location.");
  const capturedGeo = deviceGeo ? { ...deviceGeo, capturedAt: new Date().toISOString() } : null;
  let next: AppState = {
    ...state,
    session: {
      ...state.session,
      plantId,
      locationId,
      locationVerifiedAt: new Date().toISOString(),
      stationId: null,
      stationVerifiedAt: null,
      deviceGeo: capturedGeo,
    },
  };
  const metadata: Record<string, string | number> = {
    plant: plant.name,
    location: location.name,
  };
  if (capturedGeo) {
    metadata["deviceSignal"] =
      `${capturedGeo.lat.toFixed(4)}, ${capturedGeo.lng.toFixed(4)} (±${Math.round(capturedGeo.accuracyM)}m)`;
  }
  next = audit(next, actor.id, "location.verified", "User", actor.id, metadata);
  return ok(next);
}

export function verifyStation(state: AppState, actor: User, stationId: string): Result<AppState> {
  if (!state.session || state.session.userId !== actor.id) return fail("Session expired.");
  if (!state.session.locationVerifiedAt)
    return fail("Verify your location before selecting a station.");
  const station = stationById(state, stationId);
  if (
    !station ||
    station.plantId !== state.session.plantId ||
    station.locationId !== state.session.locationId
  )
    return fail("Select a station within your verified location.");
  if (station.status !== "active") return fail("This station is not currently active.");
  let next: AppState = {
    ...state,
    session: { ...state.session, stationId, stationVerifiedAt: new Date().toISOString() },
  };
  next = audit(next, actor.id, "station.verified", "User", actor.id, { station: station.code });
  return ok(next);
}

export function canAccessWorksheet(state: AppState, user: User): boolean {
  if (user.role !== "tester") return true;
  return !!(state.session?.locationVerifiedAt && state.session?.stationVerifiedAt);
}

// ---- execution workflow -----------------------------------------------------

export function startExecution(
  state: AppState,
  actor: User,
  executionId: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("You are not permitted to execute this test.");
  if (!canAccessWorksheet(state, actor))
    return fail("Verify your location and station before starting a test.");
  if (execution.status === ExecutionStatus.IN_PROGRESS) return ok(state);
  if (!canTransition(execution.status, ExecutionStatus.IN_PROGRESS))
    return fail("This execution cannot be started from its current state.");

  let next = patchExecution(state, executionId, {
    status: ExecutionStatus.IN_PROGRESS,
    startedAt: execution.startedAt ?? new Date().toISOString(),
  });
  next = audit(next, actor.id, "execution.started", "Execution", executionId, {
    code: execution.code,
  });
  return ok(next);
}

export function resumeForRetest(
  state: AppState,
  actor: User,
  executionId: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("You cannot resume this execution.");
  if (execution.status !== ExecutionStatus.RETEST_REQUIRED) return ok(state);
  let next = patchExecution(state, executionId, { status: ExecutionStatus.RETEST_IN_PROGRESS });
  next = audit(next, actor.id, "execution.retest_started", "Execution", executionId, {
    code: execution.code,
  });
  return ok(next);
}

interface CheckResultPatch {
  status?: "passed" | "failed" | "na";
  actualResult?: string;
  measurementValue?: number | null;
  failureCategory?: string | null;
  failureSeverity?: FailureSeverity | null;
  failureDescription?: string;
  testerNotes?: string;
}

function computeFinalStatus(
  check: TemplateCheck,
  patchStatus: "passed" | "failed" | "na",
  measurementValue: number | null | undefined,
  isRetestAttempt: boolean,
): CheckStatus {
  let base: "passed" | "failed" | "na" = patchStatus;
  if (
    check.testType === "measurement" &&
    measurementValue != null &&
    check.measurementMin != null &&
    check.measurementMax != null &&
    patchStatus !== "na"
  ) {
    base =
      measurementValue >= check.measurementMin && measurementValue <= check.measurementMax
        ? "passed"
        : "failed";
  }
  if (isRetestAttempt && base === "passed") return "retest_passed";
  if (isRetestAttempt && base === "failed") return "retest_failed";
  return base;
}

export function saveCheckResult(
  state: AppState,
  actor: User,
  executionId: string,
  templateCheckId: string,
  patch: CheckResultPatch,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canExecuteTest(actor, execution)) return fail("This execution is read-only for you.");
  const check = checkById(state, templateCheckId);
  if (!check) return fail("Check not found.");

  const existing = currentCheckResult(state, executionId, templateCheckId);
  const isRetestAttempt = (existing?.attempt ?? 1) > 1;
  const updatedAt = new Date().toISOString();

  const finalStatus: CheckStatus | undefined = patch.status
    ? computeFinalStatus(check, patch.status, patch.measurementValue, isRetestAttempt)
    : undefined;
  const inProgressStatus: CheckStatus = isRetestAttempt ? "retest_in_progress" : "in_progress";

  const merged: Partial<CheckResult> = {
    ...patch,
    status: finalStatus ?? existing?.status ?? inProgressStatus,
    completedAt: finalStatus ? updatedAt : (existing?.completedAt ?? null),
    updatedAt,
  };

  const checkResults = existing
    ? state.checkResults.map((r) => (r.id === existing.id ? { ...r, ...merged } : r))
    : [
        ...state.checkResults,
        {
          id: uid("cr"),
          executionId,
          templateCheckId,
          attempt: 1,
          status: inProgressStatus,
          actualResult: "",
          measurementValue: null,
          failureCategory: null,
          failureSeverity: null,
          failureDescription: "",
          testerNotes: "",
          reviewerNotes: "",
          retestReason: null,
          testerId: actor.id,
          completedAt: null,
          updatedAt,
          ...merged,
        } as CheckResult,
      ];

  let next: AppState = { ...state, checkResults };
  if (execution.status === ExecutionStatus.ASSIGNED) {
    next = patchExecution(next, executionId, {
      status: ExecutionStatus.IN_PROGRESS,
      startedAt: execution.startedAt ?? updatedAt,
    });
  } else {
    next = patchExecution(next, executionId, {});
  }
  if (patch.status) {
    next = audit(next, actor.id, "check.result_changed", "Execution", executionId, {
      checkCode: check.checkCode,
      status: finalStatus ?? patch.status,
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

export function validateSubmission(state: AppState, execution: Execution): string[] {
  const checks = checksFor(state, execution.templateId);
  const results = currentResultsFor(state, execution.id);
  const evidence = evidenceFor(state, execution.id);
  const problems: string[] = [];

  for (const check of checks) {
    const r = results.find((x) => x.templateCheckId === check.id);
    if (!r || !RESOLVED_CHECK_STATUSES.includes(r.status)) {
      if (check.mandatory) problems.push(`${check.checkCode} has no recorded outcome.`);
      continue;
    }
    if (r.status !== "na" && !r.actualResult.trim() && check.testType !== "measurement") {
      problems.push(`${check.checkCode} is missing an actual result.`);
    }
    if (FAILED_CHECK_STATUSES.includes(r.status)) {
      if (!r.failureCategory) problems.push(`${check.checkCode} requires a failure category.`);
      if (r.failureDescription.trim().length < 5)
        problems.push(`${check.checkCode} requires a failure description.`);
    }
    const needsEvidence = check.evidenceRequired || FAILED_CHECK_STATUSES.includes(r.status);
    if (
      needsEvidence &&
      !evidence.some((e) => e.templateCheckId === check.id && e.attempt === r.attempt)
    ) {
      problems.push(`${check.checkCode} requires attached evidence.`);
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

  const resubmission = reviewsFor(state, executionId).length > 0;
  let next = patchExecution(state, executionId, {
    status: ExecutionStatus.PENDING_REVIEW,
    submittedAt: new Date().toISOString(),
    round: resubmission ? execution.round + 1 : execution.round,
  });
  next = audit(
    next,
    actor.id,
    resubmission ? "execution.resubmitted" : "execution.submitted",
    "Execution",
    executionId,
    { code: execution.code },
  );
  const unit = unitById(next, execution.unitId);
  next = notify(
    next,
    qualityCheckerIds(next),
    resubmission
      ? "Execution resubmitted for verification"
      : "Execution submitted for verification",
    `${execution.code} (${unit?.usn ?? ""}) from ${actor.name}.`,
    `/reviews/${executionId}`,
  );
  return ok(next);
}

// ---- review workflow -----------------------------------------------------

export function approveExecution(
  state: AppState,
  actor: User,
  executionId: string,
  comment: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canReviewExecution(actor, execution)) return fail("You cannot approve this execution.");

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
        affectedCheckIds: [],
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
  next = audit(next, actor.id, "review.approved", "Execution", executionId, {
    code: execution.code,
  });
  next = audit(next, actor.id, "execution.completed", "Execution", executionId, {
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

export function rejectExecution(
  state: AppState,
  actor: User,
  executionId: string,
  comment: string,
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canReviewExecution(actor, execution)) return fail("You cannot reject this execution.");
  if (comment.trim().length < 15)
    return fail("A rejection needs a comment of at least 15 characters.");

  let next: AppState = {
    ...state,
    reviews: [
      {
        id: uid("rv"),
        executionId,
        reviewerId: actor.id,
        decision: "rejected",
        comment: comment.trim(),
        affectedCheckIds: [],
        createdAt: new Date().toISOString(),
        round: execution.round,
      },
      ...state.reviews,
    ],
  };
  next = patchExecution(next, executionId, { status: ExecutionStatus.REJECTED });
  next = audit(next, actor.id, "review.rejected", "Execution", executionId, {
    code: execution.code,
  });
  next = notify(
    next,
    [execution.testerId],
    "Execution rejected",
    `${actor.name} rejected ${execution.code}: ${comment.trim()}`,
    `/executions/${executionId}`,
  );
  return ok(next);
}

export function requestRetest(
  state: AppState,
  actor: User,
  executionId: string,
  comment: string,
  affectedCheckIds: string[],
): Result<AppState> {
  const execution = executionById(state, executionId);
  if (!execution) return fail("Execution not found.");
  if (!canReviewExecution(actor, execution)) return fail("You cannot review this execution.");
  if (comment.trim().length < 15)
    return fail("A retest request needs a comment of at least 15 characters.");
  if (!affectedCheckIds.length) return fail("Select at least one check that requires a retest.");

  const timestamp = new Date().toISOString();
  let next: AppState = {
    ...state,
    reviews: [
      {
        id: uid("rv"),
        executionId,
        reviewerId: actor.id,
        decision: "retest_requested",
        comment: comment.trim(),
        affectedCheckIds,
        createdAt: timestamp,
        round: execution.round,
      },
      ...state.reviews,
    ],
  };

  // Each flagged check gets a brand-new attempt row — the prior attempt's
  // result is never mutated, so "Attempt 1 Failed" remains a real record.
  for (const templateCheckId of affectedCheckIds) {
    const previous = currentCheckResult(next, executionId, templateCheckId);
    next = {
      ...next,
      checkResults: [
        ...next.checkResults,
        {
          id: uid("cr"),
          executionId,
          templateCheckId,
          attempt: (previous?.attempt ?? 0) + 1,
          status: "retest_required",
          actualResult: "",
          measurementValue: null,
          failureCategory: null,
          failureSeverity: null,
          failureDescription: "",
          testerNotes: "",
          reviewerNotes: comment.trim(),
          retestReason: comment.trim(),
          testerId: execution.testerId,
          completedAt: null,
          updatedAt: timestamp,
        },
      ],
    };
  }

  next = patchExecution(next, executionId, { status: ExecutionStatus.RETEST_REQUIRED });
  next = audit(next, actor.id, "review.retest_requested", "Execution", executionId, {
    code: execution.code,
    checks: affectedCheckIds.length,
  });
  next = notify(
    next,
    [execution.testerId],
    "Retest required",
    `${actor.name} requested a retest on ${affectedCheckIds.length} check(s) for ${execution.code}.`,
    `/executions/${executionId}`,
  );
  return ok(next);
}

// ---- evidence ---------------------------------------------------------------

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
  templateCheckId: string | null,
  attempt: number,
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
    templateCheckId,
    attempt,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    dataUrl: file.dataUrl,
    capturedById: actor.id,
    capturedAt: new Date().toISOString(),
  };
  let next: AppState = { ...state, evidence: [item, ...state.evidence] };
  next = audit(next, actor.id, "evidence.uploaded", "Execution", executionId, {
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
  next = audit(next, actor.id, "evidence.removed", "Execution", item.executionId, {
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

// ---- assignment --------------------------------------------------------------

export function createAssignment(
  state: AppState,
  actor: User,
  input: {
    unitId: string;
    templateId: string;
    testerId: string;
    stationId: string;
    priority: Priority;
    dueAt: string;
  },
): Result<AppState> {
  if (!canManageAssignments(actor)) return fail("You cannot create assignments.");
  const unit = unitById(state, input.unitId);
  const template = templateById(state, input.templateId);
  const tester = userById(state, input.testerId);
  const station = stationById(state, input.stationId);
  if (!unit || !tester || !station) return fail("Select a valid unit, tester and station.");
  if (!template || template.status !== "published")
    return fail("Only a published template can be assigned.");

  const assignmentId = uid("as");
  const executionId = uid("exec");
  const code = `EX-${1100 + state.executions.length}`;
  let next: AppState = {
    ...state,
    assignments: [
      ...state.assignments,
      {
        id: assignmentId,
        unitId: input.unitId,
        templateId: input.templateId,
        testerId: input.testerId,
        stationId: input.stationId,
        priority: input.priority,
        dueAt: input.dueAt,
        assignedById: actor.id,
        assignedAt: new Date().toISOString(),
      },
    ],
    executions: [
      ...state.executions,
      {
        id: executionId,
        code,
        assignmentId,
        unitId: input.unitId,
        templateId: input.templateId,
        testerId: input.testerId,
        stationId: input.stationId,
        status: ExecutionStatus.ASSIGNED,
        locationVerifiedAt: null,
        stationVerifiedAt: null,
        startedAt: null,
        submittedAt: null,
        completedAt: null,
        updatedAt: new Date().toISOString(),
        summary: "",
        round: 1,
      },
    ],
  };
  next = audit(next, actor.id, "assignment.created", "Assignment", assignmentId, {
    unit: unit.usn,
    tester: tester.name,
  });
  next = notify(
    next,
    [tester.id],
    "New unit assigned",
    `${unit.usn} (${template.name} Rev ${template.revision}) is assigned to you at ${station.code}.`,
    "/my-tests",
  );
  return ok(next);
}

export function reassignAssignment(
  state: AppState,
  actor: User,
  assignmentId: string,
  newTesterId: string,
  reason: string,
): Result<AppState> {
  if (!canManageAssignments(actor)) return fail("You cannot reassign assignments.");
  const assignment = assignmentById(state, assignmentId);
  const newTester = userById(state, newTesterId);
  if (!assignment || !newTester) return fail("Select a valid assignment and tester.");
  if (reason.trim().length < 5) return fail("Provide a reason for the reassignment.");
  const execution = state.executions.find((e) => e.assignmentId === assignmentId);
  if (execution && [ExecutionStatus.APPROVED, ExecutionStatus.COMPLETED].includes(execution.status))
    return fail("This execution is already complete and cannot be reassigned.");

  const previousTester = userById(state, assignment.testerId);
  let next: AppState = {
    ...state,
    assignments: state.assignments.map((a) =>
      a.id === assignmentId ? { ...a, testerId: newTesterId } : a,
    ),
    executions: state.executions.map((e) =>
      e.assignmentId === assignmentId ? { ...e, testerId: newTesterId } : e,
    ),
  };
  next = audit(next, actor.id, "assignment.reassigned", "Assignment", assignmentId, {
    from: previousTester?.name ?? "",
    to: newTester.name,
    reason: reason.trim(),
  });
  next = notify(
    next,
    [newTesterId],
    "Assignment reassigned to you",
    `${previousTester?.name ?? "A colleague"}'s assignment was reassigned to you: ${reason.trim()}`,
    "/my-tests",
  );
  return ok(next);
}

// ---- template management (versioned, immutable once published) -----------

function nextSequence(items: { sequence: number }[]): number {
  return items.length ? Math.max(...items.map((i) => i.sequence)) + 1 : 1;
}

export function isEditableTemplate(template: Template): boolean {
  return template.status === "draft" || template.status === "under_review";
}

export function createTemplate(
  state: AppState,
  actor: User,
  input: { familyCode: string; name: string },
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot create templates.");
  const existingRevisions = templatesInFamily(state, input.familyCode);
  const revision = existingRevisions.length ? existingRevisions[0]!.revision + 1 : 1;
  const timestamp = new Date().toISOString();
  const template: Template = {
    id: uid("tpl"),
    familyCode: input.familyCode.toUpperCase(),
    name: input.name,
    revision,
    status: "draft",
    createdById: actor.id,
    createdAt: timestamp,
    updatedById: actor.id,
    updatedAt: timestamp,
    approvedById: null,
    publishedAt: null,
    totalChecks: 0,
    mandatoryChecks: 0,
  };
  let next: AppState = { ...state, templates: [...state.templates, template] };
  next = audit(next, actor.id, "template.created", "Template", template.id, {
    familyCode: template.familyCode,
    revision,
  });
  return ok(next);
}

export function createTemplateRevision(
  state: AppState,
  actor: User,
  templateId: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot create template revisions.");
  const source = templateById(state, templateId);
  if (!source) return fail("Template not found.");
  const revision = templatesInFamily(state, source.familyCode)[0]!.revision + 1;
  const timestamp = new Date().toISOString();
  const newTemplate: Template = {
    ...source,
    id: uid("tpl"),
    revision,
    status: "draft",
    createdById: actor.id,
    createdAt: timestamp,
    updatedById: actor.id,
    updatedAt: timestamp,
    approvedById: null,
    publishedAt: null,
  };

  const categoryIdMap = new Map<string, string>();
  const newCategories: TemplateCategory[] = categoriesFor(state, templateId).map((c) => {
    const id = uid("cat");
    categoryIdMap.set(c.id, id);
    return { ...c, id, templateId: newTemplate.id };
  });
  const newChecks: TemplateCheck[] = checksFor(state, templateId).map((c) => ({
    ...c,
    id: uid("chk"),
    templateId: newTemplate.id,
    categoryId: categoryIdMap.get(c.categoryId) ?? c.categoryId,
  }));

  let next: AppState = {
    ...state,
    templates: [...state.templates, newTemplate],
    templateCategories: [...state.templateCategories, ...newCategories],
    templateChecks: [...state.templateChecks, ...newChecks],
  };
  next = audit(next, actor.id, "template.revision_created", "Template", newTemplate.id, {
    familyCode: source.familyCode,
    fromRevision: source.revision,
    toRevision: revision,
  });
  return ok(next);
}

export function addTemplateCategory(
  state: AppState,
  actor: User,
  templateId: string,
  name: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const template = templateById(state, templateId);
  if (!template) return fail("Template not found.");
  if (!isEditableTemplate(template)) return fail("Published templates cannot be edited directly.");
  const category: TemplateCategory = {
    id: uid("cat"),
    templateId,
    name,
    sequence: nextSequence(categoriesFor(state, templateId)),
  };
  return ok({ ...state, templateCategories: [...state.templateCategories, category] });
}

export interface TemplateCheckInput {
  categoryId: string;
  checkCode: string;
  title: string;
  description: string;
  instruction: string;
  expectedResult: string;
  acceptanceCriteria: string;
  testType: CheckType;
  mandatory: boolean;
  allowNA: boolean;
  evidenceRequired: boolean;
  measurementUnit: string | null;
  measurementMin: number | null;
  measurementMax: number | null;
  defaultFailureCategory: string | null;
}

export function addTemplateCheck(
  state: AppState,
  actor: User,
  templateId: string,
  input: TemplateCheckInput,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const template = templateById(state, templateId);
  if (!template) return fail("Template not found.");
  if (!isEditableTemplate(template)) return fail("Published templates cannot be edited directly.");
  if (
    checksFor(state, templateId).some(
      (c) => c.checkCode.toUpperCase() === input.checkCode.toUpperCase(),
    )
  )
    return fail("That check ID already exists on this template.");

  const check: TemplateCheck = {
    id: uid("chk"),
    templateId,
    sequence: nextSequence(checksFor(state, templateId)),
    ...input,
    checkCode: input.checkCode.toUpperCase(),
  };
  const templates = state.templates.map((t) =>
    t.id === templateId
      ? {
          ...t,
          totalChecks: t.totalChecks + 1,
          mandatoryChecks: t.mandatoryChecks + (input.mandatory ? 1 : 0),
        }
      : t,
  );
  return ok({ ...state, templates, templateChecks: [...state.templateChecks, check] });
}

export function updateTemplateCheck(
  state: AppState,
  actor: User,
  checkId: string,
  patch: Partial<TemplateCheckInput>,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const check = checkById(state, checkId);
  if (!check) return fail("Check not found.");
  const template = templateById(state, check.templateId);
  if (!template || !isEditableTemplate(template))
    return fail("Published templates cannot be edited directly.");
  if (
    patch.checkCode &&
    checksFor(state, check.templateId).some(
      (c) => c.id !== checkId && c.checkCode.toUpperCase() === patch.checkCode!.toUpperCase(),
    )
  )
    return fail("That check ID already exists on this template.");

  const templates =
    patch.mandatory === undefined || patch.mandatory === check.mandatory
      ? state.templates
      : state.templates.map((t) =>
          t.id === check.templateId
            ? { ...t, mandatoryChecks: t.mandatoryChecks + (patch.mandatory ? 1 : -1) }
            : t,
        );
  const templateChecks = state.templateChecks.map((c) =>
    c.id === checkId
      ? { ...c, ...patch, checkCode: patch.checkCode ? patch.checkCode.toUpperCase() : c.checkCode }
      : c,
  );
  return ok({ ...state, templates, templateChecks });
}

export function updateTemplateCategory(
  state: AppState,
  actor: User,
  categoryId: string,
  name: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const category = state.templateCategories.find((c) => c.id === categoryId);
  if (!category) return fail("Category not found.");
  const template = templateById(state, category.templateId);
  if (!template || !isEditableTemplate(template))
    return fail("Published templates cannot be edited directly.");
  return ok({
    ...state,
    templateCategories: state.templateCategories.map((c) =>
      c.id === categoryId ? { ...c, name } : c,
    ),
  });
}

export function removeTemplateCheck(
  state: AppState,
  actor: User,
  checkId: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const check = checkById(state, checkId);
  if (!check) return fail("Check not found.");
  const template = templateById(state, check.templateId);
  if (!template || !isEditableTemplate(template))
    return fail("Published templates cannot be edited directly.");
  const templates = state.templates.map((t) =>
    t.id === check.templateId
      ? {
          ...t,
          totalChecks: Math.max(0, t.totalChecks - 1),
          mandatoryChecks: Math.max(0, t.mandatoryChecks - (check.mandatory ? 1 : 0)),
        }
      : t,
  );
  return ok({
    ...state,
    templates,
    templateChecks: state.templateChecks.filter((c) => c.id !== checkId),
  });
}

export function moveTemplateCheck(
  state: AppState,
  actor: User,
  checkId: string,
  direction: "up" | "down",
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const check = checkById(state, checkId);
  if (!check) return fail("Check not found.");
  const template = templateById(state, check.templateId);
  if (!template || !isEditableTemplate(template))
    return fail("Published templates cannot be edited directly.");

  const ordered = checksFor(state, check.templateId);
  const index = ordered.findIndex((c) => c.id === checkId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= ordered.length) return ok(state);
  const other = ordered[swapIndex]!;
  const thisSeq = check.sequence;
  const otherSeq = other.sequence;
  return ok({
    ...state,
    templateChecks: state.templateChecks.map((c) => {
      if (c.id === check.id) return { ...c, sequence: otherSeq };
      if (c.id === other.id) return { ...c, sequence: thisSeq };
      return c;
    }),
  });
}

export function validateTemplate(state: AppState, templateId: string): string[] {
  const problems: string[] = [];
  const categories = categoriesFor(state, templateId);
  const checks = checksFor(state, templateId);
  if (!checks.length) problems.push("The template has no checks.");
  const seenCodes = new Set<string>();
  const seenSequence = new Set<number>();
  for (const check of checks) {
    if (seenCodes.has(check.checkCode)) problems.push(`Duplicate check ID ${check.checkCode}.`);
    seenCodes.add(check.checkCode);
    if (seenSequence.has(check.sequence))
      problems.push(`Duplicate sequence number ${check.sequence}.`);
    seenSequence.add(check.sequence);
    if (!categories.some((c) => c.id === check.categoryId))
      problems.push(`${check.checkCode} has no valid category.`);
    if (check.mandatory && !check.expectedResult.trim())
      problems.push(`${check.checkCode} is mandatory but has no expected result.`);
    if (
      check.testType === "measurement" &&
      check.measurementMin != null &&
      check.measurementMax != null &&
      check.measurementMin > check.measurementMax
    ) {
      problems.push(`${check.checkCode} has an invalid measurement range.`);
    }
    if (!check.title.trim()) problems.push(`${check.checkCode} is missing a title.`);
  }
  return problems;
}

export function publishTemplate(
  state: AppState,
  actor: User,
  templateId: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot publish templates.");
  const template = templateById(state, templateId);
  if (!template) return fail("Template not found.");
  if (template.status === "published") return ok(state);
  if (template.status === "archived") return fail("An archived template cannot be published.");
  const problems = validateTemplate(state, templateId);
  if (problems.length) return fail(problems[0] ?? "Template is invalid.");

  const timestamp = new Date().toISOString();
  const checks = checksFor(state, templateId);
  let next: AppState = {
    ...state,
    templates: state.templates.map((t) =>
      t.id === templateId
        ? {
            ...t,
            status: "published" as TemplateStatus,
            publishedAt: timestamp,
            approvedById: actor.id,
            totalChecks: checks.length,
            mandatoryChecks: checks.filter((c) => c.mandatory).length,
          }
        : t,
    ),
  };
  next = audit(next, actor.id, "template.published", "Template", templateId, {
    familyCode: template.familyCode,
    revision: template.revision,
  });
  return ok(next);
}

export function archiveTemplate(
  state: AppState,
  actor: User,
  templateId: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot archive templates.");
  const template = templateById(state, templateId);
  if (!template) return fail("Template not found.");
  let next: AppState = {
    ...state,
    templates: state.templates.map((t) => (t.id === templateId ? { ...t, status: "archived" } : t)),
  };
  next = audit(next, actor.id, "template.archived", "Template", templateId, {
    familyCode: template.familyCode,
    revision: template.revision,
  });
  return ok(next);
}

export function submitTemplateForReview(
  state: AppState,
  actor: User,
  templateId: string,
): Result<AppState> {
  if (!canManageTemplates(actor)) return fail("You cannot edit templates.");
  const template = templateById(state, templateId);
  if (!template || template.status !== "draft")
    return fail("Only a draft template can be submitted for review.");
  return ok({
    ...state,
    templates: state.templates.map((t) =>
      t.id === templateId ? { ...t, status: "under_review" } : t,
    ),
  });
}

export interface TemplateDiffEntry {
  checkCode: string;
  kind: "added" | "removed" | "modified";
}

export function diffTemplateRevisions(
  state: AppState,
  fromTemplateId: string,
  toTemplateId: string,
): TemplateDiffEntry[] {
  const before = new Map(checksFor(state, fromTemplateId).map((c) => [c.checkCode, c]));
  const after = new Map(checksFor(state, toTemplateId).map((c) => [c.checkCode, c]));
  const entries: TemplateDiffEntry[] = [];
  for (const [code, check] of after) {
    const prior = before.get(code);
    if (!prior) entries.push({ checkCode: code, kind: "added" });
    else if (
      prior.title !== check.title ||
      prior.instruction !== check.instruction ||
      prior.expectedResult !== check.expectedResult ||
      prior.mandatory !== check.mandatory
    )
      entries.push({ checkCode: code, kind: "modified" });
  }
  for (const code of before.keys()) {
    if (!after.has(code)) entries.push({ checkCode: code, kind: "removed" });
  }
  return entries;
}

// ---- AI-assisted insight ----------------------------------------------------
//
// No LLM call — this is a deterministic analysis over local data, always
// surfaced with a disclaimer. AI never approves, rejects, or overrides a
// result; it only summarizes what already happened.

export interface FailureHotspot {
  category: string;
  count: number;
}

export function failureHotspots(state: AppState): FailureHotspot[] {
  const counts = new Map<string, number>();
  for (const r of state.checkResults) {
    if (!FAILED_CHECK_STATUSES.includes(r.status) || !r.failureCategory) continue;
    counts.set(r.failureCategory, (counts.get(r.failureCategory) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export interface SimilarFailure {
  executionCode: string;
  checkCode: string;
  description: string;
  score: number;
}

function keywordOverlap(a: string, b: string): number {
  const wordsA = new Set(
    a
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
  const wordsB = new Set(
    b
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3),
  );
  let shared = 0;
  for (const w of wordsA) if (wordsB.has(w)) shared++;
  return shared;
}

export function similarFailures(
  state: AppState,
  description: string,
  excludeCheckResultId?: string,
  limit = 3,
): SimilarFailure[] {
  if (!description.trim()) return [];
  const scored: SimilarFailure[] = [];
  for (const r of state.checkResults) {
    if (r.id === excludeCheckResultId) continue;
    if (!FAILED_CHECK_STATUSES.includes(r.status) || !r.failureDescription.trim()) continue;
    const score = keywordOverlap(description, r.failureDescription);
    if (score === 0) continue;
    const execution = executionById(state, r.executionId);
    const check = checkById(state, r.templateCheckId);
    if (!execution || !check) continue;
    scored.push({
      executionCode: execution.code,
      checkCode: check.checkCode,
      description: r.failureDescription,
      score,
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

// ---- administration ---------------------------------------------------------

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
    plantIds: state.plants.map((p) => p.id),
  };
  let next: AppState = { ...state, users: [...state.users, user] };
  next = audit(next, actor.id, "user.created", "User", user.id, { employeeId: user.employeeId });
  return ok(next);
}

export function createPlant(
  state: AppState,
  actor: User,
  input: { code: string; name: string },
): Result<AppState> {
  if (!canManagePlants(actor)) return fail("Only administrators can create plants.");
  const plant: Plant = { id: uid("plant"), code: input.code.toUpperCase(), name: input.name };
  let next: AppState = { ...state, plants: [...state.plants, plant] };
  next = audit(next, actor.id, "plant.created", "Plant", plant.id, { code: plant.code });
  return ok(next);
}

export function createLocation(
  state: AppState,
  actor: User,
  input: { plantId: string; name: string },
): Result<AppState> {
  if (!canManagePlants(actor)) return fail("Only administrators can create locations.");
  const location: Location = { id: uid("loc"), plantId: input.plantId, name: input.name };
  let next: AppState = { ...state, locations: [...state.locations, location] };
  next = audit(next, actor.id, "location.created", "Location", location.id, {
    name: location.name,
  });
  return ok(next);
}

export function createStation(
  state: AppState,
  actor: User,
  input: { plantId: string; locationId: string; code: string; name: string },
): Result<AppState> {
  if (!canManageStations(actor)) return fail("Only administrators can create stations.");
  const station: Station = {
    id: uid("sta"),
    plantId: input.plantId,
    locationId: input.locationId,
    code: input.code.toUpperCase(),
    name: input.name,
    status: "active" as StationStatus,
  };
  let next: AppState = { ...state, stations: [...state.stations, station] };
  next = audit(next, actor.id, "station.created", "Station", station.id, { code: station.code });
  return ok(next);
}

export function setStationStatus(
  state: AppState,
  actor: User,
  stationId: string,
  status: StationStatus,
): Result<AppState> {
  if (!canManageStations(actor)) return fail("Only administrators can manage stations.");
  let next: AppState = {
    ...state,
    stations: state.stations.map((s) => (s.id === stationId ? { ...s, status } : s)),
  };
  next = audit(next, actor.id, "station.status_changed", "Station", stationId, { status });
  return ok(next);
}

export function createDevice(
  state: AppState,
  actor: User,
  input: { stationId: string; name: string },
): Result<AppState> {
  if (!canManageDevices(actor)) return fail("Only administrators can register devices.");
  const device: Device = {
    id: uid("dev"),
    stationId: input.stationId,
    name: input.name,
    status: "online",
    lastSeenAt: new Date().toISOString(),
    assignedTesterId: null,
  };
  let next: AppState = { ...state, devices: [...state.devices, device] };
  next = audit(next, actor.id, "device.created", "Device", device.id, { name: device.name });
  return ok(next);
}

export function setDeviceStatus(
  state: AppState,
  actor: User,
  deviceId: string,
  status: "online" | "offline",
): Result<AppState> {
  if (!canManageDevices(actor)) return fail("Only administrators can manage devices.");
  let next: AppState = {
    ...state,
    devices: state.devices.map((d) =>
      d.id === deviceId ? { ...d, status, lastSeenAt: new Date().toISOString() } : d,
    ),
  };
  next = audit(next, actor.id, "device.status_changed", "Device", deviceId, { status });
  return ok(next);
}

export function addFailureCategory(state: AppState, actor: User, name: string): Result<AppState> {
  if (!canManageFailureCategories(actor)) return fail("You cannot manage failure categories.");
  if (state.failureCategories.some((c) => c.toLowerCase() === name.toLowerCase()))
    return fail("That failure category already exists.");
  let next: AppState = { ...state, failureCategories: [...state.failureCategories, name] };
  next = audit(next, actor.id, "failure_category.created", "FailureCategory", name);
  return ok(next);
}

export function createUnit(
  state: AppState,
  actor: User,
  input: { usn: string; familyCode: string },
): Result<AppState> {
  if (!canManageAssignments(actor)) return fail("You cannot register units.");
  if (state.units.some((u) => u.usn.toUpperCase() === input.usn.toUpperCase()))
    return fail("That USN already exists.");
  const unit: Unit = {
    id: uid("unit"),
    usn: input.usn.toUpperCase(),
    familyCode: input.familyCode.toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  let next: AppState = { ...state, units: [...state.units, unit] };
  next = audit(next, actor.id, "unit.created", "Unit", unit.id, { usn: unit.usn });
  return ok(next);
}
