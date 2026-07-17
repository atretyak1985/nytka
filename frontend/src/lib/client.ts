import type { components } from "./api-types";
import { API_URL, apiFetch } from "./api";

export type Meeting = components["schemas"]["MeetingOut"];
export type MeetingDetail = components["schemas"]["MeetingDetailOut"];
export type Segment = components["schemas"]["SegmentOut"];
export type Task = components["schemas"]["TaskOut"];
export type TaskPriority = components["schemas"]["TaskPriority"];
export type Project = components["schemas"]["ProjectOut"];
export type TeamMember = components["schemas"]["TeamMember"];
export type MeetingStatus = Meeting["status"];
export type TaskStatus = Task["status"];
export type LlmTestResult = components["schemas"]["LlmTestOut"];

export const ACTIVE_STATUSES: MeetingStatus[] = ["queued", "processing", "transcribing", "extracting"];

export const api = {
  listMeetings: (params: { project_id?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    );
    const suffix = qs.toString();
    return apiFetch<Meeting[]>(`/api/meetings${suffix ? `?${suffix}` : ""}`);
  },
  getMeeting: (id: number) => apiFetch<MeetingDetail>(`/api/meetings/${id}`),
  retryMeeting: (id: number) => apiFetch<Meeting>(`/api/meetings/${id}/retry`, { method: "POST" }),
  uploadMeeting: async (file: File, projectId: number, title?: string): Promise<Meeting> => {
    const form = new FormData();
    form.append("file", file);
    form.append("project_id", String(projectId));
    if (title) form.append("title", title);
    const res = await fetch(`${API_URL}/api/meetings`, { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<Meeting>;
  },
  listTasks: (params: { project_id?: number; status?: TaskStatus; meeting_id?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    );
    const suffix = qs.toString();
    return apiFetch<Task[]>(`/api/tasks${suffix ? `?${suffix}` : ""}`);
  },
  createTask: (payload: {
    project_id: number;
    title: string;
    description?: string;
    assignee?: string | null;
    priority?: TaskPriority;
  }) =>
    apiFetch<Task>("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  patchTask: (
    id: number,
    payload: Partial<Pick<Task, "title" | "description" | "assignee" | "priority" | "status">>,
  ) =>
    apiFetch<Task>(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteTask: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
  },
  listProjects: () => apiFetch<Project[]>("/api/projects"),
  createProject: (payload: { name: string; description?: string; color?: string }) =>
    apiFetch<Project>("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  patchProject: (
    id: number,
    payload: Omit<Partial<Project>, "id" | "created_at" | "updated_at"> & {
      llm_api_key?: string;
      llm_base_url?: string | null;
    },
  ) =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  llmTest: (id: number) => apiFetch<LlmTestResult>(`/api/projects/${id}/llm-test`, { method: "POST" }),
};
