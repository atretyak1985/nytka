"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type Task, type TaskStatus } from "@/lib/client";

export interface TasksFilter {
  projectId?: number;
  status?: TaskStatus;
  meetingId?: number;
}

export function useTasks(filter: TasksFilter = {}) {
  const { projectId, status, meetingId } = filter;
  return useQuery({
    queryKey: ["tasks", { project_id: projectId ?? "all", status: status ?? "all", meeting_id: meetingId ?? "all" }],
    queryFn: () =>
      api.listTasks({
        ...(projectId !== undefined ? { project_id: projectId } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(meetingId !== undefined ? { meeting_id: meetingId } : {}),
      }),
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["tasks"] });
    void qc.invalidateQueries({ queryKey: ["meetings"] });
    void qc.invalidateQueries({ queryKey: ["projects"] });
  };
}

/** Surfaces the server's transition-guard 409s (and any other error) as a toast instead of throwing into the UI. */
function toastOnError(e: Error) {
  const message = e.message.startsWith("API 409") ? "That status change isn't allowed right now." : e.message;
  toast.error(message);
}

export function usePatchTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof api.patchTask>[1]) =>
      api.patchTask(id, payload),
    onSuccess: invalidate,
    onError: toastOnError,
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: invalidate,
    onError: toastOnError,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: api.deleteTask,
    onSuccess: invalidate,
    onError: toastOnError,
  });
}

export function useJiraPush() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: api.jiraPush,
    onSuccess: (task) => {
      invalidate();
      if (task.jira_issue_key) toast.success(`Created ${task.jira_issue_key} in Jira`);
      else if (task.jira_sync_error) toast.error(`Jira push failed: ${task.jira_sync_error}`);
    },
    onError: toastOnError,
  });
}

export const STATUS_ACTIONS: Record<Task["status"], { label: string; to: TaskStatus }[]> = {
  draft: [
    { label: "Approve", to: "approved" },
    { label: "Reject", to: "rejected" },
  ],
  approved: [
    { label: "Mark done", to: "done" },
    { label: "Back to draft", to: "draft" },
  ],
  rejected: [{ label: "Back to draft", to: "draft" }],
  done: [],
};
