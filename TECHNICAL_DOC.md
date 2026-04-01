# Trainer Hub (TMS) Technical Documentation

## Overview
The **Trainer Hub (TMS)** is a modern, responsive web application designed for trainers to manage students, sessions, attendance, and progress tracking. It provides a centralized dashboard for monitoring learning activities and administrative tasks.

## Tech Stack
- **Frontend Framework**: React (Vite-based)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS / Lucide React (Icons)
- **Components**: shadcn/ui (Radix UI based)
- **Routing**: React Router DOM

## Application Architecture

### 1. Root & Routing
The entry point is `src/App.jsx`. It defines the main router with a base path of `/TMS`.
- **Layout**: Consists of an `AppShell` which includes a persistent sidebar (`AppSidebar`) and a top header.
- **Providers**: Wraps the app in `QueryClientProvider` and `TooltipProvider`.

### 2. State & Data Flow
- **Global Store**: Centralized state management via `src/store/app-store.js`. This handles:
    - Current authenticated user
    - Collections of students, trainers, sessions, and attendance
    - Notifications and feedback
- **Data Source**: Currently uses a comprehensive mock data library (`src/lib/mock-data.js`) for all entities.
- **Persistence**: State is currently in-memory. Actions like `submitAttendance` or `addStudent` update the Zustand store.

## Core Module Flows

### Navigation & Layout
Users interact with the application through the **Sidebar**, which categories navigation into:
- **Learning**: Dashboard, Students, Calendar, Attendance, Observations, Progress.
- **Management**: Trainers, Feedback, Reports, Import Status.

### Key Working Flows

#### A. Attendance Marking Flow
1. **Selection**: User navigates to `AttendancePage` and selects a session from the dropdown.
2. **Bulk Actions**: Options to mark "All Present" or "All Absent" for the session.
3. **Individual Marking**: User sets status (Present/Absent/Excused) and adds optional notes per student.
4. **Submission**: Clicking "Save Attendance" triggers the `submitAttendance` action in the store, which updates the local attendance records.

#### B. Student & Trainer Management
- **Lists**: Grid/List views of Students and Trainers.
- **Details**: Clicking a student navigates to `StudentDetailPage` showing their full profile, progress levels, and notes.

#### C. Observations & Progress
- **Tracking**: Trainers record behavioral and knowledge snapshots in `ObservationsPage`.
- **Progress**: Visual tracking of levels (1, 2, 3) and certification status in `ProgressPage`.

### Components & UI
- **Premium Design**: Heavy use of custom "Premium" variants (e.g., `PremiumCard`) for a high-end aesthetic.
- **Micro-interactions**: Framer Motion and shadcn transitions.
- **Feedback**: uses `sonner` for toast notifications upon successful actions.

## Future Integration Points
- **API Connectivity**: Replace `mock-data.js` imports in `app-store.js` with async `fetch`/`axios` calls to a backend.
- **Authentication**: Implementing a real Auth provider (e.g., MSAL, Firebase, or JWT).
- **Reporting**: Exporting dashboards to CSV/Excel (placeholder buttons exist in several layouts).
