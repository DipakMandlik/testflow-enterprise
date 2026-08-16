import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/tms/AppShell";
import { Button } from "@/components/ui/button";
import { useTms } from "@/lib/tms/store";
import {
  allCurrentResults,
  checkById,
  computeQualityMetrics,
  currentUser,
  executionById,
  failureHotspots,
  stationPerformance,
  unitById,
} from "@/lib/tms/services";
import { canExportReports } from "@/lib/tms/permissions";
import {
  EXECUTION_STATUS_LABELS,
  ExecutionStatus,
  FAILED_CHECK_STATUSES,
  RESOLVED_CHECK_STATUSES,
} from "@/types/domain";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Pibythree Quality Hub" },
      {
        name: "description",
        content: "First pass yield, failure hotspots, retest rate and station performance.",
      },
    ],
  }),
  component: ReportsPage,
});

const TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function exportCsv(rows: string[][], header: string[]) {
  const csv = [header, ...rows]
    .map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pibythree-quality-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { state } = useTms();
  const user = currentUser(state);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const results = allCurrentResults(state);
  const overall = computeQualityMetrics(results);
  const hotspots = failureHotspots(state);
  const stations = stationPerformance(state);

  const statusData = Object.values(ExecutionStatus)
    .map((s) => ({
      name: EXECUTION_STATUS_LABELS[s],
      value: state.executions.filter((e) => e.status === s).length,
    }))
    .filter((d) => d.value > 0);

  const trend = useMemo(() => {
    const byDay = new Map<string, { passed: number; failed: number }>();
    for (const r of results) {
      if (!r.completedAt || !RESOLVED_CHECK_STATUSES.includes(r.status)) continue;
      const key = r.completedAt.slice(0, 10);
      const entry = byDay.get(key) ?? { passed: 0, failed: 0 };
      if (r.status === "passed" || r.status === "retest_passed") entry.passed++;
      if (FAILED_CHECK_STATUSES.includes(r.status)) entry.failed++;
      byDay.set(key, entry);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: format(new Date(date), "dd MMM"), ...v }));
  }, [results]);

  const flaggedForCategory = selectedCategory
    ? results.filter(
        (r) => r.failureCategory === selectedCategory && FAILED_CHECK_STATUSES.includes(r.status),
      )
    : [];

  const handleExport = () => {
    const header = [
      "Execution",
      "Unit",
      "Check",
      "Attempt",
      "Status",
      "Failure Category",
      "Failure Severity",
      "Completed At",
    ];
    const rows = results.map((r) => {
      const execution = executionById(state, r.executionId);
      const unit = execution ? unitById(state, execution.unitId) : undefined;
      const check = checkById(state, r.templateCheckId);
      return [
        execution?.code ?? "",
        unit?.usn ?? "",
        check?.checkCode ?? "",
        String(r.attempt),
        r.status,
        r.failureCategory ?? "",
        r.failureSeverity ?? "",
        r.completedAt ?? "",
      ];
    });
    exportCsv(rows, header);
  };

  return (
    <AppShell
      title="Reports"
      description="Every figure is computed live from current execution and check records."
      actions={
        user && canExportReports(user) ? (
          <Button variant="outline" onClick={handleExport}>
            <Download className="size-4" /> Export CSV
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="label-caps">First pass yield</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-success">
              {overall.firstPassYield}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="label-caps">Failure rate</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
              {overall.failureRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="label-caps">Retest rate</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-warning">
              {overall.retestRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="label-caps">Checks resolved</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{overall.totalResolved}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Execution status distribution</h2>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                  >
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={TONES[i % TONES.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Pass / fail trend</h2>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "var(--accent)" }} />
                  <Line
                    type="monotone"
                    dataKey="passed"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="var(--destructive)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Failure category hotspots</h2>
            <p className="text-xs text-muted-foreground">Click a bar to see the flagged checks.</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={hotspots}
                  layout="vertical"
                  margin={{ left: 40 }}
                  onClick={(e) => {
                    const cat = (e as { activeLabel?: string })?.activeLabel;
                    if (cat) setSelectedCategory((prev) => (prev === cat ? null : cat));
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    stroke="var(--muted-foreground)"
                    fontSize={12}
                    width={110}
                  />
                  <Tooltip cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="count" fill="var(--chart-4)" radius={3} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {selectedCategory && (
              <div className="mt-3 rounded-sm border border-border p-2">
                <p className="label-caps">
                  Flagged as "{selectedCategory}" ({flaggedForCategory.length})
                </p>
                <ul className="mt-1.5 max-h-40 space-y-1 overflow-y-auto text-xs">
                  {flaggedForCategory.map((r) => {
                    const execution = executionById(state, r.executionId);
                    const check = checkById(state, r.templateCheckId);
                    return (
                      <li key={r.id} className="flex gap-2">
                        <span className="mono-id text-primary">{execution?.code}</span>
                        <span className="text-muted-foreground">{check?.checkCode}</span>
                        <span className="truncate">{r.failureDescription}</span>
                      </li>
                    );
                  })}
                  {!flaggedForCategory.length && (
                    <li className="text-muted-foreground">No flagged checks in this category.</li>
                  )}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="text-sm font-semibold">Station performance</h2>
            <div className="mt-3 space-y-2">
              {stations.map(({ station, metrics }) => (
                <div key={station.id} className="rounded-sm border border-border p-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {station.code} · {station.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {metrics.totalResolved} resolved
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      FPY{" "}
                      <span className="tabular-nums text-success">{metrics.firstPassYield}%</span>
                    </span>
                    <span>
                      Failure rate{" "}
                      <span className="tabular-nums text-destructive">{metrics.failureRate}%</span>
                    </span>
                    <span>
                      Retest rate{" "}
                      <span className="tabular-nums text-warning">{metrics.retestRate}%</span>
                    </span>
                  </div>
                </div>
              ))}
              {!stations.length && (
                <p className="text-sm text-muted-foreground">No stations configured.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
