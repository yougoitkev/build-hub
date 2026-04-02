import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ClipboardCheck,
  Eye,
  UserCog,
  Activity,
  LogOut,
  History,
  BarChart3,
  Network,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "@/components/NotificationPanel";
import tmsLogo from "@/assets/tms-logo.png";
import mainLogo1 from "@/assets/main-logo-1.png";
import mainLogo2 from "@/assets/main-logo-2.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const getSupervisorNav = () => [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Trainer Form", url: "/trainer-form", icon: UserCog },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Students", url: "/students", icon: Users },
  { title: "Trainers", url: "/trainers", icon: Users },
  { title: "Progress", url: "/progress", icon: Activity },
  { title: "Trainer Attendance", url: "/trainer-attendance", icon: ClipboardCheck },
  { title: "Trainer Observations", url: "/trainer-observations", icon: Eye },
  { title: "Trainer Utilization", url: "/trainer-utilization", icon: BarChart3 },
  { title: "Org Chart", url: "/org-chart", icon: Network },
  { title: "Audit Trail", url: "/audit", icon: History },
];

const getTrainerNav = () => [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Students", url: "/students", icon: Users },
  { title: "Calendar", url: "/calendar", icon: CalendarDays },
  { title: "Progress", url: "/progress", icon: Activity },
  { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
  { title: "Observations", url: "/observations", icon: Eye },
];

export function AppSidebar({ className }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const handleLogout = () => { setUser(null); navigate('/Login'); };

  const isActive = (url) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'admin';
  const mainNav = isSupervisor ? getSupervisorNav() : getTrainerNav();

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-border/50 h-screen transition-all duration-300 ease-in-out shrink-0 glass-panel animate-slide-in z-40 bg-background/70 shadow-[2px_0_15px_-3px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <SidebarHeader className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 w-full">
          <img src={tmsLogo} alt="TMS Logo" className={cn("object-contain shrink-0", collapsed ? "h-8 w-8" : "h-9 w-9")} />
          {!collapsed && (
            <>
              <span className="text-[10px] font-bold uppercase tracking-wide text-foreground leading-tight flex-1">Training<br />Management System</span>
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors shrink-0" />
            </>
          )}
          {collapsed && (
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2 gap-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-2">
            {isSupervisor ? "Supervisor" : "Trainer"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNav.map((item) => {
                const isNavActive = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isNavActive} tooltip={item.title} className="h-10">
                      <NavLink to={item.url} className={cn("flex items-center gap-3 w-full p-2 rounded-lg transition-all duration-200", isNavActive ? "bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted font-medium hover:text-foreground")}>
                        <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isNavActive ? "scale-110" : "")} />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Notifications section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-2 px-2">
            Alerts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className={cn("px-2", collapsed && "flex justify-center")}>
              <NotificationPanel collapsed={collapsed} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-border/50 p-2">
        {/* User info & logout */}
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-secondary/30 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 shrink-0">
            {user?.name?.split(" ").map((n) => n[0]).join("") || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{user?.role || "Role"}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="ml-auto p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Company logos */}
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed ? "flex-col" : "justify-center")}>
          <img src={mainLogo1} alt="NTT DATA" className={cn("object-contain", collapsed ? "h-5 w-auto" : "h-6 w-auto")} />
          <img src={mainLogo2} alt="Delivery Analytics" className={cn("object-contain", collapsed ? "h-5 w-auto" : "h-6 w-auto")} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
