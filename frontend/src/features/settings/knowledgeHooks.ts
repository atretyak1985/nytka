"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";

const knowledgeKey = (projectId: number) => ["knowledge", projectId] as const;

/** Per-project knowledge base state (files + brief status). Polls while Init runs. */
export function useKnowledge(projectId: number | undefined) {
  return useQuery({
    queryKey: knowledgeKey(projectId ?? -1),
    queryFn: () => api.getKnowledge(projectId as number),
    enabled: projectId !== undefined,
    // Keep the UI live while the distillation job is processing.
    refetchInterval: (query) =>
      query.state.data?.knowledge_status === "processing" ? 2000 : false,
  });
}

export function useUploadKnowledgeFile(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadKnowledgeFile(projectId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKey(projectId) }),
  });
}

export function useDeleteKnowledgeFile(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileId: number) => api.deleteKnowledgeFile(projectId, fileId),
    onSuccess: () => qc.invalidateQueries({ queryKey: knowledgeKey(projectId) }),
  });
}

export function useInitKnowledge(projectId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.initKnowledge(projectId),
    onSuccess: (data) => qc.setQueryData(knowledgeKey(projectId), data),
  });
}
