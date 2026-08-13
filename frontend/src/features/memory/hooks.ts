"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/client";

/** Full-text search across one project's transcripts, tasks and briefs.
 *  Idle below two characters — a one-letter prefix matches half the transcript. */
export function useProjectSearch(projectId: number, q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ["memory-search", projectId, query] as const,
    queryFn: () => api.searchProject(projectId, query),
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}

/** Grounded Q&A. A mutation, not a query: it is an explicit user action and the
 *  local model can take seconds — nothing here should run on a keystroke. */
export function useAskProject(projectId: number) {
  return useMutation({
    mutationFn: (question: string) => api.askProject(projectId, question),
  });
}
