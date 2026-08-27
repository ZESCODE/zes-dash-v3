/* Central API access — everything is a relative URL so the same build
   works behind the Node server (:7070) and the Vite dev proxy. */

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
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
