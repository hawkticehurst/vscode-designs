/* Side panel behavior shared by the variants: editor tabs, title bar toggle (⌥⌘B), resizing from the panel's left
   edge (the workbench grid sash), and filtering Browse results. */
const C = window.PANEL_CONFIG;
const panel = document.getElementById("side-panel");
const toggle = document.getElementById("toggle-panel");
const sash = document.getElementById("panel-sash");

const part = document.getElementById("editor-part");
const cpanel = document.getElementById("cpanel");
let tabs = C.tabs.slice();
// Tells the Session Activity Bar which tab the side pane shows.
const changed = () => document.dispatchEvent(new CustomEvent("side-pane-change", { detail: { open: !panel.hidden, active: part.getAttribute("active") } }));
// Editor tabs: Session Customizations is one of the part's editors; the other tabs show an empty editor here.
export function setTab(active) {
  part.setAttribute("tabs", tabs.join(","));
  part.setAttribute("active", active);
  cpanel.style.display = active === "Session Customizations" ? "" : "none";
  changed();
}
export function setPanel(open) {
  panel.hidden = !open;
  toggle.setAttribute("icon", open ? "layout-sidebar-right" : "layout-sidebar-right-off");
  toggle.toggleAttribute("checked", open);
  changed();
}
// Opens (adding it when it was closed) or activates a side pane tab, revealing the side pane.
export function openTab(label) {
  if (!tabs.includes(label)) tabs.push(label);
  setPanel(true);
  setTab(label);
}
export const sidePane = () => ({ open: !panel.hidden, active: part.getAttribute("active") });
setTab(C.active);
setPanel(C.open);
part.addEventListener("tab-select", (e) => setTab(e.detail.label));
part.addEventListener("tab-close", (e) => {
  tabs = tabs.filter((t) => t !== e.detail.label);
  if (!tabs.length) { setPanel(false); tabs = C.tabs.slice(); setTab(C.active); return; }
  setTab(part.getAttribute("active") === e.detail.label ? tabs[tabs.length - 1] : part.getAttribute("active"));
});
toggle.addEventListener("click", () => {
  const open = panel.hidden;
  if (open && !tabs.includes("Session Customizations")) tabs.push("Session Customizations");
  setPanel(open);
  if (open) setTab(part.getAttribute("active") || "Session Customizations");
});
document.addEventListener("keydown", (e) => { if (e.altKey && e.metaKey && e.code === "KeyB") { e.preventDefault(); toggle.click(); } });

const SESSIONS_MIN = 520;
const maxWidth = () => Math.max(C.minWidth, document.querySelector(".parts").clientWidth - SESSIONS_MIN - 2 - (document.getElementById("activity-bar")?.offsetWidth || 0));
const setWidth = (w) => {
  const width = Math.round(Math.min(maxWidth(), Math.max(C.minWidth, w)));
  panel.style.width = width + "px";
  sash.classList.toggle("minimum", width <= C.minWidth);
  sash.classList.toggle("maximum", width >= maxWidth());
};
let startWidth = 0;
window.ds.vscode.sash(sash, { start: () => { startWidth = panel.offsetWidth; }, move: (dx) => setWidth(startWidth - dx), reset: () => setWidth(C.width) });
setWidth(C.width);
window.addEventListener("resize", () => setWidth(panel.offsetWidth));

// Browse search filters the marketplace cards by name, description or type.
panel.addEventListener("search", (e) => {
  const browse = e.target.closest("vsc-customization-browse");
  if (!browse) return;
  const q = e.detail.query.trim().toLowerCase();
  for (const section of browse.querySelectorAll("vsc-customization-discovery-section")) {
    let any = false;
    for (const card of section.querySelectorAll("vsc-customization-discovery-card")) {
      const hit = !q || ["name", "description", "meta"].some((a) => (card.getAttribute(a) || "").toLowerCase().includes(q));
      card.style.display = hit ? "" : "none";
      any ||= hit;
    }
    section.style.display = any ? "" : "none";
  }
});

// Filters a <vsc-customization-list> by name and returns the number of matching rows. While searching, group headers
// with no matching rows are hidden and the others count their matches.
export function filterList(list, query) {
  const q = query.trim().toLowerCase();
  list.filter(q);
  let matches = 0, group = null, groupHits = 0;
  const close = () => {
    if (!group) return;
    group.toggleAttribute("data-tree-hidden", !!q && groupHits === 0);
    group.dataset.total ??= group.getAttribute("count") || "0";
    const count = q ? String(groupHits) : group.dataset.total;
    if (group.getAttribute("count") !== count) group.setAttribute("count", count);
  };
  for (const row of list.rows()) {
    if (row.localName === "vsc-customization-group") { close(); group = row; groupHits = 0; continue; }
    if (!q || (row.getAttribute("name") || "").toLowerCase().includes(q)) { matches++; groupHits++; }
  }
  close();
  return matches;
}

// Context menu (<vsc-menu>) at a point or under an element. items: [{ label, checked, disabled } | "-"]; onPick(item).
let openMenuEl = null;
export function closeMenu() { openMenuEl?.remove(); openMenuEl = null; }
export function openMenu(at, items, onPick) {
  closeMenu();
  const wb = document.getElementById("wb"), box = wb.getBoundingClientRect();
  const r = at instanceof Element ? at.getBoundingClientRect() : { left: at.x, bottom: at.y, right: at.x };
  const menu = document.createElement("vsc-menu");
  menu.setAttribute("label", "Actions");
  for (const it of items) {
    const el = document.createElement(it === "-" ? "vsc-menu-separator" : "vsc-menu-item");
    if (it !== "-") {
      el.setAttribute("label", it.label);
      if (it.checked) el.setAttribute("checked", "");
      if (it.disabled) el.setAttribute("disabled", "");
      el.__item = it;
    }
    menu.append(el);
  }
  menu.setAttribute("x", String(Math.round(r.left - box.left)));
  menu.setAttribute("y", String(Math.round(r.bottom - box.top + 2)));
  menu.addEventListener("click", (e) => {
    const item = e.target.closest("vsc-menu-item");
    if (item && !item.__item.disabled) { closeMenu(); onPick(item.__item); }
    else if (e.target.closest(".context-view-block")) closeMenu();
  });
  wb.append(menu);
  openMenuEl = menu;
  // Keep it on screen, still aligned to an edge of what opened it: its left edge by default, its right edge when that
  // would overflow, and above it when there's no room below.
  requestAnimationFrame(() => {
    const m = menu.getBoundingClientRect();
    if (m.right > box.right - 8) menu.style.left = Math.max(8, r.right - box.left - m.width) + "px";
    if (m.bottom > box.bottom - 8) menu.style.top = Math.max(8, r.top - box.top - m.height - 2) + "px";
  });
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openMenuEl) { e.stopPropagation(); closeMenu(); } }, true);

export function toast(message, buttons = [], onAction) {
  const el = document.querySelector("vsc-notification-toasts")?.show({ severity: "info", message, buttons });
  if (el && onAction) el.addEventListener("action", (e) => onAction(e.detail.label));
  return el;
}
