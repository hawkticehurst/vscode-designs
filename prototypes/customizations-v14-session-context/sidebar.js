/* V11 — Session sidebar. The pared-back direction from the Nov 5 Customization Squad Sync:
   - No customization UI in the composer.
   - The right sidebar holds what you can turn on and off for this session, the high-value concepts only: plugins,
     MCP servers and connectors. Everything lower level (skills, instructions, agents, hooks, tools, canvases) and
     Discover open the Customizations modal, narrowed to this session.
   - More actions live in the Customizations modal; sidebar rows only expose their switch and required state action. */
import { store } from "./scope-store.js";
import { toast } from "./panel-shell.js";
import { CONNECTIONS, PLUGINS, K, polOf, iconHtml, subs, envOf, hooks } from "./env.js?v=10";
const { esc } = window.CUST;
const { HARNESSES } = window.SCOPE;

const skey = () => store.session?.id || "new";
const hereKey = () => K(store.scope.environment, store.scope.harness);
// Per-session switches (id → on); otherwise the item's own policy.
const sessionOn = new Map();
const onMap = () => { if (!sessionOn.has(skey())) sessionOn.set(skey(), new Map()); return sessionOn.get(skey()); };
const isOn = (it) => (onMap().has(it.id) ? onMap().get(it.id) : it.kind === "plugin" ? !it.disabled : polOf(it).v !== "off");

export function mountSidebar(root, opts) {
  root.innerHTML = `<div class="sb-panel"><div class="cp-scroll ev-scroll sb-scroll"></div></div>`;
  const $ = (s) => root.querySelector(s);
  const collapsedSections = new Set();

  const sw = (it) => { const on = isOn(it); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(it.name)} in this session" data-sb-toggle="${it.kind}|${esc(it.id)}"><div class="monaco-switch-thumb"></div></button>`; };
  const stateAction = (it, type) => {
    const ref = `${type}|${esc(it.id)}`;
    if (it.state === "error") return `<span class="codicon codicon-error sb-state-icon is-error" aria-hidden="true" title="Error"></span><button class="ev-btn sb-state-action" data-sb-output="${ref}">Show Output</button>`;
    if (it.state === "signin") return `<button class="ev-btn sb-state-action" data-sb-signin="${ref}">Sign In</button>`;
    if (it.state === "stopped") return `<button class="ev-btn sb-state-action" data-sb-start="${ref}">Start</button>`;
    if (it.state === "starting") return '<span class="codicon codicon-loading codicon-modifier-spin sb-state-icon" aria-hidden="true" title="Starting"></span>';
    return "";
  };
  const row = (it, type) => `<div class="ev-row sb-row${isOn(it) ? "" : " is-off"}" data-sb-row="${type}|${esc(it.id)}">
      ${iconHtml(it, 20)}<div class="ev-row-text"><div class="ev-row-name"><button class="en-name-link" data-sb-detail="${type}|${esc(it.id)}" title="Show details">${esc(it.name)}</button></div></div>
      ${stateAction(it, type)}${sw(it)}</div>`;
  const section = (id, title, list, type, empty) => {
    const collapsed = collapsedSections.has(id);
    return `<section class="ev-sec sb-accordion${collapsed ? " is-collapsed" : ""}"><button type="button" class="ev-sec-head sb-section-toggle" data-sb-section="${id}" aria-expanded="${!collapsed}">
      <span class="codicon codicon-chevron-${collapsed ? "right" : "down"}" aria-hidden="true"></span><h3>${title}</h3>${list.length ? `<span class="cp-count">${list.length}</span>` : ""}</button>
      ${collapsed ? "" : `<div class="ov-list">${list.length ? list.map((it) => row(it, type)).join("") : `<div class="en-empty">${empty}</div>`}</div>`}</section>`;
  };

  function render() {
    const k = hereKey(), env = envOf(store.scope.environment), agent = HARNESSES[store.scope.harness].label;
    const here = (it) => it.at.has(k) && (!it.workspace || it.workspace === store.scope.workspace);
    const plugins = PLUGINS.filter(here), mcp = CONNECTIONS.filter((c) => here(c) && !c.origin);
    const none = `None on ${esc(env.label)} for ${esc(agent)}.`;
    const moreOrder = new Map(["skills", "canvases", "instructions", "agents", "hooks", "tools"].map((id, i) => [id, i]));
    const more = opts.more(store.scope).filter((r) => r.count).sort((a, b) => moreOrder.get(a.id) - moreOrder.get(b.id));
    $(".sb-scroll").innerHTML = `${section("plugins", "Plugins", plugins, "plugins", none)}
      ${section("mcp", "MCP Servers", mcp, "mcp", none)}
      <section class="ev-sec"><div class="ev-sec-head"><h3>More in Customizations</h3></div>
        <button class="ov-discover" data-sb-browse="browse">
          <span class="ov-icons" aria-hidden="true"><img src="assets/icons/figma-figma.png" alt="" /><img src="assets/icons/microsoft-playwright.png" alt="" /><img src="assets/icons/context7.png" alt="" /></span>
          <span class="ov-text"><span class="ov-title">Discover</span><span class="ov-sub">Plugins, MCP servers and skills from GitHub and the community</span></span>
          <span class="codicon codicon-chevron-right ov-chev" aria-hidden="true"></span>
        </button>
        <div class="ov-list">${more.map((r) => `<button class="ov-row ev-skill-group" data-sb-more-type="${r.id}"><span class="ov-text"><span class="ov-title">${esc(r.label)}</span></span>
          <span class="cp-count">${r.count}</span><span class="codicon codicon-link-external ov-chev" aria-hidden="true"></span></button>`).join("")}</div></section>`;
  }
  const itemOf = (ref) => { const [type, ...rest] = ref.split("|"), id = rest.join("|"); return { type, it: (type === "plugins" ? PLUGINS : CONNECTIONS).find((x) => x.id === id) }; };
  const ctx = () => ({ env: store.scope.environment, ws: store.scope.workspace, agent: store.scope.harness });
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
      const [kind, ...rest] = tg.dataset.sbToggle.split("|"), it = (kind === "plugin" ? PLUGINS : CONNECTIONS).find((x) => x.id === rest.join("|")), m = onMap(), was = isOn(it);
      m.set(it.id, !was); render();
      return toast(`${it.name} is ${was ? "off" : "on"} for this session.`, ["Undo"], () => { m.set(it.id, was); render(); });
    }
    const dt = t("[data-sb-detail]");
    if (dt) { const { type, it } = itemOf(dt.dataset.sbDetail); return hooks.openDetail(type === "plugins" ? "plugins" : "connections", it.id); }
    const out = t("[data-sb-output]");
    if (out) { const { it } = itemOf(out.dataset.sbOutput); return hooks.openDetail("connections", it.id, { output: true }); }
    const si = t("[data-sb-signin]");
    if (si) { const { it } = itemOf(si.dataset.sbSignin); it.state = "ok"; render(); return toast(`Signed in to ${it.name}.`); }
    const st = t("[data-sb-start]");
    if (st) { const { it } = itemOf(st.dataset.sbStart); it.state = "ok"; render(); return toast(`Started ${it.name}.`); }
    const br = t("[data-sb-browse]");
    if (br) return opts.onBrowse();
    const mt = t("[data-sb-more-type]");
    if (mt) return opts.onConfigure(mt.dataset.sbMoreType, ctx());
    const rr = t("[data-sb-row]");
    if (rr) { const { type, it } = itemOf(rr.dataset.sbRow); return hooks.openDetail(type === "plugins" ? "plugins" : "connections", it.id); }
  });
  subs.add(render);
  document.addEventListener("session-open", () => requestAnimationFrame(render));
  document.addEventListener("session-new", () => requestAnimationFrame(render));
  render();
  return { render };
}
