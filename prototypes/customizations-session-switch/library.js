/* Library: everything you have, across workspaces and agents, in the Settings prototypes' modal layout (nav, search
   with source tabs, a page per type, one card per source). Discover, Tools and Extensions host the product pages. */
import { filterList, openMenu, toast } from "./panel-shell.js";
const { TYPES, SOURCES, WORKSPACES, items, type: typeOf } = window.SCOPE;
const { first: pages, CATEGORIES, esc, hostPage } = window.CUST;
const NAV = [{ id: "browse", label: "Discover", icon: "compass" }, "-", ...TYPES.map((t) => ({ id: t.id, label: t.label, icon: t.icon })), "-",
  { id: "tools", label: "Tools", icon: "ai-customization-tools" }, { id: "extensions", label: "Extensions", icon: "extensions-view-icon" }];
const TABS = [{ id: "all", label: "All" }, { id: "user", label: "Yours" }, { id: "workspace", label: "Workspaces" }, { id: "plugin", label: "Plugins" }, { id: "builtin", label: "Built-in" }];
const countOf = (id) => id === "tools" ? 36 : id === "extensions" ? 11 : id === "browse" ? "" : items.filter((it) => it.type === id).length;

export function mountLibrary(root, opts = {}) {
  root.className = "se lib";
  root.innerHTML = `
    <nav class="se-nav" aria-label="Customization types"><div class="se-nav-list" role="tablist" aria-orientation="vertical">${NAV.map((n) => n === "-" ? '<div class="se-nav-sep" role="presentation"></div>'
      : `<div class="se-nav-item" role="tab" tabindex="-1" data-id="${n.id}"><span class="codicon codicon-${n.icon} se-nav-icon" aria-hidden="true"></span><span class="se-nav-label">${n.label}</span><span class="se-nav-count">${countOf(n.id)}</span></div>`).join("")}</div>
      <div class="se-nav-footer"><button class="se-nav-footer-btn" data-act="session"><span class="codicon codicon-layout-sidebar-right" aria-hidden="true"></span>What this session uses</button></div></nav>
    <div class="se-main">
      <div class="se-header lib-header">
        <div class="se-search"><span class="codicon codicon-search se-search-icon" aria-hidden="true"></span><input class="se-search-input" placeholder="Search customizations" aria-label="Search customizations" /><span class="se-search-count" hidden></span></div>
        <div class="se-header-row"><div class="se-tabs" role="tablist" aria-label="Source"></div><span class="se-flex"></span>
          <button class="se-btn small" data-act="browse"><span class="codicon codicon-compass" aria-hidden="true"></span>Browse</button></div>
      </div>
      <div class="se-scroll"><div class="se-content"></div></div>
      <div class="lib-host" hidden></div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const content = $(".se-content"), host = $(".lib-host"), scroll = $(".se-scroll"), header = $(".lib-header");
  const hosted = {};
  const state = { section: "plugins", tab: "all", q: "" };

  const listFor = (t, rows) => `<div class="ai-customization-management-editor cust-flow"><vsc-customization-list kind="${t.kind}">${rows.map((r) => r.html).join("")}</vsc-customization-list></div>`;
  function renderType(id) {
    const t = typeOf(id), page = pages[id], cat = CATEGORIES.find((c) => c.id === id);
    const of = items.filter((it) => it.type === id);
    const bySrc = (s) => of.filter((it) => it.source === s);
    const tabs = TABS.map((tb) => ({ ...tb, n: tb.id === "all" ? of.length : bySrc(tb.id).length }));
    $(".se-tabs").innerHTML = tabs.map((tb) => `<button class="se-tab${tb.id === state.tab ? " active" : ""}" role="tab" aria-selected="${tb.id === state.tab}" data-tab="${tb.id}">${tb.label}<span class="se-tab-count">${tb.n}</span></button>`).join("");
    const group = (src, title, desc, body, n) => `<section class="se-group" data-src="${src}"><div class="se-group-header"><span class="codicon codicon-${SOURCES[src].icon} se-group-icon" aria-hidden="true"></span>
      <h3 class="se-group-title">${title}</h3><span class="se-group-count">${n}</span><span class="se-group-desc">· ${desc}</span><span class="se-flex"></span></div>${body}</section>`;
    let html = `<div class="se-page-header"><div class="lib-page-icon"><span class="codicon codicon-${t.icon}" aria-hidden="true"></span></div><div class="se-flex"><h2 class="se-page-title">${t.label}</h2>
      <p class="se-page-desc">${esc(page.getAttribute("description") || "")} ${page.getAttribute("link") ? `<a href="#">${esc(page.getAttribute("link"))}</a>` : ""}</p></div>
      ${cat && cat.add ? `<button class="se-btn primary small" data-act="new"><span class="codicon codicon-add" aria-hidden="true"></span>${esc(cat.add)}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>` : ""}</div>`;
    const show = (src) => state.tab === "all" || state.tab === src;
    if (show("user")) html += group("user", "Yours", "In all your sessions", `<div class="se-group-card">${bySrc("user").length ? listFor(t, bySrc("user")) : `<div class="lib-empty">None yet.</div>`}</div>`, bySrc("user").length);
    if (show("workspace") && id !== "plugins") {
      const wsRows = bySrc("workspace");
      const body = `<div class="se-subgroups">${Object.entries(WORKSPACES).map(([wid, w]) => {
        const rows = wsRows.filter((r) => r.workspace === wid);
        return `<div><div class="se-subheading"><span class="codicon codicon-folder" aria-hidden="true"></span>${esc(w.label)} <span class="lib-sub-path">${esc(w.path)}</span><span class="se-subheading-count">${rows.length}</span></div>
          <div class="se-group-card">${rows.length ? listFor(t, rows) : `<div class="lib-empty">No ${t.label.toLowerCase()} in ${esc(w.label)}.</div>`}</div></div>`;
      }).join("")}</div>`;
      html += group("workspace", "Workspaces", "Only in sessions in that workspace", body, wsRows.length);
    }
    if (show("plugin") && bySrc("plugin").length) html += group("plugin", "From plugins", SOURCES.plugin.sub, `<div class="se-group-card">${listFor(t, bySrc("plugin"))}</div>`, bySrc("plugin").length);
    if (show("builtin") && bySrc("builtin").length) html += group("builtin", "Built-in", SOURCES.builtin.sub, `<div class="se-group-card">${listFor(t, bySrc("builtin"))}</div>`, bySrc("builtin").length);
    content.innerHTML = html;
    if (state.q) requestAnimationFrame(applyQuery);
  }

  function renderHosted(id) {
    if (!hosted[id]) {
      const wrap = document.createElement("div");
      wrap.className = "lib-hosted";
      wrap.style.cssText = "display:flex;flex-direction:column;flex:1;min-height:0";
      const n = NAV.find((x) => x.id === id);
      wrap.innerHTML = `<div class="se-page-header"><div class="lib-page-icon"><span class="codicon codicon-${n.icon}" aria-hidden="true"></span></div><div class="se-flex"><h2 class="se-page-title">${id === "browse" ? "Discover" : n.label}</h2>
        </div></div>`;
      const page = hostPage(pages[id]);
      page.style.cssText = "flex:1;min-height:0";
      wrap.append(page);
      hosted[id] = wrap;
      host.append(wrap);
    }
    for (const [k, el] of Object.entries(hosted)) el.style.display = k === id ? "flex" : "none";
  }

  function show(section) {
    state.section = section;
    for (const el of root.querySelectorAll(".se-nav-item")) {
      const on = el.dataset.id === section;
      el.classList.toggle("active", on);
      el.setAttribute("aria-selected", String(on));
      el.tabIndex = on ? 0 : -1;
    }
    const isType = !!typeOf(section);
    scroll.hidden = !isType;
    header.hidden = !isType;
    host.hidden = isType;
    if (isType) { renderType(section); scroll.scrollTop = 0; } else renderHosted(section);
    opts.onShow?.(section);
  }

  function applyQuery() {
    let total = 0;
    for (const g of content.querySelectorAll(".se-group")) {
      let n = 0;
      for (const l of g.querySelectorAll("vsc-customization-list")) {
        const m = filterList(l, state.q);
        l.closest(".se-group-card").hidden = !!state.q && m === 0;
        n += m;
      }
      g.hidden = !!state.q && n === 0;
      total += n;
    }
    const c = $(".se-search-count");
    c.hidden = !state.q;
    c.textContent = `${total} found`;
  }

  root.addEventListener("click", (e) => {
    const nav = e.target.closest(".se-nav-item");
    if (nav) return show(nav.dataset.id);
    const tab = e.target.closest("[data-tab]");
    if (tab) { state.tab = tab.dataset.tab; return renderType(state.section); }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "browse") show("browse");
    else if (act.dataset.act === "session") opts.onSession?.();
    else if (act.dataset.act === "new") {
      const t = typeOf(state.section);
      openMenu(act, [{ label: "For All Your Sessions", where: "user" }, "-", ...Object.values(WORKSPACES).map((w) => ({ label: `In ${w.label}`, where: w.label })), { label: "In Another Workspace...", where: "other" }], (it) =>
        toast(it.where === "user" ? `New ${t.one}: all your sessions will use it.` : it.where === "other" ? "Pick a folder for the new " + t.one + "." : `New ${t.one} in ${it.where}: only sessions in ${it.where} will use it.`));
    }
  });
  root.addEventListener("browse", () => show("browse"));
  root.querySelector(".se-nav-list").addEventListener("keydown", (e) => {
    const navItems = [...root.querySelectorAll(".se-nav-item")], i = navItems.indexOf(document.activeElement);
    const next = { ArrowDown: i + 1, ArrowUp: i - 1 }[e.key];
    if (i < 0 || next == null) return;
    e.preventDefault();
    const el = navItems[(next + navItems.length) % navItems.length];
    el.focus(); show(el.dataset.id);
  });
  $(".se-search-input").addEventListener("input", (e) => { state.q = e.target.value.trim(); applyQuery(); });
  // Browse search filters the marketplace cards (the same filter as the side panel's).
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
  return { show, get section() { return state.section; } };
}
