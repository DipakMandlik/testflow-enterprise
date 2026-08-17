import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Logo } from "@/components/tms/Logo";
import { useTms } from "@/lib/tms/store";
import { currentUser, locationsForPlant, verifyLocation } from "@/lib/tms/services";

export const Route = createFileRoute("/verify-location")({
  head: () => ({
    meta: [{ title: "Verify Location — Pibythree Quality Hub" }],
  }),
  component: VerifyLocationPage,
});

function VerifyLocationPage() {
  const { state, ready, run } = useTms();
  const navigate = useNavigate();
  const user = currentUser(state);
  const [plantId, setPlantId] = useState(state.plants[0]?.id ?? "");
  const [locationId, setLocationId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) void navigate({ to: "/", replace: true });
    else if (user.role !== "tester") void navigate({ to: "/dashboard", replace: true });
    else if (state.session?.locationVerifiedAt)
      void navigate({ to: "/verify-station", replace: true });
  }, [ready, user, state.session, navigate]);

  if (!user) return null;
  const locations = locationsForPlant(state, plantId);

  const onVerify = async () => {
    if (!locationId) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 250));
    const okResult = run((s) => verifyLocation(s, user, plantId, locationId), {
      success: "Location verified.",
    });
    setSubmitting(false);
    if (okResult) void navigate({ to: "/verify-station" });
  };

  return (
    <div className="auth-scene flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-border bg-card p-8 shadow-xl">
          <Logo height={40} className="mx-auto" />
          <div className="mx-auto mt-4 grid size-11 place-items-center rounded-sm border border-border bg-surface">
            <MapPin className="size-5 text-primary" aria-hidden />
          </div>
          <h1 className="mt-4 text-center text-xl font-semibold">Verify your location</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Confirm the plant and location you're testing from before opening any assignment.
          </p>

          <div className="mt-7 space-y-4">
            <div className="space-y-1.5">
              <Label>Plant</Label>
              <Select
                value={plantId}
                onValueChange={(v) => {
                  setPlantId(v);
                  setLocationId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {state.plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
