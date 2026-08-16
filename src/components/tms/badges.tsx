import { cn } from "@/lib/utils";
import {
  CHECK_STATUS_LABELS,
  ExecutionStatus,
  statusLabel,
  type CheckStatus,
  type Priority,
  type Role,
} from "@/types/domain";

const base =
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap";

const EXECUTION_TONE: Record<ExecutionStatus, string> = {
  [ExecutionStatus.ASSIGNED]: "border-border bg-muted text-muted-foreground",
  [ExecutionStatus.IN_PROGRESS]: "border-info/40 bg-info/15 text-info",
  [ExecutionStatus.PENDING_REVIEW]: "border-primary/40 bg-primary/15 text-primary",
  [ExecutionStatus.RETEST_REQUIRED]: "border-warning/40 bg-warning/15 text-warning",
  [ExecutionStatus.RETEST_IN_PROGRESS]: "border-warning/40 bg-warning/15 text-warning",
  [ExecutionStatus.APPROVED]: "border-success/40 bg-success/15 text-success",
  [ExecutionStatus.REJECTED]: "border-destructive/40 bg-destructive/15 text-destructive",
  [ExecutionStatus.COMPLETED]: "border-success/40 bg-success/15 text-success",
};

export function StatusBadge({
  status,
  role,
  className,
}: {
  status: ExecutionStatus;
  role?: Role | undefined;
  className?: string | undefined;
}) {
  return (
    <span className={cn(base, EXECUTION_TONE[status], className)} data-status={status}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status, role)}
    </span>
  );
}

const CHECK_TONE: Record<CheckStatus, string> = {
  not_started: "border-border bg-muted text-muted-foreground",
  in_progress: "border-info/40 bg-info/15 text-info",
  passed: "border-success/40 bg-success/15 text-success",
  failed: "border-destructive/40 bg-destructive/15 text-destructive",
  na: "border-border bg-muted text-muted-foreground",
  retest_required: "border-warning/40 bg-warning/15 text-warning",
  retest_in_progress: "border-warning/40 bg-warning/15 text-warning",
  retest_passed: "border-success/40 bg-success/15 text-success",
  retest_failed: "border-destructive/40 bg-destructive/15 text-destructive",
};

export function CheckStatusBadge({
  status,
  className,
}: {
  status: CheckStatus;
  className?: string;
}) {
  return (
    <span className={cn(base, CHECK_TONE[status], className)}>{CHECK_STATUS_LABELS[status]}</span>
  );
}

const PRIORITY_TONE: Record<Priority, string> = {
  critical: "border-destructive/50 text-destructive",
  high: "border-warning/50 text-warning",
  medium: "border-info/50 text-info",
  low: "border-border text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn(base, "bg-transparent capitalize", PRIORITY_TONE[priority])}>
      {priority}
    </span>
  );
}
