/* Central API access — everything is a relative URL so the same build
   works behind the Node server (:7070) and the Vite dev proxy. */

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}

export async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return data;
}

export const api = {
  overview: () => getJson<import("./types").OverviewData | import("./types").Unreachable>("/api/overview"),
  agents: () => getJson<{ agents: import("./types").FleetAgent[] } | import("./types").Unreachable>("/api/agents"),
  flow: () => getJson<import("./types").FlowData | import("./types").Unreachable>("/api/flow"),
  events: (limit = 200) => getJson<{ events: import("./types").BusEvent[] } | import("./types").Unreachable>(`/api/events?limit=${limit}`),
  activity: () => getJson<{ events: import("./types").BusEvent[] } | import("./types").Unreachable>("/api/activity"),
  tasks: () => getJson<{ tasks: import("./types").Task[] } | import("./types").Unreachable>("/api/tasks"),
  fleet: () => getJson<Record<string, unknown>>("/api/fleet"),
  health: () => getJson<Record<string, unknown>>("/api/health"),
  infra: () => getJson<Record<string, unknown>>("/api/infra"),
  memory: () => getJson<Record<string, unknown>>("/api/memory"),
  settings: () => getJson<Record<string, unknown>>("/api/settings"),
};

/* AutoBlog control API (proxied through the dashboard server). */
export const autoblogApi = {
  all: () => getJson<unknown>("/api/autoblog"),
  stats: () => getJson<unknown>("/api/autoblog/stats"),
  posts: () => getJson<unknown>("/api/autoblog/posts"),
  settings: () => getJson<unknown>("/api/autoblog/settings"),
  runs: () => getJson<unknown>("/api/autoblog/runs"),
  currentRun: () => getJson<unknown>("/api/autoblog/runs/current"),
  getPost: (id: string) => getJson<unknown>(`/api/autoblog/post?id=${encodeURIComponent(id)}`),
  run: (body?: unknown) => postJson<unknown>("/api/autoblog/run", body),
  backfill: () => postJson<unknown>("/api/autoblog/backfill"),
  saveSettings: (body: unknown) => postJson<unknown>("/api/autoblog/settings", body),
  updatePost: (body: unknown) => postJson<unknown>("/api/autoblog/post/update", body),
  deletePost: (id: string) => postJson<unknown>("/api/autoblog/post/delete", { id }),
  facebookTest: () => postJson<unknown>("/api/autoblog/facebook/test", {}),
  postToFacebook: (id: string) => postJson<unknown>("/api/autoblog/post/facebook", { id }),
};
