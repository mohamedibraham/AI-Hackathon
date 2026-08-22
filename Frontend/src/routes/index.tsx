import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Copy, Minus, Plus, Plus as PlusIcon, RefreshCw, Send, BookmarkPlus, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ConversationListItem } from "@/components/clinical/ConversationListItem";
import { CitationMarker } from "@/components/clinical/CitationMarker";
import { ClinicalSummaryCard } from "@/components/clinical/ClinicalSummaryCard";
import { SourceTraceCard } from "@/components/clinical/SourceTraceCard";
import { CitationFocusProvider } from "@/components/clinical/citation-focus";
import { EmptyState, ErrorState } from "@/components/clinical/States";
import { generateAnswer } from "@/services/api/search.service";
import type { GenerateResponse } from "@/types/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clinical Query Console — Blood Pressure RAG" },
      {
        name: "description",
        content:
          "Guideline-grounded hypertension decision support: every recommendation cited to WHO, NICE, CDC and USPSTF sources.",
      },
      { property: "og:title", content: "Clinical Query Console — Blood Pressure RAG" },
      {
        property: "og:description",
        content:
          "Ask clinical questions about blood pressure management and trace every claim back to its source guideline.",
      },
    ],
  }),
  component: ConsolePage,
});

interface Turn {
  id: string;
  question: string;
  status: "loading" | "success" | "error";
  response: GenerateResponse | null;
  error: string | null;
  topK: number;
}

interface Conversation {
  id: string;
  title: string;
  turns: Turn[];
  topK: number;
}

const EXAMPLES = [
  "What is the first-line treatment for stage 1 hypertension in a 54-year-old?",
  "When is ambulatory blood pressure monitoring indicated?",
  "Which antihypertensives are contraindicated in pregnancy?",
];

const newConversation = (): Conversation => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  turns: [],
  topK: 5,
});

function ConsolePage() {
  return (
    <CitationFocusProvider>
      <ConsolePageInner />
    </CitationFocusProvider>
  );
}

function ConsolePageInner() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()]);
  const [activeId, setActiveId] = useState(() => conversations[0]!.id);
  const [input, setInput] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]!;

  const patch = useCallback(
    (id: string, updater: (c: Conversation) => Conversation) =>
      setConversations((prev) => prev.map((c) => (c.id === id ? updater(c) : c))),
    [],
  );

  const runQuery = useCallback(
    async (question: string, turnId: string, convId: string, topK: number) => {
      try {
        const response = await generateAnswer(question, topK);
        patch(convId, (c) => ({
          ...c,
          turns: c.turns.map((t) =>
            t.id === turnId ? { ...t, status: "success", response, error: null } : t,
          ),
        }));
      } catch (err) {
        patch(convId, (c) => ({
          ...c,
          turns: c.turns.map((t) =>
            t.id === turnId
              ? { ...t, status: "error", error: err instanceof Error ? err.message : String(err) }
              : t,
          ),
        }));
      }
    },
    [patch],
  );

  const submit = useCallback(
    (question: string) => {
      const q = question.trim();
      if (!q) return;
      const turnId = crypto.randomUUID();
      const convId = active.id;
      const topK = active.topK;
      patch(convId, (c) => ({
        ...c,
        title: c.turns.length === 0 ? (q.length > 46 ? `${q.slice(0, 46)}…` : q) : c.title,
        turns: [...c.turns, { id: turnId, question: q, status: "loading", response: null, error: null, topK }],
      }));
      setInput("");
      void runQuery(q, turnId, convId, topK);
    },
    [active.id, active.topK, patch, runQuery],
  );

  const regenerate = useCallback(
    (turn: Turn) => {
      patch(active.id, (c) => ({
        ...c,
        turns: c.turns.map((t) => (t.id === turn.id ? { ...t, status: "loading", error: null } : t)),
      }));
      void runQuery(turn.question, turn.id, active.id, turn.topK);
    },
    [active.id, patch, runQuery],
  );

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [active.turns.length, active.id]);

  const [focusedTurn, setFocusedTurn] = useState<string | null>(null);
  const traceTurn = useMemo(() => {
    const withSources = active.turns.filter((t) => t.response);
    return withSources.find((t) => t.id === focusedTurn) ?? withSources[withSources.length - 1] ?? null;
  }, [active.turns, focusedTurn]);

  const sidebar = (
    <>
      <div className="hairline flex items-center justify-between border-x-0 border-t-0 px-3 py-2.5">
        <span className="eyebrow">conversations</span>
        <button
          type="button"
          aria-label="New conversation"
          onClick={() => {
            const c = newConversation();
            setConversations((prev) => [c, ...prev]);
            setActiveId(c.id);
          }}
          className="text-muted-foreground hover:text-accent hover:bg-card flex size-6 items-center justify-center rounded-md transition-colors duration-150"
        >
          <PlusIcon className="size-3.5" />
        </button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {conversations.map((c) => {
          const sources = c.turns.reduce((n, t) => n + (t.response?.citations.length ?? 0), 0);
          return (
            <ConversationListItem
              key={c.id}
              title={c.title}
              meta={`top_k: ${c.topK} · ${sources} sources`}
              active={c.id === active.id}
              onClick={() => setActiveId(c.id)}
            />
          );
        })}
      </div>
    </>
  );

  return (
    <AppShell title={active.title} sidebar={sidebar}>
      <div className="flex h-full min-h-0">
        {/* Center: thread */}
        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-10">
              {active.turns.length === 0 ? (
                <div className="pt-16">
                  <EmptyState
                    title="Ask a guideline-grounded clinical question"
                    description="Answers are generated only from indexed hypertension guidelines (WHO, NICE, CDC, USPSTF), with a citation for every claim."
                  />
                  <div className="mx-auto mt-4 flex max-w-xl flex-col gap-2">
                    {EXAMPLES.map((ex) => (
                      <button
                        key={ex}
                        type="button"
                        onClick={() => submit(ex)}
                        className="bg-card hairline hover:border-accent/60 text-foreground/90 rounded-md px-3 py-2 text-start text-[13px] transition-colors duration-150"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {active.turns.map((turn) => (
                <TurnBlock
                  key={turn.id}
                  turn={turn}
                  onRegenerate={() => regenerate(turn)}
                  onFocus={() => setFocusedTurn(turn.id)}
                />
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="hairline border-x-0 border-b-0 px-6 py-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
              className="bg-card hairline focus-within:border-accent/60 mx-auto flex max-w-3xl items-end gap-2 rounded-lg p-2 transition-colors duration-150"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={1}
                dir="auto"
                placeholder="Ask a clinical question about blood pressure management…"
                className="text-foreground placeholder:text-muted-foreground max-h-40 min-h-[34px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13.5px] outline-none"
              />
              <div className="hairline flex items-center gap-1 rounded-md px-1.5 py-1">
                <span className="text-muted-foreground font-mono text-[10.5px]">top_k</span>
                <button
                  type="button"
                  aria-label="Decrease top_k"
                  onClick={() => patch(active.id, (c) => ({ ...c, topK: Math.max(1, c.topK - 1) }))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Minus className="size-3" />
                </button>
                <span className="text-foreground w-4 text-center font-mono text-[11.5px]">
                  {active.topK}
                </span>
                <button
                  type="button"
                  aria-label="Increase top_k"
                  onClick={() => patch(active.id, (c) => ({ ...c, topK: Math.min(20, c.topK + 1) }))}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim()}
                className="bg-accent text-accent-foreground flex size-8 items-center justify-center rounded-md transition-opacity duration-150 disabled:opacity-40"
              >
                <Send className="size-3.5" />
              </button>
            </form>
          </div>
        </section>

        {/* Right: source trace */}
        <aside className="bg-panel hairline hidden w-[320px] shrink-0 flex-col border-y-0 border-e-0 lg:flex">
          <div className="hairline border-x-0 border-t-0 px-3 py-2.5">
            <span className="eyebrow">source trace</span>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {traceTurn?.response ? (
              traceTurn.response.citations.map((citation) => (
                <SourceTraceCard key={citation.chunk_id} turnId={traceTurn.id} citation={citation} />
              ))
            ) : (
              <EmptyState
                title="No sources yet"
                description="Citations behind the focused answer appear here."
              />
            )}
          </div>
          {traceTurn?.response ? (
            <div className="hairline border-x-0 border-b-0 px-3 py-2">
              <span className="text-muted-foreground font-mono text-[10.5px]">
                {traceTurn.response.citations.length} chunks · top_k {traceTurn.response.top_k}
              </span>
            </div>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}

function AnswerText({ turnId, answer }: { turnId: string; answer: string }) {
  const parts = answer.split(/(\[\d+\])/g);
  return (
    <p className="text-foreground/90 text-[14px] leading-[1.75]" dir="auto">
      {parts.map((part, i) => {
        const match = /^\[(\d+)\]$/.exec(part);
        if (match)
          return <CitationMarker key={i} turnId={turnId} marker={Number(match[1])} />;
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

function TurnBlock({
  turn,
  onRegenerate,
  onFocus,
}: {
  turn: Turn;
  onRegenerate: () => void;
  onFocus: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="fade-rise space-y-6" onMouseEnter={onFocus}>
      <div>
        <p className="eyebrow font-mono">user</p>
        <p className="text-foreground mt-1.5 text-[14px] leading-relaxed" dir="auto">
          {turn.question}
        </p>
      </div>

      <div>
        <p className="eyebrow font-mono">assistant · clinical rag</p>
        <div className="mt-1.5">
          {turn.status === "loading" ? (
            <div className="flex items-center gap-2">
              <span className="bg-accent pulse-dot size-1.5 rounded-full" />
              <span className="text-muted-foreground text-[13px]">
                Analyzing clinical guidelines…
              </span>
            </div>
          ) : turn.status === "error" ? (
            <ErrorState
              className="items-start py-4 text-start"
              description={turn.error ?? undefined}
              onRetry={onRegenerate}
            />
          ) : turn.response ? (
            <>
              <AnswerText turnId={turn.id} answer={turn.response.answer} />
              <ClinicalSummaryCard
                summary={turn.response.clinical_summary}
                unsupportedClaims={turn.response.unsupported_claims}
              />
              <div className="mt-3 flex items-center gap-4">
                <ActionButton
                  Icon={copied ? Check : Copy}
                  label={copied ? "Copied" : "Copy"}
                  onClick={async () => {
                    await navigator.clipboard.writeText(turn.response!.answer);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                />
                <ActionButton Icon={RefreshCw} label="Regenerate" onClick={onRegenerate} />
                <ActionButton
                  Icon={BookmarkPlus}
                  label="Save to notes"
                  onClick={() => toast.success("Saved to notes")}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof Copy;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[12px] transition-colors duration-150",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}
