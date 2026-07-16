import { MeetingList } from "@/features/meetings/MeetingList";
import { UploadDropzone } from "@/features/meetings/UploadDropzone";

export default function MeetingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Meetings</h1>
      <UploadDropzone />
      <MeetingList />
    </main>
  );
}
