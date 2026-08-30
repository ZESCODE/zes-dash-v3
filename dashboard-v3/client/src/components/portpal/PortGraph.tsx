import { useEffect, useRef } from "react";
import type { PortGraphData, PortGraphNode } from "@/lib/portpal";
import { FROST_HEX, categoryFrost } from "@/lib/portpal";

/* ============================================================
   PortGraph — PortPal's D3 topology map, re-implemented with a
   tiny built-in force simulation (no d3 dependency, mobile-first).
   · touch-drag nodes · pan · pinch zoom · tap to inspect
   · frost-colored nodes by framework category
   ============================================================ */

interface SimNode {
  id: string;
  data: PortGraphNode;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  r: number;
  color: string;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function nodeRadius(n: PortGraphNode) {
  return n.isDev ? 21 : 14;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[K];
}

export function PortGraph({
  graph,
  selectedId,
  onSelect,
  className,
}: {
  graph: PortGraphData;
  selectedId: string | null;
  onSelect: (n: PortGraphNode | null) => void;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef<SVGGElement>(null);
  const edgeRef = useRef<SVGGElement>(null);
  const nodeRef = useRef<SVGGElement>(null);

  // simulation state kept in refs — DOM updates are imperative (60fps on mobile)
  const nodes = useRef(new Map<string, { sim: SimNode; el: SVGGElement }>());
  const edges = useRef<{ key: string; a: SimNode; b: SimNode; path: SVGPathElement }[]>([]);
  const size = useRef({ w: 0, h: 0 });
  const alpha = useRef(0);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ id: string | null; moved: boolean; sx: number; sy: number } | null>(null);
  const pan = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; cx: number; cy: number; k: number; vx: number; vy: number } | null>(null);
  const selectedRef = useRef<string | null>(null);
  const rafRef = useRef(0);
  const flowOff = useRef(0);
  const didInit = useRef(false);

  selectedRef.current = selectedId;

  /* ---------- view transform ---------- */

  function applyView() {
    const v = view.current;
    viewRef.current?.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.k})`);
  }

  function zoomAt(cx: number, cy: number, factor: number) {
    const v = view.current;
    const k = Math.min(3.5, Math.max(0.3, v.k * factor));
    const ratio = k / v.k;
    v.x = cx - (cx - v.x) * ratio;
    v.y = cy - (cy - v.y) * ratio;
    v.k = k;
    applyView();
  }

  function fitView() {
    const { w, h } = size.current;
    if (!w || !h) return;
    const list = [...nodes.current.values()];
    if (!list.length) {
      view.current = { x: 0, y: 0, k: 1 };
      applyView();
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const { sim } of list) {
      minX = Math.min(minX, sim.x - sim.r); maxX = Math.max(maxX, sim.x + sim.r);
      minY = Math.min(minY, sim.y - sim.r); maxY = Math.max(maxY, sim.y + sim.r);
    }
    const bw = Math.max(60, maxX - minX);
    const bh = Math.max(60, maxY - minY);
    const pad = 34;
    const k = Math.min(2.2, Math.max(0.35, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    view.current = { x: w / 2 - cx * k, y: h / 2 - cy * k, k };
    applyView();
  }

  /* ---------- node/edge DOM sync ---------- */

  function paintNode(g: SVGGElement, sim: SimNode) {
    const selected = selectedRef.current === sim.id;
    g.setAttribute("transform", `translate(${sim.x} ${sim.y})`);
    g.setAttribute("opacity", "1");

    const ring = g.querySelector<SVGCircleElement>(".ring");
    const glow = g.querySelector<SVGCircleElement>(".glow");
    const core = g.querySelector<SVGCircleElement>(".core");
    const badgeG = g.querySelector<SVGGElement>(".badge");
    const portT = g.querySelector<SVGTextElement>(".port-t");
    const projT = g.querySelector<SVGTextElement>(".proj-t");
    const fwT = g.querySelector<SVGTextElement>(".fw-t");

    if (ring) { ring.setAttribute("r", String(sim.r + 12)); ring.setAttribute("stroke", sim.color); }
    if (glow) { glow.setAttribute("r", String(sim.r + 6)); glow.setAttribute("stroke", sim.color); }
    if (core) {
      core.setAttribute("r", String(sim.r));
      core.setAttribute("stroke", sim.color);
      core.setAttribute("stroke-width", selected ? "3" : "1.5");
      core.setAttribute("fill", selected ? `${sim.color}44` : `${sim.color}1f`);
      core.setAttribute("opacity", selected ? "1" : "0.92");
    }
    if (portT) {
      portT.setAttribute("fill", sim.color);
      portT.setAttribute("font-size", sim.data.isDev ? "12" : "10");
      portT.setAttribute("dy", sim.data.projectName ? "-7" : "0.1");
    }
    if (projT) {
      projT.textContent = (sim.data.projectName ?? "").slice(0, 11);
      projT.setAttribute("display", sim.data.projectName ? "inline" : "none");
    }
    if (fwT) {
      const fw = sim.data.framework;
      fwT.textContent = fw ? fw.toUpperCase() : "";
      fwT.setAttribute("display", fw ? "inline" : "none");
      fwT.setAttribute("fill", sim.color);
      fwT.setAttribute("dy", sim.data.isDev ? "-34" : "-27");
    }
    if (badgeG) {
      const show = sim.data.connectionCount > 0;
      badgeG.setAttribute("display", show ? "inline" : "none");
      if (show) {
        badgeG.setAttribute("transform", `translate(${sim.r - 4} ${-(sim.r - 4)})`);
        const t = badgeG.querySelector("text");
        if (t) t.textContent = String(sim.data.connectionCount);
      }
    }
  }

  function edgePath(a: SimNode, b: SimNode) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const mx = (a.x + b.x) / 2 - (dy / d) * d * 0.1;
    const my = (a.y + b.y) / 2 + (dx / d) * d * 0.1;
    return `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}`;
  }

  function syncGraph(data: PortGraphData) {
    const { w, h } = size.current;
    const cx = w / 2 || 200;
    const cy = h / 2 || 200;

    // --- upsert nodes ---
    const seen = new Set<string>();
    const byId = new Map<string, PortGraphNode>();
    for (const n of data.nodes) byId.set(n.id, n);
    let i = 0;
    const fresh: SimNode[] = [];
    for (const n of data.nodes) {
      seen.add(n.id);
      const existing = nodes.current.get(n.id);
      const color = FROST_HEX[categoryFrost(n.category)] ?? FROST_HEX.blue;
      if (existing) {
        existing.sim.data = n;
        existing.sim.color = color;
        existing.sim.r = nodeRadius(n);
        paintNode(existing.el, existing.sim);
        continue;
      }
      const angle = (i / Math.max(1, data.nodes.length)) * Math.PI * 2 - Math.PI / 2;
      const rad = Math.min(w, h) * 0.3 || 110;
      const sim: SimNode = {
        id: n.id,
        data: n,
        x: cx + Math.cos(angle) * rad + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * rad + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        r: nodeRadius(n),
        color,
      };
      fresh.push(sim);

      // build DOM
      const g = el("g");
      g.setAttribute("class", "pg-node");
      g.dataset.node = n.id;

      const ring = el("circle");
      ring.setAttribute("class", "ring");
      ring.setAttribute("fill", "none");
      ring.setAttribute("stroke-width", "0.6");
      ring.setAttribute("stroke-dasharray", "2 6");
      ring.setAttribute("opacity", "0.22");
      g.appendChild(ring);

      const glow = el("circle");
      glow.setAttribute("class", "glow");
      glow.setAttribute("fill", "none");
      glow.setAttribute("stroke-width", "1");
      glow.setAttribute("opacity", "0.2");
      g.appendChild(glow);

      const core = el("circle");
      core.setAttribute("class", "core");
      core.setAttribute("stroke-width", "1.5");
      g.appendChild(core);

      const portT = el("text");
      portT.setAttribute("class", "port-t");
      portT.setAttribute("text-anchor", "middle");
      portT.setAttribute("dominant-baseline", "central");
      portT.setAttribute("font-family", "JetBrains Mono, monospace");
      portT.setAttribute("font-weight", "700");
      portT.textContent = `:${n.port}`;
      g.appendChild(portT);

      const projT = el("text");
      projT.setAttribute("class", "proj-t");
      projT.setAttribute("text-anchor", "middle");
      projT.setAttribute("y", "9");
      projT.setAttribute("font-family", "Inter, sans-serif");
      projT.setAttribute("font-size", "7.5");
      projT.setAttribute("fill", "rgba(255,255,255,0.4)");
      g.appendChild(projT);

      const fwT = el("text");
      fwT.setAttribute("class", "fw-t");
      fwT.setAttribute("text-anchor", "middle");
      fwT.setAttribute("font-family", "Inter, sans-serif");
      fwT.setAttribute("font-size", "7");
      fwT.setAttribute("font-weight", "700");
      fwT.setAttribute("letter-spacing", "0.1em");
      fwT.setAttribute("opacity", "0.8");
      g.appendChild(fwT);

      const badgeG = el("g");
      badgeG.setAttribute("class", "badge");
      const bc = el("circle");
      bc.setAttribute("r", "7.5");
      bc.setAttribute("fill", "rgba(8,8,14,0.92)");
      bc.setAttribute("stroke", "rgba(167,139,250,0.5)");
      bc.setAttribute("stroke-width", "1");
      const bt = el("text");
      bt.setAttribute("text-anchor", "middle");
      bt.setAttribute("dominant-baseline", "central");
      bt.setAttribute("font-family", "JetBrains Mono, monospace");
      bt.setAttribute("font-size", "7.5");
      bt.setAttribute("font-weight", "700");
      bt.setAttribute("fill", "rgba(210,205,255,0.95)");
      badgeG.appendChild(bc);
      badgeG.appendChild(bt);
      g.appendChild(badgeG);

      // generous touch target
      const hit = el("circle");
      hit.setAttribute("r", String(sim.r + 12));
      hit.setAttribute("fill", "transparent");
      hit.setAttribute("style", "pointer-events:all");
      g.appendChild(hit);

      nodeRef.current?.appendChild(g);
      nodes.current.set(n.id, { sim, el: g });
      paintNode(g, sim);
      i++;
    }

    // --- remove stale nodes ---
    for (const [id, { el: g }] of nodes.current) {
      if (!seen.has(id)) {
        g.remove();
        nodes.current.delete(id);
      }
    }

    // --- rebuild edges (cheap, few) ---
    if (edgeRef.current) edgeRef.current.replaceChildren();
    edges.current = [];
    for (const e of data.edges) {
      const a = nodes.current.get(e.source)?.sim;
      const b = nodes.current.get(e.target)?.sim;
      if (!a || !b) continue;
      const path = el("path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "rgba(64,156,255,0.34)");
      path.setAttribute("stroke-width", "1.4");
      path.setAttribute("stroke-dasharray", "5 6");
      path.setAttribute("marker-end", "url(#pg-arrow)");
      edgeRef.current?.appendChild(path);
      edges.current.push({ key: `${e.source}->${e.target}`, a, b, path });
    }

    alpha.current = 1;
    if (fresh.length && !didInit.current) {
      didInit.current = true;
      // let the first layout settle, then frame it nicely
      setTimeout(() => fitView(), 1600);
    }
  }

  /* ---------- simulation ---------- */

  function step() {
    const list = [...nodes.current.values()].map(({ sim }) => sim);
    if (list.length === 0) return;
    const a = alpha.current;
    if (a < 0.005) return;
    const { w, h } = size.current;
    const cx = w / 2 || 200;
    const cy = h / 2 || 200;

    // repulsion (n is small — O(n²) is fine)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const p = list[i], q = list[j];
        let dx = q.x - p.x, dy = q.y - p.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const d = Math.sqrt(d2);
        const minSep = p.r + q.r + 34;
        const f = (2400 + (p.r + q.r) * 26) / d2;
        const fx = (dx / d) * f * a;
        const fy = (dy / d) * f * a;
        p.vx -= fx; p.vy -= fy;
        q.vx += fx; q.vy += fy;
        // hard collision resolve
        if (d < minSep) {
          const push = (minSep - d) / 2;
          const ux = dx / d, uy = dy / d;
          if (p.fx == null) { p.x -= ux * push; p.y -= uy * push; }
          if (q.fx == null) { q.x += ux * push; q.y += uy * push; }
        }
      }
    }

    // springs along edges
    for (const e of edges.current) {
      const rest = e.a.r + e.b.r + 92;
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - rest) * 0.016 * a;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      e.a.vx += fx; e.a.vy += fy;
      e.b.vx -= fx; e.b.vy -= fy;
    }

    // gravity + integrate
    for (const p of list) {
      p.vx += (cx - p.x) * 0.0016 * a;
      p.vy += (cy - p.y) * 0.0016 * a;
      p.vx *= 0.86;
      p.vy *= 0.86;
      if (p.fx != null) { p.x = p.fx; p.vx = 0; }
      else p.x += Math.max(-14, Math.min(14, p.vx));
      if (p.fy != null) { p.y = p.fy; p.vy = 0; }
      else p.y += Math.max(-14, Math.min(14, p.vy));
    }

    alpha.current = a * 0.992;

    for (const { sim, el: g } of nodes.current.values()) g.setAttribute("transform", `translate(${sim.x} ${sim.y})`);
    for (const e of edges.current) e.path.setAttribute("d", edgePath(e.a, e.b));
  }

  /* ---------- effects ---------- */

  useEffect(() => {
    // refs are set — effect runs after mount; assert for the hoisted closures below
    const wrap = wrapRef.current as HTMLDivElement;
    const svg = svgRef.current as SVGSVGElement;
    if (!wrap || !svg) return;

    function resize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const first = size.current.w === 0;
      size.current = { w, h };
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      if (first && graph.nodes.length) {
        didInit.current = false;
        syncGraph(graph);
      }
    }
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    // ---- rAF loop: sim + edge flow ----
    let running = true;
    function frame() {
      if (!running) return;
      step();
      flowOff.current -= 0.55;
      for (const e of edges.current) e.path.setAttribute("stroke-dashoffset", String(flowOff.current));
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    // ---- pointer interaction ----
    const toLocal = (ev: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      const v = view.current;
      return { x: (ev.clientX - rect.left - v.x) / v.k, y: (ev.clientY - rect.top - v.y) / v.k };
    };

    function onDown(ev: PointerEvent) {
      svg.setPointerCapture(ev.pointerId);
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      const target = (ev.target as Element).closest?.("[data-node]") as SVGGElement | null;
      if (pointers.current.size === 1 && target) {
        const id = target.dataset.node!;
        const entry = nodes.current.get(id);
        if (entry) {
          drag.current = { id, moved: false, sx: ev.clientX, sy: ev.clientY };
          entry.sim.fx = entry.sim.x;
          entry.sim.fy = entry.sim.y;
          alpha.current = Math.max(alpha.current, 0.45);
        }
      } else if (pointers.current.size === 1 && !target) {
        pan.current = { x: ev.clientX, y: ev.clientY };
      }

      if (pointers.current.size === 2) {
        // pinch begins — cancel node drag
        if (drag.current) {
          const entry = nodes.current.get(drag.current.id ?? "");
          if (entry) { entry.sim.fx = null; entry.sim.fy = null; }
          drag.current = null;
        }
        const [p1, p2] = [...pointers.current.values()];
        const rect = svg.getBoundingClientRect();
        pinch.current = {
          dist: Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1,
          cx: (p1.x + p2.x) / 2 - rect.left,
          cy: (p1.y + p2.y) / 2 - rect.top,
          k: view.current.k,
          vx: view.current.x,
          vy: view.current.y,
        };
      }
    }

    function onMove(ev: PointerEvent) {
      if (!pointers.current.has(ev.pointerId)) return;
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      if (pinch.current && pointers.current.size >= 2) {
        const [p1, p2] = [...pointers.current.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
        const p = pinch.current;
        const k = Math.min(3.5, Math.max(0.3, p.k * (dist / p.dist)));
        const rect = svg.getBoundingClientRect();
        const cx = (p1.x + p2.x) / 2 - rect.left;
        const cy = (p1.y + p2.y) / 2 - rect.top;
        const ratio = k / p.k;
        view.current = { k, x: cx - (p.cx - p.vx) * ratio, y: cy - (p.cy - p.vy) * ratio };
        applyView();
        return;
      }

      const d = drag.current;
      if (d) {
        if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 6) d.moved = true;
        const entry = nodes.current.get(d.id ?? "");
        if (entry) {
          const pt = toLocal(ev);
          entry.sim.fx = pt.x;
          entry.sim.fy = pt.y;
          alpha.current = Math.max(alpha.current, 0.4);
        }
        return;
      }

      if (pointers.current.size === 1 && pan.current && !drag.current) {
        // single-finger pan (client deltas — reliable on touch)
        view.current.x += ev.clientX - pan.current.x;
        view.current.y += ev.clientY - pan.current.y;
        pan.current = { x: ev.clientX, y: ev.clientY };
        applyView();
      }
    }

    function onUp(ev: PointerEvent) {
      const had = pointers.current.has(ev.pointerId);
      pointers.current.delete(ev.pointerId);
      if (pointers.current.size < 2) pinch.current = null;
      if (pointers.current.size === 0) pan.current = null;

      const d = drag.current;
      if (d && had) {
        const entry = nodes.current.get(d.id ?? "");
        if (entry) {
          entry.sim.fx = null;
          entry.sim.fy = null;
          if (!d.moved) {
            // tap → select / deselect
            const next = selectedRef.current === d.id ? null : entry.sim.data;
            selectedRef.current = next ? next.id : null;
            for (const [id, { sim, el: g }] of nodes.current.entries()) {
              const isSel = id === selectedRef.current;
              const core = g.querySelector(".core");
              if (core) {
                core.setAttribute("stroke-width", isSel ? "3" : "1.5");
                core.setAttribute("fill", isSel ? `${sim.color}44` : `${sim.color}1f`);
                core.setAttribute("opacity", isSel ? "1" : "0.92");
              }
            }
            onSelect(next);
          }
        }
        drag.current = null;
        return;
      }

      // background tap clears selection
      if (had && pointers.current.size === 0 && !(ev.target as Element).closest?.("[data-node]")) {
        if (selectedRef.current) {
          selectedRef.current = null;
          for (const { sim, el: g } of nodes.current.values()) {
            const core = g.querySelector(".core");
            if (core) {
              core.setAttribute("stroke-width", "1.5");
              core.setAttribute("fill", `${sim.color}1f`);
              core.setAttribute("opacity", "0.92");
            }
          }
          onSelect(null);
        }
      }
    }

    function onWheel(ev: WheelEvent) {
      ev.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(ev.clientX - rect.left, ev.clientY - rect.top, ev.deltaY < 0 ? 1.12 : 1 / 1.12);
    }

    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
    svg.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
      svg.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // data sync (keeps positions across polls — no flicker, like PortPal's cache)
  useEffect(() => {
    if (size.current.w === 0) return;
    syncGraph(graph);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // selection changed from the outside (e.g. inspector closed)
  useEffect(() => {
    for (const [id, { sim, el: g }] of nodes.current.entries()) {
      const isSel = id === selectedId;
      const core = g.querySelector(".core");
      if (core) {
        core.setAttribute("stroke-width", isSel ? "3" : "1.5");
        core.setAttribute("fill", isSel ? `${sim.color}44` : `${sim.color}1f`);
        core.setAttribute("opacity", isSel ? "1" : "0.92");
      }
    }
  }, [selectedId]);

  return (
    <div ref={wrapRef} className={className ?? "relative h-[52vh] min-h-[320px] w-full overflow-hidden"}>
      <svg
        ref={svgRef}
        className="absolute inset-0 size-full"
        style={{ touchAction: "none", cursor: "grab" }}
      >
        <defs>
          <marker id="pg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
            <path d="M2 1.4L8 5L2 8.6" fill="none" stroke="rgba(64,156,255,0.6)" strokeWidth="1.4" strokeLinecap="round" />
          </marker>
          <radialGradient id="pg-vignette" cx="50%" cy="50%" r="75%">
            <stop offset="60%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,8,0.55)" />
          </radialGradient>
          <pattern id="pg-grid" width="38" height="38" patternUnits="userSpaceOnUse">
            <path d="M38 0H0V38" fill="none" stroke="rgba(64,156,255,0.05)" strokeWidth="0.7" />
          </pattern>
        </defs>
        <rect className="pg-bg" width="100%" height="100%" fill="url(#pg-grid)" />
        <g ref={viewRef}>
          <g ref={edgeRef} />
          <g ref={nodeRef} />
        </g>
        <rect className="pg-vin" width="100%" height="100%" fill="url(#pg-vignette)" style={{ pointerEvents: "none" }} />
      </svg>

      {/* zoom controls */}
      <div className="absolute right-2 top-2 flex flex-col gap-1.5">
        <GraphBtn label="+" onClick={() => zoomAt(size.current.w / 2, size.current.h / 2, 1.25)} />
        <GraphBtn label="−" onClick={() => zoomAt(size.current.w / 2, size.current.h / 2, 1 / 1.25)} />
        <GraphBtn label="⤢" onClick={fitView} />
      </div>
    </div>
  );
}

function GraphBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-lg border border-frost-blue/25 bg-black/50 font-mono text-sm text-frost-blue backdrop-blur-md transition hover:border-frost-blue/50 hover:bg-frost-blue/15 active:scale-95"
    >
      {label}
    </button>
  );
}
