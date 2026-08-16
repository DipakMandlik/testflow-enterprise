import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, ClipboardList, Inbox, PlayCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/tms/AppShell";
import { EmptyState } from "@/components/tms/EmptyState";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { PriorityBadge, StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTms } from "@/lib/tms/store";
import {
  currentUser,
  executionProgress,
  moduleById,
  testCaseById,
  userById,
} from "@/lib/tms/services";
import {
  ExecutionStatus,
  statusLabel,
  type AppState,
  type TestExecution,
  type User,
} from "@/types/domain";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Tata Electronics TMS" },
      {
        name: "description",
        content: "Your validation workload, review queue and programme quality at a glance.",
      },
      { property: "og:title", content: "Dashboard — Tata Electronics TMS" },
      {
        property: "og:description",
        content: "Role-aware overview of assigned tests, reviews and testing health.",
      },
    ],
  }),
  component: DashboardPage,
});

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="border-r border-border px-4 py-3 last:border-r-0">
      <p className="label-caps">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone ?? ""}`}>{value}</p>
    </div>
  );
}

function WorkItem({
  state,
  execution,
  user,
}: {
  state: AppState;
  execution: TestExecution;
  user: User;
}) {
  const tc = testCaseById(state, execution.testCaseId);
  const progress = executionProgress(state, execution);
  const action =
    execution.status === ExecutionStatus.ASSIGNED
      ? "Start"
      : execution.status === ExecutionStatus.SENT_BACK
        ? "Revise"
        : execution.status === ExecutionStatus.IN_PROGRESS
          ? "Continue"
          : "View";

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-id text-primary">{tc?.code}</span>
          <span className="truncate text-sm font-medium">{tc?.title}</span>
          <StatusBadge status={execution.status} role={user.role} />
          {tc && <PriorityBadge priority={tc.priority} />}
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <Progress value={progress.percent} className="h-1 w-40" />
          <span className="text-xs text-muted-foreground">
            {progress.completed}/{progress.total} steps · updated{" "}
            {formatDistanceToNow(new Date(execution.updatedAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      <Button asChild size="sm" variant={action === "View" ? "outline" : "default"}>
        <Link to="/executions/$executionId" params={{ executionId: execution.id }}>
          {action}
        </Link>
      </Button>
    </li>
  );
}

function TesterDashboard({ state, user }: { state: AppState; user: User }) {
  const mine = state.executions.filter((e) => e.testerId === user.id);
  const byStatus = (s: ExecutionStatus) => mine.filter((e) => e.status === s);
  const queue = mine
    .filter((e) =>
      [
        ExecutionStatus.SENT_BACK,
        ExecutionStatus.IN_PROGRESS,
        ExecutionStatus.ASSIGNED,
        ExecutionStatus.BLOCKED,
      ].includes(e.status),
    )
    .sort((a, b) => a.status.localeCompare(b.status));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Assigned" value={byStatus(ExecutionStatus.ASSIGNED).length} />
        <Metric label="In progress" value={byStatus(ExecutionStatus.IN_PROGRESS).length} />
        <Metric
          label="Revision required"
          value={byStatus(ExecutionStatus.SENT_BACK).length}
          tone="text-warning"
        />
        <Metric
          label="Awaiting review"
          value={
            byStatus(ExecutionStatus.SUBMITTED).length +
            byStatus(ExecutionStatus.UNDER_REVIEW).length
          }
        />
        <Metric
          label="Blocked"
          value={byStatus(ExecutionStatus.BLOCKED).length}
          tone="text-destructive"
        />
        <Metric
          label="Completed"
          value={byStatus(ExecutionStatus.COMPLETED).length}
          tone="text-success"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Work queue</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/my-tests">All my tests</Link>
            </Button>
          </header>
          {queue.length ? (
            <ul className="divide-y divide-border">
              {queue.map((execution) => (
                <WorkItem key={execution.id} state={state} execution={execution} user={user} />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Inbox}
              title="Your queue is clear"
              description="Nothing is waiting on you right now. New assignments appear here immediately."
            />
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <div className="mt-4">
            <ActivityTimeline
              state={state}
              events={state.audit
                .filter((a) => a.actorId === user.id || mine.some((m) => m.id === a.entityId))
                .slice(0, 8)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function ReviewerDashboard({ state, user }: { state: AppState; user: User }) {
  const pending = state.executions.filter((e) =>
    [ExecutionStatus.SUBMITTED, ExecutionStatus.UNDER_REVIEW].includes(e.status),
  );
  const sentBack = state.executions.filter((e) => e.status === ExecutionStatus.SENT_BACK);
  const completed = state.executions.filter((e) => e.status === ExecutionStatus.COMPLETED);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-4">
        <Metric label="Pending review" value={pending.length} tone="text-primary" />
        <Metric label="Revision requested" value={sentBack.length} tone="text-warning" />
        <Metric label="Completed" value={completed.length} tone="text-success" />
        <Metric label="Reviews recorded" value={state.reviews.length} />
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Awaiting your decision</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/reviews">Open review queue</Link>
          </Button>
        </header>
        {pending.length ? (
          <ul className="divide-y divide-border">
            {pending.map((execution) => {
              const tc = testCaseById(state, execution.testCaseId);
              const progress = executionProgress(state, execution);
              return (
                <li key={execution.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono-id text-primary">{execution.code}</span>
                      <span className="truncate text-sm font-medium">{tc?.title}</span>
                      <StatusBadge status={execution.status} role={user.role} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {userById(state, execution.testerId)?.name} · {progress.passed} passed,{" "}
                      {progress.failed} failed, {progress.blocked} blocked
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to="/reviews/$executionId" params={{ executionId: execution.id }}>
                      Review
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No submissions pending"
            description="Executions appear here the moment a tester submits them for review."
          />
        )}
      </section>
    </div>
  );
}

function ManagerDashboard({ state }: { state: AppState }) {
  const executions = state.executions;
  const results = state.stepResults.filter((r) => r.status !== "not_started");
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const blocked = results.filter((r) => r.status === "blocked").length;
  const measured = passed + failed + blocked || 1;

  const byModule = state.modules.map((m) => {
    const cases = state.testCases.filter((t) => t.moduleId === m.id).map((t) => t.id);
    const modResults = state.stepResults.filter((r) => {
      const ex = state.executions.find((e) => e.id === r.executionId);
      return ex && cases.includes(ex.testCaseId) && r.status !== "not_started";
    });
    const p = modResults.filter((r) => r.status === "passed").length;
    return {
      module: m.name,
      total: modResults.length,
      passRate: modResults.length ? Math.round((p / modResults.length) * 100) : 0,
    };
  });

  const testers = state.users.filter((u) => u.role === "tester");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Executions" value={executions.length} />
        <Metric
          label="In progress"
          value={executions.filter((e) => e.status === ExecutionStatus.IN_PROGRESS).length}
        />
        <Metric
          label="Pending review"
          value={
            executions.filter((e) =>
              [ExecutionStatus.SUBMITTED, ExecutionStatus.UNDER_REVIEW].includes(e.status),
            ).length
          }
          tone="text-primary"
        />
        <Metric
          label="Completed"
          value={executions.filter((e) => e.status === ExecutionStatus.COMPLETED).length}
          tone="text-success"
        />
        <Metric
          label="Pass rate"
          value={`${Math.round((passed / measured) * 100)}%`}
          tone="text-success"
        />
        <Metric
          label="Fail rate"
          value={`${Math.round((failed / measured) * 100)}%`}
          tone="text-destructive"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Module quality</h2>
          </header>
          <ul className="divide-y divide-border">
            {byModule.map((m) => (
              <li key={m.module} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-40 text-sm">{m.module}</span>
                <Progress value={m.passRate} className="h-1.5 flex-1" />
                <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                  {m.passRate}% of {m.total}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Tester load</h2>
          </header>
          <ul className="divide-y divide-border">
            {testers.map((t) => {
              const mine = executions.filter((e) => e.testerId === t.id);
              const done = mine.filter((e) => e.status === ExecutionStatus.COMPLETED).length;
              return (
                <li key={t.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>
                    {t.name}
                    {!t.active && (
                      <span className="ml-2 text-xs text-muted-foreground">inactive</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {done}/{mine.length} completed
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">System activity</h2>
        <div className="mt-4">
          <ActivityTimeline state={state} events={state.audit.slice(0, 10)} />
        </div>
      </section>
    </div>
  );
}

function DashboardPage() {
  const { state } = useTms();
  const user = currentUser(state);

  const description = user
    ? {
        tester: "Everything currently waiting on you, in execution order.",
        reviewer: "Submissions awaiting your decision and recent review outcomes.",
        manager: "Programme-wide testing health derived from live execution data.",
        admin: "Platform-wide state across users, projects and executions.",
      }[user.role]
    : "";

  return (
    <AppShell title="Dashboard" description={description}>
      {user ? (
        user.role === "tester" ? (
          <TesterDashboard state={state} user={user} />
        ) : user.role === "reviewer" ? (
          <ReviewerDashboard state={state} user={user} />
        ) : (
          <ManagerDashboard state={state} />
        )
      ) : null}
    </AppShell>
  );
}

export const dashboardIcons = { AlertTriangle, PlayCircle, RefreshCw, statusLabel };
