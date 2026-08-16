import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { StatusBadge, StepStatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTms } from "@/lib/tms/store";
import {
  approveExecution,
  auditFor,
  claimReview,
  currentUser,
  evidenceFor,
  executionById,
  executionProgress,
  requestRevision,
  resultsFor,
  reviewsFor,
  stepsFor,
  testCaseById,
  userById,
} from "@/lib/tms/services";
import { canReviewExecution } from "@/lib/tms/permissions";

export const Route = createFileRoute("/reviews/$executionId")({
  head: () => ({
    meta: [
      { title: "Review Execution — Tata Electronics TMS" },
      {
        name: "description",
        content: "Inspect recorded results and evidence, then approve or request a revision.",
      },
      { property: "og:title", content: "Review Execution — Tata Electronics TMS" },
      { property: "og:description", content: "Reviewer workspace for submitted test executions." },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { executionId } = Route.useParams();
  const { state, run } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);
  const execution = executionById(state, executionId);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (user && execution && canReviewExecution(user, execution)) {
      run((s) => claimReview(s, user, execution.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executionId, user?.id]);

  if (!user) return <AppShell title="Review">{null}</AppShell>;
  if (!execution) {
    return (
      <AppShell title="Execution not found" description="This execution no longer exists.">
        <Button asChild variant="outline">
          <Link to="/reviews">Back to review queue</Link>
        </Button>
      </AppShell>
    );
  }

  const testCase = testCaseById(state, execution.testCaseId);
  const steps = stepsFor(state, execution.testCaseId);
  const results = resultsFor(state, execution.id);
  const evidence = evidenceFor(state, execution.id);
  const progress = executionProgress(state, execution);
  const decidable = canReviewExecution(user, execution);

  return (
    <AppShell
      title={`${execution.code} · ${testCase?.code}`}
      description={`${testCase?.title} — executed by ${userById(state, execution.testerId)?.name}`}
      actions={<StatusBadge status={execution.status} role={user.role} />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm">
            <h2 className="font-semibold">Recorded results</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.passed} passed · {progress.failed} failed · {progress.blocked} blocked
            </span>
          </header>
          <ol className="divide-y divide-border">
            {steps.map((s) => {
              const r = results.find((x) => x.stepId === s.id);
              const stepEvidence = evidence.filter((e) => e.stepId === s.id);
              return (
                <li key={s.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mono-id text-muted-foreground">{s.index}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{s.action}</p>
                      <p className="text-xs text-muted-foreground">Expected: {s.expected}</p>
                    </div>
                    <StepStatusBadge status={r?.status ?? "not_started"} />
                  </div>
                  {r?.actual && (
                    <p className="pl-8 text-sm">
                      <span className="label-caps mr-2">Actual</span>
                      {r.actual}
                    </p>
                  )}
                  {r?.comment && (
                    <p className="pl-8 text-sm text-warning">
                      <span className="label-caps mr-2">Comment</span>
                      {r.comment}
                    </p>
                  )}
                  {stepEvidence.length > 0 && (
                    <ul className="flex flex-wrap gap-2 pl-8">
                      {stepEvidence.map((ev) => (
                        <li key={ev.id} className="rounded-sm border border-border p-1">
                          {ev.mimeType.startsWith("image/") ? (
                            <img
                              src={ev.dataUrl}
                              alt={ev.filename}
                              className="h-20 w-32 object-cover"
                            />
                          ) : (
                            <span className="px-2 text-xs">{ev.filename}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Decision</h2>
            {execution.summary && (
              <p className="mt-2 rounded-sm border border-border p-2 text-sm text-muted-foreground">
                {execution.summary}
              </p>
            )}
            <Textarea
              className="mt-3"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={!decidable}
              placeholder="Review comment (required when requesting a revision)"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={!decidable}
                onClick={() => {
                  if (
                    run((s) => approveExecution(s, user, execution.id, comment), {
                      success: "Execution approved.",
                    })
                  )
                    void navigate({ to: "/reviews" });
                }}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                disabled={!decidable}
                onClick={() => {
                  if (
                    run((s) => requestRevision(s, user, execution.id, comment), {
                      success: "Revision requested.",
                    })
                  )
                    void navigate({ to: "/reviews" });
                }}
              >
                Send back for revision
              </Button>
            </div>
            {!decidable && (
              <p className="mt-2 text-xs text-muted-foreground">
                This execution is not currently awaiting a review decision.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Review history</h2>
            <ul className="mt-3 space-y-2">
              {reviewsFor(state, execution.id).map((rv) => (
                <li key={rv.id} className="rounded-sm border border-border p-2 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {userById(state, rv.reviewerId)?.name} ·{" "}
                    {rv.decision === "approved" ? "Approved" : "Revision requested"} ·{" "}
                    {format(new Date(rv.createdAt), "dd MMM HH:mm")}
                  </p>
                  <p>{rv.comment}</p>
                </li>
              ))}
              {!reviewsFor(state, execution.id).length && (
                <li className="text-sm text-muted-foreground">No prior review rounds.</li>
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Audit trail</h2>
            <div className="mt-3">
              <ActivityTimeline state={state} events={auditFor(state, execution.id)} />
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
