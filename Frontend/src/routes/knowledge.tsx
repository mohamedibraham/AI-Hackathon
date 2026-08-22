import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileCode2, FileText, Globe, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/clinical/MetricCard";
import { EmptyState, ErrorState, LoadingState } from "@/components/clinical/States";
import { useApiRequest } from "@/hooks/useApiRequest";
import { getDocuments, getStats } from "@/services/api/stats.service";
import { uploadDocument } from "@/services/api/documents.service";
import type { DocumentsResponse, StatsResponse } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/knowledge")({
  head: () => ({
    meta: [
      { title: "Knowledge Base — Blood Pressure RAG" },
      {
        name: "description",
        content:
          "Indexed hypertension guideline documents, chunk counts and embedding model powering the clinical RAG system.",
      },
      { property: "og:title", content: "Knowledge Base — Blood Pressure RAG" },
      {
        property: "og:description",
        content: "Review and extend the indexed guideline corpus behind every clinical answer.",
      },
    ],
  }),
  component: KnowledgePage,
});

const iconFor = (type: string) =>
  type === "pdf" ? FileText : type === "html" ? Globe : FileCode2;

function KnowledgePage() {
  const stats = useApiRequest<StatsResponse>(getStats, []);
  const docs = useApiRequest<DocumentsResponse>(getDocuments, [], {
    isEmpty: (d) => d.documents.length === 0,
  });

  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);

  const submit = async () => {
    if (!url.trim()) return;
    setUploading(true);
    try {
      const res = await uploadDocument(url.trim(), name.trim() || undefined);
      if (res.status === "success") {
        toast.success(`Indexed ${res.chunks_indexed} chunks`, { description: res.detail });
        setOpen(false);
        setUrl("");
        setName("");
        docs.refetch();
        stats.refetch();
      } else {
        toast.error(`Upload ${res.status}`, { description: res.detail });
      }
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell title="Knowledge base">
      <div className="h-full overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <span className="eyebrow">corpus</span>
              <h2 className="text-foreground mt-1 text-lg font-medium">Indexed guidelines</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="bg-accent text-accent-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-opacity duration-150 hover:opacity-90"
            >
              <Plus className="size-3.5" />
              Add document
            </button>
          </div>

          {stats.status === "loading" ? (
            <LoadingState label="Loading stats…" />
          ) : stats.status === "error" ? (
            <ErrorState description={stats.error?.message} onRetry={stats.refetch} />
          ) : stats.data ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <MetricCard label="total documents" value={stats.data.total_documents} />
              <MetricCard label="total chunks" value={stats.data.total_chunks.toLocaleString()} />
              <MetricCard
                label="embedding model"
                value={stats.data.embedding_model}
                className="[&_p]:text-base"
              />
            </div>
          ) : null}

          <div className="bg-card hairline overflow-hidden rounded-lg">
            <div className="hairline flex items-center justify-between border-x-0 border-t-0 px-3 py-2">
              <span className="eyebrow">documents</span>
              <span className="text-muted-foreground font-mono text-[11px]">
                {docs.data?.documents.length ?? 0} indexed
              </span>
            </div>
            {docs.status === "loading" ? (
              <LoadingState label="Loading documents…" />
            ) : docs.status === "error" ? (
              <ErrorState description={docs.error?.message} onRetry={docs.refetch} />
            ) : docs.status === "empty" ? (
              <EmptyState title="No documents indexed" description="Add a source URL to begin." />
            ) : (
              <ul>
                {docs.data?.documents.map((doc) => {
                  const Icon = iconFor(doc.source_type);
                  return (
                    <li
                      key={doc.document_name}
                      className="hairline hover:bg-panel/60 flex items-center gap-3 border-x-0 border-t-0 px-3 py-2.5 last:border-b-0 transition-colors duration-150"
                    >
                      <Icon className="text-muted-foreground size-4 shrink-0" />
                      <span className="text-foreground truncate font-mono text-[12.5px]">
                        {doc.document_name}
                      </span>
                      <span className="text-muted-foreground ms-auto shrink-0 font-mono text-[11px]">
                        {doc.chunk_count.toLocaleString()} chunks
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card hairline rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-medium">Add document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="eyebrow" htmlFor="doc-url">
                source url
              </label>
              <input
                id="doc-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="bg-background hairline focus:border-accent/60 text-foreground placeholder:text-muted-foreground mt-1.5 w-full rounded-md px-2.5 py-2 font-mono text-[12.5px] outline-none transition-colors duration-150"
              />
            </div>
            <div>
              <label className="eyebrow" htmlFor="doc-name">
                document name (optional)
              </label>
              <input
                id="doc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="NICE_NG136.pdf"
                className="bg-background hairline focus:border-accent/60 text-foreground placeholder:text-muted-foreground mt-1.5 w-full rounded-md px-2.5 py-2 font-mono text-[12.5px] outline-none transition-colors duration-150"
              />
            </div>
            {uploading ? (
              <p className="text-muted-foreground flex items-center gap-2 font-mono text-[11.5px]">
                <Loader2 className="size-3.5 animate-spin" />
                Uploading and indexing document…
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={submit}
              disabled={uploading || !url.trim()}
              className="bg-accent text-accent-foreground rounded-md px-3 py-1.5 text-[13px] font-medium disabled:opacity-40"
            >
              Upload
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
