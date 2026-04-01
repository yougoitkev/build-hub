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
        "relative overflow-hidden rounded-2xl bg-card border border-border p-8 md:p-12 mb-8",
        className
      )}
    >
      <div className="relative z-10 max-w-2xl">
        {badge && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4">
            {badge}
          </span>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {description}
          </p>
        )}
        {actions && <div className="flex flex-wrap gap-4">{actions}</div>}
      </div>
      {image && (
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 pointer-events-none hidden md:block">
          <img src={image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      {/* Subtle decorative element */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-accent/5 blur-2xl" />
    </div>
  );
}
