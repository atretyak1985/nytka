"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppSettings, usePatchAppSettings } from "@/features/settings/appSettingsHooks";
import { JiraSettings } from "@/features/settings/JiraSettings";

export default function GlobalSettingsPage() {
  const { data: settings, isLoading } = useAppSettings();
  const patch = usePatchAppSettings();

  const [prompt, setPrompt] = useState("");
  // Sync local state when the fetched settings first arrive / change (adjust-during-render).
  const [synced, setSynced] = useState<string | null>(null);
  if (settings && settings.extraction_prompt !== synced) {
    setSynced(settings.extraction_prompt);
    setPrompt(settings.extraction_prompt);
  }

  const save = (value: string) =>
    patch.mutate(
      { extraction_prompt: value },
      {
        onSuccess: (next) => {
          setPrompt(next.extraction_prompt);
          setSynced(next.extraction_prompt);
          toast.success("Settings saved");
        },
        onError: (e) => toast.error(e.message),
      },
    );

  return (
    <div className="mx-auto max-w-[900px] animate-bb-up px-8 pt-7 pb-12">
      <div className="mb-6">
        <p className="m-0 mb-2 font-mono text-[10px] tracking-[0.16em] text-bb-muted uppercase">General</p>
        <h1 className="m-0 font-[family-name:var(--font-display)] text-[42px] leading-none tracking-[0.005em] text-bb-ink">
          Settings
        </h1>
      </div>

      <section className="rounded-bb-frame border border-bb-line bg-bb-surface p-5">
        <h3 className="m-0 mb-1 text-sm font-semibold text-bb-ink">Base extraction prompt</h3>
        <p className="m-0 mb-3 max-w-[640px] text-xs text-bb-muted">
          The general prompt used to extract tasks from every transcript. Each project&rsquo;s{" "}
          <span className="text-bb-ink-2">AI context</span> (in its Settings tab) is layered on top at{" "}
          <span className="text-bb-ink-2">higher priority</span> and can narrow or redefine what counts as a task.
          Leaving this empty and saving restores the built-in default.
        </p>
        {isLoading ? (
          <div className="h-[360px] animate-pulse rounded-bb-btn bg-bb-surface-2" />
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={18}
            spellCheck={false}
            aria-label="Base extraction prompt"
            className="w-full resize-y rounded-bb-btn border border-bb-line bg-bb-paper px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-bb-ink outline-none focus-visible:border-bb-burgundy"
          />
        )}
        <div className="mt-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => save(prompt)}
            disabled={patch.isPending}
            className="h-9 rounded-bb-btn bg-bb-burgundy px-4 text-[13px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
          >
            {patch.isPending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => save("")}
            disabled={patch.isPending}
            className="h-9 rounded-bb-btn px-3 text-[13px] font-medium text-bb-ink-2 transition-colors hover:bg-bb-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy disabled:opacity-50"
          >
            Reset to default
          </button>
        </div>
      </section>

      {settings && <JiraSettings key={`${settings.jira_base_url}|${settings.jira_email}`} settings={settings} />}
    </div>
  );
}
