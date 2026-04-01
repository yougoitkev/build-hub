// ============================================================
// TMS — Rich Interconnected Dummy Data
// Single source of truth for all modules
// ============================================================

export const mockOptions = {
  sources: ["Referral", "Job Board", "Internal", "Partner", "Walk-in"],
  statuses: ["Active", "On Hold", "Completed", "Dropped"],
  wfhOptions: ["Yes", "No", "Partial"],
  levels: ["Not Started", "In Progress", "Complete"],
  roles: ["Agent", "Senior Agent", "Team Lead", "QA"],
  billing: ["Billable", "Non-Billable", "Training"],
  languages: ["English", "Spanish", "French", "Portuguese", "Mandarin"],
  trainerTypes: ["Junior", "Senior", "Lead", "Onsite", "Remote"],
  trainerRoles: ["Lead Trainer", "Senior Trainer", "Junior Trainer", "Specialist"],
  trainerStatuses: ["Active", "On Leave", "Inactive"],
  leaderOptions: ["Yes", "No"],
  behaviorOptions: ["Excellent", "Good", "Needs Improvement", "Unsatisfactory"],
  feedbackCategories: ["Communication", "Knowledge", "Punctuality", "Engagement", "Leadership"],
  trainingNames: [
    "Loblaw - PCO",
    "Loblaw - PCO Voice and Email",
    "Loblaw - PCO/Holt",
    "Loblaw PCX/SDM RX",
    "Loblaw - PCX",
    "Loblaw PCX/SDM RX/GOC",
    "Loblaw - GOC",
    "Loblaw - Retail",
    "Loblaw - PCO/PCX",
    "Loblaw -Holt",
    "Loblaw - SDM Retail",
    "Manager",
    "PCB Off-line",
    "PCB",
    "PP",
    "PCB - RSA",
    "PCB - RSA Fraud/ Tier 2",
    "PCB/PP/FSA",
    "PCB - RSA\\ESC",
    "PCB Tier 1/ Tier 2",
    "PCB - Tier 2",
    "PCB/PP",
    "PCB /DSA",
    "PCB - Round 2",
    "PCB - Cert 2025",
    "Settements and Reconsiliation",
    "Credit Offline",
    "CSI/FT",
    "JRP",
    "JRP/SR",
    "Financial Transactions",
    "AML",
    "can use in Jan - pending",
    "PCB Only",
    "PCB"
  ],
};

export const systemHolidays = [
  "2026-03-20",
  "2026-04-03",
  "2026-05-01",
];

export const mockTemplates = [
  { id: "tmpl-1", name: "Standard 10-Day Onboarding", days: 10, defaultCapacity: 25 },
  { id: "tmpl-2", name: "Fast-Track 5-Day Cert", days: 5, defaultCapacity: 15 },
  { id: "tmpl-3", name: "2-Day QA Specialization", days: 2, defaultCapacity: 10 },
  { id: "tmpl-4", name: "15-Day Advanced Training", days: 15, defaultCapacity: 20 },
];

// ─── TRAINER COLORS (for calendar legend) ──────────────────
export const TRAINER_COLORS = {
  t1: { bg: "bg-blue-500", text: "text-blue-700", light: "bg-blue-100", border: "border-blue-300", hex: "#3b82f6" },
  t2: { bg: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-100", border: "border-emerald-300", hex: "#10b981" },
  t3: { bg: "bg-purple-500", text: "text-purple-700", light: "bg-purple-100", border: "border-purple-300", hex: "#8b5cf6" },
  t4: { bg: "bg-amber-500", text: "text-amber-700", light: "bg-amber-100", border: "border-amber-300", hex: "#f59e0b" },
  t5: { bg: "bg-rose-500", text: "text-rose-700", light: "bg-rose-100", border: "border-rose-300", hex: "#f43f5e" },
};

// ─── TRAINERS ──────────────────────────────────────────────
export const mockTrainers = [
  { id: "t1", firstName: "John", lastName: "Smith", portalId: "P-8821", name: "John Smith", email: "jsmith@ntt.com", type: "Lead", role: "Lead Trainer", status: "Active", leader: "Yes", supervisor: "Rachel Adams", location: "Miami", language: "English", studentCount: 8, avgAttendance: 94, avgProgress: 82 },
  { id: "t2", firstName: "Sarah", lastName: "Lee", portalId: "P-4422", name: "Sarah Lee", email: "slee@ntt.com", type: "Senior", role: "Senior Trainer", status: "Active", leader: "No", supervisor: "Marcus Johnson", location: "Austin", language: "English", studentCount: 7, avgAttendance: 88, avgProgress: 71 },
  { id: "t3", firstName: "Carlos", lastName: "Rivera", portalId: "P-1103", name: "Carlos Rivera", email: "crivera@ntt.com", type: "Onsite", role: "Senior Trainer", status: "Active", leader: "No", supervisor: "Rachel Adams", location: "Miami", language: "Spanish", studentCount: 5, avgAttendance: 91, avgProgress: 76 },
  { id: "t4", firstName: "Lisa", lastName: "Wang", portalId: "P-5504", name: "Lisa Wang", email: "lwang@ntt.com", type: "Remote", role: "Specialist", status: "Active", leader: "Yes", supervisor: "Patricia Chen", location: "Dallas", language: "Mandarin", studentCount: 3, avgAttendance: 96, avgProgress: 89 },
  { id: "t5", firstName: "David", lastName: "Kim", portalId: "P-2205", name: "David Kim", email: "dkim@ntt.com", type: "Junior", role: "Junior Trainer", status: "Active", leader: "No", supervisor: "Marcus Johnson", location: "Austin", language: "English", studentCount: 2, avgAttendance: 82, avgProgress: 60 },
];

// ─── TRAINING PROGRAMS ─────────────────────────────────────
export const mockTrainings = [
  { id: "tr1", title: "Loblaw - PCO", startDate: "2026-03-01", endDate: "2026-03-12", capacity: 25, trainerId: "t1", status: "Completed" },
  { id: "tr2", title: "Loblaw - PCO Voice and Email", startDate: "2026-03-13", endDate: "2026-03-25", capacity: 20, trainerId: "t2", status: "Completed" },
  { id: "tr3", title: "Loblaw - PCO/Holt", startDate: "2026-03-26", endDate: "2026-04-02", capacity: 20, trainerId: "t1", status: "Ongoing" },
  { id: "tr4", title: "Loblaw PCX/SDM RX", startDate: "2026-04-01", endDate: "2026-04-15", capacity: 15, trainerId: "t3", status: "Ongoing" },
  { id: "tr5", title: "Loblaw - PCX", startDate: "2026-04-16", endDate: "2026-04-25", capacity: 15, trainerId: "t2", status: "Upcoming" },
  { id: "tr6", title: "Loblaw PCX/SDM RX/GOC", startDate: "2026-04-10", endDate: "2026-04-12", capacity: 10, trainerId: "t4", status: "Ongoing" },
  { id: "tr7", title: "Loblaw - GOC", startDate: "2026-05-01", endDate: "2026-05-15", capacity: 20, trainerId: "t1", status: "Upcoming" },
  { id: "tr8", title: "Loblaw - Retail", startDate: "2026-03-18", endDate: "2026-03-20", capacity: 10, trainerId: "t5", status: "Completed" },
  { id: "tr9", title: "Loblaw - PCO/PCX", startDate: "2026-04-05", endDate: "2026-04-18", capacity: 20, trainerId: "t1", status: "Ongoing" },
  { id: "tr10", title: "Loblaw -Holt", startDate: "2026-04-20", endDate: "2026-04-30", capacity: 15, trainerId: "t2", status: "Upcoming" },
  { id: "tr11", title: "Loblaw - SDM Retail", startDate: "2026-05-05", endDate: "2026-05-16", capacity: 20, trainerId: "t3", status: "Upcoming" },
  { id: "tr12", title: "Manager", startDate: "2026-03-10", endDate: "2026-03-14", capacity: 10, trainerId: "t4", status: "Completed" },
  { id: "tr13", title: "PCB Off-line", startDate: "2026-03-15", endDate: "2026-03-20", capacity: 15, trainerId: "t1", status: "Completed" },
  { id: "tr14", title: "PCB", startDate: "2026-04-01", endDate: "2026-04-10", capacity: 25, trainerId: "t2", status: "Ongoing" },
  { id: "tr15", title: "PP", startDate: "2026-04-05", endDate: "2026-04-12", capacity: 20, trainerId: "t3", status: "Ongoing" },
  { id: "tr16", title: "PCB - RSA", startDate: "2026-04-15", endDate: "2026-04-25", capacity: 15, trainerId: "t1", status: "Upcoming" },
  { id: "tr17", title: "PCB - RSA Fraud/ Tier 2", startDate: "2026-04-20", endDate: "2026-05-02", capacity: 15, trainerId: "t4", status: "Upcoming" },
  { id: "tr18", title: "PCB/PP/FSA", startDate: "2026-03-22", endDate: "2026-04-03", capacity: 20, trainerId: "t5", status: "Ongoing" },
  { id: "tr19", title: "PCB - RSA\\ESC", startDate: "2026-05-01", endDate: "2026-05-10", capacity: 15, trainerId: "t2", status: "Upcoming" },
  { id: "tr20", title: "PCB Tier 1/ Tier 2", startDate: "2026-04-08", endDate: "2026-04-18", capacity: 20, trainerId: "t3", status: "Ongoing" },
  { id: "tr21", title: "PCB - Tier 2", startDate: "2026-04-22", endDate: "2026-05-05", capacity: 15, trainerId: "t1", status: "Upcoming" },
  { id: "tr22", title: "PCB/PP", startDate: "2026-03-25", endDate: "2026-04-05", capacity: 20, trainerId: "t4", status: "Ongoing" },
  { id: "tr23", title: "PCB /DSA", startDate: "2026-05-10", endDate: "2026-05-20", capacity: 15, trainerId: "t5", status: "Upcoming" },
  { id: "tr24", title: "PCB - Round 2", startDate: "2026-05-15", endDate: "2026-05-25", capacity: 20, trainerId: "t2", status: "Upcoming" },
  { id: "tr25", title: "PCB - Cert 2025", startDate: "2026-03-05", endDate: "2026-03-15", capacity: 25, trainerId: "t1", status: "Completed" },
  { id: "tr26", title: "Settements and Reconsiliation", startDate: "2026-04-12", endDate: "2026-04-22", capacity: 10, trainerId: "t3", status: "Ongoing" },
  { id: "tr27", title: "Credit Offline", startDate: "2026-04-25", endDate: "2026-05-05", capacity: 10, trainerId: "t4", status: "Upcoming" },
  { id: "tr28", title: "CSI/FT", startDate: "2026-05-08", endDate: "2026-05-18", capacity: 15, trainerId: "t5", status: "Upcoming" },
  { id: "tr29", title: "JRP", startDate: "2026-03-20", endDate: "2026-03-28", capacity: 10, trainerId: "t2", status: "Completed" },
  { id: "tr30", title: "JRP/SR", startDate: "2026-04-02", endDate: "2026-04-10", capacity: 10, trainerId: "t1", status: "Ongoing" },
  { id: "tr31", title: "Financial Transactions", startDate: "2026-04-15", endDate: "2026-04-25", capacity: 15, trainerId: "t3", status: "Upcoming" },
  { id: "tr32", title: "AML", startDate: "2026-05-01", endDate: "2026-05-08", capacity: 10, trainerId: "t4", status: "Upcoming" },
  { id: "tr33", title: "can use in Jan - pending", startDate: "2026-05-12", endDate: "2026-05-22", capacity: 10, trainerId: "t5", status: "Upcoming" },
  { id: "tr34", title: "PCB Only", startDate: "2026-05-12", endDate: "2026-05-22", capacity: 20, trainerId: "t5", status: "Upcoming" },
  { id: "tr35", title: "PCB", startDate: "2026-05-12", endDate: "2026-05-22", capacity: 10, trainerId: "t1", status: "Upcoming" },
  // Demo Sessions (April 2026)
  { id: "tr-demo-1", title: "Loblaw - PCO", startDate: "2026-04-01", endDate: "2026-04-10", capacity: 25, trainerId: "t1", status: "Ongoing", courseCode: "LPCO-001" },
  { id: "tr-demo-2", title: "AML", startDate: "2026-04-01", endDate: "2026-04-05", capacity: 15, trainerId: "t3", status: "Ongoing", courseCode: "AML-01" },
  { id: "tr-demo-3", title: "PCB", startDate: "2026-04-02", endDate: "2026-04-12", capacity: 20, trainerId: "t2", status: "Upcoming", courseCode: "PCB-2026" },
];

// ─── STUDENTS ──────────────────────────────────────────────
export const mockStudents = [
  { id: "s1", source: "Referral", lastName: "Garcia", firstName: "Maria", location: "Miami", wfh: "No", status: "Active", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Billable", tl: "John Smith", language: "Spanish", empId: "E1001", windows: "W-4421", nttBpoEmail: "mgarcia@ntt.com", pcbReq: "PCB-101", homePhone: "(305) 555-0101", homeEmail: "maria.g@email.com", tsys: "T-220", macGui: "M-110", ice: "ICE-01", genesys: "G-301", notes: "Quick learner, strong initiative.", trainerId: "t1", createdAt: "2025-12-01", updatedAt: "2026-03-10", lastModifiedBy: "t1" },
  { id: "s2", source: "Job Board", lastName: "Chen", firstName: "Wei", location: "Austin", wfh: "Yes", status: "Active", level1: "In Progress", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Training", tl: "John Smith", language: "English", empId: "E1002", windows: "W-4422", nttBpoEmail: "wchen@ntt.com", pcbReq: "PCB-102", homePhone: "(512) 555-0102", homeEmail: "wei.c@email.com", tsys: "T-221", macGui: "M-111", ice: "ICE-02", genesys: "G-302", notes: "Needs extra support with system access.", trainerId: "t1", createdAt: "2026-01-15", updatedAt: "2026-03-01", lastModifiedBy: "t1" },
  { id: "s3", source: "Internal", lastName: "Johnson", firstName: "Alex", location: "Dallas", wfh: "Partial", status: "On Hold", level1: "Complete", level2: "Complete", level3: "In Progress", roleAssignment: "Senior Agent", billing: "Billable", tl: "John Smith", language: "English", empId: "E1003", windows: "W-4423", nttBpoEmail: "ajohnson@ntt.com", pcbReq: "PCB-103", homePhone: "(214) 555-0103", homeEmail: "alex.j@email.com", tsys: "T-222", macGui: "M-112", ice: "ICE-03", genesys: "G-303", notes: "On hold due to personal leave.", trainerId: "t1", createdAt: "2025-11-10", updatedAt: "2026-02-15", lastModifiedBy: "t1" },
  { id: "s4", source: "Partner", lastName: "Patel", firstName: "Ravi", location: "Miami", wfh: "No", status: "Completed", level1: "Complete", level2: "Complete", level3: "Complete", roleAssignment: "QA", billing: "Billable", tl: "John Smith", language: "English", empId: "E1004", windows: "W-4424", nttBpoEmail: "rpatel@ntt.com", pcbReq: "PCB-104", homePhone: "(305) 555-0104", homeEmail: "ravi.p@email.com", tsys: "T-223", macGui: "M-113", ice: "ICE-04", genesys: "G-304", notes: "Completed all levels ahead of schedule.", trainerId: "t1", createdAt: "2025-09-01", updatedAt: "2026-01-20", lastModifiedBy: "t1" },
  { id: "s5", source: "Walk-in", lastName: "Williams", firstName: "Jordan", location: "Austin", wfh: "Yes", status: "Active", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Non-Billable", tl: "John Smith", language: "English", empId: "E1005", windows: "W-4425", nttBpoEmail: "jwilliams@ntt.com", pcbReq: "PCB-105", homePhone: "(512) 555-0105", homeEmail: "jordan.w@email.com", tsys: "T-224", macGui: "M-114", ice: "ICE-05", genesys: "G-305", notes: "Good progress, improving consistently.", trainerId: "t1", createdAt: "2026-02-01", updatedAt: "2026-03-05", lastModifiedBy: "t1" },
  { id: "s6", source: "Referral", lastName: "Brown", firstName: "Taylor", location: "Miami", wfh: "No", status: "Active", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Billable", tl: "Sarah Lee", language: "English", empId: "E1006", windows: "W-4431", nttBpoEmail: "tbrown@ntt.com", pcbReq: "PCB-106", homePhone: "(305) 555-0106", homeEmail: "taylor.b@email.com", tsys: "T-230", macGui: "M-120", ice: "ICE-06", genesys: "G-311", notes: "Progressing well in Tier 1A.", trainerId: "t2", createdAt: "2026-01-20", updatedAt: "2026-03-14", lastModifiedBy: "t2" },
  { id: "s7", source: "Internal", lastName: "Davis", firstName: "Morgan", location: "Austin", wfh: "Partial", status: "Active", level1: "Complete", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Training", tl: "Sarah Lee", language: "English", empId: "E1007", windows: "W-4432", nttBpoEmail: "mdavis@ntt.com", pcbReq: "PCB-107", homePhone: "(512) 555-0107", homeEmail: "morgan.d@email.com", tsys: "T-231", macGui: "M-121", ice: "ICE-07", genesys: "G-312", notes: "Completed Pre-Process, ready for Tier 1.", trainerId: "t2", createdAt: "2026-01-25", updatedAt: "2026-03-16", lastModifiedBy: "t2" },
  { id: "s8", source: "Job Board", lastName: "Martinez", firstName: "Ana", location: "Miami", wfh: "No", status: "Active", level1: "In Progress", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Training", tl: "Sarah Lee", language: "Spanish", empId: "E1008", windows: "W-4433", nttBpoEmail: "amartinez@ntt.com", pcbReq: "PCB-108", homePhone: "(305) 555-0108", homeEmail: "ana.m@email.com", tsys: "T-232", macGui: "M-122", ice: "ICE-08", genesys: "G-313", notes: "Bilingual asset, on track.", trainerId: "t2", createdAt: "2026-02-01", updatedAt: "2026-03-14", lastModifiedBy: "t2" },
  { id: "s9", source: "Partner", lastName: "Anderson", firstName: "Chris", location: "Dallas", wfh: "Yes", status: "Dropped", level1: "In Progress", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Non-Billable", tl: "Sarah Lee", language: "English", empId: "E1009", windows: "W-4434", nttBpoEmail: "canderson@ntt.com", pcbReq: "PCB-109", homePhone: "(214) 555-0109", homeEmail: "chris.a@email.com", tsys: "T-233", macGui: "M-123", ice: "ICE-09", genesys: "G-314", notes: "Dropped due to personal circumstances.", trainerId: "t2", createdAt: "2026-02-05", updatedAt: "2026-03-01", lastModifiedBy: "t2" },
  { id: "s10", source: "Walk-in", lastName: "Thomas", firstName: "Jamie", location: "Austin", wfh: "No", status: "Active", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Billable", tl: "Sarah Lee", language: "English", empId: "E1010", windows: "W-4435", nttBpoEmail: "jthomas@ntt.com", pcbReq: "PCB-110", homePhone: "(512) 555-0110", homeEmail: "jamie.t@email.com", tsys: "T-234", macGui: "M-124", ice: "ICE-10", genesys: "G-315", notes: "Consistently strong attendance.", trainerId: "t2", createdAt: "2026-02-10", updatedAt: "2026-03-15", lastModifiedBy: "t2" },
  { id: "s11", source: "Referral", lastName: "Jackson", firstName: "Riley", location: "Miami", wfh: "No", status: "Active", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Billable", tl: "Carlos Rivera", language: "Spanish", empId: "E1011", windows: "W-4441", nttBpoEmail: "rjackson@ntt.com", pcbReq: "PCB-111", homePhone: "(305) 555-0111", homeEmail: "riley.j@email.com", tsys: "T-240", macGui: "M-130", ice: "ICE-11", genesys: "G-321", notes: "Strong bilingual performance.", trainerId: "t3", createdAt: "2026-02-15", updatedAt: "2026-03-22", lastModifiedBy: "t3" },
  { id: "s12", source: "Internal", lastName: "White", firstName: "Casey", location: "Miami", wfh: "Partial", status: "Active", level1: "In Progress", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Training", tl: "Carlos Rivera", language: "English", empId: "E1012", windows: "W-4442", nttBpoEmail: "cwhite@ntt.com", pcbReq: "PCB-112", homePhone: "(305) 555-0112", homeEmail: "casey.w@email.com", tsys: "T-241", macGui: "M-131", ice: "ICE-12", genesys: "G-322", notes: "Needs additional coaching on TSYS.", trainerId: "t3", createdAt: "2026-02-18", updatedAt: "2026-03-20", lastModifiedBy: "t3" },
  { id: "s13", source: "Job Board", lastName: "Harris", firstName: "Jordan", location: "Dallas", wfh: "Yes", status: "Active", level1: "Complete", level2: "Complete", level3: "Not Started", roleAssignment: "Senior Agent", billing: "Billable", tl: "Carlos Rivera", language: "English", empId: "E1013", windows: "W-4443", nttBpoEmail: "jharris@ntt.com", pcbReq: "PCB-113", homePhone: "(214) 555-0113", homeEmail: "jordan.h@email.com", tsys: "T-242", macGui: "M-132", ice: "ICE-13", genesys: "G-323", notes: "Ready for Tier 1B Nesting.", trainerId: "t3", createdAt: "2026-01-05", updatedAt: "2026-03-18", lastModifiedBy: "t3" },
  { id: "s14", source: "Referral", lastName: "Lopez", firstName: "Diego", location: "Miami", wfh: "No", status: "On Hold", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Billable", tl: "Carlos Rivera", language: "Spanish", empId: "E1014", windows: "W-4444", nttBpoEmail: "dlopez@ntt.com", pcbReq: "PCB-114", homePhone: "(305) 555-0114", homeEmail: "diego.l@email.com", tsys: "T-243", macGui: "M-133", ice: "ICE-14", genesys: "G-324", notes: "On hold — awaiting system access.", trainerId: "t3", createdAt: "2026-01-20", updatedAt: "2026-03-10", lastModifiedBy: "t3" },
  { id: "s15", source: "Walk-in", lastName: "Gonzalez", firstName: "Sofia", location: "Miami", wfh: "No", status: "Active", level1: "In Progress", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Training", tl: "Carlos Rivera", language: "Spanish", empId: "E1015", windows: "W-4445", nttBpoEmail: "sgonzalez@ntt.com", pcbReq: "PCB-115", homePhone: "(305) 555-0115", homeEmail: "sofia.g@email.com", tsys: "T-244", macGui: "M-134", ice: "ICE-15", genesys: "G-325", notes: "Fast learner, excellent attitude.", trainerId: "t3", createdAt: "2026-02-25", updatedAt: "2026-03-25", lastModifiedBy: "t3" },
  { id: "s16", source: "Partner", lastName: "Lee", firstName: "Kevin", location: "Dallas", wfh: "Yes", status: "Active", level1: "Complete", level2: "Complete", level3: "In Progress", roleAssignment: "Team Lead", billing: "Billable", tl: "Lisa Wang", language: "Mandarin", empId: "E1016", windows: "W-4451", nttBpoEmail: "klee@ntt.com", pcbReq: "PCB-116", homePhone: "(214) 555-0116", homeEmail: "kevin.l@email.com", tsys: "T-250", macGui: "M-140", ice: "ICE-16", genesys: "G-331", notes: "High performer on Collections track.", trainerId: "t4", createdAt: "2025-10-01", updatedAt: "2026-03-28", lastModifiedBy: "t4" },
  { id: "s17", source: "Referral", lastName: "Wu", firstName: "Emily", location: "Dallas", wfh: "Partial", status: "Active", level1: "Complete", level2: "In Progress", level3: "Not Started", roleAssignment: "Agent", billing: "Billable", tl: "Lisa Wang", language: "Mandarin", empId: "E1017", windows: "W-4452", nttBpoEmail: "ewu@ntt.com", pcbReq: "PCB-117", homePhone: "(214) 555-0117", homeEmail: "emily.w@email.com", tsys: "T-251", macGui: "M-141", ice: "ICE-17", genesys: "G-332", notes: "Excellent knowledge retention.", trainerId: "t4", createdAt: "2025-11-15", updatedAt: "2026-03-25", lastModifiedBy: "t4" },
  { id: "s18", source: "Internal", lastName: "Zhang", firstName: "David", location: "Dallas", wfh: "No", status: "Active", level1: "Complete", level2: "Complete", level3: "In Progress", roleAssignment: "Senior Agent", billing: "Billable", tl: "Lisa Wang", language: "Mandarin", empId: "E1018", windows: "W-4453", nttBpoEmail: "dzhang@ntt.com", pcbReq: "PCB-118", homePhone: "(214) 555-0118", homeEmail: "david.z@email.com", tsys: "T-252", macGui: "M-142", ice: "ICE-18", genesys: "G-333", notes: "On track for QA certification.", trainerId: "t4", createdAt: "2025-09-20", updatedAt: "2026-03-27", lastModifiedBy: "t4" },
  { id: "s19", source: "Job Board", lastName: "Taylor", firstName: "Sam", location: "Austin", wfh: "Yes", status: "Active", level1: "Complete", level2: "Not Started", level3: "Not Started", roleAssignment: "Agent", billing: "Training", tl: "David Kim", language: "English", empId: "E1019", windows: "W-4461", nttBpoEmail: "staylor@ntt.com", pcbReq: "PCB-119", homePhone: "(512) 555-0119", homeEmail: "sam.t@email.com", tsys: "T-260", macGui: "M-150", ice: "ICE-19", genesys: "G-341", notes: "Completed QA specialization.", trainerId: "t5", createdAt: "2026-02-28", updatedAt: "2026-03-20", lastModifiedBy: "t5" },
  { id: "s20", source: "Walk-in", lastName: "Moore", firstName: "Alex", location: "Austin", wfh: "No", status: "Completed", level1: "Complete", level2: "Complete", level3: "Complete", roleAssignment: "QA", billing: "Billable", tl: "David Kim", language: "English", empId: "E1020", windows: "W-4462", nttBpoEmail: "amoore@ntt.com", pcbReq: "PCB-120", homePhone: "(512) 555-0120", homeEmail: "alex.m@email.com", tsys: "T-261", macGui: "M-151", ice: "ICE-20", genesys: "G-342", notes: "Certified QA specialist.", trainerId: "t5", createdAt: "2025-12-01", updatedAt: "2026-03-20", lastModifiedBy: "t5" },
];

// ─── ENROLLMENTS ───────────────────────────────────────────
export const mockEnrollments = [
  { id: "e1", trainingId: "tr1", studentId: "s1", status: "enrolled", enrolledAt: "2026-02-25" },
  { id: "e2", trainingId: "tr1", studentId: "s2", status: "enrolled", enrolledAt: "2026-02-25" },
  { id: "e3", trainingId: "tr1", studentId: "s3", status: "enrolled", enrolledAt: "2026-02-25" },
  { id: "e4", trainingId: "tr1", studentId: "s4", status: "enrolled", enrolledAt: "2026-02-25" },
  { id: "e5", trainingId: "tr1", studentId: "s5", status: "enrolled", enrolledAt: "2026-02-25" },
  { id: "e6", trainingId: "tr2", studentId: "s6", status: "enrolled", enrolledAt: "2026-03-01" },
  { id: "e7", trainingId: "tr2", studentId: "s7", status: "enrolled", enrolledAt: "2026-03-01" },
  { id: "e8", trainingId: "tr2", studentId: "s8", status: "enrolled", enrolledAt: "2026-03-01" },
  { id: "e9", trainingId: "tr2", studentId: "s9", status: "dropped", enrolledAt: "2026-03-01" },
  { id: "e10", trainingId: "tr2", studentId: "s10", status: "enrolled", enrolledAt: "2026-03-01" },
  { id: "e11", trainingId: "tr3", studentId: "s1", status: "enrolled", enrolledAt: "2026-03-15" },
  { id: "e12", trainingId: "tr3", studentId: "s5", status: "enrolled", enrolledAt: "2026-03-15" },
  { id: "e13", trainingId: "tr3", studentId: "s6", status: "enrolled", enrolledAt: "2026-03-15" },
  { id: "e14", trainingId: "tr4", studentId: "s11", status: "enrolled", enrolledAt: "2026-03-20" },
  { id: "e15", trainingId: "tr4", studentId: "s12", status: "enrolled", enrolledAt: "2026-03-20" },
  { id: "e16", trainingId: "tr4", studentId: "s13", status: "enrolled", enrolledAt: "2026-03-20" },
  { id: "e17", trainingId: "tr4", studentId: "s14", status: "enrolled", enrolledAt: "2026-03-20" },
  { id: "e18", trainingId: "tr4", studentId: "s15", status: "enrolled", enrolledAt: "2026-03-20" },
  { id: "e19", trainingId: "tr5", studentId: "s10", status: "enrolled", enrolledAt: "2026-04-01" },
  { id: "e20", trainingId: "tr5", studentId: "s7", status: "enrolled", enrolledAt: "2026-04-01" },
  { id: "e21", trainingId: "tr6", studentId: "s16", status: "enrolled", enrolledAt: "2026-04-01" },
  { id: "e22", trainingId: "tr6", studentId: "s17", status: "enrolled", enrolledAt: "2026-04-01" },
  { id: "e23", trainingId: "tr6", studentId: "s18", status: "enrolled", enrolledAt: "2026-04-01" },
  { id: "e24", trainingId: "tr8", studentId: "s19", status: "enrolled", enrolledAt: "2026-03-10" },
  { id: "e25", trainingId: "tr8", studentId: "s20", status: "enrolled", enrolledAt: "2026-03-10" },
];

// ─── SESSIONS ───────────────────────────────────────────────
export const mockSessions = [
  { id: "ss1", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-02", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 1", notes: "System orientation and tools setup.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 1 },
  { id: "ss2", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-03", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 2", notes: "PCB & Windows setup.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 2 },
  { id: "ss3", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-04", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 3", notes: "TSYS walkthrough.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 3 },
  { id: "ss4", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-05", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 4", notes: "ICE & Genesys intro.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 4 },
  { id: "ss5", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-06", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 5", notes: "Assessment Day 1.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 5 },
  { id: "ss6", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-09", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 6", notes: "Compliance training.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 6 },
  { id: "ss7", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-10", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 7", notes: "Role-play scenarios.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 7 },
  { id: "ss8", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-11", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 8", notes: "Mock call practice.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 8 },
  { id: "ss9", trainingId: "tr1", trainerId: "t1", trainerName: "John Smith", date: "2026-03-12", startTime: "09:00", endTime: "17:00", title: "Pre-Process Onboarding - Day 9", notes: "Final review & certification.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 9 },
  { id: "ss10", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-13", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 1", notes: "Tier 1A introduction.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 1 },
  { id: "ss11", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-16", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 2", notes: "Call handling procedures.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 2 },
  { id: "ss12", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-17", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 3", notes: "Escalation protocols.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 3 },
  { id: "ss13", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-18", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 4", notes: "Quality monitoring intro.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 4 },
  { id: "ss14", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-19", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 5", notes: "Mid-assessment.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 5 },
  { id: "ss15", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-23", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 6", notes: "Documentation practices.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 6 },
  { id: "ss16", trainingId: "tr2", trainerId: "t2", trainerName: "Sarah Lee", date: "2026-03-24", startTime: "09:00", endTime: "17:00", title: "Tier 1A Core Skills - Day 7", notes: "Final assessment.", studentIds: ["s6", "s7", "s8", "s10"], location: "Austin", dayNumber: 7 },
  { id: "ss17", trainingId: "tr3", trainerId: "t1", trainerName: "John Smith", date: "2026-03-26", startTime: "09:00", endTime: "17:00", title: "Tier 1A Nesting - Day 1", notes: "Live floor introduction.", studentIds: ["s1", "s5", "s6"], location: "Miami", dayNumber: 1 },
  { id: "ss18", trainingId: "tr3", trainerId: "t1", trainerName: "John Smith", date: "2026-03-27", startTime: "09:00", endTime: "17:00", title: "Tier 1A Nesting - Day 2", notes: "Supervised call handling.", studentIds: ["s1", "s5", "s6"], location: "Miami", dayNumber: 2 },
  { id: "ss19", trainingId: "tr3", trainerId: "t1", trainerName: "John Smith", date: "2026-03-30", startTime: "09:00", endTime: "17:00", title: "Tier 1A Nesting - Day 3", notes: "Performance feedback session.", studentIds: ["s1", "s5", "s6"], location: "Miami", dayNumber: 3 },
  { id: "ss20", trainingId: "tr3", trainerId: "t1", trainerName: "John Smith", date: "2026-03-31", startTime: "09:00", endTime: "17:00", title: "Tier 1A Nesting - Day 4", notes: "Wrap-up and exit interview.", studentIds: ["s1", "s5", "s6"], location: "Miami", dayNumber: 4 },
  { id: "ss21", trainingId: "tr4", trainerId: "t3", trainerName: "Carlos Rivera", date: "2026-04-01", startTime: "09:00", endTime: "17:00", title: "Tier 1B Advanced - Day 1", notes: "Tier 1B overview & expectations.", studentIds: ["s11", "s12", "s13", "s14", "s15"], location: "Miami", dayNumber: 1 },
  { id: "ss22", trainingId: "tr4", trainerId: "t3", trainerName: "Carlos Rivera", date: "2026-04-02", startTime: "09:00", endTime: "17:00", title: "Tier 1B Advanced - Day 2", notes: "Advanced call scenarios.", studentIds: ["s11", "s12", "s13", "s14", "s15"], location: "Miami", dayNumber: 2 },
  { id: "ss23", trainingId: "tr4", trainerId: "t3", trainerName: "Carlos Rivera", date: "2026-04-06", startTime: "09:00", endTime: "17:00", title: "Tier 1B Advanced - Day 3", notes: "Complex escalation handling.", studentIds: ["s11", "s12", "s13", "s14", "s15"], location: "Miami", dayNumber: 3 },
  { id: "ss24", trainingId: "tr6", trainerId: "t4", trainerName: "Lisa Wang", date: "2026-04-10", startTime: "09:00", endTime: "17:00", title: "Collections Certification - Day 1", notes: "Collections framework overview.", studentIds: ["s16", "s17", "s18"], location: "Remote", dayNumber: 1 },
  { id: "ss25", trainingId: "tr6", trainerId: "t4", trainerName: "Lisa Wang", date: "2026-04-13", startTime: "09:00", endTime: "17:00", title: "Collections Certification - Day 2", notes: "Collections mock sessions.", studentIds: ["s16", "s17", "s18"], location: "Remote", dayNumber: 2 },
  { id: "ss26", trainingId: "tr6", trainerId: "t4", trainerName: "Lisa Wang", date: "2026-04-14", startTime: "09:00", endTime: "17:00", title: "Collections Certification - Day 3", notes: "Certification assessment.", studentIds: ["s16", "s17", "s18"], location: "Remote", dayNumber: 3 },
  { id: "ss27", trainingId: "tr8", trainerId: "t5", trainerName: "David Kim", date: "2026-03-18", startTime: "09:00", endTime: "17:00", title: "QA Specialization - Day 1", notes: "QA tools & methodology.", studentIds: ["s19", "s20"], location: "Austin", dayNumber: 1 },
  { id: "ss28", trainingId: "tr8", trainerId: "t5", trainerName: "David Kim", date: "2026-03-19", startTime: "09:00", endTime: "17:00", title: "QA Specialization - Day 2", notes: "Live QA assessment.", studentIds: ["s19", "s20"], location: "Austin", dayNumber: 2 },
  
  // Demo Sessions
  { id: "ss-demo-1", trainingId: "tr-demo-1", trainerId: "t1", trainerName: "John Smith", date: "2026-04-01", startTime: "09:00", endTime: "17:00", title: "Loblaw - PCO (Demo Batch) - Day 1", notes: "Demo session for internal review.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 1 },
  { id: "ss-demo-2", trainingId: "tr-demo-2", trainerId: "t3", trainerName: "Carlos Rivera", date: "2026-04-01", startTime: "10:00", endTime: "16:00", title: "AML Compliance - Day 1", notes: "Core AML protocols.", studentIds: ["s11", "s12", "s13"], location: "Austin", dayNumber: 1 },
  { id: "ss-demo-3", trainingId: "tr-demo-1", trainerId: "t1", trainerName: "John Smith", date: "2026-04-02", startTime: "09:00", endTime: "17:00", title: "Loblaw - PCO (Demo Batch) - Day 2", notes: "System deep-dive.", studentIds: ["s1", "s2", "s3", "s4", "s5"], location: "Miami", dayNumber: 2 },
];

// ─── ATTENDANCE ────────────────────────────────────────────
export const mockAttendance = [
  { id: "a1", sessionId: "ss1", trainingId: "tr1", studentId: "s1", studentName: "Maria Garcia", status: "Present", notes: "", date: "2026-03-02" },
  { id: "a2", sessionId: "ss1", trainingId: "tr1", studentId: "s2", studentName: "Wei Chen", status: "Excused", notes: "Medical appointment", date: "2026-03-02" },
  { id: "a3", sessionId: "ss1", trainingId: "tr1", studentId: "s3", studentName: "Alex Johnson", status: "Present", notes: "", date: "2026-03-02" },
  { id: "a4", sessionId: "ss1", trainingId: "tr1", studentId: "s4", studentName: "Ravi Patel", status: "Present", notes: "", date: "2026-03-02" },
  { id: "a5", sessionId: "ss1", trainingId: "tr1", studentId: "s5", studentName: "Jordan Williams", status: "Present", notes: "", date: "2026-03-02" },
  { id: "a6", sessionId: "ss3", trainingId: "tr1", studentId: "s1", studentName: "Maria Garcia", status: "Present", notes: "", date: "2026-03-04" },
  { id: "a7", sessionId: "ss3", trainingId: "tr1", studentId: "s2", studentName: "Wei Chen", status: "Present", notes: "", date: "2026-03-04" },
  { id: "a8", sessionId: "ss3", trainingId: "tr1", studentId: "s3", studentName: "Alex Johnson", status: "Absent", notes: "Not notified", date: "2026-03-04" },
  { id: "a9", sessionId: "ss3", trainingId: "tr1", studentId: "s4", studentName: "Ravi Patel", status: "Present", notes: "", date: "2026-03-04" },
  { id: "a10", sessionId: "ss3", trainingId: "tr1", studentId: "s5", studentName: "Jordan Williams", status: "Late", notes: "Transport delay", date: "2026-03-04" },
  { id: "a11", sessionId: "ss10", trainingId: "tr2", studentId: "s6", studentName: "Taylor Brown", status: "Present", notes: "", date: "2026-03-13" },
  { id: "a12", sessionId: "ss10", trainingId: "tr2", studentId: "s7", studentName: "Morgan Davis", status: "Present", notes: "", date: "2026-03-13" },
  { id: "a13", sessionId: "ss10", trainingId: "tr2", studentId: "s8", studentName: "Ana Martinez", status: "Late", notes: "Traffic", date: "2026-03-13" },
  { id: "a14", sessionId: "ss10", trainingId: "tr2", studentId: "s10", studentName: "Jamie Thomas", status: "Present", notes: "", date: "2026-03-13" },
  { id: "a15", sessionId: "ss12", trainingId: "tr2", studentId: "s6", studentName: "Taylor Brown", status: "Present", notes: "", date: "2026-03-17" },
  { id: "a16", sessionId: "ss12", trainingId: "tr2", studentId: "s7", studentName: "Morgan Davis", status: "Excused", notes: "Family emergency", date: "2026-03-17" },
  { id: "a17", sessionId: "ss12", trainingId: "tr2", studentId: "s8", studentName: "Ana Martinez", status: "Present", notes: "", date: "2026-03-17" },
  { id: "a18", sessionId: "ss12", trainingId: "tr2", studentId: "s10", studentName: "Jamie Thomas", status: "Present", notes: "", date: "2026-03-17" },
  { id: "a19", sessionId: "ss27", trainingId: "tr8", studentId: "s19", studentName: "Sam Taylor", status: "Present", notes: "", date: "2026-03-18" },
  { id: "a20", sessionId: "ss27", trainingId: "tr8", studentId: "s20", studentName: "Alex Moore", status: "Present", notes: "", date: "2026-03-18" },
  { id: "a21", sessionId: "ss28", trainingId: "tr8", studentId: "s19", studentName: "Sam Taylor", status: "Present", notes: "", date: "2026-03-19" },
  { id: "a22", sessionId: "ss28", trainingId: "tr8", studentId: "s20", studentName: "Alex Moore", status: "Present", notes: "", date: "2026-03-19" },
  
  // Demo Attendance (April 1)
  { id: "a-demo-1", sessionId: "ss-demo-1", trainingId: "tr-demo-1", studentId: "s1", studentName: "Maria Garcia", status: "Present", notes: "Enthusiastic start", date: "2026-04-01" },
  { id: "a-demo-2", sessionId: "ss-demo-1", trainingId: "tr-demo-1", studentId: "s2", studentName: "Wei Chen", status: "Present", notes: "", date: "2026-04-01" },
  { id: "a-demo-3", sessionId: "ss-demo-1", trainingId: "tr-demo-1", studentId: "s3", studentName: "Alex Johnson", status: "Late", notes: "Technical issues at start", date: "2026-04-01" },
  { id: "a-demo-4", sessionId: "ss-demo-1", trainingId: "tr-demo-1", studentId: "s4", studentName: "Ravi Patel", status: "Present", notes: "", date: "2026-04-01" },
  { id: "a-demo-5", sessionId: "ss-demo-1", trainingId: "tr-demo-1", studentId: "s5", studentName: "Jordan Williams", status: "Present", notes: "", date: "2026-04-01" },
];

// ─── OBSERVATIONS ──────────────────────────────────────────
export const mockObservations = [
  { id: "o1", studentId: "s1", studentName: "Maria Garcia", trainerId: "t1", trainerName: "John Smith", trainingId: "tr1", sessionId: "ss1", date: "2026-03-02", behavior: 5, knowledge: 4, engagement: 5, notes: "Excellent participation. Shows strong initiative and leadership qualities." },
  { id: "o2", studentId: "s2", studentName: "Wei Chen", trainerId: "t1", trainerName: "John Smith", trainingId: "tr1", sessionId: "ss1", date: "2026-03-02", behavior: 3, knowledge: 3, engagement: 3, notes: "Steady progress. Needs more practice with TSYS workflows." },
  { id: "o3", studentId: "s3", studentName: "Alex Johnson", trainerId: "t1", trainerName: "John Smith", trainingId: "tr1", sessionId: "ss1", date: "2026-03-02", behavior: 4, knowledge: 4, engagement: 3, notes: "Good knowledge base. Engagement could improve." },
  { id: "o4", studentId: "s4", studentName: "Ravi Patel", trainerId: "t1", trainerName: "John Smith", trainingId: "tr1", sessionId: "ss3", date: "2026-03-04", behavior: 5, knowledge: 5, engagement: 5, notes: "Outstanding performance across all metrics." },
  { id: "o5", studentId: "s5", studentName: "Jordan Williams", trainerId: "t1", trainerName: "John Smith", trainingId: "tr1", sessionId: "ss3", date: "2026-03-04", behavior: 4, knowledge: 3, engagement: 4, notes: "Improving steadily. One late arrival noted." },
  { id: "o6", studentId: "s6", studentName: "Taylor Brown", trainerId: "t2", trainerName: "Sarah Lee", trainingId: "tr2", sessionId: "ss10", date: "2026-03-13", behavior: 4, knowledge: 4, engagement: 5, notes: "Strong communicator, engages well with class." },
  { id: "o7", studentId: "s7", studentName: "Morgan Davis", trainerId: "t2", trainerName: "Sarah Lee", trainingId: "tr2", sessionId: "ss10", date: "2026-03-13", behavior: 4, knowledge: 3, engagement: 4, notes: "Completed Pre-Process with distinction." },
  { id: "o8", studentId: "s8", studentName: "Ana Martinez", trainerId: "t2", trainerName: "Sarah Lee", trainingId: "tr2", sessionId: "ss10", date: "2026-03-13", behavior: 5, knowledge: 4, engagement: 5, notes: "Bilingual strength is a great asset." },
  { id: "o9", studentId: "s10", studentName: "Jamie Thomas", trainerId: "t2", trainerName: "Sarah Lee", trainingId: "tr2", sessionId: "ss12", date: "2026-03-17", behavior: 5, knowledge: 5, engagement: 5, notes: "Consistently top performer." },
  { id: "o10", studentId: "s11", studentName: "Riley Jackson", trainerId: "t3", trainerName: "Carlos Rivera", trainingId: "tr4", sessionId: "ss21", date: "2026-04-01", behavior: 4, knowledge: 4, engagement: 4, notes: "Strong bilingual performance." },
  { id: "o11", studentId: "s13", studentName: "Jordan Harris", trainerId: "t3", trainerName: "Carlos Rivera", trainingId: "tr4", sessionId: "ss21", date: "2026-04-01", behavior: 5, knowledge: 5, engagement: 4, notes: "Ready for nesting." },
  { id: "o12", studentId: "s16", studentName: "Kevin Lee", trainerId: "t4", trainerName: "Lisa Wang", trainingId: "tr6", sessionId: "ss24", date: "2026-04-10", behavior: 5, knowledge: 5, engagement: 5, notes: "Outstanding. Natural team leader." },
  { id: "o13", studentId: "s17", studentName: "Emily Wu", trainerId: "t4", trainerName: "Lisa Wang", trainingId: "tr6", sessionId: "ss24", date: "2026-04-10", behavior: 4, knowledge: 5, engagement: 4, notes: "Excellent retention of collections methodology." },
  { id: "o14", studentId: "s19", studentName: "Sam Taylor", trainerId: "t5", trainerName: "David Kim", trainingId: "tr8", sessionId: "ss27", date: "2026-03-18", behavior: 4, knowledge: 4, engagement: 3, notes: "Solid QA foundations." },
  { id: "o15", studentId: "s20", studentName: "Alex Moore", trainerId: "t5", trainerName: "David Kim", trainingId: "tr8", sessionId: "ss27", date: "2026-03-18", behavior: 5, knowledge: 5, engagement: 5, notes: "Certified with distinction." },
];

// ─── FEEDBACK ──────────────────────────────────────────────
export const mockFeedback = [
  { id: "f1", trainerId: "t1", trainerName: "John Smith", fromUserId: "supervisor", fromUserName: "System Supervisor", rating: 5, category: "Leadership", text: "John consistently delivers excellent onboarding experiences.", date: "2026-03-12", anonymous: false },
  { id: "f2", trainerId: "t2", trainerName: "Sarah Lee", fromUserId: "supervisor", fromUserName: "System Supervisor", rating: 4, category: "Communication", text: "Sarah is clear and structured. Would benefit from more interactive exercises.", date: "2026-03-24", anonymous: false },
  { id: "f3", trainerId: "t3", trainerName: "Carlos Rivera", fromUserId: "supervisor", fromUserName: "System Supervisor", rating: 4, category: "Engagement", text: "Carlos creates an engaging bilingual environment.", date: "2026-04-05", anonymous: false },
  { id: "f4", trainerId: "t4", trainerName: "Lisa Wang", fromUserId: "supervisor", fromUserName: "System Supervisor", rating: 5, category: "Knowledge", text: "Lisa's deep expertise in collections drives excellent outcomes.", date: "2026-04-12", anonymous: false },
  { id: "f5", trainerId: "t5", trainerName: "David Kim", fromUserId: "supervisor", fromUserName: "System Supervisor", rating: 4, category: "Punctuality", text: "David runs tight, well-timed sessions.", date: "2026-03-20", anonymous: false },
  { id: "f6", trainerId: "t1", trainerName: "John Smith", fromUserId: "t2", fromUserName: "Anonymous", rating: 5, category: "Leadership", text: "Best trainer I've observed.", date: "2026-03-15", anonymous: true },
];

// ─── PROGRESS ──────────────────────────────────────────────
export const mockProgress = [
  { id: "p1", studentId: "s1", date: "2026-03-12", level: "Level 1", status: "Complete", notes: "Passed Pre-Process with 94% score.", trainerId: "t1" },
  { id: "p2", studentId: "s1", date: "2026-03-26", level: "Level 2", status: "In Progress", notes: "Began Tier 1A Nesting.", trainerId: "t1" },
  { id: "p3", studentId: "s4", date: "2026-03-12", level: "Level 1", status: "Complete", notes: "Fast-tracked, scored 99%.", trainerId: "t1" },
  { id: "p4", studentId: "s6", date: "2026-03-25", level: "Level 1", status: "Complete", notes: "Passed Tier 1A Core.", trainerId: "t2" },
  { id: "p5", studentId: "s10", date: "2026-03-25", level: "Level 1", status: "Complete", notes: "Solid pass on Tier 1A.", trainerId: "t2" },
  { id: "p6", studentId: "s16", date: "2026-04-12", level: "Level 2", status: "In Progress", notes: "Collections certification ongoing.", trainerId: "t4" },
  { id: "p7", studentId: "s20", date: "2026-03-20", level: "Level 3", status: "Complete", notes: "QA Certified.", trainerId: "t5" },
];

// ─── IMPORT STATUS ─────────────────────────────────────────
export const mockImportStatus = {
  lastImport: "2026-03-03 08:00",
  status: "Completed",
  records: 156,
};

// ─── CURRENT USER (default — not used directly, login sets this) ──
export const currentUser = {
  id: "supervisor-1",
  name: "Admin Supervisor",
  email: "supervisor@ntt.com",
  role: "supervisor",
};

// ─── AUDIT LOG (system-wide activity) ──────────────────────
export const mockActivityLog = [
  { id: "al1", action: "Trainer Created", user: "Supervisor", role: "supervisor", entity: "John Smith", entityType: "trainer", date: "2026-02-15T09:00:00Z", details: "Created trainer record for John Smith" },
  { id: "al2", action: "Program Scheduled", user: "John Smith", role: "trainer", entity: "Pre-Process Onboarding", entityType: "program", date: "2026-02-25T10:30:00Z", details: "Scheduled Pre-Process Onboarding starting Mar 1 with 5 students" },
  { id: "al3", action: "Attendance Submitted", user: "John Smith", role: "trainer", entity: "Pre-Process Onboarding - Day 1", entityType: "attendance", date: "2026-03-02T17:15:00Z", details: "Submitted attendance for 5 students" },
  { id: "al4", action: "Observation Added", user: "John Smith", role: "trainer", entity: "Maria Garcia", entityType: "observation", date: "2026-03-02T17:30:00Z", details: "Added daily observation for Maria Garcia" },
  { id: "al5", action: "Trainer Created", user: "Supervisor", role: "supervisor", entity: "Sarah Lee", entityType: "trainer", date: "2026-02-16T11:00:00Z", details: "Created trainer record for Sarah Lee" },
  { id: "al6", action: "Program Scheduled", user: "Sarah Lee", role: "trainer", entity: "Tier 1A Core Skills", entityType: "program", date: "2026-03-01T09:00:00Z", details: "Scheduled Tier 1A Core Skills starting Mar 13 with 4 students" },
  { id: "al7", action: "Student Assigned", user: "Supervisor", role: "supervisor", entity: "Riley Jackson", entityType: "student", date: "2026-03-15T14:00:00Z", details: "Assigned Riley Jackson to Carlos Rivera's Tier 1B Advanced" },
  { id: "al8", action: "Class Moved", user: "Supervisor", role: "supervisor", entity: "Tier 1B Advanced - Day 3", entityType: "session", date: "2026-04-04T10:00:00Z", details: "Rescheduled from Apr 3 to Apr 6 due to holiday" },
  { id: "al9", action: "Attendance Submitted", user: "Sarah Lee", role: "trainer", entity: "Tier 1A Core Skills - Day 1", entityType: "attendance", date: "2026-03-13T17:20:00Z", details: "Submitted attendance for 4 students" },
  { id: "al10", action: "Trainer Created", user: "Supervisor", role: "supervisor", entity: "Carlos Rivera", entityType: "trainer", date: "2026-02-17T08:30:00Z", details: "Created trainer record for Carlos Rivera" },
  { id: "al11", action: "Observation Added", user: "Carlos Rivera", role: "trainer", entity: "Riley Jackson", entityType: "observation", date: "2026-04-01T17:45:00Z", details: "Added daily observation for Riley Jackson" },
  { id: "al12", action: "Program Scheduled", user: "Lisa Wang", role: "trainer", entity: "Collections Certification", entityType: "program", date: "2026-04-01T09:15:00Z", details: "Scheduled Collections Certification starting Apr 10" },
  { id: "al13", action: "Trainer Created", user: "Supervisor", role: "supervisor", entity: "Lisa Wang", entityType: "trainer", date: "2026-02-18T13:00:00Z", details: "Created trainer record for Lisa Wang" },
  { id: "al14", action: "Trainer Created", user: "Supervisor", role: "supervisor", entity: "David Kim", entityType: "trainer", date: "2026-02-19T09:45:00Z", details: "Created trainer record for David Kim" },
  { id: "al15", action: "Attendance Submitted", user: "David Kim", role: "trainer", entity: "QA Specialization - Day 1", entityType: "attendance", date: "2026-03-18T17:10:00Z", details: "Submitted attendance for 2 students" },
];
