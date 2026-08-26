// zed-dash-v4 — real-data-only dashboard server (port 7070)
// Every /api/* endpoint returns live data from local services or files.
// If a source is unreachable, the endpoint says so — nothing is fabricated.
import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

const PORT = Number(process.env.PORT) || 7070;
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const PUBLIC = path.join(ROOT, "public");
const LOGDIR = "/data/data/com.termux/files/home/logs";
const HOME = process.env.HOME || "/data/data/com.termux/files/home";

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml" };

// ---------- helpers ----------
function fetchJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs, headers: { accept: "application/json" } }, (res) => {
      // follow one redirect (9router /v1/* can 307 -> /dashboard for UI paths only; keep for safety)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && !url.includes(res.headers.location)) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(fetchJson(next, timeoutMs));
      }
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ ok: false, status: res.statusCode, data: null }); }
      });
    });
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, status: 0, data: null }); });
    req.on("error", () => resolve({ ok: false, status: 0, data: null }));
  });
}

function probePort(port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const s = net.connect({ host: "127.0.0.1", port, timeout: timeoutMs });
    s.on("connect", () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
}

function tailFile(file, lines = 12) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const arr = raw.trimEnd().split("\n");
    return arr.slice(-lines).map((l) =>
      // strip ANSI color codes for display
      l.replace(/\x1b\[[0-9;]*m/g, "")
    );
  } catch {
    return null;
  }
}

// ---------- api ----------
async function apiStatus() {
  const services = [
    { id: "9router", name: "9Router", port: 20128 },
    { id: "zesrouter", name: "ZESRouter", port: 5050 },
    { id: "opencode-ui", name: "OpenCode UI", port: 4050 },
    { id: "zen-relay", name: "Zen Relay", port: 7077 },
    { id: "dash-ui", name: "Dash UI", port: 8090 },
  ];
  const out = [];
  for (const s of services) out.push({ ...s, up: await probePort(s.port) });
  return out;
}

async function apiModels() {
  const gateways = [
    { id: "9router", url: "http://127.0.0.1:20128/v1/models" },
    { id: "zesrouter", url: "http://127.0.0.1:5050/v1/models" },
  ];
  const out = {};
  for (const g of gateways) {
    const r = await fetchJson(g.url, 6000);
    const ids = r.ok && r.data?.data?.map((m) => m.id).filter(Boolean);
    out[g.id] = ids ? { count: ids.length, sample: ids.slice(0, 5) } : null;
  }
  return out;
}

const LOG_FILES = {
  "bitrouter": path.join(LOGDIR, "bitrouter/bitrouter.log"),
  "nvidia-bridge": path.join(LOGDIR, "bitrouter/nvidia-bridge.log"),
  "nvidia-bridge-top": path.join(LOGDIR, "nvidia-bridge.log"),
  "zen-relay": path.join(LOGDIR, "zen-relay.log"),
  "9router": path.join(LOGDIR, "9router.log"),
};

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;

  if (p === "/api/status") return json(res, { services: await apiStatus() });

  if (p === "/api/usage") {
    const r = await fetchJson("http://127.0.0.1:20128/api/usage/stats", 6000);
    return json(res, r.ok ? r.data : { unavailable: true });
  }

  if (p === "/api/providers") {
    const r = await fetchJson("http://127.0.0.1:20128/api/providers", 6000);
    return json(res, r.ok ? r.data : { unavailable: true });
  }

  if (p === "/api/models") return json(res, await apiModels());

  if (p === "/api/logs") {
    const name = u.searchParams.get("name") || "";
    const file = LOG_FILES[name];
    if (!file) { res.writeHead(400); return res.end(JSON.stringify({ error: "unknown log" })); }
    const lines = tailFile(file, 14);
    return json(res, lines ? { lines } : { unavailable: true });
  }

  // static
  let file = path.join(PUBLIC, p === "/" ? "index.html" : decodeURIComponent(p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

function json(res, obj) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

server.listen(PORT, "127.0.0.1", () => console.log(`[zed-dash-v4] real-data dashboard on :${PORT}`));
