"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useDeleteMeeting } from "@/features/meetings/hooks";

/**
 * Delete a meeting with an inline two-step confirm (no modal dependency).
 * `onDeleted` runs after a successful delete (e.g. navigate away on the detail page).
 */
export function DeleteMeetingButton({
  meetingId,
  onDeleted,
  label = "Delete",
}: {
  meetingId: number;
  onDeleted?: () => void;
  label?: string;
}) {
  const del = useDeleteMeeting();
  const [confirming, setConfirming] = useState(false);

  // These buttons can live inside a row-level <Link>; stop the click from navigating.
  const guard = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

  const run = () => {
    del.mutate(meetingId, {
      onSuccess: () => {
        toast.success("Meeting deleted");
        onDeleted?.();
      },
      onError: (e) => toast.error(e.message),
    });
  };

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={guard(run)}
          disabled={del.isPending}
          className="h-7 rounded-bb-btn bg-bb-danger px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bb-danger"
        >
          {del.isPending ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={guard(() => setConfirming(false))}
          disabled={del.isPending}
          className="h-7 rounded-bb-btn px-2.5 text-xs font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={guard(() => setConfirming(true))}
      title="Delete meeting"
      aria-label="Delete meeting"
      className={`inline-flex h-7 items-center gap-1.5 rounded-bb-btn border border-bb-line bg-transparent text-xs font-medium text-bb-ink-2 transition-colors hover:border-bb-danger hover:bg-bb-danger-soft hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-danger ${label ? "px-3" : "w-7 justify-center px-0"}`}
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
      {label && <span>{label}</span>}
    </button>
  );
}
