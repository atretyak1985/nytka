"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, RotateCw } from "lucide-react";
import { useMeeting, useReextractMeeting, useRetryMeeting } from "@/features/meetings/hooks";
import { MeetingBrief } from "@/features/meetings/MeetingBrief";
import { ProcessingStats } from "@/features/meetings/ProcessingStats";
import { DeleteMeetingButton } from "@/features/meetings/DeleteMeetingButton";
import { SpeakerMap } from "@/features/meetings/SpeakerMap";
import { useProject } from "@/features/projects/hooks";
import { usePatchTask } from "@/features/tasks/hooks";
import { JiraApproveDialog } from "@/features/tasks/JiraApproveDialog";
import { ACTIVE_STATUSES, type MeetingStatus, type Task } from "@/lib/client";
import { MEETING_STATUS, TASK_STATUS, formatDurationMinutes, formatTimestamp, speakerColor } from "@/lib/design-maps";
import { API_URL } from "@/lib/api";
import { Chip } from "@/components/ui/chip";

const PIPELINE_STEPS = ["Audio", "Transcription", "Task extraction", "Brief", "Done"] as const;

function stepIndexForStatus(status: MeetingStatus): number {
  switch (status) {
    case "queued":
    case "processing":
      return 0;
    case "transcribing":
      return 1;
    case "extracting":
      return 2;
    case "summarizing":
      return 3;
    default:
      return 4;
  }
}

/**
 * Resolve a timestamp (seconds, from a task's `source_timestamp`) to the id of the
 * transcript segment being spoken then: the segment whose range contains it, else the
 * last segment starting at/before it, else the first. Exact-equality never matches
 * because Whisper segment boundaries are floats unrelated to the task timestamp.
 */
function segmentIdAtTime(
  segments: { id: number; t_start: number; t_end: number }[],
  timeSec: number | null,
): number | null {
  if (timeSec === null || segments.length === 0) return null;
  let fallback: number | null = null;
  for (const s of segments) {
    if (timeSec >= s.t_start && timeSec <= s.t_end) return s.id;
    if (s.t_start <= timeSec) fallback = s.id;
  }
  return fallback ?? segments[0].id;
}

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string; meetingId: string }>;
}) {
  const { id, meetingId } = use(params);
  const projectId = Number(id);
  const searchParams = useSearchParams();
  const router = useRouter();
  const segParam = searchParams.get("seg");
  const highlightSeg = segParam !== null ? Number(segParam) : null;

  const { data: meeting, isLoading } = useMeeting(Number(meetingId));
  const { data: project } = useProject(projectId);
  const retryMeeting = useRetryMeeting();
  const reextractMeeting = useReextractMeeting();
  const patchTask = usePatchTask();
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaUrl = `${API_URL}/api/meetings/${meetingId}/media`;

  const seekVideo = (sec: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = sec;
    video.scrollIntoView({ block: "nearest", behavior: "smooth" });
    void video.play().catch(() => {});
  };

  const highlightSegmentId = useMemo(
    () => segmentIdAtTime(meeting?.segments ?? [], highlightSeg),
    [meeting?.segments, highlightSeg],
  );

  // Scroll the highlighted segment near the top of the transcript pane (not the page).
  useEffect(() => {
    if (highlightSegmentId === null) return;
    const container = transcriptRef.current;
    const el = container?.querySelector(`[data-seg="${highlightSegmentId}"]`);
    if (!container || !(el instanceof HTMLElement)) return;
    const delta = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    container.scrollTo({ top: container.scrollTop + delta - 70, behavior: "smooth" });
  }, [highlightSegmentId]);

  const focusSegment = (timeSec: number) => {
    const qs = new URLSearchParams(searchParams);
    qs.set("seg", String(timeSec));
    router.replace(`/projects/${projectId}/meetings/${meetingId}?${qs.toString()}`, { scroll: false });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1180px] px-8 pt-6 pb-12">
        <div className="h-8 w-48 animate-pulse rounded bg-bb-surface-2" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="mx-auto max-w-[1180px] px-8 pt-10 text-center">
        <p className="text-sm text-bb-muted">Meeting not found.</p>
      </div>
    );
  }

  const isActive = ACTIVE_STATUSES.includes(meeting.status);
  const isError = meeting.status === "error";
  const currentStep = stepIndexForStatus(meeting.status);
  // `progress` is a 0–1 fraction from the backend; render it as a percentage.
  const pct = `${Math.round((meeting.progress ?? 0) * 100)}%`;
  const statusChip = MEETING_STATUS[meeting.status];

  const drafts = meeting.tasks.filter((t) => t.status === "draft");
  const processed = meeting.tasks.filter((t) => t.status !== "draft");

  return (
    <div className="mx-auto max-w-[1180px] animate-bb-up px-8 pt-6 pb-12">
      <Link
        href={`/projects/${projectId}`}
        className="mb-3.5 inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.08em] text-bb-muted uppercase hover:text-bb-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
      >
        <ArrowLeft className="size-[13px]" aria-hidden="true" />
        Back to project
      </Link>

      <div className="mb-1 flex flex-wrap items-center gap-3">
        <h1 className="m-0 font-[family-name:var(--font-display)] text-[32px] leading-tight text-bb-ink">
          {meeting.title}
        </h1>
        <Chip chip={statusChip} className="text-[10px]" />
        <span className="flex-1" />
        {!isActive && (
          <button
            type="button"
            onClick={() =>
              reextractMeeting.mutate(meeting.id, {
                onSuccess: () => toast.success("Re-extracting tasks…"),
                onError: (e) => toast.error(e.message),
              })
            }
            disabled={reextractMeeting.isPending}
            title="Re-run task extraction on this transcript"
            className="inline-flex h-7 items-center gap-1.5 rounded-bb-btn border border-bb-line bg-transparent px-3 text-xs font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 hover:text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            Re-extract
          </button>
        )}
        <DeleteMeetingButton
          meetingId={meeting.id}
          onDeleted={() => router.push(`/projects/${projectId}?tab=meetings`)}
        />
      </div>
      <p className="m-0 mb-5 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">
        {meeting.language ?? "—"} · {formatDurationMinutes(meeting.duration_sec)} · {meeting.source_filename}
        <ProcessingStats meeting={meeting} className="text-bb-ink-2" withSeparator />
      </p>

      {isActive && (
        <div className="mb-5 rounded-bb-frame border border-bb-line bg-bb-surface px-6 py-5">
          <div className="flex items-center">
            {PIPELINE_STEPS.map((label, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={label} className="contents">
                  <div className="flex shrink-0 items-center gap-2.25">
                    <span
                      className={`flex size-[26px] items-center justify-center rounded-full border font-mono text-[11px] font-semibold ${
                        isDone
                          ? "border-transparent bg-bb-sage-soft text-bb-sage"
                          : isCurrent
                            ? "border-transparent bg-bb-burgundy text-bb-on-accent"
                            : "border-bb-line bg-bb-surface text-bb-muted"
                      } ${isCurrent ? "animate-bb-pulse" : ""}`}
                    >
                      {isDone ? <Check className="size-3" aria-hidden="true" /> : i + 1}
                    </span>
                    <span
                      className={`font-mono text-[10px] tracking-[0.08em] whitespace-nowrap uppercase ${isDone || isCurrent ? "text-bb-ink" : "text-bb-muted"}`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <span className={`mx-3.5 h-0.5 flex-1 rounded-full ${i < currentStep ? "bg-bb-sage" : "bg-bb-line"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-bb-surface-2">
              <div
                className="h-full rounded-full bg-bb-burgundy transition-[width] duration-700 ease-[var(--ease-out)]"
                style={{ width: pct }}
              />
            </div>
            <span className="font-mono text-[11px] font-semibold text-bb-ink tabular-nums">{pct}</span>
          </div>
        </div>
      )}

      {isError && (
        <div className="mb-5 flex items-center justify-between gap-4 rounded-bb-frame border border-bb-danger bg-bb-danger-soft px-5 py-4">
          <p className="m-0 text-[13px] text-bb-danger">{meeting.error_message ?? "Processing failed."}</p>
          <button
            type="button"
            onClick={() =>
              retryMeeting.mutate(meeting.id, {
                onSuccess: () => toast.success("Retrying…"),
                onError: (e) => toast.error(e.message),
              })
            }
            className="h-8 shrink-0 rounded-bb-btn bg-bb-burgundy px-4 text-[12.5px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            Retry processing
          </button>
        </div>
      )}

      <div className="mb-4.5 overflow-hidden rounded-bb-frame border border-bb-line bg-black">
        <video
          ref={videoRef}
          src={mediaUrl}
          controls
          preload="metadata"
          className="max-h-[440px] w-full bg-black"
        >
          Your browser cannot play this recording.
        </video>
      </div>

      <MeetingBrief meetingId={meeting.id} poll={isActive} onSeek={seekVideo} />

      <div className="grid grid-cols-1 items-start gap-4.5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-4.5">
        {meeting.detected_speakers.length > 0 && (
          <SpeakerMap meeting={meeting} team={project?.team ?? []} />
        )}
        <div className="overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
          <div className="flex items-center justify-between border-b border-bb-line px-5 py-3.5">
            <span className="font-mono text-[10px] tracking-[0.14em] text-bb-muted uppercase">Transcript</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-ink-2 uppercase">
              {meeting.language ?? "—"} · {formatDurationMinutes(meeting.duration_sec)}
            </span>
          </div>
          <div ref={transcriptRef} className="max-h-[calc(100vh-330px)] overflow-y-auto px-3 pt-2.5 pb-4">
            {meeting.segments.map((segment) => {
              const isHighlighted = segment.id === highlightSegmentId;
              return (
                <div
                  key={segment.id}
                  data-seg={segment.id}
                  className="grid grid-cols-[50px_1fr] gap-3 rounded-[10px] px-3 py-2.5 transition-colors duration-300"
                  style={{ background: isHighlighted ? "var(--bb-brand-soft)" : "transparent" }}
                >
                  <button
                    type="button"
                    onClick={() => seekVideo(segment.t_start)}
                    title="Play from here"
                    className="h-fit pt-0.5 text-left font-mono text-[10px] text-bb-muted transition-colors hover:text-bb-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                  >
                    {formatTimestamp(segment.t_start)}
                  </button>
                  <div>
                    <span className={`font-mono text-[10px] font-semibold tracking-[0.06em] uppercase ${speakerColor(segment.speaker_display)}`}>
                      {segment.speaker_display ?? "Unknown"}
                    </span>
                    <p className="m-0 mt-0.75 text-[13px] leading-relaxed text-bb-ink-2" style={{ textWrap: "pretty" }}>
                      {segment.text}
                    </p>
                  </div>
                </div>
              );
            })}
            {isActive && (
              <p className="m-2.5 animate-bb-blink font-mono text-[10.5px] tracking-[0.08em] text-bb-burgundy uppercase">
                &#9612; Transcribing…
              </p>
            )}
            {meeting.segments.length === 0 && !isActive && (
              <p className="m-5 text-[12.5px] text-bb-muted">The transcript will appear once processing completes.</p>
            )}
          </div>
        </div>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
            <div className="flex items-center justify-between border-b border-bb-line px-4.5 py-3.5">
              <span className="font-mono text-[10px] tracking-[0.14em] text-bb-amber uppercase">To review · {drafts.length}</span>
              <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">AI drafts</span>
            </div>
            <div className="flex flex-col gap-2.5 px-3.5 py-3">
              {drafts.map((task) => (
                <DraftTaskCard
                  key={task.id}
                  task={task}
                  onApprove={() => setPreviewTask(task)}
                  onReject={() => patchTask.mutate({ id: task.id, status: "rejected" })}
                  onFocus={
                    task.source_timestamp !== null
                      ? () => {
                          focusSegment(task.source_timestamp as number);
                          seekVideo(task.source_timestamp as number);
                        }
                      : undefined
                  }
                />
              ))}
              {drafts.length === 0 && (
                <p className="m-1 text-[12.5px] text-bb-muted">
                  {isActive ? "Drafts will appear as the AI finds action items." : "No draft tasks from this meeting."}
                </p>
              )}
            </div>
          </div>

          {processed.length > 0 && (
            <div className="overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
              <div className="border-b border-bb-line px-4.5 py-3">
                <span className="font-mono text-[10px] tracking-[0.14em] text-bb-muted uppercase">Processed · {processed.length}</span>
              </div>
              <div className="flex flex-col px-3.5 py-2.5 pb-3">
                {processed.map((task) => {
                  const chip = TASK_STATUS[task.status];
                  return (
                    <div key={task.id} className="flex items-center gap-2.25 py-1.75">
                      <Check className="size-3.25 shrink-0 text-bb-sage" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-bb-ink-2">{task.title}</span>
                      <span className={`font-mono text-[9px] tracking-[0.06em] uppercase ${chip.className.match(/text-\S+/)?.[0] ?? "text-bb-muted"}`}>
                        {chip.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <JiraApproveDialog task={previewTask} onClose={() => setPreviewTask(null)} />
        </div>
      </div>
    </div>
  );
}

function DraftTaskCard({
  task,
  onApprove,
  onReject,
  onFocus,
}: {
  task: Task;
  onApprove: () => void;
  onReject: () => void;
  onFocus?: () => void;
}) {
  return (
    <div className="rounded-[10px] border border-bb-line px-3.5 py-3">
      <p className="m-0 mb-1 text-[13.5px] leading-snug font-medium text-bb-ink">{task.title}</p>
      {task.description && (
        <p className="m-0 mb-2 font-[family-name:var(--font-display)] text-xs leading-relaxed text-bb-ink-2 italic">
          &ldquo;{task.description}&rdquo;
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="h-[26px] rounded-md bg-bb-burgundy px-2.75 text-[11.5px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          className="h-[26px] rounded-md px-2.25 text-[11.5px] text-bb-ink-2 transition-colors hover:bg-bb-danger-soft hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          Reject
        </button>
        <span className="flex-1" />
        {onFocus && (
          <button
            type="button"
            onClick={onFocus}
            title="Show in transcript"
            className="h-6 rounded-md border border-bb-line bg-bb-surface px-2 font-mono text-[10px] text-bb-brand hover:bg-bb-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            &rarr; {formatTimestamp(task.source_timestamp as number)}
          </button>
        )}
      </div>
    </div>
  );
}
