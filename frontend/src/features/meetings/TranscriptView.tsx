"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MeetingDetail } from "@/lib/client";
import { cn } from "@/lib/utils";

function fmt(sec: number): string {
  const s = Math.floor(sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function TranscriptView({
  segments,
  highlightTs,
}: {
  segments: MeetingDetail["segments"];
  highlightTs: number | null;
}) {
  const refs = useRef(new Map<number, HTMLDivElement>());

  const highlightedId = useMemo(() => {
    if (highlightTs === null || !segments.length) return null;
    const hit =
      segments.find((s) => s.t_start <= highlightTs && highlightTs < s.t_end) ??
      [...segments].reverse().find((s) => s.t_start <= highlightTs) ??
      segments[0];
    return hit.id;
  }, [segments, highlightTs]);

  useEffect(() => {
    if (highlightedId !== null) {
      refs.current.get(highlightedId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedId, highlightTs]);

  if (!segments.length) return <p className="text-sm text-muted-foreground">No transcript yet.</p>;

  return (
    <div className="space-y-2 overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 12rem)" }}>
      {segments.map((s) => (
        <div
          key={s.id}
          ref={(el) => { if (el) refs.current.set(s.id, el); }}
          className={cn(
            "rounded p-2 text-sm transition-colors",
            s.id === highlightedId && "bg-yellow-100 dark:bg-yellow-900/40",
          )}
        >
          <span className="mr-2 font-mono text-xs text-muted-foreground">{fmt(s.t_start)}</span>
          {s.speaker && <span className="mr-2 text-xs font-medium">{s.speaker}:</span>}
          {s.text}
        </div>
      ))}
    </div>
  );
}
