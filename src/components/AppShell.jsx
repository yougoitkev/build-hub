import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export function AppShell({ children }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full ambient-bg">
        <AppSidebar />
        <main className="flex-1 overflow-auto p-6 min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
