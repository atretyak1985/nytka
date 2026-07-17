"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleCheckIcon, Loader2Icon, OctagonXIcon, Sparkles, X } from "lucide-react";
import type { Project, TeamMember } from "@/lib/client";
import { LLM_PROVIDERS, LMSTUDIO_BASE_URL, isLocalProvider, normalizeLlmProvider } from "@/lib/design-maps";
import { useLlmConnect, usePatchProject } from "@/features/projects/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormState {
  aiContext: string;
  taskPrefix: string;
  taskFormat: string;
  glossary: string[];
  team: TeamMember[];
  llmProvider: string;
  llmModel: string;
  llmBaseUrl: string;
  jiraEnabled: boolean;
  jiraKey: string;
}

function toFormState(project: Project): FormState {
  const llmProvider = normalizeLlmProvider(project.llm_provider);
  return {
    aiContext: project.ai_context,
    taskPrefix: project.task_prefix,
    taskFormat: project.task_format,
    glossary: project.glossary,
    team: project.team,
    llmProvider,
    llmModel: project.llm_model,
    // LM Studio always talks to the fixed IPv4 loopback endpoint (`localhost` resolves
    // to `::1` first on macOS); this also heals legacy `localhost` rows on next save.
    llmBaseUrl: llmProvider === "lmstudio" ? LMSTUDIO_BASE_URL : (project.llm_base_url ?? ""),
    jiraEnabled: project.jira_enabled,
    jiraKey: project.jira_key,
  };
}

/** Full PATCH payload — Save and Test-connection persist the same complete form. */
function toPatchPayload(form: FormState) {
  return {
    ai_context: form.aiContext,
    task_prefix: form.taskPrefix,
    task_format: form.taskFormat,
    glossary: form.glossary,
    team: form.team,
    llm_provider: form.llmProvider,
    llm_model: form.llmModel,
    llm_base_url: form.llmBaseUrl || null,
    jira_enabled: form.jiraEnabled,
    jira_key: form.jiraKey,
  };
}

export function SettingsTab({ project }: { project: Project }) {
  const [form, setForm] = useState<FormState>(() => toFormState(project));
  const [glossaryDraft, setGlossaryDraft] = useState("");
  const [teamDraft, setTeamDraft] = useState("");
  const patchProject = usePatchProject();
  const llmConnect = useLlmConnect();
  const [connectionStatus, setConnectionStatus] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Re-sync local form state when the underlying project changes from elsewhere (e.g. after
  // save). Adjusting state during render is React's recommended alternative to a syncing effect.
  const [syncedProject, setSyncedProject] = useState(project);
  if (project !== syncedProject) {
    setSyncedProject(project);
    setForm(toFormState(project));
  }

  const handleSave = () => {
    patchProject.mutate(
      { id: project.id, ...toPatchPayload(form) },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      // llm-connect probes the STORED project config, so persist the form first.
      // Sending the complete payload (not a partial one) matters: the form re-syncs
      // from the refetched project after any PATCH, which would wipe unsaved edits.
      await patchProject.mutateAsync({ id: project.id, ...toPatchPayload(form) });
      const result = await llmConnect.mutateAsync(project.id);
      if (!result.ok) {
        setConnectionStatus({ kind: "error", message: result.error ?? "Connection failed" });
        return;
      }
      const detected = result.model ?? null;
      if (detected) {
        setForm((f) => ({ ...f, llmModel: detected }));
        await patchProject.mutateAsync({ id: project.id, llm_model: detected });
      }
      setConnectionStatus({
        kind: "success",
        message: detected ? `Connected · ${detected}` : "Connected · no model loaded in LM Studio",
      });
    } catch (e) {
      setConnectionStatus({ kind: "error", message: e instanceof Error ? e.message : "Connection failed" });
    } finally {
      setTestingConnection(false);
    }
  };

  const addGlossaryTerm = () => {
    const term = glossaryDraft.trim();
    if (!term) return;
    setForm((f) => ({ ...f, glossary: [...f.glossary, term] }));
    setGlossaryDraft("");
  };

  const addTeamMember = () => {
    const raw = teamDraft.trim();
    if (!raw) return;
    const [name, role] = raw.split(/\s*—\s*|\s+-\s+/);
    if (!name) return;
    setForm((f) => ({ ...f, team: [...f.team, { name: name.trim(), role: (role ?? "").trim() }] }));
    setTeamDraft("");
  };

  const local = isLocalProvider(form.llmProvider);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5 lg:col-span-2">
          <div className="mb-1 flex items-center gap-2.5">
            <Sparkles className="size-[15px] text-bb-brand" aria-hidden="true" />
            <h3 className="m-0 text-sm font-semibold text-bb-ink">AI context</h3>
          </div>
          <p className="m-0 mb-3 text-xs text-bb-muted">
            Added to the prompt when extracting tasks from a transcript — describe the product, roles, and conventions.
          </p>
          <textarea
            value={form.aiContext}
            onChange={(e) => setForm((f) => ({ ...f, aiContext: e.target.value }))}
            rows={4}
            placeholder="E.g.: this is a marketplace CRM. Phrase tasks as user stories…"
            className="w-full resize-y rounded-bb-btn border border-bb-line bg-bb-paper px-3.5 py-2.5 text-[13px] leading-relaxed text-bb-ink outline-none focus-visible:border-bb-burgundy"
          />
        </section>

        <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
          <h3 className="m-0 mb-1 text-sm font-semibold text-bb-ink">Task template</h3>
          <p className="m-0 mb-3 text-xs text-bb-muted">Each extracted task gets a prefix and a description format.</p>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="w-[70px] shrink-0 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Prefix</span>
              <input
                value={form.taskPrefix}
                onChange={(e) => setForm((f) => ({ ...f, taskPrefix: e.target.value }))}
                placeholder="CRM"
                className="h-8 w-[110px] rounded-bb-btn border border-bb-line bg-bb-paper px-2.5 font-mono text-xs text-bb-ink outline-none focus-visible:border-bb-burgundy"
              />
            </div>
            <textarea
              value={form.taskFormat}
              onChange={(e) => setForm((f) => ({ ...f, taskFormat: e.target.value }))}
              rows={3}
              placeholder="As a <role>, I want <action>, so that <value>…"
              className="w-full resize-y rounded-bb-btn border border-bb-line bg-bb-paper px-3 py-2.5 text-[12.5px] leading-relaxed text-bb-ink outline-none focus-visible:border-bb-burgundy"
            />
          </div>
        </section>

        <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
          <h3 className="m-0 mb-1 text-sm font-semibold text-bb-ink">Glossary</h3>
          <p className="m-0 mb-3 text-xs text-bb-muted">Correct spelling of terms and names in the transcript.</p>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {form.glossary.map((term, i) => (
              <span
                key={`${term}-${i}`}
                className="inline-flex items-center gap-1.5 rounded-md bg-bb-surface-2 py-1 pr-1 pl-2.5 font-mono text-[11px] text-bb-ink-2"
              >
                {term}
                <button
                  type="button"
                  aria-label={`Remove ${term}`}
                  onClick={() => setForm((f) => ({ ...f, glossary: f.glossary.filter((_, idx) => idx !== i) }))}
                  className="flex size-4 items-center justify-center rounded text-bb-muted hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                >
                  <X className="size-2.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={glossaryDraft}
            onChange={(e) => setGlossaryDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGlossaryTerm();
              }
            }}
            placeholder="Add a term — Enter"
            className="h-8 w-full rounded-bb-btn border border-bb-line bg-bb-paper px-2.5 text-[12.5px] text-bb-ink outline-none focus-visible:border-bb-burgundy"
          />
        </section>

        <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
          <h3 className="m-0 mb-1 text-sm font-semibold text-bb-ink">Team</h3>
          <p className="m-0 mb-3 text-xs text-bb-muted">The AI will only assign owners from this list.</p>
          <div className="mb-2.5 flex flex-col gap-2">
            {form.team.map((member, i) => (
              <div key={`${member.name}-${i}`} className="flex items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-bb-brand-soft font-mono text-[10px] font-semibold text-bb-brand">
                  {member.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0]?.toUpperCase())
                    .join("")}
                </span>
                <span className="flex-1 text-[13px] text-bb-ink">{member.name}</span>
                <span className="font-mono text-[10px] tracking-[0.06em] text-bb-muted uppercase">{member.role}</span>
                <button
                  type="button"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => setForm((f) => ({ ...f, team: f.team.filter((_, idx) => idx !== i) }))}
                  className="flex size-5 items-center justify-center rounded text-bb-muted hover:text-bb-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
                >
                  <X className="size-2.75" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <input
            value={teamDraft}
            onChange={(e) => setTeamDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTeamMember();
              }
            }}
            placeholder="Name — role, Enter"
            className="h-8 w-full rounded-bb-btn border border-bb-line bg-bb-paper px-2.5 text-[12.5px] text-bb-ink outline-none focus-visible:border-bb-burgundy"
          />
        </section>

        <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
          <h3 className="m-0 mb-1 text-sm font-semibold text-bb-ink">LLM model</h3>
          <p className="m-0 mb-3 text-xs text-bb-muted">Provider and model used for task extraction in this project.</p>
          <div className="mb-3 flex gap-2.5">
            <Select
              value={form.llmProvider}
              onValueChange={(value) => {
                if (typeof value !== "string") return;
                const llmProvider = normalizeLlmProvider(value);
                setConnectionStatus(null);
                setForm((f) => ({
                  ...f,
                  llmProvider,
                  llmBaseUrl: llmProvider === "lmstudio" ? LMSTUDIO_BASE_URL : f.llmBaseUrl,
                }));
              }}
            >
              <SelectTrigger
                aria-label="LLM provider"
                className="h-8 w-full flex-1 bg-bb-paper px-2.5 text-[13px] text-bb-ink hover:bg-bb-surface-2 dark:bg-bb-paper dark:hover:bg-bb-surface-2"
              >
                <SelectValue>
                  {(value: string | null) => LLM_PROVIDERS.find((p) => p.value === value)?.label ?? "Provider"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LLM_PROVIDERS.map((provider) => (
                  <SelectItem
                    key={provider.value}
                    value={provider.value}
                    disabled={!provider.enabled}
                    className="text-[13px]"
                  >
                    {provider.label}
                    {!provider.enabled && (
                      <span className="rounded-bb-chip bg-bb-surface-2 px-1.5 py-px font-mono text-[9px] tracking-[0.08em] text-bb-muted uppercase">
                        soon
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              value={form.llmModel}
              onChange={(e) => setForm((f) => ({ ...f, llmModel: e.target.value }))}
              readOnly={local}
              aria-label="Model"
              placeholder={local ? "Detected from LM Studio on connect" : "Model"}
              className={`h-8 flex-[1.2] rounded-bb-btn border border-bb-line bg-bb-paper px-2.5 font-mono text-xs outline-none focus-visible:border-bb-burgundy ${
                local ? "cursor-default text-bb-ink-2" : "text-bb-ink"
              }`}
            />
          </div>
          <div className="mb-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="flex h-8 shrink-0 items-center rounded-bb-btn border border-bb-line bg-bb-surface px-3 text-xs font-medium text-bb-ink transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
            >
              Test connection
            </button>
            <span role="status" aria-live="polite" className="flex min-w-0 items-center gap-1.5 text-xs">
              {testingConnection ? (
                <>
                  <Loader2Icon className="size-3.5 shrink-0 animate-spin text-bb-muted" aria-hidden="true" />
                  <span className="text-bb-muted">Testing connection…</span>
                </>
              ) : connectionStatus ? (
                <>
                  {connectionStatus.kind === "success" ? (
                    <CircleCheckIcon className="size-3.5 shrink-0 text-bb-sage" aria-hidden="true" />
                  ) : (
                    <OctagonXIcon className="size-3.5 shrink-0 text-bb-danger" aria-hidden="true" />
                  )}
                  <span
                    className={`min-w-0 break-words ${
                      connectionStatus.kind === "success" ? "text-bb-sage" : "text-bb-danger"
                    }`}
                  >
                    {connectionStatus.message}
                  </span>
                </>
              ) : null}
            </span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] uppercase ${local ? "text-bb-sage" : "text-bb-sky"}`}
          >
            <span className="size-1.75 rounded-full bg-current" aria-hidden="true" />
            {local ? "Local · data never leaves this machine" : "Cloud LLM"}
          </span>
        </section>

        <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="m-0 text-sm font-semibold text-bb-ink">Jira</h3>
            <button
              type="button"
              role="switch"
              aria-checked={form.jiraEnabled}
              aria-label="Toggle Jira integration"
              onClick={() => setForm((f) => ({ ...f, jiraEnabled: !f.jiraEnabled }))}
              className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy ${form.jiraEnabled ? "bg-bb-sage" : "bg-bb-line"}`}
            >
              <span
                className={`absolute top-[3px] size-4 rounded-full bg-[var(--ny-knob)] transition-[left] ${form.jiraEnabled ? "left-[19px]" : "left-[3px]"}`}
              />
            </button>
          </div>
          <p className="m-0 mb-3 text-xs text-bb-muted">Approved tasks are automatically created in Jira.</p>
          {form.jiraEnabled ? (
            <div className="flex items-center gap-2.5">
              <span className="w-[70px] shrink-0 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Key</span>
              <input
                value={form.jiraKey}
                onChange={(e) => setForm((f) => ({ ...f, jiraKey: e.target.value }))}
                placeholder="CRM"
                className="h-8 w-[110px] rounded-bb-btn border border-bb-line bg-bb-paper px-2.5 font-mono text-xs text-bb-ink outline-none focus-visible:border-bb-burgundy"
              />
              <span className="rounded-md bg-bb-sage-soft px-2 py-0.5 font-mono text-[9.5px] font-medium tracking-[0.06em] text-bb-sage uppercase">
                Connected
              </span>
            </div>
          ) : (
            <p className="m-0 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">Disabled</p>
          )}
        </section>

        <div className="flex justify-end lg:col-span-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={patchProject.isPending}
            className="h-9 rounded-bb-btn bg-bb-burgundy px-4 text-[13px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {patchProject.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
