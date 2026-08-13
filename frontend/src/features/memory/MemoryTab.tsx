"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";
import type { AskCitation, SearchHit } from "@/lib/client";
import type { ChipStyle } from "@/lib/design-maps";
import { formatTimestamp } from "@/lib/design-maps";
import { Chip } from "@/components/ui/chip";
import { useAskProject, useProjectSearch } from "@/features/memory/hooks";

const DEBOUNCE_MS = 300;

/** Hit kind → chip treatment, in the same shape as the design-maps status chips. */
const HIT_KIND: Record<string, ChipStyle> = {
  segment: { label: "Transcript", className: "bg-bb-sky-soft text-bb-sky border border-transparent" },
  task: { label: "Task", className: "bg-bb-amber-soft text-bb-amber border border-transparent" },
  brief: { label: "Brief", className: "bg-bb-violet-soft text-bb-violet border border-transparent" },
};

const FALLBACK_KIND: ChipStyle = {
  label: "Result",
  className: "bg-bb-surface-2 text-bb-ink-2 border border-transparent",
};

/**
 * Render an FTS snippet, whose matches are wrapped in the \x01/\x02 control characters
 * the backend uses instead of markup (app/db/fts.py). Splitting into React elements —
 * never dangerouslySetInnerHTML — is what keeps HTML inside a transcript inert.
 */
function renderSnippet(snippet: string) {
  return snippet.split("\u0001").map((part, i) => {
    if (i === 0) return part;
    const [hit, rest] = part.split("\u0002");
    return (
      <span key={i}>
        <mark className="rounded-sm bg-bb-amber-soft px-0.5 text-bb-ink">{hit}</mark>
        {rest}
      </span>
    );
  });
}

/** Deep link to the moment a hit came from — the same `?seg=` mechanism the tasks tab uses. */
function hitHref(projectId: number, hit: Pick<SearchHit, "meeting_id" | "t_start">): string {
  if (hit.meeting_id === null) return `/projects/${projectId}?tab=tasks`;
  const seg = hit.t_start === null ? "" : `?seg=${hit.t_start}`;
  return `/projects/${projectId}/meetings/${hit.meeting_id}${seg}`;
}

/** Project memory: search everything that was said, or ask a question and get cited answers. */
export function MemoryTab({ projectId }: { projectId: number }) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const { data, isFetching } = useProjectSearch(projectId, query);
  const hits = data?.hits ?? [];
  const searching = query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-7">
      <section>
        <div className="mb-3.5 flex h-10 items-center gap-2.5 rounded-[10px] border border-bb-line bg-bb-surface px-3.5">
          <Search className="size-[15px] text-bb-muted" aria-hidden="true" />
          <label htmlFor="memory-search-input" className="sr-only">
            Search this project&apos;s meetings
          </label>
          <input
            id="memory-search-input"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search transcripts, tasks and briefs"
            className="h-full flex-1 border-none bg-transparent text-[13px] text-bb-ink outline-none placeholder:text-bb-muted"
          />
          {isFetching && (
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Searching…</span>
          )}
        </div>

        {searching &&
          (hits.length > 0 ? (
            <ul className="flex list-none flex-col gap-2 p-0">
              {hits.map((hit) => (
                <li key={`${hit.kind}-${hit.task_id ?? ""}-${hit.meeting_id ?? ""}-${hit.snippet}`}>
                  <Link
                    href={hitHref(projectId, hit)}
                    className="block rounded-bb-frame border border-bb-line bg-bb-surface px-4 py-3 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
                      <Chip chip={HIT_KIND[hit.kind] ?? FALLBACK_KIND} className="text-[9.5px]" />
                      <span className="truncate font-mono text-[10px] tracking-[0.06em] text-bb-ink-2 uppercase">
                        {hit.meeting_title ?? "manual task"}
                      </span>
                      {hit.t_start !== null && (
                        <span className="font-mono text-[10px] tracking-[0.06em] text-bb-brand uppercase">
                          {formatTimestamp(hit.t_start)}
                        </span>
                      )}
                    </div>
                    <p className="m-0 text-[13px] leading-relaxed text-bb-ink">{renderSnippet(hit.snippet)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            !isFetching && (
              <div className="rounded-bb-frame border border-bb-line bg-bb-surface p-8 text-center">
                <p className="m-0 text-[12.5px] text-bb-muted">Nothing in this project&apos;s meetings matches that.</p>
              </div>
            )
          ))}
      </section>

      <AskPanel projectId={projectId} />
    </div>
  );
}

function AskPanel({ projectId }: { projectId: number }) {
  const [question, setQuestion] = useState("");
  const ask = useAskProject(projectId);
  const answer = ask.data;

  const submit = () => {
    const trimmed = question.trim();
    if (trimmed && !ask.isPending) ask.mutate(trimmed);
  };

  return (
    <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
      <p className="m-0 mb-2.5 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-bb-violet uppercase">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Ask the project
      </p>
      <label htmlFor="memory-ask-input" className="sr-only">
        Ask a question about this project&apos;s meetings
      </label>
      <textarea
        id="memory-ask-input"
        rows={3}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="What did we decide about authentication?"
        className="w-full resize-y rounded-[10px] border border-bb-line bg-bb-paper px-3.5 py-2.5 text-[13px] text-bb-ink outline-none focus-visible:border-bb-burgundy placeholder:text-bb-muted"
      />
      <div className="mt-2.5 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={ask.isPending || !question.trim()}
          className="h-[30px] rounded-bb-btn bg-bb-burgundy px-3.5 text-[12.5px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ask.isPending ? "Thinking…" : "Ask"}
        </button>
        <span className="font-mono text-[10px] tracking-[0.06em] text-bb-muted uppercase">
          Answers come only from this project&apos;s meetings
        </span>
      </div>

      {ask.isError && (
        <p className="mt-3.5 mb-0 text-[12.5px] text-bb-danger">{ask.error.message}</p>
      )}

      {answer && (
        <div className="mt-4 border-t border-bb-line pt-4">
          <p
            className={`m-0 text-[13.5px] leading-relaxed ${answer.no_data ? "text-bb-muted italic" : "text-bb-ink"}`}
          >
            {answer.answer}
          </p>
          {!answer.no_data && answer.citations.length > 0 && (
            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {answer.citations.map((citation, i) => (
                <CitationRow key={i} projectId={projectId} citation={citation} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function CitationRow({ projectId, citation }: { projectId: number; citation: AskCitation }) {
  return (
    <li>
      <Link
        href={hitHref(projectId, { meeting_id: citation.meeting_id, t_start: citation.t_start })}
        className="block rounded-[8px] border-l-2 border-bb-burgundy bg-bb-surface-2 px-3 py-2 transition-colors hover:bg-bb-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
      >
        <span className="block font-[family-name:var(--font-display)] text-[12.5px] leading-relaxed text-bb-ink-2 italic">
          &ldquo;{citation.quote}&rdquo;
        </span>
        <span className="mt-1 block font-mono text-[10px] tracking-[0.06em] text-bb-brand uppercase">
          {citation.meeting_title}
          {citation.t_start !== null ? ` · ${formatTimestamp(citation.t_start)}` : ""}
        </span>
      </Link>
    </li>
  );
}
