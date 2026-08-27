// mock-infra.mjs — OPTIONAL local stand-in for OmniRoute (:20128) and ZES Router (:5050).
// Only for previewing the dashboard on machines where the real gateway is not running.
// On the Termux node, do NOT start this — the dashboard talks to the real services.

import http from "node:http";

const started = Date.now();
let hits = 845, misses = 213, total = 12480;

function stats() {
  hits += Math.floor(Math.random() * 3);
  misses += Math.random() > 0.7 ? 1 : 0;
  total += Math.floor(Math.random() * 5);
  return {
    uptime_s: Math.floor((Date.now() - started) / 1000) + 51780,
    requests: { total, per_minute: 42 + Math.floor(Math.random() * 20), error_rate: +(1.2 + Math.random()).toFixed(2) },
    cache: { hits, misses, size: 512, capacity: 1024, ttl_s: 3600 },
    proxy_pool: { total: 160, active: 148, rotating: true, strategy: "round-robin" },
    breakers: [
      { id: "antigravity", state: "open", failures: 10, threshold: 10, cooldown_s: 90 },
      { id: "cloudflare-ai", state: "closed", failures: 2, threshold: 15, cooldown_s: 120 },
      { id: "gemini", state: "closed", failures: 0, threshold: 15, cooldown_s: 120 },
      { id: "pollinations", state: "half", failures: 7, threshold: 12, cooldown_s: 60 },
    ],
    history: Array.from({ length: 24 }, (_, i) => ({ minute: i, requests: 30 + Math.floor(28 * Math.abs(Math.sin(i / 3.4))) + Math.floor(Math.random() * 8) })),
  };
}

const gwModels = { object: "list", data: ["zes/claude-sonnet-5", "zes/kimi-k3", "zes/gpt-5.2", "zes/gemini-3-pro", "zes/deepseek-v4", "zes/qwen3-coder", "zes/llama-4-405b", "zes/mistral-large-3"].map((id) => ({ id, object: "model", owned_by: id.split("/")[1].split("-")[0] })) };
const routerModels = { object: "list", data: ["claude-sonnet-5", "kimi-k3", "gpt-5.2", "gemini-3-pro", "deepseek-v4"].map((id) => ({ id, object: "model", owned_by: "zesrouter" })) };

function serve(port, routes) {
  http.createServer((req, res) => {
    const body = routes[req.url.split("?")[0]];
    res.writeHead(body ? 200 : 404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(typeof body === "function" ? body() : body || { error: "not_found" }));
  }).listen(port, "127.0.0.1", () => console.log(`[mock-infra] :${port}`));
}

serve(20128, { "/api/usage/stats": stats, "/v1/models": gwModels });
serve(5050, { "/v1/models": routerModels });
