"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useQueries } from "@tanstack/react-query";
import { useProjects } from "@/features/projects/hooks";
import { useNewProjectModal } from "@/components/modals/NewProjectModalProvider";
import { api } from "@/lib/client";
import { monogram, relativeDay } from "@/lib/design-maps";

const TODAY_LINE = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export default function OverviewPage() {
  const { data: projects, isLoading } = useProjects();
  const { open } = useNewProjectModal();

  const projectIds = projects?.map((p) => p.id) ?? [];
  const meetingQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ["meetings", { project_id: id }],
      queryFn: () => api.listMeetings({ project_id: id }),
      enabled: !!projects,
    })),
  });
  const taskQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: ["tasks", { project_id: id, status: "all", meeting_id: "all" }],
      queryFn: () => api.listTasks({ project_id: id }),
      enabled: !!projects,
    })),
  });

  const dataReady = !isLoading && meetingQueries.every((q) => q.isSuccess) && taskQueries.every((q) => q.isSuccess);

  const meetingsByProject = new Map(projectIds.map((id, i) => [id, meetingQueries[i]?.data ?? []]));
  const tasksByProject = new Map(projectIds.map((id, i) => [id, taskQueries[i]?.data ?? []]));

  const totalMeetings = [...meetingsByProject.values()].reduce((sum, ms) => sum + ms.filter((m) => m.status === "done").length, 0);
  const totalTasks = [...tasksByProject.values()].reduce((sum, ts) => sum + ts.length, 0);
  const totalApproved = [...tasksByProject.values()].reduce(
    (sum, ts) => sum + ts.filter((t) => t.status === "approved" || t.status === "done").length,
    0,
  );
  const totalDrafts = [...tasksByProject.values()].reduce((sum, ts) => sum + ts.filter((t) => t.status === "draft").length, 0);
  const draftProjectCount = [...tasksByProject.values()].filter((ts) => ts.some((t) => t.status === "draft")).length;

  return (
    <div className="mx-auto max-w-[1180px] animate-bb-up px-8 pt-7 pb-12">
      <div className="mb-6 flex items-end justify-between gap-5">
        <div>
          <p className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-bb-muted uppercase">
            {TODAY_LINE}
            {projects && projects.length > 0 && (
              <> · {projects.length} project{projects.length === 1 ? "" : "s"}{totalDrafts > 0 ? ` · ${totalDrafts} to review` : ""}</>
            )}
          </p>
          <h1 className="m-0 font-[family-name:var(--font-display)] text-[42px] leading-none tracking-[0.005em] text-bb-ink">
            Your <span className="text-bb-brand italic">Projects</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={open}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-bb-btn bg-bb-burgundy px-4 text-[13px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy"
        >
          <Plus className="size-4" aria-hidden="true" />
          New Project
        </button>
      </div>

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Meetings processed" value={dataReady ? totalMeetings : null} hint="Across all projects" />
        <StatCard
          label="Tasks created"
          value={dataReady ? totalTasks : null}
          hint={dataReady ? `${totalApproved} approved` : undefined}
        />
        <StatCard
          label="Awaiting review"
          value={dataReady ? totalDrafts : null}
          hint={dataReady ? `in ${draftProjectCount} project${draftProjectCount === 1 ? "" : "s"}` : undefined}
          labelClassName="text-bb-amber"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[180px] animate-pulse rounded-bb-frame border border-bb-line bg-bb-surface" />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const tasks = tasksByProject.get(project.id) ?? [];
            const meetings = meetingsByProject.get(project.id) ?? [];
            const drafts = tasks.filter((t) => t.status === "draft").length;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex flex-col rounded-bb-frame border border-bb-line bg-bb-surface p-5 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-bb-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy"
              >
                <div className="mb-3.5 flex items-start justify-between gap-2.5">
                  <span
                    className="flex size-10 items-center justify-center rounded-[8px] font-mono text-[14px] font-semibold"
                    style={{ background: `${project.color}1e`, color: project.color }}
                    aria-hidden="true"
                  >
                    {monogram(project.name)}
                  </span>
                  {drafts > 0 && (
                    <span className="rounded-bb-chip bg-bb-amber-soft px-2 py-0.5 font-mono text-[10px] font-medium tracking-[0.08em] text-bb-amber uppercase">
                      {drafts} to review
                    </span>
                  )}
                </div>
                <h3 className="m-0 mb-1.5 font-[family-name:var(--font-display)] text-[23px] leading-tight text-bb-ink">
                  {project.name}
                </h3>
                <p className="m-0 mb-4 min-h-[38px] text-[12.5px] leading-relaxed text-bb-muted">
                  {project.description || "No description yet."}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-bb-line-soft pt-3">
                  <span className="font-mono text-[10px] tracking-[0.06em] text-bb-ink-2 uppercase">
                    {meetings.length} meeting{meetings.length === 1 ? "" : "s"} · {tasks.length} task{tasks.length === 1 ? "" : "s"}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.06em] text-bb-muted uppercase">
                    {relativeDay(project.updated_at)}
                  </span>
                </div>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={open}
            className="flex min-h-[180px] flex-col items-center justify-center gap-2.5 rounded-bb-frame border-[1.5px] border-dashed border-bb-line p-5 text-bb-muted transition-colors hover:border-bb-burgundy hover:text-bb-burgundy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-bb-brand-soft text-bb-brand">
              <Plus className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-medium">New Project</span>
            <span className="text-center font-mono text-[9.5px] tracking-[0.08em] uppercase">
              Instructions · glossary · task template
            </span>
          </button>
        </div>
      ) : (
        <div className="rounded-bb-frame border border-bb-line bg-bb-surface p-10 text-center">
          <p className="m-0 mb-1 text-sm font-medium text-bb-ink">No projects yet</p>
          <p className="m-0 mb-4 text-[12.5px] text-bb-muted">Create your first project to start uploading meetings.</p>
          <button
            type="button"
            onClick={open}
            className="inline-flex h-9 items-center gap-1.5 rounded-bb-btn bg-bb-burgundy px-4 text-[13px] font-semibold text-bb-on-accent transition-colors hover:bg-bb-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy"
          >
            <Plus className="size-4" aria-hidden="true" />
            New Project
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  labelClassName,
}: {
  label: string;
  value: number | null;
  hint?: string;
  labelClassName?: string;
}) {
  return (
    <div className="rounded-bb-frame border border-bb-line bg-bb-surface px-5 py-4.5">
      <p className={`m-0 mb-2.5 font-mono text-[10px] tracking-[0.1em] uppercase ${labelClassName ?? "text-bb-muted"}`}>{label}</p>
      <p className="m-0 font-[family-name:var(--font-display)] text-[34px] leading-none text-bb-ink">
        {value === null ? <span className="inline-block h-7 w-10 animate-pulse rounded bg-bb-surface-2 align-middle" /> : value}
      </p>
      {hint && <p className="m-0 mt-2 font-mono text-[10px] tracking-[0.08em] text-bb-muted uppercase">{hint}</p>}
    </div>
  );
}
