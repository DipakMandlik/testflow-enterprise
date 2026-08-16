import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { CheckCircle2, CircleAlert, Paperclip, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { StatusBadge, StepStatusBadge } from "@/components/tms/badges";
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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useTms } from "@/lib/tms/store";
import {
  addEvidence,
  auditFor,
  currentUser,
  evidenceFor,
  executionById,
  executionProgress,
  removeEvidence,
  reopenForRevision,
  resultsFor,
  reviewsFor,
  saveExecutionSummary,
  saveStepResult,
  startExecution,
  stepsFor,
  submitExecution,
  testCaseById,
  userById,
  validateSubmission,
} from "@/lib/tms/services";
import { canExecuteTest } from "@/lib/tms/permissions";
import { ExecutionStatus, type StepStatus } from "@/types/domain";

export const Route = createFileRoute("/executions/$executionId")({
  head: () => ({
    meta: [
      { title: "Test Execution — Tata Electronics TMS" },
      {
        name: "description",
        content: "Execute test steps, record outcomes, attach evidence and submit for review.",
      },
      { property: "og:title", content: "Test Execution — Tata Electronics TMS" },
      { property: "og:description", content: "Step-by-step execution workspace with autosave." },
    ],
  }),
  component: ExecutionPage,
});

const STATUS_OPTIONS: StepStatus[] = ["passed", "failed", "blocked", "skipped"];

function ExecutionPage() {
  const { executionId } = Route.useParams();
  const { state, run, update } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);
  const execution = executionById(state, executionId);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saveState, setSaveState] = useState<"idle" | "dirty" | "saving" | "saved">("idle");
  const [draft, setDraft] = useState({ actual: "", comment: "" });
  const [submitOpen, setSubmitOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const steps = execution ? stepsFor(state, execution.testCaseId) : [];
  const results = execution ? resultsFor(state, execution.id) : [];
  const step = steps[activeIndex];
  const result = step ? results.find((r) => r.stepId === step.id) : undefined;
  const editable = !!(user && execution && canExecuteTest(user, execution));
  const evidence = execution ? evidenceFor(state, execution.id) : [];
  const testCase = execution ? testCaseById(state, execution.testCaseId) : undefined;
  const progress = execution ? executionProgress(state, execution) : null;
  const problems = useMemo(
    () => (execution ? validateSubmission(state, execution) : []),
    [state, execution],
  );

  useEffect(() => {
    setDraft({ actual: result?.actual ?? "", comment: result?.comment ?? "" });
    setSaveState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id, execution?.id]);

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
  if (!execution || !testCase || !step || !progress) {
    return (
      <AppShell title="Execution not found" description="This execution no longer exists.">
        <Button asChild variant="outline">
          <Link to="/my-tests">Back to my tests</Link>
        </Button>
      </AppShell>
    );
  }

  const scheduleSave = (next: { actual: string; comment: string }) => {
    setDraft(next);
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaveState("saving");
      const okSave = run((s) => saveStepResult(s, user, execution.id, step.id, next));
      setSaveState(okSave ? "saved" : "dirty");
    }, 2000);
  };

  const setStatus = (status: StepStatus) => {
    run((s) => saveStepResult(s, user, execution.id, step.id, { ...draft, status }));
    setSaveState("saved");
  };

  const onUpload = async (file: File) => {
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(file);
    });
    run(
      (s) =>
        addEvidence(s, user, execution.id, step.id, {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        }),
      { success: "Evidence attached." },
    );
  };

  const saveLabel = {
    idle: "All changes saved",
    dirty: "Unsaved changes",
    saving: "Saving…",
    saved: "Saved",
  }[saveState];

  return (
    <AppShell
      title={`${testCase.code} · ${testCase.title}`}
      description={`Execution ${execution.code} · round ${execution.round}`}
      actions={
        <>
          <StatusBadge status={execution.status} role={user.role} />
          {execution.status === ExecutionStatus.ASSIGNED && editable && (
            <Button onClick={() => run((s) => startExecution(s, user, execution.id), { success: "Execution started." })}>
              Start execution
            </Button>
          )}
          {(execution.status === ExecutionStatus.SENT_BACK ||
            execution.status === ExecutionStatus.BLOCKED) && (
            <Button onClick={() => run((s) => reopenForRevision(s, user, execution.id))}>
              Resume for revision
            </Button>
          )}
          {editable && execution.status === ExecutionStatus.IN_PROGRESS && (
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
                    The execution becomes read-only until a reviewer approves it or requests a
                    revision.
                  </DialogDescription>
                </DialogHeader>
                <dl className="grid grid-cols-4 gap-2 rounded-sm border border-border p-3 text-sm">
                  <div>
                    <dt className="label-caps">Steps</dt>
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
                    {problems.slice(0, 5).map((p) => (
                      <li key={p} className="flex gap-2">
                        <CircleAlert className="size-3.5 shrink-0" /> {p}
                      </li>
                    ))}
                  </ul>
                )}
                <Textarea
                  placeholder="Execution summary for the reviewer"
                  defaultValue={execution.summary}
                  onBlur={(e) => run((s) => saveExecutionSummary(s, user, execution.id, e.target.value))}
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
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-3 py-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="label-caps">Progress</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.completed}/{progress.total} steps
              </span>
            </div>
            <Progress value={progress.percent} className="mt-2 h-1.5" />
          </div>
          <ol className="max-h-[60vh] overflow-y-auto p-2">
            {steps.map((s, i) => {
              const r = results.find((x) => x.stepId === s.id);
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveIndex(i)}
                    className={cn(
                      "w-full rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                      i === activeIndex ? "bg-accent" : "hover:bg-accent/50",
                    )}
                    aria-current={i === activeIndex}
                  >
                    <span className="flex items-center gap-2">
                      <span className="mono-id w-6 text-muted-foreground">{s.index}</span>
                      <span className="truncate">{s.action}</span>
                    </span>
                    <span className="mt-1 block pl-8">
                      <StepStatusBadge status={r?.status ?? "not_started"} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-border bg-surface">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">
                Step {step.index} of {steps.length}
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
                  <p className="label-caps">Action</p>
                  <p className="mt-1 text-sm">{step.action}</p>
                </div>
                <div>
                  <p className="label-caps">Expected result</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.expected}</p>
                </div>
              </div>

              <div>
                <p className="label-caps mb-1.5">Outcome</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={result?.status === s ? "default" : "outline"}
                      disabled={!editable}
                      onClick={() => setStatus(s)}
                    >
                      {s === "passed" && <CheckCircle2 className="size-4" />}
                      <span className="capitalize">{s}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label-caps" htmlFor="actual">
                  Actual result
                </label>
                <Textarea
                  id="actual"
                  className="mt-1.5"
                  rows={3}
                  disabled={!editable}
                  value={draft.actual}
                  onChange={(e) => scheduleSave({ ...draft, actual: e.target.value })}
                  placeholder="Record precisely what was observed, including measurements."
                />
              </div>

              {(result?.status === "failed" || result?.status === "blocked") && (
                <div>
                  <label className="label-caps" htmlFor="comment">
                    {result.status === "failed" ? "Failure description" : "Block reason"} (required)
                  </label>
                  <Textarea
                    id="comment"
                    className="mt-1.5"
                    rows={3}
                    disabled={!editable}
                    value={draft.comment}
                    onChange={(e) => scheduleSave({ ...draft, comment: e.target.value })}
                    placeholder="Explain the deviation, impact and any dependency involved."
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <p className="label-caps">
                    Evidence {step.evidenceRequired && <span className="text-warning">· required</span>}
                  </p>
                  {editable && (
                    <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
                      <Paperclip className="size-4" /> Attach file
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  className="sr-only"
                  accept="image/*,application/pdf,text/plain"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload(file);
                    e.target.value = "";
                  }}
                />
                <ul className="mt-2 space-y-1.5">
                  {evidence
                    .filter((ev) => ev.stepId === step.id)
                    .map((ev) => (
                      <li
                        key={ev.id}
                        className="flex items-center gap-3 rounded-sm border border-border px-2.5 py-2"
                      >
                        {ev.mimeType.startsWith("image/") && (
                          <img src={ev.dataUrl} alt={ev.filename} className="h-9 w-14 rounded-sm object-cover" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm">{ev.filename}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(ev.size / 1024)} KB
                        </span>
                        {editable && (
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
                  {!evidence.some((ev) => ev.stepId === step.id) && (
                    <li className="text-xs text-muted-foreground">No evidence attached to this step.</li>
                  )}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeIndex === 0}
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!editable}
                    onClick={() => {
                      run((s) => saveStepResult(s, user, execution.id, step.id, draft));
                      setSaveState("saved");
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    disabled={activeIndex >= steps.length - 1}
                    onClick={() => {
                      if (editable) run((s) => saveStepResult(s, user, execution.id, step.id, draft));
                      setActiveIndex((i) => Math.min(steps.length - 1, i + 1));
                    }}
                  >
                    Save &amp; continue
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {reviewsFor(state, execution.id).length > 0 && (
            <section className="rounded-lg border border-border bg-surface p-4">
              <h2 className="text-sm font-semibold">Reviewer feedback</h2>
              <ul className="mt-3 space-y-3">
                {reviewsFor(state, execution.id).map((rv) => (
                  <li key={rv.id} className="rounded-sm border border-border p-3">
                    <p className="text-xs text-muted-foreground">
                      {userById(state, rv.reviewerId)?.name} ·{" "}
                      {rv.decision === "approved" ? "Approved" : "Revision requested"} ·{" "}
                      {format(new Date(rv.createdAt), "dd MMM yyyy HH:mm")}
                    </p>
                    <p className="mt-1 text-sm">{rv.comment}</p>
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
      <span className="sr-only" aria-live="polite">
        {saveLabel}
      </span>
      <button className="sr-only" onClick={() => update((s) => s)} tabIndex={-1} aria-hidden />
    </AppShell>
  );
}
