#!/usr/bin/env node
// browser.mjs — Phase 3: agent web tool over Lightpanda CDP (:9222)
//   open <url>   -> {url,title,text,consoleErrors}
//   status | stop
// Real data only: what the page serves is what you get.
import http from "node:http";
import fs from "node:fs";

const CDP = "http://127.0.0.1:9222";
const PIDF = (process.env.HOME || "") + "/.zes/os/lightpanda.pid";

function httpJson(pathname, method = "GET") {
  return new Promise((resolve) => {
    const req = http.request(CDP + pathname, { method }, (res) => {
      let b = ""; res.on("data", (c) => (b += c));
      res.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve({ raw: b }); } });
    });
    req.on("error", () => resolve(null));
    req.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openPage(url) {
  const ver = await httpJson("/json/version");
  if (!ver?.webSocketDebuggerUrl) { console.error(JSON.stringify({ error: "CDP down" })); process.exit(1); }

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("ws fail")); });

  let id = 0; const pending = new Map(); const consoleErrors = [];
  const rawSend = (obj) => ws.send(JSON.stringify(obj));
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej });
    rawSend({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) });
    setTimeout(() => { if (pending.has(mid)) { pending.get(mid).rej(new Error("timeout " + method)); pending.delete(mid); } }, 20000);
  });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id).res(d); pending.delete(d.id); }
    else if (d.method === "Runtime.consoleAPICalled" && ["error"].includes(d.params?.type))
      consoleErrors.push(d.params.args?.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    else if (d.method === "Log.entryAdded" && d.params?.entry?.level === "error")
      consoleErrors.push(String(d.params.entry.text).slice(0, 200));
  };

  const tgt = await send("Target.createTarget", { url: "about:blank" });
  const targetId = tgt.result?.targetId;
  const att = await send("Target.attachToTarget", { targetId, flatten: true });
  const sid = att.result?.sessionId;

  const ssend = (m, p) => send(m, p, sid);
  await ssend("Runtime.enable");
  await ssend("Page.enable");
  const loaded = new Promise((res) => {
    const h = (m) => { const d = JSON.parse(m.data); if (d.method === "Page.loadEventFired" && d.sessionId === sid) { ws.off?.("message", h); res(); } };
    ws.addEventListener("message", h);
    setTimeout(res, 15000);
  });
  await ssend("Page.navigate", { url });
  await loaded;

  const evalJs = async (expression) =>
    (await ssend("Runtime.evaluate", { expression, returnByValue: true }))?.result?.result?.value;
  const title = await evalJs("document.title");
  const text = (await evalJs("document.body ? document.body.innerText.slice(0, 1200) : ''")) || "";
  try { await send("Target.closeTarget", { targetId }); } catch {}
  ws.close();
  console.log(JSON.stringify({ url, title, text, consoleErrors }, null, 2));
}

const [, , cmd, arg] = process.argv;
if (cmd === "open" && arg) openPage(arg).catch((e) => { console.error(JSON.stringify({ error: String(e.message) })); process.exit(1); });
else if (cmd === "status") httpJson("/json/version").then((v) => console.log(JSON.stringify(v)));
else if (cmd === "stop") {
  try { const pid = fs.readFileSync(PIDF, "utf8"); process.kill(Number(pid)); fs.unlinkSync(PIDF); console.log("stopped", pid); }
  catch { console.log("not tracked; kill manually"); }
} else console.log("usage: browser.mjs open <url> | status | stop");
