import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { PriorityBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTms } from "@/lib/tms/store";
import {
  currentUser,
  createAssignment,
  createProject,
  createTestCase,
  createUser,
  setUserActive,
  setUserRole,
} from "@/lib/tms/services";
import {
  canManageAssignments,
  canManageProjects,
  canManageTestCases,
  canManageUsers,
} from "@/lib/tms/permissions";
import type { Priority, Role } from "@/types/domain";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Tata Electronics TMS" },
      {
        name: "description",
        content: "Users, projects, test cases, assignments and the platform audit trail.",
      },
      { property: "og:title", content: "Administration — Tata Electronics TMS" },
      {
        property: "og:description",
        content: "Master data and audit oversight for the test platform.",
      },
    ],
  }),
  component: AdminPage,
});

const ROLES: Role[] = ["tester", "reviewer", "manager", "admin"];
const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

function NewUserDialog() {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("tester");

  const reset = () => {
    setEmployeeId("");
    setName("");
    setEmail("");
    setRole("tester");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a user</DialogTitle>
          <DialogDescription>
            Adds a new employee account to the platform directory.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-id">Employee ID</Label>
            <Input
              id="new-user-id"
              placeholder="TE-1010"
              className="mono-id"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input id="new-user-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!employeeId.trim() || !name.trim() || !email.trim()}
            onClick={() => {
              const ok = run(
                (s) => createUser(s, currentUser(s)!, { employeeId, name, email, role }),
                {
                  success: "User created.",
                },
              );
              if (ok) {
                setOpen(false);
                reset();
              }
            }}
          >
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersSection() {
  const { state, run } = useTms();
  const admin = canManageUsers(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Users ({state.users.length})</h2>
        {admin && <NewUserDialog />}
      </header>
      <ul className="divide-y divide-border">
        {state.users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="mono-id">{u.employeeId}</span> · {u.email}
              </p>
            </div>
            {admin ? (
              <Select
                value={u.role}
                onValueChange={(v) => run((s) => setUserRole(s, currentUser(s)!, u.id, v as Role))}
              >
                <SelectTrigger className="h-8 w-32 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="label-caps">{u.role}</span>
            )}
            {admin ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={u.active}
                  onCheckedChange={(checked) =>
                    run((s) => setUserActive(s, currentUser(s)!, u.id, checked))
                  }
                  aria-label={`${u.active ? "Deactivate" : "Activate"} ${u.name}`}
                />
                {u.active ? "Active" : "Inactive"}
              </label>
            ) : (
              <span className="text-xs text-muted-foreground">
                {u.active ? "Active" : "Inactive"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewProjectDialog() {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a project</DialogTitle>
          <DialogDescription>
            Projects group modules, environments and test cases.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-proj-code">Project code</Label>
            <Input
              id="new-proj-code"
              placeholder="EMC-VAL"
              className="mono-id"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-proj-name">Name</Label>
            <Input id="new-proj-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-proj-desc">Description</Label>
            <Textarea
              id="new-proj-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!code.trim() || !name.trim()}
            onClick={() => {
              const ok = run(
                (s) => createProject(s, currentUser(s)!, { code, name, description }),
                {
                  success: "Project created.",
                },
              );
              if (ok) {
                setOpen(false);
                setCode("");
                setName("");
                setDescription("");
              }
            }}
          >
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectsSection() {
  const { state } = useTms();
  const admin = canManageProjects(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Projects ({state.projects.length})</h2>
        {admin && <NewProjectDialog />}
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
  );
}

interface StepDraft {
  action: string;
  expected: string;
}

function NewTestCaseDialog() {
  const { state, run } = useTms();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState(state.projects[0]?.id ?? "");
  const [moduleId, setModuleId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [steps, setSteps] = useState<StepDraft[]>([{ action: "", expected: "" }]);

  const modules = state.modules.filter((m) => m.projectId === projectId);
  const environments = state.environments.filter((e) => e.projectId === projectId);
  const validSteps = steps.filter((s) => s.action.trim() && s.expected.trim());

  const reset = () => {
    setCode("");
    setTitle("");
    setDescription("");
    setModuleId("");
    setEnvironmentId("");
    setPriority("medium");
    setSteps([{ action: "", expected: "" }]);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New test case
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a test case</DialogTitle>
          <DialogDescription>
            Define the case and its steps. Steps can be refined later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tc-code">Test case ID</Label>
              <Input
                id="tc-code"
                placeholder="TC-PWR-020"
                className="mono-id"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tc-title">Title</Label>
              <Input id="tc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tc-desc">Description</Label>
            <Textarea
              id="tc-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select
                value={projectId}
                onValueChange={(v) => {
                  setProjectId(v);
                  setModuleId("");
                  setEnvironmentId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Module</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={environmentId} onValueChange={setEnvironmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an environment" />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <Label>Steps ({validSteps.length} ready)</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSteps((s) => [...s, { action: "", expected: "" }])}
              >
                <Plus className="size-3.5" /> Add step
              </Button>
            </div>
            {steps.map((step, i) => (
              <div
                key={i}
                className="grid gap-2 rounded-sm border border-border p-2 sm:grid-cols-[1fr_1fr_auto]"
              >
                <Textarea
                  placeholder={`Step ${i + 1} action`}
                  rows={2}
                  value={step.action}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s, idx) => (idx === i ? { ...s, action: e.target.value } : s)),
                    )
                  }
                />
                <Textarea
                  placeholder="Expected result"
                  rows={2}
                  value={step.expected}
                  onChange={(e) =>
                    setSteps((prev) =>
                      prev.map((s, idx) => (idx === i ? { ...s, expected: e.target.value } : s)),
                    )
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={steps.length === 1}
                  onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label={`Remove step ${i + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={
              !code.trim() || !title.trim() || !moduleId || !environmentId || !validSteps.length
            }
            onClick={() => {
              const ok = run(
                (s) =>
                  createTestCase(s, currentUser(s)!, {
                    code,
                    title,
                    description,
                    projectId,
                    moduleId,
                    environmentId,
                    priority,
                    steps: validSteps,
                  }),
                { success: "Test case created." },
              );
              if (ok) {
                setOpen(false);
                reset();
              }
            }}
          >
            Create test case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TestCasesSection() {
  const { state } = useTms();
  const canManage = canManageTestCases(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Test cases ({state.testCases.length})</h2>
        {canManage && <NewTestCaseDialog />}
      </header>
      <ul className="divide-y divide-border">
        {state.testCases.map((tc) => (
          <li key={tc.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="mono-id text-primary">{tc.code}</span>
            <span className="min-w-0 flex-1 truncate">{tc.title}</span>
            <PriorityBadge priority={tc.priority} />
            <span className="text-xs text-muted-foreground">v{tc.version}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewAssignmentDialog() {
  const { state, run } = useTms();
  const [open, setOpen] = useState(false);
  const [testCaseId, setTestCaseId] = useState("");
  const [testerId, setTesterId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const testers = state.users.filter((u) => u.role === "tester" && u.active);

  const reset = () => {
    setTestCaseId("");
    setTesterId("");
    setDueAt("");
    setPriority("medium");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New assignment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a test case</DialogTitle>
          <DialogDescription>
            Creates the assignment and its execution, and notifies the tester.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Test case</Label>
            <Select value={testCaseId} onValueChange={setTestCaseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a test case" />
              </SelectTrigger>
              <SelectContent>
                {state.testCases.map((tc) => (
                  <SelectItem key={tc.id} value={tc.id}>
                    {tc.code} · {tc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tester</Label>
            <Select value={testerId} onValueChange={setTesterId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tester" />
              </SelectTrigger>
              <SelectContent>
                {testers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.employeeId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">Due date</Label>
              <Input
                id="assign-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!testCaseId || !testerId || !dueAt}
            onClick={() => {
              const ok = run(
                (s) =>
                  createAssignment(s, currentUser(s)!, {
                    testCaseId,
                    testerId,
                    dueAt: new Date(dueAt).toISOString(),
                    priority,
                  }),
                { success: "Assignment created." },
              );
              if (ok) {
                setOpen(false);
                reset();
              }
            }}
          >
            Create assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentsSection() {
  const { state } = useTms();
  const canManage = canManageAssignments(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Assignments ({state.assignments.length})</h2>
        {canManage && <NewAssignmentDialog />}
      </header>
      <ul className="divide-y divide-border">
        {[...state.assignments].reverse().map((a) => {
          const tc = state.testCases.find((t) => t.id === a.testCaseId);
          const tester = state.users.find((u) => u.id === a.testerId);
          return (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="mono-id text-primary">{tc?.code}</span>
              <span className="min-w-0 flex-1 truncate">{tester?.name}</span>
              <PriorityBadge priority={a.priority} />
              <span className="text-xs text-muted-foreground">
                due {new Date(a.dueAt).toLocaleDateString()}
              </span>
            </li>
          );
        })}
        {!state.assignments.length && (
          <li className="px-4 py-6 text-sm text-muted-foreground">No assignments yet.</li>
        )}
      </ul>
    </section>
  );
}

function AdminPage() {
  const { state } = useTms();
  const user = currentUser(state)!;

  return (
    <AppShell
      title="Administration"
      description="Manage users, projects, test cases, assignments and the audit trail."
    >
      <Tabs defaultValue="users">
        <TabsList>
          {canManageUsers(user) && <TabsTrigger value="users">Users</TabsTrigger>}
          {canManageProjects(user) && <TabsTrigger value="projects">Projects</TabsTrigger>}
          {canManageTestCases(user) && <TabsTrigger value="test-cases">Test cases</TabsTrigger>}
          {canManageAssignments(user) && <TabsTrigger value="assignments">Assignments</TabsTrigger>}
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        {canManageUsers(user) && (
          <TabsContent value="users">
            <UsersSection />
          </TabsContent>
        )}
        {canManageProjects(user) && (
          <TabsContent value="projects">
            <ProjectsSection />
          </TabsContent>
        )}
        {canManageTestCases(user) && (
          <TabsContent value="test-cases">
            <TestCasesSection />
          </TabsContent>
        )}
        {canManageAssignments(user) && (
          <TabsContent value="assignments">
            <AssignmentsSection />
          </TabsContent>
        )}
        <TabsContent value="audit">
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">Platform audit trail</h2>
            </header>
            <div className="max-h-96 overflow-y-auto p-4">
              <ActivityTimeline state={state} events={[...state.audit].slice(-40).reverse()} />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
