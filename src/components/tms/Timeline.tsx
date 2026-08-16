import { formatDistanceToNow } from "date-fns";
import type { AppState, AuditEvent } from "@/types/domain";
import { userById } from "@/lib/tms/services";

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "signed in",
  "location.verified": "verified their location",
  "station.verified": "verified their station",
  "assignment.created": "created an assignment",
  "assignment.reassigned": "reassigned an assignment",
  "execution.started": "started the execution",
  "execution.retest_started": "resumed the execution for retest",
  "execution.submitted": "submitted for verification",
  "execution.resubmitted": "resubmitted after retest",
  "execution.completed": "marked the execution completed",
  "check.result_changed": "recorded a check outcome",
  "evidence.uploaded": "uploaded evidence",
  "evidence.removed": "removed evidence",
  "review.approved": "approved the execution",
  "review.rejected": "rejected the execution",
  "review.retest_requested": "requested a retest",
  "user.created": "created a user",
  "user.activated": "activated a user",
  "user.deactivated": "deactivated a user",
  "user.role_changed": "changed a user role",
  "plant.created": "created a plant",
  "location.created": "created a location",
  "station.created": "created a station",
  "station.status_changed": "changed a station status",
  "device.created": "registered a device",
  "device.status_changed": "changed a device status",
  "unit.created": "registered a unit",
  "failure_category.created": "added a failure category",
  "template.created": "created a template",
  "template.revision_created": "created a template revision",
  "template.published": "published a template",
  "template.archived": "archived a template",
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
