import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, LoaderCircle, CheckCircle2, Navigation, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/tms/Logo";
import { AccessSteps } from "@/components/tms/AccessSteps";
import { cn } from "@/lib/utils";
import { useTms } from "@/lib/tms/store";
import {
  currentUser,
  locationById,
  plantById,
  stationsForLocation,
  verifyStation,
} from "@/lib/tms/services";

export const Route = createFileRoute("/verify-station")({
  head: () => ({
    meta: [{ title: "Verify Station — Pibythree Quality Hub" }],
  }),
  component: VerifyStationPage,
});

function VerifyStationPage() {
  const { state, ready, run } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);
  const [stationId, setStationId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) void navigate({ to: "/", replace: true });
    else if (user.role !== "tester") void navigate({ to: "/dashboard", replace: true });
    else if (!state.session?.locationVerifiedAt)
      void navigate({ to: "/verify-location", replace: true });
    else if (state.session?.stationVerifiedAt) void navigate({ to: "/dashboard", replace: true });
  }, [ready, user, state.session, navigate]);

  if (!user || !state.session?.plantId || !state.session.locationId) return null;
  const plant = plantById(state, state.session.plantId);
  const location = locationById(state, state.session.locationId);
  const stations = stationsForLocation(state, state.session.locationId);
  const deviceGeo = state.session.deviceGeo;

  const onVerify = async () => {
    if (!stationId) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 250));
    const okResult = run((s) => verifyStation(s, user, stationId), {
      success: "Station verified.",
    });
    setSubmitting(false);
    if (okResult) void navigate({ to: "/dashboard" });
  };

  return (
    <div className="auth-scene flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
          <Logo height={40} className="mx-auto" />

          <div className="mt-5">
            <AccessSteps
              steps={[
                { label: "Plant", state: "done" },
                { label: "Location", state: "done" },
                { label: "Station", state: "current" },
              ]}
            />
          </div>

          <div className="mx-auto mt-5 grid size-11 place-items-center rounded-sm border border-border bg-surface">
            <Radio className="size-5 text-primary" aria-hidden />
          </div>
          <h1 className="mt-4 text-center text-xl font-semibold">Verify your station</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Select the exact station you're working from — every check you record will carry this
            station on its audit trail.
          </p>

          <div className="mt-5 space-y-1.5 rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 text-xs text-success">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              Plant verified — {plant?.name}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              Location verified — {location?.name}
            </div>
            {deviceGeo && (
              <div className="flex items-center gap-2">
                <Navigation className="size-3.5 shrink-0" aria-hidden />
                Device signal logged — ±{Math.round(deviceGeo.accuracyM)}m accuracy
              </div>
            )}
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <p className="label-caps">Station</p>
              <div className="grid gap-2">
                {stations.map((s) => {
                  const selected = stationId === s.id;
                  const available = s.status === "active";
                  const device = state.devices.find((d) => d.stationId === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!available}
                      onClick={() => setStationId(s.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                        !available && "cursor-not-allowed opacity-50",
                        available && selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : available && "border-border hover:border-primary/40",
                        !available && "border-border",
                      )}
                    >
                      {available ? (
                        <Radio className="size-4 shrink-0 text-primary" aria-hidden />
                      ) : (
                        <Wrench className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">
                          <span className="mono-id text-primary">{s.code}</span> — {s.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {available
                            ? device
                              ? `${device.name} · ${device.status}`
                              : "No device registered"
                            : `Not available — ${s.status}`}
                        </span>
                      </span>
                      {selected && available && (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                      )}
                    </button>
                  );
                })}
                {!stations.length && (
                  <p className="text-xs text-muted-foreground">
                    No stations configured at this location.
                  </p>
                )}
              </div>
            </div>
            <Button className="w-full" disabled={!stationId || submitting} onClick={onVerify}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Verify station
            </Button>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-white/60">Powered by Pibythree</p>
      </div>
    </div>
  );
}
