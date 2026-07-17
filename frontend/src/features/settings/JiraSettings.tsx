"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CircleCheckIcon, Loader2Icon, OctagonXIcon } from "lucide-react";
import type { AppSettings } from "@/lib/client";
import { useJiraTest, usePatchAppSettings } from "@/features/settings/appSettingsHooks";

interface JiraForm {
  baseUrl: string;
  email: string;
  token: string; // write-only: empty means "keep the stored token"
}

const inputClass =
  "h-8 w-full rounded-bb-btn border border-bb-line bg-bb-paper px-2.5 font-mono text-xs text-bb-ink outline-none focus-visible:border-bb-burgundy";

export function JiraSettings({ settings }: { settings: AppSettings }) {
  const patch = usePatchAppSettings();
  const jiraTest = useJiraTest();
  const [form, setForm] = useState<JiraForm>({
    baseUrl: settings.jira_base_url,
    email: settings.jira_email,
    token: "",
  });
  const [status, setStatus] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const payload = () => ({
    jira_base_url: form.baseUrl,
    jira_email: form.email,
    // Omit the token unless the user typed a new one, so PATCH keeps the stored value.
    ...(form.token ? { jira_api_token: form.token } : {}),
  });

  const handleSave = () =>
    patch.mutate(payload(), {
      onSuccess: () => {
        setForm((f) => ({ ...f, token: "" }));
        toast.success("Jira settings saved");
      },
      onError: (e) => toast.error(e.message),
    });

  const handleTest = async () => {
    setStatus(null);
    try {
      // jira-test probes the STORED config, so persist the form first (llm-connect pattern).
      await patch.mutateAsync(payload());
      const result = await jiraTest.mutateAsync();
      setStatus(
        result.ok
          ? { kind: "success", message: `Connected · ${result.account_name}` }
          : { kind: "error", message: result.error ?? "Connection failed" },
      );
      if (result.ok) setForm((f) => ({ ...f, token: "" }));
    } catch (e) {
      setStatus({ kind: "error", message: e instanceof Error ? e.message : "Connection failed" });
    }
  };

  const testing = jiraTest.isPending || patch.isPending;

  return (
    <section className="mt-4 rounded-bb-frame border border-bb-line bg-bb-surface p-5">
      <h3 className="m-0 mb-1 text-sm font-semibold text-bb-ink">Jira</h3>
      <p className="m-0 mb-3 max-w-[640px] text-xs text-bb-muted">
        One connection for the whole app — each project picks its own Jira project key in its Settings tab.
        Create an API token at{" "}
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noreferrer"
          className="text-bb-burgundy underline"
        >
          id.atlassian.com
        </a>
        .
      </p>
      <div className="flex max-w-[640px] flex-col gap-2.5">
        {(
          [
            { key: "baseUrl", label: "Base URL", placeholder: "https://your-team.atlassian.net", type: "text" },
            { key: "email", label: "Email", placeholder: "you@company.com", type: "text" },
            {
              key: "token",
              label: "API token",
              placeholder: settings.jira_token_set ? `••••••••${settings.jira_token_hint} (saved)` : "Paste API token",
              type: "password",
            },
          ] as const
        ).map((field) => (
          <div key={field.key} className="flex items-center gap-2.5">
            <span className="w-[80px] shrink-0 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">
              {field.label}
            </span>
            <input
              type={field.type}
              value={form[field.key]}
              onChange={(e) => {
                setStatus(null);
                setForm((f) => ({ ...f, [field.key]: e.target.value }));
              }}
              placeholder={field.placeholder}
              aria-label={`Jira ${field.label}`}
              className={inputClass}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={patch.isPending}
          className="h-8 rounded-bb-btn bg-bb-burgundy px-3.5 text-xs font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing}
          className="flex h-8 shrink-0 items-center rounded-bb-btn border border-bb-line bg-bb-surface px-3 text-xs font-medium text-bb-ink transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
        >
          Test connection
        </button>
        <span role="status" aria-live="polite" className="flex min-w-0 items-center gap-1.5 text-xs">
          {testing ? (
            <>
              <Loader2Icon className="size-3.5 shrink-0 animate-spin text-bb-muted" aria-hidden="true" />
              <span className="text-bb-muted">Testing connection…</span>
            </>
          ) : status ? (
            <>
              {status.kind === "success" ? (
                <CircleCheckIcon className="size-3.5 shrink-0 text-bb-sage" aria-hidden="true" />
              ) : (
                <OctagonXIcon className="size-3.5 shrink-0 text-bb-danger" aria-hidden="true" />
              )}
              <span className={`min-w-0 break-words ${status.kind === "success" ? "text-bb-sage" : "text-bb-danger"}`}>
                {status.message}
              </span>
            </>
          ) : null}
        </span>
      </div>
    </section>
  );
}
