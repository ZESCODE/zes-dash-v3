#!/usr/bin/env node
// gw-proxy.mjs — unified CLI gateway proxy (:4400)
//   PRIMARY  : ZESRouter http://127.0.0.1:5050
//   FALLBACK : 9Router   http://127.0.0.1:20128
// Any wire format (/v1/messages, /v1/chat/completions, /v1/responses). Streams.
// Primary model candidates: "anthropic/<name>" route style first, then literal id,
// with a [1210]-thinking retry shim. Fallback only after primary exhausted.
// 4xx that survives everything passes through honestly.
import http from "node:http";

const PORT = Number(process.env.PORT) || 4400;
const PRIMARY = { host: "127.0.0.1", port: 5050 };
const SECOND = { host: "127.0.0.1", port: 20128 };

process.on("uncaughtException", (e) =>
  console.log(`[gw-proxy] swallowed: ${String(e.message).slice(0, 160)}`));

const readBody = (req) => new Promise((res) => {
  const c = []; req.on("data", (x) => c.push(x));
  req.on("end", () => res(Buffer.concat(c)));
});

function stripZesPrefix(b) {
  try {
    const j = JSON.parse(b.toString("utf8"));
    if (typeof j.model === "string" && j.model.startsWith("zes/")) {
      j.model = j.model.slice(4);
      return Buffer.from(JSON.stringify(j));
    }
  } catch {}
  return b;
}

function withModel(b, newModel) {
  try {
    const j = JSON.parse(b.toString("utf8"));
    j.model = newModel;
    return Buffer.from(JSON.stringify(j));
  } catch { return b; }
}

const candidatesFor = (rawBody) => {
  let m; try { m = JSON.parse(rawBody.toString("utf8")).model; } catch { return [null]; }
  if (typeof m !== "string") return [null];
  const s = m.startsWith("zes/") ? m.slice(4) : m;
  const alts = [];
  const push = (x) => { if (x && !alts.includes(x)) alts.push(x); };
  push(s.replace(/^pollinations\//, "anthropic/")); // proven bitrouter route style
  push(s);
  return alts;
};

const forceThinking = (b) => {
  try {
    const j = JSON.parse(b.toString("utf8"));
    j.thinking = { type: "enabled", budget_tokens: 2048 };
    j.reasoning_effort = "low"; // some upstreams want OpenAI-style effort instead
    return Buffer.from(JSON.stringify(j));
  } catch { return b; }
};

// Resolve as soon as HEADERS arrive — caller decides pipe vs retry.
function attempt(target, req, bodyBuf) {
  return new Promise((resolve) => {
    const headers = { ...req.headers };
    delete headers.host;
    for (const h of Object.keys(headers))
      if (h.toLowerCase() === "anthropic-beta" && /claude-code/i.test(String(headers[h])))
        delete headers[h];
    if (bodyBuf?.length && !["GET", "HEAD"].includes(req.method))
      headers["content-length"] = Buffer.byteLength(bodyBuf);
    else delete headers["content-length"];

    const preq = http.request(
      { host: target.host, port: target.port,
        path: req.url.replace(/^\/v1\/v1\//, "/v1/"),   // clients that double-prefix
        method: req.method, headers },
      (pres) => resolve({ pres })
    );
    preq.setTimeout(Number(process.env.PROXY_TIMEOUT_MS || 600000), () => preq.destroy(new Error("upstream timeout")));
    preq.on("error", (e) => resolve({ netErr: String(e.message) }));
    if (bodyBuf?.length && !["GET", "HEAD"].includes(req.method)) preq.write(bodyBuf);
    preq.end();
  });
}

const drain = (pres, cap = 500) => new Promise((done) => {
  let t = "";
  pres.on("data", (x) => { if (t.length < cap) t += x; });
  pres.on("end", done); pres.on("error", done);
});

const server = http.createServer(async (req, res) => {
  const rawBody = await readBody(req);

  let winner = null;                 // { pres }
  const tried = [];

  for (const c of candidatesFor(rawBody)) {
    let body = rawBody;
    if (c) body = withModel(rawBody, c);
    else body = stripZesPrefix(rawBody);

    let r = await attempt(PRIMARY, req, body);
    tried.push(`${c || "-"}:${r.pres ? r.pres.statusCode : "ERR"}`);

    if (!r.pres) continue;                               // network error -> next candidate
    if (r.pres.statusCode < 400) { winner = r; break; }  // good headers -> pipe

    if (r.pres.statusCode === 400) {                     // maybe [1210] thinking rule
      const et = await drain(r.pres);
      if (/1210|always engages in thinking/i.test(et)) {
        r = await attempt(PRIMARY, req, forceThinking(body));
        tried.push(`1210fix:${r.pres ? r.pres.statusCode : "ERR"}`);
        if (r.pres && r.pres.statusCode < 400) { winner = r; break; }
      }
    } else {
      r.pres.resume();                                   // drain & discard
    }
  }

  if (!winner) {
    const rf = await attempt(SECOND, req, rawBody);      // original ids for 9router
    if (rf.pres) { winner = rf; }
    else {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "both gateways unreachable" }));
      console.log(`${new Date().toISOString()} ${req.method} ${req.url} BOTH-DOWN tried=[${tried}]`);
      return;
    }
  }

  res.writeHead(winner.pres.statusCode || 502, winner.pres.headers);
  winner.pres.pipe(res);
  console.log(`${new Date().toISOString()} ${req.method} ${req.url} -> ${winner.pres.statusCode} tried=[${tried}]`);
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`[gw-proxy] :4400  primary=zesrouter:5050  fallback=9router:20128`));
