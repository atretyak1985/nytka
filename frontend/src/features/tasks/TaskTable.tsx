"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { Task } from "@/lib/client";
import { STATUS_ACTIONS, useDeleteTask, usePatchTask } from "./hooks";

function EditableCell({
  value,
  onSave,
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <button
        type="button"
        className="w-full text-left text-sm hover:underline decoration-dotted"
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        {value || <span className="text-muted-foreground">{placeholder ?? "—"}</span>}
      </button>
    );
  }
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  return (
    <Input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
      className="h-8"
    />
  );
}

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const patch = usePatchTask();
  const del = useDeleteTask();
  const onError = (e: Error) => toast.error(e.message);

  if (!tasks.length) return <p className="text-sm text-muted-foreground">No tasks match this filter.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[35%]">Title</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Meeting</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((t) => (
          <TableRow key={t.id}>
            <TableCell>
              <EditableCell value={t.title} onSave={(title) => patch.mutate({ id: t.id, title }, { onError })} />
            </TableCell>
            <TableCell>
              <EditableCell
                value={t.assignee ?? ""}
                placeholder="unassigned"
                onSave={(assignee) => patch.mutate({ id: t.id, assignee: assignee || null }, { onError })}
              />
            </TableCell>
            <TableCell>
              <Select
                value={t.priority}
                onValueChange={(priority) =>
                  patch.mutate({ id: t.id, priority: priority as Task["priority"] }, { onError })}
              >
                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell><Badge variant={t.status === "draft" ? "outline" : "default"}>{t.status}</Badge></TableCell>
            <TableCell>
              {t.meeting_id ? (
                <Link className="text-xs hover:underline" href={`/meetings/${t.meeting_id}`}>#{t.meeting_id}</Link>
              ) : (
                <span className="text-xs text-muted-foreground">manual</span>
              )}
            </TableCell>
            <TableCell className="space-x-1 text-right">
              {STATUS_ACTIONS[t.status].map((a) => (
                <Button
                  key={a.to}
                  size="sm"
                  variant="outline"
                  onClick={() => patch.mutate({ id: t.id, status: a.to }, { onError })}
                >
                  {a.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" aria-label={`Delete task ${t.title}`} onClick={() => del.mutate(t.id, { onError })}>✕</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
