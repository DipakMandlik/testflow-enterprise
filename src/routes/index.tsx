import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ShieldCheck, LoaderCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTms } from "@/lib/tms/store";
import { currentUser, login, DEMO_PASSWORD } from "@/lib/tms/services";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Pibythree Quality Hub" },
      {
        name: "description",
        content: "Sign in with your employee ID to access assigned units, executions and reviews.",
      },
      { property: "og:title", content: "Sign in — Pibythree Quality Hub" },
      {
        property: "og:description",
        content: "Secure employee sign-in for the Pibythree digital quality inspection platform.",
      },
    ],
  }),
  component: LoginPage,
});

const loginSchema = z.object({
  employeeId: z
    .string()
    .min(3, "Enter your employee ID")
    .regex(/^TE-\d{4}$/i, "Employee IDs look like TE-1001"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const DEMO_ACCOUNTS = [
  { id: "TE-1001", name: "Priya Sharma", role: "Tester" },
  { id: "TE-2001", name: "Rajesh Kumar", role: "Quality Checker" },
  { id: "TE-3001", name: "Anita Desai", role: "Manager" },
  { id: "TE-4001", name: "Arjun Nair", role: "Senior Manager" },
  { id: "TE-5001", name: "Kavya Menon", role: "Template Manager" },
  { id: "TE-9001", name: "Admin User", role: "Administrator" },
];

function LoginPage() {
  const { state, ready, run } = useTms();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { employeeId: "", password: "" },
  });

  useEffect(() => {
    if (ready && currentUser(state)) void navigate({ to: "/dashboard", replace: true });
  }, [ready, state, navigate]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 350));
    const okResult = run((s) => login(s, values.employeeId, values.password));
    setSubmitting(false);
    if (okResult) void navigate({ to: "/otp" });
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between border-r border-border bg-surface p-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-sm bg-primary text-primary-foreground font-bold">
            π3
          </div>
          <div>
            <p className="font-semibold">Pibythree Quality Hub</p>
            <p className="text-xs text-muted-foreground">Digital Quality Inspection</p>
          </div>
        </div>
        <div className="max-w-lg">
          <h2 className="text-3xl font-semibold leading-tight">
            Every quality check, tracked from first inspection to final approval.
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Guided check execution, failure capture, evidence and a complete audit trail — replacing
            the Excel checklist with a structured digital quality worksheet across the EQT
            functional test programme.
          </p>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
            {[
              ["Template families", "1"],
              ["Quality checks", "17"],
              ["Traceable events", "Every transition"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="label-caps">{label}</dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs text-muted-foreground">
          Authorised personnel only. All sign-in attempts are logged.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your employee ID. A one-time code follows.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                placeholder="TE-1001"
                autoComplete="username"
                className="mono-id"
                aria-invalid={!!form.formState.errors.employeeId}
                {...form.register("employeeId")}
              />
              {form.formState.errors.employeeId && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.employeeId.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!form.formState.errors.password}
                {...form.register("password")}
              />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Verifying credentials
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Continue
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 rounded-sm border border-border bg-surface p-3">
            <p className="label-caps">Demo accounts</p>
            <ul className="mt-2 space-y-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <li key={acc.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      form.setValue("employeeId", acc.id);
                      form.setValue("password", DEMO_PASSWORD);
                    }}
                  >
                    <span>
                      <span className="mono-id text-primary">{acc.id}</span>{" "}
                      <span className="text-muted-foreground">{acc.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{acc.role}</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              Password <span className="mono-id">{DEMO_PASSWORD}</span> · OTP{" "}
              <span className="mono-id">123456</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
