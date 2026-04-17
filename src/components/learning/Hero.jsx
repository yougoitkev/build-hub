import React from "react";
import { cn } from "@/lib/utils";

export function Hero({
  title,
  description,
  badge,
  actions,
  image,
  className,
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/40 bg-card/50 backdrop-blur-2xl",
        "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] p-8 md:p-12 mb-8 animate-fade-scale",
        className
      )}
    >
      {/* Ambient orbs */}
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-gradient-to-tr from-accent/15 to-transparent blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl">
        {badge && (
          <span className="inline-flex items-center rounded-full bg-background/70 backdrop-blur border border-border/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/70 mb-5 shadow-sm">
            {badge}
          </span>
        )}
        <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight leading-[1.1]">
          {title}
        </h1>
        {description && (
          <p className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl">
            {description}
          </p>
        )}
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
      </div>
      {image && (
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none hidden md:block">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
    </div>
  );
}
