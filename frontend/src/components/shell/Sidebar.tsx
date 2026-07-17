"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjects } from "@/features/projects/hooks";
import { useNewProjectModal } from "@/components/modals/NewProjectModalProvider";
import { useDraftCounts } from "@/features/tasks/aggregate";

export function Sidebar() {
  const pathname = usePathname();
  const { data: projects } = useProjects();
  const draftCounts = useDraftCounts(projects);
  const { open } = useNewProjectModal();

  const isHome = pathname === "/";
  const isSettings = pathname === "/settings";
  const activeProjectId = pathname.startsWith("/projects/") ? pathname.split("/")[2] : null;

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-bb-line-soft bg-[var(--ny-rail)]">
      <Link
        href="/"
        className="flex h-16 shrink-0 items-center gap-1 border-b border-bb-line-soft px-5 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-bb-brand"
      >
        <span className="font-[family-name:var(--font-display)] text-[27px] italic tracking-[0.01em] text-bb-ink">
          nytka
        </span>
        <span className="ml-1.5 h-5 w-[9px] animate-bb-blink bg-bb-burgundy" aria-hidden="true" />
        <span className="flex-1" />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-bb-muted">AI analyst</span>
      </Link>

      <nav className="flex-1 overflow-y-auto p-3.5" aria-label="Primary">
        <Link
          href="/"
          aria-current={isHome ? "page" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy",
            isHome ? "bg-bb-burgundy text-bb-on-accent" : "text-bb-muted hover:bg-bb-surface-2",
          )}
        >
          <LayoutGrid className="size-4" aria-hidden="true" />
          <span>Overview</span>
        </Link>

        <div className="mt-4.5 flex items-center justify-between border-t border-bb-line-soft px-2 pt-3.5 pb-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-bb-muted">Projects</span>
          <button
            type="button"
            onClick={open}
            aria-label="New project"
            title="New project"
            className="flex size-5 items-center justify-center rounded-[5px] text-bb-muted transition-colors hover:bg-bb-brand-soft hover:text-bb-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {(projects ?? []).map((project) => {
            const isActive = activeProjectId === String(project.id);
            const drafts = draftCounts[project.id] ?? 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[12.5px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy",
                  isActive ? "bg-bb-brand-soft text-bb-brand" : "text-bb-ink-2 hover:bg-bb-surface-2",
                )}
              >
                <span className="size-2 shrink-0 rounded-[2px]" style={{ background: project.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {drafts > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[6px] bg-bb-amber-soft px-1.5 font-mono text-[10px] font-semibold text-bb-amber">
                    {drafts}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="shrink-0 border-t border-bb-line-soft p-3">
        <Link
          href="/settings"
          aria-current={isSettings ? "page" : undefined}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy",
            isSettings ? "bg-bb-burgundy text-bb-on-accent" : "text-bb-muted hover:bg-bb-surface-2",
          )}
        >
          <Settings className="size-4" aria-hidden="true" />
          <span>Settings</span>
        </Link>
      </div>

      <div className="flex shrink-0 flex-col gap-1 border-t border-bb-line-soft px-4.5 py-3.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-bb-ink-2">
          <span className="size-1.75 rounded-full bg-bb-sage" aria-hidden="true" />
          LM Studio · local
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-bb-muted">
          Data never leaves your machine
        </span>
      </div>
    </aside>
  );
}
