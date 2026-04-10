import { useState } from "react";
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
  Grid3X3,
  ListTodo,
  FileText,
  Award,
  ChevronDown,
  GraduationCap,
  Settings,
  Briefcase,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Supervisor: 4 groups
const getSupervisorGroups = () => [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
      { title: "Org Chart", url: "/org-chart", icon: Network },
    ],
  },
  {
    label: "Training",
    icon: GraduationCap,
    items: [
      { title: "Trainer Form", url: "/trainer-form", icon: UserCog },
      { title: "Students", url: "/students", icon: Users },
      { title: "Trainers", url: "/trainers", icon: Users },
      { title: "Skills Matrix", url: "/skills-matrix", icon: Grid3X3 },
    ],
  },
  {
    label: "Operations",
    icon: Briefcase,
    items: [
      { title: "Attendance & Leave", url: "/trainer-attendance", icon: ClipboardCheck },
      { title: "Observations", url: "/trainer-observations", icon: Eye },
      { title: "Utilization", url: "/trainer-utilization", icon: BarChart3 },
      { title: "Progress", url: "/progress", icon: Activity },
    ],
  },
  {
    label: "Resources",
    icon: Settings,
    items: [
      { title: "Tasks", url: "/tasks", icon: ListTodo },
      { title: "Materials", url: "/materials", icon: FileText },
      { title: "Certifications", url: "/certifications", icon: Award },
      { title: "Audit Trail", url: "/audit", icon: History },
    ],
  },
];

// Trainer: 3 groups
const getTrainerGroups = () => [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Calendar", url: "/calendar", icon: CalendarDays },
      { title: "Students", url: "/students", icon: Users },
    ],
  },
  {
    label: "My Work",
    icon: Briefcase,
    items: [
      { title: "Attendance", url: "/attendance", icon: ClipboardCheck },
      { title: "Observations", url: "/observations", icon: Eye },
      { title: "Progress", url: "/progress", icon: Activity },
    ],
  },
  {
    label: "Resources",
    icon: Settings,
    items: [
      { title: "Tasks", url: "/tasks", icon: ListTodo },
      { title: "Materials", url: "/materials", icon: FileText },
      { title: "Certifications", url: "/certifications", icon: Award },
    ],
  },
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
  const groups = isSupervisor ? getSupervisorGroups() : getTrainerGroups();

  // Determine which group should be open based on current route
  const activeGroupIndex = groups.findIndex(g => g.items.some(i => isActive(i.url)));

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

      <SidebarContent className="p-2 gap-1">
        {groups.map((group, gIdx) => {
          const groupHasActive = group.items.some(i => isActive(i.url));

          return collapsed ? (
            // When collapsed, show only icons
            <SidebarGroup key={group.label}>
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {group.items.map((item) => {
                    const isNavActive = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isNavActive} tooltip={item.title} className="h-9">
                          <NavLink to={item.url} className={cn("flex items-center justify-center w-full p-2 rounded-lg transition-all duration-200", isNavActive ? "bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                            <item.icon className={cn("h-4 w-4 shrink-0", isNavActive ? "scale-110" : "")} />
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            <Collapsible key={group.label} defaultOpen={groupHasActive || gIdx === 0}>
              <SidebarGroup className="py-0">
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1 px-2 flex items-center justify-between cursor-pointer hover:text-muted-foreground transition-colors">
                    <span className="flex items-center gap-2">
                      <group.icon className="h-3.5 w-3.5" />
                      {group.label}
                    </span>
                    <ChevronDown className="h-3 w-3 transition-transform duration-200 [&[data-state=open]]:rotate-180 group-data-[state=open]:rotate-180" />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0.5">
                      {group.items.map((item) => {
                        const isNavActive = isActive(item.url);
                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton asChild isActive={isNavActive} tooltip={item.title} className="h-9">
                              <NavLink to={item.url} className={cn("flex items-center gap-3 w-full px-2 py-1.5 rounded-lg transition-all duration-200 text-sm", isNavActive ? "bg-primary/10 text-primary font-bold shadow-sm ring-1 ring-primary/20" : "text-muted-foreground hover:bg-muted font-medium hover:text-foreground")}>
                                <item.icon className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isNavActive ? "scale-110" : "")} />
                                <span className="truncate">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}

        {/* Notifications */}
        <SidebarGroup className="py-0 mt-2">
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1 px-2">
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
        <div className={cn("flex items-center gap-3 px-2 py-2", collapsed ? "flex-col" : "justify-center")}>
          <img src={mainLogo1} alt="NTT DATA" className={cn("object-contain", collapsed ? "h-5 w-auto" : "h-6 w-auto")} />
          <img src={mainLogo2} alt="Delivery Analytics" className={cn("object-contain", collapsed ? "h-5 w-auto" : "h-6 w-auto")} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
