"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isLocalProvider } from "@/lib/design-maps";
import { useProjects } from "@/features/projects/hooks";
import { useMeeting } from "@/features/meetings/hooks";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar() {
  const pathname = usePathname();
  const { data: projects } = useProjects();

  const segments = pathname.split("/").filter(Boolean);
  const projectId = segments[0] === "projects" && segments[1] ? Number(segments[1]) : null;
  const meetingId =
    segments[0] === "projects" && segments[2] === "meetings" && segments[3] ? Number(segments[3]) : null;

  const project = projectId !== null ? projects?.find((p) => p.id === projectId) : undefined;
  const { data: meeting } = useMeeting(meetingId ?? -1);

  const isHome = pathname === "/";
  const local = project ? isLocalProvider(project.llm_provider) : true;

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-bb-line-soft bg-[var(--ny-topbar)] px-7 backdrop-blur-sm">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-[13px]">
        <Link
          href="/"
          className={cn(
            "rounded px-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy",
            isHome ? "text-bb-ink" : "text-bb-muted hover:text-bb-ink",
          )}
        >
          Projects
        </Link>
        {project && (
          <>
            <span className="text-bb-muted" aria-hidden="true">/</span>
            <Link
              href={`/projects/${project.id}`}
              className={cn(
                "max-w-[260px] truncate rounded px-0.5 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-bb-burgundy",
                meetingId ? "text-bb-muted hover:text-bb-ink" : "text-bb-ink",
              )}
            >
              {project.name}
            </Link>
          </>
        )}
        {meeting && (
          <>
            <span className="text-bb-muted" aria-hidden="true">/</span>
            <span className="max-w-[300px] truncate font-medium text-bb-ink">{meeting.title}</span>
          </>
        )}
      </nav>

      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
            local ? "bg-bb-sage-soft text-bb-sage" : "bg-bb-sky-soft text-bb-sky",
          )}
        >
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          {local ? "All data local" : `Cloud LLM · ${project?.llm_provider ?? ""}`}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
