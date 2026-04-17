import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

export function StatCard({ label, value, icon: Icon, color, link, delay = 0 }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(link)}
      className={cn(
        "group relative flex items-center gap-3 p-5 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-xl",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12)]",
        "hover:-translate-y-1 hover:border-border/70",
        "transition-all duration-500 ease-out text-left w-full overflow-hidden animate-fade-scale"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {/* Ambient blur orb */}
      <div className={cn("absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500", color)} />

      <div className={cn("relative h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 backdrop-blur transition-transform duration-500 group-hover:scale-110", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">{label}</p>
        <p className="text-2xl font-bold text-foreground tabular-nums tracking-tight">{value}</p>
      </div>
      <ArrowUpRight className="relative h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0" />
    </button>
  );
}
