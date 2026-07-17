"use client";

import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CircleAlert, Loader2Icon, SquareCheckBig, UserRound } from "lucide-react";
import { api, type Task } from "@/lib/client";
import { usePatchTask } from "@/features/tasks/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Confirmation step for approving a task on a Jira-enabled project: shows the
 * exact issue the backend will create (same mapping code), then approves. */
export function JiraApproveDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const patchTask = usePatchTask();
  const { data: preview, isLoading } = useQuery({
    queryKey: ["jira-preview", task?.id],
    queryFn: () => api.getJiraPreview((task as Task).id),
    enabled: task !== null,
    staleTime: 0,
    gcTime: 0,
  });

  const approve = (pushToJira: boolean) => {
    if (!task) return;
    patchTask.mutate(
      { id: task.id, status: "approved", ...(pushToJira ? {} : { push_to_jira: false }) },
      {
        onSuccess: (updated) => {
          if (pushToJira && updated.jira_sync_error) {
            toast.error(`Approved, but Jira push failed: ${updated.jira_sync_error}`);
          } else if (pushToJira && updated.jira_issue_key) {
            toast.success(`Created ${updated.jira_issue_key} in Jira`);
          }
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={task !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-bb-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-bb-ink">Approve &amp; push to Jira</DialogTitle>
          <DialogDescription className="text-bb-muted">
            This is exactly how the issue will be created.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !preview ? (
          <div className="flex items-center gap-2 py-6 text-xs text-bb-muted" role="status">
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            Loading Jira preview…
          </div>
        ) : preview.ok ? (
          <div className="rounded-bb-frame border border-bb-line bg-bb-paper p-4">
            <div className="mb-2 flex items-center gap-2">
              <SquareCheckBig className="size-3.5 text-bb-sky" aria-hidden="true" />
              <span className="font-mono text-[10.5px] tracking-[0.06em] text-bb-muted uppercase">
                {preview.project_key} · {preview.issue_type}
              </span>
            </div>
            <p className="m-0 mb-1.5 text-[14.5px] font-semibold text-bb-ink">{preview.summary}</p>
            {preview.description && (
              <p className="m-0 mb-3 text-[12.5px] leading-relaxed whitespace-pre-line text-bb-ink-2">
                {preview.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md bg-bb-surface-2 px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-bb-ink-2 uppercase">
                {preview.priority}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-bb-ink-2">
                <UserRound className="size-3.5 text-bb-muted" aria-hidden="true" />
                {preview.assignee_found ? preview.assignee_display_name : "Unassigned"}
              </span>
            </div>
            {preview.assignee_query && !preview.assignee_found && (
              <p className="m-0 mt-2.5 flex items-start gap-1.5 text-xs text-bb-amber">
                <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                &ldquo;{preview.assignee_query}&rdquo; was not found in Jira — the issue will be created unassigned.
              </p>
            )}
          </div>
        ) : (
          <p className="m-0 flex items-start gap-1.5 text-xs text-bb-danger">
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {preview.error ?? "Could not load the Jira preview."}
          </p>
        )}

        <DialogFooter className="bg-transparent">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-bb-btn px-3 text-xs font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            Cancel
          </button>
          {preview && !preview.ok && (
            <button
              type="button"
              onClick={() => approve(false)}
              disabled={patchTask.isPending}
              className="h-8 rounded-bb-btn border border-bb-line px-3 text-xs font-medium text-bb-ink transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
            >
              Approve without Jira
            </button>
          )}
          <button
            type="button"
            onClick={() => approve(true)}
            disabled={patchTask.isPending || isLoading || !preview?.ok}
            className="h-8 rounded-bb-btn bg-bb-burgundy px-3.5 text-xs font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {patchTask.isPending ? "Approving…" : "Approve & push to Jira"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
