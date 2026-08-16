import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { LayoutTemplate, Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/tms/AppShell";
import { EmptyState } from "@/components/tms/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTms } from "@/lib/tms/store";
import { createTemplate, currentUser } from "@/lib/tms/services";
import { canManageTemplates } from "@/lib/tms/permissions";
import { TEMPLATE_STATUS_LABELS } from "@/types/domain";

export const Route = createFileRoute("/templates/")({
  head: () => ({
    meta: [
      { title: "Templates — Pibythree Quality Hub" },
      {
        name: "description",
        content:
          "Template families and their revisions — the source of every check on the shop floor.",
      },
    ],
  }),
  component: TemplatesPage,
});

function TemplatesPage() {
  const { state, run } = useTms();
  const user = currentUser(state);
  const [open, setOpen] = useState(false);
  const [familyCode, setFamilyCode] = useState("");
  const [name, setName] = useState("");
  const manage = !!user && canManageTemplates(user);

  const families = new Map<string, typeof state.templates>();
  for (const t of state.templates) {
    families.set(t.familyCode, [...(families.get(t.familyCode) ?? []), t]);
  }

  return (
    <AppShell
      title="Templates"
      description="Every revision is immutable once it leaves draft — history never drifts."
      actions={
        manage ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" /> New template family
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a template family</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="familyCode">Family code</Label>
                  <Input
                    id="familyCode"
                    className="mt-1.5"
                    value={familyCode}
                    onChange={(e) => setFamilyCode(e.target.value)}
                    placeholder="e.g. OJAS-EQT"
                  />
                </div>
                <div>
                  <Label htmlFor="templateName">Name</Label>
                  <Input
                    id="templateName"
                    className="mt-1.5"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. OJAS EQT Functional Test"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  disabled={!familyCode.trim() || !name.trim()}
                  onClick={() => {
                    const ok = run((s) => createTemplate(s, user!, { familyCode, name }), {
                      success: "Template family created as a draft.",
                    });
                    if (ok) {
                      setOpen(false);
                      setFamilyCode("");
                      setName("");
                    }
                  }}
                >
                  Create draft
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : undefined
      }
    >
      {families.size === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No template families yet"
          description="Create one to start authoring categories and checks."
        />
      ) : (
        <div className="space-y-5">
          {[...families.entries()].map(([code, revisions]) => {
            const sorted = [...revisions].sort((a, b) => b.revision - a.revision);
            return (
              <section
                key={code}
                className="overflow-hidden rounded-lg border border-border bg-surface"
              >
                <header className="border-b border-border px-4 py-2.5">
                  <h2 className="text-sm font-semibold">
                    {code} · {sorted[0]?.name}
                  </h2>
                </header>
                <ul className="divide-y divide-border">
                  {sorted.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                      <span className="mono-id text-primary">Rev {t.revision}</span>
                      <span className="label-caps">{TEMPLATE_STATUS_LABELS[t.status]}</span>
                      <span className="text-xs text-muted-foreground">
                        {t.totalChecks} checks · {t.mandatoryChecks} mandatory
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        Updated {format(new Date(t.updatedAt), "dd MMM yyyy")}
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/templates/$templateId" params={{ templateId: t.id }}>
                          Open
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
