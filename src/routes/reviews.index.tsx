import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ClipboardCheck } from "lucide-react";
import { AppShell } from "@/components/tms/AppShell";
import { EmptyState } from "@/components/tms/EmptyState";
import { StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { useTms } from "@/lib/tms/store";
import { currentUser, executionProgress, testCaseById, userById } from "@/lib/tms/services";
import { ExecutionStatus } from "@/types/domain";

export const Route = createFileRoute("/reviews/")({
  head: () => ({
    meta: [
      { title: "Review Queue — Tata Electronics TMS" },
      { name: "description", content: "Submitted executions awaiting reviewer approval or revision." },
      { property: "og:title", content: "Review Queue — Tata Electronics TMS" },
      { property: "og:description", content: "Inspect submitted test executions and record decisions." },
    ],
  }),
  component: ReviewQueuePage,
});

function ReviewQueuePage() {
  const { state } = useTms();
  const user = currentUser(state);
  const pending = state.executions.filter((e) =>
    [ExecutionStatus.SUBMITTED, ExecutionStatus.UNDER_REVIEW].includes(e.status),
  );
  const recent = state.executions.filter((e) =>
    [ExecutionStatus.COMPLETED, ExecutionStatus.SENT_BACK].includes(e.status),
  );

  return (
    <AppShell title="Review Queue" description="Submitted executions, newest first.">
      <div className="space-y-5">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Pending decisions ({pending.length})</h2>
          </header>
          {pending.length ? (
            <ul className="divide-y divide-border">
              {pending.map((e) => {
                const tc = testCaseById(state, e.testCaseId);
                const p = executionProgress(state, e);
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="mono-id text-primary">{e.code}</span>
                        <span className="truncate text-sm font-medium">
                          {tc?.code} · {tc?.title}
                        </span>
                        <StatusBadge status={e.status} {...(user ? { role: user.role } : {})} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {userById(state, e.testerId)?.name} · {p.passed} passed / {p.failed} failed /{" "}
                        {p.blocked} blocked · submitted{" "}
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
            {recent.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="mono-id text-primary">{e.code}</span>
                <span className="truncate">{testCaseById(state, e.testCaseId)?.code}</span>
                <StatusBadge status={e.status} {...(user ? { role: user.role } : {})} />
                <Button asChild size="sm" variant="outline" className="ml-auto">
                  <Link to="/reviews/$executionId" params={{ executionId: e.id }}>
                    Open
                  </Link>
                </Button>
              </li>
            ))}
            {!recent.length && (
              <li className="px-4 py-6 text-sm text-muted-foreground">No decisions recorded yet.</li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
