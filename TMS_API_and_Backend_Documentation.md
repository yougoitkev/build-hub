# Training Management System (TMS) - API & Backend Documentation

## 1. Architecture Overview
This document outlines the proposed backend architecture for the TMS application to replace the current frontend mock data.
*   **Architecture Style**: RESTful API 
*   **Authentication**: JSON Web Tokens (JWT) with Role-Based Access Control (RBAC).
*   **Recommended Database**: Relational Database (PostgreSQL) given the highly structured and interconnected nature of the data (Trainers -> Classes -> Students -> Attendance/Observations).
*   **Data Format**: JSON for all incoming requests and outgoing responses.

---

## 2. Database Schema (Entities & Relationships)

### 2.1 Users / Trainers (`users`)
Manages access for Supervisors, Admins, and Trainers.
*   `id` (UUID, Primary Key)
*   `email` (String, Unique)
*   `portal_id` (String, Unique)
*   `password_hash` (String)
*   `first_name`, `last_name`, `name` (String)
*   `role` (Enum: `admin`, `supervisor`, `trainer`, `lead`)
*   `status` (Enum: `Active`, `Inactive`, `On Leave`)
*   `supervisor_id` (UUID, Foreign Key -> `users.id` - self-referential)
*   `location`, `language` (String)
*   `created_at`, `updated_at` (Timestamp)

### 2.2 Students / Learners (`students`)
The core profile of trainees going through the system.
*   `id` (UUID, Primary Key)
*   `emp_id` (String, Unique)
*   `first_name`, `last_name` (String)
*   `source`, `status`, `wfh`, `location` (Strings/Enums)
*   `role_assignment`, `billing`, `language` (Strings)
*   `home_email`, `home_phone`, `ntt_bpo_email` (Strings)
*   `windows`, `pcb_req`, `tsys`, `mac_gui`, `ice`, `genesys` (Strings - System Access)
*   `level1`, `level2`, `level3` (Enums: `Complete`, `In Progress`, `Not Started`)
*   `trainer_id` (UUID, Foreign Key -> `users.id`)
*   `tl_name` (String)
*   `notes` (Text)

### 2.3 Training Programs (`programs`)
A cohort/class assigned to a trainer over a date range.
*   `id` (UUID, Primary Key)
*   `title` (String)
*   `course_code` (String)
*   `start_date`, `end_date` (Date)
*   `capacity` (Integer)
*   `trainer_id` (UUID, Foreign Key -> `users.id`)
*   `status` (Enum: `Upcoming`, `Ongoing`, `Completed`)

### 2.4 Enrollments (`enrollments`)
Maps students to specific training programs (Many-to-Many resolution).
*   `id` (UUID, Primary Key)
*   `program_id` (UUID, Foreign Key -> `programs.id`)
*   `student_id` (UUID, Foreign Key -> `students.id`)
*   `status` (Enum: `enrolled`, `dropped`, `completed`)
*   `enrolled_at` (Timestamp)

### 2.5 Sessions (`sessions`)
Daily calendar occurrences generated for a Training Program.
*   `id` (UUID, Primary Key)
*   `program_id` (UUID, Foreign Key -> `programs.id`)
*   `trainer_id` (UUID, Foreign Key -> `users.id`)
*   `date` (Date)
*   `start_time`, `end_time` (Time)
*   `title`, `notes`, `location` (String/Text)
*   `day_number` (Integer)

### 2.6 Attendance (`attendance`)
Daily records linking a student to a specific session.
*   `id` (UUID, Primary Key)
*   `session_id` (UUID, Foreign Key -> `sessions.id`)
*   `student_id` (UUID, Foreign Key -> `students.id`)
*   `date` (Date)
*   `status` (Enum: `Present`, `Absent`, `Late`, `Excused`, `NCNS` - No Call No Show)
*   `notes` (Text)

### 2.7 Observations (`observations`)
Trainer's daily qualitative assessment of a student.
*   `id` (UUID, Primary Key)
*   `session_id` (UUID, Foreign Key -> `sessions.id`)
*   `student_id` (UUID, Foreign Key -> `students.id`)
*   `trainer_id` (UUID, Foreign Key -> `users.id`)
*   `date` (Date)
*   `behavior`, `knowledge`, `engagement`, `soft_skills`, `tech_skills`, `health` (Integer/Enum ratings 1-5 or explicit choices)
*   `notes` (Text)

### 2.8 Audit Logs (`audit_logs`)
Immutable system tracking.
*   `id` (UUID)
*   `action` (String - e.g., 'Trainer Created', 'Attendance Submitted')
*   `user_id` (UUID)
*   `entity_id`, `entity_type` (String)
*   `details` (Text)
*   `created_at` (Timestamp)

---

## 3. Core REST API Endpoints

### 3.1 Authentication
*   **`POST /api/auth/login`**
    *   *Payload*: `{ email, password }`
    *   *Response*: `{ token, user: { id, name, role } }`
*   **`POST /api/auth/logout`**
*   **`GET /api/auth/me`**: Get current logged-in user context.

### 3.2 Users / Trainers Management
*   **`GET /api/users`**
    *   *Query Params*: `?role=trainer&supervisor_id=UUID` (Supports RBAC filtering)
*   **`POST /api/users`**: Create a new user (Admin/Supervisor only).
*   **`PUT /api/users/:id`**: Update details (Assign supervisor, change status).
*   **`GET /api/users/:id/metrics`**: Returns computed avgAttendance, avgProgress, studentCount.

### 3.3 Student Management
*   **`GET /api/students`**
    *   *Query Params*: `?trainer_id=UUID&status=Active` (Trainers only see their own students).
*   **`POST /api/students`**
    *   *Payload*: Full student profile (Personal, Assignment, System Access).
*   **`PUT /api/students/:id`**
*   **`GET /api/students/:id`**: Includes nested populated records (attendance history, observation history, enrollments).

### 3.4 Programs & Scheduling
*   **`GET /api/programs`**
*   **`POST /api/programs`**
    *   *Payload*: `{ title, courseCode, trainerId, templateId, startDate, students: [uuid1, uuid2...] }`
    *   *Backend Logic*: When a program is created, the backend should **automatically** parse the start date and the template duration, calculate business days (skipping weekends/configured system holidays), and bulk insert records into the `sessions` table. It should also bulk insert into the `enrollments` table.
*   **`PUT /api/programs/:id`**

### 3.5 Sessions Calendar
*   **`GET /api/sessions`**
    *   *Query Params*: `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&trainer_id=UUID` (Used to populate the frontend Calendar views).
*   **`PUT /api/sessions/:id`**: Reschedule a specific day.

### 3.6 Attendance Management
*   **`GET /api/attendance`**
    *   *Query Params*: `?program_id=UUID&date=YYYY-MM-DD` (For fetching the Attendance Matrix).
*   **`POST /api/attendance/bulk`**
    *   *Payload*: `[ { sessionId, studentId, status, notes, date }, ... ]`
    *   *Backend Logic*: Update existing records or create new ones for the specific date matrix. Log an 'Attendance Submitted' event in the `audit_logs`.

### 3.7 Observations
*   **`GET /api/observations`**
    *   *Query Params*: `?date=YYYY-MM-DD&trainer_id=UUID`
*   **`POST /api/observations/bulk`**
    *   *Payload*: Array of daily student ratings.

### 3.8 Administration & Reporting
*   **`GET /api/audit-logs`**: Fetch recent system activity paginated.
*   **`GET /api/reports/performance`**: Returns aggregated Gantt chart data for trainers (programs complete, ongoing, upcoming).
*   **`GET /api/options`**: Fetches global frontend drop-down configurations (Levels, Languages, Statuses, Holidays).

---

## 4. Key Business Logic & Authorization Rules

1.  **Role-Based Access Control (RBAC)**:
    *   **Trainers**: Actions limited strictly to elements where `trainer_id == auth.user.id`. They can fetch their students, their programs, post attendance for their programs, etc.
    *   **Supervisors/Admins**: Can read all data. Can create Trainers and view the global command center.
2.  **Cascading Session Generation**:
    *   A massive piece of frontend logic in `CreateProgramPage` is the automatic session mapping. The backend API (`POST /api/programs`) must assume the responsibility of iterating through days, checking against a central `SystemHolidays` table, skipping Saturdays/Sundays, and creating individual `Session` records.
3.  **Metrics Aggregation**:
    *   To keep the UI snappy, endpoints like `/api/users` or `/api/students/:id` should perform database aggregations (e.g., `AVG()` on attendance rates, `COUNT()` on active students) rather than shipping thousands of raw attendance records to the frontend for calculation.
4.  **Immutability of Audit Trails**:
    *   The `audit_logs` table must be strictly append-only. Only Admins should have read access, and no user should have `UPDATE` or `DELETE` access to this table via the API.
