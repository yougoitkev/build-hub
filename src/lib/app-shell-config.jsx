import {
  Activity,
  Award,
  BarChart3,
  CalendarDays,
  CalendarOff,
  ClipboardCheck,
  Eye,
  FileText,
  FolderOpen,
  Grid3X3,
  History,
  LayoutDashboard,
  ListTodo,
  Network,
  Settings,
  Shield,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react";

export const TMS_ROLE_META = {
  trainer: {
    id: "trainer",
    label: "Trainer",
    workspaceLabel: "Trainer Workspace",
  },
  supervisor: {
    id: "supervisor",
    label: "Supervisor",
    workspaceLabel: "Supervisor Command Center",
  },
  admin: {
    id: "admin",
    label: "Admin",
    workspaceLabel: "Admin Control Center",
  },
};

const MODULES = {
  dashboard: {
    id: "dashboard",
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Operational control center",
  },
  trainers: {
    id: "trainers",
    title: "Trainers",
    url: "/trainers",
    icon: UserCog,
    description: "Trainer roster and management",
  },
  supervisors: {
    id: "supervisors",
    title: "Supervisors",
    url: "/supervisors",
    icon: Settings,
    description: "Supervisor hierarchy and ownership",
  },
  students: {
    id: "students",
    title: "Students",
    url: "/students",
    icon: Users,
    description: "Learner records and status",
  },
  orgChart: {
    id: "orgChart",
    title: "Org Chart",
    url: "/org-chart",
    icon: Network,
    description: "Supervisor and trainer relationships",
  },
  calendar: {
    id: "calendar",
    title: "Calendar",
    url: "/calendar",
    icon: CalendarDays,
    description: "Schedules, phases, rooms, and conflicts",
  },
  attendance: {
    id: "attendance",
    title: "Attendance",
    url: "/attendance",
    icon: ClipboardCheck,
    description: "Learner attendance and completion capture",
  },
  trainerAttendance: {
    id: "trainerAttendance",
    title: "Trainer Attendance",
    url: "/trainer-attendance",
    icon: ClipboardCheck,
    description: "Trainer attendance and weekly absence reporting",
  },
  leaveRequests: {
    id: "leaveRequests",
    title: "Leave Requests",
    url: "/leave-requests",
    icon: CalendarOff,
    description: "Submit and approve leave requests",
  },
  observations: {
    id: "observations",
    title: "Observations",
    url: "/observations",
    icon: Eye,
    description: "Learner observations for the active session",
  },
  trainerObservations: {
    id: "trainerObservations",
    title: "Trainer Observations",
    url: "/trainer-observations",
    icon: Eye,
    description: "Facilitator observations and KPI scoring",
  },
  trainerUtilization: {
    id: "trainerUtilization",
    title: "Utilization",
    url: "/trainer-utilization",
    icon: BarChart3,
    description: "Productivity, billable time, and utilization",
  },
  compliance: {
    id: "compliance",
    title: "Compliance Tracking",
    url: "/compliance",
    icon: Shield,
    description: "Manual compliance tracking and audit readiness",
  },
  kpi: {
    id: "kpi",
    title: "KPI Scorecards",
    url: "/kpi",
    icon: TrendingUp,
    description: "Trainer and batch KPI performance scorecards",
  },
  progress: {
    id: "progress",
    title: "Progress",
    url: "/progress",
    icon: TrendingUp,
    description: "Training progress, readiness, and transitions",
  },
  skillsMatrix: {
    id: "skillsMatrix",
    title: "Skills Matrix",
    url: "/skills-matrix",
    icon: Grid3X3,
    description: "Trainer capability tracking",
  },
  tasks: {
    id: "tasks",
    title: "Tasks",
    url: "/tasks",
    icon: ListTodo,
    description: "Operational task board and follow-ups",
  },
  materials: {
    id: "materials",
    title: "Materials",
    url: "/materials",
    icon: FileText,
    description: "Training documents and version history",
  },
  certifications: {
    id: "certifications",
    title: "Certifications",
    url: "/certifications",
    icon: Award,
    description: "Certification lifecycle and renewals",
  },
  audit: {
    id: "audit",
    title: "Audit Trail",
    url: "/audit",
    icon: History,
    description: "Cross-module operational log",
  },
  reports: {
    id: "reports",
    title: "Reports",
    url: "/reports",
    icon: FolderOpen,
    description: "Transition, compliance, KPI, and export reporting",
  },
  feedback: {
    id: "feedback",
    title: "Feedback",
    url: "/feedback",
    icon: Shield,
    description: "Trainer and supervisor feedback",
  },
};

const NAVIGATION_SCHEMAS = {
  trainer: [
    {
      title: "Dashboard",
      items: ["dashboard"],
    },
    {
      title: "Daily Operations",
      icon: Activity,
      items: ["calendar", "students", "attendance", "observations", "progress", "leaveRequests"],
    },
    {
      title: "Resources",
      icon: FolderOpen,
      items: ["tasks", "materials", "certifications"],
    },
  ],
  supervisor: [
    {
      title: "Dashboard",
      items: ["dashboard"],
    },
    {
      title: "People",
      icon: Users,
      items: ["trainers", "supervisors", "students", "orgChart"],
    },
    {
      title: "Operations",
      icon: Activity,
      items: ["calendar", "progress", "trainerAttendance", "leaveRequests", "trainerObservations", "trainerUtilization", "skillsMatrix", "compliance", "kpi"],
    },
    {
      title: "Governance",
      icon: FolderOpen,
      items: ["tasks", "materials", "certifications", "audit", "reports", "feedback"],
    },
  ],
  admin: [
    {
      title: "Dashboard",
      items: ["dashboard"],
    },
    {
      title: "People",
      icon: Users,
      items: ["trainers", "supervisors", "students", "orgChart"],
    },
    {
      title: "Operations",
      icon: Activity,
      items: ["calendar", "progress", "trainerAttendance", "leaveRequests", "trainerObservations", "trainerUtilization", "skillsMatrix", "compliance", "kpi"],
    },
    {
      title: "Governance",
      icon: FolderOpen,
      items: ["tasks", "materials", "certifications", "audit", "reports", "feedback"],
    },
  ],
};

const QUICK_ACTION_IDS = {
  trainer: ["attendance", "observations", "calendar", "progress", "leaveRequests", "tasks", "materials", "certifications"],
  supervisor: ["calendar", "compliance", "kpi", "trainerAttendance", "leaveRequests", "trainerObservations", "trainerUtilization", "reports"],
  admin: ["calendar", "compliance", "kpi", "trainerAttendance", "trainerObservations", "trainerUtilization", "reports", "audit"],
};

export const getRoleMeta = (role) => TMS_ROLE_META[role] || TMS_ROLE_META.trainer;

export const getNavigationGroups = (role) => {
  const schema = NAVIGATION_SCHEMAS[role] || NAVIGATION_SCHEMAS.trainer;
  return schema.map((group) => ({
    ...group,
    items: group.items.map((moduleId) => MODULES[moduleId]),
  }));
};

export const getQuickActions = (role) => (QUICK_ACTION_IDS[role] || QUICK_ACTION_IDS.trainer).map((moduleId) => MODULES[moduleId]);

export const getModuleByRoute = (route) => Object.values(MODULES).find((module) => module.url === route) || null;
