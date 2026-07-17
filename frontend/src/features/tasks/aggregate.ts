"use client";

import { useQueries } from "@tanstack/react-query";
import { api, type Project } from "@/lib/client";

/**
 * Fetches tasks for every given project (one query per project, cached under
 * the same key `useTasksForProject` uses) and returns a { [projectId]: count }
 * map of draft ("to review") tasks — used for sidebar badges and the tasks tab badge.
 */
export function useDraftCounts(projects: Project[] | undefined) {
  const results = useQueries({
    queries: (projects ?? []).map((p) => ({
      queryKey: ["tasks", { project_id: p.id }],
      queryFn: () => api.listTasks({ project_id: p.id }),
      enabled: !!projects,
    })),
  });

  const counts: Record<number, number> = {};
  (projects ?? []).forEach((p, i) => {
    const tasks = results[i]?.data ?? [];
    counts[p.id] = tasks.filter((t) => t.status === "draft").length;
  });
  return counts;
}
