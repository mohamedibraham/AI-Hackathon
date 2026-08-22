import { AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/types/api";

const CONFIG: Record<RiskLevel, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  allowed: {
    label: "allowed",
    className: "text-success border-success/40 bg-success/10",
    Icon: CheckCircle2,
  },
  caution: {
    label: "caution",
    className: "text-warning border-warning/40 bg-warning/10",
    Icon: AlertTriangle,
  },
  reject: {
    label: "reject",
    className: "text-danger border-danger/40 bg-danger/10",
    Icon: Ban,
  },
};

export function RiskLevelBadge({ value, className }: { value: RiskLevel; className?: string }) {
  const { label, className: tone, Icon } = CONFIG[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide uppercase",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
      {label}
    </span>
  );
}
