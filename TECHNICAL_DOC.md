# Trainer Hub Technical Documentation

## 1. Purpose
Trainer Hub is a React-based training management frontend for trainers, supervisors, and admins. It manages learners, training programs, sessions, attendance, observations, trainer operations, imports, and reporting.

This document focuses on:
- the application modules
- where each module gets its data
- how "completion" is represented in the current implementation

## 2. Technology Stack
- React with Vite
- React Router for navigation
- Zustand with `persist` middleware for client state
- Tailwind CSS and shadcn/ui for UI
- TanStack Query provider is mounted, but most pages currently use direct `useEffect` + API calls or Zustand state
- Session storage for persisted frontend state

## 3. Application Structure

### 3.1 Entry and layout
- `src/main.jsx`: mounts the application
- `src/App.jsx`: defines all routes
- `src/components/AppShell.jsx`: wraps authenticated routes with the sidebar layout
- `src/components/AppSidebar.jsx`: primary navigation
- `src/components/auth/RequireAuth.jsx`: route guard for authentication and role-based access

### 3.2 Data layers
The app currently uses two data models:

1. Local Zustand/mock-data model
- Main store: `src/store/app-store.js`
- Seed data: `src/lib/mock-data.js`, `src/lib/import-mock-data.js`, `src/lib/phase2-mock-data.js`, `src/lib/phase3-mock-data.js`

2. API-backed model
- API client: `src/data/api.js`
- Backend response normalization: `src/lib/phase-backend.js`

This means the codebase is in a hybrid state: some pages are still store/mock driven, while several newer pages call backend endpoints directly.

## 4. Module Inventory

### 4.1 Core shell and access
- `LoginPage`: user login
- `RequireAuth`: blocks unauthenticated access
- `AppShell` / `AppSidebar`: shared application chrome

### 4.2 Learning and trainee operations
- `Dashboard`: summary landing page
- `StudentsPage`: list and filter students
- `StudentDetailPage`: edit/view a single student
- `CalendarPage`: session calendar view
- `AttendancePage`: learner attendance management
- `ObservationsPage`: learner observation entry and review
- `ProgressPage`: learner milestone and level timeline
- `CourseDetailPage`: course/program detail view
- `CreateProgramPage`: create training programs and sessions

### 4.3 Trainer and supervisor operations
- `TrainersPage`: trainer CRUD and listing
- `TrainerFormPage`: trainer form workflow
- `SupervisorFormPage`: supervisor setup
- `TrainerAttendancePage`: trainer attendance and leave workflow
- `TrainerObservationsPage`: supervisor observations of trainers
- `TrainerUtilizationPage`: billed vs available time
- `OrgChartPage`: supervisor-trainer structure
- `SkillsMatrixPage`: trainer skill matrix
- `AvailabilityPage`: route exists but currently points to `TrainerAttendancePage` in `src/App.jsx`

### 4.4 Operations and governance
- `TasksPage`: task board with statuses and comments
- `MaterialsPage`: training materials and versioning
- `CertificationsPage`: trainer certifications
- `LeaveRequestsPage`: leave request creation and approval
- `ImportManagementPage`: file import validation and apply flow
- `AuditPage`: audit log view
- `ReportsPage`: export/report status
- `FeedbackPage`: trainer/supervisor feedback

### 4.5 Utility and shared components
- `src/components/attendance/*`: attendance matrix, filters, bulk actions, override modal
- `src/components/observations/*`: observation matrix and filters
- `src/components/dashboard/*`: dashboard cards
- `src/components/learning/*`: premium cards and learning UI
- `src/components/ui/*`: shared shadcn-based UI primitives
- `src/hooks/*`: reusable hooks including attendance calculations and mobile helpers

## 5. Route Map
Defined in `src/App.jsx`.

- `/Login`
- `/`
- `/supervisors`
- `/create-program`
- `/courses/:id`
- `/students`
- `/students/:id`
- `/calendar`
- `/attendance`
- `/leave-requests`
- `/observations`
- `/progress`
- `/trainers`
- `/trainer-attendance`
- `/trainer-observations`
- `/trainer-utilization`
- `/org-chart`
- `/feedback`
- `/reports`
- `/skills-matrix`
- `/availability`
- `/tasks`
- `/materials`
- `/certifications`
- `/import`
- `/audit`

Supervisor/admin-only routes are wrapped with `RequireAuth allowedRoles={['supervisor', 'admin']}`.

## 6. State and Data Ownership

### 6.1 Zustand store
`src/store/app-store.js` holds:
- authenticated user
- students
- trainers
- trainings
- sessions
- attendance
- observations
- progress
- feedback
- templates
- holidays
- import/audit data
- trainer attendance, utilization, skills, availability, tasks, materials, certifications

Important store actions:
- `setUser`
- trainer CRUD actions
- `createTrainingProgram`
- `addEnrollment` / `removeEnrollment`
- `updateTraining`
- `addStudent` / `updateStudent`
- `addSession` / `updateSession`
- `submitAttendance`
- `addObservation`
- `addFeedback`
- `batchUpdateAttendance`
- `logAdminEvent`

Persistence is configured with:
- storage key: `tms-app-store`
- storage engine: `sessionStorage`

### 6.2 API client
`src/data/api.js` centralizes backend calls and includes:
- auth token storage in local storage
- GET response caching in memory + session storage
- backend proxy handling
- REST wrappers for each page/domain

Main API groups include:
- `auth`
- `dashboard`
- `trainers`
- `supervisors`
- `studentsPage`
- `trainingPrograms`
- `scheduledTrainings`
- `attendance`
- `observations`
- `feedback`
- `auditLogs`
- `reports`
- `options`
- `trainerAttendance`
- `trainerObservations`
- `trainerUtilization`
- `orgChart`
- `skillsMatrix`
- `availabilityPage`
- `tasksPage`
- `materialsPage`
- `certificationsPage`
- `courseDetail`
- `imports`
- `mappings`

### 6.3 Backend normalization
`src/lib/phase-backend.js` converts backend responses into UI-safe objects. It normalizes:
- ids
- snake_case to camelCase fields
- task status mapping
- trainer/material/certification/task/availability models

## 7. How Completion Is Done

The application does not currently have one global completion engine. Completion is represented in multiple ways depending on the module.

### 7.1 Training program completion
Training/program completion is represented by a plain `status` field.

Where it appears:
- `src/lib/mock-data.js` in `mockTrainings`
- backend scheduled training responses normalized in `src/pages/PerformancePage.jsx`
- pages such as `AttendancePage`, `ObservationsPage`, and `PerformancePage`

Statuses in use:
- `Upcoming`
- `Ongoing`
- `Completed`

How it works now:
- The UI reads `training.status` and uses it directly.
- `PerformancePage` counts completion with `training.status === "Completed"`.
- Gantt bars are colored based on the same status.
- Clicking programs is only enabled for `Upcoming` and `Ongoing` items.

Important limitation:
- completion is not automatically calculated from `endDate`, session completion, attendance, or assessments
- it is currently status-driven data, not rules-driven logic

### 7.2 Student completion
Student completion is represented through level fields on the student record plus progress timeline entries.

Primary fields:
- `student.level1`
- `student.level2`
- `student.level3`
- `student.status`

Allowed level values from `mockOptions.levels`:
- `Not Started`
- `In Progress`
- `Complete`

How it works now:
- `ProgressPage` reads `students` and `progress` from the Zustand store.
- Level summary cards are computed by filtering students whose level fields equal `Complete` or `In Progress`.
- A learner is visually treated as complete for a level when the corresponding field equals `Complete`.
- Timeline entries come from `progress[]`, where each entry also has its own `status`.

Examples from `src/pages/ProgressPage.jsx`:
- L1 complete count: students where `level1 === "Complete"`
- L1 active count: students where `level1 === "In Progress"`
- L2 complete count: students where `level2 === "Complete"`
- At-risk count: students where `status === "Active"` and `level1 !== "Complete"`

Important limitation:
- there is no rule in the store or UI that automatically updates `student.status` to `Completed` when `level1`, `level2`, and `level3` are all `Complete`
- this relationship is implied by data, not enforced by code

### 7.3 Attendance completion
Attendance completion means records were submitted for a session, not that a student completed a program.

How it works:
- `AttendancePage` prepares attendance rows
- `submitAttendance(records)` in `src/store/app-store.js` replaces existing records for the same `studentId + sessionId`
- tiered attendance overrides use `batchUpdateAttendance`

Important limitation:
- attendance submission does not automatically mark a session or training as completed

### 7.4 Observation completion
Observation completion is local page-state based.

In `src/pages/ObservationsPage.jsx`:
- rows marked `_saved` count as completed
- draft rows count separately
- pending is computed as `total - completed - draft`

This is a page workflow metric, not a cross-module completion state.

### 7.5 Task completion
Tasks use workflow status rather than training completion.

Statuses include:
- `New`
- `In Progress`
- `Blocked`
- `Done`

Normalization detail:
- backend `Completed` is converted to UI `Done` in `src/lib/phase-backend.js`

### 7.6 Import completion
Imports have their own pipeline statuses in `ImportManagementPage` and `ReportsPage`, such as:
- `processing`
- `validated`
- `completed`
- `failed`

This completion is specific to import jobs only.

## 8. Actual Completion Flow in the Current Build

### 8.1 Program scheduling flow
1. User creates a program from `CreateProgramPage`.
2. Store action `createTrainingProgram(payload)` creates:
- one training program record
- generated session records based on template days
- enrollment records for selected students
3. The new training is initially stored with status `Upcoming`.

### 8.2 Attendance and observation flow
1. User records attendance in `AttendancePage`.
2. User records learner observations in `ObservationsPage`.
3. These updates are saved to store or backend endpoints depending on the module.
4. They inform reporting and visibility, but do not automatically close a program or complete a learner.

### 8.3 Learner progress flow
1. Student level fields (`level1`, `level2`, `level3`) and progress timeline records are displayed in `ProgressPage`.
2. Completion dashboards are computed from those fields.
3. Final learner completion is therefore data-entry based, not algorithmically derived.

### 8.4 Trainer performance flow
1. `PerformancePage` loads trainers and scheduled trainings from the backend.
2. KPI cards count `Completed`, `Ongoing`, and `Upcoming` programs by reading each training record's `status`.
3. The Gantt chart visualizes completion using the same status field.

## 9. Current Gaps and Risks
- No single source of truth for completion across modules
- No automatic transition from `Upcoming` to `Ongoing` to `Completed`
- No automatic learner graduation rule based on levels, attendance, or observations
- Hybrid architecture means some pages depend on Zustand mock data while others depend on backend endpoints
- `/availability` currently routes to `TrainerAttendancePage`, which may be intentional placeholder behavior

## 10. Recommended Next Step
If the product needs a true completion workflow, add a shared domain rule set such as:
- Program completion = all sessions delivered and program end date passed
- Learner completion = required levels complete and attendance/assessment thresholds met
- Automatic status synchronization between student, program, session, and reporting modules

The best implementation point would be a dedicated completion service or backend-calculated status returned consistently to all pages.
