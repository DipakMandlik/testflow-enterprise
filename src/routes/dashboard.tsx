import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList, Inbox } from "lucide-react";
import { AppShell } from "@/components/tms/AppShell";
import { EmptyState } from "@/components/tms/EmptyState";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useTms } from "@/lib/tms/store";
import {
  allCurrentResults,
  checksForCategory,
  computeQualityMetrics,
  currentUser,
  executionProgress,
  failureHotspots,
  templateById,
  unitById,
  userById,
} from "@/lib/tms/services";
import {
  ExecutionStatus,
  TEMPLATE_STATUS_LABELS,
  type AppState,
  type Execution,
  type User,
} from "@/types/domain";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Your quality inspection workload, review queue and programme health at a glance.",
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
  execution: Execution;
  user: User;
}) {
  const unit = unitById(state, execution.unitId);
  const template = templateById(state, execution.templateId);
  const progress = executionProgress(state, execution);
  const action =
    execution.status === ExecutionStatus.ASSIGNED
      ? "Start"
      : execution.status === ExecutionStatus.RETEST_REQUIRED
        ? "Resume Retest"
        : execution.status === ExecutionStatus.RETEST_IN_PROGRESS
          ? "Continue Retest"
          : execution.status === ExecutionStatus.IN_PROGRESS
            ? "Continue"
            : "View";

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono-id text-primary">{unit?.usn}</span>
          <span className="truncate text-sm font-medium">
            {template?.name} Rev {template?.revision}
          </span>
          <StatusBadge status={execution.status} role={user.role} />
        </div>
        <div className="mt-1.5 flex items-center gap-3">
          <Progress value={progress.percent} className="h-1 w-40" />
          <span className="text-xs text-muted-foreground">
            {progress.completed}/{progress.total} checks · updated{" "}
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
        ExecutionStatus.RETEST_REQUIRED,
        ExecutionStatus.RETEST_IN_PROGRESS,
        ExecutionStatus.IN_PROGRESS,
        ExecutionStatus.ASSIGNED,
      ].includes(e.status),
    )
    .sort((a, b) => a.status.localeCompare(b.status));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Assigned" value={byStatus(ExecutionStatus.ASSIGNED).length} />
        <Metric label="In progress" value={byStatus(ExecutionStatus.IN_PROGRESS).length} />
        <Metric
          label="Retest required"
          value={
            byStatus(ExecutionStatus.RETEST_REQUIRED).length +
            byStatus(ExecutionStatus.RETEST_IN_PROGRESS).length
          }
          tone="text-warning"
        />
        <Metric label="Awaiting review" value={byStatus(ExecutionStatus.PENDING_REVIEW).length} />
        <Metric
          label="Rejected"
          value={byStatus(ExecutionStatus.REJECTED).length}
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

function QualityCheckerDashboard({ state, user }: { state: AppState; user: User }) {
  const pending = state.executions.filter((e) => e.status === ExecutionStatus.PENDING_REVIEW);
  const retest = state.executions.filter((e) =>
    [ExecutionStatus.RETEST_REQUIRED, ExecutionStatus.RETEST_IN_PROGRESS].includes(e.status),
  );
  const completed = state.executions.filter((e) => e.status === ExecutionStatus.COMPLETED);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-4">
        <Metric label="Pending verification" value={pending.length} tone="text-primary" />
        <Metric label="Retest in flight" value={retest.length} tone="text-warning" />
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
              const unit = unitById(state, execution.unitId);
              const progress = executionProgress(state, execution);
              return (
                <li key={execution.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mono-id text-primary">{execution.code}</span>
                      <span className="truncate text-sm font-medium">{unit?.usn}</span>
                      <StatusBadge status={execution.status} role={user.role} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {userById(state, execution.testerId)?.name} · {progress.passed} passed,{" "}
                      {progress.failed} failed, {progress.na} N/A
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
            description="Executions appear here the moment a tester submits them for verification."
          />
        )}
      </section>
    </div>
  );
}

function ManagerDashboard({ state }: { state: AppState }) {
  const executions = state.executions;
  const results = allCurrentResults(state);
  const metrics = computeQualityMetrics(results);

  const categoryQuality = state.templateCategories.map((cat) => {
    const checkIds = checksForCategory(state, cat.id).map((c) => c.id);
    const catResults = results.filter((r) => checkIds.includes(r.templateCheckId));
    const catMetrics = computeQualityMetrics(catResults);
    return { category: cat, metrics: catMetrics };
  });

  const testers = state.users.filter((u) => u.role === "tester");
  const liveStations = state.stations.map((station) => {
    const active = executions.find(
      (e) =>
        e.stationId === station.id &&
        [ExecutionStatus.IN_PROGRESS, ExecutionStatus.RETEST_IN_PROGRESS].includes(e.status),
    );
    return { station, active };
  });

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
          value={executions.filter((e) => e.status === ExecutionStatus.PENDING_REVIEW).length}
          tone="text-primary"
        />
        <Metric
          label="Completed"
          value={executions.filter((e) => e.status === ExecutionStatus.COMPLETED).length}
          tone="text-success"
        />
        <Metric label="Pass rate" value={`${100 - metrics.failureRate}%`} tone="text-success" />
        <Metric label="Fail rate" value={`${metrics.failureRate}%`} tone="text-destructive" />
      </div>

      <section className="rounded-lg border border-border bg-surface">
        <header className="border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Live testing</h2>
        </header>
        <ul className="divide-y divide-border">
          {liveStations.map(({ station, active }) => (
            <li key={station.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="mono-id w-20 text-primary">{station.code}</span>
              {active ? (
                <>
                  <span className="min-w-0 flex-1 truncate">
                    {userById(state, active.testerId)?.name}
                  </span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {executionProgress(state, active).completed}/
                    {executionProgress(state, active).total}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-info">
                    <span className="size-1.5 rounded-full bg-info" /> Testing
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Idle</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Category quality</h2>
          </header>
          <ul className="divide-y divide-border">
            {categoryQuality.map(({ category, metrics: m }) => (
              <li key={category.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="w-32 text-sm">{category.name}</span>
                <Progress value={100 - m.failureRate} className="h-1.5 flex-1" />
                <span className="w-32 text-right text-xs text-muted-foreground tabular-nums">
                  {100 - m.failureRate}% of {m.totalResolved}
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

function SeniorManagerDashboard({ state }: { state: AppState }) {
  const results = allCurrentResults(state);
  const metrics = computeQualityMetrics(results);
  const hotspots = failureHotspots(state).slice(0, 6);
  const stations = state.stations.map((station) => {
    const executionIds = state.executions
      .filter((e) => e.stationId === station.id)
      .map((e) => e.id);
    const stationResults = results.filter((r) => executionIds.includes(r.executionId));
    return { station, metrics: computeQualityMetrics(stationResults) };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-4">
        <Metric label="First pass yield" value={`${metrics.firstPassYield}%`} tone="text-success" />
        <Metric label="Failure rate" value={`${metrics.failureRate}%`} tone="text-destructive" />
        <Metric label="Retest rate" value={`${metrics.retestRate}%`} tone="text-warning" />
        <Metric label="Checks resolved" value={metrics.totalResolved} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface">
          <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Failure hotspots</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/reports">Full reports</Link>
            </Button>
          </header>
          {hotspots.length ? (
            <ul className="divide-y divide-border">
              {hotspots.map((h) => (
                <li
                  key={h.category}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <span>{h.category}</span>
                  <span className="mono-id text-destructive">{h.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No failures recorded"
              description="Quality hotspots appear here once checks fail."
            />
          )}
        </section>

        <section className="rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Station performance</h2>
          </header>
          <ul className="divide-y divide-border">
            {stations.map(({ station, metrics: m }) => (
              <li key={station.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="mono-id w-16 text-primary">{station.code}</span>
                <Progress value={m.firstPassYield} className="h-1.5 flex-1" />
                <span className="w-28 text-right text-xs text-muted-foreground tabular-nums">
                  FPY {m.firstPassYield}%
                </span>
              </li>
            ))}
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

function TemplateManagerDashboard({ state }: { state: AppState }) {
  const byStatus = (s: string) => state.templates.filter((t) => t.status === s).length;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 divide-border rounded-lg border border-border bg-surface sm:grid-cols-5">
        <Metric label="Draft" value={byStatus("draft")} />
        <Metric label="Under review" value={byStatus("under_review")} tone="text-warning" />
        <Metric label="Published" value={byStatus("published")} tone="text-success" />
        <Metric label="Archived" value={byStatus("archived")} />
        <Metric
          label="Total families"
          value={new Set(state.templates.map((t) => t.familyCode)).size}
        />
      </div>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Templates</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/templates">Open template manager</Link>
          </Button>
        </header>
        <ul className="divide-y divide-border">
          {state.templates.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="mono-id text-primary">{t.familyCode}</span>
              <span className="min-w-0 flex-1 truncate">
                {t.name} Rev {t.revision}
              </span>
              <span className="label-caps text-xs">{TEMPLATE_STATUS_LABELS[t.status]}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t.totalChecks} checks
              </span>
            </li>
          ))}
        </ul>
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
        quality_checker: "Submissions awaiting your decision and recent verification outcomes.",
        manager: "Programme-wide quality health derived from live execution data.",
        senior_manager: "Executive quality summary across every plant and station.",
        template_manager: "Template families, revisions and publication status.",
        admin: "Platform-wide state across users, plants, stations and executions.",
      }[user.role]
    : "";

  return (
    <AppShell title="Dashboard" description={description}>
      {user ? (
        user.role === "tester" ? (
          <TesterDashboard state={state} user={user} />
        ) : user.role === "quality_checker" ? (
          <QualityCheckerDashboard state={state} user={user} />
        ) : user.role === "senior_manager" ? (
          <SeniorManagerDashboard state={state} />
        ) : user.role === "template_manager" ? (
          <TemplateManagerDashboard state={state} />
        ) : (
          <ManagerDashboard state={state} />
        )
      ) : null}
    </AppShell>
  );
}
