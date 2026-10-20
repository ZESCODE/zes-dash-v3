#!/usr/bin/env node
// server.js — minimal Termux-side static file server for the control panel
// Zero extra deps. Mirrors server.py.
// Usage: node server.js  (PORT=3000)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon"
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let file = path.join(__dirname, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ""));
  if (!file.startsWith(__dirname)) file = path.join(__dirname, "index.html");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(__dirname, "index.html");
  const body = fs.readFileSync(file);
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream", "Cache-Control": file.endsWith("index.html") ? "no-cache" : "public, max-age=3600" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[vscode-panel] serving ${__dirname} on http://localhost:${PORT}`);
  console.log(`[vscode-panel] open http://localhost:${PORT} in Android Chrome/Firefox`);
});
