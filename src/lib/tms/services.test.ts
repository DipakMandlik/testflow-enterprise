import { describe, expect, it } from "vitest";
import { createSeedState } from "./seed";
import { ExecutionStatus } from "@/types/domain";
import {
  addEvidence,
  addFailureCategory,
  addTemplateCategory,
  addTemplateCheck,
  allCurrentResults,
  approveExecution,
  archiveTemplate,
  attemptsForCheck,
  auditFor,
  canAccessWorksheet,
  checkById,
  checksFor,
  computeQualityMetrics,
  createAssignment,
  createDevice,
  createLocation,
  createPlant,
  createStation,
  createTemplate,
  createTemplateRevision,
  createUnit,
  createUser,
  currentCheckResult,
  currentResultsFor,
  currentUser,
  diffTemplateRevisions,
  executionById,
  executionProgress,
  failureHotspots,
  isEditableTemplate,
  login,
  logout,
  moveTemplateCheck,
  publishTemplate,
  reassignAssignment,
  removeEvidence,
  removeTemplateCheck,
  requestRetest,
  resumeForRetest,
  reviewsFor,
  saveCheckResult,
  saveExecutionSummary,
  setDeviceStatus,
  setStationStatus,
  setUserActive,
  setUserRole,
  similarFailures,
  startExecution,
  stationById,
  submitExecution,
  templateById,
  templatesInFamily,
  updateTemplateCategory,
  updateTemplateCheck,
  userById,
  validateEvidenceFile,
  validateSubmission,
  validateTemplate,
  verifyLocation,
  verifyOtp,
  verifyStation,
} from "./services";

function loggedInAs(employeeId: string) {
  let state = createSeedState();
  const loginResult = login(state, employeeId, "pibythree@2026");
  if (!loginResult.ok) throw new Error(loginResult.error);
  state = loginResult.value;
  const otpResult = verifyOtp(state, "123456");
  if (!otpResult.ok) throw new Error(otpResult.error);
  state = otpResult.value;
  const user = currentUser(state);
  if (!user) throw new Error("expected a session user");
  return { state, user };
}

function verifiedTester(employeeId: string) {
  const { state, user } = loggedInAs(employeeId);
  const located = verifyLocation(state, user, "p-hosur", "loc-eqt-line");
  if (!located.ok) throw new Error(located.error);
  const stationed = verifyStation(located.value, user, "sta-eqt-01");
  if (!stationed.ok) throw new Error(stationed.error);
  return { state: stationed.value, user };
}

describe("authentication", () => {
  it("rejects an unknown employee id", () => {
    const state = createSeedState();
    expect(login(state, "TE-0000", "pibythree@2026").ok).toBe(false);
  });

  it("rejects a deactivated account", () => {
    const state = createSeedState();
    expect(login(state, "TE-1003", "pibythree@2026").ok).toBe(false); // Meera Nair, active: false
  });

  it("rejects the wrong password", () => {
    const state = createSeedState();
    expect(login(state, "TE-1001", "wrong-password").ok).toBe(false);
  });

  it("rejects an invalid OTP and does not create a session", () => {
    const state = createSeedState();
    const loginResult = login(state, "TE-1001", "pibythree@2026");
    expect(loginResult.ok).toBe(true);
    if (!loginResult.ok) return;
    expect(verifyOtp(loginResult.value, "000000").ok).toBe(false);
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

describe("location / station verification gate", () => {
  it("blocks worksheet access for an unverified tester", () => {
    const { state, user } = loggedInAs("TE-1001");
    expect(canAccessWorksheet(state, user)).toBe(false);
  });

  it("never gates non-testers", () => {
    const { state, user } = loggedInAs("TE-2001"); // quality checker
    expect(canAccessWorksheet(state, user)).toBe(true);
  });

  it("requires a location before a station can be verified", () => {
    const { state, user } = loggedInAs("TE-1001");
    expect(verifyStation(state, user, "sta-eqt-01").ok).toBe(false);
  });

  it("rejects a station outside the verified plant or in maintenance", () => {
    const { state, user } = loggedInAs("TE-1001");
    const located = verifyLocation(state, user, "p-hosur", "loc-eqt-line");
    expect(located.ok).toBe(true);
    if (!located.ok) return;
    expect(verifyStation(located.value, user, "sta-eqt-04").ok).toBe(false); // maintenance
  });

  it("grants worksheet access once both location and station are verified", () => {
    const { state, user } = verifiedTester("TE-1001");
    expect(canAccessWorksheet(state, user)).toBe(true);
  });

  it("a fresh login always starts unverified again, even for the same tester", () => {
    const first = verifiedTester("TE-1001");
    expect(canAccessWorksheet(first.state, first.user)).toBe(true);
    const loggedOut = logout(first.state);
    const second = login(loggedOut, "TE-1001", "pibythree@2026");
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const otp = verifyOtp(second.value, "123456");
    expect(otp.ok).toBe(true);
    if (!otp.ok) return;
    expect(canAccessWorksheet(otp.value, currentUser(otp.value)!)).toBe(false);
  });
});

describe("tester execution workflow", () => {
  it("starts an assigned execution and moves it to in_progress", () => {
    const { state, user } = verifiedTester("TE-1001");
    const result = startExecution(state, user, "exec-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const execution = executionById(result.value, "exec-1");
    expect(execution?.status).toBe(ExecutionStatus.IN_PROGRESS);
    expect(execution?.startedAt).not.toBeNull();
  });

  it("blocks a tester from starting someone else's execution", () => {
    const { state, user } = verifiedTester("TE-1001");
    // exec-5 belongs to Vikram (u-vikram), not Priya.
    expect(startExecution(state, user, "exec-5").ok).toBe(false);
  });

  it("moves an ASSIGNED execution to IN_PROGRESS the first time a check result is saved", () => {
    const { state, user } = verifiedTester("TE-1001");
    const saved = saveCheckResult(state, user, "exec-1", "chk-chk-001", {
      status: "passed",
      actualResult: "No visible transport damage.",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(executionById(saved.value, "exec-1")?.status).toBe(ExecutionStatus.IN_PROGRESS);
    const result = currentCheckResult(saved.value, "exec-1", "chk-chk-001");
    expect(result?.status).toBe("passed");
    expect(result?.attempt).toBe(1);
  });

  it("auto-grades a measurement check against its acceptance range", () => {
    const { state, user } = verifiedTester("TE-1001");
    const inRange = saveCheckResult(state, user, "exec-1", "chk-aco-002", {
      status: "passed",
      measurementValue: 75,
      actualResult: "75 dB",
    });
    expect(inRange.ok).toBe(true);
    if (inRange.ok)
      expect(currentCheckResult(inRange.value, "exec-1", "chk-aco-002")?.status).toBe("passed");

    const outOfRange = saveCheckResult(state, user, "exec-1", "chk-aco-002", {
      status: "passed", // the UI always sends "passed" for a measurement; the server corrects it
      measurementValue: 95,
      actualResult: "95 dB",
    });
    expect(outOfRange.ok).toBe(true);
    if (outOfRange.ok)
      expect(currentCheckResult(outOfRange.value, "exec-1", "chk-aco-002")?.status).toBe("failed");
  });

  it("does not clobber a resolved status when only notes are autosaved afterward", () => {
    // Regression: saveCheckResult once fell back to an in-progress status
    // whenever the patch omitted `status`, silently reverting Pass/Fail back
    // to "in progress" on every autosave keystroke.
    const { state, user } = verifiedTester("TE-1001");
    const passed = saveCheckResult(state, user, "exec-1", "chk-shp-001", {
      status: "passed",
      actualResult: "Shipping settings match the assignment record.",
    });
    expect(passed.ok).toBe(true);
    if (!passed.ok) return;
    const noteOnly = saveCheckResult(passed.value, user, "exec-1", "chk-shp-001", {
      testerNotes: "Double-checked against the assignment record.",
    });
    expect(noteOnly.ok).toBe(true);
    if (!noteOnly.ok) return;
    const result = currentCheckResult(noteOnly.value, "exec-1", "chk-shp-001");
    expect(result?.status).toBe("passed");
    expect(result?.testerNotes).toBe("Double-checked against the assignment record.");
  });

  it("rejects submission until every mandatory check is resolved with required evidence", () => {
    const { state, user } = verifiedTester("TE-1001");
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const problems = validateSubmission(started.value, executionById(started.value, "exec-1")!);
    expect(problems.length).toBeGreaterThan(0);
    expect(submitExecution(started.value, user, "exec-1").ok).toBe(false);
  });

  it("requires a failure category and description once a check is marked failed", () => {
    const { state, user } = verifiedTester("TE-1001");
    const failed = saveCheckResult(state, user, "exec-1", "chk-cam-004", { status: "failed" });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    const problems = validateSubmission(failed.value, executionById(failed.value, "exec-1")!);
    expect(problems.some((p) => p.includes("CAM-004") && p.includes("failure category"))).toBe(
      true,
    );
    expect(problems.some((p) => p.includes("CAM-004") && p.includes("failure description"))).toBe(
      true,
    );
  });

  it("submits successfully once every mandatory check is complete, notifies the quality checkers and audits the event", () => {
    let state = verifiedTester("TE-1001").state;
    const user = currentUser(state)!;
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    state = started.value;

    for (const check of checksFor(state, "tpl-ojas-eqt-r3")) {
      if (!check.mandatory) continue;
      const patch =
        check.testType === "measurement"
          ? {
              status: "passed" as const,
              measurementValue: (check.measurementMin! + check.measurementMax!) / 2,
            }
          : { status: "passed" as const, actualResult: `${check.checkCode} behaved as specified.` };
      const saved = saveCheckResult(state, user, "exec-1", check.id, patch);
      expect(saved.ok).toBe(true);
      if (saved.ok) state = saved.value;

      if (check.evidenceRequired) {
        const evidenced = addEvidence(state, user, "exec-1", check.id, 1, {
          name: `${check.checkCode}-capture.png`,
          size: 1024,
          type: "image/png",
          dataUrl: "data:image/png;base64,iVBORw0KGgo=",
        });
        expect(evidenced.ok).toBe(true);
        if (evidenced.ok) state = evidenced.value;
      }
    }

    expect(validateSubmission(state, executionById(state, "exec-1")!)).toEqual([]);

    const submitted = submitExecution(state, user, "exec-1");
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    state = submitted.value;

    const execution = executionById(state, "exec-1")!;
    expect(execution.status).toBe(ExecutionStatus.PENDING_REVIEW);
    expect(execution.submittedAt).not.toBeNull();
    expect(
      state.notifications.some((n) => n.userId === "u-rajesh" && /submitted/i.test(n.title)),
    ).toBe(true);
    expect(auditFor(state, "exec-1").some((a) => a.action === "execution.submitted")).toBe(true);
  });

  it("saves a free-text execution summary for the assigned tester only", () => {
    const { state, user } = verifiedTester("TE-1001");
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

  it("attaches evidence to a check and removes it again while the execution is editable", () => {
    const { state, user } = verifiedTester("TE-1001");
    const started = startExecution(state, user, "exec-1");
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const added = addEvidence(started.value, user, "exec-1", "chk-chk-001", 1, {
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

describe("check-level retest: attempt history is never overwritten", () => {
  it("keeps the seeded attempt-1 failure intact alongside the attempt-2 retest row", () => {
    const state = createSeedState();
    const attempts = attemptsForCheck(state, "exec-3", "chk-aco-002");
    expect(attempts).toHaveLength(2);
    expect(attempts[0]?.attempt).toBe(1);
    expect(attempts[0]?.status).toBe("failed");
    expect(attempts[0]?.measurementValue).toBe(94.2);
    expect(attempts[1]?.attempt).toBe(2);
    expect(attempts[1]?.status).toBe("retest_required");
    // The "current" result for the check is the latest attempt, not the first.
    expect(currentCheckResult(state, "exec-3", "chk-aco-002")?.attempt).toBe(2);
  });

  it("full loop: submit -> retest requested on one check -> tester retests -> resubmit -> approve", () => {
    const priya = verifiedTester("TE-1001");
    let state = priya.state;

    // exec-4 (CAM-004 failed) starts PENDING_REVIEW in the seed data.
    expect(executionById(state, "exec-4")?.status).toBe(ExecutionStatus.PENDING_REVIEW);

    const rajesh = loggedInAs("TE-2001");
    let reviewerState = { ...state, session: rajesh.state.session };

    const retested = requestRetest(
      reviewerState,
      rajesh.user,
      "exec-4",
      "Ingress result looks marginal — please re-run the environmental seal check.",
      ["chk-cam-004"],
    );
    expect(retested.ok).toBe(true);
    if (!retested.ok) return;
    state = retested.value;
    expect(executionById(state, "exec-4")?.status).toBe(ExecutionStatus.RETEST_REQUIRED);

    // Only the flagged check gets a new attempt row; every other check's
    // attempt-1 result is untouched.
    const flagged = attemptsForCheck(state, "exec-4", "chk-cam-004");
    expect(flagged).toHaveLength(2);
    expect(flagged[1]?.status).toBe("retest_required");
    const untouched = attemptsForCheck(state, "exec-4", "chk-chk-001");
    expect(untouched).toHaveLength(1);
    expect(untouched[0]?.status).toBe("passed");

    expect(state.notifications.some((n) => n.userId === "u-priya" && /retest/i.test(n.title))).toBe(
      true,
    );

    // Tester resumes for retest — only the flagged check is unresolved.
    const resumed = resumeForRetest(state, priya.user, "exec-4");
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    state = resumed.value;
    expect(executionById(state, "exec-4")?.status).toBe(ExecutionStatus.RETEST_IN_PROGRESS);

    const fixed = saveCheckResult(state, priya.user, "exec-4", "chk-cam-004", {
      status: "passed",
      actualResult: "No moisture ingress observed on re-run with the seal reworked.",
    });
    expect(fixed.ok).toBe(true);
    if (!fixed.ok) return;
    state = fixed.value;
    // A passing result during a retest round is recorded as retest_passed,
    // distinct from a first-attempt pass.
    expect(currentCheckResult(state, "exec-4", "chk-cam-004")?.status).toBe("retest_passed");

    expect(validateSubmission(state, executionById(state, "exec-4")!)).toEqual([]);
    const resubmitted = submitExecution(state, priya.user, "exec-4");
    expect(resubmitted.ok).toBe(true);
    if (!resubmitted.ok) return;
    state = resubmitted.value;

    let execution = executionById(state, "exec-4")!;
    expect(execution.status).toBe(ExecutionStatus.PENDING_REVIEW);
    expect(execution.round).toBe(2); // resubmission increments the round
    expect(auditFor(state, "exec-4").some((a) => a.action === "execution.resubmitted")).toBe(true);

    reviewerState = { ...state, session: rajesh.state.session };
    const approved = approveExecution(
      reviewerState,
      rajesh.user,
      "exec-4",
      "Retest confirms correct exposure.",
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

    // Manager-facing metrics derive from this same execution list — no
    // separately maintained counters.
    const progress = executionProgress(state, execution);
    expect(progress.percent).toBe(100);
  });

  it("requires a substantive comment and at least one flagged check to request a retest", () => {
    const { state, user } = loggedInAs("TE-2001");
    expect(requestRetest(state, user, "exec-4", "too short", ["chk-cam-004"]).ok).toBe(false);
    expect(
      requestRetest(state, user, "exec-4", "A properly long enough review comment here.", []).ok,
    ).toBe(false);
  });

  it("stops a quality checker from reviewing their own execution", () => {
    const { state } = loggedInAs("TE-1001");
    const priyaAsChecker = { ...userById(state, "u-priya")!, role: "quality_checker" as const };
    expect(
      approveExecution(state, priyaAsChecker, "exec-4", "Self-approved, which must not be allowed.")
        .ok,
    ).toBe(false);
  });
});

describe("quality metrics and AI-assisted insight (deterministic, not an LLM)", () => {
  it("computes first pass yield, failure rate and retest rate from resolved results", () => {
    // The seed's only retest (exec-3's ACO-002) is left mid-flight
    // (retest_required, not yet resolved by the tester), so it doesn't
    // count on its own — resolve it here to get a real retest_passed row.
    const { state, user } = verifiedTester("TE-1001");
    const resumed = resumeForRetest(state, user, "exec-3");
    expect(resumed.ok).toBe(true);
    if (!resumed.ok) return;
    const fixed = saveCheckResult(resumed.value, user, "exec-3", "chk-aco-002", {
      status: "passed",
      measurementValue: 75,
      actualResult: "75 dB",
    });
    expect(fixed.ok).toBe(true);
    if (!fixed.ok) return;
    expect(currentCheckResult(fixed.value, "exec-3", "chk-aco-002")?.status).toBe("retest_passed");

    const metrics = computeQualityMetrics(allCurrentResults(fixed.value));
    expect(metrics.totalResolved).toBeGreaterThan(0);
    expect(metrics.firstPassYield).toBeGreaterThanOrEqual(0);
    expect(metrics.firstPassYield).toBeLessThanOrEqual(100);
    expect(metrics.retestRate).toBeGreaterThan(0);
  });

  it("ranks failure categories by frequency", () => {
    const state = createSeedState();
    const hotspots = failureHotspots(state);
    expect(hotspots.length).toBeGreaterThan(0);
    for (let i = 1; i < hotspots.length; i++) {
      expect(hotspots[i - 1]!.count).toBeGreaterThanOrEqual(hotspots[i]!.count);
    }
  });

  it("surfaces similar past failures by keyword overlap, never auto-deciding anything", () => {
    const state = createSeedState();
    const matches = similarFailures(state, "Peak output measured above the acceptance limit");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]!.checkCode).toBe("ACO-002");
    // The function only returns descriptive data for a human to read — it
    // has no side effect and cannot mutate a check's status.
    expect(currentCheckResult(state, "exec-3", "chk-aco-002")?.status).toBe("retest_required");
  });

  it("returns nothing for an empty description", () => {
    const state = createSeedState();
    expect(similarFailures(state, "")).toEqual([]);
  });
});

describe("template management (versioned, immutable once published)", () => {
  it("treats draft and under-review templates as editable, published and archived as not", () => {
    const state = createSeedState();
    const published = templateById(state, "tpl-ojas-eqt-r3")!;
    expect(isEditableTemplate(published)).toBe(false);
  });

  it("creates a new template family as an editable draft", () => {
    const { state, user } = loggedInAs("TE-5001"); // Kavya, template manager
    const created = createTemplate(state, user, { familyCode: "NEW-FAM", name: "New Family Test" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const template = templatesInFamily(created.value, "NEW-FAM")[0]!;
    expect(template.status).toBe("draft");
    expect(template.revision).toBe(1);
    expect(isEditableTemplate(template)).toBe(true);
  });

  it("denies template authoring to non-template-managers", () => {
    const { state, user } = loggedInAs("TE-3001"); // manager, not template manager
    expect(createTemplate(state, user, { familyCode: "X", name: "X" }).ok).toBe(false);
  });

  it("builds categories and checks on a draft, validates, and blocks publishing until valid", () => {
    const { state, user } = loggedInAs("TE-5001");
    const created = createTemplate(state, user, { familyCode: "NEW-FAM", name: "New Family Test" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const template = templatesInFamily(created.value, "NEW-FAM")[0]!;

    // No checks yet — publishing must fail.
    expect(validateTemplate(created.value, template.id).length).toBeGreaterThan(0);
    expect(publishTemplate(created.value, user, template.id).ok).toBe(false);

    const withCategory = addTemplateCategory(created.value, user, template.id, "General");
    expect(withCategory.ok).toBe(true);
    if (!withCategory.ok) return;
    const category = withCategory.value.templateCategories.find(
      (c) => c.templateId === template.id,
    )!;

    const withCheck = addTemplateCheck(withCategory.value, user, template.id, {
      categoryId: category.id,
      checkCode: "GEN-001",
      title: "Sample check",
      description: "",
      instruction: "",
      expectedResult: "Passes.",
      acceptanceCriteria: "",
      testType: "binary",
      mandatory: true,
      allowNA: false,
      evidenceRequired: false,
      measurementUnit: null,
      measurementMin: null,
      measurementMax: null,
      defaultFailureCategory: null,
    });
    expect(withCheck.ok).toBe(true);
    if (!withCheck.ok) return;

    expect(validateTemplate(withCheck.value, template.id)).toEqual([]);
    const published = publishTemplate(withCheck.value, user, template.id);
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    const publishedTemplate = templateById(published.value, template.id)!;
    expect(publishedTemplate.status).toBe("published");
    expect(publishedTemplate.totalChecks).toBe(1);

    // Once published, it can no longer be edited directly.
    expect(isEditableTemplate(publishedTemplate)).toBe(false);
    expect(
      addTemplateCheck(published.value, user, template.id, {
        categoryId: category.id,
        checkCode: "GEN-002",
        title: "Should be blocked",
        description: "",
        instruction: "",
        expectedResult: "",
        acceptanceCriteria: "",
        testType: "binary",
        mandatory: false,
        allowNA: false,
        evidenceRequired: false,
        measurementUnit: null,
        measurementMin: null,
        measurementMax: null,
        defaultFailureCategory: null,
      }).ok,
    ).toBe(false);
  });

  it("reorders checks with move up/down", () => {
    const { state, user } = loggedInAs("TE-5001");
    const created = createTemplate(state, user, { familyCode: "NEW-FAM", name: "New Family Test" });
    if (!created.ok) throw new Error(created.error);
    const template = templatesInFamily(created.value, "NEW-FAM")[0]!;
    const withCategory = addTemplateCategory(created.value, user, template.id, "General");
    if (!withCategory.ok) throw new Error(withCategory.error);
    const category = withCategory.value.templateCategories.find(
      (c) => c.templateId === template.id,
    )!;

    let s = withCategory.value;
    for (const code of ["A-001", "A-002"]) {
      const added = addTemplateCheck(s, user, template.id, {
        categoryId: category.id,
        checkCode: code,
        title: code,
        description: "",
        instruction: "",
        expectedResult: "x",
        acceptanceCriteria: "",
        testType: "binary",
        mandatory: false,
        allowNA: false,
        evidenceRequired: false,
        measurementUnit: null,
        measurementMin: null,
        measurementMax: null,
        defaultFailureCategory: null,
      });
      if (!added.ok) throw new Error(added.error);
      s = added.value;
    }

    const before = checksFor(s, template.id);
    expect(before.map((c) => c.checkCode)).toEqual(["A-001", "A-002"]);
    const second = before[1]!;
    const moved = moveTemplateCheck(s, user, second.id, "up");
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    expect(checksFor(moved.value, template.id).map((c) => c.checkCode)).toEqual(["A-002", "A-001"]);
  });

  it("edits a check's fields in place and renames a category, both while still a draft", () => {
    const { state, user } = loggedInAs("TE-5001");
    const created = createTemplate(state, user, { familyCode: "NEW-FAM", name: "New Family Test" });
    if (!created.ok) throw new Error(created.error);
    const template = templatesInFamily(created.value, "NEW-FAM")[0]!;
    const withCategory = addTemplateCategory(created.value, user, template.id, "General");
    if (!withCategory.ok) throw new Error(withCategory.error);
    const category = withCategory.value.templateCategories.find(
      (c) => c.templateId === template.id,
    )!;
    const withCheck = addTemplateCheck(withCategory.value, user, template.id, {
      categoryId: category.id,
      checkCode: "GEN-001",
      title: "Original title",
      description: "",
      instruction: "",
      expectedResult: "x",
      acceptanceCriteria: "",
      testType: "binary",
      mandatory: false,
      allowNA: false,
      evidenceRequired: false,
      measurementUnit: null,
      measurementMin: null,
      measurementMax: null,
      defaultFailureCategory: null,
    });
    if (!withCheck.ok) throw new Error(withCheck.error);
    const check = checksFor(withCheck.value, template.id)[0]!;

    const renamed = updateTemplateCategory(withCheck.value, user, category.id, "Renamed category");
    expect(renamed.ok).toBe(true);
    if (renamed.ok)
      expect(renamed.value.templateCategories.find((c) => c.id === category.id)?.name).toBe(
        "Renamed category",
      );

    const edited = updateTemplateCheck(withCheck.value, user, check.id, {
      title: "Updated title",
      mandatory: true,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;
    const updated = checkById(edited.value, check.id)!;
    expect(updated.title).toBe("Updated title");
    expect(updated.mandatory).toBe(true);
    expect(templateById(edited.value, template.id)?.mandatoryChecks).toBe(1);

    const removed = removeTemplateCheck(edited.value, user, check.id);
    expect(removed.ok).toBe(true);
    if (removed.ok) expect(checksFor(removed.value, template.id)).toEqual([]);
  });

  it("clones an immutable new revision without mutating the published source", () => {
    const { state, user } = loggedInAs("TE-5001");
    const before = templateById(state, "tpl-ojas-eqt-r3")!;
    const beforeChecks = checksFor(state, "tpl-ojas-eqt-r3").length;

    const revised = createTemplateRevision(state, user, "tpl-ojas-eqt-r3");
    expect(revised.ok).toBe(true);
    if (!revised.ok) return;

    const original = templateById(revised.value, "tpl-ojas-eqt-r3")!;
    expect(original).toEqual(before); // untouched
    expect(checksFor(revised.value, "tpl-ojas-eqt-r3").length).toBe(beforeChecks);

    const newRevision = templatesInFamily(revised.value, "OJAS-EQT")[0]!;
    expect(newRevision.revision).toBe(4);
    expect(newRevision.status).toBe("draft");
    expect(checksFor(revised.value, newRevision.id).length).toBe(beforeChecks);

    const diff = diffTemplateRevisions(revised.value, "tpl-ojas-eqt-r3", newRevision.id);
    expect(diff).toEqual([]); // a fresh clone has no differences yet
  });

  it("reports added/removed/modified checks between two revisions", () => {
    const { state, user } = loggedInAs("TE-5001");
    const revised = createTemplateRevision(state, user, "tpl-ojas-eqt-r3");
    if (!revised.ok) throw new Error(revised.error);
    const newRevision = templatesInFamily(revised.value, "OJAS-EQT")[0]!;
    const check = checksFor(revised.value, newRevision.id)[0]!;

    const edited = updateTemplateCheck(revised.value, user, check.id, { title: "Changed title" });
    if (!edited.ok) throw new Error(edited.error);
    const category = edited.value.templateCategories.find((c) => c.templateId === newRevision.id)!;
    const added = addTemplateCheck(edited.value, user, newRevision.id, {
      categoryId: category.id,
      checkCode: "NEW-CHK-999",
      title: "Brand new check",
      description: "",
      instruction: "",
      expectedResult: "x",
      acceptanceCriteria: "",
      testType: "binary",
      mandatory: false,
      allowNA: false,
      evidenceRequired: false,
      measurementUnit: null,
      measurementMin: null,
      measurementMax: null,
      defaultFailureCategory: null,
    });
    if (!added.ok) throw new Error(added.error);

    const diff = diffTemplateRevisions(added.value, "tpl-ojas-eqt-r3", newRevision.id);
    expect(diff).toContainEqual({ checkCode: check.checkCode, kind: "modified" });
    expect(diff).toContainEqual({ checkCode: "NEW-CHK-999", kind: "added" });
  });

  it("archives a template", () => {
    const { state, user } = loggedInAs("TE-5001");
    const archived = archiveTemplate(state, user, "tpl-ojas-eqt-r3");
    expect(archived.ok).toBe(true);
    if (archived.ok)
      expect(templateById(archived.value, "tpl-ojas-eqt-r3")?.status).toBe("archived");
  });
});

describe("administration", () => {
  it("lets an admin create, activate/deactivate and re-role a user", () => {
    const { state, user } = loggedInAs("TE-9001");
    const created = createUser(state, user, {
      employeeId: "TE-7000",
      name: "New Hire",
      email: "new.hire@pibythree.example",
      role: "tester",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const newUser = userById(
      created.value,
      created.value.users.find((u) => u.employeeId === "TE-7000")!.id,
    )!;

    const deactivated = setUserActive(created.value, user, newUser.id, false);
    expect(deactivated.ok).toBe(true);
    if (deactivated.ok) expect(userById(deactivated.value, newUser.id)?.active).toBe(false);

    const reRoled = setUserRole(created.value, user, newUser.id, "quality_checker");
    expect(reRoled.ok).toBe(true);
    if (reRoled.ok) expect(userById(reRoled.value, newUser.id)?.role).toBe("quality_checker");
  });

  it("rejects a duplicate employee id", () => {
    const { state, user } = loggedInAs("TE-9001");
    expect(
      createUser(state, user, {
        employeeId: "TE-1001",
        name: "Duplicate",
        email: "dup@pibythree.example",
        role: "tester",
      }).ok,
    ).toBe(false);
  });

  it("denies non-admins from managing users", () => {
    const { state, user } = loggedInAs("TE-3001"); // manager
    expect(
      createUser(state, user, {
        employeeId: "TE-7001",
        name: "Nope",
        email: "nope@pibythree.example",
        role: "tester",
      }).ok,
    ).toBe(false);
  });

  it("creates a plant, a location under it and a station under that location", () => {
    const { state, user } = loggedInAs("TE-9001");
    const plant = createPlant(state, user, { code: "BLR", name: "Bengaluru" });
    expect(plant.ok).toBe(true);
    if (!plant.ok) return;
    const plantId = plant.value.plants.find((p) => p.code === "BLR")!.id;

    const location = createLocation(plant.value, user, { plantId, name: "Line 1" });
    expect(location.ok).toBe(true);
    if (!location.ok) return;
    const locationId = location.value.locations.find((l) => l.plantId === plantId)!.id;

    const station = createStation(location.value, user, {
      plantId,
      locationId,
      code: "EQT-10",
      name: "EQT Station 10",
    });
    expect(station.ok).toBe(true);
    if (!station.ok) return;
    const created = station.value.stations.find((s) => s.code === "EQT-10")!;
    expect(created.status).toBe("active");

    const maintained = setStationStatus(station.value, user, created.id, "maintenance");
    expect(maintained.ok).toBe(true);
    if (maintained.ok)
      expect(stationById(maintained.value, created.id)?.status).toBe("maintenance");
  });

  it("registers a device and flips its status", () => {
    const { state, user } = loggedInAs("TE-9001");
    const created = createDevice(state, user, { stationId: "sta-eqt-01", name: "TAB-EQT-01-02" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const device = created.value.devices.find((d) => d.name === "TAB-EQT-01-02")!;
    expect(device.status).toBe("online");
    const offline = setDeviceStatus(created.value, user, device.id, "offline");
    expect(offline.ok).toBe(true);
    if (offline.ok)
      expect(offline.value.devices.find((d) => d.id === device.id)?.status).toBe("offline");
  });

  it("adds a failure category and rejects a duplicate", () => {
    const { state, user } = loggedInAs("TE-5001"); // template manager
    const added = addFailureCategory(state, user, "Cosmetic");
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.value.failureCategories).toContain("Cosmetic");
    expect(addFailureCategory(added.value, user, "cosmetic").ok).toBe(false); // case-insensitive dupe
  });

  it("registers a unit and rejects a duplicate USN", () => {
    const { state, user } = loggedInAs("TE-3001"); // manager
    const created = createUnit(state, user, { usn: "USN-OJAS-000999", familyCode: "OJAS-EQT" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(
      createUnit(created.value, user, { usn: "usn-ojas-000999", familyCode: "OJAS-EQT" }).ok,
    ).toBe(false);
  });

  it("creates an assignment (and its execution) only against a published template", () => {
    const { state, user } = loggedInAs("TE-3001");
    const unit = createUnit(state, user, { usn: "USN-OJAS-000998", familyCode: "OJAS-EQT" });
    if (!unit.ok) throw new Error(unit.error);
    const unitId = unit.value.units.find((u) => u.usn === "USN-OJAS-000998")!.id;

    const assigned = createAssignment(unit.value, user, {
      unitId,
      templateId: "tpl-ojas-eqt-r3",
      testerId: "u-vikram",
      stationId: "sta-eqt-01",
      priority: "medium",
      dueAt: new Date().toISOString(),
    });
    expect(assigned.ok).toBe(true);
    if (!assigned.ok) return;
    const execution = assigned.value.executions.find((e) => e.unitId === unitId)!;
    expect(execution.status).toBe(ExecutionStatus.ASSIGNED);
    expect(execution.testerId).toBe("u-vikram");
    expect(
      assigned.value.notifications.some(
        (n) => n.userId === "u-vikram" && /assigned/i.test(n.title),
      ),
    ).toBe(true);
  });

  it("reassigns an assignment to a different tester, but not once already completed", () => {
    const { state, user } = loggedInAs("TE-3001");
    const reassigned = reassignAssignment(state, user, "as-1", "u-vikram", "Priya is out sick.");
    expect(reassigned.ok).toBe(true);
    if (reassigned.ok) {
      expect(reassigned.value.executions.find((e) => e.assignmentId === "as-1")?.testerId).toBe(
        "u-vikram",
      );
    }

    // exec-5 (as-5) is already COMPLETED in the seed data.
    expect(reassignAssignment(state, user, "as-5", "u-priya", "Too late now.").ok).toBe(false);
  });
});
