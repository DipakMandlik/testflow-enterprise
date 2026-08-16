import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/tms/AppShell";
import { useTms } from "@/lib/tms/store";
import { ActivityTimeline } from "@/components/tms/Timeline";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Tata Electronics TMS" },
      { name: "description", content: "Users, projects, modules, environments and the platform audit trail." },
      { property: "og:title", content: "Administration — Tata Electronics TMS" },
      { property: "og:description", content: "Master data and audit oversight for the test platform." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { state } = useTms();

  return (
    <AppShell title="Administration" description="Master data and full platform audit trail.">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Users ({state.users.length})</h2>
          </header>
          <ul className="divide-y divide-border">
            {state.users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                <span className="label-caps">{u.role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Projects ({state.projects.length})</h2>
          </header>
          <ul className="divide-y divide-border">
            {state.projects.map((p) => (
              <li key={p.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="mono-id text-primary">{p.code}</span>
                  <span>{p.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {state.modules.filter((m) => m.projectId === p.id).length} modules ·{" "}
                  {state.testCases.filter((t) => t.projectId === p.id).length} test cases
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Environments</h2>
          </header>
          <ul className="divide-y divide-border">
            {state.environments.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span>{e.name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface">
          <header className="border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">Platform audit trail</h2>
          </header>
          <div className="max-h-96 overflow-y-auto p-4">
            <ActivityTimeline state={state} events={[...state.audit].slice(-40).reverse()} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
