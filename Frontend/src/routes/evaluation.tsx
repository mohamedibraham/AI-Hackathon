import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpDown } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/clinical/MetricCard";
import { ErrorState, LoadingState } from "@/components/clinical/States";
import { useApiRequest } from "@/hooks/useApiRequest";
import { getBenchmark } from "@/services/api/benchmark.service";
import type { BenchmarkDetail, BenchmarkResponse } from "@/types/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Evaluation — Blood Pressure RAG" },
      {
        name: "description",
        content:
          "Retrieval precision, citation accuracy and faithfulness benchmarks for the hypertension clinical RAG system.",
      },
      { property: "og:title", content: "Evaluation — Blood Pressure RAG" },
      {
        property: "og:description",
        content: "Per-question benchmark results proving the system's citation reliability.",
      },
    ],
  }),
  component: EvaluationPage,
});

type SortKey = "precision" | "correct_citations" | "unsupported_claims";

function EvaluationPage() {
  const { data, status, error, refetch } = useApiRequest<BenchmarkResponse>(getBenchmark, []);
  const [sortKey, setSortKey] = useState<SortKey>("precision");
  const [asc, setAsc] = useState(false);

  const rows = useMemo<BenchmarkDetail[]>(() => {
    if (!data) return [];
    return [...data.details].sort((a, b) => (asc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]));
  }, [data, sortKey, asc]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(false);
    }
  };

  return (
    <AppShell title="Evaluation">
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div>
            <span className="eyebrow">benchmark</span>
            <h2 className="text-foreground mt-1 text-lg font-medium">System credibility metrics</h2>
          </div>

          {status === "loading" ? (
            <LoadingState label="Running benchmark…" />
          ) : status === "error" ? (
            <ErrorState description={error?.message} onRetry={refetch} />
          ) : data ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <MetricCard
                  label="retrieval precision @5"
                  value={data.retrieval_precision_at_5}
                  ring={data.retrieval_precision_at_5}
                  meta={`${data.questions_evaluated} questions evaluated`}
                />
                <MetricCard
                  label="citation accuracy"
                  value={data.citation_accuracy}
                  ring={data.citation_accuracy}
                  meta="citations resolving to correct chunk"
                />
                <MetricCard
                  label="faithfulness"
                  value={data.faithfulness}
                  ring={data.faithfulness}
                  meta="claims grounded in retrieved sources"
                />
              </div>

              <div className="bg-card hairline overflow-hidden rounded-lg">
                <div className="hairline flex items-center justify-between border-x-0 border-t-0 px-3 py-2">
                  <span className="eyebrow">per-question results</span>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    questions_evaluated: {data.questions_evaluated}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-start">
                    <thead>
                      <tr className="hairline border-x-0 border-t-0">
                        <th className="eyebrow px-3 py-2 text-start font-normal">question</th>
                        <SortHeader label="precision" onClick={() => toggleSort("precision")} active={sortKey === "precision"} />
                        <SortHeader
                          label="correct citations"
                          onClick={() => toggleSort("correct_citations")}
                          active={sortKey === "correct_citations"}
                        />
                        <SortHeader
                          label="unsupported claims"
                          onClick={() => toggleSort("unsupported_claims")}
                          active={sortKey === "unsupported_claims"}
                        />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.question} className="hairline hover:bg-panel/60 border-x-0 border-t-0 last:border-b-0 transition-colors duration-150">
                          <td className="text-foreground/90 max-w-[360px] truncate px-3 py-2.5 text-[13px]">
                            {row.question}
                          </td>
                          <td className="px-3 py-2.5 text-end font-mono text-[12px]">
                            <span className={cn(row.precision >= 0.85 ? "text-success" : row.precision >= 0.7 ? "text-warning" : "text-danger")}>
                              {(row.precision * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="text-muted-foreground px-3 py-2.5 text-end font-mono text-[12px]">
                            {row.correct_citations}/{row.total_citations}
                          </td>
                          <td className="px-3 py-2.5 text-end font-mono text-[12px]">
                            <span className={row.unsupported_claims > 0 ? "text-danger" : "text-muted-foreground"}>
                              {row.unsupported_claims}/{row.total_claims}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

function SortHeader({ label, onClick, active }: { label: string; onClick: () => void; active: boolean }) {
  return (
    <th className="px-3 py-2 text-end font-normal">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "eyebrow hover:text-foreground inline-flex items-center gap-1 transition-colors duration-150",
          active && "text-accent",
        )}
      >
        {label}
        <ArrowUpDown className="size-3" />
      </button>
    </th>
  );
}
