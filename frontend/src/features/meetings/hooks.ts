"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACTIVE_STATUSES, api } from "@/lib/client";

/** Meetings for a project (or all, if omitted). Polls every 2s while any meeting is active. */
export function useMeetings(projectId?: number) {
  return useQuery({
    queryKey: ["meetings", { project_id: projectId ?? "all" }],
    queryFn: () => api.listMeetings(projectId !== undefined ? { project_id: projectId } : {}),
    refetchInterval: (query) =>
      query.state.data?.some((m) => ACTIVE_STATUSES.includes(m.status)) ? 2000 : false,
  });
}

/** Single meeting detail. Polls every 2s while the meeting is active. */
export function useMeeting(id: number) {
  return useQuery({
    queryKey: ["meetings", id],
    queryFn: () => api.getMeeting(id),
    enabled: id >= 0,
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.includes(query.state.data.status) ? 2000 : false,
  });
}

export function useUploadMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, projectId, title }: { file: File; projectId: number; title?: string }) =>
      api.uploadMeeting(file, projectId, title),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useRetryMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.retryMeeting,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMeeting,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useReextractMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reextractMeeting,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
