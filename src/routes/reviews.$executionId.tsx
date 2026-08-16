import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { CheckStatusBadge, StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useTms } from "@/lib/tms/store";
import {
  approveExecution,
  attemptsForCheck,
  auditFor,
  categoriesFor,
  checksForCategory,
  currentCheckResult,
  currentUser,
  evidenceForCheck,
  executionById,
  executionProgress,
  failureHotspots,
  rejectExecution,
  requestRetest,
  reviewsFor,
  similarFailures,
  templateById,
  unitById,
  userById,
} from "@/lib/tms/services";
import { canReviewExecution } from "@/lib/tms/permissions";
import { FAILED_CHECK_STATUSES } from "@/types/domain";

export const Route = createFileRoute("/reviews/$executionId")({
  head: () => ({
    meta: [
      { title: "Review Execution — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Inspect recorded results and evidence, then approve, reject or request a retest.",
      },
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
  const [selectedChecks, setSelectedChecks] = useState<string[]>(() => {
    if (!execution) return [];
    return categoriesFor(state, execution.templateId)
      .flatMap((cat) => checksForCategory(state, cat.id))
      .filter((c) => {
        const r = currentCheckResult(state, execution.id, c.id);
        return r && FAILED_CHECK_STATUSES.includes(r.status);
      })
      .map((c) => c.id);
  });

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

  const template = templateById(state, execution.templateId);
  const unit = unitById(state, execution.unitId);
  const categories = template ? categoriesFor(state, template.id) : [];
  const progress = executionProgress(state, execution);
  const hotspots = failureHotspots(state);
  const decidable = canReviewExecution(user, execution);
  const canReject = decidable && comment.trim().length >= 15;
  const canRetest = decidable && comment.trim().length >= 15 && selectedChecks.length > 0;

  const toggleCheck = (checkId: string, checked: boolean) => {
    setSelectedChecks((prev) =>
      checked ? [...prev, checkId] : prev.filter((id) => id !== checkId),
    );
  };

  return (
    <AppShell
      title={`${execution.code} · ${unit?.usn ?? ""}`}
      description={`${template?.name ?? ""} Rev ${template?.revision ?? ""} — executed by ${userById(state, execution.testerId)?.name}`}
      actions={<StatusBadge status={execution.status} role={user.role} />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5 text-sm">
            <h2 className="font-semibold">Recorded results</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.passed} passed · {progress.failed} failed · {progress.na} n/a · round{" "}
              {execution.round}
            </span>
          </header>
          <div className="divide-y divide-border">
            {categories.map((cat) => (
              <div key={cat.id}>
                <p className="label-caps bg-muted/30 px-4 py-2">{cat.name}</p>
                <ol className="divide-y divide-border">
                  {checksForCategory(state, cat.id).map((check) => {
                    const result = currentCheckResult(state, execution.id, check.id);
                    const attempts = attemptsForCheck(state, execution.id, check.id);
                    const checkEvidence = evidenceForCheck(
                      state,
                      execution.id,
                      check.id,
                      result?.attempt ?? 1,
                    );
                    const similar =
                      result &&
                      FAILED_CHECK_STATUSES.includes(result.status) &&
                      result.failureDescription.trim()
                        ? similarFailures(state, result.failureDescription, result.id)
                        : [];
                    return (
                      <li key={check.id} className="space-y-2 px-4 py-3">
                        <div className="flex items-start gap-3">
                          {decidable && (
                            <Checkbox
                              className="mt-0.5"
                              checked={selectedChecks.includes(check.id)}
                              onCheckedChange={(checked) => toggleCheck(check.id, checked === true)}
                              aria-label={`Flag ${check.checkCode} for retest`}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="mono-id text-muted-foreground">
                                {check.checkCode}
                              </span>
                              <span className="text-sm font-medium">{check.title}</span>
                              <CheckStatusBadge status={result?.status ?? "not_started"} />
                              {result && result.attempt > 1 && (
                                <span className="label-caps text-warning">
                                  attempt {result.attempt}
                                </span>
                              )}
                            </div>
                            {result?.actualResult && (
                              <p className="mt-1 text-sm">
                                <span className="label-caps mr-2">Actual</span>
                                {result.actualResult}
                              </p>
                            )}
                            {result?.testerNotes && (
                              <p className="mt-1 text-sm text-muted-foreground">
                                <span className="label-caps mr-2">Notes</span>
                                {result.testerNotes}
                              </p>
                            )}
                            {result && FAILED_CHECK_STATUSES.includes(result.status) && (
                              <div className="mt-1.5 rounded-sm border border-destructive/40 bg-destructive/5 p-2 text-sm">
                                <p className="text-xs text-destructive">
                                  {result.failureCategory ?? "Uncategorized"} ·{" "}
                                  {result.failureSeverity ?? "unspecified"} severity
                                </p>
                                {result.failureDescription && (
                                  <p className="mt-1">{result.failureDescription}</p>
                                )}
                              </div>
                            )}
                            {similar.length > 0 && (
                              <div className="mt-1.5 rounded-sm border border-info/30 bg-info/10 p-2 text-xs text-info">
                                <p className="mb-1 flex items-center gap-1.5 font-medium">
                                  <Sparkles className="size-3.5" /> AI-assisted recommendation —
                                  requires Quality validation
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
                            {checkEvidence.length > 0 && (
                              <ul className="mt-1.5 flex flex-wrap gap-2">
                                {checkEvidence.map((ev) => (
                                  <li key={ev.id} className="rounded-sm border border-border p-1">
                                    {ev.mimeType.startsWith("image/") ? (
                                      <img
                                        src={ev.dataUrl}
                                        alt={ev.filename}
                                        className="h-16 w-24 object-cover"
                                      />
                                    ) : (
                                      <span className="px-2 text-xs">{ev.filename}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {attempts.length > 1 && (
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="label-caps text-muted-foreground">
                                  Retest history
                                </span>
                                {attempts.map((a) => (
                                  <span key={a.id} className="flex items-center gap-1 text-xs">
                                    <span className="mono-id text-muted-foreground">
                                      #{a.attempt}
                                    </span>
                                    <CheckStatusBadge status={a.status} />
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          {hotspots.length > 0 && (
            <div className="rounded-lg border border-info/30 bg-info/10 p-4 text-xs text-info">
              <p className="mb-1.5 flex items-center gap-1.5 font-medium">
                <Sparkles className="size-3.5" /> AI-assisted insight — requires Quality validation
              </p>
              <p>Platform-wide failure categories, most frequent first:</p>
              <ul className="mt-1.5 space-y-0.5">
                {hotspots.slice(0, 3).map((h) => (
                  <li key={h.category}>
                    {h.category} — {h.count} flagged check{h.count === 1 ? "" : "s"}
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              placeholder="Review comment (min. 15 characters — required to reject or request a retest)"
            />
            {decidable && selectedChecks.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">
                {selectedChecks.length} check{selectedChecks.length === 1 ? "" : "s"} flagged for
                retest above.
              </p>
            )}
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
                disabled={!canReject}
                onClick={() => {
                  if (
                    run((s) => rejectExecution(s, user, execution.id, comment), {
                      success: "Execution rejected.",
                    })
                  )
                    void navigate({ to: "/reviews" });
                }}
              >
                Reject
              </Button>
              <Button
                variant="outline"
                disabled={!canRetest}
                onClick={() => {
                  if (
                    run((s) => requestRetest(s, user, execution.id, comment, selectedChecks), {
                      success: "Retest requested.",
                    })
                  )
                    void navigate({ to: "/reviews" });
                }}
              >
                Request retest
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
                    {rv.decision === "approved"
                      ? "Approved"
                      : rv.decision === "rejected"
                        ? "Rejected"
                        : "Retest requested"}{" "}
                    · {format(new Date(rv.createdAt), "dd MMM HH:mm")}
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
