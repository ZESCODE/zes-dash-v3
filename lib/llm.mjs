#!/usr/bin/env node
// llm.mjs — one-shot LLM worker via local ZESRouter (:5050, keyless providers)
// usage: node llm.mjs <model> <prompt>
// stdout = assistant content only; errors -> stderr + exit 1
const [model, ...rest] = process.argv.slice(2);
const prompt = rest.join(" ");
if (!model || !prompt) { console.error("usage: llm.mjs <model> <prompt>"); process.exit(2); }

try {
  const r = await fetch("http://127.0.0.1:5050/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_tokens: 4000 }),
    signal: AbortSignal.timeout(900000),
  });
  const j = await r.json();
  if (j.error) {
    console.error("LLM error:", JSON.stringify(j.error).slice(0, 300));
    process.exit(1);
  }
  const out = j.choices?.[0]?.message?.content;
  if (!out) { console.error("empty response:", JSON.stringify(j).slice(0, 200)); process.exit(1); }
  console.log(out);
} catch (e) {
  console.error("request failed:", String(e.message || e));
  process.exit(1);
}
