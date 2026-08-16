# TestFlow Enterprise

MASTER IMPLEMENTATION PROMPT

Tata Electronics — Enterprise Test Management & Test Execution Platform

You are responsible for designing and implementing a complete, production-quality Test Management & Test Execution Platform for Tata Electronics.

You are not being asked to create a static prototype.

You are not being asked to create an Excel clone.

You are not being asked to create a collection of disconnected dashboards.

You are building a complete enterprise application with:

authentication

role-based access

project management

test case management

test assignment

tester workspace

step-by-step test execution

autosave

evidence management

submission

review

revision

resubmission

approval

notifications

audit trail

reporting

administration

search

realistic seeded data

consistent application state

automated tests

The complete application must work end-to-end.

1. PRODUCT OBJECTIVE

The product transforms spreadsheet-driven manual testing into a structured digital testing platform.

Traditional workflow:

Excel
→ Find test case
→ Read steps
→ Execute
→ Enter actual result
→ Mark Pass/Fail
→ Add remarks
→ Attach screenshots
→ Send for review
→ Reviewer checks
→ Update spreadsheet

The new workflow:

Login
→ Dashboard
→ My Tests
→ Open Test
→ Start Execution
→ Execute Steps
→ Record Results
→ Add Evidence
→ Save
→ Submit
→ Reviewer Review
→ Approve / Send Back
→ Revision
→ Resubmit
→ Approval
→ Reporting
→ Audit History

The application must make this workflow intuitive and reliable.

2. PRODUCT PRINCIPLE

The product should feel like a purpose-built enterprise testing system.

It must NOT feel like:

Excel inside a browser

a generic CRUD dashboard

a collection of forms

a static HTML prototype

a generated admin template

a UI where every screen is just a table

a UI with decorative components that do not improve workflow

The central experience is:

Understand → Execute → Record → Validate → Submit → Review → Approve

Every major screen should support that workflow.

3. VISUAL DESIGN AUTONOMY

Do NOT prescribe a predefined visual theme.

Do NOT assume:

white theme

dark theme

blue theme

glassmorphism

minimalism

futuristic styling

traditional corporate styling

You must independently determine the strongest visual language for this enterprise product.

Choose the:

color system

typography

spacing system

component styling

layout

density

interaction model

motion language

visual hierarchy

based on usability and product context.

The design should be distinctive and polished, but functionality and usability take priority over decoration.

Avoid generic AI-generated dashboard aesthetics.

Do not overuse cards.

Do not turn every piece of information into a card.

Use tables, lists, timelines, panels, drawers, tabs, command interfaces, forms, and other interaction patterns where they are actually appropriate.

4. TECHNOLOGY STACK

Use:

Next.js 15+

App Router

TypeScript

Tailwind CSS

shadcn/ui

React Hook Form

Zod

TanStack Query

Lucide React

Recharts for meaningful analytics

Vitest

Testing Library

Playwright

date-fns

cmdk

clsx

tailwind-merge

Use modern Next.js architecture.

Prefer Server Components wherever appropriate.

Use Client Components only where client-side interaction/state is necessary.

Do not make the entire application "use client".

5. PROJECT LOCATION

Create the application at:

~/tata-electronics-tms


Initialize the application using a modern Next.js App Router configuration.

The project must run with:

npm run dev


and produce a valid production build with:

npm run build


6. ARCHITECTURE

Use a layered architecture.

User
 ↓
Next.js UI
 ↓
Feature Components
 ↓
TanStack Query / API Client
 ↓
Next.js API Route Handlers
 ↓
Domain Services
 ↓
Repositories
 ↓
Persistence


The UI must never directly read or write JSON files.

All application state must flow through typed APIs and services.

This is critical because the JSON persistence layer will eventually be replaceable with a real enterprise database.

7. DIRECTORY STRUCTURE

Use a clean architecture similar to:

tata-electronics-tms/
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── otp/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (workspace)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/
│   │   │   ├── my-tests/
│   │   │   │   └── [testCaseId]/
│   │   │   ├── executions/
│   │   │   │   └── [executionId]/
│   │   │   ├── reviews/
│   │   │   │   └── [executionId]/
│   │   │   ├── reports/
│   │   │   ├── evidence/
│   │   │   └── settings/
│   │   │
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── projects/
│   │   │   ├── test-cases/
│   │   │   └── assignments/
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       ├── dashboard/
│   │       ├── tests/
│   │       ├── executions/
│   │       ├── reviews/
│   │       ├── evidence/
│   │       ├── notifications/
│   │       ├── search/
│   │       └── admin/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── tests/
│   │   ├── execution/
│   │   ├── review/
│   │   ├── reports/
│   │   ├── evidence/
│   │   └── shared/
│   │
│   ├── features/
│   │   ├── authentication/
│   │   ├── test-management/
│   │   ├── test-execution/
│   │   ├── review/
│   │   ├── reporting/
│   │   └── administration/
│   │
│   ├── hooks/
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── permissions/
│   │   ├── validations/
│   │   ├── constants/
│   │   └── utils/
│   │
│   ├── server/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── seed/
│   │   └── storage/
│   │
│   └── types/
│
├── data/
│   ├── users.json
│   ├── projects.json
│   ├── modules.json
│   ├── environments.json
│   ├── test-cases.json
│   ├── test-steps.json
│   ├── assignments.json
│   ├── executions.json
│   ├── step-results.json
│   ├── evidence.json
│   ├── reviews.json
│   ├── notifications.json
│   └── audit-events.json
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── playwright.config.ts


Adapt where technically appropriate, but maintain clear separation of concerns.

8. DOMAIN MODEL

Create normalized, strongly typed domain models.

Core entities:

User
Role
Project
Module
Environment
TestCase
TestStep
TestAssignment
TestExecution
StepResult
Evidence
Review
Notification
AuditEvent


Relationships:

Project
  ↓
Module
  ↓
TestCase
  ↓
TestStep
  ↓
TestAssignment
  ↓
TestExecution
  ↓
StepResult
  ↓
Evidence
  ↓
Review
  ↓
AuditEvent


Do not use arbitrary untyped objects.

9. USER ROLES

Implement:

Tester
Reviewer
Manager
Admin


Each role must have appropriate permissions.

10. PERMISSION SYSTEM

Create centralized permission helpers:

canViewTest()
canExecuteTest()
canSubmitExecution()
canViewReview()
canReviewExecution()
canApproveExecution()
canRequestRevision()
canManageUsers()
canManageProjects()
canManageTestCases()
canManageAssignments()
canViewReports()


Permissions must be enforced at:

UI

API

server/service layer

Do not rely only on hiding buttons.

11. AUTHENTICATION

Implement a real mock authentication architecture.

Flow:

Login
 ↓
Credential validation
 ↓
OTP
 ↓
Session creation
 ↓
Role dashboard


Login should support:

Employee ID

Password

validation

loading

errors

successful authentication

OTP:

six-digit input

auto-focus

paste support

keyboard support

countdown

resend

invalid OTP

expired OTP

success

Use an HTTP-only session cookie.

Use a replaceable authentication abstraction.

Do not hardcode authentication logic inside pages.

12. DEMO USERS

Seed these demo users:

TE-1001
Priya Sharma
Tester

TE-2001
Rajesh Kumar
Reviewer

TE-3001
Anita Desai
Manager

TE-9001
Admin User
Admin


Demo OTP:

123456


Make the OTP configurable through environment variables.

13. APPLICATION SHELL

Create a reusable application shell.

It should include:

navigation

page header

breadcrumbs where useful

current project/environment context

global search

notification center

user menu

role-aware navigation

responsive navigation

The user must always understand:

where they are

what section they are in

what they can do

what requires attention

Do not create a sidebar consisting only of unexplained icons.

14. GLOBAL SEARCH

Implement a command/search system.

Keyboard shortcut:

Cmd/Ctrl + K


Search:

test case ID

test case title

project

module

tester

execution ID

Group results logically.

Selecting a result should navigate directly to the relevant object.

15. NOTIFICATIONS

Implement notifications.

Events:

test assigned

execution started

execution submitted

review requested

revision requested

execution approved

execution blocked

Notifications must contain deep links.

Unread state must persist.

16. CANONICAL EXECUTION STATUS

Create one source of truth.

enum ExecutionStatus {
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  UNDER_REVIEW = "under_review",
  SENT_BACK = "sent_back",
  APPROVED = "approved",
  BLOCKED = "blocked",
  COMPLETED = "completed"
}


Never create page-specific status strings.

Create centralized display mappings.

For example:

Tester:

sent_back → Revision Required
under_review → Under Review


Reviewer:

sent_back → Revision Requested
under_review → Pending Review


The underlying status remains identical.

17. STATE MACHINE

Implement the state machine in the domain/service layer.

Valid transitions:

ASSIGNED
 ↓
IN_PROGRESS
 ↓
SUBMITTED
 ↓
UNDER_REVIEW
 ├── APPROVED
 │     ↓
 │   COMPLETED
 │
 └── SENT_BACK
       ↓
   IN_PROGRESS


Blocked execution must be handled explicitly.

Every transition must:

validate permission

validate preconditions

update state

create audit event

create notification where appropriate

persist atomically

18. JSON PERSISTENCE

Use JSON repositories initially.

Each repository must support:

readAll()
findById()
findMany()
create()
update()
upsert()
delete()


Write changes atomically using temporary file + rename.

Seed data automatically when required.

The JSON repository layer must be isolated from the UI.

19. FILE STORAGE

Create an evidence storage abstraction.

Interface:

upload()
getUrl()
delete()
validate()


Initial implementation:

data/uploads/


Structure:

data/uploads/{executionId}/{filename}


Make it replaceable by S3/Azure Blob/etc.

20. REALISTIC SEED DATA

Do not use meaningless sample data.

Create realistic Tata Electronics-oriented scenarios.

Projects:

Semiconductor Validation
Power Module QA
Display Driver Testing


Modules:

Authentication
Power Management
Thermal
Signal Integrity
Display
Integration


Test cases:

TC-AUTH-001
Employee Login Validation

TC-PWR-014
Power Module Threshold Validation

TC-THM-008
Thermal Protection Verification

TC-SIG-003
Signal Integrity Validation


Create multiple realistic steps for every test.

21. DEMO DATA STATE

Pre-seed a coherent demonstration.

Priya

One assigned test ready to start.

One execution in progress around step 4/7.

One execution sent back for revision.

Rajesh

One submitted execution pending review.

Anita

Aggregate metrics across the system.

This allows the complete product story to be demonstrated immediately.

22. TESTER DASHBOARD

The tester dashboard should answer:

What do I need to work on?

Show:

assigned tests

in-progress tests

completed tests

failed tests

blocked tests

pending review

revision required

recent activity

priority work

progress

Create an actionable queue.

Do not make the dashboard merely a collection of KPI cards.

23. MY TESTS

Create the main tester test management screen.

Capabilities:

search

status filter

priority filter

module filter

project filter

environment filter

sorting

pagination

optional table/list toggle

contextual actions

Contextual actions:

Assigned → Start
In Progress → Continue
Sent Back → Revise
Under Review → View
Approved → View Results


The user should understand the test's state before opening it.

24. TEST CASE DETAILS

Create a dedicated test case view.

Show:

test ID

title

description

project

module

priority

version

environment

preconditions

test data

assigned tester

steps

history

previous executions

evidence

Organize information logically.

Do not create a giant flat form.

25. TEST EXECUTION WORKSPACE

This is the most important part of the entire application.

The workspace must optimize for:

Read
→ Perform
→ Observe
→ Record
→ Continue


The user must clearly see:

test identity

execution status

progress

step list

current step

action

expected result

actual result

status

comments

evidence

navigation

26. STEP EXECUTION

Each step contains:

Step Number
Action
Expected Result
Actual Result
Status
Comment
Evidence
Timestamp


Step status:

Not Started
In Progress
Passed
Failed
Blocked
Skipped


Support:

previous

next

save

save & continue

finish

submit

27. PROGRESS

Display meaningful progress.

Example:

5 / 7 steps completed


Provide a step navigator.

Users must be able to identify:

completed steps

current step

pending steps

failed steps

blocked steps

28. FAILURE UX

When a tester marks a step as Failed, reveal relevant additional information.

For example:

Actual Result
Failure Description
Comment
Evidence


Do not force irrelevant fields for passed steps.

Validation should depend on the selected status.

29. BLOCKED UX

If a test is blocked:

Require a meaningful block reason.

Examples:

Environment unavailable
Dependency unavailable
Test data unavailable
External service unavailable


Make blocked distinct from failed.

30. AUTOSAVE

Implement real autosave.

Requirements:

debounce around 2 seconds

save step changes

save execution metadata

persistent draft

save state indicator

recovery after refresh

unsaved changes warning

Possible states:

Saving...
Saved
Unsaved changes
Save failed


Do not fake the save indicator.

31. EVIDENCE

Support:

drag and drop

file picker

image preview

file metadata

upload progress

remove before submission

association with execution

association with specific step

Validate file:

type

size

filename

Handle upload failures.

32. SUBMISSION

Before submission, validate:

required steps complete

actual results present

status valid

required evidence present

required comments present

no unresolved steps

Show a confirmation summary:

Total Steps
Passed
Failed
Blocked
Evidence


On submission:

Execution
→ submitted
→ reviewer notification
→ audit event


After submission, appropriate fields become read-only.

33. REVIEW WORKSPACE

Reviewer must have a dedicated experience.

Show:

test case details

tester

execution metadata

every step

expected result

actual result

status

evidence

comments

audit history

Reviewer actions:

Approve
Send Back for Revision


Sending back must require a meaningful comment.

34. REVISION WORKFLOW

This workflow must work perfectly.

Submitted
 ↓
Under Review
 ↓
Sent Back
 ↓
Tester receives notification
 ↓
My Tests shows Revision Required
 ↓
Tester clicks Revise
 ↓
Execution becomes editable
 ↓
Tester fixes issue
 ↓
Tester adds evidence if needed
 ↓
Resubmit
 ↓
Reviewer receives updated execution
 ↓
Approve
 ↓
Completed


Do not require manual page refresh to see workflow state changes when the current data can be updated naturally.

35. AUDIT TRAIL

Track:

login

assignment

execution start

step result changes

evidence upload

save

submission

review

revision

resubmission

approval

Each audit event:

Actor
Action
Entity
Entity ID
Timestamp
Metadata


Create a reusable timeline component.

36. MANAGER DASHBOARD

Manager dashboard should provide:

Execution

total tests

assigned

completed

in progress

failed

blocked

pending review

Quality

pass rate

fail rate

blocked rate

module-level quality

Productivity

tester execution volume

completion rate

backlog

Review

pending reviews

review turnaround

37. REPORTS

Create a proper reports section.

Meaningful visualizations only.

Include:

overall execution status

pass/fail/blocked distribution

module quality

tester productivity

execution trend

review trend

backlog

Use Recharts only where it communicates useful information.

38. ADMINISTRATION

Implement:

Users

list

search

role

status

activate/deactivate

project assignment

Projects

create

edit

status

modules

environments

Test Cases

create

edit

version

steps

priority

module

project

Assignments

assign tests

tester

due date

priority

bulk assignment where appropriate

All mutations must go through API/services and create audit events.

39. SEARCH AND FILTERING

Filtering must actually modify the underlying dataset.

Do not implement decorative filter buttons.

Support:

query

status

priority

module

project

environment

tester

date range where relevant

Allow filters to be combined.

40. RESPONSIVENESS

Optimize primarily for desktop enterprise workflows.

Still support:

laptop

tablet

smaller screens

Execution workspace must adapt intelligently.

For narrow screens:

step navigator can become a selector/drawer

tables can become list/card representations

navigation can become a sheet

dialogs must remain usable

Do not simply shrink desktop content.

41. ACCESSIBILITY

Implement:

semantic HTML

keyboard navigation

focus management

accessible dialogs

accessible dropdowns

labels

ARIA where necessary

screen-reader-friendly statuses

visible focus states

OTP must be keyboard-friendly.

Command palette must be keyboard-friendly.

Execution navigation must be keyboard-friendly.

42. LOADING STATES

Every asynchronous operation needs proper feedback.

Implement:

skeletons

button loading

upload progress

route loading

query loading

mutation loading

Do not use spinners everywhere.

43. EMPTY STATES

Every major section must have a useful empty state.

Examples:

No assigned tests
No pending reviews
No executions
No evidence
No notifications
No projects
No users
No search results


Every empty state should explain what happened and what the user can do next.

44. ERROR STATES

Handle:

API failure

authentication failure

authorization failure

validation failure

upload failure

missing records

session expiration

network failure

conflicting updates

Use human-readable messages.

Do not expose stack traces to users.

45. SECURITY

Implement:

authentication

authorization

secure sessions

input validation

file validation

secure uploads

server-side permission checks

safe error responses

audit logging

Never expose secrets in client code.

46. API DESIGN

Implement typed API routes.

Core APIs:

POST /api/auth/login
POST /api/auth/verify-otp

GET /api/dashboard

GET /api/tests/my
GET /api/tests/[id]

POST /api/executions
GET /api/executions/[id]
PATCH /api/executions/[id]

PATCH /api/executions/[id]/steps/[stepId]

POST /api/executions/[id]/submit

GET /api/reviews/pending
GET /api/reviews/[id]

POST /api/reviews/[id]/approve
POST /api/reviews/[id]/revision

POST /api/evidence

GET /api/notifications
PATCH /api/notifications/[id]/read

GET /api/search

CRUD /api/admin/*


Keep API DTOs strongly typed.

47. CLIENT DATA MANAGEMENT

Use TanStack Query for server state where appropriate.

Create reusable hooks:

useAuth()
useDashboard()
useMyTests()
useTestCase()
useExecution()
useStepResult()
useEvidence()
useReviews()
useNotifications()
useSearch()


Do not duplicate fetch logic across pages.

Invalidate/refetch intelligently after mutations.

48. FORM ARCHITECTURE

Use:

React Hook Form
+
Zod


for complex forms.

Validation must be reusable.

Examples:

loginSchema
otpSchema
stepResultSchema
testCaseSchema
reviewSchema
userSchema
projectSchema


49. STATE CONSISTENCY

This is a hard requirement.

If an execution changes to:

SENT_BACK


then:

Tester Dashboard → Revision Required

My Tests → Revision Required

Execution → Revision Required / editable

Reviewer → Revision Requested

Notification → Revision requested

Every screen must derive this from the same underlying domain state.

Never manually maintain separate status values per page.

50. PERFORMANCE

Plan for large datasets.

Use:

pagination

efficient filtering

memoization where necessary

virtualization where justified

optimized images

route-level loading

minimal client JavaScript

server-side data access where appropriate

Do not introduce unnecessary complexity.

51. COMPONENT SYSTEM

Create reusable components such as:

AppShell
Sidebar
TopBar
Breadcrumbs
CommandPalette
NotificationCenter

StatCard
MetricGroup
StatusBadge
PriorityBadge

TestList
TestTable
TestCard
TestFilters
TestDetail

ExecutionWorkspace
ExecutionProgress
StepNavigator
StepPanel
StepResultForm
EvidenceUploader
EvidencePreview
ExecutionSummary

ReviewWorkspace
ReviewPanel
ReviewTimeline

ActivityTimeline
EmptyState
ErrorState
LoadingSkeleton
ConfirmationDialog


Do not create duplicate components with slightly different names.

52. TABLES VS OTHER UI

Use tables when users need:

comparison

sorting

filtering

bulk operations

structured data scanning

Use lists/cards when users need:

individual work items

execution context

action-oriented workflows

Do not turn the whole application into tables.

53. NO FAKE FUNCTIONALITY

This is critical.

Do not create buttons that merely show:

Success!


without changing application state.

Every important action must perform the actual operation through the appropriate API/service.

Examples:

Start test → creates/updates execution.

Save → persists execution.

Submit → changes status.

Revision → changes status + notification + audit.

Approve → changes status + notification + audit.

Filter → changes displayed data.

Search → queries actual data.

Upload → stores actual evidence.

54. NO PLACEHOLDER CONTENT

Do not leave:

Lorem ipsum
Test 1
Test 2
John Doe
Sample Project
Coming soon
TODO


in the finished product.

Use coherent realistic enterprise demo data.

55. PRIMARY DEMO STORY

The application must support this complete demonstration.

STEP 1 — Tester

Login as Priya.

OTP:

123456


Dashboard appears.

Priya sees:

Assigned Tests
In Progress
Revision Required
Pending Review


STEP 2 — Start Test

Open:

TC-AUTH-001
Employee Login Validation


Start execution.

STEP 3 — Execute

Complete multiple steps.

Example:

Step 1 → Pass
Step 2 → Pass
Step 3 → Pass
Step 4 → Fail
Step 5 → Pass
Step 6 → Pass


For the failed step:

Enter actual result.

Enter failure comment.

Upload screenshot evidence.

STEP 4 — Submit

Show execution summary.

Submit.

Execution becomes:

SUBMITTED


Reviewer receives notification.

Audit event is created.

STEP 5 — Reviewer

Login as Rajesh.

Open pending review.

Inspect:

steps

results

evidence

comments

Choose:

Send Back for Revision


Enter review comment.

STEP 6 — Tester Revision

Priya receives notification.

My Tests displays:

Revision Required


Priya opens execution.

Corrects failed step.

Adds updated evidence.

Resubmits.

STEP 7 — Approval

Rajesh reviews again.

Approve.

Execution transitions:

APPROVED
→
COMPLETED


STEP 8 — Manager

Login as Anita.

Dashboard metrics automatically reflect the completed execution.

No hardcoded metric updates.

The numbers must derive from actual execution state.

56. TESTING

Implement automated testing.

Unit tests

Test:

status transitions

permission helpers

validation schemas

status labels

repository functions

Integration tests

Test:

execution creation

autosave

submission

review

revision

approval

notifications

audit events

E2E

Create a complete Playwright test:

Tester Login
→ OTP
→ Dashboard
→ My Tests
→ Start Execution
→ Execute Steps
→ Fail Step
→ Add Evidence
→ Submit
→ Reviewer Login
→ Review
→ Send Back
→ Tester Revision
→ Resubmit
→ Reviewer Approval
→ Manager Dashboard


Assert actual application state at each stage.

57. QUALITY CHECKS

Before declaring the application complete, run:

npm run lint
npm run typecheck
npm run test
npm run build
npx playwright test


Fix all errors.

Do not bypass errors with:

any


or disabling lint/type checking unless there is a justified reason.

58. IMPLEMENTATION ORDER

Build incrementally.

Phase 1

Foundation:

project setup

dependencies

TypeScript types

shadcn

application shell

domain constants

permissions

repositories

seed data

Phase 2

Authentication:

login

OTP

session

middleware

role routing

Phase 3

Tester:

dashboard

My Tests

Test Details

Execution Workspace

Step execution

Autosave

Evidence

Submission

Phase 4

Reviewer:

review queue

review workspace

approval

revision

resubmission

Phase 5

System:

notifications

audit timeline

global search

Phase 6

Management:

manager dashboard

reporting

analytics

Phase 7

Admin:

users

projects

test cases

assignments

Phase 8

Quality:

responsive behavior

accessibility

loading

empty states

error states

unit tests

integration tests

E2E tests

production build

59. DEVELOPMENT RULES

While implementing:

Inspect the existing repository before changing it.

Preserve useful existing functionality.

Do not rewrite working backend logic unnecessarily.

Do not create duplicate systems.

Keep business logic out of UI components.

Keep API logic out of presentation components.

Keep mock persistence replaceable.

Use reusable components.

Use domain services for business rules.

Use centralized status/state management.

Validate every critical workflow.

Test after each major vertical slice.

Fix errors immediately.

Keep the application runnable throughout development.

60. IMPORTANT: DO NOT OVERBUILD

The application should be sophisticated because the workflow is sophisticated.

Do not add unnecessary features merely to increase feature count.

Do not add:

artificial AI features

meaningless charts

unnecessary animations

complicated navigation

excessive settings

fake integrations

decorative dashboards

features that do not support testing operations

Build the core product exceptionally well.

61. FUTURE EXTENSIBILITY

Architect the system so future capabilities can be added without redesigning the foundation.

Potential future features include:

AI-generated test cases

AI test coverage analysis

AI failure classification

intelligent test prioritization

requirement-to-test traceability

automated test execution integration

CI/CD integration

Jira integration

enterprise SSO

real database

cloud evidence storage

advanced analytics

Do not implement these unless explicitly requested.

Build interfaces that make future integration possible.

62. DEFINITION OF DONE

The application is NOT complete when:

pages exist

buttons exist

screenshots look good

the build passes

The application is complete only when:

Authentication works

Login → OTP → session → role dashboard.

Tester workflow works

Assigned → Start → Execute → Save → Evidence → Submit.

Reviewer workflow works

Pending Review → Inspect → Approve / Revision.

Revision works

Revision Required → Edit → Resubmit → Review.

Approval works

Approve → Completed.

Notifications work

Relevant events create notifications.

Audit works

Important state changes create audit events.

Reporting works

Metrics derive from actual data.

Admin works

Users, projects, test cases and assignments can be managed.

State consistency works

All screens reflect the same domain state.

Persistence works

Refreshing the application does not destroy important state.

Error handling works

Failures are understandable and recoverable.

Responsive behavior works

Core workflows remain usable on smaller screens.

Accessibility works

Keyboard and assistive technology fundamentals are respected.

Tests work

Critical workflows are covered.

63. FINAL PRODUCT STANDARD

Treat this as a real enterprise software product.

The final application should communicate:

Operational reliability

Testing discipline

Traceability

Workflow control

Quality visibility

The tester experience is the highest priority.

The application should make a tester's work significantly easier than spreadsheet-based execution.

The reviewer should be able to review evidence and results efficiently.

The manager should be able to understand testing health immediately.

The administrator should be able to manage the underlying testing system.

64. FINAL COMMAND

Start building the application now.

Do not ask for permission to create individual pages.

Do not stop after scaffolding.

Do not produce only a design prototype.

Implement the complete system progressively according to the phases above.

After each major phase:

verify the implementation

run relevant tests

fix errors

continue to the next phase

At the end, run the complete verification suite and ensure the application starts successfully with:

npm run dev


and builds successfully with:

npm run build


The final result must be a fully navigable, functional, stateful, end-to-end Tata Electronics Test Management & Test Execution Platform.

Build the product, not merely the screens.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4cd2ec50-34de-4770-98d8-0863e5b7d69c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
