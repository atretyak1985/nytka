"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PROJECT_SWATCHES } from "@/lib/design-maps";
import { useCreateProject } from "@/features/projects/hooks";

interface NewProjectModalContextValue {
  open: () => void;
}

const NewProjectModalContext = createContext<NewProjectModalContextValue | null>(null);

/** Opens the global "New Project" modal from anywhere in the app shell. */
export function useNewProjectModal(): NewProjectModalContextValue {
  const ctx = useContext(NewProjectModalContext);
  if (!ctx) throw new Error("useNewProjectModal must be used within NewProjectModalProvider");
  return ctx;
}

export function NewProjectModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_SWATCHES[0]);
  const createProject = useCreateProject();

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setName("");
    setDescription("");
    setColor(PROJECT_SWATCHES[0]);
  }, []);

  const handleCreate = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createProject.mutate(
      { name: trimmed, description: description.trim(), color },
      {
        onSuccess: (project) => {
          toast.success("Project created — add AI context to get started");
          close();
          router.push(`/projects/${project.id}?tab=settings`);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }, [name, description, color, createProject, close, router]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <NewProjectModalContext.Provider value={value}>
      {children}
      <Dialog
        open={isOpen}
        onOpenChange={(next) => {
          if (!next) close();
          else setIsOpen(true);
        }}
      >
        <DialogContent className="w-[480px] max-w-[calc(100vw-3rem)] rounded-[12px] border border-bb-line bg-bb-surface p-7 sm:max-w-none">
          <DialogHeader className="gap-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-bb-brand">New project</p>
            <DialogTitle className="font-[family-name:var(--font-display)] text-[30px] leading-tight text-bb-ink">
              Create project
            </DialogTitle>
            <DialogDescription className="sr-only">
              Create a new project to group meetings and AI-drafted tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3.5">
            <div>
              <label htmlFor="np-name" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-bb-muted">
                Name
              </label>
              <Input
                id="np-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mobile app"
                className="h-[38px] rounded-[var(--radius-btn)] border-bb-line bg-bb-paper text-sm text-bb-ink"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
              />
            </div>
            <div>
              <label htmlFor="np-desc" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.08em] text-bb-muted">
                Description
              </label>
              <Textarea
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Briefly: what product, what team"
                className="rounded-[var(--radius-btn)] border-bb-line bg-bb-paper text-[13px] text-bb-ink"
              />
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.08em] text-bb-muted">Color</p>
              <div className="flex gap-2.5" role="radiogroup" aria-label="Project color">
                {PROJECT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    role="radio"
                    aria-checked={color === swatch}
                    aria-label={`Color ${swatch}`}
                    onClick={() => setColor(swatch)}
                    className={cn(
                      "size-[26px] shrink-0 rounded-full transition-shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy",
                      color === swatch && "ring-2 ring-offset-2 ring-offset-bb-surface",
                    )}
                    style={{ background: swatch, ...(color === swatch ? { boxShadow: `0 0 0 2px var(--bb-surface), 0 0 0 4px ${swatch}` } : {}) }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mx-0 mt-6 mb-0 flex-row justify-end gap-2.5 rounded-none border-t-0 bg-transparent p-0">
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-[var(--radius-btn)] px-4 text-[13px] font-medium text-bb-ink-2 hover:bg-bb-surface-2"
              onClick={close}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!name.trim() || createProject.isPending}
              onClick={handleCreate}
              className="h-9 rounded-[var(--radius-btn)] bg-bb-burgundy px-4 text-[13px] font-semibold text-bb-on-accent hover:bg-bb-wine"
            >
              Create
            </Button>
          </DialogFooter>
          <p className="mt-4 text-[11.5px] leading-relaxed text-bb-muted">
            After creating, add AI context, a glossary and a task template — this improves the quality of extracted tasks.
          </p>
        </DialogContent>
      </Dialog>
    </NewProjectModalContext.Provider>
  );
}
