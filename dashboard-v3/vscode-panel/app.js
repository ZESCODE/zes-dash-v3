// app.js — Termux VS Code Mobile Control Panel
// Spec 5: WebSocket to code-server wsRouter, gesture handlers, UI listeners
// Frost theme, vertical stack, no iframe

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

/* ---------- State ---------- */
let scale = 1;
let ws = null;
let wsState = "idle";

const els = {
  stream: $("#contentStream"),
  zoomRoot: $("#zoomRoot"),
  gutter: $("#gutter"),
  editor: $("#editor"),
  editorTitle: $("#editorTitle"),
  editorSub: $("#editorSub"),
  dirtyState: $("#dirtyState"),
  lineCount: $("#lineCount"),
  termOut: $("#termOut"),
  termIn: $("#termIn"),
  termSend: $("#termSend"),
  clearTerm: $("#clearTerm"),
  chatList: $("#chatList"),
  chatIn: $("#chatIn"),
  chatSend: $("#chatSend"),
  fileTree: $("#fileTree"),
  fileSearch: $("#fileSearch"),
  wsLog: $("#wsLog"),
  wsUrlInput: $("#wsUrlInput"),
  wsTitle: $("#wsTitle"),
  connDot: $("#connDot"),
  fabReset: $("#fabReset"),
  zoomReset: $("#zoomReset"),
  drawer: $("#drawer"),
  drawerScrim: $("#drawerScrim"),
};

/* ---------- Frost mock data ---------- */
let openFile = {
  path: "~/zes-os/zeso.mjs",
  language: "javascript",
  content: `// zeso.mjs — ZES orchestrator (Termux)\n// Mobile editor preview — live sync via WebSocket wsRouter\nimport fs from "node:fs";\nconst HOME = process.env.HOME;\n// code-server on :8181 --auth none\n\nexport function publish(source, type, payload){\n  console.log(\`[bus] \${source}::\${type}\`, payload);\n}\n`,
  dirty: false,
};

/* ---------- Pinch-to-Zoom (Spec 4) ---------- */
function applyScale(v){
  scale = Math.min(2.2, Math.max(0.75, v));
  els.zoomRoot.style.transform = `scale(${scale})`;
  localStorage.setItem("vscode:scale", String(scale));
}
(function pinchSetup(){
  const saved = Number(localStorage.getItem("vscode:scale"));
  if (saved) applyScale(saved);
  renderEditor();

  let startDist = 0, startScale = 1, lastTap = 0;
  const getDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  els.stream.addEventListener("touchstart", (e)=>{
    if (e.touches.length===2){
      startDist = getDist([e.touches[0], e.touches[1]]);
      startScale = scale;
    }
    if (e.touches.length===1){
      const now = Date.now();
      if (now - lastTap < 350) applyScale(1);
      lastTap = now;
    }
  }, {passive:true});
  els.stream.addEventListener("touchmove", (e)=>{
    if (e.touches.length===2){
      e.preventDefault();
      const d = getDist([e.touches[0], e.touches[1]]);
      if (startDist>12) applyScale(startScale * (d/startDist));
    }
  }, {passive:false});

  els.fabReset.addEventListener("click", ()=> applyScale(1));
  els.zoomReset.addEventListener("click", ()=> applyScale(1));
})();

/* ---------- Hamburger Drawer — 80% width slide from left ---------- */
function openDrawer(){ els.drawer.classList.add("open"); els.drawer.setAttribute("aria-hidden","false"); els.drawerScrim.classList.remove("hidden"); $("#hamburger").setAttribute("aria-expanded","true"); document.body.style.overflow="hidden"; }
function closeDrawer(){ els.drawer.classList.remove("open"); els.drawer.setAttribute("aria-hidden","true"); els.drawerScrim.classList.add("hidden"); $("#hamburger").setAttribute("aria-expanded","false"); document.body.style.overflow=""; }
$("#hamburger").addEventListener("click", openDrawer);
$("#drawerClose").addEventListener("click", closeDrawer);
els.drawerScrim.addEventListener("click", closeDrawer);
$$("[data-jump]").forEach(a=> a.addEventListener("click", (e)=>{
  e.preventDefault();
  const id = a.dataset.jump;
  closeDrawer();
  const target = document.getElementById(id);
  if (target){ target.classList.remove("collapsed"); target.querySelector(".panel-body")?.classList.remove("hidden"); target.scrollIntoView({behavior:"smooth", block:"start"}); }
}));
$("#drawerReconnect").addEventListener("click", ()=>{ closeDrawer(); connectWS(); });

/* ---------- Collapsible panels ---------- */
$$(".panel .panel-head").forEach(head=>{
  head.addEventListener("click", ()=>{
    const panel = head.closest(".panel");
    const expanded = head.getAttribute("aria-expanded")==="true";
    head.setAttribute("aria-expanded", String(!expanded));
    panel.classList.toggle("collapsed", expanded);
    const body = panel.querySelector(".panel-body");
    if (body) body.classList.toggle("hidden", expanded);
    const chev = head.querySelector(".panel-chevron");
    if (chev) chev.textContent = expanded ? "▸" : "▾";
  });
});

/* ---------- Editor (textarea + gutter + Prism optional) ---------- */
function renderEditor(){
  els.editor.value = openFile.content;
  els.editorTitle.textContent = openFile.path.split("/").pop();
  els.editorSub.textContent = `${openFile.language} · ${openFile.path}`;
  els.lineCount.textContent = `${openFile.content.split("\n").length} lines`;
  els.dirtyState.textContent = openFile.dirty ? "unsaved changes" : "in sync";
  els.dirtyState.style.color = openFile.dirty ? "rgb(251,146,60)" : "rgb(16,209,129)";
  renderGutter();
}
function renderGutter(){
  const n = openFile.content.split("\n").length;
  els.gutter.innerHTML = Array.from({length:n}, (_,i)=> `<div>${i+1}</div>`).join("");
}
els.editor.addEventListener("input", ()=>{
  openFile.content = els.editor.value;
  openFile.dirty = true;
  renderGutter();
  els.dirtyState.textContent = "unsaved changes";
  els.dirtyState.style.color = "rgb(251,146,60)";
  els.lineCount.textContent = `${openFile.content.split("\n").length} lines`;
});
$("#saveBtn").addEventListener("click", ()=>{
  wsSend({ type:"saveFile", path: openFile.path, content: openFile.content });
  openFile.dirty = false;
  els.dirtyState.textContent = "saved ✓";
  setTimeout(()=>{ els.dirtyState.textContent="in sync"; els.dirtyState.style.color="rgb(16,209,129)"; }, 1200);
  logWS(`saved ${openFile.path}`);
});
$("#copyBtn").addEventListener("click", ()=> navigator.clipboard.writeText(openFile.content));
$$(".link-btn[data-cmd]").forEach(b=> b.addEventListener("click", ()=> wsSend({ type:b.dataset.cmd==="format" ? "formatDocument" : "reveal", path: openFile.path })));

function openFileByPath(p){
  // try live fetch, else mock
  fetch(`/api/vscode/file?path=${encodeURIComponent(p)}`).then(r=> r.ok ? r.json() : null).then(j=>{
    if (j && j.content!=null){
      openFile = { path: p, content: j.content, language: langFor(p), dirty:false };
    } else {
      openFile = { path: p, content:`// ${p}\n// (mock — code-server not reachable)\nconsole.log("hello from ${p}");\n`, language: langFor(p), dirty:false };
    }
    renderEditor();
    wsSend({ type:"openFile", path: p });
  }).catch(()=>{
    openFile = { path:p, content:`// ${p}\nconsole.log("hello");\n`, language: langFor(p), dirty:false };
    renderEditor();
  });
  // ensure editor panel expanded
  const ed = $("#editor");
  ed.classList.remove("collapsed");
  ed.querySelector(".panel-body")?.classList.remove("hidden");
}
function langFor(p){
  const ext = p.split(".").pop()?.toLowerCase()||"";
  if (["ts","tsx"].includes(ext)) return "typescript";
  if (["js","jsx","mjs"].includes(ext)) return "javascript";
  if (ext==="py") return "python";
  if (ext==="json") return "json";
  if (ext==="md") return "markdown";
  if (ext==="css") return "css";
  return "plaintext";
}

/* ---------- File tree ---------- */
const mockTree = [
  { name:"zes-os", path:"~/zes-os", type:"dir", children:[
    { name:"zeso.mjs", path:"~/zes-os/zeso.mjs", type:"file" },
    { name:"lib", path:"~/zes-os/lib", type:"dir", children:[
      {name:"llm.mjs", path:"~/zes-os/lib/llm.mjs", type:"file"},
      {name:"scaffold.mjs", path:"~/zes-os/lib/scaffold.mjs", type:"file"},
    ]},
  ]},
  { name:".hermes", path:"~/.hermes", type:"dir", children:[
    {name:"roster.json", path:"~/.hermes/roster.json", type:"file"},
    {name:"tasks.json", path:"~/.hermes/tasks.json", type:"file"},
  ]},
];
function renderTree(nodes, container){
  container.innerHTML = "";
  function walk(list, parent){
    for(const n of list){
      const row = document.createElement("div");
      if (n.type==="dir"){
        row.innerHTML = `<a href="#" data-path="${n.path}">📁 <b>${n.name}</b></a>`;
        parent.appendChild(row);
        if (n.children){ const sub=document.createElement("div"); sub.style.marginLeft="12px"; sub.style.borderLeft="1px solid rgba(255,255,255,.06)"; sub.style.paddingLeft="8px"; parent.appendChild(sub); walk(n.children, sub); }
      } else {
        const active = n.path===openFile.path ? "active" : "";
        row.innerHTML = `<a href="#" data-path="${n.path}" class="${active}">📄 ${n.name}</a>`;
        parent.appendChild(row);
      }
    }
  }
  walk(nodes, container);
  container.querySelectorAll("a[data-path]").forEach(a=> a.addEventListener("click", (e)=>{
    e.preventDefault();
    const p = a.dataset.path;
    if (p.endsWith(".json") || p.endsWith(".mjs") || p.endsWith(".ts") || p.endsWith(".js") || p.endsWith(".py") || p.endsWith(".md")) openFileByPath(p);
  }));
}
renderTree(mockTree, els.fileTree);
// try live workspace
fetch("/api/vscode/files").then(r=> r.ok ? r.json() : null).then(j=>{
  if (j && j.files && j.files.length){ renderTree(j.files, els.fileTree); els.wsTitle.textContent = `${j.workspace} · code-server :8181`; }
}).catch(()=>{});

// quick tabs
$$(".quick-tabs .tab").forEach(t=> t.addEventListener("click", ()=>{
  $$(".quick-tabs .tab").forEach(x=> x.classList.remove("active"));
  t.classList.add("active");
  const id = t.dataset.tab;
  const panel = document.getElementById(id);
  if (panel){ panel.classList.remove("collapsed"); panel.querySelector(".panel-body")?.classList.remove("hidden"); panel.scrollIntoView({behavior:"smooth"}); }
}));

/* ---------- Terminal (pre/code horizontally scrollable) ---------- */
function termAppend(text, kind="out"){
  const line = document.createElement("div");
  line.textContent = text;
  line.style.color = kind==="in" ? "rgb(34,211,238)" : kind==="sys" ? "rgb(251,146,60)" : "rgba(255,255,255,.75)";
  els.termOut.appendChild(line);
  els.termOut.scrollTop = els.termOut.scrollHeight;
}
termAppend("$ code-server --auth none --bind-addr 0.0.0.0:8181 ~/zes-os","sys");
termAppend("info  code-server 4.89.0 — HTTP server listening on http://0.0.0.0:8181","out");

function runTerm(){
  const cmd = els.termIn.value.trim();
  if (!cmd) return;
  termAppend(`$ ${cmd}`, "in");
  wsSend({ type:"runTerminalCommand", command: cmd });
  els.termIn.value = "";
  if (wsState!=="open"){
    setTimeout(()=> termAppend(`→ (mock) executed: ${cmd}\n→ connect to code-server to run for real`,"out"), 500);
  }
}
els.termSend.addEventListener("click", runTerm);
els.termIn.addEventListener("keydown", (e)=>{ if(e.key==="Enter") runTerm(); });
els.clearTerm.addEventListener("click", ()=> els.termOut.innerHTML="");
$$(".chip[data-cmd]").forEach(c=> c.addEventListener("click", ()=> els.termIn.value = c.dataset.cmd));

/* ---------- Chat (first-class panel) ---------- */
function chatAppend(role, text){
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  const avatar = role==="user" ? "🧑" : role==="sys" ? "⚙" : "🤖";
  wrap.innerHTML = `<span class="msg-avatar">${avatar}</span><div class="msg-bubble">${escapeHtml(text)}</div>`;
  els.chatList.appendChild(wrap);
  els.chatList.scrollTop = els.chatList.scrollHeight;
}
function escapeHtml(s){ return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
chatAppend("sys","ZES Chat · connected to the Termux code-server Copilot bridge. Ask to open files, run commands, or explain this repo.");
chatAppend("bot","Hi! I’m your mobile assistant. Try: “open zeso.mjs and show me the queue logic”");

function sendChat(){
  const t = els.chatIn.value.trim();
  if (!t) return;
  chatAppend("user", t);
  wsSend({ type:"chat", message: t, context:{ openFile: openFile.path } });
  els.chatIn.value = "";
  if (wsState!=="open"){
    setTimeout(()=> chatAppend("bot", `Got it: “${t}”. (mock) I’d normally route this via the code-server chat extension. Connect to ws://localhost:8181 and I can open files or run commands.`), 600);
  }
}
els.chatSend.addEventListener("click", sendChat);
els.chatIn.addEventListener("keydown", (e)=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); sendChat(); }});

/* ---------- WebSocket — native WebSocket API, wsRouter upgrade ---------- */
function setConn(s){
  wsState = s;
  const dot = els.connDot;
  dot.className = "conn " + (s==="open" ? "conn--live" : s==="connecting" ? "" : "conn--offline");
  dot.innerHTML = `<i></i> ${s.toUpperCase()}`;
}
function logWS(msg){
  const t = new Date().toLocaleTimeString([], {hour12:false});
  els.wsLog.textContent = `${t} ${msg}\n` + els.wsLog.textContent.slice(0, 2000);
}
function wsSend(obj){
  const payload = JSON.stringify(obj);
  if (ws && ws.readyState===WebSocket.OPEN){ ws.send(payload); logWS(`→ ${payload.slice(0,500)}`); }
  else { logWS(`(offline mock) → ${payload.slice(0,500)}`); }
}
function connectWS(){
  const url = (els.wsUrlInput?.value || localStorage.getItem("zes:vscode:wsUrl") || "ws://localhost:8181").trim();
  localStorage.setItem("zes:vscode:wsUrl", url);
  try{ ws?.close(); }catch{}
  setConn("connecting");
  logWS(`connecting → ${url}`);
  try{ ws = new WebSocket(url); } catch(e){ setConn("error"); logWS(`error: ${e.message}`); return; }
  ws.onopen = ()=>{ setConn("open"); logWS("ws open ✓"); };
  ws.onclose = ()=>{ setConn("closed"); logWS("ws closed"); };
  ws.onerror = ()=>{ setConn("error"); logWS("ws error"); };
  ws.onmessage = (ev)=>{
    const txt = String(ev.data).slice(0,600);
    logWS(`← ${txt}`);
    // try to interpret chat replies
    try{
      const j = JSON.parse(ev.data);
      if (j.type==="chat" && j.message) chatAppend("bot", j.message);
      if (j.type==="terminal" && j.output) termAppend(j.output, "out");
      if (j.type==="fileContent" && j.path) { openFile = { path:j.path, content:j.content, language: langFor(j.path), dirty:false }; renderEditor(); }
    }catch{}
  };
}
$("#reconnectBtn").addEventListener("click", connectWS);
els.wsUrlInput?.addEventListener("change", (e)=> localStorage.setItem("zes:vscode:wsUrl", e.target.value));
$("#clearLog").addEventListener("click", ()=> els.wsLog.textContent="");

// auto-restore url
const savedUrl = localStorage.getItem("zes:vscode:wsUrl");
if (savedUrl && els.wsUrlInput) els.wsUrlInput.value = savedUrl;

// responsive breakpoints note: @media (max-width:640px) triggers mobile stack
