import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, KeyRound } from "lucide-react";
import mainLogo1 from "@/assets/main-logo-1.png";
import mainLogo2 from "@/assets/main-logo-2.png";
import tmsLogo from "@/assets/tms-logo.png";
import {
  PremiumCard,
  PremiumCardHeader,
  PremiumCardTitle,
  PremiumCardDescription,
  PremiumCardContent,
  PremiumCardFooter,
} from "@/components/learning/PremiumCard";
import { toast } from "sonner";
import { api } from "@/data/api";

const DUMMY_SUPERVISOR = {
  portalId: "SUP-1001",
  password: "supervisor123",
  id: "supervisor-1",
  name: "Admin Supervisor",
  email: "supervisor@ntt.com",
  role: "supervisor",
  trainerId: null,
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAppStore((s) => s.setUser);
  const trainers = useAppStore((s) => s.trainers);

  const [portalId, setPortalId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || "/";

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!portalId || !password) {
      toast.error("Please enter both Portal ID and password");
      return;
    }

    setIsLoading(true);

    try {
      if (
        portalId.trim().toLowerCase() === DUMMY_SUPERVISOR.portalId.toLowerCase() &&
        password === DUMMY_SUPERVISOR.password
      ) {
        setUser({
          id: DUMMY_SUPERVISOR.id,
          name: DUMMY_SUPERVISOR.name,
          email: DUMMY_SUPERVISOR.email,
          role: DUMMY_SUPERVISOR.role,
          trainerId: DUMMY_SUPERVISOR.trainerId,
          portalId: DUMMY_SUPERVISOR.portalId,
        });
        toast.success(`Welcome back, ${DUMMY_SUPERVISOR.name}!`);
        navigate(from, { replace: true });
        return;
      }

      const response = await api.auth.trainerLogin({ portalId, password });
      const apiUser = response?.user;

      if (response?.login !== "success" || !apiUser) {
        toast.error("Invalid Portal ID or password");
        return;
      }

      const fullName = `${apiUser.first_name || ""} ${apiUser.last_name || ""}`.trim() || apiUser.full_name || "Trainer";
      const matchedTrainer = trainers.find((trainer) => {
        const trainerFullName = `${trainer.firstName || ""} ${trainer.lastName || ""}`.trim();
        return (
          trainer.portalId?.toLowerCase() === String(apiUser.portalid || "").toLowerCase() ||
          trainer.email?.toLowerCase() === String(apiUser.emailid || "").toLowerCase() ||
          trainerFullName.toLowerCase() === fullName.toLowerCase()
        );
      });

      setUser({
        id: String(apiUser.id),
        name: fullName,
        email: apiUser.email || apiUser.emailid || "",
        role: (apiUser.role || "").includes("admin") ? "admin" : (apiUser.role || "").includes("supervisor") ? "supervisor" : "trainer",
        trainerId: matchedTrainer?.id || String(apiUser.id || apiUser.portalid || portalId),
        portalId: apiUser.portalid || portalId,
        firstName: apiUser.first_name || apiUser.firstName || "",
        lastName: apiUser.last_name || apiUser.lastName || "",
        status: apiUser.status,
        leader: apiUser.leader,
        supervisor: apiUser.supervisor,
        backendRole: apiUser.role,
      });
      toast.success(`Welcome back, ${fullName}!`);
      navigate(from, { replace: true });
    } catch (error) {
      toast.error("An unexpected error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Apple-style ambient gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="absolute top-1/3 right-1/3 h-[300px] w-[300px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <PremiumCard className="relative w-full max-w-md animate-fade-scale shadow-[0_24px_64px_-16px_rgba(0,0,0,0.18)] border-border/40 bg-card/70 backdrop-blur-2xl" hoverable={false}>
        <PremiumCardHeader className="text-center pb-6 pt-8">
          <img src={tmsLogo} alt="TMS Logo" className="mx-auto h-16 w-16 object-contain mb-4" />
          <PremiumCardTitle className="text-3xl font-black tracking-tight">Training Management System</PremiumCardTitle>
          <PremiumCardDescription className="text-base mt-2">Sign in to your TMS account</PremiumCardDescription>
        </PremiumCardHeader>
        <PremiumCardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="portalId">Portal ID</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="portalId"
                  type="text"
                  placeholder="Enter your portal ID"
                  className="pl-10 h-12 bg-muted/50 focus:bg-background transition-colors"
                  value={portalId}
                  onChange={(e) => setPortalId(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 h-12 bg-muted/50 focus:bg-background transition-colors"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1.5 h-9 w-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/25"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </PremiumCardContent>
        <PremiumCardFooter className="flex-col gap-2 border-t border-border/50 bg-muted/20 py-4">
          <p className="text-[10px] text-muted-foreground text-center w-full">
            Trainer authentication uses the backend API.
          </p>
          <p className="text-[10px] text-muted-foreground text-center w-full">
            Supervisor test login: <span className="font-mono">SUP-1001 / supervisor123</span>
          </p>
        </PremiumCardFooter>
      </PremiumCard>

      {/* Company logos bottom-left */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3">
        <img src={mainLogo1} alt="NTT DATA" className="h-8 w-auto object-contain" />
        <img src={mainLogo2} alt="Delivery Analytics" className="h-8 w-auto object-contain" />
      </div>
    </div>
  );
}
