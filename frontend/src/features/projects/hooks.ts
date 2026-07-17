"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Project } from "@/lib/client";

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
}

export function useProject(id: number | undefined) {
  const { data: projects, ...rest } = useProjects();
  const project = id !== undefined ? projects?.find((p) => p.id === id) : undefined;
  return { ...rest, data: project, projects };
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function usePatchProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof api.patchProject>[1]) =>
      api.patchProject(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useLlmTest() {
  return useMutation({ mutationFn: api.llmTest });
}

/** Count of draft (to-review) tasks — used for sidebar/tab badges. */
export function draftCount(tasks: { status: string }[]): number {
  return tasks.filter((t) => t.status === "draft").length;
}

export type { Project };
