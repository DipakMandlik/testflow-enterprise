// Canonical domain model for the Pibythree Quality Hub digital quality
// inspection platform. Every layer (repositories, services, hooks, UI)
// derives its types from here. The check (a single quality point on a
// template) is the central business object — everything else (assignment,
// execution, evidence, review, retest, reporting, audit) revolves around it.

export type Role =
  "tester" | "quality_checker" | "manager" | "senior_manager" | "template_manager" | "admin";

// ---- organization / shop floor -------------------------------------------

export interface Plant {
  id: string;
  code: string;
  name: string;
}

export interface Location {
  id: string;
  plantId: string;
  name: string;
}

export type StationStatus = "active" | "inactive" | "maintenance";

export interface Station {
  id: string;
  plantId: string;
  locationId: string;
  code: string;
  name: string;
  status: StationStatus;
}

export type DeviceStatus = "online" | "offline";

export interface Device {
  id: string;
  stationId: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: string;
  assignedTesterId: string | null;
}

// ---- template / category / check (versioned, immutable once published) --

export type TemplateStatus = "draft" | "under_review" | "approved" | "published" | "archived";

export interface Template {
  id: string;
  familyCode: string;
  name: string;
  revision: number;
  status: TemplateStatus;
  createdById: string;
  createdAt: string;
  updatedById: string;
  updatedAt: string;
  approvedById: string | null;
  publishedAt: string | null;
  totalChecks: number;
  mandatoryChecks: number;
}

export interface TemplateCategory {
  id: string;
  templateId: string;
  name: string;
  sequence: number;
}

export type CheckType = "binary" | "ternary" | "measurement" | "text" | "visual";

export interface TemplateCheck {
  id: string;
  templateId: string;
  categoryId: string;
  sequence: number;
  checkCode: string;
  title: string;
  description: string;
  instruction: string;
  expectedResult: string;
  acceptanceCriteria: string;
  testType: CheckType;
  mandatory: boolean;
  allowNA: boolean;
  evidenceRequired: boolean;
  measurementUnit: string | null;
  measurementMin: number | null;
  measurementMax: number | null;
  defaultFailureCategory: string | null;
}

// ---- unit under test / assignment ----------------------------------------

export interface Unit {
  id: string;
  usn: string;
  familyCode: string;
  createdAt: string;
}

export type Priority = "critical" | "high" | "medium" | "low";

export interface Assignment {
  id: string;
  unitId: string;
  templateId: string;
  testerId: string;
  stationId: string;
  priority: Priority;
  dueAt: string;
  assignedById: string;
  assignedAt: string;
}

// ---- execution ------------------------------------------------------------

export enum ExecutionStatus {
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  PENDING_REVIEW = "pending_review",
  RETEST_REQUIRED = "retest_required",
  RETEST_IN_PROGRESS = "retest_in_progress",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

export interface Execution {
  id: string;
  code: string;
  assignmentId: string;
  unitId: string;
  templateId: string;
  testerId: string;
  stationId: string;
  status: ExecutionStatus;
  locationVerifiedAt: string | null;
  stationVerifiedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  summary: string;
  round: number;
}

export type CheckStatus =
  | "not_started"
  | "in_progress"
  | "passed"
  | "failed"
  | "na"
  | "retest_required"
  | "retest_in_progress"
  | "retest_passed"
  | "retest_failed";

export type FailureSeverity = "low" | "medium" | "high" | "critical";

// One row per (executionId, templateCheckId, attempt). Never overwritten —
// a new attempt is a new row, so retest history is a real audit trail
// rather than a mutated field. The "current" result for a check is the row
// with the highest attempt number.
export interface CheckResult {
  id: string;
  executionId: string;
  templateCheckId: string;
  attempt: number;
  status: CheckStatus;
  actualResult: string;
  measurementValue: number | null;
  failureCategory: string | null;
  failureSeverity: FailureSeverity | null;
  failureDescription: string;
  testerNotes: string;
  reviewerNotes: string;
  retestReason: string | null;
  testerId: string;
  completedAt: string | null;
  updatedAt: string | null;
}

export interface Evidence {
  id: string;
  executionId: string;
  templateCheckId: string | null;
  attempt: number;
  filename: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  capturedById: string;
  capturedAt: string;
}

export type ReviewDecision = "approved" | "rejected" | "retest_requested";

export interface Review {
  id: string;
  executionId: string;
  reviewerId: string;
  decision: ReviewDecision;
  comment: string;
  affectedCheckIds: string[];
  createdAt: string;
  round: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  metadata: Record<string, string | number>;
}

export interface DeviceGeoSignal {
  lat: number;
  lng: number;
  accuracyM: number;
  capturedAt: string;
}

export interface Session {
  userId: string;
  issuedAt: string;
  plantId: string | null;
  locationId: string | null;
  locationVerifiedAt: string | null;
  stationId: string | null;
  stationVerifiedAt: string | null;
  // A real device geolocation reading, captured (with the browser's consent
  // prompt) at the location-verification step when available. It is
  // corroborating evidence logged alongside the verification event — the
  // plant/location the tester explicitly selects remains the authoritative
  // record, since this app has no known-good plant coordinates to check it
  // against.
  deviceGeo: DeviceGeoSignal | null;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  plantIds: string[];
}

export interface AppState {
  users: User[];
  plants: Plant[];
  locations: Location[];
  stations: Station[];
  devices: Device[];
  templates: Template[];
  templateCategories: TemplateCategory[];
  templateChecks: TemplateCheck[];
  units: Unit[];
  assignments: Assignment[];
  executions: Execution[];
  checkResults: CheckResult[];
  evidence: Evidence[];
  reviews: Review[];
  notifications: Notification[];
  audit: AuditEvent[];
  failureCategories: string[];
  session: Session | null;
  pendingLoginUserId: string | null;
}

// ---- centralized display mappings (single source of truth) --------------

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  [ExecutionStatus.ASSIGNED]: "Assigned",
  [ExecutionStatus.IN_PROGRESS]: "In Progress",
  [ExecutionStatus.PENDING_REVIEW]: "Pending Review",
  [ExecutionStatus.RETEST_REQUIRED]: "Retest Required",
  [ExecutionStatus.RETEST_IN_PROGRESS]: "Retest In Progress",
  [ExecutionStatus.APPROVED]: "Approved",
  [ExecutionStatus.REJECTED]: "Rejected",
  [ExecutionStatus.COMPLETED]: "Completed",
};

const ROLE_OVERRIDES: Partial<Record<Role, Partial<Record<ExecutionStatus, string>>>> = {
  tester: {
    [ExecutionStatus.PENDING_REVIEW]: "Awaiting Quality Review",
    [ExecutionStatus.RETEST_REQUIRED]: "Retest Required",
  },
  quality_checker: {
    [ExecutionStatus.PENDING_REVIEW]: "Pending Verification",
    [ExecutionStatus.RETEST_REQUIRED]: "Retest Requested",
  },
};

export function statusLabel(status: ExecutionStatus, role?: Role): string {
  return (role && ROLE_OVERRIDES[role]?.[status]) || EXECUTION_STATUS_LABELS[status];
}

export const CHECK_STATUS_LABELS: Record<CheckStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  passed: "Passed",
  failed: "Failed",
  na: "N/A",
  retest_required: "Retest Required",
  retest_in_progress: "Retest In Progress",
  retest_passed: "Retest Passed",
  retest_failed: "Retest Failed",
};

export const ROLE_LABELS: Record<Role, string> = {
  tester: "Tester",
  quality_checker: "Quality Checker",
  manager: "Manager",
  senior_manager: "Senior Manager",
  template_manager: "Template Manager",
  admin: "Administrator",
};

export const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: "Draft",
  under_review: "Under Review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

export const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  binary: "Pass / Fail",
  ternary: "Pass / Fail / N/A",
  measurement: "Measurement",
  text: "Text Observation",
  visual: "Visual Inspection",
};

// ---- execution state machine ----------------------------------------------

export const EXECUTION_TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  [ExecutionStatus.ASSIGNED]: [ExecutionStatus.IN_PROGRESS],
  [ExecutionStatus.IN_PROGRESS]: [ExecutionStatus.PENDING_REVIEW],
  [ExecutionStatus.PENDING_REVIEW]: [
    ExecutionStatus.APPROVED,
    ExecutionStatus.REJECTED,
    ExecutionStatus.RETEST_REQUIRED,
  ],
  [ExecutionStatus.RETEST_REQUIRED]: [ExecutionStatus.RETEST_IN_PROGRESS],
  [ExecutionStatus.RETEST_IN_PROGRESS]: [ExecutionStatus.PENDING_REVIEW],
  [ExecutionStatus.APPROVED]: [ExecutionStatus.COMPLETED],
  [ExecutionStatus.REJECTED]: [],
  [ExecutionStatus.COMPLETED]: [],
};

export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return EXECUTION_TRANSITIONS[from].includes(to);
}

// A check is "resolved" for progress/submission purposes once it has a
// terminal outcome for the current attempt.
export const RESOLVED_CHECK_STATUSES: CheckStatus[] = [
  "passed",
  "failed",
  "na",
  "retest_passed",
  "retest_failed",
];

export const FAILED_CHECK_STATUSES: CheckStatus[] = ["failed", "retest_failed"];
