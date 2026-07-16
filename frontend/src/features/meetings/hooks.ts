"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ACTIVE_STATUSES, api } from "@/lib/client";

export function useMeetings() {
  return useQuery({
    queryKey: ["meetings"],
    queryFn: api.listMeetings,
    refetchInterval: (query) =>
      query.state.data?.some((m) => ACTIVE_STATUSES.includes(m.status)) ? 2000 : false,
  });
}

export function useMeeting(id: number) {
  return useQuery({
    queryKey: ["meetings", id],
    queryFn: () => api.getMeeting(id),
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.includes(query.state.data.status) ? 2000 : false,
  });
}

export function useUploadMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title }: { file: File; title?: string }) => api.uploadMeeting(file, title),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}

export function useRetryMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.retryMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["meetings"] }),
  });
}
