import { useCallback } from "react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/types/api";
import { citationKey, useCitationFocus } from "./citation-focus";

function locatorOf(citation: Citation): string {
  if (citation.page_start != null) {
    return citation.page_end && citation.page_end !== citation.page_start
      ? `p. ${citation.page_start}–${citation.page_end}`
      : `p. ${citation.page_start}`;
  }
  if (citation.line_start != null) {
    return citation.line_end && citation.line_end !== citation.line_start
      ? `L. ${citation.line_start}–${citation.line_end}`
      : `L. ${citation.line_start}`;
  }
  return citation.section ? "§" : "—";
}

export function SourceTraceCard({ turnId, citation }: { turnId: string; citation: Citation }) {
  const { setActive, registerCard, isActive } = useCitationFocus();
  const active = isActive(turnId, citation.marker);
  const key = citationKey(turnId, citation.marker);

  const ref = useCallback((el: HTMLDivElement | null) => registerCard(key, el), [key, registerCard]);

  return (
    <div
      ref={ref}
      onMouseEnter={() => setActive({ turnId, marker: citation.marker })}
      onMouseLeave={() => setActive(null)}
      className={cn(
        "bg-card hairline rounded-md p-3 transition-colors duration-150",
        active ? "border-citation" : "hover:border-muted-foreground/40",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "border-citation/60 text-citation bg-citation-tint mt-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border px-1 font-mono text-[11px] leading-none",
          )}
        >
          {citation.marker}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-foreground truncate font-mono text-[12px] font-medium">
              {citation.document_name}
            </p>
            <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
              {locatorOf(citation)}
            </span>
          </div>
          {citation.section ? (
            <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{citation.section}</p>
          ) : null}
          <p className="text-muted-foreground mt-2 line-clamp-3 text-[12.5px] leading-relaxed">
            {citation.excerpt}
          </p>
          <p className="text-muted-foreground/70 mt-2 font-mono text-[10.5px]">
            {citation.chunk_id}
          </p>
        </div>
      </div>
    </div>
  );
}
