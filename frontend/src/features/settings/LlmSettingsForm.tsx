"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/client";

type FormValues = {
  llm_provider: string;
  llm_model: string;
  llm_base_url: string;
  llm_api_key: string;
};

const PROVIDERS = ["lmstudio", "ollama", "anthropic", "openai"];

export function LlmSettingsForm() {
  const qc = useQueryClient();
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: api.listProjects });
  const project = projects?.[0];

  const form = useForm<FormValues>({
    defaultValues: { llm_provider: "lmstudio", llm_model: "", llm_base_url: "", llm_api_key: "" },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        llm_provider: project.llm_provider,
        llm_model: project.llm_model,
        llm_base_url: project.llm_base_url ?? "",
        llm_api_key: "",
      });
    }
  }, [project, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      api.patchProject(project!.id, {
        llm_provider: values.llm_provider,
        llm_model: values.llm_model,
        llm_base_url: values.llm_base_url || null,
        ...(values.llm_api_key ? { llm_api_key: values.llm_api_key } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("LLM settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => api.llmTest(project!.id),
    onSuccess: (r) => (r.ok ? toast.success("Connection OK") : toast.error(`Connection failed: ${r.error}`)),
    onError: (e) => toast.error(e.message),
  });

  if (!project) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const provider = form.watch("llm_provider");

  return (
    <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="max-w-md space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="provider">Provider</label>
        <Select value={provider} onValueChange={(v) => { if (v) form.setValue("llm_provider", v); }}>
          <SelectTrigger id="provider"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROVIDERS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="model">Model</label>
        <Input id="model" {...form.register("llm_model")} placeholder="e.g. qwen2.5-14b-instruct" />
      </div>
      {(provider === "lmstudio" || provider === "ollama") && (
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="base-url">Base URL</label>
          <Input id="base-url" {...form.register("llm_base_url")} placeholder="http://localhost:1234/v1" />
        </div>
      )}
      {(provider === "anthropic" || provider === "openai") && (
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="api-key">API key (stored locally)</label>
          <Input id="api-key" type="password" {...form.register("llm_api_key")} placeholder="sk-…" />
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>Save</Button>
        <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate()}>
          {test.isPending ? "Testing…" : "Test connection"}
        </Button>
      </div>
    </form>
  );
}
