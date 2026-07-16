"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTask } from "./hooks";

const schema = z.object({ title: z.string().min(1, "Title is required") });
type FormValues = z.infer<typeof schema>;

export function NewTaskForm({ projectId }: { projectId: number }) {
  const create = useCreateTask();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: "" } });

  const onSubmit = form.handleSubmit(({ title }) =>
    create.mutate(
      { project_id: projectId, title },
      { onSuccess: () => form.reset(), onError: (e) => toast.error(e.message) },
    ),
  );

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input placeholder="Add a task manually…" aria-label="New task title" {...form.register("title")} />
      <Button type="submit" disabled={create.isPending}>Add</Button>
    </form>
  );
}
