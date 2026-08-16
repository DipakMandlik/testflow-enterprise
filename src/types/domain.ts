// Canonical domain model for the Tata Electronics Test Management Platform.
// Every layer (repositories, services, hooks, UI) derives its types from here.

export type Role = "tester" | "reviewer" | "manager" | "admin";

export enum ExecutionStatus {
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  SENT_BACK = "sent_back",
  APPROVED = "approved",
  BLOCKED = "blocked",
  COMPLETED = "completed",
}

export type StepStatus =
  | "not_started"
  | "in_progress"
  | "passed"
  | "failed"
  | "blocked"
  | "skipped";

export type Priority = "critical" | "high" | "medium" | "low";

export interface User {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  projectIds: string[];
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Module {
  id: string;
  projectId: string;
  name: string;
}

export interface Environment {
  id: string;
  name: string;
  projectId: string;
}

export interface TestCase {
  id: string;
  code: string;
  title: string;
  description: string;
  projectId: string;
  moduleId: string;
  environmentId: string;
  priority: Priority;
  version: string;
  preconditions: string[];
  testData: string;
}

export interface TestStep {
  id: string;
  testCaseId: string;
  index: number;
  action: string;
  expected: string;
  evidenceRequired: boolean;
}

export interface TestAssignment {
  id: string;
  testCaseId: string;
  testerId: string;
  assignedById: string;
  assignedAt: string;
  dueAt: string;
  priority: Priority;
}

export interface TestExecution {
  id: string;
  code: string;
  assignmentId: string;
  testCaseId: string;
  testerId: string;
  status: ExecutionStatus;
  startedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  blockReason: string | null;
  summary: string;
  round: number;
}

export interface StepResult {
  id: string;
  executionId: string;
  stepId: string;
  status: StepStatus;
  actual: string;
  comment: string;
  updatedAt: string | null;
}

export interface Evidence {
  id: string;
  executionId: string;
  stepId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  uploadedById: string;
  uploadedAt: string;
}

export interface Review {
  id: string;
  executionId: string;
  reviewerId: string;
  decision: "approved" | "sent_back";
  comment: string;
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

export interface Session {
  userId: string;
  issuedAt: string;
}

export interface AppState {
  users: User[];
  projects: Project[];
  modules: Module[];
  environments: Environment[];
  testCases: TestCase[];
  testSteps: TestStep[];
  assignments: TestAssignment[];
  executions: TestExecution[];
  stepResults: StepResult[];
  evidence: Evidence[];
  reviews: Review[];
  notifications: Notification[];
  audit: AuditEvent[];
  session: Session | null;
  pendingLoginUserId: string | null;
}

// ---- Centralized display mappings (single source of truth) -----------------

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  [ExecutionStatus.ASSIGNED]: "Assigned",
  [ExecutionStatus.IN_PROGRESS]: "In Progress",
  [ExecutionStatus.SUBMITTED]: "Submitted",
  [ExecutionStatus.UNDER_REVIEW]: "Under Review",
  [ExecutionStatus.SENT_BACK]: "Sent Back",
  [ExecutionStatus.APPROVED]: "Approved",
  [ExecutionStatus.BLOCKED]: "Blocked",
  [ExecutionStatus.COMPLETED]: "Completed",
};

const ROLE_OVERRIDES: Partial<Record<Role, Partial<Record<ExecutionStatus, string>>>> = {
  tester: {
    [ExecutionStatus.SENT_BACK]: "Revision Required",
    [ExecutionStatus.UNDER_REVIEW]: "Under Review",
    [ExecutionStatus.SUBMITTED]: "Awaiting Review",
  },
  reviewer: {
    [ExecutionStatus.SENT_BACK]: "Revision Requested",
    [ExecutionStatus.UNDER_REVIEW]: "Pending Review",
    [ExecutionStatus.SUBMITTED]: "Pending Review",
  },
};

export function statusLabel(status: ExecutionStatus, role?: Role): string {
  return (role && ROLE_OVERRIDES[role]?.[status]) || EXECUTION_STATUS_LABELS[status];
}

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  passed: "Passed",
  failed: "Failed",
  blocked: "Blocked",
  skipped: "Skipped",
};

export const ROLE_LABELS: Record<Role, string> = {
  tester: "Tester",
  reviewer: "Reviewer",
  manager: "Manager",
  admin: "Administrator",
};

// ---- State machine ---------------------------------------------------------

export const TRANSITIONS: Record<ExecutionStatus, ExecutionStatus[]> = {
  [ExecutionStatus.ASSIGNED]: [ExecutionStatus.IN_PROGRESS, ExecutionStatus.BLOCKED],
  [ExecutionStatus.IN_PROGRESS]: [ExecutionStatus.SUBMITTED, ExecutionStatus.BLOCKED],
  [ExecutionStatus.SUBMITTED]: [ExecutionStatus.UNDER_REVIEW],
  [ExecutionStatus.UNDER_REVIEW]: [ExecutionStatus.APPROVED, ExecutionStatus.SENT_BACK],
  [ExecutionStatus.SENT_BACK]: [ExecutionStatus.IN_PROGRESS, ExecutionStatus.BLOCKED],
  [ExecutionStatus.APPROVED]: [ExecutionStatus.COMPLETED],
  [ExecutionStatus.BLOCKED]: [ExecutionStatus.IN_PROGRESS],
  [ExecutionStatus.COMPLETED]: [],
};

export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
