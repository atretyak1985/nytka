"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { useUploadMeeting } from "@/features/meetings/hooks";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm", ".mp3", ".wav", ".m4a", ".ogg"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function UploadDropzone({ projectId }: { projectId: number }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadMeeting();

  const handleFile = useCallback(
    (file: File) => {
      if (!isAcceptedFile(file)) {
        toast.error("Unsupported file type. Use MP4, MOV, MKV, WEBM, MP3, WAV, M4A or OGG.");
        return;
      }
      upload.mutate(
        { file, projectId },
        {
          onSuccess: () => toast.success("Recording queued"),
          onError: (e) => toast.error(e.message),
        },
      );
    },
    [projectId, upload],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload a meeting recording"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={cn(
        "mb-5 flex cursor-pointer flex-col items-center gap-2.5 rounded-bb-frame border-[1.5px] border-dashed border-bb-line bg-bb-surface p-6.5 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bb-burgundy",
        isDragOver && "border-bb-burgundy",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-bb-brand-soft text-bb-brand" aria-hidden="true">
        <Upload className="size-[19px]" />
      </span>
      <p className="m-0 text-sm font-medium text-bb-ink">
        {upload.isPending ? "Uploading…" : "Drop a meeting recording here"}
      </p>
      <p className="m-0 font-mono text-[10px] tracking-[0.1em] text-bb-muted uppercase">
        MP4 · MOV · MKV · WEBM · MP3 · WAV · M4A · OGG
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          inputRef.current?.click();
        }}
        disabled={upload.isPending}
        className="flex h-[30px] items-center rounded-bb-btn border border-bb-line bg-bb-surface px-3 text-xs font-medium text-bb-ink transition-colors hover:bg-bb-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
