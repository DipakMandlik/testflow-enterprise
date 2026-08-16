import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AppShell } from "@/components/tms/AppShell";
import { StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { useTms } from "@/lib/tms/store";
import {
  categoriesFor,
  checksForCategory,
  currentUser,
  stationById,
  templateById,
  unitById,
  userById,
} from "@/lib/tms/services";
import { TEMPLATE_STATUS_LABELS } from "@/types/domain";

export const Route = createFileRoute("/units/$unitId")({
  head: () => ({
    meta: [
      { title: "Unit — Pibythree Quality Hub" },
      { name: "description", content: "Unit definition, template checks and execution history." },
    ],
  }),
  component: UnitPage,
});

function UnitPage() {
  const { unitId } = Route.useParams();
  const { state } = useTms();
  const user = currentUser(state);
  const unit = unitById(state, unitId);

  if (!unit) {
    return (
      <AppShell title="Unit not found" description="This unit no longer exists.">
        <Button asChild variant="outline">
          <Link to="/my-tests">Back to my tests</Link>
        </Button>
      </AppShell>
    );
  }

  const executions = state.executions.filter((e) => e.unitId === unit.id);
  const latestTemplateId = executions[0]?.templateId;
  const template = latestTemplateId ? templateById(state, latestTemplateId) : undefined;
  const categories = template ? categoriesFor(state, template.id) : [];

  return (
    <AppShell
      title={unit.usn}
      description={template ? `${template.name} Rev ${template.revision}` : unit.familyCode}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          {template && (
            <section className="rounded-lg border border-border bg-surface">
              <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-sm font-semibold">Template checks ({template.totalChecks})</h2>
                <span className="label-caps">{TEMPLATE_STATUS_LABELS[template.status]}</span>
              </header>
              <div className="divide-y divide-border">
                {categories.map((cat) => (
                  <div key={cat.id} className="px-4 py-3">
                    <p className="label-caps mb-2">{cat.name}</p>
                    <ol className="space-y-2">
                      {checksForCategory(state, cat.id).map((check) => (
                        <li
                          key={check.id}
                          className="grid gap-1 md:grid-cols-[6rem_1fr_1fr] md:gap-2"
                        >
                          <span className="mono-id text-muted-foreground">{check.checkCode}</span>
                          <p className="text-sm">{check.title}</p>
                          <p className="text-sm text-muted-foreground">{check.expectedResult}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface">
            <header className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">Execution history</h2>
            </header>
            <ul className="divide-y divide-border">
              {executions.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="mono-id text-primary">{e.code}</span>
                  <span className="text-muted-foreground">{userById(state, e.testerId)?.name}</span>
                  <StatusBadge status={e.status} {...(user ? { role: user.role } : {})} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {format(new Date(e.updatedAt), "dd MMM yyyy HH:mm")}
                  </span>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/executions/$executionId" params={{ executionId: e.id }}>
                      Open
                    </Link>
                  </Button>
                </li>
              ))}
              {!executions.length && (
                <li className="px-4 py-6 text-sm text-muted-foreground">
                  This unit has not been executed yet.
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 rounded-lg border border-border bg-surface p-4 text-sm">
          <div>
            <p className="label-caps">USN</p>
            <p className="mono-id">{unit.usn}</p>
          </div>
          <div>
            <p className="label-caps">Product family</p>
            <p>{unit.familyCode}</p>
          </div>
          {template && (
            <div>
              <p className="label-caps">Template</p>
              <p>
                {template.name} Rev {template.revision}
              </p>
            </div>
          )}
          {executions[0] && (
            <div>
              <p className="label-caps">Current station</p>
              <p>{stationById(state, executions[0].stationId)?.code}</p>
            </div>
          )}
          <div>
            <p className="label-caps">Registered</p>
            <p className="text-muted-foreground">
              {format(new Date(unit.createdAt), "dd MMM yyyy")}
            </p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
