import { LlmSettingsForm } from "@/features/settings/LlmSettingsForm";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <p className="text-sm text-muted-foreground">
        LLM used for task extraction. Default is LM Studio on localhost — start it, or switch provider here.
      </p>
      <LlmSettingsForm />
    </main>
  );
}
