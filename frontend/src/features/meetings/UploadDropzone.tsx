"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useUploadMeeting } from "./hooks";
import { cn } from "@/lib/utils";

const ACCEPT = ".mp4,.mov,.mkv,.webm,.mp3,.wav,.m4a,.ogg";

export function UploadDropzone() {
  const upload = useUploadMeeting();
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      upload.mutate(
        { file },
        {
          onError: (e) => toast.error(`Upload failed: ${e.message}`),
          onSuccess: (m) => toast.success(`"${m.title}" queued for processing`),
        },
      );
    },
    [upload],
  );

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      className={cn(
        "block cursor-pointer rounded-lg border-2 border-dashed p-10 text-center text-sm text-muted-foreground",
        dragOver && "border-primary bg-muted",
      )}
    >
      {upload.isPending ? "Uploading…" : "Drop a meeting video/audio here or click to choose a file"}
      <input type="file" accept={ACCEPT} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </label>
  );
}
