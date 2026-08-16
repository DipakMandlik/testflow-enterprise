import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { EmptyState } from "@/components/tms/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTms } from "@/lib/tms/store";
import {
  assignmentById,
  currentUser,
  executionProgress,
  stationById,
  templateById,
  unitById,
} from "@/lib/tms/services";
import { ExecutionStatus } from "@/types/domain";

export const Route = createFileRoute("/my-tests")({
  head: () => ({
    meta: [
      { title: "My Tests — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Filter, sort and act on every unit assigned to you across active stations.",
      },
    ],
  }),
  component: MyTestsPage,
});

const ACTION_BY_STATUS: Partial<Record<ExecutionStatus, string>> = {
  [ExecutionStatus.ASSIGNED]: "Start",
  [ExecutionStatus.IN_PROGRESS]: "Continue",
  [ExecutionStatus.RETEST_REQUIRED]: "Resume Retest",
  [ExecutionStatus.RETEST_IN_PROGRESS]: "Continue Retest",
};

function MyTestsPage() {
  const { state } = useTms();
  const user = currentUser(state);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [station, setStation] = useState("all");

  const rows = useMemo(() => {
    if (!user) return [];
    return state.executions
      .filter((e) => e.testerId === user.id)
      .map((e) => ({
        execution: e,
        unit: unitById(state, e.unitId)!,
        template: templateById(state, e.templateId)!,
        assignment: assignmentById(state, e.assignmentId),
      }))
      .filter(({ execution, unit, assignment }) => {
        if (!unit) return false;
        if (status !== "all" && execution.status !== status) return false;
        if (assignment && priority !== "all" && assignment.priority !== priority) return false;
        if (station !== "all" && execution.stationId !== station) return false;
        const q = query.trim().toLowerCase();
        if (!q) return true;
        return unit.usn.toLowerCase().includes(q) || execution.code.toLowerCase().includes(q);
      })
      .sort((a, b) => b.execution.updatedAt.localeCompare(a.execution.updatedAt));
  }, [state, user, query, status, priority, station]);

  return (
    <AppShell
      title="My Tests"
      description="Every unit assigned to you, with the next action for each."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by USN or execution ID"
          className="h-9 w-full sm:max-w-xs"
          aria-label="Search my tests"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-44" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.values(ExecutionStatus).map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-9 w-40" aria-label="Filter by priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {["critical", "high", "medium", "low"].map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={station} onValueChange={setStation}>
          <SelectTrigger className="h-9 w-48" aria-label="Filter by station">
            <SelectValue placeholder="Station" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stations</SelectItem>
            {state.stations.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code} — {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No tests match these filters"
            description="Adjust the filters above, or clear the search to see your full assignment list."
          />
        ) : (
          // Three real columns at every width — no viewport-conditional hidden
          // columns — so the Action button can never be pushed off-screen or
          // clipped; secondary detail (station, progress, updated time) lives
          // as wrapping meta text inside the Unit cell instead.
          <table className="w-full table-fixed text-sm">
            <thead className="border-b border-border text-left">
              <tr className="label-caps">
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="w-28 px-4 py-2 font-medium sm:w-36">Status</th>
                <th className="w-24 px-3 py-2 text-right font-medium sm:w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ execution, unit, template, assignment }) => {
                const progress = executionProgress(state, execution);
                const stationRow = stationById(state, execution.stationId);
                return (
                  <tr key={execution.id} className="hover:bg-accent/40">
                    <td className="px-4 py-2.5 align-top">
                      <Link
                        to="/units/$unitId"
                        params={{ unitId: unit.id }}
                        className="mono-id text-primary hover:underline"
                      >
                        {unit.usn}
                      </Link>
                      <p className="truncate">
                        {template.name} Rev {template.revision}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {assignment && <PriorityBadge priority={assignment.priority} />}
                        <span className="mono-id">{execution.code}</span>
                        {stationRow && (
                          <span>
                            {stationRow.code} · {stationRow.name}
                          </span>
                        )}
                        <span className="tabular-nums">
                          {progress.completed}/{progress.total} checks
                        </span>
                        <span>{format(new Date(execution.updatedAt), "dd MMM, HH:mm")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      <StatusBadge status={execution.status} role={user?.role} />
                    </td>
                    <td className="px-3 py-2.5 text-right align-top">
                      <Button
                        asChild
                        size="sm"
                        variant={ACTION_BY_STATUS[execution.status] ? "default" : "outline"}
                      >
                        <Link to="/executions/$executionId" params={{ executionId: execution.id }}>
                          {ACTION_BY_STATUS[execution.status] ?? "View"}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
