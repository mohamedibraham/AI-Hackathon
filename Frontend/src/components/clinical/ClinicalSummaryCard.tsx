import { useState } from "react";
import { Check, Copy, ShieldAlert, TriangleAlert } from "lucide-react";
import type { ClinicalSummary } from "@/types/api";
import { RiskLevelBadge } from "./RiskLevelBadge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";

export function ClinicalSummaryCard({
  summary,
  unsupportedClaims,
}: {
  summary: ClinicalSummary;
  unsupportedClaims: string[];
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-card hairline mt-4 overflow-hidden rounded-md">
      <div className="hairline flex items-center justify-between border-x-0 border-t-0 px-3 py-2">
        <span className="text-muted-foreground font-mono text-[11px] tracking-wide">
          clinical-summary
        </span>
        <button
          type="button"
          onClick={copy}
          className="text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label="Copy clinical summary"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="eyebrow">risk</span>
            <RiskLevelBadge value={summary.risk_level} />
          </div>
          <div className="flex items-center gap-2">
            <span className="eyebrow">confidence</span>
            <ConfidenceIndicator value={summary.confidence} />
          </div>
        </div>

        <div className="flex gap-2">
          <ShieldAlert className="text-warning mt-0.5 size-3.5 shrink-0" />
          <p className="text-muted-foreground text-[12.5px] leading-relaxed">{summary.safety_note}</p>
        </div>

        <div>
          <span className="eyebrow">supporting evidence</span>
          <ul className="mt-1.5 space-y-1">
            {summary.supporting_evidence.map((item) => (
              <li
                key={item}
                className="text-foreground/90 flex gap-2 font-mono text-[12px] leading-relaxed"
              >
                <span className="text-muted-foreground">–</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {unsupportedClaims.length > 0 ? (
          <div className="border-danger/40 bg-danger/5 flex gap-2 rounded-md border border-dashed px-2.5 py-2">
            <TriangleAlert className="text-danger mt-0.5 size-3.5 shrink-0" />
            <div>
              <span className="text-danger/90 font-mono text-[11px] tracking-wide uppercase">
                unsupported claims ({unsupportedClaims.length})
              </span>
              <ul className="mt-1 space-y-1">
                {unsupportedClaims.map((claim) => (
                  <li key={claim} className="text-muted-foreground text-[12.5px] leading-relaxed">
                    {claim}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
