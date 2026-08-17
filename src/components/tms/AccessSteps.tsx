import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AccessStepState = "done" | "current" | "upcoming";

export function AccessSteps({ steps }: { steps: { label: string; state: AccessStepState }[] }) {
  return (
    <ol className="flex items-center justify-center gap-1.5">
      {steps.map((step, i) => (
        <li key={step.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
              step.state === "done" && "bg-success/10 text-success",
              step.state === "current" && "bg-primary/10 text-primary",
              step.state === "upcoming" && "text-muted-foreground",
            )}
          >
            {step.state === "done" ? (
              <CheckCircle2 className="size-3" aria-hidden />
            ) : (
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  step.state === "current" ? "bg-primary" : "bg-border",
                )}
                aria-hidden
              />
            )}
            {step.label}
          </span>
          {i < steps.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
        </li>
      ))}
    </ol>
  );
}
