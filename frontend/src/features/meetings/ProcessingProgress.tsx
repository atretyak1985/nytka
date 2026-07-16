"use client";

import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/client";
import { ACTIVE_STATUSES } from "@/lib/client";

function fmtDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Backend stores naive UTC; guard against a future switch to offset-aware ISO. */
function toUtcIso(value: string): string {
  return value.endsWith("Z") || value.includes("+") ? value : `${value}Z`;
}

export function ProcessingProgress({ meeting }: { meeting: Meeting }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!ACTIVE_STATUSES.includes(meeting.status)) return null;

  const startedAt = meeting.processing_started_at
    ? Date.parse(toUtcIso(meeting.processing_started_at))
    : null;
  const elapsedSec = startedAt !== null ? Math.max(0, (now - startedAt) / 1000) : null;
  const p = meeting.progress ?? 0;
  const etaSec = elapsedSec !== null && p > 0.05 ? (elapsedSec * (1 - p)) / p : null;

  return (
    <div className="space-y-1" aria-live="polite">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.round(p * 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {meeting.status} · {Math.round(p * 100)}%
        {elapsedSec !== null && ` · elapsed ${fmtDuration(elapsedSec)}`}
        {etaSec !== null && ` · ~${fmtDuration(etaSec)} left`}
      </p>
    </div>
  );
}
