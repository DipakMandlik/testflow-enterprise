import { ExecutionStatus, type TestExecution, type User } from "@/types/domain";

const isAdmin = (u: User) => u.role === "admin";
const isManager = (u: User) => u.role === "manager" || isAdmin(u);
const isReviewer = (u: User) => u.role === "reviewer" || isManager(u);

export function canViewTest(user: User, execution?: TestExecution): boolean {
  if (!user.active) return false;
  if (isReviewer(user)) return true;
  return !execution || execution.testerId === user.id;
}

export function canExecuteTest(user: User, execution: TestExecution): boolean {
  if (!user.active || user.role !== "tester") return false;
  if (execution.testerId !== user.id) return false;
  return [
    ExecutionStatus.ASSIGNED,
    ExecutionStatus.IN_PROGRESS,
    ExecutionStatus.SENT_BACK,
    ExecutionStatus.BLOCKED,
  ].includes(execution.status);
}

export function canSubmitExecution(user: User, execution: TestExecution): boolean {
  return (
    canExecuteTest(user, execution) &&
    [ExecutionStatus.IN_PROGRESS, ExecutionStatus.SENT_BACK].includes(execution.status)
  );
}

export function canViewReview(user: User): boolean {
  return isReviewer(user);
}

export function canReviewExecution(user: User, execution: TestExecution): boolean {
  return (
    isReviewer(user) &&
    execution.testerId !== user.id &&
    [ExecutionStatus.SUBMITTED, ExecutionStatus.UNDER_REVIEW].includes(execution.status)
  );
}

export const canApproveExecution = canReviewExecution;
export const canRequestRevision = canReviewExecution;

export const canManageUsers = (u: User) => isAdmin(u);
export const canManageProjects = (u: User) => isAdmin(u);
export const canManageTestCases = (u: User) => isManager(u);
export const canManageAssignments = (u: User) => isManager(u);
export const canViewReports = (u: User) => isReviewer(u);
