"use client";

import { use, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useProject } from "@/features/projects/hooks";
import { useMeetings, useUploadMeeting } from "@/features/meetings/hooks";
import { useTasks } from "@/features/tasks/hooks";
import { monogram, isLocalProvider } from "@/lib/design-maps";
import { UploadDropzone } from "@/features/meetings/UploadDropzone";
import { MeetingList } from "@/features/meetings/MeetingList";
import { TasksTab } from "@/features/tasks/TasksTab";
import { MemoryTab } from "@/features/memory/MemoryTab";
import { SettingsTab } from "@/features/settings/SettingsTab";

type TabKey = "meetings" | "tasks" | "memory" | "settings";
const TAB_KEYS: TabKey[] = ["meetings", "tasks", "memory", "settings"];

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projectId = Number(id);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const rawTab = searchParams.get("tab");
  const tab: TabKey = TAB_KEYS.includes(rawTab as TabKey) ? (rawTab as TabKey) : "meetings";

  const { data: project, isLoading } = useProject(projectId);
  const { data: meetings } = useMeetings(projectId);
  const { data: tasks } = useTasks({ projectId });
  const upload = useUploadMeeting();

  const draftCount = (tasks ?? []).filter((t) => t.status === "draft").length;

  const setTab = useCallback(
    (next: TabKey) => {
      const qs = new URLSearchParams(searchParams);
      qs.set("tab", next);
      router.replace(`/projects/${projectId}?${qs.toString()}`, { scroll: false });
    },
    [projectId, router, searchParams],
  );

  const handleUploadClick = () => inputRef.current?.click();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1180px] px-8 pt-7 pb-12">
        <div className="h-12 w-64 animate-pulse rounded bg-bb-surface-2" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-[1180px] px-8 pt-10 text-center">
        <p className="text-sm text-bb-muted">Project not found.</p>
      </div>
    );
  }

  const local = isLocalProvider(project.llm_provider);
  const metaLine = `${project.task_prefix || "no prefix"} · Jira ${project.jira_enabled ? "on" : "off"} · ${project.llm_model}`;

  return (
    <div className="mx-auto max-w-[1180px] animate-bb-up px-8 pt-7 pb-12">
      <div className="mb-4.5 flex items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-[9px] font-mono text-[15px] font-semibold"
            style={{ background: `${project.color}1e`, color: project.color }}
            aria-hidden="true"
          >
            {monogram(project.name)}
          </span>
          <div className="min-w-0">
            <h1 className="m-0 mb-0.5 truncate font-[family-name:var(--font-display)] text-[32px] leading-tight text-bb-ink">
              {project.name}
            </h1>
            <p className="m-0 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">
              {metaLine}
              {local ? "" : " · cloud"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={upload.isPending}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-bb-btn bg-bb-burgundy px-4 text-[13px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="size-4" aria-hidden="true" />
          Upload meeting
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a,.ogg"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              upload.mutate(
                { file, projectId },
                {
                  onSuccess: () => toast.success("Recording queued"),
                  onError: (err) => toast.error(err.message),
                },
              );
            }
            e.target.value = "";
          }}
        />
      </div>

      <div className="mb-5.5 flex gap-0.5 border-b border-bb-line" role="tablist" aria-label="Project sections">
        <TabButton label="Meetings" isActive={tab === "meetings"} onClick={() => setTab("meetings")} />
        <TabButton label="Tasks" isActive={tab === "tasks"} onClick={() => setTab("tasks")} badge={draftCount > 0 ? draftCount : undefined} />
        <TabButton label="Memory" isActive={tab === "memory"} onClick={() => setTab("memory")} />
        <TabButton label="Settings" isActive={tab === "settings"} onClick={() => setTab("settings")} />
      </div>

      {tab === "meetings" && (
        <div>
          <UploadDropzone projectId={projectId} />
          <MeetingList projectId={projectId} meetings={meetings ?? []} />
        </div>
      )}
      {tab === "tasks" && <TasksTab projectId={projectId} />}
      {tab === "memory" && <MemoryTab projectId={projectId} />}
      {tab === "settings" && <SettingsTab project={project} />}
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
  badge,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bb-burgundy ${
        isActive ? "border-bb-burgundy text-bb-ink" : "border-transparent text-bb-muted hover:text-bb-ink-2"
      }`}
    >
      <span>{label}</span>
      {badge !== undefined && (
        <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-md bg-bb-amber-soft px-1.5 text-[10px] font-semibold text-bb-amber">
          {badge}
        </span>
      )}
    </button>
  );
}
