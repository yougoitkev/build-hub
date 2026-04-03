// ============================================================
// Phase 3 — Mock Data for New RTM Modules
// Skills Matrix, Availability, Tasks, Materials, Certifications
// ============================================================

// ─── SKILL CATEGORIES & DEFINITIONS ────────────────────────
export const skillCategories = [
  { id: "cat-tech", name: "Technical Skills" },
  { id: "cat-soft", name: "Soft Skills" },
  { id: "cat-domain", name: "Domain Knowledge" },
  { id: "cat-tools", name: "Tools & Platforms" },
];

export const skillDefinitions = [
  { id: "sk-1", name: "CRM Systems", categoryId: "cat-tech" },
  { id: "sk-2", name: "Ticketing Tools", categoryId: "cat-tech" },
  { id: "sk-3", name: "Data Analytics", categoryId: "cat-tech" },
  { id: "sk-4", name: "API Integrations", categoryId: "cat-tech" },
  { id: "sk-5", name: "Communication", categoryId: "cat-soft" },
  { id: "sk-6", name: "Leadership", categoryId: "cat-soft" },
  { id: "sk-7", name: "Conflict Resolution", categoryId: "cat-soft" },
  { id: "sk-8", name: "Time Management", categoryId: "cat-soft" },
  { id: "sk-9", name: "Banking & Finance", categoryId: "cat-domain" },
  { id: "sk-10", name: "Insurance", categoryId: "cat-domain" },
  { id: "sk-11", name: "Retail Operations", categoryId: "cat-domain" },
  { id: "sk-12", name: "Salesforce", categoryId: "cat-tools" },
  { id: "sk-13", name: "MS Teams", categoryId: "cat-tools" },
  { id: "sk-14", name: "Power BI", categoryId: "cat-tools" },
];

export const skillLevels = ["Not Assessed", "Beginner", "Intermediate", "Advanced", "Expert"];

export const mockTrainerSkills = [
  { trainerId: "t1", skillId: "sk-1", level: "Advanced" },
  { trainerId: "t1", skillId: "sk-5", level: "Expert" },
  { trainerId: "t1", skillId: "sk-6", level: "Advanced" },
  { trainerId: "t1", skillId: "sk-9", level: "Intermediate" },
  { trainerId: "t1", skillId: "sk-12", level: "Advanced" },
  { trainerId: "t2", skillId: "sk-1", level: "Intermediate" },
  { trainerId: "t2", skillId: "sk-3", level: "Advanced" },
  { trainerId: "t2", skillId: "sk-5", level: "Advanced" },
  { trainerId: "t2", skillId: "sk-11", level: "Expert" },
  { trainerId: "t2", skillId: "sk-14", level: "Intermediate" },
  { trainerId: "t3", skillId: "sk-2", level: "Advanced" },
  { trainerId: "t3", skillId: "sk-7", level: "Intermediate" },
  { trainerId: "t3", skillId: "sk-9", level: "Advanced" },
  { trainerId: "t3", skillId: "sk-10", level: "Beginner" },
  { trainerId: "t4", skillId: "sk-4", level: "Expert" },
  { trainerId: "t4", skillId: "sk-8", level: "Advanced" },
  { trainerId: "t4", skillId: "sk-13", level: "Expert" },
  { trainerId: "t4", skillId: "sk-14", level: "Advanced" },
  { trainerId: "t5", skillId: "sk-1", level: "Beginner" },
  { trainerId: "t5", skillId: "sk-5", level: "Intermediate" },
  { trainerId: "t5", skillId: "sk-8", level: "Beginner" },
];

// ─── AVAILABILITY / LEAVE ──────────────────────────────────
export const leaveTypes = ["Annual Leave", "Sick Leave", "Personal", "Training", "Holiday", "Other"];

export const mockAvailability = [
  { id: "av-1", trainerId: "t1", type: "Annual Leave", startDate: "2026-04-14", endDate: "2026-04-16", notes: "Family vacation", status: "Approved" },
  { id: "av-2", trainerId: "t2", type: "Sick Leave", startDate: "2026-04-07", endDate: "2026-04-07", notes: "", status: "Approved" },
  { id: "av-3", trainerId: "t3", type: "Training", startDate: "2026-04-21", endDate: "2026-04-22", notes: "External certification", status: "Approved" },
  { id: "av-4", trainerId: "t4", type: "Personal", startDate: "2026-04-28", endDate: "2026-04-28", notes: "Appointment", status: "Pending" },
  { id: "av-5", trainerId: "t1", type: "Holiday", startDate: "2026-05-01", endDate: "2026-05-01", notes: "Labor Day", status: "Approved" },
  { id: "av-6", trainerId: "t5", type: "Annual Leave", startDate: "2026-04-10", endDate: "2026-04-11", notes: "", status: "Approved" },
];

// ─── TASKS ─────────────────────────────────────────────────
export const taskStatuses = ["New", "In Progress", "Blocked", "Done"];
export const taskPriorities = ["Low", "Medium", "High", "Urgent"];

export const mockTasks = [
  { id: "task-1", title: "Prepare PCO training materials", description: "Update slides and exercises for upcoming PCO batch", assignedTo: "t1", programId: "tr1", priority: "High", status: "In Progress", dueDate: "2026-04-10", createdAt: "2026-03-28", createdBy: "sup1", comments: [{ id: "c1", text: "Slides v2 uploaded", author: "t1", date: "2026-04-01" }] },
  { id: "task-2", title: "Review student progress reports", description: "Check Q1 progress reports for all students", assignedTo: "t2", programId: null, priority: "Medium", status: "New", dueDate: "2026-04-12", createdAt: "2026-04-01", createdBy: "sup2", comments: [] },
  { id: "task-3", title: "Schedule AML refresher", description: "Coordinate with compliance team for AML update training", assignedTo: "t3", programId: "tr-demo-2", priority: "High", status: "Blocked", dueDate: "2026-04-08", createdAt: "2026-03-25", createdBy: "sup1", comments: [{ id: "c2", text: "Waiting for compliance approval", author: "t3", date: "2026-04-02" }] },
  { id: "task-4", title: "Update certification docs", description: "Refresh certification tracking spreadsheet", assignedTo: "t4", programId: null, priority: "Low", status: "Done", dueDate: "2026-04-05", createdAt: "2026-03-20", createdBy: "sup3", comments: [] },
  { id: "task-5", title: "Conduct PCB lab setup", description: "Set up lab environment for PCB practical sessions", assignedTo: "t5", programId: "tr14", priority: "Medium", status: "New", dueDate: "2026-04-15", createdAt: "2026-04-01", createdBy: "sup2", comments: [] },
  { id: "task-6", title: "Prepare onboarding guide", description: "Create new trainer onboarding documentation", assignedTo: "t1", programId: null, priority: "Medium", status: "In Progress", dueDate: "2026-04-20", createdAt: "2026-03-30", createdBy: "sup1", comments: [] },
  { id: "task-7", title: "Quality audit prep", description: "Prepare materials for quarterly quality audit", assignedTo: "t2", programId: null, priority: "Urgent", status: "In Progress", dueDate: "2026-04-06", createdAt: "2026-04-01", createdBy: "sup2", comments: [{ id: "c3", text: "Gathering evidence docs", author: "t2", date: "2026-04-03" }] },
];

// ─── MATERIALS / DOCUMENTS ─────────────────────────────────
export const mockMaterials = [
  { id: "mat-1", title: "PCO Training Deck v3.2", fileName: "PCO_Training_v3.2.pptx", type: "Presentation", topic: "PCO", account: "Loblaw", locale: "EN-CA", version: "3.2", size: "4.2 MB", uploadedBy: "t1", uploadedAt: "2026-03-28", programId: "tr1", versions: [{ version: "3.2", date: "2026-03-28", uploadedBy: "t1" }, { version: "3.1", date: "2026-03-15", uploadedBy: "t1" }, { version: "3.0", date: "2026-02-20", uploadedBy: "t1" }] },
  { id: "mat-2", title: "AML Compliance Guide", fileName: "AML_Compliance_2026.pdf", type: "Document", topic: "AML", account: "General", locale: "EN-US", version: "2.0", size: "1.8 MB", uploadedBy: "t3", uploadedAt: "2026-03-20", programId: "tr-demo-2", versions: [{ version: "2.0", date: "2026-03-20", uploadedBy: "t3" }, { version: "1.0", date: "2026-01-10", uploadedBy: "t3" }] },
  { id: "mat-3", title: "PCB Lab Exercise Workbook", fileName: "PCB_Lab_Exercises.xlsx", type: "Spreadsheet", topic: "PCB", account: "Loblaw", locale: "EN-CA", version: "1.1", size: "890 KB", uploadedBy: "t2", uploadedAt: "2026-04-01", programId: "tr14", versions: [{ version: "1.1", date: "2026-04-01", uploadedBy: "t2" }] },
  { id: "mat-4", title: "Trainer Onboarding Handbook", fileName: "Onboarding_Handbook.pdf", type: "Document", topic: "Onboarding", account: "Internal", locale: "EN-US", version: "1.0", size: "2.4 MB", uploadedBy: "t1", uploadedAt: "2026-03-15", programId: null, versions: [{ version: "1.0", date: "2026-03-15", uploadedBy: "t1" }] },
  { id: "mat-5", title: "Retail Operations Quick Guide", fileName: "Retail_Ops_QG.pdf", type: "Document", topic: "Retail", account: "Loblaw", locale: "EN-CA", version: "1.3", size: "1.1 MB", uploadedBy: "t3", uploadedAt: "2026-03-25", programId: "tr8", versions: [{ version: "1.3", date: "2026-03-25", uploadedBy: "t3" }, { version: "1.2", date: "2026-02-10", uploadedBy: "t3" }] },
  { id: "mat-6", title: "Communication Skills Workshop", fileName: "Comm_Skills_Video.mp4", type: "Video", topic: "Soft Skills", account: "Internal", locale: "EN-US", version: "1.0", size: "145 MB", uploadedBy: "t4", uploadedAt: "2026-03-10", programId: null, versions: [{ version: "1.0", date: "2026-03-10", uploadedBy: "t4" }] },
];

// ─── CERTIFICATIONS ────────────────────────────────────────
export const certificationTypes = ["Technical", "Compliance", "Soft Skills", "Domain", "Platform"];

export const mockCertifications = [
  { id: "cert-1", trainerId: "t1", name: "Certified PCO Trainer", type: "Technical", level: "Advanced", issuedDate: "2025-06-15", expiryDate: "2026-06-15", status: "Active", issuedBy: "NTT Training Academy" },
  { id: "cert-2", trainerId: "t1", name: "AML Compliance Certification", type: "Compliance", level: "Standard", issuedDate: "2025-09-01", expiryDate: "2026-09-01", status: "Active", issuedBy: "Compliance Board" },
  { id: "cert-3", trainerId: "t2", name: "Salesforce Administrator", type: "Platform", level: "Intermediate", issuedDate: "2025-03-10", expiryDate: "2026-03-10", status: "Expired", issuedBy: "Salesforce" },
  { id: "cert-4", trainerId: "t2", name: "PCB Operations Specialist", type: "Domain", level: "Advanced", issuedDate: "2025-11-20", expiryDate: "2026-11-20", status: "Active", issuedBy: "NTT Training Academy" },
  { id: "cert-5", trainerId: "t3", name: "Banking & Finance Fundamentals", type: "Domain", level: "Standard", issuedDate: "2025-01-15", expiryDate: "2026-01-15", status: "Expired", issuedBy: "Finance Institute" },
  { id: "cert-6", trainerId: "t3", name: "Retail Training Specialist", type: "Technical", level: "Advanced", issuedDate: "2025-08-22", expiryDate: "2026-08-22", status: "Active", issuedBy: "NTT Training Academy" },
  { id: "cert-7", trainerId: "t4", name: "Power BI Data Analyst", type: "Platform", level: "Advanced", issuedDate: "2026-01-05", expiryDate: "2027-01-05", status: "Active", issuedBy: "Microsoft" },
  { id: "cert-8", trainerId: "t4", name: "Advanced Communication Coach", type: "Soft Skills", level: "Expert", issuedDate: "2025-07-10", expiryDate: "2026-07-10", status: "Active", issuedBy: "ICF" },
  { id: "cert-9", trainerId: "t5", name: "CRM Basics", type: "Technical", level: "Beginner", issuedDate: "2026-02-01", expiryDate: "2027-02-01", status: "Active", issuedBy: "NTT Training Academy" },
  { id: "cert-10", trainerId: "t1", name: "Leadership Excellence", type: "Soft Skills", level: "Advanced", issuedDate: "2025-04-01", expiryDate: "2026-04-01", status: "Renewal Due", issuedBy: "Leadership Institute" },
];

// ─── NOTIFICATION CONFIGS ──────────────────────────────────
export const notificationConfigs = [
  { id: "nc-1", type: "session_reminder", timing: "24h", enabled: true, roles: ["trainer"] },
  { id: "nc-2", type: "session_reminder", timing: "48h", enabled: true, roles: ["trainer", "supervisor"] },
  { id: "nc-3", type: "cert_expiry", timing: "90d", enabled: true, roles: ["trainer", "supervisor"] },
  { id: "nc-4", type: "cert_expiry", timing: "30d", enabled: true, roles: ["trainer", "supervisor"] },
  { id: "nc-5", type: "cert_expiry", timing: "7d", enabled: true, roles: ["trainer", "supervisor"] },
  { id: "nc-6", type: "utilization_alert", timing: "weekly", enabled: true, roles: ["supervisor"] },
  { id: "nc-7", type: "task_overdue", timing: "daily", enabled: true, roles: ["trainer", "supervisor"] },
];
