/* V11 — Session sidebar. The pared-back direction from the Nov 5 Customization Squad Sync:
   - No customization UI in the composer.
   - The right sidebar holds what you can turn on and off for this session, the high-value concepts only: plugins,
     MCP servers and connectors. Everything lower level (skills, instructions, agents, hooks, tools, canvases) and
     Discover open the Customizations modal, narrowed to this session.
   - Ask first is an advanced setting in a row's ⋯ menu, not a third state on every row. */
import { store, renderScopeBar } from "./scope-store.js";
import { openMenu, toast } from "./panel-shell.js";
import { CONNECTIONS, PLUGINS, K, polOf, iconHtml, subs, envOf, hooks } from "./env.js?v=10";
const { esc } = window.CUST;
const { HARNESSES } = window.SCOPE;

const skey = () => store.session?.id || "new";
const hereKey = () => K(store.scope.environment, store.scope.harness);
// Per-session switches (id → on) and the advanced "Ask before using" (id → ask); otherwise the item's own policy.
const sessionOn = new Map(), askOverride = new Map();
const onMap = () => { if (!sessionOn.has(skey())) sessionOn.set(skey(), new Map()); return sessionOn.get(skey()); };
const isOn = (it) => (onMap().has(it.id) ? onMap().get(it.id) : it.kind === "plugin" ? !it.disabled : polOf(it).v !== "off");
const asks = (it) => (askOverride.has(it.id) ? askOverride.get(it.id) : polOf(it).v === "ask");

export function mountSidebar(root, opts) {
  root.innerHTML = `<div class="sb-panel"><div class="ss-scope sb-scope"></div><p class="sb-caption"></p><div class="cp-scroll ev-scroll sb-scroll"></div></div>`;
  const $ = (s) => root.querySelector(s);

  const sw = (it) => { const on = isOn(it); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(it.name)} in this session" data-sb-toggle="${it.kind}|${esc(it.id)}"><div class="monaco-switch-thumb"></div></button>`; };
  function sub(it) {
    if (it.kind === "plugin") {
      const mcp = CONNECTIONS.filter((c) => c.origin?.id === it.id).map((c) => c.name);
      return esc(mcp.length ? `${it.sub} · ${mcp.join(", ")}` : it.sub);
    }
    if (it.state === "error") return '<span class="sb-err"><span class="codicon codicon-error" aria-hidden="true"></span>Stopped responding</span>';
    const bits = [];
    if (asks(it)) bits.push('<span class="sb-ask"><span class="codicon codicon-question" aria-hidden="true"></span>Asks before using</span>');
    if (it.state === "signin") bits.push("Sign in when needed");
    else if (it.account) bits.push(esc(it.account));
    return bits.join(" · ");
  }
  const row = (it, type) => `<div class="ev-row sb-row${isOn(it) ? "" : " is-off"}" data-sb-row="${type}|${esc(it.id)}">
      ${iconHtml(it, 20)}<div class="ev-row-text"><div class="ev-row-name"><button class="en-name-link" data-sb-detail="${type}|${esc(it.id)}" title="Show details">${esc(it.name)}</button></div><div class="ev-row-sub">${sub(it)}</div></div>
      <button class="ev-icon-btn sb-more" data-sb-more="${type}|${esc(it.id)}" aria-label="More actions for ${esc(it.name)}" title="More actions"><span class="codicon codicon-ellipsis"></span></button>${sw(it)}</div>`;
  const section = (id, title, list, type, empty) => `<section class="ev-sec"><div class="ev-sec-head"><h3>${title}</h3>${list.length ? `<span class="cp-count">${list.length}</span>` : ""}<span class="grow"></span>
      <vsc-toolbar label="${title} Actions"><vsc-action icon="add" label="Browse ${title}..." data-sb-browse="${id}"></vsc-action></vsc-toolbar></div>
      <div class="ov-list">${list.length ? list.map((it) => row(it, type)).join("") : `<div class="en-empty">${empty}</div>`}</div></section>`;

  function render() {
    renderScopeBar($(".sb-scope"), { new: "", session: "" });
    const k = hereKey(), env = envOf(store.scope.environment), agent = HARNESSES[store.scope.harness].label;
    const here = (it) => it.at.has(k) && (!it.workspace || it.workspace === store.scope.workspace);
    const plugins = PLUGINS.filter(here), mcp = CONNECTIONS.filter((c) => here(c) && !c.connector && !c.origin), connectors = CONNECTIONS.filter((c) => here(c) && c.connector);
    const none = `None on ${esc(env.label)} for ${esc(agent)}.`;
    const more = opts.more(store.scope).filter((r) => r.count);
    $(".sb-caption").textContent = `Turn these on or off for ${store.mode === "session" ? "this session" : "the session you're starting"}.`;
    $(".sb-scroll").innerHTML = `${section("plugins", "Plugins", plugins, "plugins", none)}
      ${section("mcp", "MCP Servers", mcp, "mcp", none)}
      ${section("connectors", "Connectors", connectors, "connectors", none)}
      <section class="ev-sec"><div class="ev-sec-head"><h3>More in Customizations</h3></div>
        <div class="ov-list">${more.map((r) => `<button class="ov-row ev-skill-group" data-sb-more-type="${r.id}"><span class="ov-text"><span class="ov-title">${esc(r.label)}</span></span>
          <span class="cp-count">${r.count}</span><span class="codicon codicon-link-external ov-chev" aria-hidden="true"></span></button>`).join("")}</div></section>`;
  }
  const itemOf = (ref) => { const [type, ...rest] = ref.split("|"), id = rest.join("|"); return { type, it: (type === "plugins" ? PLUGINS : CONNECTIONS).find((x) => x.id === id) }; };
  const ctx = () => ({ env: store.scope.environment, ws: store.scope.workspace, agent: store.scope.harness });
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    const tg = t("[data-sb-toggle]");
    if (tg) {
      const [kind, ...rest] = tg.dataset.sbToggle.split("|"), it = (kind === "plugin" ? PLUGINS : CONNECTIONS).find((x) => x.id === rest.join("|")), m = onMap(), was = isOn(it);
      m.set(it.id, !was); render();
      return toast(`${it.name} is ${was ? "off" : "on"} for this session.`, ["Undo"], () => { m.set(it.id, was); render(); });
    }
    const dt = t("[data-sb-detail]");
    if (dt) { const { type, it } = itemOf(dt.dataset.sbDetail); return hooks.openDetail(type === "plugins" ? "plugins" : "connections", it.id); }
    const mo = t("[data-sb-more]");
    if (mo) {
      const { type, it } = itemOf(mo.dataset.sbMore), items = [{ label: "Show Details", act: "detail" }];
      if (type !== "plugins") {
        if (it.state === "error") items.push({ label: "Restart", act: "restart" });
        if (it.state === "signin") items.push({ label: "Sign In...", act: "signin" });
        items.push("-", { label: "Ask Before Using", act: "ask", checked: asks(it) });
      }
      return openMenu(mo, items, (m) => {
        if (m.act === "detail") return hooks.openDetail(type === "plugins" ? "plugins" : "connections", it.id);
        if (m.act === "restart") { it.state = "ok"; render(); return toast(`Restarted ${it.name}.`); }
        if (m.act === "signin") { it.state = "ok"; render(); return toast(`Signed in to ${it.name} as ${it.account}.`); }
        const v = !asks(it); askOverride.set(it.id, v); render();
        toast(v ? `Agents ask before using ${it.name}.` : `Agents use ${it.name} without asking.`);
      });
    }
    const br = t("[data-sb-browse]");
    if (br) return opts.onBrowse();
    const mt = t("[data-sb-more-type]");
    if (mt) return opts.onConfigure(mt.dataset.sbMoreType, ctx());
  });
  subs.add(render);
  document.addEventListener("session-open", () => requestAnimationFrame(render));
  document.addEventListener("session-new", () => requestAnimationFrame(render));
  render();
  return { render };
}
