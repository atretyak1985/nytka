import type { MeetingStatus, TaskPriority, TaskStatus } from "./client";

/** Visual treatment for a status/priority chip: label + Tailwind classes. */
export interface ChipStyle {
  label: string;
  className: string;
}

/** Meeting status → English label + chip classes (bg/text/border), ported from the design's `MS` map. */
export const MEETING_STATUS: Record<MeetingStatus, ChipStyle> = {
  queued: { label: "Queued", className: "bg-transparent text-bb-muted border border-bb-line" },
  processing: { label: "Processing audio", className: "bg-bb-amber-soft text-bb-amber border border-transparent" },
  transcribing: { label: "Transcribing", className: "bg-bb-amber-soft text-bb-amber border border-transparent" },
  extracting: { label: "Extracting tasks", className: "bg-bb-violet-soft text-bb-violet border border-transparent" },
  done: { label: "Done", className: "bg-bb-sage-soft text-bb-sage border border-transparent" },
  error: { label: "Error", className: "bg-bb-danger-soft text-bb-danger border border-transparent" },
};

/** Task status → English label + chip classes, ported from the design's `TS` map. */
export const TASK_STATUS: Record<TaskStatus, ChipStyle> = {
  draft: { label: "Draft", className: "bg-bb-amber-soft text-bb-amber border border-transparent" },
  approved: { label: "Approved", className: "bg-bb-sage-soft text-bb-sage border border-transparent" },
  done: { label: "Done", className: "bg-bb-surface-2 text-bb-ink-2 border border-transparent" },
  rejected: { label: "Rejected", className: "bg-transparent text-bb-muted border border-bb-line" },
};

/** Priority → English label + text color class, ported from the design's `PR` map. */
export const TASK_PRIORITY: Record<TaskPriority, { label: string; className: string }> = {
  high: { label: "High", className: "text-bb-danger" },
  medium: { label: "Medium", className: "text-bb-amber" },
  low: { label: "Low", className: "text-bb-muted" },
};

/** Fixed speaker-name palette (design's `SPC` map used literal names; we hash instead). */
const SPEAKER_PALETTE = [
  "text-bb-brand",
  "text-bb-sky",
  "text-bb-violet",
  "text-bb-sage",
  "text-bb-rose-deep",
  "text-bb-amber",
];

/** Deterministically map a speaker name to a color class from the palette. */
export function speakerColor(name: string | null | undefined): string {
  if (!name) return "text-bb-ink-2";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return SPEAKER_PALETTE[hash % SPEAKER_PALETTE.length];
}

/** Format seconds as m:ss (e.g. 93 -> "1:33"), matching the design's transcript timestamps. */
export function formatTimestamp(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = String(s % 60).padStart(2, "0");
  return `${m}:${rem}`;
}

/** Format a duration in seconds as "58 min" style meta text. */
export function formatDurationMinutes(totalSeconds: number | null): string {
  if (totalSeconds === null) return "…";
  const mins = Math.round(totalSeconds / 60);
  return `${mins} min`;
}

/** Derive a 2-letter monogram from a project/person name, e.g. "Bloom CRM" -> "BC". */
export function monogram(name: string): string {
  return name
    .split(/[\s—-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Relative "updated" label: today / yesterday / short date. */
export function relativeDay(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export const PROJECT_SWATCHES = ["#7a0d38", "#a8254e", "#5c7b5c", "#2f6b8e", "#5a4fcf"] as const;

export const LLM_PROVIDERS = ["LM Studio", "Ollama", "Anthropic", "OpenAI"] as const;

/** True when the provider keeps all data on-device (drives the sage/sky locality chip). */
export function isLocalProvider(provider: string): boolean {
  return provider === "LM Studio" || provider === "Ollama" || provider.toLowerCase() === "lmstudio" || provider.toLowerCase() === "ollama";
}
