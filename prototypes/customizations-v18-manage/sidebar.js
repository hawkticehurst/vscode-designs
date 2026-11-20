/* V17 — A calmer Session Customizations panel (Nov 18 Agents Window + Customization Squad syncs).
   - Fewer competing components: no count bubbles, no logo card, no external-link icons. Switches appear on hover and
     focus; an item that's off just says "Off". Most sessions never change these once they've started.
   - What needs you comes first: sign-in and errors collect in "Needs Attention", each with one text action.
   - Provenance: servers a plugin brings say so, and say why they're unavailable when that plugin is off.
   - Just-in-time: the chat can turn an item on for this session (jit.js), and the panel follows. */
import { store } from "./scope-store.js";
import { toast } from "./panel-shell.js";
import { CONNECTIONS, PLUGINS, K, polOf, iconHtml, subs, envOf, hooks } from "./env.js?v=12";
const { esc } = window.CUST;
const { HARNESSES } = window.SCOPE;

const skey = () => store.session?.id || "new";
const hereKey = () => K(store.scope.environment, store.scope.harness);
// Per-session switches (id → on); otherwise the item's own policy. The triage session starts with Slack off.
const sessionOn = new Map([["triage", new Map([["slack", false]])]]);
const onMap = (k = skey()) => { if (!sessionOn.has(k)) sessionOn.set(k, new Map()); return sessionOn.get(k); };
const ownOn = (it) => (onMap().has(it.id) ? onMap().get(it.id) : it.kind === "plugin" ? !it.disabled : polOf(it).v !== "off");
const parentOf = (it) => it.origin?.plugin;
const isOn = (it) => ownOn(it) && (!parentOf(it) || ownOn(parentOf(it)));
const NEEDS = {
  signin: { sub: "Not signed in", action: "Sign In", attr: "data-sb-signin" },
  error: { sub: "Couldn't start", action: "Show Output", attr: "data-sb-output", error: true },
};

export function mountSidebar(root, opts) {
  root.innerHTML = `<div class="sb-panel cv-panel"><div class="cp-scroll ev-scroll sb-scroll"></div></div>`;
  const $ = (s) => root.querySelector(s);
  const collapsedSections = new Set();

  const sw = (it) => { const on = ownOn(it); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(it.name)} in this session" data-sb-toggle="${it.kind}|${esc(it.id)}"><div class="monaco-switch-thumb"></div></button>`; };
  function subOf(it) {
    const p = parentOf(it);
    if (p && !ownOn(p)) return `Off with ${esc(p.name)}`;
    if (!ownOn(it)) return "";
    if (it.state === "stopped") return "Starts when an agent needs it";
    if (p) return `From ${esc(p.name)}`;
    return "";
  }
  const row = (it, type) => {
    const ref = `${type}|${esc(it.id)}`, sub = subOf(it), blocked = parentOf(it) && !ownOn(parentOf(it));
    return `<div class="ev-row sb-row cv-row${isOn(it) ? "" : " is-off"}" data-sb-row="${ref}">
      ${iconHtml(it, 16)}<div class="ev-row-text"><div class="ev-row-name"><button class="en-name-link" data-sb-detail="${ref}" title="Show details">${esc(it.name)}</button></div>${sub ? `<div class="ev-row-sub">${sub}</div>` : ""}</div>
      ${blocked ? "" : `${ownOn(it) ? "" : '<span class="cv-off" aria-hidden="true">Off</span>'}${sw(it)}`}</div>`;
  };
  const needRow = (it, type) => {
    const n = NEEDS[it.state], ref = `${type}|${esc(it.id)}`;
    return `<div class="ev-row sb-row cv-row cv-need" data-sb-row="${ref}">
      ${iconHtml(it, 16)}<div class="ev-row-text"><div class="ev-row-name"><button class="en-name-link" data-sb-detail="${ref}" title="Show details">${esc(it.name)}</button></div><div class="ev-row-sub${n.error ? " is-error" : ""}">${n.sub}</div></div>
      <button type="button" class="cv-action" ${n.attr}="${ref}">${n.action}</button></div>`;
  };
  const section = (id, title, body) => {
    const collapsed = collapsedSections.has(id);
    return `<section class="ev-sec sb-accordion${collapsed ? " is-collapsed" : ""}"><button type="button" class="ev-sec-head sb-section-toggle" data-sb-section="${id}" aria-expanded="${!collapsed}">
      <span class="codicon codicon-chevron-${collapsed ? "right" : "down"}" aria-hidden="true"></span><h3>${title}</h3></button>
      ${collapsed ? "" : `<div class="ov-list">${body}</div>`}</section>`;
  };

  function render() {
    const k = hereKey(), env = envOf(store.scope.environment), agent = HARNESSES[store.scope.harness].label;
    const here = (it) => it.at.has(k) && (!it.workspace || it.workspace === store.scope.workspace);
    const plugins = PLUGINS.filter(here), mcp = CONNECTIONS.filter(here);
    const needs = mcp.filter((c) => NEEDS[c.state] && isOn(c));
    const calm = mcp.filter((c) => !needs.includes(c));
    const none = `<div class="en-empty">None on ${esc(env.label)} for ${esc(agent)}.</div>`;
    $(".sb-scroll").innerHTML = `${needs.length ? section("needs", "Needs Attention", needs.map((c) => needRow(c, "mcp")).join("")) : ""}
      ${section("plugins", "Plugins", plugins.length ? plugins.map((p) => row(p, "plugins")).join("") : none)}
      ${section("mcp", "MCP Servers", calm.length ? calm.map((c) => row(c, "mcp")).join("") : none)}
      <section class="ev-sec cv-more"><div class="ov-list">
        <button class="ov-row ev-skill-group cv-link" data-sb-more-type="skills"><span class="codicon codicon-library" aria-hidden="true"></span><span class="ov-title">Skills, Instructions, Agents and More</span></button>
        <button class="ov-row ev-skill-group cv-link" data-sb-browse="browse"><span class="codicon codicon-compass" aria-hidden="true"></span><span class="ov-title">Discover</span></button>
      </div></section>`;
  }
  const itemOf = (ref) => { const [type, ...rest] = ref.split("|"), id = rest.join("|"); return { type, it: (type === "plugins" ? PLUGINS : CONNECTIONS).find((x) => x.id === id) }; };
  const ctx = () => ({ env: store.scope.environment, ws: store.scope.workspace, agent: store.scope.harness });
  const childrenOf = (p) => CONNECTIONS.filter((c) => parentOf(c) === p && c.at.has(hereKey()));
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    const sectionToggle = t("[data-sb-section]");
    if (sectionToggle) {
      const id = sectionToggle.dataset.sbSection;
      collapsedSections.has(id) ? collapsedSections.delete(id) : collapsedSections.add(id);
      return render();
    }
    const tg = t("[data-sb-toggle]");
    if (tg) {
      const [kind, ...rest] = tg.dataset.sbToggle.split("|"), it = (kind === "plugin" ? PLUGINS : CONNECTIONS).find((x) => x.id === rest.join("|")), m = onMap(), was = ownOn(it);
      m.set(it.id, !was); render();
      root.querySelector(`[data-sb-toggle="${CSS.escape(tg.dataset.sbToggle)}"]`)?.focus();
      const kids = it.kind === "plugin" ? childrenOf(it) : [];
      const also = kids.length ? ` ${kids.map((c) => c.name).join(", ")} ${was ? "is" : "is back"} ${was ? "off" : "on"} with it.` : "";
      return toast(`${it.name} is ${was ? "off" : "on"} for this session.${also}`, ["Undo"], () => { m.set(it.id, was); render(); });
    }
    const dt = t("[data-sb-detail]");
    if (dt) { const { type, it } = itemOf(dt.dataset.sbDetail); return hooks.openDetail(type === "plugins" ? "plugins" : "connections", it.id); }
    const out = t("[data-sb-output]");
    if (out) { const { it } = itemOf(out.dataset.sbOutput); return hooks.openDetail("connections", it.id, { output: true }); }
    const si = t("[data-sb-signin]");
    if (si) { const { it } = itemOf(si.dataset.sbSignin); it.state = "ok"; render(); return toast(`Signed in to ${it.name}.`); }
    const br = t("[data-sb-browse]");
    if (br) return opts.onBrowse();
    const mt = t("[data-sb-more-type]");
    if (mt) return opts.onConfigure(mt.dataset.sbMoreType, ctx());
    const rr = t("[data-sb-row]");
    if (rr) { const { type, it } = itemOf(rr.dataset.sbRow); return hooks.openDetail(type === "plugins" ? "plugins" : "connections", it.id); }
  });
  // The chat turns an item on for this session (Allow in This Session), and the panel shows it.
  document.addEventListener("session-item-on", (e) => { onMap(e.detail.session).set(e.detail.id, true); render(); });
  subs.add(render);
  document.addEventListener("session-open", () => requestAnimationFrame(render));
  document.addEventListener("session-new", () => requestAnimationFrame(render));
  render();
  return { render };
}
export const sessionItemOn = (session, id) => (sessionOn.get(session)?.has(id) ? sessionOn.get(session).get(id) : null);
window.__sessionItemOn = sessionItemOn;
