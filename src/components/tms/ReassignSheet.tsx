import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTms } from "@/lib/tms/store";
import { currentUser, reassignAssignment, unitById, userById } from "@/lib/tms/services";
import { ExecutionStatus, type Assignment, type Execution } from "@/types/domain";

export function ReassignSheet({
  assignment,
  execution,
  trigger,
}: {
  assignment: Assignment;
  execution: Execution | undefined;
  trigger: React.ReactNode;
}) {
  const { state, run } = useTms();
  const [open, setOpen] = useState(false);
  const [newTesterId, setNewTesterId] = useState("");
  const [reason, setReason] = useState("");

  const currentTester = userById(state, assignment.testerId);
  const unit = unitById(state, assignment.unitId);
  const testers = state.users.filter(
    (u) => u.role === "tester" && u.active && u.id !== assignment.testerId,
  );
  const locked =
    !!execution && [ExecutionStatus.APPROVED, ExecutionStatus.COMPLETED].includes(execution.status);

  const reset = () => {
    setNewTesterId("");
    setReason("");
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Reassign test</SheetTitle>
          <SheetDescription>
            {unit?.usn ?? "This unit"} moves to a different tester. Recorded results and audit
            history stay exactly as they are.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-4">
          <div>
            <p className="label-caps">Current tester</p>
            <p className="mt-1.5 text-sm font-medium">{currentTester?.name ?? "Unknown"}</p>
          </div>

          {locked ? (
            <p className="rounded-sm border border-border bg-muted p-3 text-sm text-muted-foreground">
              This execution is already approved or completed and can no longer be reassigned.
            </p>
          ) : (
            <>
              <div>
                <Label htmlFor="new-tester">New tester</Label>
                <Select value={newTesterId} onValueChange={setNewTesterId}>
                  <SelectTrigger id="new-tester" className="mt-1.5">
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
              <div>
                <Label htmlFor="reassign-reason">Reason</Label>
                <Textarea
                  id="reassign-reason"
                  className="mt-1.5"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why is this being reassigned?"
                />
              </div>
            </>
          )}
        </div>
        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          {!locked && (
            <Button
              disabled={!newTesterId || reason.trim().length < 5}
              onClick={() => {
                const ok = run(
                  (s) => reassignAssignment(s, currentUser(s)!, assignment.id, newTesterId, reason),
                  { success: "Assignment reassigned." },
                );
                if (ok) setOpen(false);
              }}
            >
              Reassign
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
