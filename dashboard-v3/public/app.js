// zed-dash-v4 client — renders ONLY what the server returns. No invented values.
const $ = (id) => document.getElementById(id);
const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : null);

async function getJSON(url) {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return await r.json();
  } catch {
    return { unavailable: true };
  }
}

function unavail(el, msg = "unavailable") {
  el.innerHTML = `<span class="badge unavailable">${msg}</span>`;
}

async function loadStats() {
  const d = await getJSON("/api/usage");
  const el = $("stats");
  if (!d || d.unavailable) {
    el.innerHTML = "";
    for (let i = 0; i < 4; i++) {
      const c = document.createElement("div");
      c.className = "card glass";
      c.innerHTML = `<div class="lbl">—</div><div class="val muted">unavailable</div>`;
      el.appendChild(c);
    }
    return;
  }
  const cards = [
    ["Total requests", fmt(d.totalRequests), "green"],
    ["Prompt tokens", fmt(d.totalPromptTokens), "blue"],
    ["Cached tokens", fmt(d.totalCachedTokens), "orange"],
    ["Spend (USD)", d.totalCost != null ? "$" + Number(d.totalCost).toFixed(2) : "unavailable", "red"],
  ];
  el.innerHTML = cards.map(([label, value]) => `
    <div class="card glass">
      <div class="lbl">${label}</div>
      <div class="val">${value ?? "—"}</div>
    </div>`).join("");
}

async function loadFleet() {
  const d = await getJSON("/api/status");
  const el = $("fleet");
  if (!d || !d.services?.length) return unavail(el);
  el.innerHTML = d.services.map((s) => `
    <div class="row">
      <span><span class="dot ${s.up ? "up" : "down"}"></span>${s.name} <span style="opacity:.5">:${s.port}</span></span>
      <span class="badge ${s.up ? "active" : "unknown"}">${s.up ? "up" : "down"}</span>
    </div>`).join("");
}

async function loadProviders() {
  const d = await getJSON("/api/providers");
  const el = $("providers");
  const conns = d?.connections;
  if (!conns?.length) return unavail(el, "no connections / unavailable");
  el.innerHTML = conns.slice(0, 8).map((c) => {
    const st = c.testStatus || "unknown";
    return `
    <div class="row">
      <span>${c.name || c.provider} <span style="opacity:.45">· ${c.provider}</span></span>
      <span class="badge ${st === "active" ? "active" : "unknown"}">${st}</span>
    </div>`;
  }).join("");
}

async function loadModels() {
  const d = await getJSON("/api/models");
  const el = $("models");
  if (!d || (!d["9router"] && !d.zesrouter)) return unavail(el);
  let html = "";
  for (const [gw, info] of Object.entries(d)) {
    html += `<div class="row">
      <span>${gw}</span>
      <span>${info ? `<b style="color:#93c5fd">${info.count}</b> models <span style="opacity:.5;font-size:11px">e.g. ${info.sample.slice(0,2).join(", ")}</span>` : `<span class="badge unavailable">unavailable</span>`}</span>
    </div>`;
  }
  el.innerHTML = html;
}

async function loadLog(name) {
  const d = await getJSON(`/api/logs?name=${name}`);
  const el = $(`log-${name}`);
  if (!d || d.unavailable || !d.lines) { el.textContent = "// log unavailable"; return; }
  el.textContent = d.lines.join("\n");
}

async function refresh() {
  await Promise.all([
    loadStats(), loadFleet(), loadProviders(), loadModels(),
    loadLog("bitrouter"), loadLog("zen-relay"),
  ]);
}
refresh();
setInterval(refresh, 10000);
