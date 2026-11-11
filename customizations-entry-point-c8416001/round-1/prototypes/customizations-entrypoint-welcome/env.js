/* V9 — Environments. Two levels, always labeled:
   - Configure (Agent Window, global): every connection, skill and plugin across every environment and agent, the
     environments themselves, all sessions (each with a Customize button), extensions, and Discover. Installing asks
     where: any set of environments × agents, so one install can go to many places.
   - Customize (one session): the session header's button, the side panel and the composer's Connections pill. They
     show what this session's environment and agent have, and say so ("devbox-1 · Copilot").
   Connections are On, Ask first or Off, saved for the workspace or just this session. Sign-in is only asked when a
   connection is needed. Environments, installs, states and accounts are illustrative. */
import { store, subscribe, renderScopeBar } from "./scope-store.js";
import { openMenu, toast } from "./panel-shell.js";
import { mountLifecycle } from "./lifecycle-view.js";
const { esc } = window.CUST;
const { resolve, workspaceTitle, workspaceLabel, WORKSPACES, HARNESSES, worksWith, items: ALL_ITEMS } = window.SCOPE;
const ICONS = "assets/icons/";

// ---------- Environments and agents ----------
export const ENVS = [
  { id: "local", label: "This Computer", icon: "device-desktop", detail: "MacBook Pro · macOS", agents: ["copilot", "claude", "codex"], workspaces: ["vscode", "adt", "research-journal"] },
  { id: "devbox-1", label: "devbox-1", icon: "remote", detail: "SSH · Ubuntu 24.04", agents: ["copilot", "claude"], workspaces: ["vscode"] },
  { id: "cloud", label: "Cloud", icon: "cloud", detail: "Copilot cloud agent", agents: ["copilot"], workspaces: ["vscode"] },
  { id: "hawks-framework", label: "hawks-framework", icon: "remote", detail: "Tunnel · Fedora 41", agents: ["copilot", "claude", "codex"], workspaces: ["vscode", "adt"] },
  { id: "mac-mini-1", label: "mac-mini-1", icon: "remote", detail: "SSH · macOS", agents: ["copilot", "claude"], workspaces: ["vscode"] },
  { id: "mac-mini-2", label: "mac-mini-2", icon: "remote", detail: "SSH · macOS", agents: ["copilot"], workspaces: ["vscode", "research-journal"], offline: true },
];
// The extra environments also show up in the composer's environment picker and the panel's scope chips.
{
  const { ENVIRONMENTS } = window.SCOPE, picker = window.ds.vscode.chatPickers.data.environments;
  for (const e of ENVS) {
    if (!ENVIRONMENTS[e.id]) ENVIRONMENTS[e.id] = { label: e.label, icon: e.icon };
    if (!picker.some((x) => x.id === e.id)) picker.splice(picker.findIndex((x) => x.type === "separator"), 0, { id: e.id, label: e.label, icon: e.icon });
  }
}
const AGENTS = ["copilot", "claude", "codex"];
const envOf = (id) => ENVS.find((e) => e.id === id);
const K = (e, a) => `${e}:${a}`;
const split = (k) => k.split(":");
const ALL_SLOTS = ENVS.flatMap((e) => e.agents.map((a) => K(e.id, a)));
const S = (...ks) => new Set(ks);
const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
const placeLabel = (k) => { const [e, a] = split(k); return `${envOf(e).label} (${HARNESSES[a].label})`; };
const sessions = () => window.__SESSIONS || {};
const slotOf = (s) => K(s.scope.environment, s.scope.harness);
/** Plugins only load in Copilot; everything else works with every agent. */
const supports = (it, agent) => it.kind !== "plugin" || agent === "copilot";

// ---------- What's installed where ----------
const CONNECTIONS = [
  { kind: "connection", id: "github", name: "GitHub", icon: { img: "github.png" }, account: "hawkticehurst", does: "Issues, pull requests and code search", at: new Set(ALL_SLOTS), def: "on" },
  { kind: "connection", id: "slack", name: "Slack", icon: { img: "slack.png" }, account: "hawkticehurst", does: "Read channels and threads, send messages", at: S("local:copilot", "local:claude", "devbox-1:copilot", "hawks-framework:copilot", "mac-mini-1:copilot"), def: "ask" },
  { kind: "connection", id: "figma", name: "Figma", icon: { img: "figma-figma.png" }, account: "hawk@contoso.com", does: "Read design files and components", at: S("local:copilot", "local:claude", "hawks-framework:claude"), def: "on", ws: { vscode: "off" }, card: "Figma MCP Server" },
  { kind: "connection", id: "workiq", name: "Work IQ", icon: { img: "microsoft-workiq.png" }, account: "hawk@microsoft.com", does: "Email, meetings and files in Microsoft 365", at: S("local:copilot", "devbox-1:copilot", "cloud:copilot", "hawks-framework:copilot"), def: "ask", state: "signin" },
  { kind: "connection", id: "kusto", name: "Azure Data Explorer", icon: { img: "kusto.png" }, account: "hawk@microsoft.com", does: "Run Kusto queries", at: S("local:copilot"), def: "on", state: "error" },
  { kind: "connection", id: "playwright", name: "Playwright", icon: { img: "microsoft-playwright.png" }, account: null, does: "Drive a browser", at: S("local:copilot", "local:claude", "local:codex", "hawks-framework:copilot", "mac-mini-1:copilot", "mac-mini-2:copilot"), def: "on", card: "Playwright MCP" },
  { kind: "connection", id: "sprue", name: "Sprue", icon: { img: "sprue.png" }, account: null, does: "Design prototypes and systems", at: S("local:copilot"), def: "on" },
];
// Your skills live on each machine, per agent (~/.copilot/skills, ~/.claude/skills): some aren't on devbox-1 yet.
const USER_SKILLS = ALL_ITEMS.filter((it) => it.type === "skills" && it.source === "user").map((it, i) => ({
  kind: "skill", id: it.name, name: it.name, path: it.path,
  at: S(...["local:copilot", i < 10 && "local:claude", i < 12 && "devbox-1:copilot", i < 14 && "hawks-framework:copilot", i < 6 && "hawks-framework:claude", i < 8 && "mac-mini-1:copilot"].filter(Boolean)),
}));
const PLUGINS = [
  { kind: "plugin", id: "security", name: "Security & Code Quality Plugin", icon: { img: "github-security-best-practices.png" }, sub: "Skills and an MCP server", at: S("local:copilot", "mac-mini-1:copilot"), card: "Security & Code Quality Plugin" },
];
const LISTS = { connection: CONNECTIONS, skill: USER_SKILLS, plugin: PLUGINS };
const findItem = (kind, id) => LISTS[kind].find((x) => x.id === id);
const conn = (id) => CONNECTIONS.find((c) => c.id === id);
// Skills saved to a repo from a session (they follow the repo to every environment).
const REPO_SAVED = [];
// Skills from other sources a variant adds (organization, extensions): { name, source, origin: { kind, label }, envs? }.
export const EXTRA_SKILLS = [];
export const hooks = {};
// What sessions in a workspace usually rely on: if one is missing on a session's environment, the panel says so.
const EXPECTS = { vscode: ["github", "slack", "playwright"] };

// ---------- On / Ask first / Off ----------
const POLICY = { on: "On", ask: "Ask first", off: "Off" };
const TRI_LABEL = { on: "On", ask: "Ask", off: "Off" };
const TRI_TIP = { on: "On: agents use it when they need it", ask: "Ask first: agents can see it and ask you before using it", off: "Off: agents can't see it" };
const sesPol = new Map(); // session key -> Map(connection id -> policy)
const skey = () => store.session?.id || "new";
const ws = () => store.scope.workspace;
const canWs = () => !!WORKSPACES[ws()];
/** Effective policy here, and where it comes from: this session, the workspace or the default. */
function polOf(c, sk = skey(), w = ws()) {
  const s = sesPol.get(sk)?.get(c.id);
  if (s) return { v: s, from: "session" };
  if (c.ws?.[w]) return { v: c.ws[w], from: "workspace" };
  return { v: c.def, from: "default" };
}
let applyTo = "workspace"; // where switches in the panel and popover save: "workspace" or "session"
const where = () => (canWs() ? applyTo : "session");
function setPol(c, v) {
  if (where() === "workspace") { c.ws = { ...c.ws, [ws()]: v }; sesPol.get(skey())?.delete(c.id); }
  else { if (!sesPol.has(skey())) sesPol.set(skey(), new Map()); sesPol.get(skey()).set(c.id, v); }
  changed();
  toast(`${c.name}: ${POLICY[v]} ${where() === "workspace" ? `for sessions in ${workspaceLabel(ws())}` : store.mode === "session" ? "in this session" : "in the session you're starting"}.`);
}

// ---------- Here: this session's (or the next session's) environment and agent ----------
const hereKey = () => K(store.scope.environment, store.scope.harness);
const hereEnv = () => envOf(store.scope.environment);
const connsAt = (k, w) => CONNECTIONS.filter((c) => c.at.has(k) && (!c.workspace || c.workspace === w));
const connsHere = () => connsAt(hereKey(), ws());
function skillsAt(scope) {
  const k = K(scope.environment, scope.harness);
  const mine = new Set(USER_SKILLS.filter((s) => s.at.has(k)).map((s) => s.name));
  const { applies } = resolve(scope);
  const base = applies.filter((it) => it.type === "skills" && (it.source !== "user" || mine.has(it.name)));
  const added = USER_SKILLS.filter((s) => s.isNew && s.at.has(k)).map((s) => ({ type: "skills", name: s.name, source: "user", isNew: true }));
  const repo = REPO_SAVED.filter((s) => s.workspace === scope.workspace);
  const extra = EXTRA_SKILLS.filter((s) => !s.envs || s.envs.includes(scope.environment));
  return [...base, ...added, ...repo, ...extra];
}
const skillsHere = () => skillsAt(store.scope);
function missingHere() {
  if (store.scope.environment === "local" || dismissed.has(skey())) return null;
  const ref = K("local", store.scope.harness), k = hereKey();
  if (!hereEnv()?.agents.includes(store.scope.harness)) return null;
  const conns = CONNECTIONS.filter((c) => c.at.has(ref) && !c.at.has(k) && (EXPECTS[ws()] || []).includes(c.id));
  const skills = USER_SKILLS.filter((s) => s.at.has(ref) && !s.at.has(k));
  return conns.length || skills.length ? { conns, skills } : null;
}
const dismissed = new Set();
const USED = { triage: { skills: ["issue-grouping"], conns: [["github", "Searched issues · label:customization-migration"]] }, "tree-collapse": { skills: ["component-fixtures"], conns: [] } };

// ---------- Change notification ----------
const subs = new Set();
const changed = () => subs.forEach((f) => f());
subscribe(() => changed());

// ---------- Pieces ----------
const iconHtml = (c, size = 20) => c.icon?.img || c.icon?.src ? `<img class="ev-logo" src="${c.icon.src || ICONS + c.icon.img}" alt="" style="width:${size}px;height:${size}px">`
  : `<span class="ev-logo ev-logo-glyph" style="width:${size}px;height:${size}px"><span class="codicon codicon-${c.kind === "plugin" ? "ai-customization-plugin" : c.kind === "skill" ? "ai-customization-skill" : "plug"}"></span></span>`;
/** "devbox-1 · Copilot" with their icons: the label for where something applies. */
const placeChip = (k = hereKey(), cls = "") => {
  const [e, a] = split(k), en = envOf(e);
  return `<span class="en-place ${cls}"><span class="codicon codicon-${en?.icon || "remote"}" aria-hidden="true"></span>${esc(en?.label || e)}<span class="en-place-sep" aria-hidden="true">·</span><span class="codicon codicon-${HARNESSES[a].icon}" aria-hidden="true"></span>${esc(HARNESSES[a].label)}</span>`;
};
const tri = (c, attr = "data-tri", v = polOf(c).v) => `<div class="en-tri" role="radiogroup" aria-label="${esc(c.name)}">${["on", "ask", "off"].map((k) =>
  `<button type="button" role="radio" aria-checked="${v === k}" ${attr}="${c.id}" data-v="${k}" title="${TRI_TIP[k]}">${TRI_LABEL[k]}</button>`).join("")}</div>`;
function connSub(c) {
  if (c.state === "error") return `<span class="ev-warn en-err"><span class="codicon codicon-error" aria-hidden="true"></span>Stopped responding</span>`;
  const p = polOf(c), bits = [];
  if (c.state === "signin") bits.push(`<span title="You'll be asked to sign in the first time an agent needs it">Sign in when needed</span>`);
  else if (c.account) bits.push(esc(c.account));
  if (p.from === "session") bits.push("This session only");
  return bits.join(" · ");
}
function connRow(c) {
  const v = polOf(c).v;
  return `<div class="ev-row ev-conn${v === "off" ? " is-off" : ""}" data-conn="${c.id}">
    ${iconHtml(c)}<div class="ev-row-text"><div class="ev-row-name">${hooks.openDetail ? `<button class="en-name-link" data-detail="connections|${c.id}" title="Show details">${esc(c.name)}</button>` : esc(c.name)}${c.isNew ? '<span class="lc-flag on">New</span>' : ""}</div><div class="ev-row-sub">${connSub(c)}</div></div>
    ${c.state === "error" ? `<button class="ev-icon-btn" data-restart="${c.id}" aria-label="Restart ${esc(c.name)}" title="Restart"><span class="codicon codicon-debug-restart"></span></button>` : ""}
    ${tri(c)}
    <vsc-toolbar label="${esc(c.name)} Actions"><vsc-action icon="ellipsis" label="More Actions..." data-conn-more="${c.id}"></vsc-action></vsc-toolbar>
  </div>`;
}
function applyToHtml() {
  if (!canWs()) return "";
  return `<div class="en-apply" role="radiogroup" aria-label="Changes apply to"><span class="en-apply-label">Save for</span>
    <button type="button" role="radio" aria-checked="${applyTo === "workspace"}" data-apply="workspace" title="Every session in ${esc(workspaceLabel(ws()))}">This workspace</button>
    <button type="button" role="radio" aria-checked="${applyTo === "session"}" data-apply="session" title="${store.mode === "session" ? "Only this session" : "Only the session you're starting"}">This session</button></div>`;
}

// ---------- Install to many places ----------
let dlg = null;
const closeDialog = () => { dlg?.remove(); dlg = null; };
/** opts: { items, mode: "new" | "edit" | "copy", preset: [slot keys], here: slot key, title, onDone(item) }. A variant can swap the flow (setInstallImpl). */
let installImpl = null;
export function setInstallImpl(fn) { installImpl = fn; }
export function openInstall(opts) { return (installImpl || matrixInstall)(opts); }
function matrixInstall(opts) {
  closeDialog();
  const { items, mode } = opts;
  const single = items.length === 1, it0 = items[0];
  const valid = (k) => { const [e, a] = split(k); return envOf(e).agents.includes(a) && items.some((it) => supports(it, a)); };
  const st = {
    sel: new Set(mode === "edit" ? [...it0.at] : (opts.preset || ALL_SLOTS).filter(valid)),
    picked: new Set(items.map((x) => x.id)),
    scope: "all", pol: it0.kind === "connection" ? (it0.def || "on") : null,
  };
  const block = document.createElement("div");
  block.className = "en-dlg-block";
  const title = opts.title || (mode === "edit" ? `Where ${it0.name} is installed` : `Install ${it0.name}`);
  function sessionsAffected() { return Object.values(sessions()).filter((s) => st.sel.has(slotOf(s))).length; }
  function summary() {
    const envs = new Set([...st.sel].map((k) => split(k)[0])).size, n = st.sel.size, s = sessionsAffected();
    if (st.scope !== "all" && it0.kind === "skill") return `Saved to ${workspaceLabel(st.scope)}/.github/skills/ · follows the repo to every environment`;
    if (mode === "edit") {
      const add = [...st.sel].filter((k) => !it0.at.has(k)).length, rem = [...it0.at].filter((k) => !st.sel.has(k)).length;
      if (!add && !rem) return `Installed in ${plural(n, "place")} across ${plural(envs, "environment")}`;
      return [add && `Adds ${plural(add, "place")}`, rem && `removes ${plural(rem, "place")}`].filter(Boolean).join(", ") + (s ? ` · affects ${plural(s, "session")}` : "");
    }
    if (!n) return "Pick at least one environment and agent";
    return `${plural(n, "place")} across ${plural(envs, "environment")}${s ? ` · ${plural(s, "session")} can use it from their next message` : ""}`;
  }
  const presets = () => {
    const out = [];
    if (opts.here) out.push(["here", `Only ${placeLabel(opts.here)}`]);
    out.push(["local", "This Computer"], ["all", "Everywhere"], ["none", "Clear"]);
    return out.map(([id, l]) => `<button type="button" class="ev-link" data-preset="${id}">${esc(l)}</button>`).join('<span class="en-dot-sep" aria-hidden="true">·</span>');
  };
  function matrix() {
    const repo = st.scope !== "all" && it0.kind === "skill";
    return `<table class="en-matrix en-dlg-m${repo ? " is-locked" : ""}"><thead><tr><th class="en-m-name"></th>${AGENTS.map((a) => `<th class="en-m-agent"><span class="codicon codicon-${HARNESSES[a].icon}" aria-hidden="true"></span>${HARNESSES[a].label}</th>`).join("")}</tr></thead>
      <tbody>${ENVS.map((e) => {
        const n = Object.values(sessions()).filter((s) => s.scope.environment === e.id).length;
        return `<tr><th class="en-m-name" scope="row"><span class="en-env-cell"><span class="codicon codicon-${e.icon}" aria-hidden="true"></span><span><span class="en-env-name">${esc(e.label)}</span><small>${esc(e.detail)}${e.offline ? " · Offline, installs when it reconnects" : n ? ` · ${plural(n, "session")}` : ""}</small></span></span></th>
          ${AGENTS.map((a) => {
            const k = K(e.id, a);
            if (!e.agents.includes(a)) return `<td class="en-m-cell"><span class="en-na" title="${HARNESSES[a].label} isn't set up on ${esc(e.label)}">—</span></td>`;
            if (!items.some((it) => supports(it, a))) return `<td class="en-m-cell"><span class="en-na" title="Copilot plugins don't load in ${HARNESSES[a].label}">—</span></td>`;
            const had = mode === "edit" && it0.at.has(k);
            return `<td class="en-m-cell"><vsc-checkbox data-slot="${k}"${st.sel.has(k) ? " checked" : ""}${repo ? " disabled" : ""} label="${esc(e.label)}, ${HARNESSES[a].label}"></vsc-checkbox>${had && !st.sel.has(k) ? '<span class="en-cell-note">Remove</span>' : ""}</td>`;
          }).join("")}</tr>`;
      }).join("")}</tbody></table>`;
  }
  function render() {
    const scopeSec = mode !== "copy" && it0.kind !== "plugin" && WORKSPACES[ws()] ? `<div class="en-dlg-sec"><div class="en-dlg-label">Workspaces</div>
        <div class="ev-seg" role="radiogroup">
          <button class="ev-seg-btn" type="button" role="radio" aria-checked="${st.scope === "all"}" data-dscope="all">All workspaces<small>${it0.kind === "skill" ? "Installed on each machine you pick" : "Any session in the places you pick"}</small></button>
          <button class="ev-seg-btn" type="button" role="radio" aria-checked="${st.scope !== "all"}" data-dscope="${ws()}">Only ${esc(workspaceLabel(ws()))}<small>${it0.kind === "skill" ? "Saved to the repo; follows it everywhere" : `Saved in ${esc(workspaceLabel(ws()))}/.vscode/mcp.json`}</small></button>
        </div></div>` : "";
    const polSec = mode === "new" && it0.kind === "connection" ? `<div class="en-dlg-sec en-dlg-inline"><div class="en-dlg-label">When agents use it</div>${tri({ id: "dlg", name: it0.name }, "data-dpol", st.pol)}</div>` : "";
    const itemsSec = !single ? `<div class="en-dlg-sec"><div class="en-dlg-label">Customizations</div><div class="en-dlg-items">${items.map((it) => `
        <label class="en-dlg-item"><vsc-checkbox data-pick="${esc(it.id)}"${st.picked.has(it.id) ? " checked" : ""} label="${esc(it.name)}"></vsc-checkbox>${iconHtml(it, 16)}<span class="en-dlg-item-name">${esc(it.name)}</span><small>${it.kind === "connection" ? "Connection" : it.kind === "plugin" ? "Plugin" : "Your skill"}</small></label>`).join("")}</div></div>` : "";
    const ok = mode === "edit" ? "Save" : mode === "copy" ? `Install ${plural([...st.picked].length, "item")}` : "Install";
    const disabled = (mode !== "edit" && !st.sel.size && !(st.scope !== "all" && it0.kind === "skill")) || (!single && !st.picked.size);
    block.innerHTML = `<div class="en-dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="en-dlg-head">${single ? iconHtml(it0, 28) : '<span class="ev-logo ev-logo-glyph" style="width:28px;height:28px"><span class="codicon codicon-cloud-download"></span></span>'}
        <div class="ev-row-text"><h2>${esc(title)}</h2><div class="ev-row-sub">${esc(opts.sub || (single ? (it0.does || it0.sub || (it0.kind === "skill" ? "Skill" : "")) : "Pick what to install, and where"))}</div></div>
        <button class="ev-icon-btn" data-dlg-close aria-label="Close" title="Close"><span class="codicon codicon-close-compact"></span></button></header>
      <div class="en-dlg-body">${itemsSec}
        <div class="en-dlg-sec"><div class="en-dlg-label-row"><span class="en-dlg-label">Environments and agents</span><span class="grow"></span>${presets()}</div>${matrix()}</div>
        ${scopeSec}${polSec}
      </div>
      <footer class="en-dlg-foot"><span class="en-dlg-sum">${esc(summary())}</span><button class="ev-btn" data-dlg-close>Cancel</button><button class="ev-btn primary" data-dlg-ok${disabled ? " disabled" : ""}>${ok}</button></footer>
    </div>`;
  }
  function apply() {
    const sel = new Set(st.sel), repo = st.scope !== "all";
    if (mode === "edit") {
      const before = new Set(it0.at);
      it0.at = sel;
      if (repo && it0.kind === "connection") it0.workspace = st.scope; else if (!repo) delete it0.workspace;
      const add = [...sel].filter((k) => !before.has(k)), rem = [...before].filter((k) => !sel.has(k));
      toast(add.length || rem.length ? `${it0.name}: ${[add.length && `installed on ${add.map(placeLabel).join(", ")}`, rem.length && `removed from ${rem.map(placeLabel).join(", ")}`].filter(Boolean).join("; ")}.` : `No changes to ${it0.name}.`,
        ["Undo"], () => { it0.at = before; changed(); });
    } else if (mode === "copy") {
      const picked = items.filter((x) => st.picked.has(x.id));
      for (const it of picked) for (const k of sel) if (supports(it, split(k)[1])) it.at.add(k);
      toast(`Installed ${plural(picked.length, "customization")} on ${[...sel].map(placeLabel).join(", ")}.`);
      opts.onDone?.();
    } else {
      const it = { ...it0, at: sel, isNew: true };
      if (it.kind === "connection") { it.def = st.pol || "on"; if (repo) it.workspace = st.scope; }
      if (it.kind === "skill" && repo) { REPO_SAVED.push({ type: "skills", name: it.name, source: "workspace", workspace: st.scope, isNew: true }); }
      else LISTS[it.kind].push(it);
      toast(it.kind === "skill" && repo ? `Saved ${it.name} to ${workspaceLabel(st.scope)}. Commit it to share it with your team.` : `Installed ${it.name} on ${[...sel].map(placeLabel).join(", ")}.`);
      opts.onDone?.(it);
    }
    closeDialog();
    changed();
  }
  block.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    if (e.target === block || t("[data-dlg-close]")) return closeDialog();
    if (t("[data-dlg-ok]:not([disabled])")) return apply();
    const cb = t("vsc-checkbox[data-slot]");
    if (cb) { cb.hasAttribute("checked") ? st.sel.add(cb.dataset.slot) : st.sel.delete(cb.dataset.slot); return render(); }
    const pk = t("vsc-checkbox[data-pick]");
    if (pk) { pk.hasAttribute("checked") ? st.picked.add(pk.dataset.pick) : st.picked.delete(pk.dataset.pick); return render(); }
    const pr = t("[data-preset]");
    if (pr) {
      const p = pr.dataset.preset;
      st.sel = new Set(p === "here" ? [opts.here] : p === "local" ? ALL_SLOTS.filter((k) => k.startsWith("local:")) : p === "all" ? ALL_SLOTS : []);
      st.sel = new Set([...st.sel].filter(valid));
      return render();
    }
    const sc = t("[data-dscope]");
    if (sc) { st.scope = sc.dataset.dscope; return render(); }
    const dp = t("[data-dpol]");
    if (dp) { st.pol = dp.dataset.v; return render(); }
  });
  render();
  document.getElementById("wb").append(block);
  dlg = block;
  requestAnimationFrame(() => block.querySelector("[data-dlg-ok]")?.focus());
}
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && dlg && !document.querySelector("vsc-menu")) { e.preventDefault(); e.stopImmediatePropagation(); closeDialog(); } }, true);

// ---------- Composer: Connections pill + popover ----------
let popover = null;
function closePopover() { popover?.remove(); popover = null; }
function pillHtml() {
  const list = connsHere(), on = list.filter((c) => polOf(c).v !== "off"), problem = on.some((c) => c.state === "error");
  return `<button class="ev-pill" data-conn-pill aria-haspopup="dialog" title="Connections on ${esc(placeLabel(hereKey()))}">
    <span class="ev-pill-logos">${on.slice(0, 3).map((c) => iconHtml(c, 14)).join("")}</span>
    <span>${plural(on.length, "connection")}</span>${problem ? '<span class="ev-dot en-dot-err" title="A connection stopped responding"></span>' : ""}
    <span class="codicon codicon-chevron-down-compact" aria-hidden="true"></span></button>`;
}
function usedPillHtml() {
  const u = usedHere();
  if (!u.skills.length && !u.conns.length) return "";
  const n = u.skills.length + u.conns.length;
  return `<button class="ev-pill" data-used-pill title="What the agent used in this session"><span class="codicon codicon-history" aria-hidden="true"></span><span>Used ${plural(n, "customization")}</span><span class="codicon codicon-chevron-down-compact" aria-hidden="true"></span></button>`;
}
function usedHere() {
  const u = USED[store.session?.id] || { skills: [], conns: [] };
  const conns = [...u.conns];
  if (store.session?.id === "triage" && triage.slack === "done") conns.push(["slack", "Read 1 thread · #vscode-agents"]);
  return { skills: u.skills, conns };
}
function openPopover(anchor, html, kind) {
  closePopover();
  const wb = document.getElementById("wb"), box = wb.getBoundingClientRect(), r = anchor.getBoundingClientRect();
  popover = document.createElement("div");
  popover.className = "ev-popover en-popover";
  popover.dataset.kind = kind;
  popover.setAttribute("role", "dialog");
  popover.innerHTML = html;
  wb.append(popover);
  const above = r.top - box.top - 14, below = box.bottom - r.bottom - 14;
  const up = above >= popover.offsetHeight || above >= below;
  popover.style.maxHeight = Math.max(160, up ? above : below) + "px";
  const h = popover.offsetHeight, w = popover.offsetWidth;
  popover.style.top = (up ? r.top - box.top - h - 6 : r.bottom - box.top + 6) + "px";
  popover.style.left = Math.max(8, Math.min(r.right - box.left - w, box.width - w - 8)) + "px";
}
function connPopoverHtml() {
  const list = connsHere();
  return `<div class="ev-pop-head en-pop-head"><span>Connections</span><span class="grow"></span>${placeChip()}</div>
    ${applyToHtml()}
    <div class="ev-pop-list">${list.length ? list.map(connRow).join("") : `<div class="en-empty">Nothing installed on ${esc(placeLabel(hereKey()))}.</div>`}</div>
    <div class="ev-pop-foot"><button class="ev-link" data-open-panel>Manage</button></div>`;
}
function usedPopoverHtml() {
  const u = usedHere();
  return `<div class="ev-pop-head"><span>Used in this session</span></div><div class="ev-pop-list">
    ${u.conns.map(([id, what]) => { const c = conn(id); return `<div class="ev-row">${iconHtml(c)}<div class="ev-row-text"><div class="ev-row-name">${esc(c.name)}</div><div class="ev-row-sub">${esc(what)}</div></div></div>`; }).join("")}
    ${u.skills.map((n) => `<button class="ev-row en-row-btn" data-skill="${esc(n)}"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span>
      <div class="ev-row-text"><div class="ev-row-name">${esc(n)}</div><div class="ev-row-sub">Skill · read once</div></div></button>`).join("")}</div>`;
}
document.addEventListener("click", (e) => {
  if (popover && !popover.contains(e.target) && !e.target.closest("[data-conn-pill], [data-used-pill], vsc-menu, .en-dlg-block")) closePopover();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && popover && !dlg) closePopover(); });
// V11 has no customization UI in the composer (PANEL_CONFIG.composerPills === false).
const PILLS = window.PANEL_CONFIG?.composerPills !== false;
function renderPills() {
  if (!PILLS) return;
  const newRow = document.getElementById("ev-new-pills");
  if (newRow) newRow.innerHTML = pillHtml();
  const sRow = document.querySelector("#session-page .ev-pills");
  if (sRow) sRow.innerHTML = pillHtml() + usedPillHtml();
  if (popover?.dataset.kind === "conn") {
    const scroll = popover.querySelector(".ev-pop-list")?.scrollTop || 0;
    popover.innerHTML = connPopoverHtml();
    popover.querySelector(".ev-pop-list").scrollTop = scroll;
  }
}
(function mountNewSessionRow() {
  if (!PILLS) return;
  const composer = document.getElementById("composer");
  const row = document.createElement("div");
  row.className = "ev-pills ev-new-pills";
  row.id = "ev-new-pills";
  composer.before(row);
})();

// ---------- In-chat moments for the demo session (devbox-1 · Copilot) ----------
const triage = { slack: null, savePhase: "none", scope: "user", envs: new Set(["devbox-1", "local"]), saved: null };
function triageHtml() {
  const slack = conn("slack");
  if (!triage.slack) { const v = polOf(slack, "triage", "vscode").v; triage.slack = v === "on" ? "done" : v === "off" ? "off" : "ask"; }
  let html = `<vsc-chat-view>
    <vsc-chat-request timestamp="Yesterday">Group the open customization migration issues by root cause. Also check the Slack thread for anything we missed: https://vscode.slack.com/archives/C07AGENTS/p1730</vsc-chat-request>
    <vsc-chat-response><vsc-chat-tool-chain>
      <vsc-chat-tool-call icon="book-compact">Read skill <button class="ev-skill-link" data-skill="issue-grouping">issue-grouping</button></vsc-chat-tool-call>
      <vsc-chat-tool-call icon="github">Searched GitHub issues · <strong>label:customization-migration</strong></vsc-chat-tool-call>
    </vsc-chat-tool-chain></vsc-chat-response></vsc-chat-view>`;
  if (triage.slack === "ask") {
    return html + `<div class="ev-card en-ask">
      <div class="ev-card-head">${iconHtml(slack, 20)}<div class="ev-row-text"><div class="ev-row-name">Allow the agent to use Slack?</div>
        <div class="ev-row-sub">It wants to read the thread you linked in #vscode-agents. Slack is set to Ask first in vscode.</div></div></div>
      <div class="ev-card-actions"><button class="ev-btn primary" data-allow="once">Allow once</button><button class="ev-btn" data-allow="session">Allow in this session</button>
        <button class="ev-btn" data-allow="workspace">Always allow in vscode</button><button class="ev-btn" data-allow="deny">Don't allow</button></div></div>`;
  }
  const note = { done: `<span class="codicon codicon-check" aria-hidden="true"></span>${triage.allowed ? "Allowed" : "Used"} Slack`, deny: `<span class="codicon codicon-circle-slash" aria-hidden="true"></span>Didn't use Slack · <button class="ev-link" data-allow-undo>Allow instead</button>`,
    off: `<span class="codicon codicon-circle-slash" aria-hidden="true"></span>Slack is off in this session · <button class="ev-link" data-allow-undo>Use it once</button>` }[triage.slack];
  html += `<div class="ev-inline-note">${note}</div>
    <vsc-chat-view><vsc-chat-response><vsc-chat-tool-chain>${triage.slack === "done" ? '<vsc-chat-tool-call icon="comment-discussion">Read Slack thread in <strong>#vscode-agents</strong> · 24 messages</vsc-chat-tool-call>' : ""}</vsc-chat-tool-chain>
      <vsc-chat-markdown>14 issues fall into 4 groups. The largest is shadowed MCP servers after migration (6 issues).${triage.slack === "done" ? " The Slack thread adds a fifth: hooks that silently stop running after a rename (2 reports, no issues filed yet)." : ""}</vsc-chat-markdown>
    </vsc-chat-response></vsc-chat-view>`;
  if (triage.savePhase === "suggest") html += `<div class="ev-card ev-save">
      <div class="ev-card-head"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span><div class="ev-row-text"><div class="ev-row-name">Save this as a skill?</div>
        <div class="ev-row-sub">Agents can repeat this triage the same way next time: search issues, check Slack, group by root cause.</div></div></div>
      <div class="ev-card-actions"><button class="ev-btn primary" data-save-draft>Save as skill…</button><button class="ev-btn" data-save-dismiss>Not now</button></div></div>`;
  else if (triage.savePhase === "draft") html += `<div class="ev-card ev-save">
      <div class="ev-card-title">New skill</div>
      <label class="ev-field"><span>Name</span><vsc-input id="ev-skill-name" value="triage-migration-issues"></vsc-input></label>
      <div class="ev-field"><span>Who can use it</span><div class="ev-seg" role="radiogroup">
        <button class="ev-seg-btn" role="radio" aria-checked="${triage.scope !== "workspace"}" data-scope="user">Just me<small>On the machines you pick</small></button>
        <button class="ev-seg-btn" role="radio" aria-checked="${triage.scope === "workspace"}" data-scope="workspace">Everyone in vscode<small>Saved to the repo; follows it everywhere</small></button></div></div>
      ${triage.scope !== "workspace" ? `<div class="ev-field"><span>Install on</span><div class="en-env-checks">${ENVS.map((e) => `<label class="en-env-check"><vsc-checkbox data-save-env="${e.id}"${triage.envs.has(e.id) ? " checked" : ""} label="${esc(e.label)}"></vsc-checkbox><span class="codicon codicon-${e.icon}" aria-hidden="true"></span>${esc(e.label)}${e.id === "devbox-1" ? " <small>(this session)</small>" : ""}</label>`).join("")}</div></div>` : ""}
      <div class="ev-card-actions"><button class="ev-btn primary" data-save>Save skill</button><button class="ev-btn" data-save-dismiss>Cancel</button></div></div>`;
  else if (triage.savePhase === "saved") html += `<div class="ev-inline-note"><span class="codicon codicon-check" aria-hidden="true"></span>Saved skill <strong>${esc(triage.saved.name)}</strong> · ${esc(triage.saved.where)}</div>`;
  return html;
}
function renderTriage() {
  const chat = document.querySelector("#session-page .s-chat");
  if (chat && store.session?.id === "triage") chat.innerHTML = triageHtml();
}
document.addEventListener("session-open", (e) => {
  const { el, id } = e.detail;
  if (PILLS) {
    const row = document.createElement("div");
    row.className = "ev-pills";
    el.querySelector(".s-composer").prepend(row);
  }
  // The session's own entry point to its customizations, next to its title.
  const head = el.querySelector(".s-head");
  const tb = document.createElement("div");
  // V11 drops the environment · agent chip (PANEL_CONFIG.customizeChip === false); the sidebar shows them.
  const chip = window.PANEL_CONFIG?.customizeChip !== false ? `${placeChip(slotOf(sessions()[id]), "en-place-quiet")}<span class="en-customize-sep" aria-hidden="true"></span>` : "";
  tb.innerHTML = `<button class="ev-btn en-customize" data-customize title="Customize this session">${chip}<span class="codicon codicon-settings" aria-hidden="true"></span>Customize</button>`;
  head.querySelector("vsc-toolbar").before(tb.firstElementChild);
  if (id === "triage") renderTriage();
  renderPills();
});
document.addEventListener("session-new", () => renderPills());
document.getElementById("page").addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  if (t("[data-customize]")) return window.__envOpenPanel?.();
  const al = t("[data-allow]");
  if (al) {
    const v = al.dataset.allow;
    triage.allowed = true;
    if (v === "session") { if (!sesPol.has("triage")) sesPol.set("triage", new Map()); sesPol.get("triage").set("slack", "on"); }
    if (v === "workspace") conn("slack").ws = { ...conn("slack").ws, vscode: "on" };
    triage.slack = v === "deny" ? "deny" : "done";
    if (v === "session" || v === "workspace") toast(v === "session" ? "Slack is on for the rest of this session." : "Slack is on for sessions in vscode. Change it anytime from Connections.");
    renderTriage(); changed(); return;
  }
  if (t("[data-allow-undo]")) { triage.slack = "done"; renderTriage(); changed(); return; }
  if (t("[data-save-draft]")) { triage.savePhase = "draft"; return renderTriage(); }
  if (t("[data-save-dismiss]")) { triage.savePhase = "none"; return renderTriage(); }
  const scopeBtn = t("[data-scope]");
  if (scopeBtn) { triage.scope = scopeBtn.dataset.scope; return renderTriage(); }
  const se = t("vsc-checkbox[data-save-env]");
  if (se) { se.hasAttribute("checked") ? triage.envs.add(se.dataset.saveEnv) : triage.envs.delete(se.dataset.saveEnv); return; }
  if (t("[data-save]")) {
    const name = (document.querySelector("#ev-skill-name input")?.value || "triage-migration-issues").trim();
    if (triage.scope === "workspace") {
      REPO_SAVED.push({ type: "skills", name, source: "workspace", workspace: "vscode", isNew: true });
      triage.saved = { name, where: "Workspace (vscode)" };
      toast(`Saved ${name} to vscode/.github/skills/. Commit it so every environment with vscode gets it.`);
    } else {
      const envs = ENVS.filter((x) => triage.envs.has(x.id));
      USER_SKILLS.push({ kind: "skill", id: name, name, isNew: true, at: new Set(envs.map((x) => K(x.id, "copilot"))) });
      triage.saved = { name, where: `User · ${envs.map((x) => x.label).join(", ")}` };
      toast(`Saved ${name} for Copilot on ${envs.map((x) => x.label).join(" and ")}.`);
    }
    triage.savePhase = "saved";
    renderTriage(); changed(); return;
  }
  const sk = t("[data-skill]");
  if (sk) { closePopover(); return revealSkill(sk.dataset.skill); }
  const pill = t("[data-conn-pill]");
  if (pill) { if (popover?.dataset.kind === "conn") return closePopover(); return openPopover(pill, connPopoverHtml(), "conn"); }
  const used = t("[data-used-pill]");
  if (used) { if (popover?.dataset.kind === "used") return closePopover(); return openPopover(used, usedPopoverHtml(), "used"); }
});

// ---------- Shared row actions (panel + popover) ----------
document.addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  if (t(".en-cfg")) return; // Configure has its own handlers
  const tr = t("[data-tri]");
  if (tr) { const c = conn(tr.dataset.tri); if (polOf(c).v !== tr.dataset.v) setPol(c, tr.dataset.v); return; }
  const dt = t("[data-detail]");
  if (dt && hooks.openDetail) { closePopover(); const [type, id] = dt.dataset.detail.split("|"); return hooks.openDetail(type, id); }
  const ap = t("[data-apply]");
  if (ap) { applyTo = ap.dataset.apply; changed(); return; }
  const rs = t("[data-restart]");
  if (rs) { const c = conn(rs.dataset.restart); c.state = "ok"; changed(); return toast(`Restarted ${c.name}.`); }
  const more = t("[data-conn-more]");
  if (more) {
    const c = conn(more.dataset.connMore), k = hereKey(), others = Object.entries(sessions()).filter(([id, s]) => slotOf(s) === k && id !== store.session?.id).length;
    return openMenu(more, [
      ...(hooks.openDetail ? [{ label: "Show Details", act: "detail" }, ...(c.state === "error" ? [{ label: "Show Output", act: "output" }] : []), "-"] : []),
      { label: "Install on Other Environments...", act: "install" },
      ...(c.state === "signin" ? [{ label: "Sign In Now...", act: "signin" }] : c.account ? [{ label: `Switch Account (${c.account})...`, act: "account" }] : []),
      "-", { label: `Uninstall from ${placeLabel(k)}`, act: "uninstall" },
    ], (it) => {
      if (it.act === "detail" || it.act === "output") return hooks.openDetail("connections", c.id, { output: it.act === "output" });
      if (it.act === "install") return openInstall({ items: [c], mode: "edit", here: k });
      if (it.act === "signin") { c.state = "ok"; changed(); return toast(`Signed in to ${c.name} as ${c.account}.`); }
      if (it.act === "account") return toast("Pick another account to sign in with.");
      c.at.delete(k); hooks.onUninstall?.(c, k); changed();
      toast(`Removed ${c.name} from ${placeLabel(k)}.${others ? ` ${plural(others, "other session")} there lose it too.` : ""}`, ["Undo"], () => { c.at.add(k); changed(); });
    });
  }
  if (t("[data-open-panel]")) { closePopover(); window.__envOpenPanel?.(); }
});

// ---------- Side panel: this session's customizations ----------
let devMode = new URLSearchParams(location.search).get("dev") === "1";
export function mountPanel(root, opts) {
  root.innerHTML = `
    <div class="en-panel">
      <div class="en-devtabs" role="tablist" aria-label="View"${devMode ? "" : " hidden"}>
        <button role="tab" data-devtab="overview" aria-selected="false">Overview</button><button role="tab" data-devtab="runs" aria-selected="true">How it runs</button></div>
      <div class="en-body">
        <div class="ev-stack en-everyday" data-view="home">
          <div class="ev-view ev-home"><div class="ss-scope ev-scope"></div><div class="cp-scroll ev-scroll"></div></div>
          <div class="ev-view ev-skills" aria-hidden="true">
            <header class="cp-header ev-sub-head"><vsc-toolbar label="Navigation"><vsc-action icon="arrow-left" label="Back" data-ev-back></vsc-action></vsc-toolbar>
              <h2 class="cp-title"><span class="ev-skill-title"></span><span class="cp-count ev-skill-count"></span></h2></header>
            <div class="cp-search"><vsc-input class="ev-skill-q" placeholder="Filter skills"></vsc-input></div>
            <div class="cp-scroll ev-skill-list"></div>
          </div>
        </div>
        <div class="en-dev v7-view" hidden></div>
      </div>
      <div class="en-foot"><span class="en-foot-label" title="Shows how this session's customizations run along the agent loop">Developer mode</span>
        <button class="monaco-switch${devMode ? " checked" : ""}" type="button" role="switch" aria-checked="${devMode}" aria-label="Developer mode" data-devmode><div class="monaco-switch-thumb"></div></button></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const stack = $(".ev-stack");
  const skillOff = new Map();
  const sOff = () => { if (!skillOff.has(skey())) skillOff.set(skey(), new Set()); return skillOff.get(skey()); };
  // opts.scopes: group by scope like the customizations editor (User, Workspace · folder, Built-in), with items from a
  // plugin, extension or organization nested under one source row, and agent items in Built-in tagged with the agent.
  const SKILL_SOURCES = opts.scopes ? ["user", "workspace", "builtin"] : ["workspace", "user", "plugin", "builtin"];
  const scopeOf = (it) => (!opts.scopes ? it.source : it.source === "workspace" ? "workspace" : it.source === "builtin" ? "builtin" : "user");
  const originOf = (it) => it.origin || (it.source === "plugin" ? { kind: "plugin", label: "Security & Code Quality Plugin" } : null);
  const SRC = { plugin: ["ai-customization-plugin", "Plugin"], extension: ["extensions", "Extension"], account: ["organization", "Organization"] };
  const groupLabel = (src) => (src === "workspace" ? (opts.scopes ? `Workspace · ${workspaceLabel(ws())}` : workspaceTitle(ws())) : src === "user" ? "User" : src === "plugin" ? "From plugins" : "Built-in");
  const skillSw = (name) => { const on = !sOff().has(name); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${esc(name)} for this session" data-skill-toggle="${esc(name)}"><div class="monaco-switch-thumb"></div></button>`; };

  function render() {
    renderScopeBar($(".ev-scope"), { new: "", session: "" });
    const conns = connsHere(), skills = skillsHere(), m = missingHere();
    const usedNames = usedHere().skills, used = usedNames.map((n) => skills.find((s) => s.name === n)).filter(Boolean), fresh = skills.filter((s) => s.isNew && !usedNames.includes(s.name));
    const groups = SKILL_SOURCES.map((src) => [src, skills.filter((x) => scopeOf(x) === src)]).filter(([, l]) => l.length);
    const missing = m ? `<div class="ev-card en-missing">
        <div class="ev-card-head"><span class="codicon codicon-info" aria-hidden="true"></span><div class="ev-row-text"><div class="ev-row-name">Not on ${esc(hereEnv().label)} yet</div>
          <div class="ev-row-sub">${esc([m.conns.map((c) => c.name).join(", "), m.skills.length && plural(m.skills.length, "of your skills", "of your skills")].filter(Boolean).join(" and "))} ${m.conns.length + m.skills.length === 1 ? "is" : "are"} on This Computer for ${esc(HARNESSES[store.scope.harness].label)}.</div></div>
          <button class="ev-icon-btn" data-missing-dismiss aria-label="Dismiss" title="Dismiss"><span class="codicon codicon-close-compact"></span></button></div>
        <div class="ev-card-actions"><button class="ev-btn primary" data-missing-install>Install on ${esc(hereEnv().label)}…</button></div></div>` : "";
    $(".ev-scroll").innerHTML = `${missing}
      <section class="ev-sec"><div class="ev-sec-head"><h3>Connections</h3><span class="grow"></span>
        <vsc-toolbar label="Connections Actions"><vsc-action icon="add" label="Add Connection to ${esc(placeLabel(hereKey()))}..." data-ev-browse></vsc-action></vsc-toolbar></div>
        ${applyToHtml()}
        <div class="ov-list">${conns.length ? conns.map(connRow).join("") : `<div class="en-empty">Nothing installed on ${esc(placeLabel(hereKey()))}.</div>`}</div></section>
      <section class="ev-sec"><div class="ev-sec-head"><h3>Skills</h3></div>
        <div class="ov-list">
          ${[...used, ...fresh].map((s) => `<div class="ev-row ev-skill${sOff().has(s.name) ? " is-off" : ""}" data-skill-row="${esc(s.name)}"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span>
            <div class="ev-row-text"><div class="ev-row-name">${hooks.openDetail ? `<button class="en-name-link" data-detail="skills|${esc(s.name)}" title="Show details">${esc(s.name)}</button>` : esc(s.name)}${s.isNew ? '<span class="lc-flag on">New</span>' : '<span class="lc-flag">Used here</span>'}</div></div>${skillSw(s.name)}</div>`).join("")}
          ${groups.map(([src, list]) => `<button class="ov-row ev-skill-group" data-ev-skills="${src}"><span class="ov-text"><span class="ov-title">${esc(groupLabel(src))}</span></span>
            <span class="cp-count">${list.length}</span><span class="codicon codicon-chevron-right ov-chev" aria-hidden="true"></span></button>`).join("")}
        </div></section>${opts.more ? moreHtml() : ""}`;
    if (stack.dataset.view === "skills") renderSkills();
  }
  // The other customization types this session has; each opens Configure, narrowed to this environment.
  function moreHtml() {
    const rows = opts.more(store.scope).filter((r) => r.count);
    return rows.length ? `<section class="ev-sec"><div class="ev-sec-head"><h3>More</h3></div><div class="ov-list">${rows.map((r) => `<button class="ov-row ev-skill-group" data-more="${r.id}"><span class="ov-text"><span class="ov-title">${esc(r.label)}</span></span>
      <span class="cp-count">${r.count}</span><span class="codicon codicon-link-external ov-chev" aria-hidden="true"></span></button>`).join("")}</div></section>` : "";
  }
  let group = null;
  function renderSkills() {
    const all = skillsHere().filter((x) => scopeOf(x) === group), q = ($(".ev-skill-q input")?.value || "").trim().toLowerCase();
    const list = all.filter((x) => !q || x.name.toLowerCase().includes(q));
    $(".ev-skill-title").textContent = groupLabel(group);
    $(".ev-skill-count").textContent = all.length;
    const tag = (it) => (opts.scopes && it.source === "builtin" && it.copilotOnly ? '<span class="en-tag">Copilot</span>' : "");
    const nm = (n) => (hooks.openDetail ? `<button class="en-name-link" data-detail="skills|${esc(n)}" title="Show details">${esc(n)}</button>` : esc(n));
    const row = (it, nested) => `
      <div class="ev-row ev-skill${nested ? " en-nested" : ""}${sOff().has(it.name) ? " is-off" : ""}" data-skill-row="${esc(it.name)}"><div class="ev-row-text"><div class="ev-row-name">${nm(it.name)}${tag(it)}${it.isNew ? '<span class="lc-flag on">New</span>' : ""}</div></div>${skillSw(it.name)}</div>`;
    let html = "";
    if (opts.scopes) {
      html += list.filter((x) => !originOf(x)).sort((a, b) => a.name.localeCompare(b.name)).map((it) => row(it)).join("");
      const bySrc = new Map();
      for (const it of list.filter(originOf)) { const o = originOf(it), k = o.kind + ":" + o.label; if (!bySrc.has(k)) bySrc.set(k, [o, []]); bySrc.get(k)[1].push(it); }
      for (const [o, items] of [...bySrc.values()].sort((a, b) => a[0].label.localeCompare(b[0].label))) {
        const [icon, kind] = SRC[o.kind] || SRC.plugin;
        html += `<div class="en-src-row"><span class="codicon codicon-${icon}" aria-hidden="true"></span><span class="en-src-label">${esc(o.label)}</span><span class="en-src-kind">${kind}</span></div>` + items.map((it) => row(it, true)).join("");
      }
    } else html = list.map((it) => row(it)).join("");
    $(".ev-skill-list").innerHTML = list.length ? `<div class="ov-list">${html}</div>` : '<div class="cp-empty">No skills match.</div>';
  }
  function go(view, src) {
    if (view === "skills" && src && src !== group) { group = src; const q = $(".ev-skill-q input"); if (q) q.value = ""; $(".ev-skill-list").scrollTop = 0; }
    stack.dataset.view = view;
    for (const v of ["home", "skills"]) root.querySelector(".ev-" + v).setAttribute("aria-hidden", String(v !== view));
    if (view === "skills") renderSkills();
  }
  // Developer mode: V7's "How it runs" for this same session, next to the overview.
  let lifecycle = null, devTab = "runs";
  function applyDev() {
    $(".en-devtabs").hidden = !devMode;
    const showRuns = devMode && devTab === "runs";
    if (showRuns && !lifecycle) lifecycle = mountLifecycle($(".en-dev"), { onBrowse: () => opts.onBrowse(), onLibrary: (type) => opts.onConfigure(type === "skills" ? "skills" : "connections"),
      onOpenItem: ({ type }) => opts.onConfigure(type === "skills" ? "skills" : "connections") });
    $(".en-dev").hidden = !showRuns;
    stack.hidden = showRuns;
    for (const b of root.querySelectorAll("[data-devtab]")) b.setAttribute("aria-selected", String(b.dataset.devtab === devTab));
    const sw = $("[data-devmode]");
    sw.classList.toggle("checked", devMode); sw.setAttribute("aria-checked", String(devMode));
  }
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    if (t("[data-devmode]")) { devMode = !devMode; devTab = "runs"; return applyDev(); }
    const dt = t("[data-devtab]");
    if (dt) { devTab = dt.dataset.devtab; return applyDev(); }
    if (t("[data-ev-back]")) return go("home");
    const mo = t("[data-more]");
    if (mo) return opts.onConfigure(mo.dataset.more, { env: store.scope.environment });
    const grp = t("[data-ev-skills]");
    if (grp) return go("skills", grp.dataset.evSkills);
    if (t("[data-ev-browse]")) return opts.onBrowse(hereKey());
    if (t("[data-missing-dismiss]")) { dismissed.add(skey()); return render(); }
    if (t("[data-missing-install]")) { const m = missingHere(); return openInstall({ items: [...m.conns, ...m.skills], mode: "copy", preset: [hereKey()], here: hereKey(), title: `Install on ${hereEnv().label}` }); }
    const st = t("[data-skill-toggle]");
    if (st) { const n = st.dataset.skillToggle, s = sOff(); s.has(n) ? s.delete(n) : s.add(n); render(); if (s.has(n)) toast(`${n} is off for this session.`, ["Undo"], () => { s.delete(n); render(); }); }
  });
  $(".ev-skill-q").addEventListener("input", renderSkills);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && stack.dataset.view === "skills" && !dlg && !e.target.closest?.("input") && !document.querySelector("vsc-menu")) go("home"); });
  subs.add(() => { render(); renderPills(); });
  render();
  applyDev();
  const flash = (name) => { const row = root.querySelector(`.ev-view:not([aria-hidden="true"]) [data-skill-row="${CSS.escape(name)}"]`); if (row) { row.scrollIntoView({ block: "nearest" }); row.classList.remove("ev-flash"); void row.offsetWidth; row.classList.add("ev-flash"); } };
  return { go, highlightSkill(name) {
    if (devMode) { devTab = "overview"; applyDev(); }
    go("home");
    if (root.querySelector(`.ev-home [data-skill-row="${CSS.escape(name)}"]`)) return flash(name);
    const s = skillsHere().find((x) => x.name === name);
    if (s) { go("skills", scopeOf(s)); requestAnimationFrame(() => flash(name)); }
  } };
}
let panelApi = null;
export function setPanelApi(api) { panelApi = api; }
function revealSkill(name) { window.__envOpenPanel?.(); panelApi?.highlightSkill(name); }

// ---------- Configure (Agent Window) ----------
const NAV = [{ id: "browse", label: "Discover" }, "-", { id: "connections", label: "Connections" }, { id: "skills", label: "Skills" }, { id: "plugins", label: "Plugins" }, "-",
  { id: "environments", label: "Environments" }, { id: "sessions", label: "Sessions" }, { id: "extensions", label: "Extensions" }];
const TITLES = { connections: "Connections", skills: "Skills", plugins: "Plugins", environments: "Environments", sessions: "Sessions" };
const DESCS = {
  connections: "Where each connection is installed, by environment and agent, and what agents do with it by default.",
  skills: "Your skills are installed per machine and agent. Skills in a repo follow it to every environment.",
  plugins: "Plugins add skills and connections. They load in Copilot.",
  environments: "Where your sessions run. Each has its own agents and customizations.",
  sessions: "Every session runs in one environment with one agent. Customize opens what that session can use.",
};
function countsFor(scope) {
  const k = K(scope.environment, scope.harness);
  const c = connsAt(k, scope.workspace).filter((x) => polOf(x, null, scope.workspace).v !== "off").length;
  return { conns: c, skills: skillsAt(scope).length };
}
export function mountConfigure(root, opts) {
  const pages = window.CUST.first;
  root.className = "se lib en-cfg";
  const navCount = (id) => ({ connections: CONNECTIONS.length, skills: USER_SKILLS.length, plugins: PLUGINS.length, environments: ENVS.length, sessions: Object.keys(sessions()).length, extensions: 11 }[id] ?? "");
  root.innerHTML = `
    <nav class="se-nav" aria-label="Configure"><div class="se-nav-list" role="tablist" aria-orientation="vertical">${NAV.map((n) => n === "-" ? '<div class="se-nav-sep" role="presentation"></div>'
      : `<div class="se-nav-item" role="tab" tabindex="-1" data-id="${n.id}"><span class="se-nav-label">${n.label}</span><span class="se-nav-count" data-count="${n.id}"></span></div>`).join("")}</div></nav>
    <div class="se-main"><div class="lib-host"></div></div>`;
  const host = root.querySelector(".lib-host");
  const hosted = {};
  const f = { env: null, agent: null, q: "" };
  const picked = new Set();
  const open = new Set(["user"]);
  let section = "connections", target = null;
  // Discover cards for things already installed say Manage.
  for (const card of pages.browse.querySelectorAll("vsc-customization-discovery-card")) if (cardItem(card.getAttribute("name"))) card.setAttribute("action", "Manage");
  function cardItem(name) { for (const l of Object.values(LISTS)) { const it = l.find((x) => x.card === name || x.name === name); if (it) return it; } return null; }

  const filterBar = () => `<div class="lib-filters en-filters">
      <button class="lib-filter${f.env ? " set" : ""}" data-f="env">${esc(f.env ? envOf(f.env).label : "All environments")}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
      <button class="lib-filter${f.agent ? " set" : ""}" data-f="agent">${esc(f.agent ? HARNESSES[f.agent].label : "All agents")}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
      ${f.env || f.agent ? `<span class="lib-chip">Filtered<button class="lib-chip-x" data-f="clear" aria-label="Show everything" title="Show everything"><span class="codicon codicon-close-compact" aria-hidden="true"></span></button></span>` : ""}
      <span class="grow"></span><vsc-input class="en-q" placeholder="Filter" value="${esc(f.q)}"></vsc-input></div>`;
  const cols = () => ENVS.filter((e) => !f.env || e.id === f.env).map((e) => [e, e.agents.filter((a) => !f.agent || a === f.agent)]).filter(([, a]) => a.length);
  const head = (extra) => `<thead><tr><th class="en-m-name" rowspan="2">Name</th>${cols().map(([e, as]) => `<th class="en-m-env" colspan="${as.length}"><span class="codicon codicon-${e.icon}" aria-hidden="true"></span>${esc(e.label)}</th>`).join("")}${extra ? `<th class="en-m-pol" rowspan="2" title="What agents do with it unless a workspace or session says otherwise">Default</th>` : ""}<th class="en-m-act" rowspan="2"></th></tr>
    <tr>${cols().map(([, as]) => as.map((a, i) => `<th class="en-m-agent${i === 0 ? " en-m-first" : ""}" title="${HARNESSES[a].label}"><span class="codicon codicon-${HARNESSES[a].icon}" aria-hidden="true"></span>${HARNESSES[a].label}</th>`).join("")).join("")}</tr></thead>`;
  const cell = (it, e, a, i) => {
    const k = K(e.id, a), first = i === 0 ? " en-m-first" : "";
    if (!supports(it, a)) return `<td class="en-m-cell${first}"><span class="en-na" title="Copilot plugins don't load in ${HARNESSES[a].label}">—</span></td>`;
    const on = it.at.has(k);
    return `<td class="en-m-cell${first}"><button class="en-cell${on ? " on" : ""}" type="button" aria-pressed="${on}" data-cell="${it.kind}|${esc(it.id)}|${k}" title="${on ? "Installed" : "Not installed"} on ${esc(e.label)} for ${HARNESSES[a].label}. Click to ${on ? "uninstall" : "install"}.">
      <span class="codicon codicon-check en-ic-on" aria-hidden="true"></span><span class="codicon codicon-circle-small en-ic-off" aria-hidden="true"></span><span class="codicon codicon-add en-ic-add" aria-hidden="true"></span></button></td>`;
  };
  const nameCell = (it, sub) => `<td class="en-m-name"><div class="en-m-namecell"><vsc-checkbox data-pick="${it.kind}|${esc(it.id)}"${picked.has(`${it.kind}|${it.id}`) ? " checked" : ""} label="Select ${esc(it.name)}"></vsc-checkbox>${iconHtml(it)}
    <div class="ev-row-text"><div class="ev-row-name">${esc(it.name)}${it.isNew ? '<span class="lc-flag on">New</span>' : ""}</div>${sub ? `<div class="ev-row-sub">${sub}</div>` : ""}</div></div></td>`;
  const moreCell = (it) => `<td class="en-m-act"><vsc-toolbar label="${esc(it.name)} Actions"><vsc-action icon="ellipsis" label="More Actions..." data-row-more="${it.kind}|${esc(it.id)}"></vsc-action></vsc-toolbar></td>`;
  const match = (it) => !f.q || it.name.toLowerCase().includes(f.q.toLowerCase());
  const colCells = (fn) => cols().map(([e, as]) => as.map((a, i) => fn(e, a, i)).join("")).join("");

  function connSubCfg(c) {
    const o = Object.entries(c.ws || {}).map(([w, v]) => `${POLICY[v]} in ${workspaceLabel(w)}`);
    return [c.state === "error" ? '<span class="en-err">Stopped responding on This Computer</span>' : c.state === "signin" ? "Signs in when needed" : c.account ? esc(c.account) : "", ...o.map(esc), c.workspace ? `Only ${esc(workspaceLabel(c.workspace))}` : ""].filter(Boolean).join(" · ");
  }
  function matrixPage(kind) {
    if (kind === "skills") return skillsMatrix();
    const list = (kind === "connections" ? CONNECTIONS : PLUGINS).filter(match);
    return `<table class="en-matrix en-cfg-m">${head(kind === "connections")}<tbody>${list.map((it) => `<tr>${nameCell(it, kind === "connections" ? connSubCfg(it) : esc(it.sub || ""))}
      ${colCells((e, a, i) => cell(it, e, a, i))}${kind === "connections" ? `<td class="en-m-pol">${tri(it, "data-tri-def", it.def)}</td>` : ""}${moreCell(it)}</tr>`).join("")}</tbody></table>
      ${list.length ? "" : '<div class="lib-empty">Nothing matches.</div>'}`;
  }
  function skillsMatrix() {
    const groupRow = (id, icon, label, n, note, countAt) => `<tr class="en-m-group"><th class="en-m-name" scope="rowgroup"><button class="en-twisty" data-twisty="${id}" aria-expanded="${open.has(id)}">
        <span class="codicon codicon-chevron-${open.has(id) ? "down" : "right"}" aria-hidden="true"></span><span class="codicon codicon-${icon}" aria-hidden="true"></span><span class="en-g-label">${esc(label)}</span><span class="cp-count">${n}</span>${note ? `<small>${esc(note)}</small>` : ""}</button></th>
      ${colCells((e, a, i) => { const c = countAt(e, a); return `<td class="en-m-cell en-m-count${i === 0 ? " en-m-first" : ""}">${c === null ? '<span class="en-na">—</span>' : c}</td>`; })}<td class="en-m-act"></td></tr>`;
    const locked = (name, avail) => `<tr class="en-m-locked"><td class="en-m-name"><div class="en-m-namecell en-m-indent"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span><div class="ev-row-text"><div class="ev-row-name">${esc(name)}</div></div></div></td>
      ${colCells((e, a, i) => `<td class="en-m-cell${i === 0 ? " en-m-first" : ""}">${avail(e, a) ? '<span class="codicon codicon-check en-locked" aria-hidden="true"></span>' : ""}</td>`)}<td class="en-m-act"></td></tr>`;
    let rows = "";
    const user = USER_SKILLS.filter(match);
    rows += groupRow("user", "account", "User", USER_SKILLS.length, "Installed per machine and agent", (e, a) => USER_SKILLS.filter((s) => s.at.has(K(e.id, a))).length);
    if (open.has("user")) rows += user.map((s) => `<tr>${nameCell(s, "")}${colCells((e, a, i) => cell(s, e, a, i))}${moreCell(s)}</tr>`).join("");
    for (const [w, def] of Object.entries(WORKSPACES)) {
      const list = [...ALL_ITEMS.filter((it) => it.type === "skills" && it.source === "workspace" && it.workspace === w), ...REPO_SAVED.filter((s) => s.workspace === w)];
      if (!list.length) continue;
      const inEnv = (e) => e.workspaces.includes(w);
      rows += groupRow("ws:" + w, "folder", workspaceTitle(w), list.length, "In the repo · follows it", (e, a) => (inEnv(e) ? list.length : null));
      if (open.has("ws:" + w)) rows += list.filter(match).map((s) => locked(s.name, (e) => inEnv(e))).join("");
    }
    for (const [src, icon, label, note] of [["plugin", "ai-customization-plugin", "From plugins", "Comes with a plugin"], ["builtin", "vscode-insiders", "Built-in", "Comes with each agent"]]) {
      const list = ALL_ITEMS.filter((it) => it.type === "skills" && it.source === src);
      if (!list.length) continue;
      rows += groupRow(src, icon, label, list.length, note, (e, a) => list.filter((it) => worksWith(it, a)).length || null);
      if (open.has(src)) rows += list.filter(match).map((s) => locked(s.name, (e, a) => worksWith(s, a))).join("");
    }
    return `<table class="en-matrix en-cfg-m">${head(false)}<tbody>${rows}</tbody></table>`;
  }
  function envPage() {
    return `<div class="en-envs">${ENVS.map((e) => {
      const conns = CONNECTIONS.filter((c) => e.agents.some((a) => c.at.has(K(e.id, a)))), skills = USER_SKILLS.filter((s) => e.agents.some((a) => s.at.has(K(e.id, a))));
      const ses = Object.values(sessions()).filter((s) => s.scope.environment === e.id);
      const onLocal = (x) => e.agents.some((a) => x.at.has(K("local", a)));
      const mc = e.id === "local" ? [] : CONNECTIONS.filter((c) => onLocal(c) && !conns.includes(c)), ms = e.id === "local" ? [] : USER_SKILLS.filter((s) => onLocal(s) && !skills.includes(s));
      return `<section class="en-env-card">
        <header class="en-env-head"><span class="en-env-ic"><span class="codicon codicon-${e.icon}" aria-hidden="true"></span></span><div class="ev-row-text"><h3>${esc(e.label)}</h3><div class="ev-row-sub">${esc(e.detail)}</div></div>
          <span class="en-status${e.offline ? " is-offline" : ""}"><span class="en-status-dot" aria-hidden="true"></span>${e.offline ? "Offline" : "Connected"}</span></header>
        <div class="en-env-agents">${e.agents.map((a) => `<span class="en-agent-chip"><span class="codicon codicon-${HARNESSES[a].icon}" aria-hidden="true"></span>${HARNESSES[a].label}</span>`).join("")}
          ${e.agents.length < AGENTS.length ? `<button class="ev-link" data-setup="${e.id}">Set up agent…</button>` : ""}</div>
        <dl class="en-env-stats"><div><dt>Connections</dt><dd>${conns.length}</dd></div><div><dt>Your skills</dt><dd>${skills.length}</dd></div><div><dt>Workspaces</dt><dd>${e.workspaces.length}</dd></div><div><dt>Sessions</dt><dd>${ses.length}</dd></div></dl>
        ${mc.length || ms.length ? `<div class="en-env-diff"><span class="codicon codicon-info" aria-hidden="true"></span><span>${esc([mc.length && plural(mc.length, "connection"), ms.length && plural(ms.length, "skill")].filter(Boolean).join(" and "))} on This Computer ${mc.length + ms.length === 1 ? "isn't" : "aren't"} here. <button class="ev-link" data-copy-from="${e.id}">Copy from This Computer…</button></span></div>` : ""}
        <footer class="en-env-foot"><button class="se-btn small" data-env-show="${e.id}">Show customizations</button></footer></section>`;
    }).join("")}<button class="en-env-card en-env-add" data-add-env><span class="codicon codicon-add" aria-hidden="true"></span>Add Environment…</button></div>`;
  }
  function sessionsPage() {
    return ENVS.map((e) => {
      const list = Object.entries(sessions()).filter(([, s]) => s.scope.environment === e.id);
      if (!list.length) return "";
      return `<div class="se-group en-sess-group"><div class="se-group-header"><span class="codicon codicon-${e.icon} se-group-icon" aria-hidden="true"></span><h3 class="se-group-title">${esc(e.label)}</h3><span class="se-group-count">${list.length}</span></div>
        <div class="se-group-card">${list.map(([id, s]) => { const n = countsFor(s.scope); return `<div class="en-sess-row">
          <span class="codicon codicon-${s.running ? "loading codicon-modifier-spin" : "comment-discussion"}" aria-hidden="true"></span>
          <div class="ev-row-text"><div class="ev-row-name">${esc(s.title)}</div><div class="ev-row-sub"><span class="codicon codicon-${s.scope.workspace === "chat" ? "circle-slash" : "folder"}" aria-hidden="true"></span>${esc(workspaceLabel(s.scope.workspace))}<span class="en-place-sep">·</span><span class="codicon codicon-${HARNESSES[s.scope.harness].icon}" aria-hidden="true"></span>${esc(HARNESSES[s.scope.harness].label)}<span class="en-place-sep">·</span>${plural(n.conns, "connection")}, ${plural(n.skills, "skill")}</div></div>
          <button class="se-btn small" data-customize-session="${id}">Customize</button></div>`; }).join("")}</div></div>`;
    }).join("");
  }

  function pageShell(id, body, { filters = false, browse = false } = {}) {
    return `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${TITLES[id]}</h2><p class="se-page-desc">${esc(DESCS[id])}</p></div>${browse ? '<button class="se-btn small" data-go="browse">Browse</button>' : ""}</div>
      ${filters ? filterBar() : ""}<div class="en-page-scroll">${body}</div>
      <div class="en-bulk"${picked.size ? "" : " hidden"}><span>${plural(picked.size, "item")} selected</span><span class="grow"></span><button class="se-btn small primary" data-bulk-install>Install on…</button><button class="se-btn small" data-bulk-clear>Clear</button></div>`;
  }
  function renderPage(id) {
    if (id === "browse" || id === "extensions") {
      if (!hosted[id]) {
        const wrap = document.createElement("div");
        wrap.className = "lib-hosted";
        wrap.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${id === "browse" ? "Discover" : "Extensions"}</h2></div><div class="en-target"></div></div>`;
        const page = window.CUST.hostPage(pages[id]);
        page.style.cssText = "flex:1;min-height:0";
        wrap.append(page);
        hosted[id] = wrap;
        host.append(wrap);
      }
      if (id === "browse") hosted.browse.querySelector(".en-target").innerHTML = target ? `<span class="en-target-label">Installs to</span>${placeChip(target)}<button class="lib-chip-x" data-clear-target aria-label="Install anywhere" title="Install anywhere"><span class="codicon codicon-close-compact" aria-hidden="true"></span></button>` : "";
    } else {
      if (!hosted[id]) { hosted[id] = document.createElement("div"); hosted[id].className = "lib-hosted en-page"; host.append(hosted[id]); }
      const scroll = hosted[id].querySelector(".en-page-scroll")?.scrollTop || 0;
      const focusQ = document.activeElement?.closest?.(".en-q");
      const body = id === "environments" ? envPage() : id === "sessions" ? sessionsPage() : matrixPage(id);
      hosted[id].innerHTML = pageShell(id, body, { filters: ["connections", "skills", "plugins"].includes(id), browse: ["connections", "skills", "plugins"].includes(id) });
      hosted[id].querySelector(".en-page-scroll").scrollTop = scroll;
      if (focusQ) requestAnimationFrame(() => { const i = hosted[id].querySelector(".en-q input"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
    }
    for (const [k, el] of Object.entries(hosted)) el.style.display = k === id ? "flex" : "none";
    for (const el of root.querySelectorAll("[data-count]")) el.textContent = navCount(el.dataset.count);
  }
  function show(id, o = {}) {
    if ("target" in o) target = o.target;
    if (o.env !== undefined) { f.env = o.env; f.agent = null; }
    if (id !== section) picked.clear();
    section = id;
    for (const el of root.querySelectorAll(".se-nav-item")) {
      const on = el.dataset.id === id;
      el.classList.toggle("active", on); el.setAttribute("aria-selected", String(on)); el.tabIndex = on ? 0 : -1;
    }
    renderPage(id);
  }
  subs.add(() => { if (!root.closest("[hidden]")) renderPage(section); });

  const itemOf = (ref) => { const [kind, id] = ref.split("|"); return findItem(kind, id); };
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    const nav = t(".se-nav-item");
    if (nav) return show(nav.dataset.id);
    if (t("[data-go]")) return show(t("[data-go]").dataset.go);
    if (t("[data-clear-target]")) { target = null; return renderPage("browse"); }
    const fl = t("[data-f]");
    if (fl) {
      const k = fl.dataset.f;
      if (k === "clear") { f.env = null; f.agent = null; return renderPage(section); }
      if (k === "env") return openMenu(fl, [{ label: "All Environments", value: null, checked: !f.env }, "-", ...ENVS.map((x) => ({ label: x.label, value: x.id, checked: f.env === x.id }))], (it) => { f.env = it.value; renderPage(section); });
      return openMenu(fl, [{ label: "All Agents", value: null, checked: !f.agent }, "-", ...AGENTS.map((a) => ({ label: HARNESSES[a].label, value: a, checked: f.agent === a }))], (it) => { f.agent = it.value; renderPage(section); });
    }
    const tw = t("[data-twisty]");
    if (tw) { const g = tw.dataset.twisty; open.has(g) ? open.delete(g) : open.add(g); return renderPage(section); }
    const c = t("[data-cell]");
    if (c) {
      const [kind, id, k] = c.dataset.cell.split("|"), it = findItem(kind, id), on = it.at.has(k);
      on ? it.at.delete(k) : it.at.add(k);
      changed();
      return toast(`${on ? "Removed" : "Installed"} ${it.name} ${on ? "from" : "on"} ${placeLabel(k)}.`, ["Undo"], () => { on ? it.at.add(k) : it.at.delete(k); changed(); });
    }
    const td = t("[data-tri-def]");
    if (td) { const it = conn(td.dataset.triDef); it.def = td.dataset.v; changed(); return toast(`${it.name}: ${POLICY[it.def]} by default.${it.ws && Object.keys(it.ws).length ? " Workspaces with their own setting keep it." : ""}`); }
    const pk = t("vsc-checkbox[data-pick]");
    if (pk) { pk.hasAttribute("checked") ? picked.add(pk.dataset.pick) : picked.delete(pk.dataset.pick); const b = hosted[section].querySelector(".en-bulk"); b.hidden = !picked.size; b.querySelector("span").textContent = `${plural(picked.size, "item")} selected`; return; }
    if (t("[data-bulk-clear]")) { picked.clear(); return renderPage(section); }
    if (t("[data-bulk-install]")) { const list = [...picked].map(itemOf).filter(Boolean); return openInstall({ items: list, mode: "copy", preset: [], title: "Install on more environments", onDone: () => picked.clear() }); }
    const more = t("[data-row-more]");
    if (more) {
      const it = itemOf(more.dataset.rowMore);
      return openMenu(more, [{ label: "Manage Installs...", act: "edit" }, { label: "Install Everywhere", act: "all" }, "-", { label: "Uninstall Everywhere", act: "none" }], (m) => {
        if (m.act === "edit") return openInstall({ items: [it], mode: "edit" });
        const before = new Set(it.at);
        it.at = m.act === "all" ? new Set(ALL_SLOTS.filter((k) => supports(it, split(k)[1]))) : new Set();
        changed();
        toast(m.act === "all" ? `Installed ${it.name} everywhere.` : `Uninstalled ${it.name} everywhere.`, ["Undo"], () => { it.at = before; changed(); });
      });
    }
    const cf = t("[data-copy-from]");
    if (cf) {
      const e2 = envOf(cf.dataset.copyFrom), onLocal = (x) => e2.agents.some((a) => x.at.has(K("local", a))), here = (x) => e2.agents.some((a) => x.at.has(K(e2.id, a)));
      return openInstall({ items: [...CONNECTIONS, ...USER_SKILLS].filter((x) => onLocal(x) && !here(x)), mode: "copy", preset: e2.agents.map((a) => K(e2.id, a)), title: `Copy to ${e2.label}`, sub: "From This Computer" });
    }
    const es = t("[data-env-show]");
    if (es) return show("connections", { env: es.dataset.envShow });
    if (t("[data-add-env]")) return toast("Add an SSH host, dev container or cloud environment. It starts with nothing installed; copy customizations from another environment.");
    if (t("[data-setup]")) return toast("Install an agent on this environment, like Claude or Codex.");
    const cs = t("[data-customize-session]");
    if (cs) return opts.onSession(cs.dataset.customizeSession);
  });
  root.addEventListener("input", (e) => { if (e.target.closest(".en-q")) { f.q = e.target.value || ""; renderPage(section); } });
  // Discover: install asks where; things you already have open where they're installed.
  host.addEventListener("install", (e) => {
    const card = e.target.closest("vsc-customization-discovery-card"), name = card.getAttribute("name");
    const existing = cardItem(name);
    if (existing) return openInstall({ items: [existing], mode: "edit", here: target });
    const meta = card.getAttribute("meta") || "", kind = /^Skill/.test(meta) ? "skill" : /^Plugin/.test(meta) ? "plugin" : "connection";
    const item = { kind, id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, card: name, icon: { src: card.getAttribute("icon-src") }, does: card.getAttribute("description"), sub: meta, at: new Set(), def: "on" };
    openInstall({ items: [item], mode: "new", preset: target ? [target] : ALL_SLOTS, here: target, sub: meta, onDone: () => card.setAttribute("action", "Manage") });
  });
  host.addEventListener("search", (e) => {
    const q = e.detail.query.trim().toLowerCase();
    for (const s of host.querySelectorAll("vsc-customization-discovery-section")) {
      let any = false;
      for (const card of s.querySelectorAll("vsc-customization-discovery-card")) {
        const hit = !q || ["name", "description", "meta"].some((a) => (card.getAttribute(a) || "").toLowerCase().includes(q));
        card.style.display = hit ? "" : "none"; any ||= hit;
      }
      s.style.display = any ? "" : "none";
    }
  });
  root.querySelector(".se-nav-list").addEventListener("keydown", (e) => {
    const items = [...root.querySelectorAll(".se-nav-item")], i = items.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1 }[e.key];
    if (i < 0 || next == null) return;
    e.preventDefault();
    const el = items[(next + items.length) % items.length];
    el.focus(); show(el.dataset.id);
  });
  return { show, get section() { return section; } };
}
renderPills();

export { AGENTS, CONNECTIONS, USER_SKILLS, PLUGINS, K, split, ALL_SLOTS, supports, polOf, POLICY, tri, iconHtml, plural, sessions, slotOf, placeLabel, placeChip, changed, subs, countsFor, envOf, skillsAt };
