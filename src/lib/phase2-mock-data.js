// ============================================================
// Phase 2 — Mock Data for Trainer Management
// ============================================================
import { format, subDays, addDays } from "date-fns";

// ─── SUPERVISORS (org hierarchy) ───────────────────────────
export const mockSupervisors = [
  { id: "sup1", name: "Rachel Adams", email: "radams@ntt.com", role: "supervisor", location: "Miami", trainerIds: ["t1", "t3"] },
  { id: "sup2", name: "Marcus Johnson", email: "mjohnson@ntt.com", role: "supervisor", location: "Austin", trainerIds: ["t2", "t5"] },
  { id: "sup3", name: "Patricia Chen", email: "pchen@ntt.com", role: "supervisor", location: "Dallas", trainerIds: ["t4"] },
];

// ─── TRAINER ATTENDANCE ────────────────────────────────────
const TRAINER_ATT_STATUSES = ["Present", "Absent", "Late", "Leave", "Holiday"];

const generateTrainerAttendance = () => {
  const trainers = ["t1", "t2", "t3", "t4", "t5"];
  const records = [];
  const today = new Date("2026-04-02");

  trainers.forEach((trainerId) => {
    for (let i = 30; i >= 0; i--) {
      const date = subDays(today, i);
      const day = date.getDay();
      if (day === 0 || day === 6) continue; // skip weekends

      const dateStr = format(date, "yyyy-MM-dd");
      const rand = Math.random();
      let status = "Present";
      if (rand < 0.05) status = "Absent";
      else if (rand < 0.1) status = "Late";
      else if (rand < 0.13) status = "Leave";

      records.push({
        id: `ta-${trainerId}-${dateStr}`,
        trainerId,
        date: dateStr,
        status,
        notes: status === "Late" ? "Traffic delay" : status === "Leave" ? "Personal leave" : "",
        markedBy: "sup1",
        markedAt: new Date().toISOString(),
      });
    }
  });

  return records;
};

export const mockTrainerAttendance = generateTrainerAttendance();

// ─── TRAINER OBSERVATIONS ──────────────────────────────────
export const OBSERVATION_CATEGORIES = [
  "Teaching Quality",
  "Engagement",
  "Punctuality",
  "Documentation",
  "Communication",
];

export const mockTrainerObservations = [
  {
    id: "tobs1", trainerId: "t1", trainerName: "John Smith", supervisorId: "sup1", supervisorName: "Rachel Adams",
    date: "2026-03-15", ratings: { "Teaching Quality": 9, Engagement: 8, Punctuality: 10, Documentation: 7, Communication: 9 },
    comments: { "Teaching Quality": "Excellent delivery, clear examples.", Engagement: "Good interaction with class.", Punctuality: "Always on time.", Documentation: "Could improve session notes.", Communication: "Very articulate." },
  },
  {
    id: "tobs2", trainerId: "t1", trainerName: "John Smith", supervisorId: "sup1", supervisorName: "Rachel Adams",
    date: "2026-03-28", ratings: { "Teaching Quality": 9, Engagement: 9, Punctuality: 10, Documentation: 8, Communication: 9 },
    comments: { "Teaching Quality": "Consistently high quality.", Engagement: "Improved group activities.", Punctuality: "Perfect.", Documentation: "Better session notes this time.", Communication: "Clear and concise." },
  },
  {
    id: "tobs3", trainerId: "t2", trainerName: "Sarah Lee", supervisorId: "sup2", supervisorName: "Marcus Johnson",
    date: "2026-03-20", ratings: { "Teaching Quality": 8, Engagement: 7, Punctuality: 9, Documentation: 8, Communication: 8 },
    comments: { "Teaching Quality": "Solid fundamentals.", Engagement: "Could use more interactive exercises.", Punctuality: "Rarely late.", Documentation: "Well-organized materials.", Communication: "Good clarity." },
  },
  {
    id: "tobs4", trainerId: "t3", trainerName: "Carlos Rivera", supervisorId: "sup1", supervisorName: "Rachel Adams",
    date: "2026-03-22", ratings: { "Teaching Quality": 8, Engagement: 9, Punctuality: 8, Documentation: 7, Communication: 9 },
    comments: { "Teaching Quality": "Strong bilingual delivery.", Engagement: "Excellent class energy.", Punctuality: "Occasional 5-min delays.", Documentation: "Needs more detail.", Communication: "Outstanding bilingual communication." },
  },
  {
    id: "tobs5", trainerId: "t4", trainerName: "Lisa Wang", supervisorId: "sup3", supervisorName: "Patricia Chen",
    date: "2026-03-25", ratings: { "Teaching Quality": 10, Engagement: 8, Punctuality: 10, Documentation: 9, Communication: 8 },
    comments: { "Teaching Quality": "Expert-level content.", Engagement: "Good but could be more animated.", Punctuality: "Impeccable.", Documentation: "Thorough and detailed.", Communication: "Clear, slightly technical." },
  },
  {
    id: "tobs6", trainerId: "t5", trainerName: "David Kim", supervisorId: "sup2", supervisorName: "Marcus Johnson",
    date: "2026-03-18", ratings: { "Teaching Quality": 7, Engagement: 7, Punctuality: 8, Documentation: 6, Communication: 7 },
    comments: { "Teaching Quality": "Growing, needs mentoring.", Engagement: "Adequate.", Punctuality: "Generally on time.", Documentation: "Minimal notes.", Communication: "Improving." },
  },
];

// ─── TRAINER UTILIZATION ───────────────────────────────────
export const mockTrainerUtilization = [
  { id: "tu1", trainerId: "t1", trainerName: "John Smith", period: "2026-Q1", billedHours: 320, availableHours: 400, dailyBreakdown: Array.from({ length: 22 }, (_, i) => ({ date: format(addDays(new Date("2026-03-01"), i), "yyyy-MM-dd"), billed: 6 + Math.round(Math.random() * 2), available: 8 })) },
  { id: "tu2", trainerId: "t2", trainerName: "Sarah Lee", period: "2026-Q1", billedHours: 280, availableHours: 400, dailyBreakdown: Array.from({ length: 22 }, (_, i) => ({ date: format(addDays(new Date("2026-03-01"), i), "yyyy-MM-dd"), billed: 5 + Math.round(Math.random() * 2), available: 8 })) },
  { id: "tu3", trainerId: "t3", trainerName: "Carlos Rivera", period: "2026-Q1", billedHours: 300, availableHours: 400, dailyBreakdown: Array.from({ length: 22 }, (_, i) => ({ date: format(addDays(new Date("2026-03-01"), i), "yyyy-MM-dd"), billed: 5 + Math.round(Math.random() * 3), available: 8 })) },
  { id: "tu4", trainerId: "t4", trainerName: "Lisa Wang", period: "2026-Q1", billedHours: 350, availableHours: 400, dailyBreakdown: Array.from({ length: 22 }, (_, i) => ({ date: format(addDays(new Date("2026-03-01"), i), "yyyy-MM-dd"), billed: 7 + Math.round(Math.random() * 1), available: 8 })) },
  { id: "tu5", trainerId: "t5", trainerName: "David Kim", period: "2026-Q1", billedHours: 200, availableHours: 400, dailyBreakdown: Array.from({ length: 22 }, (_, i) => ({ date: format(addDays(new Date("2026-03-01"), i), "yyyy-MM-dd"), billed: 3 + Math.round(Math.random() * 3), available: 8 })) },
];
