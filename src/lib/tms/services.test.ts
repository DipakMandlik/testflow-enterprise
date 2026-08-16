import { describe, expect, it } from "vitest";
import { createSeedState } from "./seed";
import { ExecutionStatus } from "@/types/domain";
import {
  addEvidence,
  approveExecution,
  auditFor,
  blockExecution,
  claimReview,
  currentUser,
  executionById,
  executionProgress,
  login,
  logout,
  removeEvidence,
  reopenForRevision,
  requestRevision,
  resultsFor,
  saveExecutionSummary,
  saveStepResult,
  startExecution,
  stepsFor,
  submitExecution,
  userById,
  validateEvidenceFile,
  validateSubmission,
  verifyOtp,
} from "./services";

function loggedInAs(employeeId: string) {
  let state = createSeedState();
  const loginResult = login(state, employeeId, "tata@2026");
  if (!loginResult.ok) throw new Error(loginResult.error);
  state = loginResult.value;
  const otpResult = verifyOtp(state, "123456");
  if (!otpResult.ok) throw new Error(otpResult.error);
  state = otpResult.value;
  const user = currentUser(state);
  if (!user) throw new Error("expected a session user");
  return { state, user };
}

describe("authentication", () => {
  it("rejects an unknown employee id", () => {
    const state = createSeedState();
    const result = login(state, "TE-0000", "tata@2026");
    expect(result.ok).toBe(false);
  });

  it("rejects a deactivated account", () => {
    const state = createSeedState();
    const result = login(state, "TE-1003", "tata@2026"); // Meera Nair, active: false
    expect(result.ok).toBe(false);
  });

  it("rejects the wrong password", () => {
    const state = createSeedState();
    const result = login(state, "TE-1001", "wrong-password");
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid OTP and does not create a session", () => {
    const state = createSeedState();
    const loginResult = login(state, "TE-1001", "tata@2026");
    expect(loginResult.ok).toBe(true);
    if (!loginResult.ok) return;
    const otpResult = verifyOtp(loginResult.value, "000000");
    expect(otpResult.ok).toBe(false);
    expect(currentUser(loginResult.value)).toBeNull();
  });

  it("logs Priya in end to end and records an audit event", () => {
    const { state, user } = loggedInAs("TE-1001");
    expect(user.name).toBe("Priya Sharma");
    expect(auditFor(state, user.id).some((a) => a.action === "auth.login")).toBe(true);
  });

  it("logout clears the session", () => {
    const { state } = loggedInAs("TE-1001");
    expect(currentUser(logout(state))).toBeNull();
  });
});

describe("tester execution workflow", () => {
  it("starts an assigned execution and moves it to in_progress", () => {
    const { state, user } = loggedInAs("TE-1001");
    const result = startExecution(state, user, "exec-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const execution = executionById(result.value, "exec-1");
    expect(execution?.status).toBe(ExecutionStatus.IN_PROGRESS);
    expect(execution?.startedAt).not.toBeNull();
  });

  it("blocks a tester from starting someone else's execution", () => {
    const { state, user } = loggedInAs("TE-1001");
    // exec-5 belongs to Vikram (u-vikram), not Priya.
    const result = startExecution(state, user, "exec-5");
    expect(result.ok).toBe(false);
  });

  it("moves an ASSIGNED execution to IN_PROGRESS the first time a step result is saved", () => {
    const { state, user } = loggedInAs("TE-1001");
    const result = saveStepResult(state, user, "exec-1", "tc-auth-001-s1", {
      status: "passed",
      actual: "Login screen rendered as expected.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(executionById(result.value, "exec-1")?.status).toBe(ExecutionStatus.IN_PROGRESS);
    const saved = resultsFor(result.value, "exec-1").find((r) => r.stepId === "tc-auth-001-s1");
    expect(saved?.status).toBe("passed");
  });

  it("blocking an execution requires a substantive reason and notifies reviewers", () => {
    const { state, user } = loggedInAs("TE-1001");
    const tooShort = startExecution(state, user, "exec-1");
    expect(tooShort.ok).toBe(true);
    if (!tooShort.ok) return;

    const rejected = blockExecution(tooShort.value, user, "exec-1", "too short");
    expect(rejected.ok).toBe(false);

    const accepted = blockExecution(
      tooShort.value,
      user,
      "exec-1",
      "Test bench offline for calibration.",
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(executionById(accepted.value, "exec-1")?.status).toBe(ExecutionStatus.BLOCKED);
    const rajesh = userById(accepted.value, "u-rajesh");
    expect(rajesh).toBeDefined();
    expect(
      accepted.value.notifications.some((n) => n.userId === "u-rajesh" && /blocked/i.test(n.title)),
    ).toBe(true);
  });

  it("rejects submission until every step has an outcome, actual result and required evidence", () => {
    const { state, user } = loggedInAs("TE-1001");
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const problems = validateSubmission(started.value, executionById(started.value, "exec-1")!);
    expect(problems.length).toBeGreaterThan(0);

    const submitAttempt = submitExecution(started.value, user, "exec-1");
    expect(submitAttempt.ok).toBe(false);
  });

  it("submits successfully once every step is complete, notifies reviewers and audits the event", () => {
    const { state: initialState, user } = loggedInAs("TE-1001");
    let state = initialState;
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    state = started.value;

    for (const step of stepsFor(state, "tc-auth-001")) {
      const patch =
        step.index === 3
          ? {
              status: "failed" as const,
              actual: "OTP rejected as invalid, as expected.",
              comment: "Confirmed the invalid-OTP path shows the correct error copy.",
            }
          : { status: "passed" as const, actual: `Step ${step.index} behaved as specified.` };
      const saved = saveStepResult(state, user, "exec-1", step.id, patch);
      expect(saved.ok).toBe(true);
      if (saved.ok) state = saved.value;

      if (step.evidenceRequired || patch.status === "failed") {
        const evidenced = addEvidence(state, user, "exec-1", step.id, {
          name: `step-${step.index}-capture.png`,
          size: 1024,
          type: "image/png",
          dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        });
        expect(evidenced.ok).toBe(true);
        if (evidenced.ok) state = evidenced.value;
      }
    }

    const problems = validateSubmission(state, executionById(state, "exec-1")!);
    expect(problems).toEqual([]);

    const submitted = submitExecution(state, user, "exec-1");
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    state = submitted.value;

    const execution = executionById(state, "exec-1")!;
    expect(execution.status).toBe(ExecutionStatus.SUBMITTED);
    expect(execution.submittedAt).not.toBeNull();
    expect(
      state.notifications.some((n) => n.userId === "u-rajesh" && /submitted/i.test(n.title)),
    ).toBe(true);
    expect(auditFor(state, "exec-1").some((a) => a.action === "execution.submitted")).toBe(true);
  });

  it("saves a free-text execution summary for the assigned tester only", () => {
    const { state, user } = loggedInAs("TE-1001");
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    const saved = saveExecutionSummary(
      started.value,
      user,
      "exec-1",
      "Ran the full suite without incident.",
    );
    expect(saved.ok).toBe(true);
    if (saved.ok)
      expect(executionById(saved.value, "exec-1")?.summary).toBe(
        "Ran the full suite without incident.",
      );
  });
});

describe("evidence", () => {
  it("rejects oversized files and disallowed types", () => {
    expect(
      validateEvidenceFile({ name: "trace.png", size: 6 * 1024 * 1024, type: "image/png" }),
    ).toMatch(/5 MB/);
    expect(
      validateEvidenceFile({ name: "trace.exe", size: 100, type: "application/x-msdownload" }),
    ).toMatch(/Allowed formats/);
    expect(validateEvidenceFile({ name: "trace.png", size: 100, type: "image/png" })).toBeNull();
  });

  it("attaches evidence to a step and removes it again while the execution is editable", () => {
    const { state, user } = loggedInAs("TE-1001");
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const added = addEvidence(started.value, user, "exec-1", "tc-auth-001-s1", {
      name: "capture.png",
      size: 2048,
      type: "image/png",
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.evidence.some((e) => e.filename === "capture.png")).toBe(true);

    const evidenceId = added.value.evidence.find((e) => e.filename === "capture.png")!.id;
    const removed = removeEvidence(added.value, user, evidenceId);
    expect(removed.ok).toBe(true);
    if (removed.ok) expect(removed.value.evidence.some((e) => e.id === evidenceId)).toBe(false);
  });
});

describe("full revision loop: submit -> send back -> revise -> resubmit -> approve", () => {
  it("keeps every screen's status derived from the same ExecutionStatus value throughout", () => {
    const priya = loggedInAs("TE-1001");
    let state = priya.state;

    // exec-4 (TC-SIG-003) starts SUBMITTED in the seed data.
    let execution = executionById(state, "exec-4")!;
    expect(execution.status).toBe(ExecutionStatus.SUBMITTED);

    // Reviewer claims and sends it back.
    const rajesh = (() => {
      const s = loggedInAs("TE-2001");
      return s;
    })();
    let reviewerState = { ...state, session: rajesh.state.session };

    const claimed = claimReview(reviewerState, rajesh.user, "exec-4");
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    reviewerState = claimed.value;
    expect(executionById(reviewerState, "exec-4")?.status).toBe(ExecutionStatus.UNDER_REVIEW);

    const sentBack = requestRevision(
      reviewerState,
      rajesh.user,
      "exec-4",
      "Please re-measure jitter with a certified cable before we accept this.",
    );
    expect(sentBack.ok).toBe(true);
    if (!sentBack.ok) return;
    state = sentBack.value;

    execution = executionById(state, "exec-4")!;
    expect(execution.status).toBe(ExecutionStatus.SENT_BACK);
    // Tester-facing and reviewer-facing labels both derive from SENT_BACK.
    expect(
      state.notifications.some((n) => n.userId === "u-priya" && /revision/i.test(n.title)),
    ).toBe(true);
    expect(auditFor(state, "exec-4").some((a) => a.action === "review.revision_requested")).toBe(
      true,
    );

    // Tester reopens for revision — execution becomes editable again.
    const reopened = reopenForRevision(state, priya.user, "exec-4");
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    state = reopened.value;
    expect(executionById(state, "exec-4")?.status).toBe(ExecutionStatus.IN_PROGRESS);

    // Fix the previously-failed step and add fresh evidence.
    const fixed = saveStepResult(state, priya.user, "exec-4", "tc-sig-003-s4", {
      status: "passed",
      actual: "Re-ran with certified cable: link trained cleanly, no CRC errors.",
    });
    expect(fixed.ok).toBe(true);
    if (fixed.ok) state = fixed.value;

    const withEvidence = addEvidence(state, priya.user, "exec-4", "tc-sig-003-s4", {
      name: "retest-eye-diagram.png",
      size: 4096,
      type: "image/png",
      dataUrl: "data:image/png;base64,iVBORw0KGgo=",
    });
    expect(withEvidence.ok).toBe(true);
    if (withEvidence.ok) state = withEvidence.value;

    const resubmitted = submitExecution(state, priya.user, "exec-4");
    expect(resubmitted.ok).toBe(true);
    if (!resubmitted.ok) return;
    state = resubmitted.value;

    execution = executionById(state, "exec-4")!;
    expect(execution.status).toBe(ExecutionStatus.SUBMITTED);
    expect(execution.round).toBe(2); // resubmission increments the round
    expect(auditFor(state, "exec-4").some((a) => a.action === "execution.resubmitted")).toBe(true);

    // Reviewer approves the resubmission.
    reviewerState = { ...state, session: rajesh.state.session };
    const approved = approveExecution(
      reviewerState,
      rajesh.user,
      "exec-4",
      "Retest confirms link integrity. Approved.",
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    state = approved.value;

    execution = executionById(state, "exec-4")!;
    expect(execution.status).toBe(ExecutionStatus.COMPLETED);
    expect(execution.completedAt).not.toBeNull();
    expect(
      state.notifications.some((n) => n.userId === "u-priya" && /approved/i.test(n.title)),
    ).toBe(true);
    expect(auditFor(state, "exec-4").some((a) => a.action === "execution.completed")).toBe(true);

    // Manager-facing metrics derive from this same execution list — no
    // separately maintained counters.
    const progress = executionProgress(state, execution);
    expect(progress.percent).toBe(100);
    expect(
      state.executions.filter((e) => e.status === ExecutionStatus.COMPLETED).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("requires a substantive comment to send an execution back", () => {
    const { state, user } = loggedInAs("TE-2001");
    const result = requestRevision(state, user, "exec-4", "too short");
    expect(result.ok).toBe(false);
  });

  it("stops a reviewer from approving their own execution", () => {
    const { state } = loggedInAs("TE-1001");
    const priyaAsReviewer = { ...userById(state, "u-priya")!, role: "reviewer" as const };
    const result = approveExecution(
      state,
      priyaAsReviewer,
      "exec-4",
      "Self-approved, which must not be allowed.",
    );
    expect(result.ok).toBe(false);
  });
});
