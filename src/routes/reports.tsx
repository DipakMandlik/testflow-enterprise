import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/tms/AppShell";
import { useTms } from "@/lib/tms/store";
import { ExecutionStatus, EXECUTION_STATUS_LABELS } from "@/types/domain";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Tata Electronics TMS" },
      { name: "description", content: "Execution status, quality by module and tester productivity, derived from live data." },
      { property: "og:title", content: "Reports — Tata Electronics TMS" },
      { property: "og:description", content: "Testing health analytics across active programmes." },
    ],
  }),
  component: ReportsPage,
});

const TONES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function ReportsPage() {
  const { state } = useTms();

  const statusData = Object.values(ExecutionStatus)
    .map((s) => ({
      name: EXECUTION_STATUS_LABELS[s],
      value: state.executions.filter((e) => e.status === s).length,
    }))
    .filter((d) => d.value > 0);

  const outcomeData = (["passed", "failed", "blocked", "skipped"] as const).map((s) => ({
    name: s,
    value: state.stepResults.filter((r) => r.status === s).length,
  }));

  const moduleData = state.modules.map((m) => {
    const caseIds = state.testCases.filter((t) => t.moduleId === m.id).map((t) => t.id);
    const rs = state.stepResults.filter((r) => {
      const ex = state.executions.find((e) => e.id === r.executionId);
      return ex && caseIds.includes(ex.testCaseId);
    });
    const passed = rs.filter((r) => r.status === "passed").length;
    const measured = rs.filter((r) => r.status !== "not_started").length;
    return { name: m.name, passRate: measured ? Math.round((passed / measured) * 100) : 0 };
  });

  const testerData = state.users
    .filter((u) => u.role === "tester")
    .map((u) => ({
      name: u.name.split(" ")[0] ?? u.name,
      completed: state.executions.filter((e) => e.testerId === u.id && e.status === ExecutionStatus.COMPLETED).length,
      active: state.executions.filter(
        (e) => e.testerId === u.id && e.status !== ExecutionStatus.COMPLETED,
      ).length,
    }));

  return (
    <AppShell title="Reports" description="Every figure is computed from current execution records.">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Execution status distribution</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
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
          <h2 className="text-sm font-semibold">Step outcomes</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="value" fill="var(--chart-1)" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Pass rate by module</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moduleData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={110} />
                <Tooltip cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="passRate" fill="var(--chart-2)" radius={3} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Tester productivity</h2>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={testerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="completed" stackId="a" fill="var(--chart-2)" radius={[0, 0, 3, 3]} />
                <Bar dataKey="active" stackId="a" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
