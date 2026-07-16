"use client";

import { use, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { MeetingTasksPanel } from "@/features/meetings/MeetingTasksPanel";
import { TranscriptView } from "@/features/meetings/TranscriptView";
import { useMeeting } from "@/features/meetings/hooks";

export default function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: meeting, isLoading, error } = useMeeting(Number(id));
  const [highlightTs, setHighlightTs] = useState<number | null>(null);

  if (isLoading) return <main className="p-6 text-sm text-muted-foreground">Loading…</main>;
  if (error || !meeting) return <main className="p-6 text-sm text-destructive">Meeting not found.</main>;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{meeting.title}</h1>
        <Badge variant={meeting.status === "error" ? "destructive" : "secondary"}>{meeting.status}</Badge>
        {meeting.language && <span className="text-xs text-muted-foreground">lang: {meeting.language}</span>}
      </div>
      {meeting.error_message && <p className="text-sm text-destructive">{meeting.error_message}</p>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-label="Transcript">
          <TranscriptView segments={meeting.segments} highlightTs={highlightTs} />
        </section>
        <aside aria-label="Extracted tasks">
          <h2 className="mb-2 text-sm font-medium">Tasks ({meeting.tasks.length})</h2>
          <MeetingTasksPanel tasks={meeting.tasks} onSelect={setHighlightTs} />
        </aside>
      </div>
    </main>
  );
}
