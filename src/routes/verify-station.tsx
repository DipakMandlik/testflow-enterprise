import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Radio, LoaderCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTms } from "@/lib/tms/store";
import {
  currentUser,
  locationById,
  plantById,
  stationsForPlant,
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

  if (!user || !state.session?.plantId) return null;
  const plant = plantById(state, state.session.plantId);
  const location = state.session.locationId
    ? locationById(state, state.session.locationId)
    : undefined;
  const stations = stationsForPlant(state, state.session.plantId).filter(
    (s) => s.status === "active",
  );

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
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mx-auto grid size-11 place-items-center rounded-sm border border-border bg-surface">
          <Radio className="size-5 text-primary" aria-hidden />
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold">Verify your station</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          Select the test station you're working from at {location?.name ?? "this location"}.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 rounded-sm border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
          <CheckCircle2 className="size-3.5" />
          Plant: {plant?.name} — Verified
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label>Station</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent>
                {stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!stations.length && (
              <p className="text-xs text-muted-foreground">No active stations at this location.</p>
            )}
          </div>
          <Button className="w-full" disabled={!stationId || submitting} onClick={onVerify}>
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Verify station
          </Button>
        </div>
      </div>
    </div>
  );
}
