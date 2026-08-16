import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useTms } from "@/lib/tms/store";
import { currentUser, userById, verifyOtp } from "@/lib/tms/services";

export const Route = createFileRoute("/otp")({
  head: () => ({
    meta: [
      { title: "Verify your code — Tata Electronics TMS" },
      {
        name: "description",
        content: "Enter the one-time verification code sent to your registered device.",
      },
      { property: "og:title", content: "Verify your code — Tata Electronics TMS" },
      { property: "og:description", content: "Two-step verification for platform sign-in." },
    ],
  }),
  component: OtpPage,
});

function OtpPage() {
  const { state, ready, run } = useTms();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  const pending = state.pendingLoginUserId ? userById(state, state.pendingLoginUserId) : null;

  useEffect(() => {
    if (!ready) return;
    if (currentUser(state)) void navigate({ to: "/dashboard", replace: true });
    else if (!state.pendingLoginUserId) void navigate({ to: "/", replace: true });
  }, [ready, state, navigate]);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const submit = async (value: string) => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 300));
    const okResult = run(() => {
      if (secondsLeft === 0)
        return { ok: false as const, error: "This code expired. Request a new one." };
      return verifyOtp(state, value);
    });
    setVerifying(false);
    if (okResult) void navigate({ to: "/dashboard", replace: true });
    else setCode("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-sm border border-border bg-surface">
          <KeyRound className="size-5 text-primary" aria-hidden />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Two-step verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the six-digit code sent to the device registered to{" "}
          <span className="mono-id">{pending?.employeeId ?? "your account"}</span>.
        </p>

        <form
          className="mt-7 flex flex-col items-center gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(code);
          }}
        >
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(value) => {
              setCode(value);
              if (value.length === 6) void submit(value);
            }}
            autoFocus
            aria-label="Verification code"
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <p className="text-xs text-muted-foreground" role="status">
            {secondsLeft > 0
              ? `Code expires in ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`
              : "Code expired."}
          </p>

          <Button type="submit" className="w-full" disabled={code.length !== 6 || verifying}>
            {verifying ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Verify and continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSecondsLeft(120);
              setCode("");
            }}
          >
            Resend code
          </Button>
        </form>
      </div>
    </div>
  );
}
