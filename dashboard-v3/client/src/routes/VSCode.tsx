import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Code2,
  Terminal,
  MessageSquare,
  FolderOpen,
  FolderTree,
  Puzzle,
  GitBranch,
  Settings as SettingsIcon,
  PlugZap,
  Maximize2,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Save,
  FileText,
  FileCode2,
  Trash2,
  Send,
  Bot,
  User,
  Copy,
  Play,
  Square,
  Search,
  MoreHorizontal,
  ExternalLink,
  Smartphone,
  Wifi,
  WifiOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Menu,
  PanelRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Bullet } from "@/components/ui/Bullet";
import { cn } from "@/utils/cn";
import { useFetch } from "@/hooks/useFetch";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PanelKey = "explorer" | "editor" | "terminal" | "chat" | "extensions" | "scm";

interface VsStatus {
  ok?: boolean;
  reachable?: boolean;
  codeServer?: { url: string; status: number | null; ok: boolean; latencyMs?: number };
  workspace?: { path: string; ok: boolean; files?: number };
  ws?: { url: string; note: string };
  fallback?: { wsAlt: string; note: string };
  error?: string;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
  size?: number;
  modified?: string;
}

interface EditorFile {
  path: string;
  content: string;
  language: string;
  dirty: boolean;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  ts: string;
}

interface TermLine {
  id: string;
  text: string;
  kind: "out" | "in" | "sys";
  ts: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function langFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx"].includes(ext)) return "typescript";
  if (["js", "jsx", "mjs"].includes(ext)) return "javascript";
  if (["py"].includes(ext)) return "python";
  if (["json"].includes(ext)) return "json";
  if (["md"].includes(ext)) return "markdown";
  if (["sh", "bash"].includes(ext)) return "bash";
  if (["css"].includes(ext)) return "css";
  if (["html"].includes(ext)) return "html";
  if (["yaml", "yml"].includes(ext)) return "yaml";
  return "plaintext";
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx", "mjs"].includes(ext)) return FileCode2;
  return FileText;
}

const MOCK_FILES: FileNode[] = [
  {
    name: "zes-os",
    path: "~/zes-os",
    type: "dir",
    children: [
      { name: "lib", path: "~/zes-os/lib", type: "dir", children: [
        { name: "llm.mjs", path: "~/zes-os/lib/llm.mjs", type: "file", size: 4300 },
        { name: "scaffold.mjs", path: "~/zes-os/lib/scaffold.mjs", type: "file", size: 2100 },
      ]},
      { name: "zeso.mjs", path: "~/zes-os/zeso.mjs", type: "file", size: 12400 },
      { name: "dashboard-v3", path: "~/zes-os/dashboard-v3", type: "dir", children: [
        { name: "client", path: "~/zes-os/dashboard-v3/client", type: "dir" },
        { name: "server", path: "~/zes-os/dashboard-v3/server", type: "dir" },
      ]},
    ],
  },
  {
    name: ".hermes",
    path: "~/.hermes",
    type: "dir",
    children: [
      { name: "roster.json", path: "~/.hermes/roster.json", type: "file" },
      { name: "tasks.json", path: "~/.hermes/tasks.json", type: "file" },
    ],
  },
];

const MOCK_TERM_LINES: TermLine[] = [
  { id: "1", text: "$ code-server --auth none --bind-addr 0.0.0.0:8181 ~/zes-os", kind: "sys", ts: new Date().toISOString() },
  { id: "2", text: "info  code-server 4.89.0", kind: "out", ts: new Date().toISOString() },
  { id: "3", text: "info  HTTP server listening on http://0.0.0.0:8181", kind: "out", ts: new Date().toISOString() },
  { id: "4", text: "info  - Authentication is disabled", kind: "out", ts: new Date().toISOString() },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function VSCode() {
  // -- layout state ---------------------------------------------------------
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>("editor");
  const [collapsed, setCollapsed] = useState<Record<PanelKey, boolean>>({
    explorer: false,
    editor: false,
    terminal: false,
    chat: false,
    extensions: true,
    scm: true,
  });

  // -- zoom/pinch -----------------------------------------------------------
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const streamRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef(0);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const el = streamRef.current;
    if (!el) return;
    let startDist = 0;
    let startScale = 1;
    const getDist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = getDist(e.touches[0], e.touches[1]);
        startScale = scaleRef.current;
      }
      // double-tap detection
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 350) {
          setScale(1);
        }
        lastTapRef.current = now;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const d = getDist(e.touches[0], e.touches[1]);
        if (startDist > 12) {
          const next = Math.min(2.2, Math.max(0.75, startScale * (d / startDist)));
          setScale(next);
        }
      }
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  // -- live status ----------------------------------------------------------
  const { data: vsStatus, refresh: refreshStatus } = useFetch<VsStatus & { error?: string }>("/api/vscode/status", 7000);
  const connectedLike = !!vsStatus && !vsStatus.error && !!vsStatus.codeServer?.ok;

  // -- websocket ------------------------------------------------------------
  const [wsUrl, setWsUrl] = useState(() => {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("zes:vscode:wsUrl") : null;
    return saved || "ws://localhost:8181";
  });
  const [wsState, setWsState] = useState<"idle" | "connecting" | "open" | "closed" | "error">("idle");
  const [wsLog, setWsLog] = useState<{ t: string; msg: string }[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const pushWsLog = useCallback((msg: string) => {
    setWsLog((prev) => [{ t: new Date().toLocaleTimeString([], { hour12: false }), msg }, ...prev].slice(0, 50));
  }, []);

  const connectWs = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* ignore */ }
    setWsState("connecting");
    pushWsLog(`connecting → ${wsUrl}`);
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      setWsState("error");
      pushWsLog(`error: ${String((e as Error).message).slice(0, 120)}`);
      return;
    }
    wsRef.current = ws;
    ws.onopen = () => { setWsState("open"); pushWsLog("ws open ✓"); };
    ws.onclose = () => { setWsState("closed"); pushWsLog("ws closed"); };
    ws.onerror = () => { setWsState("error"); pushWsLog("ws error"); };
    ws.onmessage = (ev) => {
      let txt = String(ev.data).slice(0, 600);
      pushWsLog(`← ${txt}`);
    };
  }, [wsUrl, pushWsLog]);

  const disconnectWs = useCallback(() => {
    try { wsRef.current?.close(); } catch { /* ignore */ }
    setWsState("closed");
  }, []);

  const sendWs = useCallback((obj: unknown) => {
    const payload = JSON.stringify(obj);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(payload);
      pushWsLog(`→ ${payload.slice(0, 500)}`);
    } else {
      pushWsLog(`(offline mock) → ${payload.slice(0, 500)}`);
    }
  }, [pushWsLog]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") localStorage.setItem("zes:vscode:wsUrl", wsUrl);
  }, [wsUrl]);

  // auto-attempt once if server says reachable
  useEffect(() => {
    if (connectedLike && wsState === "idle") {
      // don't auto-connect aggressively; keep idle until user taps Reconnect to respect Termux battery
    }
  }, [connectedLike, wsState]);

  // -- explorer/files -------------------------------------------------------
  const { data: filesData } = useFetch<{ files?: FileNode[]; workspace?: string; error?: string }>("/api/vscode/files", 10000);
  const fileTree: FileNode[] = (filesData?.files as FileNode[]) ?? MOCK_FILES;
  const workspacePath = filesData?.workspace ?? "~/zes-os";

  // -- editor ---------------------------------------------------------------
  const [openFile, setOpenFile] = useState<EditorFile>({
    path: "~/zes-os/zeso.mjs",
    content: `// zeso.mjs — ZES orchestrator (Termux)\n// Lightweight mobile editor preview\n// Tap files in Explorer to open them; WebSocket commands sync to code-server.\n\nimport fs from \"node:fs\";\nconst HOME = process.env.HOME;\n// code-server runs on :8181 with --auth none\n// Control panel talks to ws://localhost:8181 via wsRouter\n\nexport function publish(source, type, payload) {\n  console.log(\`[bus] \${source}::\${type}\`, payload);\n}\n`,
    language: "javascript",
    dirty: false,
  });
  const [editorLineNumbers] = useState(true);

  const openFileByPath = useCallback(async (path: string) => {
    // try live fetch, fall back to mock
    try {
      const res = await fetch(`/api/vscode/file?path=${encodeURIComponent(path)}`);
      if (res.ok) {
        const j = await res.json() as { content?: string; error?: string };
        if (j.content != null) {
          setOpenFile({ path, content: j.content, language: langFor(path), dirty: false });
          setActivePanel("editor");
          setCollapsed((c) => ({ ...c, editor: false }));
          sendWs({ type: "openFile", path });
          return;
        }
      }
    } catch { /* fallback */ }
    // mock content
    setOpenFile((prev) => ({
      path,
      content: prev.path === path ? prev.content : `// ${path}\n// (mock preview — code-server file not reachable via /api/vscode/file)\n// Connect to code-server on ${wsUrl} for live content.\n\nconsole.log(\"hello from ${path}\");\n`,
      language: langFor(path),
      dirty: false,
    }));
    setActivePanel("editor");
    setCollapsed((c) => ({ ...c, editor: false }));
    sendWs({ type: "openFile", path });
  }, [sendWs, wsUrl]);

  const handleSave = useCallback(() => {
    sendWs({ type: "saveFile", path: openFile.path, content: openFile.content });
    setOpenFile((f) => ({ ...f, dirty: false }));
    pushWsLog(`saved ${openFile.path}`);
  }, [openFile, sendWs, pushWsLog]);

  // -- terminal -------------------------------------------------------------
  const [termLines, setTermLines] = useState<TermLine[]>(MOCK_TERM_LINES);
  const [termInput, setTermInput] = useState("");
  const [termRunning, setTermRunning] = useState(false);
  const termScrollRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    if (termScrollRef.current) termScrollRef.current.scrollTop = termScrollRef.current.scrollHeight;
  }, [termLines]);

  const runTerm = useCallback(() => {
    const cmd = termInput.trim();
    if (!cmd) return;
    const id = Math.random().toString(36).slice(2, 8);
    setTermLines((prev) => [...prev, { id, text: `$ ${cmd}`, kind: "in", ts: new Date().toISOString() }].slice(-120));
    sendWs({ type: "runTerminalCommand", command: cmd, cwd: workspacePath });
    setTermInput("");
    setTermRunning(true);
    // mock response when offline
    if (wsState !== "open") {
      setTimeout(() => {
        setTermLines((prev) => [...prev, { id: id + "-o", text: `→ (mock) executed: ${cmd}\n→ tip: connect to code-server to run for real`, kind: "out", ts: new Date().toISOString() }].slice(-120));
        setTermRunning(false);
      }, 600);
    } else {
      setTimeout(() => setTermRunning(false), 1200);
    }
  }, [termInput, sendWs, workspacePath, wsState]);

  // -- chat -----------------------------------------------------------------
  const [chatInput, setChatInput] = useState("");
  const [chatLines, setChatLines] = useState<ChatMsg[]>([
    { id: "c0", role: "system", text: "ZES Chat · connected to the Termux code-server Copilot bridge. Ask to open files, run commands, or explain this repo.", ts: new Date().toISOString() },
    { id: "c1", role: "assistant", text: "Hi! I’m your mobile VS Code assistant. Try: “open zeso.mjs and show me the queue logic” or “run git status”.", ts: new Date().toISOString() },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatLines]);

  const sendChat = useCallback(() => {
    const t = chatInput.trim();
    if (!t) return;
    const userMsg: ChatMsg = { id: Math.random().toString(36).slice(2, 8), role: "user", text: t, ts: new Date().toISOString() };
    setChatLines((prev) => [...prev, userMsg].slice(-80));
    sendWs({ type: "chat", message: t, context: { openFile: openFile.path, workspace: workspacePath } });
    setChatInput("");
    // mock reply when offline
    if (wsState !== "open") {
      setTimeout(() => {
        const reply: ChatMsg = {
          id: Math.random().toString(36).slice(2, 8),
          role: "assistant",
          text: `Got it: “${t}”. (mock) I’d normally route this through the code-server chat extension via the WebSocket. Connect to ${wsUrl} and I can open files or run terminal commands for you.`,
          ts: new Date().toISOString(),
        };
        setChatLines((prev) => [...prev, reply].slice(-80));
      }, 700);
    }
  }, [chatInput, sendWs, openFile.path, workspacePath, wsState, wsUrl]);

  // -- derived --------------------------------------------------------------
  const connectionLabel = useMemo(() => {
    if (wsState === "open") return "LIVE · ws open";
    if (wsState === "connecting") return "CONNECTING…";
    if (connectedLike) return "code-server reachable";
    if (vsStatus?.error) return "mock · offline";
    return "checking…";
  }, [wsState, connectedLike, vsStatus]);

  // -------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Page header (dashboard chrome) */}
      <PageHeader
        icon={Code2}
        title="Termux VS Code"
        subtitle={`mobile control panel · ${workspacePath} · ${connectionLabel}`}
        live={connectedLike || wsState === "open"}
      />

      {/* Frost ambient note */}
      <GlassCard frost="blue" className="relative overflow-hidden p-3 sm:p-4 animate-fade-up">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-frost-blue/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 size-32 rounded-full bg-frost-cyan/10 blur-2xl" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-frost-blue/25 bg-frost-blue/10">
              <Smartphone className="size-5 text-frost-blue" />
            </div>
            <div>
              <p className="flex items-center gap-2 text-[12px] font-semibold text-white">
                Vertical Stack Shell
                <span className="hidden rounded-md border border-frost-blue/20 bg-frost-blue/10 px-1.5 py-0.5 font-mono text-[8px] tracking-wider text-frost-blue sm:inline">MOBILE-FIRST</span>
              </p>
              <p className="mono mt-0.5 text-[10px] text-white/45">flex-col · pinch-to-zoom · 44px touch targets · hamburger drawer · code-server :8181</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={refreshStatus}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-frost-blue/15 bg-white/[0.04] px-3 text-[11px] text-white/70 transition hover:border-frost-blue/30 hover:bg-frost-blue/10 hover:text-white active:scale-[0.98]"
            >
              <RefreshCw className="size-3.5" /> Sync
            </button>
            <a
              href={vsStatus?.codeServer?.url ?? "http://localhost:8181"}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-frost-cyan/15 bg-frost-cyan/10 px-3 text-[11px] text-frost-cyan transition hover:border-frost-cyan/30 active:scale-[0.98]"
            >
              <ExternalLink className="size-3.5" /> Open VS Code
            </a>
          </div>
        </div>
      </GlassCard>

      {/* ================================================================
          THE CONTROL PANEL ITSELF — fixed top bar + scrollable stack
          Spec 3: vertical stack shell. Spec 4: pinch-zoom, hamburger, chat.
          ================================================================ */}
      <div className="glass-card relative overflow-hidden rounded-2xl border border-frost-blue/20 backdrop-blur-xl animate-fade-up">
        {/* --- Fixed Top Bar (Spec 3 hierarchy) -------------------------------- */}
        <div className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-2 border-b border-frost-blue/15 bg-[#080b10]/90 px-2 py-2 backdrop-blur-xl sm:px-3">
          {/* Hamburger (44×44) */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open VS Code navigation"
            aria-expanded={drawerOpen}
            aria-controls="vscode-drawer"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-frost-blue/20 bg-frost-blue/[0.08] text-frost-blue transition hover:border-frost-blue/40 hover:bg-frost-blue/15 active:scale-95"
          >
            <Menu className="size-5" />
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="hidden size-8 shrink-0 items-center justify-center rounded-lg border border-frost-violet/20 bg-frost-violet/10 sm:flex">
              <Code2 className="size-4 text-frost-violet" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-[12px] font-bold leading-none text-white sm:text-[13px]">
                {openFile.path.split("/").pop() ?? "Explorer"}
                <span className="ml-2 hidden rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] font-medium tracking-wide text-white/40 sm:inline">vscode:// termux</span>
              </p>
              <p className="mono mt-1 truncate text-[9px] text-white/35">{workspacePath} · scale {scale.toFixed(2)}× · {wsState}</p>
            </div>
          </div>

          {/* Right actions (all ≥44px) */}
          <div className="flex shrink-0 items-center gap-1">
            <span className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] tracking-wide sm:inline-flex",
              wsState === "open" ? "border-frost-green/25 bg-frost-green/10 text-frost-green"
                : wsState === "connecting" ? "border-frost-blue/25 bg-frost-blue/10 text-frost-blue"
                : connectedLike ? "border-frost-cyan/20 bg-frost-cyan/10 text-frost-cyan"
                : "border-white/10 bg-white/[0.04] text-white/50"
            )}>
              {wsState === "open" ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
              {wsState === "open" ? "WS LIVE" : wsState.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.75, s - 0.12))}
              aria-label="Zoom out"
              className="hidden size-11 items-center justify-center rounded-xl border border-white/5 text-white/60 transition hover:bg-white/5 active:scale-95 sm:flex"
            >
              <ZoomOut className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale(1)}
              aria-label="Reset zoom"
              className="flex size-11 items-center justify-center rounded-xl border border-frost-blue/15 bg-white/[0.03] text-white/70 transition hover:border-frost-blue/30 hover:text-frost-blue active:scale-95"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.2, s + 0.12))}
              aria-label="Zoom in"
              className="hidden size-11 items-center justify-center rounded-xl border border-white/5 text-white/60 transition hover:bg-white/5 active:scale-95 sm:flex"
            >
              <ZoomIn className="size-4" />
            </button>
          </div>
        </div>

        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-frost-blue/8 bg-black/20 px-3 py-2 font-mono text-[9px] text-white/40">
          <span className="inline-flex items-center gap-1">
            <Bullet color={connectedLike ? "green" : "orange"} pulse={connectedLike} className="size-1.5" />
            code-server: {vsStatus?.codeServer?.url ?? "http://localhost:8181"} {vsStatus?.codeServer?.status != null ? `(${vsStatus.codeServer.status})` : connectedLike ? "(ok)" : "(unreachable — mock)"}
          </span>
          <span className="hidden text-white/15 sm:inline">·</span>
          <span className="inline-flex items-center gap-1"><PlugZap className="size-3 text-frost-blue/60" /> ws {wsUrl}</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.03] px-2 py-1 text-[8px] tracking-wide">
            <PanelRight className="size-3 text-white/30" /> pinch with 2 fingers • double-tap to reset
          </span>
        </div>

        {/* WS url bar + Reconnect */}
        <div className="flex flex-col gap-2 border-b border-frost-blue/8 bg-black/10 px-3 py-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-frost-cyan/15 bg-frost-cyan/10">
              <Wifi className="size-3.5 text-frost-cyan" />
            </div>
            <input
              value={wsUrl}
              onChange={(e) => setWsUrl(e.target.value)}
              placeholder="ws://localhost:8181"
              spellCheck={false}
              className="min-w-0 flex-1 rounded-xl border border-frost-blue/15 bg-black/30 px-3 py-2.5 font-mono text-[11px] text-white/80 placeholder:text-white/25 focus:border-frost-blue/40 focus:outline-none focus:ring-2 focus:ring-frost-blue/15"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={connectWs}
              disabled={wsState === "connecting"}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-frost-blue/25 bg-frost-blue px-4 text-[11px] font-semibold text-white shadow-[0_0_20px_rgba(64,156,255,0.35)] transition hover:bg-frost-blue/90 active:scale-[0.98] disabled:opacity-60 sm:flex-none"
            >
              <PlugZap className="size-3.5" /> Reconnect
            </button>
            <button
              type="button"
              onClick={disconnectWs}
              className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10 active:scale-95"
            >
              <Square className="size-3.5" />
            </button>
          </div>
        </div>

        {/* =============== Primary Content Stream (scrollable vertical stack) =============== */}
        {/* Spec 3: display:flex flex-direction:column overflow-y:auto ; each panel collapsible */}
        <div
          ref={streamRef}
          className="scroll-area max-h-[72vh] overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-3 sm:py-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div
            className="flex flex-col gap-3 will-change-transform"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              transition: "transform 120ms ease-out",
            }}
          >
            {/* Quick action strip */}
            <div className="flex flex-wrap gap-1.5">
              <QuickTab active={activePanel === "explorer"} onClick={() => { setActivePanel("explorer"); setCollapsed((c) => ({ ...c, explorer: false })); }} icon={FolderTree} label="Explorer" />
              <QuickTab active={activePanel === "editor"} onClick={() => { setActivePanel("editor"); setCollapsed((c) => ({ ...c, editor: false })); }} icon={Code2} label="Editor" count="1 tab" />
              <QuickTab active={activePanel === "terminal"} onClick={() => { setActivePanel("terminal"); setCollapsed((c) => ({ ...c, terminal: false })); }} icon={Terminal} label="Terminal" pulse={termRunning} />
              <QuickTab active={activePanel === "chat"} onClick={() => { setActivePanel("chat"); setCollapsed((c) => ({ ...c, chat: false })); }} icon={MessageSquare} label="Chat" badge={`${chatLines.length}`} />
              <span className="ml-auto hidden items-center gap-1 rounded-full border border-frost-violet/15 bg-frost-violet/10 px-2 py-1 font-mono text-[9px] text-frost-violet sm:inline-flex">
                <Sparkles className="size-3" /> Copilot / Chat bridge
              </span>
            </div>

            {/* --- Panel: Workspace Explorer ----------------------------------- */}
            <Panel
              id="explorer"
              title="Workspace Explorer"
              subtitle={`${workspacePath} · tap to open`}
              icon={FolderOpen}
              frost={activePanel === "explorer" ? "violet" : "blue"}
              collapsed={collapsed.explorer}
              onToggle={() => setCollapsed((c) => ({ ...c, explorer: !c.explorer }))}
              onHeaderClick={() => setActivePanel("explorer")}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-white/25" />
                    <input placeholder="Search files (prefix)" className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-8 pr-2 font-mono text-[11px] text-white/70 placeholder:text-white/25 focus:border-frost-violet/40 focus:outline-none" />
                  </div>
                  <button type="button" className="flex size-11 items-center justify-center rounded-xl border border-frost-violet/20 bg-frost-violet/10 text-frost-violet active:scale-95">
                    <RefreshCw className="size-4" />
                  </button>
                </div>
                <FileTree nodes={fileTree} depth={0} onOpen={openFileByPath} activePath={openFile.path} />
                {!filesData?.files && (
                  <p className="rounded-lg border border-frost-orange/15 bg-frost-orange/5 px-3 py-2 font-mono text-[10px] text-frost-orange/80">Live workspace not reachable — showing mock tree. Set ZES_WORKSPACE or ensure code-server exposes the folder.</p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => sendWs({ type: "command", command: "workbench.view.explorer" })} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 font-mono text-[10px] text-white/60 hover:bg-white/10">Reveal in VS Code</button>
                  <button onClick={() => sendWs({ type: "command", command: "workbench.action.quickOpen" })} className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 font-mono text-[10px] text-white/60 hover:bg-white/10">Quick Open (⌘P)</button>
                </div>
              </div>
            </Panel>

            {/* --- Panel: Editor (mobile-optimized lightweight view) ----------- */}
            <Panel
              id="editor"
              title={openFile.path.split("/").pop() ?? "Editor"}
              subtitle={`${openFile.language} · ${openFile.dirty ? "unsaved • " : ""}${openFile.path}`}
              icon={Code2}
              frost={openFile.dirty ? "orange" : "blue"}
              collapsed={collapsed.editor}
              onToggle={() => setCollapsed((c) => ({ ...c, editor: !c.editor }))}
              onHeaderClick={() => setActivePanel("editor")}
              headerActions={
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!openFile.dirty}
                    className={cn("flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-[10px] font-medium transition active:scale-95",
                      openFile.dirty ? "border-frost-green/25 bg-frost-green/15 text-frost-green hover:bg-frost-green/20" : "border-white/10 bg-white/[0.03] text-white/30")}
                  >
                    <Save className="size-3.5" /> Save
                  </button>
                  <button type="button" onClick={() => navigator.clipboard.writeText(openFile.content)} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5">
                    <Copy className="size-3.5" />
                  </button>
                </div>
              }
            >
              <div className="space-y-2">
                {/* editor toolbar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md border border-frost-blue/20 bg-frost-blue/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wide text-frost-blue">{openFile.language}</span>
                  <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] text-white/35">UTF-8</span>
                  <span className="rounded-md border border-white/10 bg-black/20 px-2 py-1 font-mono text-[9px] text-white/35">LF</span>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-white/30"><Maximize2 className="size-3" /> {openFile.content.split("\n").length} lines</span>
                </div>

                {/* The editor itself — textarea + line numbers, lightweight, no iframe */}
                <div className="overflow-hidden rounded-xl border border-frost-blue/15 bg-black/35">
                  <div className="flex items-center justify-between border-b border-frost-blue/10 bg-black/20 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-frost-red/80" />
                      <span className="size-2.5 rounded-full bg-frost-orange/80" />
                      <span className="size-2.5 rounded-full bg-frost-green/80" />
                    </div>
                    <span className="font-mono text-[9px] text-white/30">{openFile.path}</span>
                    <ExternalLink className="size-3 text-white/20" />
                  </div>
                  <div className="flex">
                    {/* line numbers */}
                    {editorLineNumbers && (
                      <div className="select-none border-r border-white/5 bg-black/20 px-2 py-3 text-right font-mono text-[10px] leading-5 text-white/20">
                        {openFile.content.split("\n").map((_, i) => (
                          <div key={i} className="min-w-6">{i + 1}</div>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={openFile.content}
                      onChange={(e) => setOpenFile((f) => ({ ...f, content: e.target.value, dirty: true }))}
                      spellCheck={false}
                      autoComplete="off"
                      autoCorrect="off"
                      className="min-h-[220px] w-full flex-1 resize-y bg-transparent px-3 py-3 font-mono text-[12px] leading-5 text-white/85 placeholder:text-white/25 focus:outline-none sm:text-[13px]"
                      style={{ tabSize: 2 }}
                      rows={14}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-3 py-1.5">
                    <span className="font-mono text-[9px] text-white/30">Synced via wsRouter · <span className={openFile.dirty ? "text-frost-orange" : "text-frost-green"}>{openFile.dirty ? "unsaved changes" : "in sync"}</span></span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => sendWs({ type: "formatDocument", path: openFile.path })} className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-white/40 hover:bg-white/5">Format</button>
                      <button type="button" onClick={() => sendWs({ type: "reveal", path: openFile.path })} className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-white/40 hover:bg-white/5">Reveal</button>
                    </div>
                  </div>
                </div>

                <p className="font-mono text-[9px] leading-relaxed text-white/30">
                  Mobile editor renders a custom lightweight view (textarea + line numbers) — not an iframe of the desktop VS Code UI. State diffs travel over the WebSocket; Prism/Monaco can be added for highlighting.
                </p>
              </div>
            </Panel>

            {/* --- Panel: Terminal ------------------------------------------- */}
            <Panel
              id="terminal"
              title="Integrated Terminal"
              subtitle="xterm bridge · horizontally scrollable · monospace"
              icon={Terminal}
              frost="green"
              collapsed={collapsed.terminal}
              onToggle={() => setCollapsed((c) => ({ ...c, terminal: !c.terminal }))}
              onHeaderClick={() => setActivePanel("terminal")}
              headerActions={
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setTermLines([])} className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5">
                    <Trash2 className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setTermRunning((v) => !v)} className={cn("flex size-9 items-center justify-center rounded-lg border transition", termRunning ? "border-frost-green/30 bg-frost-green/15 text-frost-green" : "border-white/10 text-white/40 hover:bg-white/5")}>
                    {termRunning ? <Square className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                </div>
              }
            >
              <div className="space-y-2">
                {/* terminal output — pre/code, monospace, overflow-x-auto per spec */}
                <pre
                  ref={termScrollRef}
                  className="scroll-area max-h-56 overflow-auto rounded-xl border border-frost-green/20 bg-black/45 p-3 font-mono text-[11px] leading-4 text-white/80"
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", overflowX: "auto" }}
                >
                  {termLines.map((l) => (
                    <div key={l.id} className={cn("whitespace-pre-wrap break-words", l.kind === "in" ? "text-frost-cyan" : l.kind === "sys" ? "text-frost-orange/90" : "text-white/75")}>
                      <span className="mr-1.5 select-none text-[9px] text-white/25">{l.ts.slice(11, 19)}</span>
                      {l.text}
                    </div>
                  ))}
                  {termRunning && <div className="mt-1 flex items-center gap-1.5 text-frost-green"><span className="size-1.5 animate-pulse rounded-full bg-frost-green" /> running…</div>}
                </pre>

                {/* terminal input — ≥44px */}
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[12px] text-frost-green">$</span>
                    <input
                      value={termInput}
                      onChange={(e) => setTermInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") runTerm(); }}
                      placeholder="run a command (e.g. git status, npm run build)"
                      spellCheck={false}
                      className="min-h-11 w-full rounded-xl border border-frost-green/20 bg-black/30 py-2.5 pl-7 pr-3 font-mono text-[12px] text-white placeholder:text-white/25 focus:border-frost-green/40 focus:outline-none focus:ring-2 focus:ring-frost-green/15"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={runTerm}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-frost-green/30 bg-frost-green px-4 text-white shadow-[0_0_16px_rgba(16,209,129,0.35)] transition hover:bg-frost-green/90 active:scale-95"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {["git status", "ls -la", "npm run build", "code-server --help"].map((cmd) => (
                    <button key={cmd} type="button" onClick={() => setTermInput(cmd)} className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 font-mono text-[10px] text-white/50 hover:bg-white/10 hover:text-white/80">
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            {/* --- Panel: Chat (first-class, not iframe) --------------------- */}
            <Panel
              id="chat"
              title="Chat · Copilot Bridge"
              subtitle="first-class panel · WebSocket JSON → code-server chat extension"
              icon={MessageSquare}
              frost="violet"
              collapsed={collapsed.chat}
              onToggle={() => setCollapsed((c) => ({ ...c, chat: !c.chat }))}
              onHeaderClick={() => setActivePanel("chat")}
            >
              <div className="flex flex-col">
                {/* message list */}
                <div ref={chatScrollRef} className="scroll-area max-h-64 space-y-2 overflow-y-auto pr-1">
                  {chatLines.map((m) => (
                    <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                      {m.role !== "user" && (
                        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border",
                          m.role === "system" ? "border-frost-orange/20 bg-frost-orange/10 text-frost-orange" : "border-frost-violet/20 bg-frost-violet/10 text-frost-violet"
                        )}>
                          {m.role === "system" ? <SettingsIcon className="size-3.5" /> : <Bot className="size-3.5" />}
                        </div>
                      )}
                      <div className={cn("max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed",
                        m.role === "user" ? "bg-frost-blue text-white shadow-[0_4px_18px_rgba(64,156,255,0.25)]"
                          : m.role === "system" ? "border border-frost-orange/15 bg-frost-orange/5 text-white/70"
                          : "border border-frost-violet/15 bg-white/[0.04] text-white/85"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                        <p className="mono mt-1 text-[9px] opacity-50">{new Date(m.ts).toLocaleTimeString([], { hour12: false })}</p>
                      </div>
                      {m.role === "user" && (
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-frost-blue/20 bg-frost-blue/15 text-frost-blue">
                          <User className="size-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* fixed input area at bottom (Spec 4) — 44px touch target */}
                <div className="mt-3 flex gap-1.5 border-t border-frost-violet/10 pt-3">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Ask Copilot… (e.g. explain this file, run tests)"
                    className="min-h-11 flex-1 rounded-xl border border-frost-violet/20 bg-black/30 px-3.5 py-2.5 text-[12px] text-white placeholder:text-white/30 focus:border-frost-violet/40 focus:outline-none focus:ring-2 focus:ring-frost-violet/15"
                  />
                  <button
                    type="button"
                    onClick={sendChat}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-frost-violet px-4 text-white shadow-[0_0_16px_rgba(167,139,250,0.35)] transition hover:bg-frost-violet/90 active:scale-95"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
                <p className="mono mt-2 text-[9px] text-white/25">Protocol: <code className="rounded bg-white/5 px-1 py-0.5 text-frost-violet">{"{ type: \"chat\", message, context }"}</code> → extension on Termux side. Mock replies when offline.</p>
              </div>
            </Panel>

            {/* --- Collapsed meta panels (Extensions / SCM) inline ---------- */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Panel
                id="extensions"
                title="Extensions"
                subtitle="marketplace · remote install via WS"
                icon={Puzzle}
                frost="cyan"
                collapsed={collapsed.extensions}
                onToggle={() => setCollapsed((c) => ({ ...c, extensions: !c.extensions }))}
              >
                <div className="space-y-2">
                  {[
                    { name: "ms-python.python", desc: "Python & Pylance", installed: true },
                    { name: "GitHub.copilot", desc: "Muse", installed: true },
                    { name: "bradlc.vscode-tailwindcss", desc: "Tailwind IntelliSense", installed: false },
                  ].map((ext) => (
                    <div key={ext.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-white/80">{ext.name}</p>
                        <p className="truncate text-[10px] text-white/35">{ext.desc}</p>
                      </div>
                      <span className={cn("rounded-full border px-2 py-1 font-mono text-[9px]", ext.installed ? "border-frost-green/20 bg-frost-green/10 text-frost-green" : "border-white/10 text-white/40")}>{ext.installed ? "installed" : "install"}</span>
                    </div>
                  ))}
                  <button onClick={() => sendWs({ type: "command", command: "workbench.extensions.install" })} className="w-full rounded-xl border border-frost-cyan/20 bg-frost-cyan/10 py-2.5 text-[11px] font-medium text-frost-cyan hover:bg-frost-cyan/15">Browse Marketplace</button>
                </div>
              </Panel>

              <Panel
                id="scm"
                title="Source Control"
                subtitle="git · diff · commit"
                icon={GitBranch}
                frost="green"
                collapsed={collapsed.scm}
                onToggle={() => setCollapsed((c) => ({ ...c, scm: !c.scm }))}
              >
                <div className="space-y-2">
                  <div className="rounded-xl border border-frost-green/15 bg-black/20 p-3">
                    <p className="font-mono text-[10px] text-white/60">~/zes-os · <span className="text-frost-green">main</span> · 3 changes</p>
                    <div className="mt-2 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center justify-between"><span className="text-white/70">M dashboard-v3/client/src/routes/VSCode.tsx</span><span className="text-frost-orange">~</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/70">M dashboard-v3/server/server.mjs</span><span className="text-frost-orange">~</span></div>
                      <div className="flex items-center justify-between"><span className="text-white/70">?? termux-vscode/start.sh</span><span className="text-frost-green">+</span></div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => sendWs({ type: "runTerminalCommand", command: "git status --porcelain" })} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[11px] text-white/60 hover:bg-white/10">git status</button>
                    <button onClick={() => sendWs({ type: "runTerminalCommand", command: "git diff --stat" })} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-[11px] text-white/60 hover:bg-white/10">git diff</button>
                  </div>
                </div>
              </Panel>
            </div>

            {/* WS log */}
            <GlassCard className="p-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold text-white/60"><Terminal className="size-3 text-white/30" /> WebSocket log</p>
                <button onClick={() => setWsLog([])} className="rounded border border-white/10 px-2 py-1 font-mono text-[9px] text-white/40 hover:bg-white/5">clear</button>
              </div>
              <pre className="scroll-area mt-2 max-h-28 overflow-auto rounded-lg bg-black/30 p-2 font-mono text-[10px] leading-3 text-white/45">
                {wsLog.length ? wsLog.map((l, i) => <div key={i}><span className="text-white/20">{l.t}</span> {l.msg}</div>) : <span className="text-white/20">no events yet — tap Reconnect to start</span>}
              </pre>
            </GlassCard>

            <p className="pb-1 text-center font-mono text-[9px] text-white/20">Termux VS Code Mobile Control Panel · vertical stack · pinch-zoom · hamburger drawer · frost glass · no iframe</p>
          </div>
        </div>

        {/* Floating Action Button — reset zoom (Spec 4) */}
        <button
          type="button"
          onClick={() => setScale(1)}
          className={cn("absolute bottom-3 right-3 z-10 flex size-11 items-center justify-center rounded-full border bg-frost-blue text-white shadow-[0_8px_28px_rgba(64,156,255,0.45)] transition hover:bg-frost-blue/90 active:scale-95", scale === 1 && "opacity-60")}
          aria-label="Reset zoom to 100%"
          title="Reset zoom"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>

      {/* ================================================================
          Hamburger Navigation Drawer (Spec 4) — 80% width, slide from left
          ================================================================ */}
      {drawerOpen && (
        <button type="button" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm animate-fade-in md:hidden" />
      )}
      <aside
        id="vscode-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="VS Code navigation"
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(80vw,340px)] flex-col border-r border-frost-blue/15 bg-[#080b10]/95 pt-[env(safe-area-inset-top)] shadow-[20px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-transform duration-300 ease-out",
          drawerOpen ? "translate-x-0" : "pointer-events-none -translate-x-full",
        )}
      >
        <div className="flex min-h-14 shrink-0 items-center justify-between border-b border-frost-blue/10 px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-frost-blue/20 bg-frost-blue/10">
              <Code2 className="size-4 text-frost-blue" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-white">VS Code Menu</p>
              <p className="mono text-[8px] text-white/35">Termux · code-server :8181</p>
            </div>
          </div>
          <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation" className="flex size-11 items-center justify-center rounded-xl border border-white/5 text-white/55 transition hover:bg-white/5 active:scale-95">
            <X className="size-4" />
          </button>
        </div>

        <nav className="scroll-area flex-1 overflow-y-auto px-3 py-3">
          <p className="px-3 pb-2 pt-1 font-mono text-[9px] font-semibold tracking-[0.18em] text-white/25">NAVIGATE</p>
          <div className="space-y-1">
            <DrawerLink icon={FolderTree} label="Workspace Explorer" hint="Files & folders" onClick={() => { setDrawerOpen(false); setCollapsed((c) => ({ ...c, explorer: false })); setActivePanel("explorer"); document.getElementById("explorer")?.scrollIntoView({ behavior: "smooth" }); }} />
            <DrawerLink icon={Puzzle} label="Extensions" hint="Marketplace · install" onClick={() => { setDrawerOpen(false); setCollapsed((c) => ({ ...c, extensions: !c.extensions })); }} />
            <DrawerLink icon={GitBranch} label="Source Control" hint="Git · diff · commit" onClick={() => { setDrawerOpen(false); setCollapsed((c) => ({ ...c, scm: !c.scm })); }} />
            <DrawerLink icon={SettingsIcon} label="Settings" hint="Editor & Termux config" onClick={() => { setDrawerOpen(false); sendWs({ type: "command", command: "workbench.action.openSettings" }); }} />
            <div className="my-2 h-px bg-white/5" />
            <DrawerLink icon={PlugZap} label="Reconnect" hint={`${wsUrl} · tap to retry`} accent onClick={() => { setDrawerOpen(false); connectWs(); }} />
            <DrawerLink icon={ExternalLink} label="Open full VS Code" hint="http://localhost:8181" onClick={() => window.open(vsStatus?.codeServer?.url ?? "http://localhost:8181", "_blank")} />
          </div>

          <div className="mt-4 rounded-xl border border-frost-blue/15 bg-frost-blue/[0.04] p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70"><Smartphone className="size-3.5 text-frost-blue" /> Termux notes</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 font-mono text-[10px] leading-relaxed text-white/40">
              <li>code-server: <code className="text-frost-blue">code-server --auth none --bind-addr 0.0.0.0:8181</code></li>
              <li>Control panel: <code className="text-frost-cyan">bash start.sh</code> → http://localhost:3000</li>
              <li>WS upgrades via Express wsRouter; JSON commands sync editor/terminal/chat.</li>
            </ul>
          </div>
        </nav>

        <div className="shrink-0 border-t border-frost-blue/10 p-3">
          <div className="glass-card rounded-xl border border-frost-blue/15 bg-frost-blue/[0.035] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-white/70">Connection</p>
              <span className={cn("rounded-md border px-1.5 py-1 font-mono text-[7px] uppercase tracking-wide", wsState === "open" ? "border-frost-green/20 bg-frost-green/10 text-frost-green" : "border-white/10 text-white/40")}>{wsState}</span>
            </div>
            <p className="mono mt-2 truncate text-[9px] text-white/35">{wsUrl}</p>
            <div className="mt-2 flex gap-1">
              <button type="button" onClick={connectWs} className="flex-1 rounded-lg bg-frost-blue py-2 text-[10px] font-semibold text-white hover:bg-frost-blue/90">Reconnect</button>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] text-white/60">Close</button>
            </div>
          </div>
        </div>
      </aside>

      {/* Integration note card (outside stack, explains server mapping) */}
      <GlassCard frost="violet" className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-frost-violet/20 bg-frost-violet/10">
            <SettingsIcon className="size-4 text-frost-violet" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-white/85">How this panel talks to Termux</p>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-white/40">
              Browser → <span className="text-frost-blue">WebSocket</span> → code-server <code className="text-white/60">wsRouter</code> on :8181 (fallback :8080). The panel sends
              <code className="rounded bg-white/5 px-1 text-frost-cyan"> openFile</code>,
              <code className="rounded bg-white/5 px-1 text-frost-green"> runTerminalCommand</code>,
              <code className="rounded bg-white/5 px-1 text-frost-violet"> chat</code> and receives text/terminal/diagnostic diffs to render a lightweight mobile editor (no iframe).
              The dashboard server also exposes <code className="text-white/60">/api/vscode/*</code> for health + file listing so the UI degrades to mock data when Termux is offline.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <a href="/api/vscode/status" target="_blank" rel="noreferrer" className="rounded-lg border border-frost-blue/15 bg-black/20 px-2.5 py-1.5 font-mono text-[10px] text-frost-blue hover:bg-frost-blue/10">/api/vscode/status</a>
              <a href="/api/vscode/files" target="_blank" rel="noreferrer" className="rounded-lg border border-frost-violet/15 bg-black/20 px-2.5 py-1.5 font-mono text-[10px] text-frost-violet hover:bg-frost-violet/10">/api/vscode/files</a>
              <span className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 font-mono text-[10px] text-white/25">WS: {wsUrl}</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function Panel({
  id,
  title,
  subtitle,
  icon: Icon,
  frost = "blue",
  collapsed,
  onToggle,
  onHeaderClick,
  headerActions,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Code2;
  frost?: "blue" | "green" | "orange" | "violet" | "cyan";
  collapsed: boolean;
  onToggle: () => void;
  onHeaderClick?: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("glass-card overflow-hidden rounded-2xl", `frost-${frost}`)}>
      {/* Header is collapsible trigger — min 44px */}
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-white/[0.02] sm:px-4"
      >
        <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border bg-black/20", `border-frost-${frost}/20`)}>
          <Icon className={cn("size-3.5", `text-frost-${frost}`)} />
        </div>
        <div className="min-w-0 flex-1" onClick={(e) => { e.stopPropagation(); onHeaderClick?.(); }}>
          <p className="truncate text-[11px] font-semibold text-white sm:text-[12px]">{title}</p>
          <p className="truncate font-mono text-[9px] text-white/35">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions && (
            <span onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
              {headerActions}
            </span>
          )}
          <span className="flex size-9 items-center justify-center rounded-lg border border-white/5 bg-white/[0.03] text-white/40">
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        </div>
      </button>
      {/* Body — collapsible, full width when expanded */}
      {!collapsed && <div className="border-t border-frost-blue/10 bg-black/10 p-3 sm:p-4">{children}</div>}
    </section>
  );
}

function QuickTab({ icon: Icon, label, active, onClick, count, badge, pulse }: { icon: typeof Code2; label: string; active?: boolean; onClick: () => void; count?: string; badge?: string; pulse?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-medium transition active:scale-[0.98]",
        active ? "border-frost-blue/30 bg-frost-blue/15 text-white shadow-[0_0_16px_rgba(64,156,255,0.22)]" : "border-white/5 bg-white/[0.03] text-white/55 hover:bg-white/10 hover:text-white/80"
      )}
    >
      <Icon className={cn("size-3.5", active ? "text-frost-blue" : "text-white/40")} />
      {label}
      {count && <span className="hidden font-mono text-[9px] text-white/30 sm:inline">· {count}</span>}
      {badge && <span className="rounded-full bg-frost-violet px-1.5 py-0.5 font-mono text-[9px] text-white">{badge}</span>}
      {pulse && <Bullet color="green" pulse className="size-1.5" />}
    </button>
  );
}

function FileTree({ nodes, depth, onOpen, activePath }: { nodes: FileNode[]; depth: number; onOpen: (p: string) => void; activePath: string }) {
  const [openDirs, setOpenDirs] = useState<Record<string, boolean>>({});
  return (
    <div className={cn(depth === 0 ? "space-y-0.5" : "ml-3 space-y-0.5 border-l border-white/5 pl-2")}>
      {nodes.map((n) => {
        const isDir = n.type === "dir";
        const isOpen = openDirs[n.path] ?? depth < 1;
        const Icon = isDir ? FolderOpen : fileIcon(n.name);
        const isActive = !isDir && n.path === activePath;
        return (
          <div key={n.path}>
            <button
              type="button"
              onClick={() => {
                if (isDir) setOpenDirs((prev) => ({ ...prev, [n.path]: !isOpen }));
                else onOpen(n.path);
              }}
              className={cn(
                "flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition active:scale-[0.99]",
                isActive ? "border border-frost-blue/25 bg-frost-blue/10 text-white" : "border border-transparent text-white/65 hover:bg-white/5 hover:text-white/85"
              )}
            >
              {isDir ? (
                <span className="flex size-5 items-center justify-center text-white/25">
                  {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                </span>
              ) : (
                <span className="w-5" />
              )}
              <Icon className={cn("size-3.5 shrink-0", isActive ? "text-frost-blue" : isDir ? "text-frost-violet/70" : "text-white/35")} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{n.name}</span>
              {n.size != null && <span className="font-mono text-[9px] text-white/25">{Math.round(n.size / 1024)}k</span>}
              {!isDir && isActive && <Bullet color="blue" className="size-1.5" />}
            </button>
            {isDir && isOpen && n.children && <FileTree nodes={n.children} depth={depth + 1} onOpen={onOpen} activePath={activePath} />}
            {isDir && isOpen && !n.children && <p className="ml-7 py-1 font-mono text-[10px] text-white/20">empty</p>}
          </div>
        );
      })}
    </div>
  );
}

function DrawerLink({ icon: Icon, label, hint, onClick, accent }: { icon: typeof Code2; label: string; hint: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition active:scale-[0.99]",
        accent ? "border-frost-blue/25 bg-frost-blue/10 text-white hover:bg-frost-blue/15" : "border-transparent text-white/65 hover:border-white/5 hover:bg-white/[0.04] hover:text-white/90"
      )}
    >
      <Icon className={cn("size-4 shrink-0", accent ? "text-frost-blue" : "text-white/40")} strokeWidth={1.8} />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium">{label}</span>
        <span className="block truncate text-[9px] text-white/30">{hint}</span>
      </span>
      <MoreHorizontal className="size-3 text-white/20" />
    </button>
  );
}
