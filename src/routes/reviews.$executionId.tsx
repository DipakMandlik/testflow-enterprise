import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { Paperclip, Sparkles } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { CheckStatusBadge, StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FAILED_CHECK_STATUSES, type TemplateCheck } from "@/types/domain";

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

type ReviewFilter = "all" | "failures" | "retest" | "evidence";

function ReviewPage() {
  const { executionId } = Route.useParams();
  const { state, run } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);
  const execution = executionById(state, executionId);

  const [comment, setComment] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [openCheckId, setOpenCheckId] = useState<string | null>(null);
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
  const checks = template
    ? categoriesFor(state, template.id).flatMap((cat) => checksForCategory(state, cat.id))
    : [];
  const progress = executionProgress(state, execution);
  const hotspots = failureHotspots(state);
  const decidable = canReviewExecution(user, execution);
  const canReject = decidable && comment.trim().length >= 15;
  const canRetest = decidable && comment.trim().length >= 15 && selectedChecks.length > 0;
  const openCheck = checks.find((c) => c.id === openCheckId);

  const toggleCheck = (checkId: string, checked: boolean) => {
    setSelectedChecks((prev) =>
      checked ? [...prev, checkId] : prev.filter((id) => id !== checkId),
    );
  };

  const matchesFilter = (check: TemplateCheck) => {
    const result = currentCheckResult(state, execution.id, check.id);
    const evidenceCount = evidenceForCheck(
      state,
      execution.id,
      check.id,
      result?.attempt ?? 1,
    ).length;
    switch (filter) {
      case "failures":
        return !!result && FAILED_CHECK_STATUSES.includes(result.status);
      case "retest":
        return result?.status === "retest_required" || result?.status === "retest_in_progress";
      case "evidence":
        return evidenceCount > 0;
      default:
        return true;
    }
  };

  return (
    <AppShell
      title={`${execution.code} · ${unit?.usn ?? ""}`}
      description={`${template?.name ?? ""} Rev ${template?.revision ?? ""} — executed by ${userById(state, execution.testerId)?.name}`}
      actions={<StatusBadge status={execution.status} role={user.role} />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-sm">
            <h2 className="font-semibold">Recorded results</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {progress.passed} passed · {progress.failed} failed · {progress.na} n/a · round{" "}
              {execution.round}
            </span>
          </header>
          <div className="border-b border-border px-4 py-2.5">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as ReviewFilter)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="failures">Failures</TabsTrigger>
                <TabsTrigger value="retest">Retest</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="divide-y divide-border">
            {(template ? categoriesFor(state, template.id) : []).map((cat) => {
              const catChecks = checksForCategory(state, cat.id).filter(matchesFilter);
              if (!catChecks.length) return null;
              return (
                <div key={cat.id}>
                  <p className="label-caps bg-muted px-4 py-2">{cat.name}</p>
                  <ol className="divide-y divide-border">
                    {catChecks.map((check) => {
                      const result = currentCheckResult(state, execution.id, check.id);
                      const evidenceCount = evidenceForCheck(
                        state,
                        execution.id,
                        check.id,
                        result?.attempt ?? 1,
                      ).length;
                      return (
                        <li key={check.id} className="flex items-center gap-3 px-4 py-2.5">
                          {decidable && (
                            <Checkbox
                              checked={selectedChecks.includes(check.id)}
                              onCheckedChange={(checked) => toggleCheck(check.id, checked === true)}
                              aria-label={`Flag ${check.checkCode} for retest`}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => setOpenCheckId(check.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm transition-colors duration-150 hover:text-primary"
                          >
                            <span className="mono-id shrink-0 text-muted-foreground">
                              {check.checkCode}
                            </span>
                            <span className="min-w-0 flex-1 truncate">{check.title}</span>
                            {evidenceCount > 0 && (
                              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            {result && result.attempt > 1 && (
                              <span className="label-caps shrink-0 text-warning">
                                Attempt {result.attempt}
                              </span>
                            )}
                            <CheckStatusBadge status={result?.status ?? "not_started"} />
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
            {!checks.filter(matchesFilter).length && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                No checks match this filter.
              </p>
            )}
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

      <Sheet open={!!openCheck} onOpenChange={(o) => !o && setOpenCheckId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {openCheck &&
            (() => {
              const result = currentCheckResult(state, execution.id, openCheck.id);
              const attempts = attemptsForCheck(state, execution.id, openCheck.id);
              const checkEvidence = evidenceForCheck(
                state,
                execution.id,
                openCheck.id,
                result?.attempt ?? 1,
              );
              const similar =
                result &&
                FAILED_CHECK_STATUSES.includes(result.status) &&
                result.failureDescription.trim()
                  ? similarFailures(state, result.failureDescription, result.id)
                  : [];
              return (
                <>
                  <SheetHeader>
                    <SheetTitle>
                      <span className="mono-id text-primary">{openCheck.checkCode}</span>{" "}
                      {openCheck.title}
                    </SheetTitle>
                    <SheetDescription>
                      <CheckStatusBadge status={result?.status ?? "not_started"} />
                      {result && result.attempt > 1 && (
                        <span className="label-caps ml-2 text-warning">
                          Attempt {result.attempt}
                        </span>
                      )}
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-5 space-y-4 text-sm">
                    <div>
                      <p className="label-caps">Expected result</p>
                      <p className="mt-1 text-muted-foreground">{openCheck.expectedResult}</p>
                    </div>
                    <div>
                      <p className="label-caps">Observed (actual result)</p>
                      <p className="mt-1">{result?.actualResult || "Not recorded."}</p>
                    </div>
                    {result?.testerNotes && (
                      <div>
                        <p className="label-caps">Tester notes</p>
                        <p className="mt-1 text-muted-foreground">{result.testerNotes}</p>
                      </div>
                    )}
                    {result && FAILED_CHECK_STATUSES.includes(result.status) && (
                      <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-3">
                        <p className="label-caps text-destructive">Failure</p>
                        <p className="mt-1 text-xs text-destructive">
                          {result.failureCategory ?? "Uncategorized"} ·{" "}
                          {result.failureSeverity ?? "unspecified"} severity
                        </p>
                        {result.failureDescription && (
                          <p className="mt-1">{result.failureDescription}</p>
                        )}
                      </div>
                    )}
                    {similar.length > 0 && (
                      <div className="rounded-sm border border-info/30 bg-info/10 p-3 text-xs text-info">
                        <p className="mb-1 flex items-center gap-1.5 font-semibold">
                          <Sparkles className="size-3.5" /> Quality Intelligence
                        </p>
                        <p className="text-muted-foreground">
                          {similar.length} similar failure{similar.length === 1 ? "" : "s"} observed
                          across recent executions.
                        </p>
                        <ul className="mt-2 space-y-1">
                          {similar.map((s, i) => (
                            <li key={i}>
                              {s.executionCode} · {s.checkCode}: "{s.description}"
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 border-t border-info/20 pt-1.5 font-semibold">
                          AI-assisted recommendation — Quality validation required.
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="label-caps">
                        Evidence {checkEvidence.length > 0 && `(${checkEvidence.length})`}
                      </p>
                      {checkEvidence.length > 0 ? (
                        <ul className="mt-1.5 flex flex-wrap gap-2">
                          {checkEvidence.map((ev) => (
                            <li key={ev.id} className="rounded-sm border border-border p-1">
                              {ev.mimeType.startsWith("image/") ? (
                                <img
                                  src={ev.dataUrl}
                                  alt={ev.filename}
                                  className="h-24 w-36 object-cover"
                                />
                              ) : (
                                <span className="px-2 text-xs">{ev.filename}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">No evidence attached.</p>
                      )}
                    </div>
                    {attempts.length > 1 && (
                      <div>
                        <p className="label-caps">Previous attempts</p>
                        <ul className="mt-1.5 space-y-1.5">
                          {attempts.map((a) => (
                            <li key={a.id} className="flex items-center gap-2 text-xs">
                              <span className="mono-id text-muted-foreground">
                                Attempt {a.attempt}
                              </span>
                              <CheckStatusBadge status={a.status} />
                              {a.completedAt && (
                                <span className="text-muted-foreground">
                                  {format(new Date(a.completedAt), "dd MMM HH:mm")}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {decidable && (
                      <label className="flex items-center gap-2 border-t border-border pt-4 text-sm">
                        <Checkbox
                          checked={selectedChecks.includes(openCheck.id)}
                          onCheckedChange={(checked) => toggleCheck(openCheck.id, checked === true)}
                        />
                        Flag this check for retest
                      </label>
                    )}
                  </div>
                </>
              );
            })()}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
