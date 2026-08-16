import { formatDistanceToNow } from "date-fns";
import type { AppState, AuditEvent } from "@/types/domain";
import { userById } from "@/lib/tms/services";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "signed in",
  "assignment.created": "created an assignment",
  "execution.started": "started the execution",
  "execution.blocked": "blocked the execution",
  "execution.submitted": "submitted for review",
  "execution.resubmitted": "resubmitted after revision",
  "execution.revision_started": "reopened the execution for revision",
  "execution.completed": "marked the execution completed",
  "step.result_changed": "recorded a step outcome",
  "evidence.uploaded": "uploaded evidence",
  "evidence.removed": "removed evidence",
  "review.started": "started the review",
  "review.approved": "approved the execution",
  "review.revision_requested": "requested a revision",
  "user.created": "created a user",
  "user.activated": "activated a user",
  "user.deactivated": "deactivated a user",
  "user.role_changed": "changed a user role",
  "project.created": "created a project",
  "testcase.created": "created a test case",
};

export function ActivityTimeline({
  state,
  events,
  emptyLabel = "No recorded activity yet.",
}: {
  state: AppState;
  events: AuditEvent[];
  emptyLabel?: string;
}) {
  if (!events.length) {
    return <p className="px-1 py-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((event) => {
        const actor = userById(state, event.actorId);
        const details = Object.entries(event.metadata)
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ");
        return (
          <li key={event.id} className="relative">
            <span
              className="absolute -left-[1.44rem] top-1.5 size-2 rounded-full bg-primary"
              aria-hidden
            />
            <p className="text-sm">
              <span className="font-medium">{actor?.name ?? "System"}</span>{" "}
              <span className="text-muted-foreground">
                {ACTION_LABELS[event.action] ?? event.action}
              </span>
            </p>
            <p className="mono-id text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
              {details ? ` · ${details}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
