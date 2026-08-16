import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle2, CircleAlert, Paperclip, Send, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { CheckStatusBadge, StatusBadge } from "@/components/tms/badges";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTms } from "@/lib/tms/store";
import {
  addEvidence,
  auditFor,
  categoriesFor,
  checksFor,
  checksForCategory,
  currentCheckResult,
  currentUser,
  evidenceFor,
  evidenceForCheck,
  executionById,
  executionProgress,
  removeEvidence,
  resumeForRetest,
  reviewsFor,
  saveCheckResult,
  saveExecutionSummary,
  similarFailures,
  startExecution,
  submitExecution,
  templateById,
  unitById,
  userById,
  validateSubmission,
} from "@/lib/tms/services";
import { canExecuteTest } from "@/lib/tms/permissions";
import { ExecutionStatus, RESOLVED_CHECK_STATUSES, type FailureSeverity } from "@/types/domain";

export const Route = createFileRoute("/executions/$executionId")({
  head: () => ({
    meta: [
      { title: "Digital Quality Worksheet — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Execute template checks, capture failures and evidence, and submit for review.",
      },
    ],
  }),
  component: ExecutionPage,
});

type CheckFilter = "all" | "pending" | "passed" | "failed" | "na" | "retest";

const FAILURE_SEVERITIES: FailureSeverity[] = ["low", "medium", "high", "critical"];

function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

interface CheckDraft {
  actualResult: string;
  testerNotes: string;
  failureDescription: string;
  failureCategory: string | null;
  failureSeverity: FailureSeverity | null;
}

const EMPTY_DRAFT: CheckDraft = {
  actualResult: "",
  testerNotes: "",
  failureDescription: "",
  failureCategory: null,
  failureSeverity: null,
};

function ExecutionPage() {
  const { executionId } = Route.useParams();
  const { state, run } = useTms();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const user = currentUser(state);
  const execution = executionById(state, executionId);
  const template = execution ? templateById(state, execution.templateId) : undefined;
  const categories = useMemo(
    () => (template ? categoriesFor(state, template.id) : []),
    [state, template],
  );
  const checks = template ? checksFor(state, template.id) : [];

  const [activeCheckId, setActiveCheckId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [draft, setDraft] = useState<CheckDraft>(EMPTY_DRAFT);
  const [measurementInput, setMeasurementInput] = useState("");
  const [filter, setFilter] = useState<CheckFilter>("all");
  const [search, setSearch] = useState("");
  const [submitOpen, setSubmitOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeCheck = checks.find((c) => c.id === activeCheckId);
  const activeResult =
    execution && activeCheck ? currentCheckResult(state, execution.id, activeCheck.id) : undefined;
  const editable = !!(user && execution && canExecuteTest(user, execution));
  const isRetestRound =
    execution?.status === ExecutionStatus.RETEST_REQUIRED ||
    execution?.status === ExecutionStatus.RETEST_IN_PROGRESS;
  const checkEditable =
    editable &&
    (!isRetestRound ||
      activeResult?.status === "retest_required" ||
      activeResult?.status === "retest_in_progress");
  const progress = execution ? executionProgress(state, execution) : null;
  const evidence = execution ? evidenceFor(state, execution.id) : [];
  const checkEvidence =
    execution && activeCheck
      ? evidenceForCheck(state, execution.id, activeCheck.id, activeResult?.attempt ?? 1)
      : [];
  const baseStatus = activeResult
    ? activeResult.status === "passed" || activeResult.status === "retest_passed"
      ? "passed"
      : activeResult.status === "failed" || activeResult.status === "retest_failed"
        ? "failed"
        : activeResult.status === "na"
          ? "na"
          : undefined
    : undefined;

  const problems = useMemo(
    () => (execution ? validateSubmission(state, execution) : []),
    [state, execution],
  );

  const similar = useMemo(
    () =>
      draft.failureDescription.trim().length > 4
        ? similarFailures(state, draft.failureDescription, activeResult?.id)
        : [],
    [state, draft.failureDescription, activeResult?.id],
  );

  const orderedChecks = useMemo(
    () => categories.flatMap((cat) => checksForCategory(state, cat.id)),
    [state, categories],
  );

  const nextRequiredCheck = useMemo(() => {
    if (!execution) return undefined;
    return orderedChecks.find((c) => {
      if (c.id === activeCheckId || !c.mandatory) return false;
      const r = currentCheckResult(state, execution.id, c.id);
      return !r || !RESOLVED_CHECK_STATUSES.includes(r.status);
    });
  }, [orderedChecks, activeCheckId, state, execution]);

  useEffect(() => {
    if (!execution || activeCheckId) return;
    const firstUnresolved = orderedChecks.find((c) => {
      if (!c.mandatory) return false;
      const r = currentCheckResult(state, execution.id, c.id);
      return !r || !RESOLVED_CHECK_STATUSES.includes(r.status);
    });
    setActiveCheckId((firstUnresolved ?? orderedChecks[0])?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution?.id, orderedChecks]);

  useEffect(() => {
    setDraft({
      actualResult: activeResult?.actualResult ?? "",
      testerNotes: activeResult?.testerNotes ?? "",
      failureDescription: activeResult?.failureDescription ?? "",
      failureCategory: activeResult?.failureCategory ?? null,
      failureSeverity: activeResult?.failureSeverity ?? null,
    });
    setMeasurementInput(
      activeResult?.measurementValue != null ? String(activeResult.measurementValue) : "",
    );
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCheckId, execution?.id]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty") e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [saveState]);

  if (!user) return <AppShell title="Execution">{null}</AppShell>;
  if (!execution || !template || !progress) {
    return (
      <AppShell title="Execution not found" description="This execution no longer exists.">
        <Button asChild variant="outline">
          <Link to="/my-tests">Back to my tests</Link>
        </Button>
      </AppShell>
    );
  }

  const scheduleSave = (next: CheckDraft) => {
    setDraft(next);
    if (!activeCheck) return;
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaveState("saving");
      const okSave = run((s) =>
        saveCheckResult(s, user, execution.id, activeCheck.id, {
          actualResult: next.actualResult,
          testerNotes: next.testerNotes,
          failureDescription: next.failureDescription,
          failureCategory: next.failureCategory,
          failureSeverity: next.failureSeverity,
        }),
      );
      setSaveState(okSave ? "saved" : "dirty");
    }, 2000);
  };

  const setStatus = (status: "passed" | "failed" | "na") => {
    if (!activeCheck) return;
    run((s) =>
      saveCheckResult(s, user, execution.id, activeCheck.id, {
        status,
        actualResult: draft.actualResult,
        testerNotes: draft.testerNotes,
        failureDescription: draft.failureDescription,
        failureCategory: draft.failureCategory,
        failureSeverity: draft.failureSeverity,
      }),
    );
    setSaveState("saved");
  };

  const recordMeasurement = () => {
    if (!activeCheck) return;
    const value = Number(measurementInput);
    if (Number.isNaN(value)) return;
    const unit = activeCheck.measurementUnit ? ` ${activeCheck.measurementUnit}` : "";
    const actualResult = `${value}${unit}`;
    run((s) =>
      saveCheckResult(s, user, execution.id, activeCheck.id, {
        status: "passed",
        measurementValue: value,
        actualResult,
        testerNotes: draft.testerNotes,
      }),
    );
    // saveCheckResult may auto-correct the status server-side (out-of-range
    // measurements become "failed"); keep the locally displayed actual
    // result in sync so a later autosave can't clobber it with a stale value.
    setDraft((d) => ({ ...d, actualResult }));
    setSaveState("saved");
  };

  const onUpload = async (file: File) => {
    if (!activeCheck) return;
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    run(
      (s) =>
        addEvidence(s, user, execution.id, activeCheck.id, activeResult?.attempt ?? 1, {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        }),
      { success: "Evidence attached." },
    );
  };

  const filterCheck = (checkId: string) => {
    const r = currentCheckResult(state, execution.id, checkId);
    switch (filter) {
      case "all":
        return true;
      case "pending":
        return !r || r.status === "not_started" || r.status === "in_progress";
      case "passed":
        return r?.status === "passed" || r?.status === "retest_passed";
      case "failed":
        return r?.status === "failed" || r?.status === "retest_failed";
      case "na":
        return r?.status === "na";
      case "retest":
        return r?.status === "retest_required" || r?.status === "retest_in_progress";
      default:
        return true;
    }
  };

  const matchesSearch = (check: (typeof checks)[number]) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return check.checkCode.toLowerCase().includes(q) || check.title.toLowerCase().includes(q);
  };

  const saveLabel = {
    idle: "All changes saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    saved: "Saved to this device",
  }[saveState];

  return (
    <AppShell
      title={`${template.name} Rev ${template.revision}`}
      description={`${unitById(state, execution.unitId)?.usn ?? ""} · Execution ${execution.code} · round ${execution.round}`}
      actions={
        <>
          <span
            className={cn(
              "label-caps flex items-center gap-1.5",
              online ? "text-success" : "text-warning",
            )}
          >
            <span className="size-1.5 rounded-full bg-current" aria-hidden />
            {online ? "Online" : "Offline — saved to this device"}
          </span>
          <StatusBadge status={execution.status} role={user.role} />
          {execution.status === ExecutionStatus.ASSIGNED && editable && (
            <Button
              onClick={() =>
                run((s) => startExecution(s, user, execution.id), { success: "Execution started." })
              }
            >
              Start execution
            </Button>
          )}
          {execution.status === ExecutionStatus.RETEST_REQUIRED && editable && (
            <Button
              onClick={() =>
                run((s) => resumeForRetest(s, user, execution.id), {
                  success: "Resumed for retest.",
                })
              }
            >
              Resume for retest
            </Button>
          )}
          {editable &&
            (execution.status === ExecutionStatus.IN_PROGRESS ||
              execution.status === ExecutionStatus.RETEST_IN_PROGRESS) && (
              <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Send className="size-4" /> Submit for review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Submit {execution.code} for review</DialogTitle>
                    <DialogDescription>
                      The worksheet becomes read-only until a Quality Checker approves it, rejects
                      it or requests a retest on specific checks.
                    </DialogDescription>
                  </DialogHeader>
                  <dl className="grid grid-cols-4 gap-2 rounded-sm border border-border p-3 text-sm">
                    <div>
                      <dt className="label-caps">Checks</dt>
                      <dd className="tabular-nums">{progress.total}</dd>
                    </div>
                    <div>
                      <dt className="label-caps">Passed</dt>
                      <dd className="tabular-nums text-success">{progress.passed}</dd>
                    </div>
                    <div>
                      <dt className="label-caps">Failed</dt>
                      <dd className="tabular-nums text-destructive">{progress.failed}</dd>
                    </div>
                    <div>
                      <dt className="label-caps">Evidence</dt>
                      <dd className="tabular-nums">{evidence.length}</dd>
                    </div>
                  </dl>
                  {problems.length > 0 && (
                    <ul className="space-y-1 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                      {problems.slice(0, 8).map((p) => {
                        const code = p.split(" ")[0];
                        const target = checks.find((c) => c.checkCode === code);
                        return (
                          <li key={p} className="flex items-center justify-between gap-2">
                            <span className="flex gap-2">
                              <CircleAlert className="size-3.5 shrink-0" /> {p}
                            </span>
                            {target && (
                              <button
                                type="button"
                                className="shrink-0 underline hover:no-underline"
                                onClick={() => {
                                  setActiveCheckId(target.id);
                                  setSubmitOpen(false);
                                }}
                              >
                                Go to check
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <Textarea
                    placeholder="Execution summary for the Quality Checker"
                    defaultValue={execution.summary}
                    onBlur={(e) =>
                      run((s) => saveExecutionSummary(s, user, execution.id, e.target.value))
                    }
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSubmitOpen(false)}>
                      Keep editing
                    </Button>
                    <Button
                      disabled={problems.length > 0}
                      onClick={() => {
                        const done = run((s) => submitExecution(s, user, execution.id), {
                          success: "Submitted for review.",
                        });
                        if (done) {
                          setSubmitOpen(false);
                          void navigate({ to: "/my-tests" });
                        }
                      }}
                    >
                      Confirm submission
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-lg border border-border bg-surface">
          <div className="space-y-2.5 border-b border-border px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="label-caps">Progress</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.completed}/{progress.total} checks
              </span>
            </div>
            <Progress value={progress.percent} className="h-1.5" />
            {progress.mandatoryRemaining.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-warning">
                <CircleAlert className="size-3.5" />
                {progress.mandatoryRemaining.length} mandatory check
                {progress.mandatoryRemaining.length === 1 ? "" : "s"} remaining
              </p>
            )}
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search checks"
              className="h-8"
              aria-label="Search checks"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as CheckFilter)}>
              <SelectTrigger className="h-8" aria-label="Filter checks">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All checks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="na">N/A</SelectItem>
                <SelectItem value="retest">Retest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[65vh] overflow-y-auto">
            <Accordion type="multiple" defaultValue={categories.map((c) => c.id)}>
              {categories.map((cat) => {
                const catChecks = checksForCategory(state, cat.id);
                const resolvedCount = catChecks.filter((c) => {
                  const r = currentCheckResult(state, execution.id, c.id);
                  return r && RESOLVED_CHECK_STATUSES.includes(r.status);
                }).length;
                const visibleChecks = catChecks.filter(
                  (c) => filterCheck(c.id) && matchesSearch(c),
                );
                return (
                  <AccordionItem key={cat.id} value={cat.id} className="px-2">
                    <AccordionTrigger className="px-1 py-2 text-sm">
                      <span className="flex w-full items-center justify-between pr-2">
                        <span>{cat.name}</span>
                        <span className="mono-id text-xs text-muted-foreground">
                          {resolvedCount}/{catChecks.length}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-2 pt-0">
                      <ol className="space-y-1">
                        {visibleChecks.map((c) => {
                          const r = currentCheckResult(state, execution.id, c.id);
                          return (
                            <li key={c.id}>
                              <button
                                onClick={() => setActiveCheckId(c.id)}
                                className={cn(
                                  "w-full rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                                  c.id === activeCheckId ? "bg-accent" : "hover:bg-accent/50",
                                )}
                                aria-current={c.id === activeCheckId}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="mono-id shrink-0 text-muted-foreground">
                                    {c.checkCode}
                                  </span>
                                  <span className="truncate">{c.title}</span>
                                </span>
                                <span className="mt-1 block">
                                  <CheckStatusBadge status={r?.status ?? "not_started"} />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                        {!visibleChecks.length && (
                          <li className="px-2.5 py-2 text-xs text-muted-foreground">
                            No checks match these filters.
                          </li>
                        )}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </aside>

        <div className="space-y-4">
          {activeCheck ? (
            <section className="rounded-lg border border-border bg-surface">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
                <h2 className="text-sm font-semibold">
                  <span className="mono-id text-primary">{activeCheck.checkCode}</span>{" "}
                  {activeCheck.title}
                  {activeResult && activeResult.attempt > 1 && (
                    <span className="ml-2 label-caps text-warning">
                      Attempt {activeResult.attempt}
                    </span>
                  )}
                </h2>
                <span
                  className={cn(
                    "text-xs",
                    saveState === "dirty" ? "text-warning" : "text-muted-foreground",
                  )}
                  role="status"
                >
                  {saveLabel}
                </span>
              </header>

              <div className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="label-caps">Instruction</p>
                    <p className="mt-1 text-sm">{activeCheck.instruction}</p>
                  </div>
                  <div>
                    <p className="label-caps">Expected result</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeCheck.expectedResult}
                    </p>
                  </div>
                </div>
                {activeCheck.acceptanceCriteria && (
                  <div>
                    <p className="label-caps">Acceptance criteria</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeCheck.acceptanceCriteria}
                    </p>
                  </div>
                )}
                {!checkEditable && isRetestRound && (
                  <p className="rounded-sm border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    This check is locked for this retest round — only checks the Quality Checker
                    flagged for retest can be edited.
                  </p>
                )}

                <div>
                  <p className="label-caps mb-1.5">Outcome</p>
                  {activeCheck.testType === "measurement" ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label className="label-caps" htmlFor="measurement">
                          Measured value{" "}
                          {activeCheck.measurementUnit ? `(${activeCheck.measurementUnit})` : ""}
                        </label>
                        <Input
                          id="measurement"
                          className="mt-1.5 w-40"
                          inputMode="decimal"
                          disabled={!checkEditable}
                          value={measurementInput}
                          onChange={(e) => setMeasurementInput(e.target.value)}
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={!checkEditable || measurementInput.trim() === ""}
                        onClick={recordMeasurement}
                      >
                        Record measurement
                      </Button>
                      {activeCheck.allowNA && (
                        <Button
                          size="sm"
                          variant={baseStatus === "na" ? "default" : "outline"}
                          disabled={!checkEditable}
                          onClick={() => setStatus("na")}
                        >
                          Mark N/A
                        </Button>
                      )}
                      {activeCheck.measurementMin != null && activeCheck.measurementMax != null && (
                        <span className="text-xs text-muted-foreground">
                          Acceptable range: {activeCheck.measurementMin}–
                          {activeCheck.measurementMax} {activeCheck.measurementUnit}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={baseStatus === "passed" ? "default" : "outline"}
                        disabled={!checkEditable}
                        onClick={() => setStatus("passed")}
                      >
                        <CheckCircle2 className="size-4" /> Pass
                      </Button>
                      <Button
                        size="sm"
                        variant={baseStatus === "failed" ? "default" : "outline"}
                        disabled={!checkEditable}
                        onClick={() => setStatus("failed")}
                      >
                        <CircleAlert className="size-4" /> Fail
                      </Button>
                      {activeCheck.allowNA && (
                        <Button
                          size="sm"
                          variant={baseStatus === "na" ? "default" : "outline"}
                          disabled={!checkEditable}
                          onClick={() => setStatus("na")}
                        >
                          N/A
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label-caps" htmlFor="actualResult">
                    Actual result
                  </label>
                  <Textarea
                    id="actualResult"
                    className="mt-1.5"
                    rows={3}
                    disabled={!checkEditable}
                    value={draft.actualResult}
                    onChange={(e) => scheduleSave({ ...draft, actualResult: e.target.value })}
                    placeholder="Record precisely what was observed against the expected result."
                  />
                </div>

                <div>
                  <label className="label-caps" htmlFor="testerNotes">
                    Tester notes
                  </label>
                  <Input
                    id="testerNotes"
                    className="mt-1.5"
                    disabled={!checkEditable}
                    value={draft.testerNotes}
                    onChange={(e) => scheduleSave({ ...draft, testerNotes: e.target.value })}
                    placeholder="Optional notes for this check"
                  />
                </div>

                {baseStatus === "failed" && (
                  <div className="space-y-3 rounded-sm border border-destructive/40 bg-destructive/5 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="label-caps" htmlFor="failureCategory">
                          Failure category
                        </label>
                        <Select
                          value={draft.failureCategory ?? ""}
                          onValueChange={(v) => scheduleSave({ ...draft, failureCategory: v })}
                          disabled={!checkEditable}
                        >
                          <SelectTrigger id="failureCategory" className="mt-1.5">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {state.failureCategories.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="label-caps" htmlFor="failureSeverity">
                          Severity
                        </label>
                        <Select
                          value={draft.failureSeverity ?? ""}
                          onValueChange={(v) =>
                            scheduleSave({ ...draft, failureSeverity: v as FailureSeverity })
                          }
                          disabled={!checkEditable}
                        >
                          <SelectTrigger id="failureSeverity" className="mt-1.5">
                            <SelectValue placeholder="Select severity" />
                          </SelectTrigger>
                          <SelectContent>
                            {FAILURE_SEVERITIES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="label-caps" htmlFor="failureDescription">
                        Failure description (required)
                      </label>
                      <Textarea
                        id="failureDescription"
                        className="mt-1.5"
                        rows={3}
                        disabled={!checkEditable}
                        value={draft.failureDescription}
                        onChange={(e) =>
                          scheduleSave({ ...draft, failureDescription: e.target.value })
                        }
                        placeholder="Describe the deviation precisely — what was observed vs. expected."
                      />
                    </div>
                    {similar.length > 0 && (
                      <div className="rounded-sm border border-info/30 bg-info/10 p-2.5 text-xs text-info">
                        <p className="mb-1 flex items-center gap-1.5 font-medium">
                          <Sparkles className="size-3.5" /> AI-assisted recommendation — requires
                          Quality validation
                        </p>
                        <ul className="space-y-1">
                          {similar.map((s, i) => (
                            <li key={i}>
                              {s.executionCode} · {s.checkCode}: "{s.description}"
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <p className="label-caps">
                      Evidence{" "}
                      {activeCheck.evidenceRequired && (
                        <span className="text-warning">· required</span>
                      )}
                    </p>
                    {checkEditable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fileInput.current?.click()}
                      >
                        <Paperclip className="size-4" /> Attach photo
                      </Button>
                    )}
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUpload(file);
                      e.target.value = "";
                    }}
                  />
                  <ul className="mt-2 space-y-1.5">
                    {checkEvidence.map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center gap-3 rounded-sm border border-border px-2.5 py-2"
                      >
                        {ev.mimeType.startsWith("image/") && (
                          <img
                            src={ev.dataUrl}
                            alt={ev.filename}
                            className="h-9 w-14 rounded-sm object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm">{ev.filename}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(ev.size / 1024)} KB
                        </span>
                        {checkEditable && (
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Remove ${ev.filename}`}
                            onClick={() => run((s) => removeEvidence(s, user, ev.id))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </li>
                    ))}
                    {!checkEvidence.length && (
                      <li className="text-xs text-muted-foreground">
                        No evidence attached to this check.
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {saveLabel}
                  </span>
                  {nextRequiredCheck && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveCheckId(nextRequiredCheck.id)}
                    >
                      Next required check: {nextRequiredCheck.checkCode}
                    </Button>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-foreground">
              This template has no checks configured.
            </section>
          )}

          {reviewsFor(state, execution.id).length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">Quality review feedback</h2>
              <ul className="mt-3 space-y-3">
                {reviewsFor(state, execution.id).map((rv) => (
                  <li key={rv.id} className="rounded-sm border border-border p-3">
                    <p className="text-xs text-muted-foreground">
                      {userById(state, rv.reviewerId)?.name} ·{" "}
                      {rv.decision === "approved"
                        ? "Approved"
                        : rv.decision === "rejected"
                          ? "Rejected"
                          : "Retest requested"}{" "}
                      · {format(new Date(rv.createdAt), "dd MMM yyyy HH:mm")}
                    </p>
                    <p className="mt-1 text-sm">{rv.comment}</p>
                    {rv.affectedCheckIds.length > 0 && (
                      <p className="mt-1.5 flex flex-wrap gap-1.5">
                        {rv.affectedCheckIds.map((id) => {
                          const c = checks.find((ch) => ch.id === id);
                          return c ? (
                            <span
                              key={id}
                              className="mono-id rounded-sm border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-xs text-warning"
                            >
                              {c.checkCode}
                            </span>
                          ) : null;
                        })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Audit trail</h2>
            <div className="mt-4">
              <ActivityTimeline state={state} events={auditFor(state, execution.id)} />
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
