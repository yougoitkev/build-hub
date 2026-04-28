import { cn } from "@/lib/utils";

export function PageHeader({
  icon: Icon,
  title,
  description,
  eyebrow,
  meta,
  actions,
  className,
}) {
  return (
    <div
      className={cn(
        "surface-shell relative overflow-hidden px-6 py-5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
        <div className="absolute -right-10 top-0 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-3 inline-flex items-center rounded-[var(--radius-field)] border border-border/60 bg-background/85 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
              {eyebrow}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {Icon ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-panel)] border border-primary/15 bg-primary/[0.08] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <Icon className="h-5 w-5" />
              </div>
            ) : null}
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          </div>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export default PageHeader;
