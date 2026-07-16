"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Task, type TaskStatus } from "@/lib/client";

export function useTasks(status?: TaskStatus) {
  return useQuery({
    queryKey: ["tasks", { status: status ?? "all" }],
    queryFn: () => api.listTasks(status ? { status } : {}),
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["tasks"] });
    void qc.invalidateQueries({ queryKey: ["meetings"] });
  };
}

export function usePatchTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof api.patchTask>[1]) =>
      api.patchTask(id, payload),
    onSuccess: invalidate,
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: api.createTask, onSuccess: invalidate });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: api.deleteTask, onSuccess: invalidate });
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
