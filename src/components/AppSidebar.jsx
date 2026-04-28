import { useState } from "react";
import {
  Activity,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "@/components/NotificationPanel";
import tmsLogo from "@/assets/tms-logo.png";
import mainLogo1 from "@/assets/main-logo-1.png";
import mainLogo2 from "@/assets/main-logo-2.png";
import { getNavigationGroups, getRoleMeta } from "@/lib/app-shell-config";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

function SidebarNavItem({ item, collapsed, isActive, openGroup, setOpenGroup }) {
  const children = item.children || item.items;
  const hasChildren = !!children;
  const isOpen = openGroup === item.title;
  const childActive = hasChildren && children.some((c) => isActive(c.url));

  if (!hasChildren) {
    const active = isActive(item.url);
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-10">
          <NavLink
            to={item.url}
            className={cn(
              "flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-field)] transition-all duration-200 text-sm",
              active
                ? "border border-primary/10 bg-primary/[0.08] text-primary font-semibold"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-current")} />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // Expandable group
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={item.title}
        className="h-10"
        onClick={() => setOpenGroup(isOpen ? null : item.title)}
      >
        <div
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-field)] transition-all duration-200 text-sm cursor-pointer select-none",
            childActive
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          )}
        >
          <item.icon className={cn("h-[18px] w-[18px] shrink-0", childActive ? "text-primary" : "text-current")} />
          {!collapsed && (
            <>
              <span className="truncate flex-1">{item.title}</span>
              <ChevronRight
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                  isOpen && "rotate-90"
                )}
              />
            </>
          )}
        </div>
      </SidebarMenuButton>

      {/* Children */}
      {!collapsed && isOpen && (
        <div className="ml-4 pl-3 border-l border-border/40 mt-0.5 mb-1 flex flex-col gap-0.5">
          {children.map((child) => {
            const active = isActive(child.url);
            return (
              <NavLink
                key={child.title}
                to={child.url}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-[var(--radius-field)] text-[13px] transition-all duration-150",
                  active
                    ? "bg-primary/[0.08] text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                <child.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-current")} />
                <span className="truncate">{child.title}</span>
              </NavLink>
            );
          })}
        </div>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar({ className }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const handleLogout = () => { setUser(null); navigate("/Login"); };

  const isActive = (url) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  const userRole = user?.role || "trainer";
  const roleMeta = getRoleMeta(userRole);
  const items = getNavigationGroups(userRole).map((group) => {
    if (group.items.length === 1 && group.items[0].url === "/") {
      return group.items[0];
    }

    return {
      ...group,
      children: group.items,
      icon: group.icon || Activity,
    };
  });

  // Auto-open the group that has the active child
  const defaultOpen = items.find(
    (i) => i.children && i.children.some((c) => isActive(c.url))
  )?.title || null;

  const [openGroup, setOpenGroup] = useState(defaultOpen);

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "border-r border-border/55 h-screen shrink-0 bg-sidebar/95 shadow-[2px_0_18px_-10px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-all duration-300 ease-in-out z-40",
        className
      )}
    >
      <SidebarHeader className="border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-2 w-full">
          <img src={tmsLogo} alt="TMS Logo" className={cn("object-contain shrink-0", collapsed ? "h-8 w-8" : "h-9 w-9")} />
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wide text-foreground leading-tight">
                  Training<br />Management System
                </span>
                <span className="mt-1 inline-flex rounded-[var(--radius-field)] border border-primary/15 bg-primary/[0.08] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                  {roleMeta.workspaceLabel}
                </span>
              </div>
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors shrink-0" />
            </>
          )}
          {collapsed && (
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => (
                <SidebarNavItem
                  key={item.title}
                  item={item}
                  collapsed={collapsed}
                  isActive={isActive}
                  openGroup={openGroup}
                  setOpenGroup={setOpenGroup}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Notifications */}
        <SidebarGroup className="py-0 mt-2">
          <SidebarGroupContent>
            <div className={cn("px-2", collapsed && "flex justify-center")}>
              <NotificationPanel collapsed={collapsed} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-border/50 p-2">
        <div className="surface-panel flex items-center gap-3 px-2.5 py-2.5 transition-colors">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-panel)] border border-primary/15 bg-primary/[0.08] text-xs font-bold text-primary shrink-0">
            {user?.name?.split(" ").map((n) => n[0]).join("") || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{user?.name || "User"}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{roleMeta.label}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={handleLogout} className="ml-auto rounded-[var(--radius-field)] p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" title="Logout">
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
