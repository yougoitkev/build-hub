import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function QuickActionCard({ label, description, icon: Icon, link, color = "text-primary bg-primary/10", delay = 0 }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(link)}
      className={cn(
        "group relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border border-border/40 bg-card/50 backdrop-blur-xl",
        "shadow-[0_4px_16px_-8px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.15)]",
        "hover:-translate-y-1 hover:border-border/70",
        "transition-all duration-500 ease-out text-left w-full overflow-hidden animate-fade-scale"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {/* Ambient orb */}
      <div className={cn("absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500", color)} />

      <div className={cn("relative h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 backdrop-blur transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative z-10">
        <p className="text-sm font-semibold text-foreground tracking-tight">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}
