import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

export function StatCard({ label, value, icon: Icon, color, link, delay = 0 }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(link)}
      className={cn(
        "group relative flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card",
        "hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20",
        "transition-all duration-300 text-left w-full overflow-hidden",
        "animate-fade-scale"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}
