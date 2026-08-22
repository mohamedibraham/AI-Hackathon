import { CircleAlert, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-12", className)}>
      <Loader2 className="text-muted-foreground size-4 animate-spin" />
      <span className="text-muted-foreground font-mono text-[12px]">{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-center", className)}>
      <Inbox className="text-muted-foreground size-5" />
      <p className="text-foreground text-sm">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm text-[12.5px] leading-relaxed">{description}</p>
      ) : null}
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Request failed",
  description,
  onRetry,
  className,
}: {
  title?: string | undefined;
  description?: string | undefined;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-center", className)}>
      <CircleAlert className="text-danger size-5" />
      <p className="text-foreground text-sm">{title}</p>
      {description ? (
        <p className="text-muted-foreground max-w-sm font-mono text-[12px] leading-relaxed">
          {description}
        </p>
      ) : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="hairline text-foreground hover:border-accent mt-2 rounded-md px-3 py-1.5 text-[12.5px] transition-colors duration-150"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
