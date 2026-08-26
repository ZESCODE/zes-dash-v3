// ZES OS Dashboard v3 — frontend (vanilla ES modules, no build step)
const app = document.getElementById("app");
const nav = document.getElementById("nav");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const clock = document.getElementById("clock");

const STATUS_LABEL = { running: "running", active: "active", paused: "paused", error: "error", unknown: "unknown" };
const STATUS_COLOR = { running: "green", active: "green", paused: "orange", error: "red", unknown: "gray" };

async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(path + " → " + r.status);
  return r.json();
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function glassCard(title, body, tone = "blue") {
  const c = el("div", `glass glass-card glass-frost-${tone}`);
  c.appendChild(el("div", "card-title", title));
  const b = el("div", "card-body");
  b.innerHTML = body;
  c.appendChild(b);
  return c;
}

function dot(color) {
  return `<span class="dot ${color}"></span>`;
}

// ---------- views ----------
async function viewFleet() {
  const [fleet, tasks] = await Promise.all([api("/api/fleet"), api("/api/tasks")]);
  const company = fleet.company;
  const header = company
    ? `<div class="company glass glass-card glass-frost-blue">
         <div class="card-title">${esc(company.name || "Company")}</div>
         <div class="card-body">${esc(company.description || "")}
           <div class="meta">status: ${company.status || "?"} · budget: $${((company.monthlyBudgetCents||0)/100).toFixed(2)}/mo · spent: $${((company.spentMonthCents||0)/100).toFixed(2)}</div>
         </div></div>`
    : `<div class="muted">no company record</div>`;

  const tree = buildOrgTree(fleet.agents);
  const treeHtml = renderOrgTree(tree);

  const tiles = fleet.agents.map((a) => {
    const tone = STATUS_COLOR[a.status] || "gray";
    const myTasks = tasks.tasks.filter((t) => t.assigned_to === a.id);
    const lastEv = "";
    return `<div class="glass glass-card glass-frost-${tone} agent-tile">
      <div class="card-title">${dot(tone)} ${esc(a.name || a.id)}</div>
      <div class="card-body">
        <div class="meta">${esc(a.role || "")}</div>
        <div class="meta">status: ${STATUS_LABEL[a.status] || a.status} · tasks: ${myTasks.length}</div>
      </div></div>`;
  }).join("");

  app.innerHTML = header + `<h2 class="section">Org Chart</h2><div class="org">${treeHtml}</div>
    <h2 class="section">Agents</h2><div class="grid">${tiles}</div>`;
}

function buildOrgTree(agents) {
  const map = new Map();
  agents.forEach((a) => map.set(a.id, { ...a, children: [] }));
  const roots = [];
  map.forEach((a) => {
    if (a.reportsTo && map.has(a.reportsTo)) map.get(a.reportsTo).children.push(a);
    else roots.push(a);
  });
  return roots;
}

function renderOrgTree(nodes, depth = 0) {
  return nodes.map((n) => {
    const tone = STATUS_COLOR[n.status] || "gray";
    const child = n.children.length ? `<div class="org-children">${renderOrgTree(n.children, depth + 1)}</div>` : "";
    return `<div class="org-node" style="margin-left:${depth * 18}px">
      <div class="glass glass-card glass-frost-${tone} org-card">
        <div class="card-title">${dot(tone)} ${esc(n.name || n.id)}</div>
        <div class="card-body meta">${esc(n.role || "")} · ${STATUS_LABEL[n.status] || n.status}</div>
      </div>${child}</div>`;
  }).join("");
}

async function viewTasks() {
  const { tasks } = await api("/api/tasks");
  const cols = ["pending", "running", "completed", "failed"];
  const colsHtml = cols.map((col) => {
    const items = tasks.filter((t) => t.status === col);
    const cards = items.map((t) => {
      const tone = col === "running" ? "green" : col === "failed" ? "red" : col === "pending" ? "orange" : "blue";
      const attempts = (t.attempts || []).map((a) => `${esc(a.agent || "")}:${a.code ?? "?"} (${a.ms ?? "?"}ms)`).join("<br>");
      const parent = t.parent && t.parent !== "null" ? `<div class="meta">parent: ${esc(t.parent)}</div>` : "";
      return `<div class="glass glass-card glass-frost-${tone} task-card">
        <div class="card-title">${esc(t.title || t.id)}</div>
        <div class="card-body meta">
          ${esc(t.id)} · ${esc(t.assigned_to || "unassigned")} · ${esc(t.priority || "")}
          ${parent}
          ${attempts ? `<div class="attempts">${attempts}</div>` : ""}
          ${t.result_tail ? `<details><summary>output</summary><pre>${esc(t.result_tail.slice(0, 500))}</pre></details>` : ""}
        </div></div>`;
    }).join("") || `<div class="muted">empty</div>`;
    return `<div class="kanban-col"><div class="col-head">${col} (${items.length})</div>${cards}</div>`;
  }).join("");
  app.innerHTML = `<div class="kanban">${colsHtml}</div>`;
}

async function viewActivity() {
  const { events } = await api("/api/activity?limit=200");
  if (!events.length) { app.innerHTML = `<div class="muted">event bus empty / unavailable</div>`; return; }
  const rows = events.slice().reverse().map((e) => {
    const tone = (e.type || "").includes("fail") || (e.type || "").includes("error") ? "red"
      : (e.type || "").includes("completed") ? "green" : "blue";
    const ts = e.ts ? new Date(e.ts).toLocaleTimeString() : "";
    return `<tr>
      <td class="mono">${ts}</td>
      <td>${dot(tone)}<span class="badge glass-frost-${tone}">${esc(e.type || "")}</span></td>
      <td>${esc(e.source || "")}</td>
      <td>${esc(e.agent || "")}</td>
      <td class="meta">${esc(summary(e.payload))}</td></tr>`;
  }).join("");
  app.innerHTML = `<div class="glass glass-card"><table class="log"><thead><tr><th>time</th><th>type</th><th>source</th><th>agent</th><th>payload</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function summary(p) {
  if (!p) return "";
  if (p.title) return p.title;
  if (p.exit_code != null) return `exit ${p.exit_code} · ${p.duration_ms ?? "?"}ms`;
  return JSON.stringify(p).slice(0, 120);
}

async function viewInfra() {
  const [status, infra] = await Promise.all([api("/api/status"), api("/api/infra")]);
  const svc = status.services.map((s) => {
    const tone = s.up ? "green" : "red";
    return `<div class="glass glass-card glass-frost-${tone} svc">
      <div class="card-title">${dot(tone)} ${esc(s.name)}</div>
      <div class="card-body meta">:${s.port} · ${s.up ? "up" : "unreachable"}</div></div>`;
  }).join("");

  const usage = infra.usage && !infra.usage.unavailable ? infra.usage : null;
  const usageHtml = usage
    ? `<div class="glass glass-card glass-frost-blue"><div class="card-title">Usage</div><div class="card-body meta">
        requests: ${usage.totalRequests ?? "?"}<br>tokens: ${usage.totalPromptTokens ?? "?"}+${usage.totalCompletionTokens ?? "?"}
        <br>cached: ${usage.totalCachedTokens ?? "?"}<br>cost: $${usage.totalCost ?? "?"}</div></div>`
    : `<div class="glass glass-card glass-frost-red"><div class="card-title">Usage</div><div class="card-body meta">unavailable</div></div>`;

  const m = infra.models || {};
  const modelsHtml = ["9router", "zesrouter"].map((k) => {
    const mo = m[k] || {};
    const tone = mo.count != null ? "green" : "red";
    return `<div class="glass glass-card glass-frost-${tone}"><div class="card-title">${k} models</div>
      <div class="card-body meta">count: ${mo.count ?? "unavailable"}<br>${(mo.sample || []).map(esc).join("<br>")}</div></div>`;
  }).join("");

  app.innerHTML = `<h2 class="section">Services</h2><div class="grid">${svc}</div>
    <h2 class="section">Usage & Models</h2><div class="grid">${usageHtml}${modelsHtml}</div>`;
}

// ---------- router ----------
const routes = { "/": viewFleet, "/tasks": viewTasks, "/activity": viewActivity, "/infra": viewInfra };

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function route() {
  const hash = location.hash.replace(/^#/, "") || "/";
  [...nav.children].forEach((a) => a.classList.toggle("active", a.dataset.route === hash));
  app.innerHTML = `<div class="muted">loading…</div>`;
  try {
    await (routes[hash] || viewFleet)();
    setStatus(true);
  } catch (e) {
    app.innerHTML = `<div class="glass glass-card glass-frost-red"><div class="card-title">error</div><div class="card-body mono">${esc(e.message)}</div></div>`;
    setStatus(false);
  }
}

function setStatus(ok) {
  statusDot.className = "dot " + (ok ? "green" : "red");
  statusText.textContent = ok ? "live" : "degraded";
}

function tick() {
  clock.textContent = new Date().toLocaleTimeString();
}
setInterval(tick, 1000); tick();
window.addEventListener("hashchange", route);
route();
