"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeftIcon, ChevronRightIcon, CircleAlert, Loader2Icon, PencilIcon, SquareCheckBig, UserRound, XIcon } from "lucide-react";
import { API_URL } from "@/lib/api";
import { api, type Task, type TaskPriority } from "@/lib/client";
import { usePatchTask } from "@/features/tasks/hooks";
import { useProject } from "@/features/projects/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 92.5 -> "1:32" — matches the video-player timestamp style. */
const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Confirmation step for approving a task on a Jira-enabled project: shows the
 * exact issue the backend will create (same mapping code), then approves. */
export function JiraApproveDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const patchTask = usePatchTask();
  const { data: preview, isLoading, isError } = useQuery({
    queryKey: ["jira-preview", task?.id],
    queryFn: () => api.getJiraPreview((task as Task).id),
    enabled: task !== null,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const { data: screenshots } = useQuery({
    queryKey: ["task-screenshots", task?.id],
    queryFn: () => api.listTaskScreenshots((task as Task).id),
    enabled: task !== null,
  });
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const zoomShot = zoomIndex !== null && screenshots ? (screenshots[zoomIndex] ?? null) : null;
  const stepZoom = (delta: number) => {
    if (zoomIndex === null || !screenshots || screenshots.length < 2) return;
    setZoomIndex((zoomIndex + delta + screenshots.length) % screenshots.length);
  };
  const qc = useQueryClient();
  const deleteShot = useMutation({
    mutationFn: (screenshotId: number) => api.deleteTaskScreenshot((task as Task).id, screenshotId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["task-screenshots", task?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    area: "",
    labels: [] as string[],
    assignee: "",
    priority: "medium" as TaskPriority,
  });
  const [labelDraft, setLabelDraft] = useState("");
  const addLabel = () => {
    // Jira labels cannot contain spaces — normalise on add (same rule as Settings).
    const label = labelDraft.trim().toLowerCase().replace(/\s+/g, "-");
    setLabelDraft("");
    if (!label || form.labels.includes(label)) return;
    setForm((f) => ({ ...f, labels: [...f.labels, label] }));
  };
  // Assignee choices come from the project's Team list (Settings → Team, importable
  // from Jira) — the same list the AI extraction is allowed to assign owners from.
  const { data: project } = useProject(task?.project_id);
  const assigneeOptions = project && project.team.length > 0 ? project.team : null;
  // The parent holds `task` as a state snapshot, so it goes stale after a save —
  // keep the last saved version so re-entering Edit seeds from fresh values.
  const [savedTask, setSavedTask] = useState<Task | null>(null);
  const currentTask = savedTask && savedTask.id === task?.id ? savedTask : task;
  const startEditing = () => {
    if (!currentTask) return;
    setForm({
      title: currentTask.title,
      description: currentTask.description,
      area: currentTask.area,
      labels: currentTask.labels,
      assignee: currentTask.assignee ?? "",
      priority: currentTask.priority,
    });
    setLabelDraft("");
    setEditing(true);
  };
  const saveEdits = () => {
    if (!task || !form.title.trim()) return;
    // Fold a typed-but-not-Entered label in, so "type + Save" can't lose it.
    const pending = labelDraft.trim().toLowerCase().replace(/\s+/g, "-");
    const labels = pending && !form.labels.includes(pending) ? [...form.labels, pending] : form.labels;
    setLabelDraft("");
    patchTask.mutate(
      {
        id: task.id,
        title: form.title.trim(),
        description: form.description,
        area: form.area.trim(),
        labels,
        assignee: form.assignee.trim() || null,
        priority: form.priority,
      },
      {
        onSuccess: (updated) => {
          setSavedTask(updated);
          setEditing(false);
          void qc.invalidateQueries({ queryKey: ["jira-preview", task.id] });
        },
      },
    );
  };
  const handleClose = () => {
    setEditing(false);
    onClose();
  };

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
    <Dialog open={task !== null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="bg-bb-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-bb-ink">Approve &amp; push to Jira</DialogTitle>
          <DialogDescription className="text-bb-muted">
            This is exactly how the issue will be created.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 py-6 text-xs text-bb-muted" role="status">
            <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            Loading Jira preview…
          </div>
        ) : preview?.ok ? (
          <div className="rounded-bb-frame border border-bb-line bg-bb-paper p-4">
            <div className="mb-2 flex items-center gap-2">
              <SquareCheckBig className="size-3.5 text-bb-sky" aria-hidden="true" />
              <span className="font-mono text-[10.5px] tracking-[0.06em] text-bb-muted uppercase">
                {preview.project_key} · {preview.issue_type}
              </span>
              {!editing && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="ml-auto flex items-center gap-1 rounded-bb-btn px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.06em] text-bb-ink-2 uppercase transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                >
                  <PencilIcon className="size-3" aria-hidden="true" />
                  Edit
                </button>
              )}
            </div>
            {editing ? (
              <div className="flex flex-col gap-2.5">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Title</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="h-8 w-full rounded-bb-btn border border-bb-line bg-bb-surface px-2.5 text-[13px] text-bb-ink outline-none focus-visible:border-bb-burgundy"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={5}
                    className="w-full resize-y rounded-bb-btn border border-bb-line bg-bb-surface px-2.5 py-2 text-[12.5px] leading-relaxed text-bb-ink outline-none focus-visible:border-bb-burgundy"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Priority</span>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                      className="h-8 rounded-bb-btn border border-bb-line bg-bb-surface px-2 text-[12.5px] text-bb-ink outline-none focus-visible:border-bb-burgundy"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Assignee</span>
                    {assigneeOptions ? (
                      <select
                        value={form.assignee}
                        onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                        className="h-8 rounded-bb-btn border border-bb-line bg-bb-surface px-2 text-[12.5px] text-bb-ink outline-none focus-visible:border-bb-burgundy"
                      >
                        <option value="">— Unassigned —</option>
                        {form.assignee && !assigneeOptions.some((m) => m.name === form.assignee) && (
                          <option value={form.assignee}>{form.assignee} (from transcript)</option>
                        )}
                        {assigneeOptions.map((member) => (
                          <option key={member.name} value={member.name}>
                            {member.name}
                            {member.role ? ` — ${member.role}` : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={form.assignee}
                        onChange={(e) => setForm((f) => ({ ...f, assignee: e.target.value }))}
                        placeholder="Name or email in Jira"
                        className="h-8 w-full rounded-bb-btn border border-bb-line bg-bb-surface px-2.5 text-[12.5px] text-bb-ink outline-none placeholder:text-bb-muted focus-visible:border-bb-burgundy"
                      />
                    )}
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Area</span>
                  <input
                    value={form.area}
                    onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                    placeholder="[Area][Sub-area]"
                    className="h-8 w-full rounded-bb-btn border border-bb-line bg-bb-surface px-2.5 font-mono text-xs text-bb-ink outline-none placeholder:text-bb-muted focus-visible:border-bb-burgundy"
                  />
                </label>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Labels</span>
                  {form.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.labels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex items-center gap-1 rounded-md bg-bb-surface-2 py-0.5 pr-1 pl-2 font-mono text-[10.5px] text-bb-ink-2"
                        >
                          {label}
                          <button
                            type="button"
                            aria-label={`Remove label ${label}`}
                            onClick={() => setForm((f) => ({ ...f, labels: f.labels.filter((l) => l !== label) }))}
                            className="flex size-4 items-center justify-center rounded text-bb-muted hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                          >
                            <XIcon className="size-2.5" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <input
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLabel();
                      }
                    }}
                    placeholder="Add a label — Enter"
                    className="h-8 w-full rounded-bb-btn border border-bb-line bg-bb-surface px-2.5 font-mono text-xs text-bb-ink outline-none placeholder:text-bb-muted focus-visible:border-bb-burgundy"
                  />
                </div>
                <p className="m-0 text-[11px] text-bb-muted">
                  Sprint, the source line and the static/demo/area labels are derived automatically — labels added
                  here are extra, on top of those.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="h-7 rounded-bb-btn px-2.5 text-xs font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdits}
                    disabled={patchTask.isPending || !form.title.trim()}
                    className="h-7 rounded-bb-btn bg-bb-burgundy px-3 text-xs font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {patchTask.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                {preview.assignee_found && preview.assignee_display_name ? preview.assignee_display_name : "Unassigned"}
              </span>
              {preview.sprint_id != null && (
                <span className="rounded-md bg-bb-surface-2 px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-bb-ink-2 uppercase">
                  sprint {preview.sprint_id}
                </span>
              )}
            </div>
            {preview.labels.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {preview.labels.map((label) => (
                  <span
                    key={label}
                    className="rounded-md bg-bb-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-bb-ink-2"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
            {preview.assignee_query && !preview.assignee_found && (
              <p className="m-0 mt-2.5 flex items-start gap-1.5 text-xs text-bb-amber">
                <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
                &ldquo;{preview.assignee_query}&rdquo; was not found in Jira — the issue will be created unassigned.
              </p>
            )}
              </>
            )}
          </div>
        ) : (
          <p className="m-0 flex items-start gap-1.5 text-xs text-bb-danger">
            <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
            {preview?.error ?? (isError ? "Could not reach the server to load the Jira preview." : "Could not load the Jira preview.")}
          </p>
        )}

        {screenshots && screenshots.length > 0 && (
          <div>
            <p className="m-0 mb-1.5 font-mono text-[10.5px] tracking-[0.06em] text-bb-muted uppercase">
              Screenshots — attached to the Jira issue
            </p>
            <div className="grid grid-cols-2 gap-2">
              {screenshots.map((shot, index) => (
                <div key={shot.id} className="group relative overflow-hidden rounded-bb-frame border border-bb-line">
                  <button
                    type="button"
                    aria-label={`View screenshot at ${formatSeconds(shot.t_sec)} fullscreen`}
                    onClick={() => setZoomIndex(index)}
                    className="block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bb-burgundy"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- JPEG streamed from the local API; next/image remote-loader config is not warranted */}
                    <img
                      src={`${API_URL}/api/tasks/${(task as Task).id}/screenshots/${shot.id}/image`}
                      alt={`Frame at ${formatSeconds(shot.t_sec)}`}
                      className="block aspect-video w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 font-mono text-[10px] text-white">
                    {formatSeconds(shot.t_sec)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete screenshot at ${formatSeconds(shot.t_sec)}`}
                    disabled={deleteShot.isPending}
                    onClick={() => deleteShot.mutate(shot.id)}
                    className="absolute top-1 right-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
                  >
                    <XIcon className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {zoomShot !== null && (
          <Dialog open onOpenChange={(open) => !open && setZoomIndex(null)}>
            <DialogContent
              showCloseButton={false}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") stepZoom(-1);
                if (e.key === "ArrowRight") stepZoom(1);
              }}
              className="h-[92vh] max-w-[calc(100%-1rem)] gap-0 border-none bg-black/95 p-2 ring-0 sm:max-w-[95vw]"
            >
              <DialogTitle className="sr-only">Screenshot at {formatSeconds(zoomShot.t_sec)}</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element -- JPEG streamed from the local API; next/image remote-loader config is not warranted */}
              <img
                src={`${API_URL}/api/tasks/${(task as Task).id}/screenshots/${zoomShot.id}/image`}
                alt={`Frame at ${formatSeconds(zoomShot.t_sec)}`}
                className="h-full w-full object-contain"
              />
              <span className="absolute bottom-3 left-3 rounded bg-black/60 px-1.5 py-0.5 font-mono text-xs text-white">
                {formatSeconds(zoomShot.t_sec)}
              </span>
              <button
                type="button"
                aria-label="Close fullscreen screenshot"
                onClick={() => setZoomIndex(null)}
                className="absolute top-3 right-3 rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
              {(screenshots?.length ?? 0) > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous screenshot"
                    onClick={() => stepZoom(-1)}
                    className="absolute top-1/2 left-3 -translate-y-1/2 rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                  >
                    <ChevronLeftIcon className="size-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next screenshot"
                    onClick={() => stepZoom(1)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                  >
                    <ChevronRightIcon className="size-5" aria-hidden="true" />
                  </button>
                </>
              )}
            </DialogContent>
          </Dialog>
        )}

        <DialogFooter className="bg-transparent">
          <button
            type="button"
            onClick={handleClose}
            className="h-8 rounded-bb-btn px-3 text-xs font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            Cancel
          </button>
          {!isLoading && !preview?.ok && (
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
            disabled={patchTask.isPending || isLoading || !preview?.ok || editing}
            className="h-8 rounded-bb-btn bg-bb-burgundy px-3.5 text-xs font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {patchTask.isPending ? "Approving…" : "Approve & push to Jira"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
