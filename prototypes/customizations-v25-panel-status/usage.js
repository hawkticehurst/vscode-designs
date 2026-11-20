/* V20 — What each session's agent loaded and called, for the panel's Used in This Session section.
   Each entry names a connection (conn), a skill (skill) or an instructions file (file). cost is in USD; stalls flag a row. */
export const USAGE = {
  "cust-proto": [
    { conn: "sprue", uses: "23 calls", tokens: 412000, cost: 8.4 },
    { skill: "comparison-screenshot", uses: "2 runs", tokens: 38400, cost: 0.77 },
    { conn: "playwright", uses: "6 calls", tokens: 22000, cost: 0.44 },
    { file: "copilot-instructions.md", type: "instructions", uses: "Always loaded", tokens: 3100, cost: 0.06 },
  ],
  "settings-proto": [
    { conn: "workiq", uses: "Waiting", tokens: 0, cost: 0, wait: "Needs sign-in" },
    { skill: "settings-editor", uses: "1 run", tokens: 9800, cost: 0.2 },
    { file: "copilot-instructions.md", type: "instructions", uses: "Always loaded", tokens: 3100, cost: 0.06 },
  ],
  "tree-collapse": [
    { skill: "component-fixtures", uses: "1 run", tokens: 9400, cost: 0.19 },
    { conn: "github", uses: "3 calls", tokens: 6200, cost: 0.12 },
    { file: "tree-widgets.instructions.md", type: "instructions", uses: "Always loaded", tokens: 2400, cost: 0.05 },
  ],
  "settings-ia": [
    { file: "CLAUDE.md", type: "instructions", uses: "Always loaded", tokens: 5800, cost: 0.12 },
    { conn: "github", uses: "2 calls", tokens: 3900, cost: 0.08 },
  ],
  triage: [
    { conn: "github", uses: "14 calls", tokens: 41000, cost: 0.82 },
    { skill: "issue-grouping", uses: "1 run", tokens: 18200, cost: 0.36 },
    { conn: "slack", uses: "Asked once", tokens: 0, cost: 0, wait: "Off in this session" },
  ],
  perf: [
    { conn: "playwright", uses: "4 calls", tokens: 12600, cost: 0.25, stalls: { n: 2, secs: 48 } },
    { skill: "chat-perf", uses: "1 run", tokens: 7900, cost: 0.16 },
  ],
  fedora: [{ file: "CLAUDE.md", type: "instructions", uses: "Always loaded", tokens: 5800, cost: 0.12 }],
  "export-skill": [{ file: "AGENTS.md", type: "instructions", uses: "Always loaded", tokens: 1900, cost: 0.04 }],
};

// The panel's sections, in their default order. Presets pick and order them; the Customize Panel page edits them.
export const SECTIONS = [
  { id: "needs", label: "Needs Attention", desc: "Sign-ins and errors. The chat also asks when the agent needs one." },
  { id: "activity", label: "Used in This Session", desc: "What the agent loaded and called, with cost and stalls." },
  { id: "plugins", label: "Plugins", desc: "Plugins and the MCP servers and skills they bring." },
  { id: "mcp", label: "MCP Servers", desc: "Servers you added yourself, with their session switches." },
  { id: "more", label: "Skills, Instructions & Agents", desc: "This repo's customizations and your own skills." },
];
export const PRESETS = [
  { id: "minimal", label: "Minimal", sections: ["mcp", "more"] },
  { id: "default", label: "Default", sections: ["activity", "plugins", "mcp", "more"] },
  { id: "troubleshoot", label: "Troubleshooting", sections: ["needs", "activity", "mcp", "plugins"] },
  { id: "everything", label: "Everything", sections: ["needs", "activity", "plugins", "mcp", "more"] },
];

const KEY = "sprue.v20.panel";
const fresh = () => ({ preset: "default", order: ["activity", "plugins", "mcp", "more", "needs"], shown: [...PRESETS[1].sections], hoverSwitches: true, cost: true });
function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && Array.isArray(v.order) && Array.isArray(v.shown) && v.order.length === SECTIONS.length) return { ...fresh(), ...v };
  } catch {}
  return fresh();
}
export const layout = load();
export const saveLayout = () => { try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch {} };
export function applyPreset(id) {
  const p = PRESETS.find((x) => x.id === id);
  layout.preset = id;
  layout.shown = [...p.sections];
  layout.order = [...p.sections, ...SECTIONS.map((s) => s.id).filter((s) => !p.sections.includes(s))];
  saveLayout();
}
export function resetLayout() { Object.assign(layout, fresh()); saveLayout(); }
// After a manual edit, the layout keeps a preset's name only while it still matches it.
export function settlePreset() {
  const vis = layout.order.filter((s) => layout.shown.includes(s)).join();
  layout.preset = PRESETS.find((p) => p.sections.join() === vis)?.id || "custom";
  saveLayout();
}
export const money = (n) => (n > 0 ? `$${n.toFixed(2)}` : "");
