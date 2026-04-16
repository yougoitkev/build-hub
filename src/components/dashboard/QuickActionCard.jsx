import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function QuickActionCard({ label, description, icon: Icon, link, color = "text-primary bg-primary/10", delay = 0 }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(link)}
      className={cn(
        "group relative flex flex-col items-start gap-2 p-4 rounded-xl border border-border/50 bg-card",
        "hover:shadow-lg hover:-translate-y-1 hover:border-primary/30",
        "transition-all duration-300 ease-out text-left w-full overflow-hidden",
        "animate-fade-scale"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
      
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="relative z-10">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}
