"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/client";
import { TASK_STATUS, TASK_PRIORITY, formatTimestamp } from "@/lib/design-maps";
import { Chip } from "@/components/ui/chip";
import {
  useTasks,
  useCreateTask,
  usePatchTask,
  useDeleteTask,
  useJiraPush,
  useMergeTask,
  STATUS_ACTIONS,
} from "@/features/tasks/hooks";
import { useMeetings } from "@/features/meetings/hooks";
import { useProject } from "@/features/projects/hooks";
import { JiraApproveDialog } from "@/features/tasks/JiraApproveDialog";
import { toast } from "sonner";

type Filter = "all" | "draft" | "rejected";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "To review" },
  { key: "rejected", label: "Rejected" },
];

export function TasksTab({ projectId }: { projectId: number }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [newTitle, setNewTitle] = useState("");

  const { data: allTasks, isLoading } = useTasks({ projectId });
  const { data: meetings } = useMeetings(projectId);
  const createTask = useCreateTask();
  const patchTask = usePatchTask();
  const deleteTask = useDeleteTask();
  const { data: project } = useProject(projectId);
  const jiraPush = useJiraPush();
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  const meetingTitleById = useMemo(() => new Map((meetings ?? []).map((m) => [m.id, m.title])), [meetings]);

  const tasks = allTasks ?? [];
  // The dedup pass flags a target by id; the row it points at lives in this same list.
  const taskById = useMemo(() => new Map((allTasks ?? []).map((t) => [t.id, t])), [allTasks]);
  const counts: Record<Filter, number> = {
    all: tasks.length,
    draft: tasks.filter((t) => t.status === "draft").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const drafts = filter === "all" || filter === "draft" ? tasks.filter((t) => t.status === "draft") : [];
  // The table shows non-draft tasks — drafts are already surfaced in the inbox above.
  const tableRows = filter === "draft" ? [] : filtered.filter((t) => t.status !== "draft");

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    createTask.mutate(
      { project_id: projectId, title, priority: "medium" },
      {
        onSuccess: () => setNewTitle(""),
      },
    );
  };

  const handleStatusChange = (id: number, to: TaskStatus) => {
    patchTask.mutate({ id, status: to });
  };

  // Always open the preview dialog: it shows extracted screenshots (Jira-independent)
  // and, when Jira is configured, the issue preview. The dialog itself degrades
  // gracefully (offers "Approve without Jira") when Jira isn't set up.
  const handleApprove = (task: Task) => {
    setPreviewTask(task);
  };

  const handleDelete = (id: number) => {
    deleteTask.mutate(id, { onSuccess: () => toast.success("Task deleted") });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-bb-frame border border-bb-line bg-bb-surface" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4.5 flex flex-wrap gap-1.5" role="tablist" aria-label="Task filters">
        {FILTERS.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setFilter(f.key)}
              className={`h-7 rounded-full border px-3 font-mono text-[10.5px] tracking-[0.06em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy ${
                isActive
                  ? "border-transparent bg-bb-burgundy text-bb-on-accent"
                  : "border-bb-line bg-transparent text-bb-ink-2 hover:bg-bb-surface-2"
              }`}
            >
              {f.label} · {counts[f.key]}
            </button>
          );
        })}
      </div>

      {drafts.length > 0 && (
        <div className="mb-6.5">
          <p className="m-0 mb-2.5 font-mono text-[10px] tracking-[0.14em] text-bb-amber uppercase">
            To review · {drafts.length}
          </p>
          <div className="flex flex-col gap-2.5">
            {drafts.map((task) => (
              <DraftCard
                key={task.id}
                task={task}
                meetingTitle={task.meeting_id ? meetingTitleById.get(task.meeting_id) : undefined}
                projectId={projectId}
                areas={project?.task_areas ?? []}
                duplicateTarget={
                  task.duplicate_of_task_id !== null ? taskById.get(task.duplicate_of_task_id) : undefined
                }
                onApprove={() => handleApprove(task)}
                onReject={() => handleStatusChange(task.id, "rejected")}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mb-3.5 flex h-10 items-center gap-2.5 rounded-[10px] border border-bb-line bg-bb-surface px-3.5">
        <Plus className="size-[15px] text-bb-muted" aria-hidden="true" />
        <label htmlFor="new-task-input" className="sr-only">
          Add a task manually
        </label>
        <input
          id="new-task-input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
          placeholder="Add a task — Enter"
          className="h-full flex-1 border-none bg-transparent text-[13px] text-bb-ink outline-none placeholder:text-bb-muted"
        />
      </div>

      {tableRows.length > 0 ? (
        <div className="overflow-hidden rounded-bb-frame border border-bb-line bg-bb-surface">
          <div className="grid grid-cols-[minmax(200px,2fr)_130px_100px_110px_160px_170px] items-center gap-2.5 border-b border-bb-line px-5 py-2.5">
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Task</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Assignee</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Priority</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Status</span>
            <span className="font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Meeting</span>
            <span />
          </div>
          {tableRows.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              projectId={projectId}
              meetingTitle={task.meeting_id ? meetingTitleById.get(task.meeting_id) : undefined}
              mergedInto={
                task.duplicate_of_task_id !== null && task.status === "merged"
                  ? taskById.get(task.duplicate_of_task_id)
                  : undefined
              }
              isFirst={i === 0}
              jiraBaseUrl={project?.jira_base_url ?? ""}
              onJiraRetry={() => jiraPush.mutate(task.id)}
              onStatusChange={(to) => handleStatusChange(task.id, to)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-bb-frame border border-bb-line bg-bb-surface p-8 text-center">
          <p className="m-0 text-[12.5px] text-bb-muted">No tasks for this filter.</p>
        </div>
      )}
      <JiraApproveDialog task={previewTask} onClose={() => setPreviewTask(null)} />
    </div>
  );
}

function DraftCard({
  task,
  meetingTitle,
  projectId,
  areas,
  duplicateTarget,
  onApprove,
  onReject,
}: {
  task: Task;
  meetingTitle: string | undefined;
  projectId: number;
  areas: string[];
  duplicateTarget: Task | undefined;
  onApprove: () => void;
  onReject: () => void;
}) {
  const priority = TASK_PRIORITY[task.priority];
  const patchTask = usePatchTask();
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-4 rounded-bb-frame border border-bb-line bg-bb-surface px-5 py-4">
      <div className="min-w-0">
        <p className="m-0 mb-1 text-[14.5px] font-medium text-bb-ink">{task.title}</p>
        {task.description && (
          <p className="m-0 mb-2 font-[family-name:var(--font-display)] text-[13px] leading-relaxed text-bb-ink-2 italic">
            &ldquo;{task.description}&rdquo;
          </p>
        )}
        {duplicateTarget && (
          <DuplicateBanner task={task} target={duplicateTarget} reason={task.duplicate_reason} />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`font-mono text-[10px] tracking-[0.06em] uppercase ${priority.className}`}>
            &#9679; {priority.label}
          </span>
          <span className="font-mono text-[10px] tracking-[0.06em] text-bb-ink-2 uppercase">
            {task.assignee || "not assigned"}
          </span>
          {areas.length > 0 && (
            <select
              aria-label="Area"
              value={task.area}
              onChange={(e) => patchTask.mutate({ id: task.id, area: e.target.value })}
              className="h-6 rounded-bb-btn border border-bb-line bg-bb-paper px-1.5 font-mono text-[10px] text-bb-ink outline-none focus-visible:border-bb-burgundy"
            >
              <option value="">— no area —</option>
              {areas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          )}
          {task.meeting_id && meetingTitle && (
            <Link
              href={`/projects/${projectId}/meetings/${task.meeting_id}${task.source_timestamp !== null ? `?seg=${task.source_timestamp}` : ""}`}
              className="font-mono text-[10px] tracking-[0.06em] text-bb-brand uppercase hover:text-bb-wine"
            >
              &rarr; {meetingTitle} · {task.source_timestamp !== null ? formatTimestamp(task.source_timestamp) : ""}
            </Link>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          className="h-[30px] rounded-bb-btn bg-bb-burgundy px-3.5 text-[12.5px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          className="h-[30px] rounded-bb-btn px-3 text-[12.5px] font-medium text-bb-ink-2 transition-colors hover:bg-bb-danger-soft hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

/** SC-10: the pipeline only ever FLAGS. Merging stays an explicit, confirmed user action,
 *  and Approve/Reject on a flagged draft keep working exactly as before. */
function DuplicateBanner({
  task,
  target,
  reason,
}: {
  task: Task;
  target: Task;
  reason: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const mergeTask = useMergeTask();
  const targetLabel = target.jira_issue_key ?? "existing task";

  return (
    <div className="mb-2.5 rounded-[10px] bg-bb-amber-soft px-3 py-2.5">
      <p className="m-0 text-[12.5px] text-bb-ink">
        Possible duplicate of &ldquo;{target.title}&rdquo;
        {target.jira_issue_key ? ` (${target.jira_issue_key})` : ""}
      </p>
      {reason && <p className="m-0 mt-0.5 text-[11.5px] text-bb-ink-2">{reason}</p>}
      {confirming ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-bb-ink-2">
            {target.jira_issue_key
              ? `This comments on ${target.jira_issue_key} in Jira and closes this draft as merged.`
              : "This closes the draft as merged into the existing task."}
          </span>
          <button
            type="button"
            disabled={mergeTask.isPending}
            onClick={() =>
              mergeTask.mutate(
                { id: task.id, targetTaskId: target.id, targetLabel },
                { onSettled: () => setConfirming(false) },
              )
            }
            className="h-[26px] rounded-bb-btn bg-bb-burgundy px-3 text-[11.5px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            {mergeTask.isPending ? "Merging…" : "Confirm merge"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="h-[26px] rounded-bb-btn px-2.5 text-[11.5px] font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-1.5 h-[26px] rounded-bb-btn border border-bb-amber px-2.5 text-[11.5px] font-medium text-bb-amber transition-colors hover:bg-bb-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          Merge into {targetLabel}
        </button>
      )}
    </div>
  );
}

function TaskRow({
  task,
  projectId,
  meetingTitle,
  mergedInto,
  isFirst,
  jiraBaseUrl,
  onJiraRetry,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  projectId: number;
  meetingTitle: string | undefined;
  mergedInto: Task | undefined;
  isFirst: boolean;
  jiraBaseUrl: string;
  onJiraRetry: () => void;
  onStatusChange: (to: TaskStatus) => void;
  onDelete: () => void;
}) {
  const priority = TASK_PRIORITY[task.priority];
  const statusChip = TASK_STATUS[task.status];
  const actions = STATUS_ACTIONS[task.status];

  return (
    <div
      className={`grid grid-cols-[minmax(200px,2fr)_130px_100px_110px_160px_170px] items-center gap-2.5 px-5 py-2.75 ${isFirst ? "" : "border-t border-bb-line"}`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-bb-ink">{task.title}</span>
        {mergedInto ? (
          <span className="block truncate text-[10.5px] text-bb-violet" title={mergedInto.title}>
            &rarr; merged into {mergedInto.jira_issue_key ?? mergedInto.title}
          </span>
        ) : task.jira_issue_key ? (
          jiraBaseUrl ? (
            <a
              href={`${jiraBaseUrl}/browse/${task.jira_issue_key}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[10px] tracking-[0.06em] text-bb-sky uppercase hover:underline"
            >
              {task.jira_issue_key}
            </a>
          ) : (
            <span className="font-mono text-[10px] tracking-[0.06em] text-bb-sky uppercase">
              {task.jira_issue_key}
            </span>
          )
        ) : task.jira_sync_error ? (
          <span className="flex items-center gap-1.5">
            <span
              title={task.jira_sync_error}
              className="font-mono text-[10px] tracking-[0.06em] text-bb-danger uppercase"
            >
              Jira failed
            </span>
            <button
              type="button"
              onClick={onJiraRetry}
              className="font-mono text-[10px] tracking-[0.06em] text-bb-brand uppercase hover:text-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
            >
              Retry
            </button>
          </span>
        ) : null}
      </span>
      <span className="truncate text-xs text-bb-ink-2">{task.assignee || "not assigned"}</span>
      <span className={`font-mono text-[10px] tracking-[0.06em] uppercase ${priority.className}`}>&#9679; {priority.label}</span>
      <span>
        <Chip chip={statusChip} className="text-[9.5px]" />
      </span>
      {task.meeting_id && meetingTitle ? (
        <Link
          href={`/projects/${projectId}/meetings/${task.meeting_id}${task.source_timestamp !== null ? `?seg=${task.source_timestamp}` : ""}`}
          className="truncate text-left text-[11.5px] text-bb-brand hover:text-bb-wine"
        >
          {meetingTitle}
        </Link>
      ) : (
        <span className="font-mono text-[10px] text-bb-muted uppercase">manual</span>
      )}
      <div className="flex items-center justify-end gap-1.5">
        {actions.map((action) => (
          <button
            key={action.to}
            type="button"
            onClick={() => onStatusChange(action.to)}
            className="h-[25px] rounded-md border border-bb-line bg-bb-surface px-2.5 text-[11px] whitespace-nowrap text-bb-ink-2 transition-colors hover:bg-bb-surface-2 hover:text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete task ${task.title}`}
          title="Delete"
          className="flex size-[25px] items-center justify-center rounded-md text-bb-muted transition-colors hover:bg-bb-danger-soft hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
        >
          <Trash2 className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
