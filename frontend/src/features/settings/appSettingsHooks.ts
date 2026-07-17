"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";

/** Global, app-wide settings (the editable base extraction prompt). */
export function useAppSettings() {
  return useQuery({ queryKey: ["app-settings"], queryFn: api.getSettings });
}

export function usePatchAppSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.patchSettings,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-settings"] }),
  });
}
