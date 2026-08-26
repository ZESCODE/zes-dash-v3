// scaffold.mjs — Phase 2: mode detection + prompt scaffolding + project context
// Uses ~/zes-language-library language definitions for project-type detection.
import fs from "node:fs";
import path from "node:path";

const LIB_LANG_DIR = path.join(
  process.env.HOME || "/data/data/com.termux/files/home",
  "zes-language-library", "languages"
);
const MODES = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "modes.json"), "utf8"));

export function detectMode(text = "") {
  const t = (text || "").toLowerCase();
  let best = "general";
  let bestScore = 0;
  for (const [name, def] of Object.entries(MODES)) {
    if (name === "general") continue;
    let score = 0;
    for (const kw of def.match) if (t.includes(kw)) score++;
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return { mode: best, score: bestScore };
}

// Scan cwd shallowly and match filenames against zes-language-library patterns.
export function detectProjectTypes(cwd) {
  const found = new Set();
  let entries = [];
  try {
    entries = fs.readdirSync(cwd, { withFileTypes: true })
      .slice(0, 300)
      .map((d) => d.name);
  } catch {
    return [];
  }
  const rel = entries.join("\n");
  let defs = [];
  try {
    defs = fs.readdirSync(LIB_LANG_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try { return JSON.parse(fs.readFileSync(path.join(LIB_LANG_DIR, f), "utf8")); }
        catch { return null; }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
  for (const def of defs) {
    const pats = [...(def.patterns || []), ...(def.extensions || [])];
    for (const pat of pats) {
      if (pat.startsWith("**/")) {
        const base = pat.replace("**/", "").replace(/\*/g, "");
        if (entries.some((e) => e.includes(base))) { found.add(def.id); break; }
      } else if (pat.startsWith(".")) {
        // extension match against files two levels deep max
        if (rel.split("\n").some((e) => e.endsWith(pat))) { found.add(def.id); break; }
      }
    }
  }
  return [...found];
}

export function buildPrompt(task) {
  const { mode } = detectMode(`${task.title} ${task.description || ""} ${task.prompt || ""}`);
  const def = MODES[mode] || MODES.general;
  const parts = [];
  parts.push(`# Task: ${task.title}`);
  if (task.description) parts.push(task.description);
  if (task.prompt && task.prompt !== task.title) parts.push(task.prompt);

  const ctx = [];
  ctx.push(`mode: ${mode}`);
  if (task.cwd) {
    ctx.push(`working directory: ${task.cwd}`);
    const types = detectProjectTypes(task.cwd);
    if (types.length) ctx.push(`detected project types: ${types.join(", ")} (respect their conventions)`);
  }
  parts.push(`# Context\n${ctx.join("\n")}`);

  parts.push(`# Constraints\n${def.constraints.map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
  return { mode, prompt: parts.join("\n\n") };
}
