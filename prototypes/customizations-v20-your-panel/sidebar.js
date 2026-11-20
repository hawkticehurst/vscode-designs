/* V20 — The session's Customizations panel, now one you can customize (after Gemma and Julia: "let the user decide what goes
   there", like Word's customizable ribbon).
   - Sections (Needs Attention, Used in This Session, Plugins, MCP Servers, Skills…) show, hide and reorder from the
     Customize Panel page, from a preset, or with a section header's Hide button or context menu. The layout persists.
   - Used in This Session (after Alex): what the agent loaded and called, its cost, and stalls.
   - Switches are per session; a row that differs from its default says so ("Off in this session").
   - When the panel is wide (an existing session with room, or maximized), a Source column appears.
   - Workspace customizations stay a sub-page, with a breadcrumb back. */
import { store } from "./scope-store.js";
import { toast, openMenu } from "./panel-shell.js";
import { CONNECTIONS, PLUGINS, USER_SKILLS, K, polOf, iconHtml, subs, envOf, hooks } from "./env.js?v=12";
import { USAGE, SECTIONS, PRESETS, layout, saveLayout, applyPreset, resetLayout, settlePreset, money } from "./usage.js?v=1";
const { esc } = window.CUST;
const { HARNESSES, TYPES, WORKSPACES, resolve, workspaceLabel } = window.SCOPE;

const skey = () => store.session?.id || "new";
const hereKey = () => K(store.scope.environment, store.scope.harness);
// Per-session switches (id → on); otherwise the item's own policy. The triage session starts with Slack off.
const sessionOn = new Map([["triage", new Map([["slack", false]])]]);
const onMap = (k = skey()) => { if (!sessionOn.has(k)) sessionOn.set(k, new Map()); return sessionOn.get(k); };
const defOn = (it) => (it.kind === "plugin" ? !it.disabled : it.kind === "file" ? !it.blocked : polOf(it).v !== "off");
const ownOn = (it) => (onMap().has(it.id) ? onMap().get(it.id) : defOn(it));
const parentOf = (it) => it.origin?.plugin || it.parent;
const isOn = (it) => ownOn(it) && (!parentOf(it) || ownOn(parentOf(it)));
const NEEDS = {
  signin: { status: "Not signed in", action: "Sign In", attr: "data-sb-signin", cls: "is-warn", icon: "warning" },
  error: { status: "Couldn't start", action: "Show Output", attr: "data-sb-output", cls: "is-error", icon: "error" },
};
const WS_TYPES = ["skills", "instructions", "agents", "hooks"];
const WIDE = 520;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const typeIcon = (t) => TYPES.find((x) => x.id === t)?.icon || "file";

export function mountSidebar(root, opts) {
  root.innerHTML = `<div class="sb-panel cv-panel pt-panel"><div class="pt-sub" hidden></div><div class="cp-scroll pt-scroll"></div></div>`;
  const $ = (s) => root.querySelector(s);
  const collapsed = new Set();
  let view = "main", wide = false;
  const files = new Map();

  // Rows of the repo's own customizations, as items the panel can switch per session.
  function wsItems() {
    const scope = store.scope, { applies, excluded } = resolve(scope);
    return [...applies, ...excluded].filter((x) => x.source === "workspace" && WS_TYPES.includes(x.type)).map((x) => {
      const id = `file:${x.workspace}:${x.path}`;
      if (!files.has(id)) files.set(id, { kind: "file", id, type: x.type, name: x.name, path: x.path, src: "Workspace" });
      return Object.assign(files.get(id), { blocked: x.blocked || null });
    });
  }
  // A plugin's skills and other files (every plugin-sourced row in the data belongs to the Security plugin).
  function pluginFiles(p) {
    if (p.id !== "security") return [];
    return window.SCOPE.items.filter((x) => x.source === "plugin" && WS_TYPES.includes(x.type)).map((x) => {
      const id = `pfile:${x.path || x.name}`;
      if (!files.has(id)) files.set(id, { kind: "file", id, type: x.type, name: x.name, path: x.path, parent: p });
      return files.get(id);
    });
  }
  function sourceOf(it) {
    if (it.src) return it.src;
    const p = parentOf(it);
    if (p) return p.id === "security" ? "Security plugin" : p.name;
    if (it.kind === "plugin") return "Marketplace";
    if (it.workspace) return "Workspace";
    return "User";
  }

  const sw = (it, label = `${it.name} in this session`) => { const on = ownOn(it); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-sb-toggle="${esc(it.id)}"><div class="monaco-switch-thumb"></div></button>`; };
  const twisty = (key, isOpen, label) => `<button type="button" class="pt-twisty" data-pt-toggle="${esc(key)}" aria-label="${isOpen ? "Collapse" : "Expand"} ${esc(label)}" aria-expanded="${isOpen}"><span class="codicon codicon-chevron-${isOpen ? "down" : "right"}" aria-hidden="true"></span></button>`;
  const status = (text, cls = "is-muted", icon = "") => (text ? `<span class="ct-status ${cls}">${icon ? `<span class="codicon codicon-${icon}" aria-hidden="true"></span>` : ""}<span class="ct-label">${text}</span></span>` : "");
  const cols = () => 3 + (wide ? 1 : 0);
  const srcCell = (text) => (wide ? `<td><div class="ct-cell ct-muted pt-src">${esc(text || "")}</div></td>` : "");

  function statusOf(it) {
    const p = parentOf(it);
    if (it.blocked) return status(esc(it.blocked.badge));
    if (p && !ownOn(p)) return status("Off with plugin");
    const own = onMap().has(it.id) && onMap().get(it.id) !== defOn(it);
    if (!ownOn(it)) return status(own ? "Off in this session" : "Off", own ? "is-muted pt-session" : "is-muted");
    if (NEEDS[it.state]) { const n = NEEDS[it.state]; return status(n.status, n.cls, n.icon); }
    if (own) return status("On in this session", "is-muted pt-session");
    if (it.state === "stopped") return status("On demand");
    return "";
  }
  function endOf(it) {
    if (it.blocked || (parentOf(it) && !ownOn(parentOf(it)))) return "";
    if (NEEDS[it.state] && isOn(it)) { const n = NEEDS[it.state]; return `<button type="button" class="cv-action" ${n.attr}="${esc(it.id)}">${n.action}</button>`; }
    return sw(it);
  }
  // A section's header row. Sections on the main page can be hidden from here (or from their context menu).
  const groupRow = (key, label, { count = null, level = 1, section = null } = {}) => {
    const isOpen = !collapsed.has(key);
    const hide = section ? `<button type="button" class="pt-hide" data-sb-hide="${esc(section)}" aria-label="Hide ${esc(label)} from this panel" title="Hide from Panel"><span class="codicon codicon-eye-closed" aria-hidden="true"></span></button>` : "";
    return `<tr class="pt-group" aria-level="${level}" aria-expanded="${isOpen}" data-pt-row-toggle="${esc(key)}"${section ? ` data-sb-section="${esc(section)}"` : ""}><td colspan="${cols()}"><div class="ct-cell">${twisty(key, isOpen, label)}<span class="pt-group-label">${label}</span>${count != null ? `<span class="pt-count">${count}</span>` : ""}${hide}</div></td></tr>`;
  };
  function itemRow(it, level, kids = []) {
    const key = `item:${it.id}`, isOpen = kids.length && !collapsed.has(key);
    const icon = it.kind === "file" ? `<span class="codicon codicon-${typeIcon(it.type)} ct-icon" aria-hidden="true"></span>` : iconHtml(it, 16);
    const dim = !isOn(it) || it.blocked;
    return `<tr class="ct-row pt-row${dim ? " is-off" : ""}" tabindex="-1" aria-level="${level}"${kids.length ? ` aria-expanded="${!!isOpen}"` : ""} data-sb-row="${esc(it.id)}" title="${esc(it.path || it.does || it.name)}">
      <td><div class="ct-cell" style="--pt-level:${level}">${kids.length ? twisty(key, isOpen, it.name) : '<span class="pt-twisty-space"></span>'}${icon}<span class="ct-label ct-name">${esc(it.name)}</span></div></td>
      <td><div class="ct-cell">${statusOf(it)}</div></td>${srcCell(sourceOf(it))}
      <td><div class="ct-cell pt-end">${endOf(it)}</div></td></tr>
      ${isOpen ? kids.map((k) => itemRow(k, level + 1)).join("") : ""}`;
  }
  const drillRow = (attr, icon, name, statusText, src) => `<tr class="ct-row pt-row pt-drill" tabindex="-1" aria-level="2" ${attr}>
      <td><div class="ct-cell" style="--pt-level:2"><span class="pt-twisty-space"></span><span class="codicon codicon-${icon} ct-icon" aria-hidden="true"></span><span class="ct-label ct-name">${esc(name)}</span></div></td>
      <td><div class="ct-cell">${status(statusText)}</div></td>${srcCell(src)}
      <td><div class="ct-cell pt-end"><span class="codicon codicon-chevron-right pt-drill-ic" aria-hidden="true"></span></div></td></tr>`;
  const note = (html, cls = "") => `<tr class="pt-empty ${cls}"><td colspan="${cols()}"><div class="ct-cell ct-muted" style="--pt-level:2"><span class="pt-twisty-space"></span><span class="pt-note-text">${html}</span></div></td></tr>`;
  const table = (label, body) => `<table class="ct-table pt-table" role="treegrid" aria-label="${esc(label)}">
      <colgroup><col><col style="width:${wide ? 150 : 116}px">${wide ? '<col style="width:132px">' : ""}<col style="width:84px"></colgroup>
      <thead><tr><th scope="col"><span class="ct-th">Name</span></th><th scope="col"><span class="ct-th">Status</span></th>${wide ? '<th scope="col"><span class="ct-th">Source</span></th>' : ""}<th scope="col"><span class="ct-th pt-sr">Action</span></th></tr></thead>
      <tbody>${body}</tbody></table>`;

  // Used in This Session: a row per customization the agent loaded or called, most expensive first.
  function usageItem(u) {
    if (u.conn) { const c = CONNECTIONS.find((x) => x.id === u.conn); return c && { it: c, icon: iconHtml(c, 16), id: c.id, name: c.name, src: sourceOf(c) }; }
    if (u.skill) { const mine = USER_SKILLS.some((s) => s.name === u.skill); return { icon: `<span class="codicon codicon-${typeIcon("skills")} ct-icon" aria-hidden="true"></span>`, id: `skill:${u.skill}`, name: u.skill, src: mine ? "User" : "Workspace" }; }
    return { icon: `<span class="codicon codicon-${typeIcon(u.type)} ct-icon" aria-hidden="true"></span>`, id: `doc:${u.file}`, name: u.file, src: "Workspace" };
  }
  function activityRows() {
    const list = (USAGE[skey()] || []).map((u) => ({ u, ...usageItem(u) })).filter((x) => x.name).sort((a, b) => b.u.cost - a.u.cost);
    if (!list.length) return note(store.session ? "Nothing used yet." : "Usage shows here once the session starts.");
    const total = list.reduce((s, x) => s + x.u.cost, 0), stalls = list.reduce((s, x) => s + (x.u.stalls?.n || 0), 0);
    const sum = note(`${layout.cost ? `${money(total)} · ` : ""}${plural(list.length, "customization")}${stalls ? ` · <span class="pt-warn-text">${plural(stalls, "stall")}</span>` : ""}`, "pt-summary");
    return sum + list.map(({ u, icon, id, name, src }) => {
      const st = u.stalls ? status(`${plural(u.stalls.n, "stall")} · ${u.stalls.secs}s`, "is-warn", "warning") : status(esc(u.wait || u.uses));
      const tip = `${name} · ${u.uses}${u.tokens ? ` · ${Math.round(u.tokens / 100) / 10}k tokens` : ""}${u.cost ? ` · ${money(u.cost)}` : ""}`;
      return `<tr class="ct-row pt-row pt-use" tabindex="-1" aria-level="2" data-sb-use="${esc(id)}" title="${esc(tip)}">
        <td><div class="ct-cell" style="--pt-level:2"><span class="pt-twisty-space"></span>${icon}<span class="ct-label ct-name">${esc(name)}</span></div></td>
        <td><div class="ct-cell">${st}</div></td>${srcCell(src)}
        <td><div class="ct-cell pt-end">${layout.cost ? `<span class="pt-cost">${money(u.cost)}</span>` : ""}</div></td></tr>`;
    }).join("");
  }

  function renderMain() {
    const k = hereKey(), env = envOf(store.scope.environment), agent = HARNESSES[store.scope.harness].label;
    const here = (it) => it.at.has(k) && (!it.workspace || it.workspace === store.scope.workspace);
    const plugins = PLUGINS.filter(here), mcp = CONNECTIONS.filter(here);
    const kidsOf = (p) => [...mcp.filter((c) => parentOf(c) === p), ...pluginFiles(p)];
    const needs = mcp.filter((c) => NEEDS[c.state] && isOn(c));
    const own = mcp.filter((c) => !parentOf(c) && !(layout.shown.includes("needs") && needs.includes(c)));
    const none = note(`None on ${esc(env.label)} for ${esc(agent)}`);
    const ws = store.scope.workspace, wsList = WORKSPACES[ws] ? wsItems() : [];
    const yours = USER_SKILLS.filter((x) => x.at.has(k));
    const SEC = {
      needs: () => (needs.length ? ["Needs Attention", needs.map((c) => itemRow(c, 2)).join("")] : null),
      activity: () => ["Used in This Session", activityRows()],
      plugins: () => ["Plugins", plugins.map((p) => itemRow(p, 2, kidsOf(p))).join("")],
      mcp: () => ["MCP Servers", own.map((c) => itemRow(c, 2)).join("")],
      more: () => ["Skills, Instructions &amp; Agents", `${WORKSPACES[ws] ? drillRow("data-sb-ws", "folder", workspaceLabel(ws), plural(wsList.filter((x) => !x.blocked).length, "item"), "Workspace") : ""}${drillRow('data-sb-more-type="skills"', "account", "Yours", plural(yours.length, "skill"), "User")}`],
    };
    const shown = layout.order.filter((id) => layout.shown.includes(id));
    const body = shown.map((id) => {
      const s = SEC[id]();
      if (!s) return "";
      return groupRow(id, s[0], { section: id }) + (collapsed.has(id) ? "" : s[1] || none);
    }).join("");
    const empty = !shown.length ? `<div class="pt-blank"><p>This panel is empty.</p><button type="button" class="pt-link" data-sb-customize><span class="codicon codicon-layout" aria-hidden="true"></span>Customize Panel</button></div>` : "";
    $(".pt-scroll").innerHTML = (shown.length ? table("Customizations in this session", body) : empty)
      + `<div class="pt-foot"><button type="button" class="pt-link" data-sb-browse="browse"><span class="codicon codicon-compass" aria-hidden="true"></span>Discover</button><button type="button" class="pt-link" data-sb-more-type="plugins"><span class="codicon codicon-settings" aria-hidden="true"></span>Manage</button><button type="button" class="pt-link pt-link-end" data-sb-customize title="Customize Panel"><span class="codicon codicon-layout" aria-hidden="true"></span>Customize</button></div>`;
  }

  function renderWorkspace() {
    const ws = store.scope.workspace, w = WORKSPACES[ws];
    if (!w) { view = "main"; return renderMain(); }
    const list = wsItems(), agent = HARNESSES[store.scope.harness].label;
    $(".pt-sub").innerHTML = crumbs(w.label);
    const rows = WS_TYPES.map((t) => {
      const of = list.filter((x) => x.type === t).sort((a, b) => a.name.localeCompare(b.name)), key = `ws:${t}`;
      if (!of.length) return "";
      return groupRow(key, TYPES.find((x) => x.id === t).label, { count: of.length }) + (collapsed.has(key) ? "" : of.map((x) => itemRow(x, 2)).join(""));
    }).join("");
    const off = list.filter((x) => x.blocked).length;
    $(".pt-scroll").innerHTML = `<p class="pt-note">From <span class="pt-path">${esc(w.path)}</span>. They load with every session in this repo${off ? `; ${plural(off, "item")} ${off === 1 ? "doesn't" : "don't"} apply in ${esc(agent)}` : ""}.</p>${table(`${w.label} customizations`, rows)}`;
  }
  const crumbs = (label) => `<div class="pt-crumbs"><button type="button" class="pt-crumb" data-sb-back>Customizations</button><span class="codicon codicon-chevron-right" aria-hidden="true"></span><span class="pt-crumb is-current" aria-current="page">${esc(label)}</span></div>`;

  // Customize Panel: a preset to start from, then each section's checkbox and its place in the order.
  function renderCustomize() {
    $(".pt-sub").innerHTML = crumbs("Customize Panel");
    const presets = [...PRESETS, ...(layout.preset === "custom" ? [{ id: "custom", label: "Custom" }] : [])];
    const rows = layout.order.map((id, i) => {
      const s = SECTIONS.find((x) => x.id === id), on = layout.shown.includes(id);
      return `<li class="pc-row${on ? "" : " is-off"}" draggable="true" data-pc-sec="${id}">
        <span class="codicon codicon-gripper pc-grip" aria-hidden="true"></span>
        <vsc-checkbox ${on ? "checked" : ""} label="Show ${esc(s.label)}" data-pc-show="${id}"></vsc-checkbox>
        <span class="pc-text"><span class="pc-label">${esc(s.label)}</span><span class="pc-desc">${esc(s.desc)}</span></span>
        <span class="pc-move"><button type="button" class="pt-icon-btn" data-pc-move="-1" aria-label="Move ${esc(s.label)} up"${i === 0 ? " disabled" : ""}><span class="codicon codicon-arrow-up" aria-hidden="true"></span></button><button type="button" class="pt-icon-btn" data-pc-move="1" aria-label="Move ${esc(s.label)} down"${i === layout.order.length - 1 ? " disabled" : ""}><span class="codicon codicon-arrow-down" aria-hidden="true"></span></button></span></li>`;
    }).join("");
    const opt = (key, label, desc) => `<li class="pc-row pc-opt"><vsc-checkbox ${layout[key] ? "checked" : ""} label="${esc(label)}" data-pc-opt="${key}"></vsc-checkbox><span class="pc-text"><span class="pc-label">${esc(label)}</span><span class="pc-desc">${esc(desc)}</span></span></li>`;
    $(".pt-scroll").innerHTML = `<p class="pt-note">Choose what this panel shows in every session. Drag sections to reorder them.</p>
      <div class="pc-head" id="pc-presets">Start From</div>
      <div class="pc-presets" role="radiogroup" aria-labelledby="pc-presets">${presets.map((p) => `<button type="button" role="radio" class="pc-preset${layout.preset === p.id ? " is-on" : ""}" aria-checked="${layout.preset === p.id}" data-pc-preset="${p.id}"${p.id === "custom" ? " disabled" : ""}>${esc(p.label)}</button>`).join("")}</div>
      <div class="pc-head" id="pc-secs">Sections</div>
      <ul class="pc-list" aria-labelledby="pc-secs">${rows}</ul>
      <div class="pc-head" id="pc-rows">Rows</div>
      <ul class="pc-list" aria-labelledby="pc-rows">${opt("hoverSwitches", "Show switches on hover", "Keep rows quiet until you point at one")}${opt("cost", "Show cost", "In Used in This Session")}</ul>
      <div class="pt-foot"><button type="button" class="pt-link" data-pc-reset><span class="codicon codicon-discard" aria-hidden="true"></span>Reset to Default</button></div>`;
  }

  function render() {
    const panel = root.querySelector(".pt-panel");
    $(".pt-sub").hidden = view === "main";
    panel.classList.toggle("is-sub", view !== "main");
    panel.classList.toggle("is-wide", wide);
    panel.classList.toggle("is-switches-always", !layout.hoverSwitches);
    if (view === "workspace") renderWorkspace();
    else if (view === "customize") renderCustomize();
    else renderMain();
  }
  function go(v) {
    view = v; render();
    $(".pt-scroll").scrollTop = 0;
    requestAnimationFrame(() => (v !== "main" ? $(".pt-crumb[data-sb-back]") : $("[data-sb-ws]"))?.focus());
  }
  function hideSection(id) {
    const s = SECTIONS.find((x) => x.id === id);
    layout.shown = layout.shown.filter((x) => x !== id); settlePreset(); render();
    toast(`${s.label} is hidden from this panel.`, ["Undo", "Customize Panel"], (b) => {
      if (b === "Undo") { layout.shown.push(id); settlePreset(); render(); } else go("customize");
    });
  }
  function move(id, d) {
    const i = layout.order.indexOf(id), j = i + d;
    if (j < 0 || j >= layout.order.length) return;
    layout.order.splice(i, 1); layout.order.splice(j, 0, id); settlePreset(); render();
  }

  const all = () => [...PLUGINS, ...CONNECTIONS, ...files.values()];
  const byId = (id) => all().find((x) => x.id === id);
  const ctx = () => ({ env: store.scope.environment, ws: store.scope.workspace, agent: store.scope.harness });
  const childrenOf = (p) => CONNECTIONS.filter((c) => parentOf(c) === p && c.at.has(hereKey()));
  function openItem(it) {
    if (it.kind === "file") return toast(`Opened ${it.path || it.name}.`);
    return hooks.openDetail(it.kind === "plugin" ? "plugins" : "connections", it.id);
  }
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    const hide = t("[data-sb-hide]");
    if (hide) return hideSection(hide.dataset.sbHide);
    const tw = t("[data-pt-toggle]") || t("[data-pt-row-toggle]");
    if (tw) {
      const key = tw.dataset.ptToggle || tw.dataset.ptRowToggle;
      collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
      render();
      return root.querySelector(`[data-pt-toggle="${CSS.escape(key)}"]`)?.focus();
    }
    const tg = t("[data-sb-toggle]");
    if (tg) {
      const it = byId(tg.dataset.sbToggle), m = onMap(), was = ownOn(it);
      m.set(it.id, !was); render();
      root.querySelector(`[data-sb-toggle="${CSS.escape(it.id)}"]`)?.focus();
      const kids = it.kind === "plugin" ? childrenOf(it) : [];
      const also = kids.length ? ` ${kids.map((c) => c.name).join(", ")} ${was ? "is off" : "is back on"} with it.` : "";
      return toast(`${it.name} is ${was ? "off" : "on"} in this session only. Other sessions in ${workspaceLabel(store.scope.workspace)} keep their setting.${also}`, ["Undo"], () => { m.set(it.id, was); render(); });
    }
    if (t("[data-sb-back]")) return go("main");
    if (t("[data-sb-ws]")) return go("workspace");
    if (t("[data-sb-customize]")) return go("customize");
    const pr = t("[data-pc-preset]");
    if (pr) { applyPreset(pr.dataset.pcPreset); render(); return $(`[data-pc-preset="${pr.dataset.pcPreset}"]`)?.focus(); }
    const show = t("[data-pc-show]");
    if (show) {
      const id = show.dataset.pcShow;
      layout.shown = layout.shown.includes(id) ? layout.shown.filter((x) => x !== id) : [...layout.shown, id];
      settlePreset(); render(); return $(`[data-pc-show="${id}"]`)?.focus();
    }
    const opt = t("[data-pc-opt]");
    if (opt) { layout[opt.dataset.pcOpt] = !layout[opt.dataset.pcOpt]; saveLayout(); render(); return $(`[data-pc-opt="${opt.dataset.pcOpt}"]`)?.focus(); }
    const mv = t("[data-pc-move]");
    if (mv) { const id = mv.closest("[data-pc-sec]").dataset.pcSec; move(id, +mv.dataset.pcMove); return $(`[data-pc-sec="${id}"] [data-pc-move="${mv.dataset.pcMove}"]:not([disabled])`)?.focus() || $(`[data-pc-show="${id}"]`)?.focus(); }
    if (t("[data-pc-reset]")) { resetLayout(); render(); return toast("The panel is back to its default sections."); }
    const out = t("[data-sb-output]");
    if (out) return hooks.openDetail("connections", out.dataset.sbOutput, { output: true });
    const si = t("[data-sb-signin]");
    if (si) { const it = byId(si.dataset.sbSignin); it.state = "ok"; render(); document.dispatchEvent(new CustomEvent("item-signed-in", { detail: { id: it.id } })); return toast(`Signed in to ${it.name}.`); }
    if (t("[data-sb-browse]")) return opts.onBrowse();
    const mt = t("[data-sb-more-type]");
    if (mt) return opts.onConfigure(`${store.scope.harness}:${mt.dataset.sbMoreType}`, ctx());
    const use = t("[data-sb-use]");
    if (use) {
      const id = use.dataset.sbUse;
      if (id.startsWith("skill:")) return hooks.openDetail("skills", id.slice(6));
      if (id.startsWith("doc:")) return toast(`Opened ${id.slice(4)}.`);
      return hooks.openDetail("connections", id, USAGE[skey()]?.find((u) => u.conn === id)?.stalls ? { output: true } : undefined);
    }
    const rr = t("[data-sb-row]");
    if (rr) return openItem(byId(rr.dataset.sbRow));
  });
  // A section header's context menu, like a toolbar's: hide it, or customize the whole panel.
  root.addEventListener("contextmenu", (e) => {
    const g = e.target.closest("[data-sb-section]");
    if (!g || view !== "main") return;
    e.preventDefault();
    const id = g.dataset.sbSection, s = SECTIONS.find((x) => x.id === id), i = layout.order.filter((x) => layout.shown.includes(x)).indexOf(id), n = layout.shown.length;
    openMenu({ x: e.clientX, y: e.clientY }, [
      { label: `Hide ${s.label}`, act: "hide" }, "-",
      { label: "Move Up", act: "up", disabled: i === 0 }, { label: "Move Down", act: "down", disabled: i === n - 1 }, "-",
      { label: "Customize Panel...", act: "customize" },
    ], (m) => {
      if (m.act === "hide") return hideSection(id);
      if (m.act === "customize") return go("customize");
      const vis = layout.order.filter((x) => layout.shown.includes(x)), other = vis[i + (m.act === "up" ? -1 : 1)];
      const a = layout.order.indexOf(id), b = layout.order.indexOf(other);
      [layout.order[a], layout.order[b]] = [layout.order[b], layout.order[a]];
      settlePreset(); render();
    });
  });
  // Drag a section on the Customize Panel page to reorder it.
  let dragId = null;
  root.addEventListener("dragstart", (e) => { const li = e.target.closest?.("[data-pc-sec]"); if (!li) return; dragId = li.dataset.pcSec; li.classList.add("is-dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); });
  root.addEventListener("dragover", (e) => {
    const li = e.target.closest?.("[data-pc-sec]");
    if (!li || !dragId) return;
    e.preventDefault();
    const r = li.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
    for (const x of root.querySelectorAll(".pc-row")) x.classList.remove("drop-before", "drop-after");
    if (li.dataset.pcSec !== dragId) li.classList.add(after ? "drop-after" : "drop-before");
  });
  root.addEventListener("drop", (e) => {
    const li = e.target.closest?.("[data-pc-sec]");
    if (!li || !dragId) return;
    e.preventDefault();
    const target = li.dataset.pcSec, after = li.classList.contains("drop-after");
    if (target !== dragId) {
      layout.order.splice(layout.order.indexOf(dragId), 1);
      layout.order.splice(layout.order.indexOf(target) + (after ? 1 : 0), 0, dragId);
      settlePreset();
    }
    dragId = null; render();
  });
  root.addEventListener("dragend", () => { dragId = null; for (const x of root.querySelectorAll(".pc-row")) x.classList.remove("is-dragging", "drop-before", "drop-after"); });
  // Keyboard: arrows move between rows, Left/Right collapse and expand, Enter opens, Backspace leaves a sub-page.
  root.addEventListener("keydown", (e) => {
    const row = e.target.closest?.("tr.ct-row, tr.pt-group");
    if (e.key === "Backspace" && view !== "main" && !e.target.matches("input")) { e.preventDefault(); return go("main"); }
    if (!row || e.target.closest(".monaco-switch, .cv-action, .pt-hide")) return;
    const rows = [...root.querySelectorAll("tr.ct-row, tr.pt-group")], i = rows.indexOf(row);
    const focusRow = (r) => { if (!r) return; (r.matches(".pt-group") ? r.querySelector(".pt-twisty") : r).focus(); };
    if (e.key === "ArrowDown") { e.preventDefault(); focusRow(rows[i + 1]); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusRow(rows[i - 1]); }
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && row.hasAttribute("aria-expanded")) {
      const open = row.getAttribute("aria-expanded") === "true";
      if ((e.key === "ArrowLeft") === open) { e.preventDefault(); row.querySelector(".pt-twisty")?.click(); }
    } else if (e.key === "Enter" && row.matches(".ct-row")) { e.preventDefault(); row.click(); }
  });
  // Wide panels get a Source column.
  new ResizeObserver(() => { const w = root.clientWidth >= WIDE; if (w !== wide) { wide = w; render(); } }).observe(root);
  // The chat turns an item on for this session (Allow in This Session), and the panel shows it.
  document.addEventListener("session-item-on", (e) => { onMap(e.detail.session).set(e.detail.id, true); render(); });
  subs.add(render);
  const reset = () => requestAnimationFrame(() => { if (view === "workspace") view = "main"; render(); });
  document.addEventListener("session-open", reset);
  document.addEventListener("session-new", reset);
  render();
  return { render, customize: () => go("customize") };
}
export const sessionItemOn = (session, id) => (sessionOn.get(session)?.has(id) ? sessionOn.get(session).get(id) : null);
window.__sessionItemOn = sessionItemOn;
