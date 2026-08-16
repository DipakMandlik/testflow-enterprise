import { ExecutionStatus, type Execution, type User } from "@/types/domain";

const isAdmin = (u: User) => u.role === "admin";
const isManager = (u: User) => u.role === "manager" || isAdmin(u);
const isSeniorManager = (u: User) => u.role === "senior_manager" || isAdmin(u);
const isTemplateManager = (u: User) => u.role === "template_manager" || isAdmin(u);
const isQualityChecker = (u: User) => u.role === "quality_checker" || isManager(u);

const EXECUTABLE_STATUSES = [
  ExecutionStatus.ASSIGNED,
  ExecutionStatus.IN_PROGRESS,
  ExecutionStatus.RETEST_REQUIRED,
  ExecutionStatus.RETEST_IN_PROGRESS,
];

export function canViewExecution(user: User, execution?: Execution): boolean {
  if (!user.active) return false;
  if (isQualityChecker(user) || isSeniorManager(user)) return true;
  return !execution || execution.testerId === user.id;
}

export function canExecuteTest(user: User, execution: Execution): boolean {
  if (!user.active || user.role !== "tester") return false;
  if (execution.testerId !== user.id) return false;
  return EXECUTABLE_STATUSES.includes(execution.status);
}

export function canSubmitExecution(user: User, execution: Execution): boolean {
  return (
    canExecuteTest(user, execution) &&
    [ExecutionStatus.IN_PROGRESS, ExecutionStatus.RETEST_IN_PROGRESS].includes(execution.status)
  );
}

export function canViewReview(user: User): boolean {
  return isQualityChecker(user);
}

export function canReviewExecution(user: User, execution: Execution): boolean {
  return (
    isQualityChecker(user) &&
    execution.testerId !== user.id &&
    execution.status === ExecutionStatus.PENDING_REVIEW
  );
}

export const canApproveExecution = canReviewExecution;
export const canRequestRetest = canReviewExecution;
export const canRejectExecution = canReviewExecution;

export const canManageUsers = (u: User) => isAdmin(u);
export const canManagePlants = (u: User) => isAdmin(u);
export const canManageStations = (u: User) => isAdmin(u);
export const canManageDevices = (u: User) => isAdmin(u);
export const canManageAssignments = (u: User) => isManager(u);
export const canReassignAssignment = (u: User) => isManager(u);
export const canManageTemplates = (u: User) => isTemplateManager(u);
export const canManageFailureCategories = (u: User) => isTemplateManager(u) || isAdmin(u);
export const canViewReports = (u: User) =>
  isManager(u) || isSeniorManager(u) || isQualityChecker(u);
export const canViewSeniorDashboard = (u: User) => isSeniorManager(u);
export const canViewTemplateManagerTools = (u: User) => isTemplateManager(u);
export const canExportReports = (u: User) => isManager(u) || isSeniorManager(u);
