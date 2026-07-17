"use client";

import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/client";
import { ACTIVE_STATUSES } from "@/lib/client";
import { formatShortDuration, parseUtc } from "@/lib/design-maps";

/**
 * Elapsed + ETA while a meeting is processing, or the total processing time once
 * it finishes. Owns a 1s ticker (only while active) so the surrounding page
 * doesn't re-render every second.
 */
export function ProcessingStats({
  meeting,
  className,
  withSeparator = false,
}: {
  meeting: Meeting;
  className?: string;
  /** Prepend " · " so it can be appended inline to a meta line without a dangling separator. */
  withSeparator?: boolean;
}) {
  const isActive = ACTIVE_STATUSES.includes(meeting.status);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isActive) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const startedAt = parseUtc(meeting.processing_started_at);
  const finishedAt = parseUtc(meeting.processing_finished_at);

  let text: string | null = null;
  if (isActive) {
    if (startedAt !== null) {
      const elapsed = Math.max(0, (now - startedAt) / 1000);
      const p = meeting.progress ?? 0;
      const eta = p > 0.05 ? (elapsed * (1 - p)) / p : null;
      text = `elapsed ${formatShortDuration(elapsed)}${eta !== null ? ` · ~${formatShortDuration(eta)} left` : ""}`;
    }
  } else if (startedAt !== null && finishedAt !== null) {
    const took = Math.max(0, (finishedAt - startedAt) / 1000);
    text = `${meeting.status === "error" ? "Failed after" : "Processed in"} ${formatShortDuration(took)}`;
  }

  if (text === null) return null;
  return (
    <span className={className}>
      {withSeparator ? " · " : ""}
      {text}
    </span>
  );
}
