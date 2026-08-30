import { useCallback, useRef, useState } from "react";

export interface ActionToast {
  msg: string;
  kind: "ok" | "err";
  id: number;
}

/**
 * PortPal actions — kill / restart / rescan against /api/portpal/*.
 * Tracks per-pid busy state and surfaces a lightweight toast.
 */
export function usePortpalActions(onDone?: () => void) {
  const [killing, setKilling] = useState<Set<number>>(new Set());
  const [restarting, setRestarting] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<ActionToast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, kind, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const mark = (setter: typeof setKilling, pid: number, on: boolean) =>
    setter((prev) => {
      const next = new Set(prev);
      if (on) next.add(pid); else next.delete(pid);
      return next;
    });

  const kill = useCallback(
    async (pid: number, label = "") => {
      mark(setKilling, pid, true);
      try {
        const res = await fetch("/api/portpal/kill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pid }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (json.ok) showToast(`Killed ${label || `PID ${pid}`}`, "ok");
        else showToast(json.error ?? `Failed to kill PID ${pid}`, "err");
      } catch {
        showToast(`Failed to kill PID ${pid}`, "err");
      } finally {
        mark(setKilling, pid, false);
        onDone?.();
      }
    },
    [onDone, showToast],
  );

  const restart = useCallback(
    async (pid: number, label = "") => {
      mark(setRestarting, pid, true);
      try {
        const res = await fetch("/api/portpal/restart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pid }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string; cmd?: string };
        if (json.ok) showToast(`Restarting ${label || `PID ${pid}`}…`, "ok");
        else showToast(json.error ?? `Failed to restart PID ${pid}`, "err");
      } catch {
        showToast(`Failed to restart PID ${pid}`, "err");
      } finally {
        mark(setRestarting, pid, false);
        onDone?.();
      }
    },
    [onDone, showToast],
  );

  const rescan = useCallback(async () => {
    try {
      await fetch("/api/portpal/rescan", { method: "POST" });
      showToast("Rescan complete", "ok");
    } catch {
      showToast("Rescan failed", "err");
    }
    onDone?.();
  }, [onDone, showToast]);

  return { killing, restarting, toast, showToast, kill, restart, rescan };
}
