import { cn } from "@/lib/utils";
import type { Confidence } from "@/types/api";

const CONFIG: Record<string, { dots: number; tone: string; en: string }> = {
  عالي: { dots: 3, tone: "bg-success", en: "high" },
  متوسط: { dots: 2, tone: "bg-warning", en: "moderate" },
  منخفض: { dots: 1, tone: "bg-danger", en: "low" },
  "أدلة غير كافية": { dots: 0, tone: "bg-muted-foreground", en: "insufficient evidence" },
};

export function ConfidenceIndicator({
  value,
  className,
}: {
  value: Confidence | string;
  className?: string;
}) {
  const cfg = CONFIG[value] ?? { dots: 0, tone: "bg-muted-foreground", en: "unknown" };
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("size-1.5 rounded-full", i < cfg.dots ? cfg.tone : "bg-border")}
          />
        ))}
      </span>
      <span className="text-foreground text-[13px]" dir="auto">
        {value}
      </span>
      <span className="text-muted-foreground font-mono text-[11px]">{cfg.en}</span>
    </span>
  );
}
