"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpenIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  Loader2Icon,
  OctagonXIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import {
  useDeleteKnowledgeFile,
  useInitKnowledge,
  useKnowledge,
  useUploadKnowledgeFile,
} from "@/features/settings/knowledgeHooks";
import type { KnowledgeStatus } from "@/lib/client";

const ACCEPT = ".pdf,.md,.txt";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

const STATUS_LABEL: Record<KnowledgeStatus, string> = {
  empty: "Not initialized",
  processing: "Initializing…",
  ready: "Ready",
  error: "Failed",
};

/** Per-project knowledge base: upload reference files, run Init (distillation), inspect the brief. */
export function KnowledgeBase({ projectId }: { projectId: number }) {
  const { data: state, isLoading } = useKnowledge(projectId);
  const uploadFile = useUploadKnowledgeFile(projectId);
  const deleteFile = useDeleteKnowledgeFile(projectId);
  const initKnowledge = useInitKnowledge(projectId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [briefOpen, setBriefOpen] = useState(false);

  const status = state?.knowledge_status ?? "empty";
  const processing = status === "processing";
  const files = state?.files ?? [];

  const onPickFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    for (const file of Array.from(fileList)) {
      try {
        await uploadFile.mutateAsync(file);
      } catch (err) {
        toast.error(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  const onInit = async () => {
    try {
      await initKnowledge.mutateAsync();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5 lg:col-span-2">
      <div className="mb-1 flex items-center gap-2.5">
        <BookOpenIcon className="size-[15px] text-bb-brand" aria-hidden="true" />
        <h3 className="m-0 text-sm font-semibold text-bb-ink">Knowledge base</h3>
        <StatusPill status={status} stale={state?.knowledge_stale ?? false} />
      </div>
      <p className="m-0 mb-3 text-xs text-bb-muted">
        Attach reference files (PDF, .md, .txt). Init distills them and the description above into a
        compact brief that is injected into task extraction — keeping the prompt small and focused.
      </p>

      {/* File list */}
      <ul className="m-0 mb-3 flex list-none flex-col gap-1.5 p-0">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-2.5 rounded-bb-btn border border-bb-line bg-bb-paper px-3 py-2 text-[12.5px] text-bb-ink"
          >
            <span className="grow truncate">{f.filename}</span>
            <span className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-bb-muted uppercase">
              {f.kind} · {formatBytes(f.size_bytes)}
            </span>
            <button
              type="button"
              aria-label={`Remove ${f.filename}`}
              onClick={() => deleteFile.mutate(f.id)}
              className="shrink-0 rounded-bb-btn p-1 text-bb-muted hover:text-bb-burgundy"
            >
              <TrashIcon className="size-3.5" aria-hidden="true" />
            </button>
          </li>
        ))}
        {files.length === 0 && !isLoading && (
          <li className="text-xs text-bb-muted">No files yet.</li>
        )}
      </ul>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploadFile.isPending}
          className="inline-flex items-center gap-1.5 rounded-bb-btn border border-bb-line bg-bb-paper px-3 py-1.5 text-xs font-medium text-bb-ink hover:border-bb-burgundy disabled:opacity-50"
        >
          {uploadFile.isPending ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <UploadIcon className="size-3.5" aria-hidden="true" />
          )}
          Add files
        </button>
        <button
          type="button"
          onClick={onInit}
          disabled={processing || initKnowledge.isPending || files.length === 0}
          className="inline-flex items-center gap-1.5 rounded-bb-btn bg-bb-brand px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {processing ? (
            <Loader2Icon className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {processing ? "Initializing…" : state?.knowledge_stale ? "Re-run Init" : "Init"}
        </button>
        {state?.knowledge_generated_at && (
          <span className="text-[11px] text-bb-muted">
            Brief generated {formatDate(state.knowledge_generated_at)}
          </span>
        )}
      </div>

      {status === "error" && state?.knowledge_error && (
        <p className="mt-2.5 flex items-start gap-1.5 text-xs text-bb-burgundy">
          <OctagonXIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{state.knowledge_error}</span>
        </p>
      )}

      {/* Read-only generated brief */}
      {state?.knowledge_brief && (
        <div className="mt-3 border-t border-bb-line pt-3">
          <button
            type="button"
            onClick={() => setBriefOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-bb-muted hover:text-bb-ink"
          >
            <ChevronDownIcon
              className={`size-3.5 transition-transform ${briefOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            Generated brief (injected into extraction)
          </button>
          {briefOpen && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-bb-btn border border-bb-line bg-bb-paper p-3 text-[11.5px] leading-relaxed whitespace-pre-wrap text-bb-ink">
              {state.knowledge_brief}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

function StatusPill({ status, stale }: { status: KnowledgeStatus; stale: boolean }) {
  if (stale && status === "ready") {
    return (
      <span className="rounded-full bg-bb-paper px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-bb-burgundy uppercase">
        Brief out of date
      </span>
    );
  }
  const tone =
    status === "ready"
      ? "text-bb-brand"
      : status === "error"
        ? "text-bb-burgundy"
        : "text-bb-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-bb-paper px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase ${tone}`}
    >
      {status === "ready" && <CircleCheckIcon className="size-3" aria-hidden="true" />}
      {status === "processing" && <Loader2Icon className="size-3 animate-spin" aria-hidden="true" />}
      {STATUS_LABEL[status]}
    </span>
  );
}
