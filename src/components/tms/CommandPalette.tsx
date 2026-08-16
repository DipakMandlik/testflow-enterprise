import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useTms } from "@/lib/tms/store";
import { currentUser, templateById, unitById, userById } from "@/lib/tms/services";
import { canManageTemplates, canViewReview } from "@/lib/tms/permissions";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!user) return null;

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  const visibleExecutions = state.executions.filter(
    (e) => canViewReview(user) || e.testerId === user.id,
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search units, checks, testers, templates…" />
      <CommandList>
        <CommandEmpty>No matching records.</CommandEmpty>
        <CommandGroup heading="Units">
          {state.units.map((unit) => (
            <CommandItem
              key={unit.id}
              value={`${unit.usn} ${unit.familyCode}`}
              onSelect={() => go(`/units/${unit.id}`)}
            >
              <span className="mono-id text-primary">{unit.usn}</span>
              <span className="truncate">{unit.familyCode}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Executions">
          {visibleExecutions.map((ex) => {
            const unit = unitById(state, ex.unitId);
            const tester = userById(state, ex.testerId);
            return (
              <CommandItem
                key={ex.id}
                value={`${ex.code} ${unit?.usn ?? ""} ${tester?.name ?? ""} ${ex.status}`}
                onSelect={() =>
                  go(
                    canViewReview(user) && user.role !== "tester"
                      ? `/reviews/${ex.id}`
                      : `/executions/${ex.id}`,
                  )
                }
              >
                <span className="mono-id text-primary">{ex.code}</span>
                <span className="truncate">
                  {unit?.usn} · {tester?.name}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Checks">
          {state.templateChecks.map((check) => {
            const template = templateById(state, check.templateId);
            return (
              <CommandItem
                key={check.id}
                value={`${check.checkCode} ${check.title} ${template?.name ?? ""}`}
                onSelect={() => go(`/templates/${check.templateId}`)}
              >
                <span className="mono-id text-primary">{check.checkCode}</span>
                <span className="truncate">{check.title}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Navigate">
          <CommandItem value="dashboard" onSelect={() => go("/dashboard")}>
            Dashboard
          </CommandItem>
          <CommandItem value="my tests" onSelect={() => go("/my-tests")}>
            My Tests
          </CommandItem>
          <CommandItem value="reviews queue" onSelect={() => go("/reviews")}>
            Review Queue
          </CommandItem>
          <CommandItem value="reports analytics" onSelect={() => go("/reports")}>
            Reports
          </CommandItem>
          {canManageTemplates(user) && (
            <CommandItem value="templates" onSelect={() => go("/templates")}>
              Templates
            </CommandItem>
          )}
          <CommandItem value="administration" onSelect={() => go("/admin")}>
            Administration
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
