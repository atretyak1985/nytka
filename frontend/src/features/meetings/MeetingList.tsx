"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ChevronRight, FileVideo } from "lucide-react";
import type { Meeting } from "@/lib/client";
import { ACTIVE_STATUSES } from "@/lib/client";
import { MEETING_STATUS, formatDurationMinutes, relativeDay } from "@/lib/design-maps";
import { Chip } from "@/components/ui/chip";
import { useRetryMeeting } from "@/features/meetings/hooks";

export function MeetingList({ projectId, meetings }: { projectId: number; meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <div className="rounded-bb-frame border border-bb-line bg-bb-surface p-9 text-center">
        <p className="m-0 mb-1 text-sm font-medium text-bb-ink">No meetings yet</p>
        <p className="m-0 text-[12.5px] text-bb-muted">
          Upload your first recording — the transcript and draft tasks will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
      {meetings.map((meeting, i) => (
        <MeetingRow key={meeting.id} projectId={projectId} meeting={meeting} isFirst={i === 0} />
      ))}
    </div>
  );
}

function MeetingRow({ projectId, meeting, isFirst }: { projectId: number; meeting: Meeting; isFirst: boolean }) {
  const retry = useRetryMeeting();
  const isActive = ACTIVE_STATUSES.includes(meeting.status);
  const isError = meeting.status === "error";
  const chip = MEETING_STATUS[meeting.status];
  const pct = `${Math.round(meeting.progress ?? 0)}%`;

  return (
    <Link
      href={`/projects/${projectId}/meetings/${meeting.id}`}
      className={`grid grid-cols-[38px_1fr_auto] items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-bb-paper focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bb-burgundy ${isFirst ? "" : "border-t border-bb-line"}`}
    >
      <span className="flex size-[38px] items-center justify-center rounded-[9px] bg-bb-surface-2 text-bb-ink-2" aria-hidden="true">
        <FileVideo className="size-[17px]" />
      </span>
      <div className="min-w-0">
        <p className="m-0 mb-0.5 truncate text-sm font-medium text-bb-ink">{meeting.title}</p>
        <p className="m-0 truncate font-mono text-[10px] tracking-[0.06em] text-bb-muted uppercase">
          {meeting.source_filename} · {relativeDay(meeting.created_at)} · {formatDurationMinutes(meeting.duration_sec)}
          {meeting.language ? ` · ${meeting.language}` : ""}
        </p>
        {isActive && (
          <div className="mt-2 flex max-w-[420px] items-center gap-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-bb-surface-2">
              <div
                className="h-full rounded-full bg-bb-burgundy transition-[width] duration-700 ease-[var(--ease-out)]"
                style={{ width: pct }}
              />
            </div>
            <span className="animate-bb-blink font-mono text-[10px] text-bb-burgundy">{pct}</span>
          </div>
        )}
        {isError && meeting.error_message && (
          <p className="m-0 mt-1.5 text-xs text-bb-danger">{meeting.error_message}</p>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        {isError && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              retry.mutate(meeting.id, {
                onSuccess: () => toast.success("Retrying…"),
                onError: (err) => toast.error(err.message),
              });
            }}
            className="flex h-7 items-center rounded-bb-btn border border-bb-line bg-bb-surface px-3 text-xs font-medium text-bb-ink transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            Retry
          </button>
        )}
        <Chip chip={chip} />
        <ChevronRight className="size-[15px] text-bb-muted" aria-hidden="true" />
      </div>
    </Link>
  );
}
