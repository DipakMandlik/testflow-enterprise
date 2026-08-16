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
import { currentUser, moduleById, projectById, userById } from "@/lib/tms/services";
import { canViewReview } from "@/lib/tms/permissions";

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
      <CommandInput placeholder="Search test cases, executions, testers, projects…" />
      <CommandList>
        <CommandEmpty>No matching records.</CommandEmpty>
        <CommandGroup heading="Test cases">
          {state.testCases.map((tc) => (
            <CommandItem
              key={tc.id}
              value={`${tc.code} ${tc.title} ${projectById(state, tc.projectId)?.name ?? ""} ${moduleById(state, tc.moduleId)?.name ?? ""}`}
              onSelect={() => go(`/tests/${tc.id}`)}
            >
              <span className="mono-id text-primary">{tc.code}</span>
              <span className="truncate">{tc.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Executions">
          {visibleExecutions.map((ex) => {
            const tc = state.testCases.find((t) => t.id === ex.testCaseId);
            const tester = userById(state, ex.testerId);
            return (
              <CommandItem
                key={ex.id}
                value={`${ex.code} ${tc?.code ?? ""} ${tc?.title ?? ""} ${tester?.name ?? ""} ${ex.status}`}
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
                  {tc?.code} · {tester?.name}
                </span>
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
          <CommandItem value="administration" onSelect={() => go("/admin")}>
            Administration
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
