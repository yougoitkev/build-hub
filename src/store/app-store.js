import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mockStudents, mockTrainers, mockSessions, mockAttendance, mockObservations, mockFeedback, mockOptions, mockImportStatus, mockProgress, mockTrainings, mockEnrollments, mockTemplates, systemHolidays } from "@/lib/mock-data";
import { mockTieredAttendance, mockAuditEntries } from "@/lib/import-mock-data";
import { mockTrainerAttendance, mockTrainerObservations, mockTrainerUtilization } from "@/lib/phase2-mock-data";
import { addDays, isWeekend, format, parseISO } from "date-fns";

export const useAppStore = create(persist((set, get) => ({
  user: null,
  templates: mockTemplates,
  systemHolidays: systemHolidays,
  adminLogs: [],
  students: mockStudents,
  trainers: [...mockTrainers],
  sessions: mockSessions,
  attendance: mockAttendance,
  observations: mockObservations,
  progress: mockProgress,
  feedback: mockFeedback,
  options: mockOptions,
  importStatus: mockImportStatus,
  tieredAttendance: mockTieredAttendance,
  auditEntries: mockAuditEntries,
  trainings: mockTrainings,
  enrollments: mockEnrollments,
  trainerAttendance: mockTrainerAttendance,
  trainerObservations: mockTrainerObservations,
  trainerUtilization: mockTrainerUtilization,
  notifications: [
    { id: "n1", message: "New feedback received from Supervisor", read: false, date: "2026-03-03" },
    { id: "n2", message: "Import completed: 47 records processed", read: true, date: "2026-03-03" },
  ],

  // Selectors
  getEnrolledCount: (trainingId) => {
    return get().enrollments.filter(e => e.trainingId === trainingId && e.status === 'enrolled').length;
  },

  // Actions
  setUser: (user) => set({ user }),
  setTrainings: (trainings) => set({ trainings }),
  setEnrollments: (enrollments) => set({ enrollments }),

  // Trainer CRUD
  addTrainer: (trainer) => set((s) => ({ trainers: [...s.trainers, trainer] })),
  updateTrainer: (id, data) => set((s) => ({
    trainers: s.trainers.map((t) => (t.id === id ? { ...t, ...data } : t)),
  })),
  deleteTrainer: (id) => set((s) => ({ trainers: s.trainers.filter((t) => t.id !== id) })),
  setTrainerAttendance: (records) => set({ trainerAttendance: records }),
  addTrainerObservation: (obs) => set((s) => ({ trainerObservations: [...s.trainerObservations, obs] })),

  logAdminEvent: (event) => set((s) => ({
    adminLogs: [{
      ...event,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      userId: s.user?.id,
      role: s.user?.role
    }, ...s.adminLogs].slice(0, 100)
  })),

  createTrainingProgram: (payload) => {
    const { metadata, studentIds, startDate, rules } = payload;
    const { templates, systemHolidays } = get();

    const template = templates.find(t => t.id === metadata.templateId);
    if (!template) throw new Error("Template not found");

    const newTrainingId = `tr-${Date.now()}`;
    const newTraining = {
      id: newTrainingId,
      title: metadata.title,
      courseCode: metadata.courseCode,
      templateId: template.id,
      capacity: metadata.capacity || template.defaultCapacity,
      startDate: startDate,
      endDate: startDate,
      trainerId: get().user?.trainerId || get().user?.id,
      allocationRules: rules,
      status: "Upcoming",
    };

    const newSessions = [];
    let currentDate = parseISO(startDate);
    let daysAllocated = 0;

    while (daysAllocated < template.days) {
      const dateString = format(currentDate, "yyyy-MM-dd");
      const isHoliday = rules.skipHolidays && systemHolidays.includes(dateString);
      const isWknd = rules.mode === "business" && isWeekend(currentDate);

      if (!isHoliday && !isWknd) {
        newSessions.push({
          id: `ss-${Date.now()}-${daysAllocated}`,
          trainingId: newTrainingId,
          title: `${metadata.title} - Day ${daysAllocated + 1}`,
          trainerId: newTraining.trainerId,
          trainerName: get().user?.name,
          date: dateString,
          startTime: "09:00",
          endTime: "17:00",
          studentIds: [...studentIds],
          location: "TBD",
          dayNumber: daysAllocated + 1
        });
        daysAllocated++;
      }
      currentDate = addDays(currentDate, 1);
    }

    newTraining.endDate = newSessions[newSessions.length - 1].date;

    const newEnrollments = studentIds.map(stId => ({
      id: `e-${Date.now()}-${stId}`,
      trainingId: newTrainingId,
      studentId: stId,
      status: "enrolled",
      enrolledAt: new Date().toISOString().split("T")[0]
    }));

    set(s => ({
      trainings: [...s.trainings, newTraining],
      sessions: [...s.sessions, ...newSessions],
      enrollments: [...s.enrollments, ...newEnrollments]
    }));

    get().logAdminEvent({
      action: "Program Scheduled",
      entityId: newTrainingId,
      payloadSummary: `Created ${metadata.title} starting ${startDate} with ${studentIds.length} students. Auto-allocated ${newSessions.length} sessions.`,
    });

    return { trainingId: newTrainingId, sessionsCreated: newSessions, enrolledCount: studentIds.length };
  },

  addEnrollment: (enrollment) => set((s) => ({ enrollments: [...s.enrollments, enrollment] })),
  removeEnrollment: (enrollmentId) => set((s) => ({
    enrollments: s.enrollments.filter(e => e.id !== enrollmentId)
  })),

  updateTraining: (id, data) => set((s) => ({
    trainings: s.trainings.map(t => t.id === id ? { ...t, ...data } : t)
  })),
  addStudent: (student) => set((s) => ({ students: [...s.students, student] })),
  updateStudent: (id, data) =>
    set((s) => ({
      students: s.students.map((st) => (st.id === id ? { ...st, ...data } : st)),
    })),
  addSession: (session) => set((s) => ({ sessions: [...s.sessions, session] })),
  updateSession: (id, data) =>
    set((s) => ({
      sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...data } : sess)),
    })),
  submitAttendance: (records) =>
    set((s) => ({
      attendance: [
        ...s.attendance.filter((a) => !records.find((r) => r.studentId === a.studentId && r.sessionId === a.sessionId)),
        ...records,
      ],
    })),
  addObservation: (obs) => set((s) => ({ observations: [...s.observations, obs] })),
  addFeedback: (fb) => set((s) => ({ feedback: [...s.feedback, fb] })),
  markNotificationRead: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  batchUpdateAttendance: (updates) => {
    set((state) => {
      const newTieredAttendance = [...state.tieredAttendance];
      const newAuditEntries = [...state.auditEntries];

      updates.forEach((update) => {
        const { studentId, dayField, newValue, newRemarks, reason, userId, userName } = update;
        const index = newTieredAttendance.findIndex((ta) => ta.studentId === studentId);

        if (index !== -1) {
          const originalValue = newTieredAttendance[index][dayField];
          newTieredAttendance[index] = {
            ...newTieredAttendance[index],
            [dayField]: newValue,
            [`${dayField}_remarks`]: newRemarks,
            overrides: {
              ...newTieredAttendance[index].overrides,
              [dayField]: true,
            },
          };

          newAuditEntries.push({
            id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            entity: "attendance",
            entityId: newTieredAttendance[index].id,
            field: dayField,
            originalValue,
            newValue,
            changedBy: userId,
            changedByName: userName,
            changedAt: new Date().toISOString(),
            reason,
          });
        }
      });

      return {
        tieredAttendance: newTieredAttendance,
        auditEntries: newAuditEntries,
      };
    });
  },
}), {
  name: "tms-app-store",
  storage: createJSONStorage(() => sessionStorage),
}));
