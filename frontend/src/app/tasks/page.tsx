"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { NewTaskForm } from "@/features/tasks/NewTaskForm";
import { TaskTable } from "@/features/tasks/TaskTable";
import { useTasks } from "@/features/tasks/hooks";
import { api, type TaskStatus } from "@/lib/client";

const FILTERS: (TaskStatus | "all")[] = ["all", "draft", "approved", "done", "rejected"];

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const { data: tasks, isLoading } = useTasks(filter === "all" ? undefined : filter);
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const projectId = projects?.[0]?.id;

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Tasks</h1>
        <Select value={filter} onValueChange={(v) => setFilter(v as TaskStatus | "all")}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {projectId !== undefined && <NewTaskForm projectId={projectId} />}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <TaskTable tasks={tasks ?? []} />}
    </main>
  );
}
