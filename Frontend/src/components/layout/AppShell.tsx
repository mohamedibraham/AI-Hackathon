import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Database,
  History,
  Languages,
  MessageSquareText,
  PanelsTopLeft,
  Search,
  Stethoscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/locale";
import { SystemStatusPill } from "@/components/clinical/SystemStatusPill";

const NAV = [
  { to: "/", label: "Clinical console", Icon: MessageSquareText },
  { to: "/knowledge", label: "Knowledge base", Icon: Database },
  { to: "/evaluation", label: "Evaluation", Icon: Activity },
] as const;

export function AppShell({
  title,
  sidebar,
  children,
}: {
  title: string;
  sidebar?: ReactNode;
  children: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { locale, toggleLocale } = useLocale();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="bg-background text-foreground flex h-screen overflow-hidden">
      {/* Icon rail */}
      <nav className="bg-panel hairline flex w-[52px] shrink-0 flex-col items-center gap-1 border-y-0 border-s-0 py-3">
        <div className="border-accent/40 text-accent mb-3 flex size-8 items-center justify-center rounded-md border">
          <Stethoscope className="size-4" />
        </div>
        {NAV.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-label={label}
              className={cn(
                "flex size-9 items-center justify-center rounded-md transition-colors duration-150",
                active
                  ? "bg-card text-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/70",
              )}
            >
              <Icon className="size-[17px]" />
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            aria-label="Search"
            className="text-muted-foreground hover:text-foreground hover:bg-card/70 flex size-9 items-center justify-center rounded-md transition-colors duration-150"
          >
            <Search className="size-[17px]" />
          </button>
          <button
            type="button"
            aria-label="History"
            className="text-muted-foreground hover:text-foreground hover:bg-card/70 flex size-9 items-center justify-center rounded-md transition-colors duration-150"
          >
            <History className="size-[17px]" />
          </button>
        </div>
      </nav>

      {/* Optional list column */}
      {sidebar && sidebarOpen ? (
        <aside className="bg-panel hairline hidden w-[248px] shrink-0 flex-col border-y-0 border-s-0 md:flex">
          {sidebar}
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hairline flex h-12 shrink-0 items-center gap-3 border-x-0 border-t-0 px-3">
          {sidebar ? (
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Toggle sidebar"
              className="text-muted-foreground hover:text-foreground hover:bg-card flex size-7 items-center justify-center rounded-md transition-colors duration-150"
            >
              <PanelsTopLeft className="size-4" />
            </button>
          ) : null}
          <h1 className="text-foreground truncate text-[13px] font-medium">{title}</h1>
          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLocale}
              className="hairline bg-card hover:border-muted-foreground/50 text-muted-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] transition-colors duration-150"
            >
              <Languages className="size-3.5" />
              {locale === "en" ? "EN" : "AR"}
            </button>
            <SystemStatusPill />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
