/* Library: everything you have (user, plugins, built-in and the workspaces you've opened recently), in the Settings
   prototypes' modal layout (left nav, one page at a time). It isn't scoped to a session: workspaces are groups you can
   filter to, and agents (harnesses) are compatibility, shown as badges and a "Works with" filter. Opened from a session's
   panel, it starts filtered to that session's workspace and agent, with a chip to show everything.
   Every page is the product's page design: type pages are the Customizations editor's list page (description, search
   and the grouped tree); Discover, Tools and Extensions are the product pages as they are. */
import { openMenu, toast } from "./panel-shell.js";
const { TYPES, WORKSPACES, HARNESSES, items, worksWith, type: typeOf, workspaceTitle } = window.SCOPE;
const { first: pages, CATEGORIES, esc, hostPage } = window.CUST;
const NAV = [{ id: "browse", label: "Discover" }, "-", ...TYPES.map((t) => ({ id: t.id, label: t.label })), "-", { id: "tools", label: "Tools" }, { id: "extensions", label: "Extensions" }];
const countOf = (id) => id === "tools" ? 36 : id === "extensions" ? 11 : id === "browse" ? "" : items.filter((it) => it.type === id).length;
const HARNESS_IDS = Object.keys(HARNESSES);

/** Agents that can use an item, as a badge, only when it's not all of them ("Copilot only", "Copilot, Codex"). */
function compatBadge(it) {
  const ok = HARNESS_IDS.filter((h) => worksWith(it, h));
  if (ok.length === HARNESS_IDS.length) return "";
  return ok.length === 1 ? `${HARNESSES[ok[0]].label} only` : ok.length ? ok.map((h) => HARNESSES[h].label).join(", ") : "No agents";
}
const withBadge = (it) => {
  const b = compatBadge(it);
  return b && /^<vsc-customization-item /.test(it.html) && !/ badge="[^"]/.test(it.html) ? it.html.replace(/^<vsc-customization-item /, `<vsc-customization-item badge="${esc(b)}" `) : it.html;
};

/** A type's list page: the product's <vsc-customization-list>, grouped by where each item is defined, after filters. */
function typePage(id, filter) {
  const t = typeOf(id), page = pages[id], cat = CATEGORIES.find((c) => c.id === id);
  const of = items.filter((it) => it.type === id && (!filter.harness || worksWith(it, filter.harness)));
  const wsIds = Object.keys(WORKSPACES).filter((w) => !filter.workspace || filter.workspace === w);
  const groups = [["User", "account", of.filter((it) => it.source === "user"), true],
    ...wsIds.map((w) => [workspaceTitle(w), "folder", of.filter((it) => it.source === "workspace" && it.workspace === w), id !== "plugins", WORKSPACES[w].path]),
    ["From plugins", "plug", of.filter((it) => it.source === "plugin"), false], ["Built-in", "vscode-insiders", of.filter((it) => it.source === "builtin"), false]];
  let first = true, rows = "";
  for (const [label, icon, list, canAdd, path] of groups) {
    if (!list.length && !canAdd) continue;
    rows += `<vsc-customization-group label="${esc(label)}" count="${list.length}" icon="${icon}"${path ? ` data-path="${esc(path)}"` : ""}${canAdd && cat?.add ? ` actions="add" add-label="${esc(cat.add)}"` : ' actions=""'}${first ? " first" : ""}></vsc-customization-group>` + list.map(withBadge).join("");
    first = false;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = `<vsc-customization-list section="${id}" kind="${t.kind}" heading="${esc(t.label)}" description="${esc(page.getAttribute("description") || "")}" link="${esc(page.getAttribute("link") || "")}">${rows}</vsc-customization-list>`;
  return tmp.firstElementChild;
}
// Workspace groups show their folder in the header's description slot.
function showPaths(root) {
  customElements.whenDefined("vsc-customization-group").then(() => requestAnimationFrame(() => {
    // The filters sit under the page's search box, right above the list they narrow.
    const bar = root.querySelector(":scope > .lib-filters"), search = root.querySelector(".list-search-and-button-container");
    if (bar && search) search.after(bar);
    for (const g of root.querySelectorAll("vsc-customization-group[data-path]")) {
      const host = g.querySelector(".group-title-row, .group-label-group");
      if (!host || host.querySelector(".lib-group-path")) continue;
      const p = document.createElement("span");
      p.className = "lib-group-path";
      p.textContent = g.dataset.path;
      host.append(p);
    }
  }));
}

export function mountLibrary(root, opts = {}) {
  root.className = "se lib";
  root.innerHTML = `
    <nav class="se-nav" aria-label="Customization types"><div class="se-nav-list" role="tablist" aria-orientation="vertical">${NAV.map((n) => n === "-" ? '<div class="se-nav-sep" role="presentation"></div>'
      : `<div class="se-nav-item" role="tab" tabindex="-1" data-id="${n.id}"><span class="se-nav-label">${n.label}</span><span class="se-nav-count">${countOf(n.id)}</span></div>`).join("")}</div>
      <div class="se-nav-footer"><button class="se-nav-footer-btn" data-act="session"><span class="codicon codicon-layout-sidebar-right" aria-hidden="true"></span>What this session uses</button></div></nav>
    <div class="se-main"><div class="lib-host"></div></div>`;
  const host = root.querySelector(".lib-host");
  const hosted = {};
  const state = { section: "plugins", lastType: "plugins" };
  // Filters apply to the type pages. `from` is set when the panel opened the modal on a session's scope.
  const filter = { workspace: null, harness: null, from: false };
  const filterKey = () => `${filter.workspace}|${filter.harness}`;
  const filterBar = () => {
    const ws = filter.workspace ? workspaceTitle(filter.workspace) : "All workspaces", h = filter.harness ? HARNESSES[filter.harness].label : "All agents";
    return `<div class="lib-filters">
      <button class="lib-filter${filter.workspace ? " set" : ""}" data-filter="workspace">${esc(ws)}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
      <button class="lib-filter${filter.harness ? " set" : ""}" data-filter="harness" title="Show only what this agent can use">Works with: ${esc(h)}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
      ${filter.workspace || filter.harness ? `<span class="lib-chip">${filter.from ? "This session" : "Filtered"}<button class="lib-chip-x" data-filter="clear" aria-label="Show everything" title="Show everything"><span class="codicon codicon-close-compact" aria-hidden="true"></span></button></span>` : ""}
    </div>`;
  };

  function render(id) {
    if (hosted[id] && typeOf(id) && hosted[id].dataset.filter !== filterKey()) { hosted[id].remove(); delete hosted[id]; }
    if (!hosted[id]) {
      const wrap = document.createElement("div");
      wrap.className = "lib-hosted";
      const n = NAV.find((x) => x.id === id), cat = CATEGORIES.find((c) => c.id === id);
      wrap.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${n.label}</h2></div>
        ${typeOf(id) && cat?.browse ? `<button class="se-btn small" data-act="browse">Browse</button>` : ""}</div>${typeOf(id) ? filterBar() : ""}`;
      wrap.dataset.filter = filterKey();
      const page = hostPage(typeOf(id) ? typePage(id, filter) : pages[id]);
      page.style.cssText = "flex:1;min-height:0";
      wrap.append(page);
      hosted[id] = wrap;
      host.append(wrap);
      showPaths(wrap);
    }
    for (const [k, el] of Object.entries(hosted)) el.style.display = k === id ? "flex" : "none";
  }

  /** scope: { workspace, harness } to start filtered to a session's scope, or null to keep the current filters. */
  function show(section, scope) {
    if (scope) Object.assign(filter, { workspace: WORKSPACES[scope.workspace] ? scope.workspace : null, harness: scope.harness || null, from: true });
    state.section = section;
    if (section !== "browse") state.lastType = section;
    for (const el of root.querySelectorAll(".se-nav-item")) {
      const on = el.dataset.id === section;
      el.classList.toggle("active", on);
      el.setAttribute("aria-selected", String(on));
      el.tabIndex = on ? 0 : -1;
    }
    render(section);
    opts.onShow?.(section);
  }

  function setFilter(patch) { Object.assign(filter, patch, { from: false }); render(state.section); }
  // A group header's ＋ creates that type in the group's scope: User → ~/.copilot/…, Workspace (name) → that repo.
  const DIRS = { skills: ["skills/", ".github/skills/"], instructions: ["instructions/", ".github/instructions/"], agents: ["agents/", ".github/agents/"],
    hooks: ["hooks/", ".github/hooks/"], mcp: ["mcp-config.json", ".vscode/mcp.json"], plugins: ["installed-plugins/", null] };
  root.addEventListener("click", (e) => {
    const add = e.target.closest("vsc-customization-group .codicon-add");
    if (add) {
      e.stopPropagation();
      const g = add.closest("vsc-customization-group"), t = typeOf(state.section), label = g.getAttribute("label");
      const [userDir, wsDir] = DIRS[t.id];
      const ws = Object.keys(WORKSPACES).find((w) => workspaceTitle(w) === label);
      if (t.id === "plugins") return toast("Install a plugin from a folder or Git URL. It will be available in all your sessions.");
      return toast(ws ? `New ${t.one} in ${WORKSPACES[ws].label}/${wsDir}. Only sessions in ${label} will use it.` : `New ${t.one} in ~/.copilot/${userDir}. All your sessions will use it.`);
    }
    const f = e.target.closest("[data-filter]");
    if (f) {
      const kind = f.dataset.filter;
      if (kind === "clear") return setFilter({ workspace: null, harness: null });
      if (kind === "workspace") return openMenu(f, [{ label: "All Workspaces", value: null, checked: !filter.workspace }, "-",
        ...Object.keys(WORKSPACES).map((w) => ({ label: workspaceTitle(w), value: w, checked: filter.workspace === w })), "-", { label: "Add Folder...", add: true }],
        (it) => it.add ? toast("Pick a folder to include its customizations in the library.") : setFilter({ workspace: it.value }));
      return openMenu(f, [{ label: "All Agents", value: null, checked: !filter.harness }, "-", ...HARNESS_IDS.map((h) => ({ label: HARNESSES[h].label, value: h, checked: filter.harness === h }))],
        (it) => setFilter({ harness: it.value }));
    }
    const nav = e.target.closest(".se-nav-item");
    if (nav) return show(nav.dataset.id);
    const act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "browse") show("browse");
    else if (act.dataset.act === "session") opts.onSession?.();

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
  const GROUP_OF = { Plugin: "From plugins" };
  function reveal(name, source) {
    const list = host.querySelector(`.lib-hosted vsc-customization-list[section="${state.section}"]`) || hosted[state.section]?.querySelector("vsc-customization-list");
    if (!list) return;
    const input = list.querySelector("input");
    if (input && input.value) { input.value = ""; list.filter(""); }
    let group = null, target = null, targetGroup = null;
    const want = GROUP_OF[source] || source;
    for (const row of list.rows()) {
      if (row.localName === "vsc-customization-group") { group = row; continue; }
      if (row.getAttribute("name") !== name) continue;
      const gl = group?.getAttribute("label");
      if (!target || gl === want || (want === "Built-in tools" && /Built-in/.test(gl || ""))) { target = row; targetGroup = group; if (gl === want) break; }
    }
    if (!target) return;
    if (targetGroup?.hasAttribute("collapsed")) { targetGroup.removeAttribute("collapsed"); list.applyVisibility(); }
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "center" });
      target.classList.remove("lib-reveal"); void target.offsetWidth; target.classList.add("lib-reveal");
    });
  }
  return { show, reveal, get section() { return state.section; }, get lastType() { return state.lastType; } };
}
