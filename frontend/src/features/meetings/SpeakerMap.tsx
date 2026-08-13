"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RotateCw, Users } from "lucide-react";
import { usePatchMeeting, useReextractMeeting } from "@/features/meetings/hooks";
import type { MeetingDetail, TeamMember } from "@/lib/client";
import { speakerColor } from "@/lib/design-maps";

/**
 * Map raw diarization labels (SPEAKER_00, …) to project team members.
 * Saving PATCHes the meeting; the backend validates labels and team names.
 * After a save the user is offered a re-extraction so assignees pick up the names.
 */
export function SpeakerMap({ meeting, team }: { meeting: MeetingDetail; team: TeamMember[] }) {
  const patchMeeting = usePatchMeeting();
  const reextractMeeting = useReextractMeeting();
  const [draft, setDraft] = useState<Record<string, string>>(() => ({ ...meeting.speaker_labels }));
  const [showReextractHint, setShowReextractHint] = useState(false);

  const dirty = useMemo(
    () =>
      meeting.detected_speakers.some(
        (label) => (draft[label] ?? "") !== (meeting.speaker_labels[label] ?? ""),
      ),
    [draft, meeting.detected_speakers, meeting.speaker_labels],
  );

  const save = () => {
    // Send every detected label: an empty value tells the backend to unset it.
    const speaker_labels = Object.fromEntries(
      meeting.detected_speakers.map((label) => [label, draft[label] ?? ""]),
    );
    patchMeeting.mutate(
      { id: meeting.id, speaker_labels },
      {
        onSuccess: () => {
          toast.success("Speaker names saved");
          setShowReextractHint(true);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
      <div className="flex items-center gap-2 border-b border-bb-line px-5 py-3.5">
        <Users className="size-3.5 text-bb-muted" aria-hidden="true" />
        <span className="font-mono text-[10px] tracking-[0.14em] text-bb-muted uppercase">Speakers</span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || patchMeeting.isPending}
          className="h-7 rounded-bb-btn bg-bb-burgundy px-3 text-xs font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
        >
          Save
        </button>
      </div>
      <div className="flex flex-col gap-2 px-5 py-3.5">
        {meeting.detected_speakers.map((label) => {
          const value = draft[label] ?? "";
          return (
            <label key={label} className="grid grid-cols-[minmax(110px,auto)_1fr] items-center gap-3">
              <span className={`font-mono text-[10.5px] font-semibold tracking-[0.06em] uppercase ${speakerColor(value || label)}`}>
                {label}
              </span>
              <select
                value={value}
                onChange={(e) => setDraft((prev) => ({ ...prev, [label]: e.target.value }))}
                className="h-8 w-full max-w-[260px] rounded-bb-btn border border-bb-line bg-bb-surface px-2 text-[12.5px] text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
              >
                <option value="">—</option>
                {team.map((member) => (
                  <option key={member.name} value={member.name}>
                    {member.name}
                    {member.role ? ` (${member.role})` : ""}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
        {showReextractHint && (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-[10px] bg-bb-brand-soft px-3.5 py-2.5">
            <p className="m-0 text-[12.5px] text-bb-ink-2">
              Re-run task extraction so assignees pick up the mapped names?
            </p>
            <button
              type="button"
              onClick={() =>
                reextractMeeting.mutate(meeting.id, {
                  onSuccess: () => {
                    toast.success("Re-extracting tasks…");
                    setShowReextractHint(false);
                  },
                  onError: (e) => toast.error(e.message),
                })
              }
              disabled={reextractMeeting.isPending}
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-bb-btn border border-bb-line bg-bb-surface px-3 text-xs font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 hover:text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
            >
              <RotateCw className="size-3.5" aria-hidden="true" />
              Re-extract
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
