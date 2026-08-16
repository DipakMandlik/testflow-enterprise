import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleAlert,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { CheckStatusBadge, StatusBadge } from "@/components/tms/badges";
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
  stationById,
  submitExecution,
  templateById,
  unitById,
  userById,
  validateSubmission,
} from "@/lib/tms/services";
import { canExecuteTest } from "@/lib/tms/permissions";
import {
  ExecutionStatus,
  FAILED_CHECK_STATUSES,
  RESOLVED_CHECK_STATUSES,
  type FailureSeverity,
} from "@/types/domain";

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

function jumpTo(checkId: string) {
  requestAnimationFrame(() => {
    document
      .getElementById(`check-${checkId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function SegmentedControl({
  value,
  onChange,
  disabled,
  options,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: {
    value: string;
    label: string;
    icon?: ReactNode;
    tone: "success" | "destructive" | "neutral";
  }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-muted p-0.5">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
              !selected && "text-muted-foreground hover:bg-accent hover:text-foreground",
              selected && opt.tone === "success" && "bg-success text-success-foreground",
              selected &&
                opt.tone === "destructive" &&
                "bg-destructive text-destructive-foreground",
              selected && opt.tone === "neutral" && "bg-foreground text-background",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

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

  const unit = unitById(state, execution.unitId);
  const station = stationById(state, execution.stationId);
  const tester = userById(state, execution.testerId);
  const allComplete = progress.mandatoryRemaining.length === 0;

  return (
    <AppShell
      title="Digital Quality Worksheet"
      description={`Execution ${execution.code} · round ${execution.round}`}
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
                                  jumpTo(target.id);
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
      <div className="space-y-4">
        {/* Premium compact info bar */}
        <section className="flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3">
          <div>
            <p className="label-caps">Template</p>
            <p className="text-sm font-semibold">
              {template.name}{" "}
              <span className="mono-id font-normal text-muted-foreground">
                REV {String(template.revision).padStart(2, "0")}
              </span>
            </p>
          </div>
          <div>
            <p className="label-caps">Unit</p>
            <p className="mono-id text-sm">{unit?.usn}</p>
          </div>
          <div>
            <p className="label-caps">Station</p>
            <p className="text-sm">{station ? `${station.code} · ${station.name}` : "—"}</p>
          </div>
          <div>
            <p className="label-caps">Tester</p>
            <p className="text-sm">{tester?.name}</p>
          </div>
        </section>

        {/* Progress */}
        <section className="rounded-lg border border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {progress.completed} / {progress.total} CHECKS
            </span>
            <span className="tabular-nums text-sm text-muted-foreground">
              {progress.percent}% complete
            </span>
          </div>
          <Progress value={progress.percent} className="mt-2 h-2" />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="text-success">{progress.passed} passed</span>
            <span className="text-destructive">{progress.failed} failed</span>
            <span>{progress.na} N/A</span>
            {progress.mandatoryRemaining.length > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <CircleAlert className="size-3.5" />
                {progress.mandatoryRemaining.length} mandatory remaining
              </span>
            )}
          </div>
        </section>

        {allComplete ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3 duration-500 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="size-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-semibold text-success">Quality worksheet complete</p>
                <p className="text-xs text-muted-foreground">
                  {progress.passed} passed · {progress.failed} failed · {progress.na} N/A · Requires
                  Quality review
                </p>
              </div>
            </div>
            {editable &&
              (execution.status === ExecutionStatus.IN_PROGRESS ||
                execution.status === ExecutionStatus.RETEST_IN_PROGRESS) && (
                <Button size="sm" onClick={() => setSubmitOpen(true)}>
                  Submit for quality verification
                </Button>
              )}
          </section>
        ) : (
          nextRequiredCheck && (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-accent px-4 py-3">
              <div>
                <p className="label-caps text-primary">Next required check</p>
                <p className="text-sm font-medium">
                  <span className="mono-id text-primary">{nextRequiredCheck.checkCode}</span>{" "}
                  {nextRequiredCheck.title}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setActiveCheckId(nextRequiredCheck.id);
                  jumpTo(nextRequiredCheck.id);
                }}
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            </section>
          )
        )}

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <aside className="h-fit rounded-lg border border-border bg-surface lg:sticky lg:top-20">
            <div className="space-y-2.5 border-b border-border px-3 py-2.5">
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
            <ul className="max-h-[60vh] overflow-y-auto p-1.5">
              {categories.map((cat) => {
                const catChecks = checksForCategory(state, cat.id);
                const results = catChecks.map((c) => currentCheckResult(state, execution.id, c.id));
                const resolvedCount = results.filter(
                  (r) => r && RESOLVED_CHECK_STATUSES.includes(r.status),
                ).length;
                const hasFailure = results.some(
                  (r) => r && FAILED_CHECK_STATUSES.includes(r.status),
                );
                const isComplete = resolvedCount === catChecks.length && catChecks.length > 0;
                const isCurrent = catChecks.some((c) => c.id === activeCheckId);
                const StatusIcon = hasFailure ? AlertTriangle : isComplete ? CheckCircle2 : Circle;
                const iconTone = hasFailure
                  ? "text-destructive"
                  : isComplete
                    ? "text-success"
                    : isCurrent
                      ? "text-primary"
                      : "text-muted-foreground";
                return (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() =>
                        document
                          .getElementById(`category-${cat.id}`)
                          ?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent",
                        isCurrent && "bg-accent",
                      )}
                    >
                      <StatusIcon className={cn("size-4 shrink-0", iconTone)} />
                      <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                      <span className="mono-id text-xs text-muted-foreground">
                        {resolvedCount}/{catChecks.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          <div className="space-y-3">
            {categories.map((cat) => {
              const catChecks = checksForCategory(state, cat.id);
              const resolvedCount = catChecks.filter((c) => {
                const r = currentCheckResult(state, execution.id, c.id);
                return r && RESOLVED_CHECK_STATUSES.includes(r.status);
              }).length;
              const visibleChecks = catChecks.filter((c) => filterCheck(c.id) && matchesSearch(c));
              return (
                <section
                  key={cat.id}
                  id={`category-${cat.id}`}
                  className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-surface"
                >
                  <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <h3 className="text-sm font-semibold">{cat.name}</h3>
                    <span className="mono-id text-xs text-muted-foreground">
                      {resolvedCount}/{catChecks.length}
                    </span>
                  </header>
                  <ul className="divide-y divide-border">
                    {visibleChecks.map((c) => {
                      const r = currentCheckResult(state, execution.id, c.id);
                      const rEvidence = evidenceForCheck(
                        state,
                        execution.id,
                        c.id,
                        r?.attempt ?? 1,
                      );
                      const expanded = c.id === activeCheckId;
                      return (
                        <li key={c.id} id={`check-${c.id}`}>
                          <button
                            type="button"
                            onClick={() => setActiveCheckId(expanded ? null : c.id)}
                            aria-expanded={expanded}
                            className={cn(
                              "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors duration-200 hover:bg-accent/50",
                              expanded && "bg-accent/40",
                            )}
                          >
                            <span className="mono-id w-7 shrink-0 text-muted-foreground">
                              {c.sequence}
                            </span>
                            <span className="mono-id shrink-0 text-primary">{c.checkCode}</span>
                            <span className="min-w-0 flex-1 truncate">{c.title}</span>
                            {rEvidence.length > 0 && (
                              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {r && r.attempt > 1 && (
                              <span className="label-caps shrink-0 text-warning">
                                Attempt {r.attempt}
                              </span>
                            )}
                            <CheckStatusBadge status={r?.status ?? "not_started"} />
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                expanded && "rotate-180",
                              )}
                            />
                          </button>

                          {expanded && activeCheck && (
                            <div className="space-y-4 border-t border-border bg-muted/20 p-4 duration-300 animate-in fade-in slide-in-from-top-1">
                              <h4 className="sr-only">
                                {activeCheck.checkCode} {activeCheck.title}
                              </h4>
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
                                <p className="rounded-sm border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
                                  This check is locked for this retest round — only checks the
                                  Quality Checker flagged for retest can be edited.
                                </p>
                              )}

                              <div>
                                <p className="label-caps mb-1.5">Result</p>
                                {activeCheck.testType === "measurement" ? (
                                  <div className="flex flex-wrap items-end gap-2">
                                    <div>
                                      <label className="label-caps" htmlFor="measurement">
                                        Measured value{" "}
                                        {activeCheck.measurementUnit
                                          ? `(${activeCheck.measurementUnit})`
                                          : ""}
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
                                    {activeCheck.measurementMin != null &&
                                      activeCheck.measurementMax != null && (
                                        <span className="text-xs text-muted-foreground">
                                          Acceptable range: {activeCheck.measurementMin}–
                                          {activeCheck.measurementMax} {activeCheck.measurementUnit}
                                        </span>
                                      )}
                                  </div>
                                ) : (
                                  <SegmentedControl
                                    disabled={!checkEditable}
                                    value={baseStatus}
                                    onChange={(v) => setStatus(v as "passed" | "failed" | "na")}
                                    options={[
                                      {
                                        value: "passed",
                                        label: "Pass",
                                        tone: "success",
                                        icon: <CheckCircle2 className="size-3.5" />,
                                      },
                                      {
                                        value: "failed",
                                        label: "Fail",
                                        tone: "destructive",
                                        icon: <CircleAlert className="size-3.5" />,
                                      },
                                      ...(activeCheck.allowNA
                                        ? [{ value: "na", label: "N/A", tone: "neutral" as const }]
                                        : []),
                                    ]}
                                  />
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
                                  onChange={(e) =>
                                    scheduleSave({ ...draft, actualResult: e.target.value })
                                  }
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
                                  onChange={(e) =>
                                    scheduleSave({ ...draft, testerNotes: e.target.value })
                                  }
                                  placeholder="Optional notes for this check"
                                />
                              </div>

                              {baseStatus === "failed" && (
                                <div className="space-y-3 rounded-sm border border-destructive/40 bg-destructive/5 p-3 duration-300 animate-in fade-in slide-in-from-top-1">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className="label-caps" htmlFor="failureCategory">
                                        Failure category
                                      </label>
                                      <Select
                                        value={draft.failureCategory ?? ""}
                                        onValueChange={(v) =>
                                          scheduleSave({ ...draft, failureCategory: v })
                                        }
                                        disabled={!checkEditable}
                                      >
                                        <SelectTrigger id="failureCategory" className="mt-1.5">
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {state.failureCategories.map((cat2) => (
                                            <SelectItem key={cat2} value={cat2}>
                                              {cat2}
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
                                          scheduleSave({
                                            ...draft,
                                            failureSeverity: v as FailureSeverity,
                                          })
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
                                        scheduleSave({
                                          ...draft,
                                          failureDescription: e.target.value,
                                        })
                                      }
                                      placeholder="Describe the deviation precisely — what was observed vs. expected."
                                    />
                                  </div>
                                  {similar.length > 0 && (
                                    <div className="rounded-sm border border-info/30 bg-info/10 p-3 text-xs text-info duration-300 animate-in fade-in slide-in-from-top-1">
                                      <p className="mb-1 flex items-center gap-1.5 font-semibold">
                                        <Sparkles className="size-3.5" /> Quality Intelligence
                                      </p>
                                      <p className="font-medium text-foreground">
                                        Potential pattern detected
                                      </p>
                                      <p className="mt-0.5 text-muted-foreground">
                                        {similar.length} similar failure
                                        {similar.length === 1 ? "" : "s"} observed across recent
                                        executions:
                                      </p>
                                      <ul className="mt-2 space-y-1">
                                        {similar.map((s, i) => (
                                          <li key={i}>
                                            {s.executionCode} · {s.checkCode}: "{s.description}"
                                          </li>
                                        ))}
                                      </ul>
                                      <p className="mt-2 border-t border-info/20 pt-1.5 text-[11px] font-semibold">
                                        AI-assisted recommendation — Quality validation required.
                                      </p>
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
                                      className="flex items-center gap-3 rounded-sm border border-border bg-surface px-2.5 py-2"
                                    >
                                      {ev.mimeType.startsWith("image/") && (
                                        <img
                                          src={ev.dataUrl}
                                          alt={ev.filename}
                                          className="h-9 w-14 rounded-sm object-cover"
                                        />
                                      )}
                                      <span className="min-w-0 flex-1 truncate text-sm">
                                        {ev.filename}
                                      </span>
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

                              <div
                                className="text-xs text-muted-foreground"
                                role="status"
                                aria-live="polite"
                              >
                                {saveLabel}
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                    {!visibleChecks.length && (
                      <li className="px-4 py-3 text-xs text-muted-foreground">
                        No checks match these filters.
                      </li>
                    )}
                  </ul>
                </section>
              );
            })}
            {!categories.length && (
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
      </div>
    </AppShell>
  );
}
