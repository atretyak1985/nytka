"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Meeting, MeetingStatus } from "@/lib/client";
import { useMeetings, useRetryMeeting } from "./hooks";

const STATUS_VARIANT: Record<MeetingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "outline",
  processing: "secondary",
  transcribing: "secondary",
  extracting: "secondary",
  done: "default",
  error: "destructive",
};

export function MeetingList() {
  const { data, isLoading, error } = useMeetings();
  const retry = useRetryMeeting();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load meetings: {error.message}</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">No meetings yet — upload one above.</p>;

  return (
    <ul className="divide-y rounded-lg border">
      {data.map((m: Meeting) => (
        <li key={m.id} className="flex items-center justify-between gap-4 p-4">
          <div className="min-w-0">
            <Link href={`/meetings/${m.id}`} className="font-medium hover:underline">{m.title}</Link>
            <p className="truncate text-xs text-muted-foreground">
              {m.source_filename} · {new Date(m.created_at).toLocaleString()}
              {m.error_message ? ` · ${m.error_message}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[m.status]}>{m.status}</Badge>
            {m.status === "error" && (
              <Button size="sm" variant="outline" onClick={() => retry.mutate(m.id)}>Retry</Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
