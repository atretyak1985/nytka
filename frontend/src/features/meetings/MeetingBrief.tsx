"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RotateCw } from "lucide-react";
import { useMeetingBrief, useRegenerateBrief } from "@/features/meetings/hooks";
import { api, type BriefPoint } from "@/lib/client";
import { formatTimestamp } from "@/lib/design-maps";

const SECTIONS = [
  { key: "decisions", label: "Decisions" },
  { key: "risks", label: "Risks" },
  { key: "open_questions", label: "Open questions" },
  { key: "next_steps", label: "Next steps" },
] as const;

/** Structured minutes for a meeting: summary, decisions, risks, open questions,
 *  next steps. Timestamped points deep-link into the video via `onSeek`. */
export function MeetingBrief({
  meetingId,
  poll,
  onSeek,
}: {
  meetingId: number;
  /** True while the meeting pipeline is active — keeps polling until the brief lands. */
  poll: boolean;
  onSeek: (sec: number) => void;
}) {
  const { data: brief, isError } = useMeetingBrief(meetingId, poll);
  const regenerate = useRegenerateBrief();
  const [copying, setCopying] = useState(false);

  // 404 (meeting predates the brief pipeline) or nothing yet — render nothing.
  if (isError || !brief || brief.status === "empty") return null;

  const sections = SECTIONS.map(({ key, label }) => ({ label, points: brief[key] })).filter(
    (s) => s.points.length > 0,
  );
  const isEmpty = !brief.summary && sections.length === 0;
  if (brief.status === "ready" && isEmpty) return null;

  const copyMarkdown = async () => {
    setCopying(true);
    try {
      const res = await fetch(api.meetingBriefMarkdownUrl(meetingId));
      if (!res.ok) throw new Error(await res.text());
      await navigator.clipboard.writeText(await res.text());
      toast.success("Brief copied as Markdown");
    } catch {
      toast.error("Could not copy the brief");
    } finally {
      setCopying(false);
    }
  };

  const regenerateBrief = () =>
    regenerate.mutate(meetingId, {
      onSuccess: () => toast.success("Regenerating the brief…"),
      onError: (e) => toast.error(e.message),
    });

  return (
    <div className="mb-4.5 overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
      <div className="flex items-center justify-between gap-2 border-b border-bb-line px-5 py-3.5">
        <span className="font-mono text-[10px] tracking-[0.14em] text-bb-muted uppercase">Meeting brief</span>
        <span className="flex items-center gap-2">
          {brief.status === "ready" && (
            <button
              type="button"
              onClick={copyMarkdown}
              disabled={copying}
              title="Copy the brief as Markdown"
              className="inline-flex h-6 items-center gap-1.5 rounded-md border border-bb-line bg-bb-surface px-2 font-mono text-[10px] text-bb-ink-2 transition-colors hover:bg-bb-surface-2 hover:text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
            >
              <Copy className="size-3" aria-hidden="true" />
              Copy as Markdown
            </button>
          )}
          {brief.status !== "processing" && (
            <button
              type="button"
              onClick={regenerateBrief}
              disabled={regenerate.isPending}
              title="Regenerate the brief from the transcript"
              className="inline-flex h-6 items-center gap-1.5 rounded-md border border-bb-line bg-bb-surface px-2 font-mono text-[10px] text-bb-ink-2 transition-colors hover:bg-bb-surface-2 hover:text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
            >
              <RotateCw className="size-3" aria-hidden="true" />
              Regenerate
            </button>
          )}
        </span>
      </div>

      {brief.status === "processing" && (
        <div className="flex flex-col gap-2.5 px-5 py-4">
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-bb-surface-2" />
          <div className="h-3.5 w-full animate-pulse rounded bg-bb-surface-2" />
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-bb-surface-2" />
        </div>
      )}

      {brief.status === "error" && (
        <div className="px-5 py-4">
          <p className="m-0 text-[12.5px] text-bb-danger">
            Brief generation failed{brief.error ? `: ${brief.error}` : "."}
          </p>
        </div>
      )}

      {brief.status === "ready" && (
        <div className="flex flex-col gap-4 px-5 py-4">
          {brief.summary && (
            <div>
              <SectionHeading>Summary</SectionHeading>
              <p className="m-0 text-[13px] leading-relaxed text-bb-ink-2" style={{ textWrap: "pretty" }}>
                {brief.summary}
              </p>
            </div>
          )}
          {sections.map(({ label, points }) => (
            <div key={label}>
              <SectionHeading>{label}</SectionHeading>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {points.map((point, i) => (
                  <BriefPointRow key={i} point={point} onSeek={onSeek} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 mb-1.5 font-mono text-[10px] tracking-[0.14em] text-bb-muted uppercase">{children}</p>
  );
}

function BriefPointRow({ point, onSeek }: { point: BriefPoint; onSeek: (sec: number) => void }) {
  return (
    <li className="grid grid-cols-[42px_1fr] items-baseline gap-2">
      {point.source_timestamp !== null && point.source_timestamp !== undefined ? (
        <button
          type="button"
          onClick={() => onSeek(point.source_timestamp as number)}
          title="Play from here"
          className="text-left font-mono text-[10px] text-bb-muted transition-colors hover:text-bb-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          {formatTimestamp(point.source_timestamp)}
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
      <span className="text-[13px] leading-relaxed text-bb-ink-2" style={{ textWrap: "pretty" }}>
        {point.text}
      </span>
    </li>
  );
}
