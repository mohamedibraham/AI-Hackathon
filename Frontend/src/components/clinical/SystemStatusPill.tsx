import { useApiRequest } from "@/hooks/useApiRequest";
import { getHealth } from "@/services/api/health.service";
import type { HealthResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export function SystemStatusPill() {
  const { data, status } = useApiRequest<HealthResponse>(getHealth, []);
  const connected = data?.vector_store === "connected";
  const loading = status === "loading";

  return (
    <HoverCard openDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="hairline bg-card hover:border-muted-foreground/50 inline-flex items-center gap-2 rounded-md px-2.5 py-1 transition-colors duration-150"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              loading ? "bg-muted-foreground pulse-dot" : connected ? "bg-success" : "bg-danger",
            )}
          />
          <span className="text-muted-foreground font-mono text-[11px]">
            {loading ? "checking" : connected ? "connected" : "disconnected"}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="bg-card hairline w-64 rounded-md p-3">
        <span className="eyebrow">vector store</span>
        <dl className="mt-2 space-y-1.5 font-mono text-[11.5px]">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">status</dt>
            <dd className="text-foreground">{data?.status ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">collection</dt>
            <dd className="text-foreground truncate">{data?.collection_name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">chunks</dt>
            <dd className="text-foreground">{data?.chunk_count?.toLocaleString() ?? "—"}</dd>
          </div>
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}
