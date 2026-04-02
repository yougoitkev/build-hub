import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import Dashboard from "./pages/Dashboard";
import StudentsPage from "./pages/StudentsPage";
import StudentDetailPage from "./pages/StudentDetailPage";
import CalendarPage from "./pages/CalendarPage";
import AttendancePage from "./pages/AttendancePage";
import ObservationsPage from "./pages/ObservationsPage";
import PerformancePage from "./pages/PerformancePage";
import TrainersPage from "./pages/TrainersPage";
import TrainerAttendancePage from "./pages/TrainerAttendancePage";
import TrainerObservationsPage from "./pages/TrainerObservationsPage";
import TrainerUtilizationPage from "./pages/TrainerUtilizationPage";
import OrgChartPage from "./pages/OrgChartPage";
import TrainerFormPage from "./pages/TrainerFormPage";
import FeedbackPage from "./pages/FeedbackPage";
import ReportsPage from "./pages/ReportsPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import ImportManagementPage from "./pages/ImportManagementPage";
import AuditPage from "./pages/AuditPage";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import CreateProgramPage from "./pages/CreateProgramPage";
import { RequireAuth } from "./components/auth/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/Login" element={<LoginPage />} />

          <Route
            path="/*"
            element={
              <RequireAuth>
                <AppShell>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/trainer-form" element={<RequireAuth allowedRoles={['supervisor', 'admin']}><TrainerFormPage /></RequireAuth>} />
                    <Route path="/create-program" element={<CreateProgramPage />} />
                    <Route path="/courses/:id" element={<CourseDetailPage />} />
                    <Route path="/students" element={<StudentsPage />} />
                    <Route path="/students/:id" element={<StudentDetailPage />} />
                    <Route path="/calendar" element={<CalendarPage />} />
                    <Route path="/attendance" element={<AttendancePage />} />
                    <Route path="/observations" element={<ObservationsPage />} />
                    <Route path="/progress" element={<PerformancePage />} />
                    <Route path="/trainers" element={<RequireAuth allowedRoles={['supervisor', 'admin']}><TrainersPage /></RequireAuth>} />
                    <Route path="/feedback" element={<FeedbackPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/import" element={<RequireAuth allowedRoles={['supervisor', 'admin']}><ImportManagementPage /></RequireAuth>} />
                    <Route path="/audit" element={<RequireAuth allowedRoles={['supervisor', 'admin']}><AuditPage /></RequireAuth>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppShell>
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
