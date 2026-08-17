import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Navigation,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/tms/Logo";
import { AccessSteps } from "@/components/tms/AccessSteps";
import { cn } from "@/lib/utils";
import { useTms } from "@/lib/tms/store";
import { currentUser, locationsForPlant, verifyLocation } from "@/lib/tms/services";

export const Route = createFileRoute("/verify-location")({
  head: () => ({
    meta: [{ title: "Verify Location — Pibythree Quality Hub" }],
  }),
  component: VerifyLocationPage,
});

type GeoStatus = "locating" | "granted" | "denied" | "unavailable";
type GeoData = { lat: number; lng: number; accuracyM: number };

function VerifyLocationPage() {
  const { state, ready, run } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);
  const [plantId, setPlantId] = useState(state.plants[0]?.id ?? "");
  const [locationId, setLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("locating");
  const [geoData, setGeoData] = useState<GeoData | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) void navigate({ to: "/", replace: true });
    else if (user.role !== "tester") void navigate({ to: "/dashboard", replace: true });
    else if (state.session?.locationVerifiedAt)
      void navigate({ to: "/verify-station", replace: true });
  }, [ready, user, state.session, navigate]);

  // Real device geolocation, requested with the browser's own permission
  // prompt. It's captured as corroborating evidence on the verification
  // audit event — never used to gate or auto-select, since this deployment
  // has no known-good plant coordinates to check it against. Failure or a
  // denied prompt is expected and never blocks manual verification below.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("unavailable");
      return;
    }
    setGeoStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoData({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        });
        setGeoStatus("granted");
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60_000 },
    );
  }, []);

  if (!user) return null;
  const locations = locationsForPlant(state, plantId);

  const onVerify = async () => {
    if (!locationId) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 250));
    const okResult = run(
      (s) => verifyLocation(s, user, plantId, locationId, geoStatus === "granted" ? geoData : null),
      { success: "Location verified." },
    );
    setSubmitting(false);
    if (okResult) void navigate({ to: "/verify-station" });
  };

  return (
    <div className="auth-scene flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
          <Logo height={40} className="mx-auto" />

          <div className="mt-5">
            <AccessSteps
              steps={[
                { label: "Plant", state: plantId ? "done" : "current" },
                { label: "Location", state: "current" },
                { label: "Station", state: "upcoming" },
              ]}
            />
          </div>

          <div className="mx-auto mt-5 grid size-11 place-items-center rounded-sm border border-border bg-surface">
            <MapPin className="size-5 text-primary" aria-hidden />
          </div>
          <h1 className="mt-4 text-center text-xl font-semibold">Verify your location</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Every quality check is tied to the plant, location and station where it was performed —
            this is a real access checkpoint, required for audit traceability, not a formality.
          </p>

          <div
            className={cn(
              "mt-5 rounded-lg border px-3 py-2.5 text-xs",
              geoStatus === "granted"
                ? "border-success/30 bg-success/5"
                : "border-border bg-surface",
            )}
          >
            <div className="flex items-center gap-2 font-medium">
              {geoStatus === "locating" ? (
                <LoaderCircle className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
              ) : geoStatus === "granted" ? (
                <Navigation className="size-3.5 text-success" aria-hidden />
              ) : (
                <ShieldAlert className="size-3.5 text-muted-foreground" aria-hidden />
              )}
              Device location signal
            </div>
            {geoStatus === "locating" && (
              <p className="mt-1 text-muted-foreground">Requesting device location…</p>
            )}
            {geoStatus === "granted" && geoData && (
              <p className="mt-1 text-muted-foreground">
                <span className="mono-id text-foreground">
                  {geoData.lat.toFixed(4)}, {geoData.lng.toFixed(4)}
                </span>{" "}
                · accuracy ±{Math.round(geoData.accuracyM)}m
              </p>
            )}
            {(geoStatus === "denied" || geoStatus === "unavailable") && (
              <p className="mt-1 text-muted-foreground">
                {geoStatus === "denied"
                  ? "Location permission denied — "
                  : "Device location unavailable — "}
                continuing with manual verification only.
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Captured as supporting evidence on the verification record. Your selection below
              remains the authoritative check-in.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <p className="label-caps">Plant</p>
              <div className="grid gap-2">
                {state.plants.map((p) => {
                  const selected = plantId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPlantId(p.id);
                        setLocationId("");
                      }}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <Building2 className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{p.name}</span>
                        <span className="mono-id block text-xs text-muted-foreground">
                          {p.code}
                        </span>
                      </span>
                      {selected && (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="label-caps">Location</p>
              <div className="grid gap-2">
                {locations.map((l) => {
                  const selected = locationId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setLocationId(l.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
                      <span className="flex-1 font-medium">{l.name}</span>
                      {selected && (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                      )}
                    </button>
                  );
                })}
                {!locations.length && (
                  <p className="text-xs text-muted-foreground">No locations at this plant.</p>
                )}
              </div>
            </div>

            <Button className="w-full" disabled={!locationId || submitting} onClick={onVerify}>
              {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Verify location
            </Button>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-white/60">Powered by Pibythree</p>
      </div>
    </div>
  );
}
