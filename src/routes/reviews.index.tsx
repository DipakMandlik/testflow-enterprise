import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { EmptyState } from "@/components/tms/EmptyState";
import { StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTms } from "@/lib/tms/store";
import {
  currentResultsFor,
  currentUser,
  executionProgress,
  templateById,
  unitById,
  userById,
} from "@/lib/tms/services";
import { ExecutionStatus, FAILED_CHECK_STATUSES } from "@/types/domain";

export const Route = createFileRoute("/reviews/")({
  head: () => ({
    meta: [
      { title: "Review Queue — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Submitted executions awaiting Quality Checker verification.",
      },
    ],
  }),
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const { state } = useTms();
  const user = currentUser(state);
  const [failuresOnly, setFailuresOnly] = useState(false);

  const pending = useMemo(() => {
    const rows = state.executions.filter((e) => e.status === ExecutionStatus.PENDING_REVIEW);
    if (!failuresOnly) return rows;
    return rows.filter((e) =>
      currentResultsFor(state, e.id).some((r) => FAILED_CHECK_STATUSES.includes(r.status)),
    );
  }, [state, failuresOnly]);

  const recent = state.executions
    .filter((e) =>
      [
        ExecutionStatus.APPROVED,
        ExecutionStatus.REJECTED,
        ExecutionStatus.COMPLETED,
        ExecutionStatus.RETEST_REQUIRED,
      ].includes(e.status),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 15);

  return (
    <AppShell title="Review Queue" description="Submitted executions, newest first.">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Pending verification ({pending.length})</h2>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Failures only
              <Switch checked={failuresOnly} onCheckedChange={setFailuresOnly} />
            </label>
          </header>
          {pending.length ? (
            <ul className="divide-y divide-border">
              {pending.map((e) => {
                const unit = unitById(state, e.unitId);
                const template = templateById(state, e.templateId);
                const p = executionProgress(state, e);
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono-id text-primary">{e.code}</span>
                        <span className="truncate text-sm font-medium">
                          {unit?.usn} · {template?.name} Rev {template?.revision}
                        </span>
                        <StatusBadge status={e.status} {...(user ? { role: user.role } : {})} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {userById(state, e.testerId)?.name} · {p.passed} passed / {p.failed} failed
                        / {p.na} n/a · round {e.round} · submitted{" "}
                        {e.submittedAt ? format(new Date(e.submittedAt), "dd MMM HH:mm") : "—"}
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link to="/reviews/$executionId" params={{ executionId: e.id }}>
                        Review
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing awaiting review"
              description="Submitted executions land here immediately, with notifications for each one."
            />
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Recently decided</h2>
          </header>
          <ul className="divide-y divide-border">
            {recent.map((e) => {
              const unit = unitById(state, e.unitId);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="mono-id text-primary">{e.code}</span>
                  <span className="truncate">{unit?.usn}</span>
                  <StatusBadge status={e.status} {...(user ? { role: user.role } : {})} />
                  <Button asChild size="sm" variant="outline" className="ml-auto">
                    <Link to="/reviews/$executionId" params={{ executionId: e.id }}>
                      Open
                    </Link>
                  </Button>
                </li>
              );
            })}
            {!recent.length && (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                No decisions recorded yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
