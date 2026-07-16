"use client";

import { Badge } from "@/components/ui/badge";
import type { Task } from "@/lib/client";

export function MeetingTasksPanel({
  tasks,
  onSelect,
}: {
  tasks: Task[];
  onSelect: (ts: number | null) => void;
}) {
  if (!tasks.length) return <p className="text-sm text-muted-foreground">No tasks extracted yet.</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onSelect(t.source_timestamp ?? null)}
            className="w-full rounded-lg border p-3 text-left hover:bg-muted"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{t.title}</span>
              <Badge variant={t.status === "draft" ? "outline" : "default"}>{t.status}</Badge>
            </div>
            {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {t.assignee ?? "unassigned"} · {t.priority}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
