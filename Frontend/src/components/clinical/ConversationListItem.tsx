import { cn } from "@/lib/utils";

export function ConversationListItem({
  title,
  meta,
  active,
  onClick,
}: {
  title: string;
  meta: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-md px-3 py-2 text-start transition-colors duration-150",
        active ? "bg-card" : "hover:bg-card/60",
      )}
    >
      {active ? (
        <span className="bg-accent absolute inset-y-1.5 start-0 w-[2px] rounded-full" />
      ) : null}
      <p
        className={cn(
          "truncate text-[13px]",
          active ? "text-foreground" : "text-foreground/80",
        )}
      >
        {title}
      </p>
      <p className="text-muted-foreground mt-0.5 truncate font-mono text-[10.5px]">{meta}</p>
    </button>
  );
}
