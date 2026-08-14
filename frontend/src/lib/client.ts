import type { components } from "./api-types";
import { API_URL, apiFetch } from "./api";

export type Meeting = components["schemas"]["MeetingOut"];
export type MeetingDetail = components["schemas"]["MeetingDetailOut"];
export type MeetingPatch = components["schemas"]["MeetingPatchIn"];
export type Segment = components["schemas"]["SegmentOut"];
export type Task = components["schemas"]["TaskOut"];
export type TaskPriority = components["schemas"]["TaskPriority"];
export type Project = components["schemas"]["ProjectOut"];
export type TeamMember = components["schemas"]["TeamMember"];
export type MeetingStatus = Meeting["status"];
export type TaskStatus = Task["status"];
export type LlmTestResult = components["schemas"]["LlmTestOut"];
export type LlmConnectResult = components["schemas"]["LlmConnectOut"];
export type AppSettings = components["schemas"]["AppSettingsOut"];
export type JiraTestResult = components["schemas"]["JiraTestOut"];
export type JiraPreview = components["schemas"]["JiraPreviewOut"];
export type JiraUsers = components["schemas"]["JiraUsersOut"];
export type KnowledgeState = components["schemas"]["KnowledgeStateOut"];
export type KnowledgeFile = components["schemas"]["KnowledgeFileOut"];
export type KnowledgeStatus = components["schemas"]["KnowledgeStatus"];
export type TaskScreenshot = components["schemas"]["TaskScreenshotOut"];
export type MeetingBrief = components["schemas"]["MeetingBriefOut"];
export type BriefPoint = components["schemas"]["BriefPointOut"];
export type BriefStatus = components["schemas"]["BriefStatus"];
export type SearchResult = components["schemas"]["SearchOut"];
export type SearchHit = components["schemas"]["SearchHitOut"];
export type AskAnswer = components["schemas"]["AskOut"];
export type AskCitation = components["schemas"]["AskCitationOut"];

export const ACTIVE_STATUSES: MeetingStatus[] = ["queued", "processing", "transcribing", "extracting", "summarizing"];

export const api = {
  listMeetings: (params: { project_id?: number } = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
    );
    const suffix = qs.toString();
    return apiFetch<Meeting[]>(`/api/meetings${suffix ? `?${suffix}` : ""}`);
  },
  getMeeting: (id: number) => apiFetch<MeetingDetail>(`/api/meetings/${id}`),
  patchMeeting: (id: number, payload: MeetingPatch) =>
    apiFetch<MeetingDetail>(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  retryMeeting: (id: number) => apiFetch<Meeting>(`/api/meetings/${id}/retry`, { method: "POST" }),
  reextractMeeting: (id: number) => apiFetch<Meeting>(`/api/meetings/${id}/reextract`, { method: "POST" }),
  getMeetingBrief: (id: number) => apiFetch<MeetingBrief>(`/api/meetings/${id}/brief`),
  regenerateMeetingBrief: (id: number) =>
    apiFetch<MeetingBrief>(`/api/meetings/${id}/brief/regenerate`, { method: "POST" }),
  meetingBriefMarkdownUrl: (id: number) => `${API_URL}/api/meetings/${id}/brief/markdown`,
  deleteMeeting: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/meetings/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
  },
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
    payload: Partial<Pick<Task, "title" | "description" | "area" | "labels" | "assignee" | "priority" | "status">> & {
      push_to_jira?: boolean;
    },
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
      jira_api_token?: string;
    },
  ) =>
    apiFetch<Project>(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  llmTest: (id: number) => apiFetch<LlmTestResult>(`/api/projects/${id}/llm-test`, { method: "POST" }),
  llmConnect: (id: number) =>
    apiFetch<LlmConnectResult>(`/api/projects/${id}/llm-connect`, { method: "POST" }),
  jiraTest: (id: number) => apiFetch<JiraTestResult>(`/api/projects/${id}/jira-test`, { method: "POST" }),
  listJiraUsers: (id: number) => apiFetch<JiraUsers>(`/api/projects/${id}/jira-users`),
  getSettings: () => apiFetch<AppSettings>("/api/settings"),
  patchSettings: (payload: { extraction_prompt?: string }) =>
    apiFetch<AppSettings>("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getJiraPreview: (taskId: number) => apiFetch<JiraPreview>(`/api/tasks/${taskId}/jira-preview`),
  jiraPush: (taskId: number) => apiFetch<Task>(`/api/tasks/${taskId}/jira-push`, { method: "POST" }),
  mergeTask: (id: number, targetTaskId: number) =>
    apiFetch<Task>(`/api/tasks/${id}/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_task_id: targetTaskId }),
    }),
  listTaskScreenshots: (taskId: number) =>
    apiFetch<TaskScreenshot[]>(`/api/tasks/${taskId}/screenshots`),
  deleteTaskScreenshot: async (taskId: number, screenshotId: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/tasks/${taskId}/screenshots/${screenshotId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(await res.text());
  },
  getKnowledge: (projectId: number) =>
    apiFetch<KnowledgeState>(`/api/projects/${projectId}/knowledge`),
  uploadKnowledgeFile: async (projectId: number, file: File): Promise<KnowledgeFile> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_URL}/api/projects/${projectId}/knowledge`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<KnowledgeFile>;
  },
  deleteKnowledgeFile: async (projectId: number, fileId: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/projects/${projectId}/knowledge/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(await res.text());
  },
  initKnowledge: (projectId: number) =>
    apiFetch<KnowledgeState>(`/api/projects/${projectId}/knowledge/init`, { method: "POST" }),
  searchProject: (projectId: number, q: string, limit = 30) =>
    apiFetch<SearchResult>(
      `/api/projects/${projectId}/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    ),
  askProject: (projectId: number, question: string) =>
    apiFetch<AskAnswer>(`/api/projects/${projectId}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),
};
