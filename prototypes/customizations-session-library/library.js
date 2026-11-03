/* Library: everything you have, across workspaces and agents, in the Settings prototypes' modal layout (left nav,
   one page at a time). Every page is the product's page design: the type pages are the Customizations editor's
   list page (description, search and the grouped tree), with the tree grouped by source (yours, each workspace,
   plugins, built-in); Discover, Tools and Extensions are the product pages as they are. */
import { openMenu, toast } from "./panel-shell.js";
const { TYPES, WORKSPACES, items, type: typeOf } = window.SCOPE;
const { first: pages, CATEGORIES, esc, hostPage } = window.CUST;
const NAV = [{ id: "browse", label: "Discover" }, "-", ...TYPES.map((t) => ({ id: t.id, label: t.label })), "-", { id: "tools", label: "Tools" }, { id: "extensions", label: "Extensions" }];
const countOf = (id) => id === "tools" ? 36 : id === "extensions" ? 11 : id === "browse" ? "" : items.filter((it) => it.type === id).length;

/** A type's list page: the product's <vsc-customization-list>, its tree grouped by where each item is defined. */
function typePage(id) {
  const t = typeOf(id), page = pages[id], cat = CATEGORIES.find((c) => c.id === id);
  const of = items.filter((it) => it.type === id);
  const groups = [["Yours", "account", of.filter((it) => it.source === "user"), true],
    ...Object.values(WORKSPACES).map((w, i) => [w.label, "folder", of.filter((it) => it.source === "workspace" && it.workspace === Object.keys(WORKSPACES)[i]), id !== "plugins"]),
    ["From plugins", "plug", of.filter((it) => it.source === "plugin"), false], ["Built-in", "vscode-insiders", of.filter((it) => it.source === "builtin"), false]];
  let first = true, rows = "";
  for (const [label, icon, list, canAdd] of groups) {
    if (!list.length && !canAdd) continue;
    rows += `<vsc-customization-group label="${esc(label)}" count="${list.length}" icon="${icon}"${canAdd && cat?.add ? ` actions="add" add-label="${esc(cat.add)}"` : ' actions=""'}${first ? " first" : ""}></vsc-customization-group>` + list.map((r) => r.html).join("");
    first = false;
  }
  const tmp = document.createElement("div");
  tmp.innerHTML = `<vsc-customization-list section="${id}" kind="${t.kind}" heading="${esc(t.label)}" description="${esc(page.getAttribute("description") || "")}" link="${esc(page.getAttribute("link") || "")}">${rows}</vsc-customization-list>`;
  return tmp.firstElementChild;
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
  const state = { section: "plugins" };

  function render(id) {
    if (!hosted[id]) {
      const wrap = document.createElement("div");
      wrap.className = "lib-hosted";
      const n = NAV.find((x) => x.id === id), cat = CATEGORIES.find((c) => c.id === id);
      wrap.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${n.label}</h2></div>
        ${typeOf(id) && cat?.add ? `<button class="se-btn primary small" data-act="new"><span class="codicon codicon-add" aria-hidden="true"></span>${esc(cat.add)}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>` : ""}
        ${typeOf(id) && cat?.browse ? `<button class="se-btn small" data-act="browse"><span class="codicon codicon-compass" aria-hidden="true"></span>Browse</button>` : ""}</div>`;
      const page = hostPage(typeOf(id) ? typePage(id) : pages[id]);
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
    render(section);
    opts.onShow?.(section);
  }

  root.addEventListener("click", (e) => {
    const nav = e.target.closest(".se-nav-item");
    if (nav) return show(nav.dataset.id);
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
