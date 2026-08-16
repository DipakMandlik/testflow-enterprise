import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { AppShell } from "@/components/tms/AppShell";
import { PriorityBadge, StatusBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import { useTms } from "@/lib/tms/store";
import {
  currentUser,
  environmentById,
  moduleById,
  projectById,
  stepsFor,
  testCaseById,
  userById,
} from "@/lib/tms/services";

export const Route = createFileRoute("/tests/$testCaseId")({
  head: () => ({
    meta: [
      { title: "Test Case — Tata Electronics TMS" },
      { name: "description", content: "Test case definition, steps, history and previous executions." },
      { property: "og:title", content: "Test Case — Tata Electronics TMS" },
      { property: "og:description", content: "Full definition and execution history for a test case." },
    ],
  }),
  component: TestCasePage,
});

function TestCasePage() {
  const { testCaseId } = Route.useParams();
  const { state } = useTms();
  const user = currentUser(state);
  const testCase = testCaseById(state, testCaseId);

  if (!testCase) {
    return (
      <AppShell title="Test case not found" description="This test case no longer exists.">
        <Button asChild variant="outline">
          <Link to="/my-tests">Back to my tests</Link>
        </Button>
      </AppShell>
    );
  }

  const steps = stepsFor(state, testCase.id);
  const executions = state.executions.filter((e) => e.testCaseId === testCase.id);

  return (
    <AppShell
      title={`${testCase.code} · ${testCase.title}`}
      description={testCase.description}
      actions={<PriorityBadge priority={testCase.priority} />}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <section className="rounded-lg border border-border bg-surface">
            <header className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">Steps ({steps.length})</h2>
            </header>
            <ol className="divide-y divide-border">
              {steps.map((s) => (
                <li key={s.id} className="grid gap-2 px-4 py-3 md:grid-cols-[2rem_1fr_1fr]">
                  <span className="mono-id text-muted-foreground">{s.index}</span>
                  <p className="text-sm">{s.action}</p>
                  <p className="text-sm text-muted-foreground">{s.expected}</p>
                </li>
              ))}
            </ol>
          </section>

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
                  This test case has not been executed yet.
                </li>
              )}
            </ul>
          </section>
        </div>

        <aside className="space-y-4 rounded-lg border border-border bg-surface p-4 text-sm">
          <div>
            <p className="label-caps">Project</p>
            <p>{projectById(state, testCase.projectId)?.name}</p>
          </div>
          <div>
            <p className="label-caps">Module</p>
            <p>{moduleById(state, testCase.moduleId)?.name}</p>
          </div>
          <div>
            <p className="label-caps">Environment</p>
            <p>{environmentById(state, testCase.environmentId)?.name}</p>
          </div>
          <div>
            <p className="label-caps">Version</p>
            <p className="mono-id">{testCase.version}</p>
          </div>
          <div>
            <p className="label-caps">Preconditions</p>
            <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
              {testCase.preconditions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="label-caps">Test data</p>
            <p className="text-muted-foreground">{testCase.testData}</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
