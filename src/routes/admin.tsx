import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/tms/AppShell";
import { ActivityTimeline } from "@/components/tms/Timeline";
import { PriorityBadge } from "@/components/tms/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTms } from "@/lib/tms/store";
import {
  addFailureCategory,
  createAssignment,
  createDevice,
  createLocation,
  createPlant,
  createStation,
  createUnit,
  createUser,
  currentUser,
  locationsForPlant,
  setDeviceStatus,
  setStationStatus,
  setUserActive,
  setUserRole,
  stationById,
  stationsForPlant,
  templateById,
  userById,
} from "@/lib/tms/services";
import {
  canManageAssignments,
  canManageDevices,
  canManageFailureCategories,
  canManagePlants,
  canManageStations,
  canManageUsers,
} from "@/lib/tms/permissions";
import type { Priority, Role, StationStatus } from "@/types/domain";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Pibythree Quality Hub" },
      {
        name: "description",
        content:
          "Users, plants, stations, devices, failure categories and the platform audit trail.",
      },
    ],
  }),
  component: AdminPage,
});

const ROLES: Role[] = [
  "tester",
  "quality_checker",
  "manager",
  "senior_manager",
  "template_manager",
  "admin",
];
const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];
const STATION_STATUSES: StationStatus[] = ["active", "inactive", "maintenance"];

function NewUserDialog() {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("tester");

  const reset = () => {
    setEmployeeId("");
    setName("");
    setEmail("");
    setRole("tester");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a user</DialogTitle>
          <DialogDescription>
            Adds a new employee account to the platform directory.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-id">Employee ID</Label>
            <Input
              id="new-user-id"
              placeholder="TE-1010"
              className="mono-id"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input id="new-user-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!employeeId.trim() || !name.trim() || !email.trim()}
            onClick={() => {
              const ok = run(
                (s) => createUser(s, currentUser(s)!, { employeeId, name, email, role }),
                {
                  success: "User created.",
                },
              );
              if (ok) {
                setOpen(false);
                reset();
              }
            }}
          >
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersSection() {
  const { state, run } = useTms();
  const admin = canManageUsers(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Users ({state.users.length})</h2>
        {admin && <NewUserDialog />}
      </header>
      <ul className="divide-y divide-border">
        {state.users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{u.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                <span className="mono-id">{u.employeeId}</span> · {u.email}
              </p>
            </div>
            {admin ? (
              <Select
                value={u.role}
                onValueChange={(v) => run((s) => setUserRole(s, currentUser(s)!, u.id, v as Role))}
              >
                <SelectTrigger className="h-8 w-40 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="label-caps">{u.role.replace(/_/g, " ")}</span>
            )}
            {admin ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={u.active}
                  onCheckedChange={(checked) =>
                    run((s) => setUserActive(s, currentUser(s)!, u.id, checked))
                  }
                  aria-label={`${u.active ? "Deactivate" : "Activate"} ${u.name}`}
                />
                {u.active ? "Active" : "Inactive"}
              </label>
            ) : (
              <span className="text-xs text-muted-foreground">
                {u.active ? "Active" : "Inactive"}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewPlantDialog() {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New plant
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a plant</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="plant-code">Plant code</Label>
            <Input
              id="plant-code"
              className="mono-id"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plant-name">Name</Label>
            <Input id="plant-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!code.trim() || !name.trim()}
            onClick={() => {
              const ok = run((s) => createPlant(s, currentUser(s)!, { code, name }), {
                success: "Plant created.",
              });
              if (ok) {
                setOpen(false);
                setCode("");
                setName("");
              }
            }}
          >
            Create plant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewLocationDialog({ plantId }: { plantId: string }) {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" /> Add location
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a location</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="location-name">Name</Label>
          <Input id="location-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              const ok = run((s) => createLocation(s, currentUser(s)!, { plantId, name }), {
                success: "Location added.",
              });
              if (ok) {
                setOpen(false);
                setName("");
              }
            }}
          >
            Add location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewStationDialog({ plantId }: { plantId: string }) {
  const { state, run } = useTms();
  const [open, setOpen] = useState(false);
  const [locationId, setLocationId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const locations = locationsForPlant(state, plantId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" /> Add station
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a station</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
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
          <div className="space-y-1.5">
            <Label htmlFor="station-code">Station code</Label>
            <Input
              id="station-code"
              className="mono-id"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="station-name">Name</Label>
            <Input id="station-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!locationId || !code.trim() || !name.trim()}
            onClick={() => {
              const ok = run(
                (s) => createStation(s, currentUser(s)!, { plantId, locationId, code, name }),
                { success: "Station created." },
              );
              if (ok) {
                setOpen(false);
                setLocationId("");
                setCode("");
                setName("");
              }
            }}
          >
            Create station
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlantsStationsSection() {
  const { state, run } = useTms();
  const user = currentUser(state)!;
  const managePlants = canManagePlants(user);
  const manageStations = canManageStations(user);

  return (
    <div className="space-y-5">
      {managePlants && (
        <div className="flex justify-end">
          <NewPlantDialog />
        </div>
      )}
      {state.plants.map((plant) => (
        <section
          key={plant.id}
          className="overflow-hidden rounded-lg border border-border bg-surface"
        >
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold">
              {plant.code} · {plant.name}
            </h2>
            {manageStations && (
              <div className="flex gap-2">
                <NewLocationDialog plantId={plant.id} />
                <NewStationDialog plantId={plant.id} />
              </div>
            )}
          </header>
          <ul className="divide-y divide-border">
            {stationsForPlant(state, plant.id).map((station) => (
              <li
                key={station.id}
                className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="mono-id text-primary">{station.code}</span>
                <span className="min-w-0 flex-1 truncate">{station.name}</span>
                <span className="text-xs text-muted-foreground">
                  {
                    locationsForPlant(state, plant.id).find((l) => l.id === station.locationId)
                      ?.name
                  }
                </span>
                {manageStations ? (
                  <Select
                    value={station.status}
                    onValueChange={(v) =>
                      run((s) =>
                        setStationStatus(s, currentUser(s)!, station.id, v as StationStatus),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-32 capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATION_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="label-caps capitalize">{station.status}</span>
                )}
              </li>
            ))}
            {!stationsForPlant(state, plant.id).length && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                No stations at this plant yet.
              </li>
            )}
          </ul>
        </section>
      ))}
    </div>
  );
}

function NewDeviceDialog() {
  const { state, run } = useTms();
  const [open, setOpen] = useState(false);
  const [stationId, setStationId] = useState("");
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New device
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a device</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Station</Label>
            <Select value={stationId} onValueChange={setStationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a station" />
              </SelectTrigger>
              <SelectContent>
                {state.stations.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="device-name">Device name</Label>
            <Input
              id="device-name"
              className="mono-id"
              placeholder="TAB-EQT-05-01"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!stationId || !name.trim()}
            onClick={() => {
              const ok = run((s) => createDevice(s, currentUser(s)!, { stationId, name }), {
                success: "Device registered.",
              });
              if (ok) {
                setOpen(false);
                setStationId("");
                setName("");
              }
            }}
          >
            Register device
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DevicesSection() {
  const { state, run } = useTms();
  const manage = canManageDevices(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">Devices ({state.devices.length})</h2>
        {manage && <NewDeviceDialog />}
      </header>
      <ul className="divide-y divide-border">
        {state.devices.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
            <span className="mono-id text-primary">{d.name}</span>
            <span className="text-xs text-muted-foreground">
              {stationById(state, d.stationId)?.code}
            </span>
            {manage ? (
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={d.status === "online"}
                  onCheckedChange={(checked) =>
                    run((s) =>
                      setDeviceStatus(s, currentUser(s)!, d.id, checked ? "online" : "offline"),
                    )
                  }
                  aria-label={`Mark ${d.name} ${d.status === "online" ? "offline" : "online"}`}
                />
                {d.status === "online" ? "Online" : "Offline"}
              </label>
            ) : (
              <span className="ml-auto text-xs text-muted-foreground">{d.status}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewUnitDialog() {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [usn, setUsn] = useState("");
  const [familyCode, setFamilyCode] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-3.5" /> New unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a unit</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="unit-usn">USN</Label>
            <Input
              id="unit-usn"
              className="mono-id"
              value={usn}
              onChange={(e) => setUsn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit-family">Product family</Label>
            <Input
              id="unit-family"
              className="mono-id"
              placeholder="OJAS-EQT"
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!usn.trim() || !familyCode.trim()}
            onClick={() => {
              const ok = run((s) => createUnit(s, currentUser(s)!, { usn, familyCode }), {
                success: "Unit registered.",
              });
              if (ok) {
                setOpen(false);
                setUsn("");
                setFamilyCode("");
              }
            }}
          >
            Register unit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewAssignmentDialog() {
  const { state, run } = useTms();
  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [testerId, setTesterId] = useState("");
  const [stationId, setStationId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const testers = state.users.filter((u) => u.role === "tester" && u.active);
  const publishedTemplates = state.templates.filter((t) => t.status === "published");

  const reset = () => {
    setUnitId("");
    setTemplateId("");
    setTesterId("");
    setStationId("");
    setDueAt("");
    setPriority("medium");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New assignment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a unit</DialogTitle>
          <DialogDescription>
            Creates the assignment and its execution, and notifies the tester.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a unit" />
                </SelectTrigger>
                <SelectContent>
                  {state.units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.usn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a published template" />
                </SelectTrigger>
                <SelectContent>
                  {publishedTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} Rev {t.revision}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tester</Label>
              <Select value={testerId} onValueChange={setTesterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tester" />
                </SelectTrigger>
                <SelectContent>
                  {testers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Station</Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a station" />
                </SelectTrigger>
                <SelectContent>
                  {state.stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="assign-due">Due date</Label>
              <Input
                id="assign-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!unitId || !templateId || !testerId || !stationId || !dueAt}
            onClick={() => {
              const ok = run(
                (s) =>
                  createAssignment(s, currentUser(s)!, {
                    unitId,
                    templateId,
                    testerId,
                    stationId,
                    dueAt: new Date(dueAt).toISOString(),
                    priority,
                  }),
                { success: "Assignment created." },
              );
              if (ok) {
                setOpen(false);
                reset();
              }
            }}
          >
            Create assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnitsAssignmentsSection() {
  const { state } = useTms();
  const manage = canManageAssignments(currentUser(state)!);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Units ({state.units.length})</h2>
          {manage && <NewUnitDialog />}
        </header>
        <ul className="divide-y divide-border">
          {state.units.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <span className="mono-id text-primary">{u.usn}</span>
              <span className="text-xs text-muted-foreground">{u.familyCode}</span>
            </li>
          ))}
          {!state.units.length && (
            <li className="px-4 py-6 text-sm text-muted-foreground">No units registered yet.</li>
          )}
        </ul>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Assignments ({state.assignments.length})</h2>
          {manage && <NewAssignmentDialog />}
        </header>
        <ul className="divide-y divide-border">
          {[...state.assignments].reverse().map((a) => {
            const unit = state.units.find((u) => u.id === a.unitId);
            const template = templateById(state, a.templateId);
            const tester = userById(state, a.testerId);
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                <span className="mono-id text-primary">{unit?.usn}</span>
                <span className="min-w-0 flex-1 truncate">
                  {template?.name} Rev {template?.revision} · {tester?.name}
                </span>
                <PriorityBadge priority={a.priority} />
                <span className="text-xs text-muted-foreground">
                  due {new Date(a.dueAt).toLocaleDateString()}
                </span>
              </li>
            );
          })}
          {!state.assignments.length && (
            <li className="px-4 py-6 text-sm text-muted-foreground">No assignments yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function NewFailureCategoryDialog() {
  const { run } = useTms();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" /> New category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a failure category</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="failure-category-name">Name</Label>
          <Input
            id="failure-category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => {
              const ok = run((s) => addFailureCategory(s, currentUser(s)!, name.trim()), {
                success: "Failure category added.",
              });
              if (ok) {
                setOpen(false);
                setName("");
              }
            }}
          >
            Add category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FailureCategoriesSection() {
  const { state } = useTms();
  const manage = canManageFailureCategories(currentUser(state)!);

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h2 className="text-sm font-semibold">
          Failure categories ({state.failureCategories.length})
        </h2>
        {manage && <NewFailureCategoryDialog />}
      </header>
      <ul className="flex flex-wrap gap-2 p-4">
        {state.failureCategories.map((c) => (
          <li key={c} className="rounded-sm border border-border px-2.5 py-1 text-sm">
            {c}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminPage() {
  const { state } = useTms();
  const user = currentUser(state)!;

  return (
    <AppShell
      title="Administration"
      description="Manage users, plants, stations, devices and platform-wide configuration."
    >
      <Tabs defaultValue="users">
        <TabsList>
          {canManageUsers(user) && <TabsTrigger value="users">Users</TabsTrigger>}
          {(canManagePlants(user) || canManageStations(user)) && (
            <TabsTrigger value="plants">Plants &amp; Stations</TabsTrigger>
          )}
          {canManageDevices(user) && <TabsTrigger value="devices">Devices</TabsTrigger>}
          {canManageAssignments(user) && (
            <TabsTrigger value="units">Units &amp; Assignments</TabsTrigger>
          )}
          {canManageFailureCategories(user) && (
            <TabsTrigger value="failure-categories">Failure Categories</TabsTrigger>
          )}
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>

        {canManageUsers(user) && (
          <TabsContent value="users">
            <UsersSection />
          </TabsContent>
        )}
        {(canManagePlants(user) || canManageStations(user)) && (
          <TabsContent value="plants">
            <PlantsStationsSection />
          </TabsContent>
        )}
        {canManageDevices(user) && (
          <TabsContent value="devices">
            <DevicesSection />
          </TabsContent>
        )}
        {canManageAssignments(user) && (
          <TabsContent value="units">
            <UnitsAssignmentsSection />
          </TabsContent>
        )}
        {canManageFailureCategories(user) && (
          <TabsContent value="failure-categories">
            <FailureCategoriesSection />
          </TabsContent>
        )}
        <TabsContent value="audit">
          <section className="overflow-hidden rounded-lg border border-border bg-surface">
            <header className="border-b border-border px-4 py-2.5">
              <h2 className="text-sm font-semibold">Platform audit trail</h2>
            </header>
            <div className="max-h-96 overflow-y-auto p-4">
              <ActivityTimeline state={state} events={[...state.audit].slice(-40).reverse()} />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
