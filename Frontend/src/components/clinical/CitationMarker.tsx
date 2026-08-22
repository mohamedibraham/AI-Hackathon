import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { citationKey, useCitationFocus } from "./citation-focus";

export function CitationMarker({ turnId, marker }: { turnId: string; marker: number }) {
  const { setActive, registerMarker, isActive } = useCitationFocus();
  const active = isActive(turnId, marker);
  const key = citationKey(turnId, marker);

  const ref = useCallback(
    (el: HTMLButtonElement | null) => registerMarker(key, el),
    [key, registerMarker],
  );

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={() => setActive({ turnId, marker })}
      onMouseLeave={() => setActive(null)}
      onFocus={() => setActive({ turnId, marker })}
      onBlur={() => setActive(null)}
      onClick={() => setActive(active ? null : { turnId, marker })}
      aria-label={`Citation ${marker}`}
      className={cn(
        "border-citation/60 text-citation bg-citation-tint mx-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[5px] border px-1 align-baseline font-mono text-[11px] leading-none transition-colors duration-150",
        active && "border-citation bg-citation/20",
      )}
    >
      {marker}
    </button>
  );
}
