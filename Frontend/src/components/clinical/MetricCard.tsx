import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  meta,
  ring,
  className,
}: {
  label: string;
  value: string | number;
  meta?: string;
  /** 0..1 — renders a circular progress ring instead of a plain number block. */
  ring?: number;
  className?: string;
}) {
  const pct = ring != null ? Math.max(0, Math.min(1, ring)) : null;
  const r = 30;
  const c = 2 * Math.PI * r;

  return (
    <div className={cn("bg-card hairline rounded-lg p-4", className)}>
      <span className="eyebrow">{label}</span>
      {pct != null ? (
        <div className="mt-3 flex items-center gap-4">
          <svg viewBox="0 0 72 72" className="size-[72px] shrink-0 -rotate-90">
            <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
            <circle
              cx="36"
              cy="36"
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${c * pct} ${c}`}
            />
          </svg>
          <div>
            <p className="text-foreground font-mono text-3xl leading-none">
              {(pct * 100).toFixed(1)}
              <span className="text-muted-foreground text-lg">%</span>
            </p>
            {meta ? <p className="text-muted-foreground mt-1.5 text-[12px]">{meta}</p> : null}
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-foreground font-mono text-3xl leading-none break-all">{value}</p>
          {meta ? <p className="text-muted-foreground mt-2 text-[12px]">{meta}</p> : null}
        </div>
      )}
    </div>
  );
}
