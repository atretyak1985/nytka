function defaultApiUrl(): string {
  // In the browser, target the same host the app was opened from (works for
  // localhost and LAN access alike); the backend listens on port 8000.
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl();

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}
