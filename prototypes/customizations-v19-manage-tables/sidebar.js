/* V19 — The session's Customizations panel as a tree table.
   - Columns: Name, Status, and an end column for the one action an item needs (Sign In, Show Output) or its
     session switch, which stays hidden until you reach for the row (V17's calm rules).
   - Parent rows collapse: each group (Needs Attention, Plugins, MCP Servers, Skills & More) and each plugin, whose
     MCP servers and skills sit under it instead of in their own lists.
   - Workspace customizations (the repo's skills, instructions, agents and hooks) are a sub-page: a drill-in row opens
     them as tables per type, with a breadcrumb to return. */
import { store } from "./scope-store.js";
import { toast } from "./panel-shell.js";
import { CONNECTIONS, PLUGINS, USER_SKILLS, K, polOf, iconHtml, subs, envOf, hooks } from "./env.js?v=12";
const { esc } = window.CUST;
const { HARNESSES, TYPES, WORKSPACES, resolve, workspaceLabel } = window.SCOPE;

const skey = () => store.session?.id || "new";
const hereKey = () => K(store.scope.environment, store.scope.harness);
// Per-session switches (id → on); otherwise the item's own policy. The triage session starts with Slack off.
const sessionOn = new Map([["triage", new Map([["slack", false]])]]);
const onMap = (k = skey()) => { if (!sessionOn.has(k)) sessionOn.set(k, new Map()); return sessionOn.get(k); };
const ownOn = (it) => (onMap().has(it.id) ? onMap().get(it.id) : it.kind === "plugin" ? !it.disabled : it.kind === "file" ? !it.blocked : polOf(it).v !== "off");
const parentOf = (it) => it.origin?.plugin || it.parent;
const isOn = (it) => ownOn(it) && (!parentOf(it) || ownOn(parentOf(it)));
const NEEDS = {
  signin: { status: "Not signed in", action: "Sign In", attr: "data-sb-signin", cls: "is-warn", icon: "warning" },
  error: { status: "Couldn't start", action: "Show Output", attr: "data-sb-output", cls: "is-error", icon: "error" },
};
const WS_TYPES = ["skills", "instructions", "agents", "hooks"];
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function mountSidebar(root, opts) {
  root.innerHTML = `<div class="sb-panel cv-panel pt-panel"><div class="pt-sub" hidden></div><div class="cp-scroll pt-scroll"></div></div>`;
  const $ = (s) => root.querySelector(s);
  const collapsed = new Set();
  let view = "main";
  const files = new Map();

  // Rows of the repo's own customizations, as items the panel can switch per session.
  function wsItems() {
    const scope = store.scope, { applies, excluded } = resolve(scope);
    return [...applies, ...excluded].filter((x) => x.source === "workspace" && WS_TYPES.includes(x.type)).map((x) => {
      const id = `file:${x.workspace}:${x.path}`;
      if (!files.has(id)) files.set(id, { kind: "file", id, type: x.type, name: x.name, path: x.path });
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

  const sw = (it, label = `${it.name} in this session`) => { const on = ownOn(it); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-sb-toggle="${esc(it.id)}"><div class="monaco-switch-thumb"></div></button>`; };
  const twisty = (key, isOpen, label) => `<button type="button" class="pt-twisty" data-pt-toggle="${esc(key)}" aria-label="${isOpen ? "Collapse" : "Expand"} ${esc(label)}" aria-expanded="${isOpen}"><span class="codicon codicon-chevron-${isOpen ? "down" : "right"}" aria-hidden="true"></span></button>`;
  const status = (text, cls = "is-muted", icon = "") => (text ? `<span class="ct-status ${cls}">${icon ? `<span class="codicon codicon-${icon}" aria-hidden="true"></span>` : ""}<span class="ct-label">${text}</span></span>` : "");

  function statusOf(it) {
    const p = parentOf(it);
    if (it.blocked) return status(esc(it.blocked.badge));
    if (p && !ownOn(p)) return status("Off with plugin");
    if (!ownOn(it)) return status("Off");
    if (NEEDS[it.state]) { const n = NEEDS[it.state]; return status(n.status, n.cls, n.icon); }
    if (it.state === "stopped") return status("On demand");
    return "";
  }
  function endOf(it) {
    if (it.blocked || (parentOf(it) && !ownOn(parentOf(it)))) return "";
    if (NEEDS[it.state] && isOn(it)) { const n = NEEDS[it.state]; return `<button type="button" class="cv-action" ${n.attr}="${esc(it.id)}">${n.action}</button>`; }
    return sw(it);
  }
  const groupRow = (key, label, count, level = 1) => {
    const isOpen = !collapsed.has(key);
    return `<tr class="pt-group" aria-level="${level}" aria-expanded="${isOpen}" data-pt-row-toggle="${esc(key)}"><td colspan="3"><div class="ct-cell">${twisty(key, isOpen, label)}<span class="pt-group-label">${label}</span>${count != null ? `<span class="pt-count">${count}</span>` : ""}</div></td></tr>`;
  };
  function itemRow(it, level, kids = []) {
    const key = `item:${it.id}`, isOpen = kids.length && !collapsed.has(key);
    const icon = it.kind === "file" ? `<span class="codicon codicon-${TYPES.find((t) => t.id === it.type).icon} ct-icon" aria-hidden="true"></span>` : iconHtml(it, 16);
    const dim = !isOn(it) || it.blocked;
    return `<tr class="ct-row pt-row${dim ? " is-off" : ""}" tabindex="-1" aria-level="${level}"${kids.length ? ` aria-expanded="${!!isOpen}"` : ""} data-sb-row="${esc(it.id)}" title="${esc(it.path || it.does || it.name)}">
      <td><div class="ct-cell" style="--pt-level:${level}">${kids.length ? twisty(key, isOpen, it.name) : '<span class="pt-twisty-space"></span>'}${icon}<span class="ct-label ct-name">${esc(it.name)}</span></div></td>
      <td><div class="ct-cell">${statusOf(it)}</div></td>
      <td><div class="ct-cell pt-end">${endOf(it)}</div></td></tr>
      ${isOpen ? kids.map((k) => itemRow(k, level + 1)).join("") : ""}`;
  }
  const drillRow = (attr, icon, name, statusText) => `<tr class="ct-row pt-row pt-drill" tabindex="-1" aria-level="2" ${attr}>
      <td><div class="ct-cell" style="--pt-level:2"><span class="pt-twisty-space"></span><span class="codicon codicon-${icon} ct-icon" aria-hidden="true"></span><span class="ct-label ct-name">${esc(name)}</span></div></td>
      <td><div class="ct-cell">${status(statusText)}</div></td>
      <td><div class="ct-cell pt-end"><span class="codicon codicon-chevron-right pt-drill-ic" aria-hidden="true"></span></div></td></tr>`;
  const table = (label, body) => `<table class="ct-table pt-table" role="treegrid" aria-label="${esc(label)}">
      <colgroup><col><col style="width:116px"><col style="width:84px"></colgroup>
      <thead><tr><th scope="col"><span class="ct-th">Name</span></th><th scope="col"><span class="ct-th">Status</span></th><th scope="col"><span class="ct-th pt-sr">Action</span></th></tr></thead>
      <tbody>${body}</tbody></table>`;

  function renderMain() {
    const k = hereKey(), env = envOf(store.scope.environment), agent = HARNESSES[store.scope.harness].label;
    const here = (it) => it.at.has(k) && (!it.workspace || it.workspace === store.scope.workspace);
    const plugins = PLUGINS.filter(here), mcp = CONNECTIONS.filter(here);
    const kidsOf = (p) => [...mcp.filter((c) => parentOf(c) === p), ...pluginFiles(p)];
    const needs = mcp.filter((c) => NEEDS[c.state] && isOn(c));
    const own = mcp.filter((c) => !needs.includes(c) && !parentOf(c));
    const none = `<tr class="pt-empty"><td colspan="3"><div class="ct-cell ct-muted" style="--pt-level:2"><span class="pt-twisty-space"></span>None on ${esc(env.label)} for ${esc(agent)}</div></td></tr>`;
    const block = (key, label, rows) => groupRow(key, label) + (collapsed.has(key) ? "" : rows || none);
    const ws = store.scope.workspace, wsList = WORKSPACES[ws] ? wsItems() : [];
    const yours = USER_SKILLS.filter((x) => x.at.has(k));
    $(".pt-scroll").innerHTML = table("Customizations in this session", `
      ${needs.length ? block("needs", "Needs Attention", needs.map((c) => itemRow(c, 2)).join("")) : ""}
      ${block("plugins", "Plugins", plugins.map((p) => itemRow(p, 2, kidsOf(p))).join(""))}
      ${block("mcp", "MCP Servers", own.map((c) => itemRow(c, 2)).join(""))}
      ${block("more", "Skills, Instructions &amp; Agents", `${WORKSPACES[ws] ? drillRow('data-sb-ws', "folder", workspaceLabel(ws), plural(wsList.filter((x) => !x.blocked).length, "item")) : ""}${drillRow('data-sb-more-type="skills"', "account", "Yours", plural(yours.length, "skill"))}`)}`)
      + `<div class="pt-foot"><button type="button" class="pt-link" data-sb-browse="browse"><span class="codicon codicon-compass" aria-hidden="true"></span>Discover</button><button type="button" class="pt-link" data-sb-more-type="plugins"><span class="codicon codicon-settings" aria-hidden="true"></span>Manage</button></div>`;
  }

  function renderWorkspace() {
    const ws = store.scope.workspace, w = WORKSPACES[ws];
    if (!w) { view = "main"; return renderMain(); }
    const list = wsItems(), agent = HARNESSES[store.scope.harness].label;
    $(".pt-sub").innerHTML = `<div class="pt-crumbs"><button type="button" class="pt-crumb" data-sb-back>Customizations</button><span class="codicon codicon-chevron-right" aria-hidden="true"></span><span class="pt-crumb is-current" aria-current="page">${esc(w.label)}</span></div>`;
    const rows = WS_TYPES.map((t) => {
      const of = list.filter((x) => x.type === t).sort((a, b) => a.name.localeCompare(b.name)), key = `ws:${t}`;
      if (!of.length) return "";
      return groupRow(key, TYPES.find((x) => x.id === t).label, of.length) + (collapsed.has(key) ? "" : of.map((x) => itemRow(x, 2)).join(""));
    }).join("");
    const off = list.filter((x) => x.blocked).length;
    $(".pt-scroll").innerHTML = `<p class="pt-note">From <span class="pt-path">${esc(w.path)}</span>. They load with every session in this repo${off ? `; ${plural(off, "item")} ${off === 1 ? "doesn't" : "don't"} apply in ${esc(agent)}` : ""}.</p>${table(`${w.label} customizations`, rows)}`;
  }

  function render() {
    const sub = $(".pt-sub");
    sub.hidden = view !== "workspace";
    root.querySelector(".pt-panel").classList.toggle("is-sub", view === "workspace");
    view === "workspace" ? renderWorkspace() : renderMain();
  }
  function go(v) {
    view = v; render();
    $(".pt-scroll").scrollTop = 0;
    requestAnimationFrame(() => (v === "workspace" ? $(".pt-crumb[data-sb-back]") : $("[data-sb-ws]"))?.focus());
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
      return toast(`${it.name} is ${was ? "off" : "on"} for this session.${also}`, ["Undo"], () => { m.set(it.id, was); render(); });
    }
    if (t("[data-sb-back]")) return go("main");
    if (t("[data-sb-ws]")) return go("workspace");
    const out = t("[data-sb-output]");
    if (out) return hooks.openDetail("connections", out.dataset.sbOutput, { output: true });
    const si = t("[data-sb-signin]");
    if (si) { const it = byId(si.dataset.sbSignin); it.state = "ok"; render(); return toast(`Signed in to ${it.name}.`); }
    if (t("[data-sb-browse]")) return opts.onBrowse();
    const mt = t("[data-sb-more-type]");
    if (mt) return opts.onConfigure(`${store.scope.harness}:${mt.dataset.sbMoreType}`, ctx());
    const rr = t("[data-sb-row]");
    if (rr) return openItem(byId(rr.dataset.sbRow));
  });
  // Keyboard: arrows move between rows, Left/Right collapse and expand, Enter opens, Backspace leaves the sub-page.
  root.addEventListener("keydown", (e) => {
    const row = e.target.closest?.("tr.ct-row, tr.pt-group");
    if (e.key === "Backspace" && view === "workspace" && !e.target.matches("input")) { e.preventDefault(); return go("main"); }
    if (!row || e.target.closest(".monaco-switch, .cv-action")) return;
    const rows = [...root.querySelectorAll("tr.ct-row, tr.pt-group")], i = rows.indexOf(row);
    const focusRow = (r) => { if (!r) return; (r.matches(".pt-group") ? r.querySelector(".pt-twisty") : r).focus(); };
    if (e.key === "ArrowDown") { e.preventDefault(); focusRow(rows[i + 1]); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusRow(rows[i - 1]); }
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && row.hasAttribute("aria-expanded")) {
      const open = row.getAttribute("aria-expanded") === "true";
      if ((e.key === "ArrowLeft") === open) { e.preventDefault(); row.querySelector(".pt-twisty")?.click(); }
    } else if (e.key === "Enter" && row.matches(".ct-row")) { e.preventDefault(); row.click(); }
  });
  // The chat turns an item on for this session (Allow in This Session), and the panel shows it.
  document.addEventListener("session-item-on", (e) => { onMap(e.detail.session).set(e.detail.id, true); render(); });
  subs.add(render);
  const reset = () => requestAnimationFrame(() => { view = "main"; render(); });
  document.addEventListener("session-open", reset);
  document.addEventListener("session-new", reset);
  render();
  return { render };
}
export const sessionItemOn = (session, id) => (sessionOn.get(session)?.has(id) ? sessionOn.get(session).get(id) : null);
window.__sessionItemOn = sessionItemOn;
