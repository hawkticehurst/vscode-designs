/*
 * AICustomizationManagementEditor: section sidebar + content split. The sidebar's section list is a monaco list
 * (list_id_c6, 26px rows); rows are rendered statically at their real offsets. Content pages are slotted children
 * with a `section` attribute; only the page for the current section is shown.
 *
 * The split is resizable like the product's SplitView: drag the sash between the sidebar and the content
 * (sidebar 150–350px, content at least 400px), double-click it to reset to 200px. When the editor gets narrower the
 * sidebar gives way first, down to its minimum. Changing `section` or `sidebar-width` updates the editor in place,
 * so the pages keep their state (search text, scroll position).
 */
const CUSTOMIZATION_SECTIONS = [
  { id: "plugins", label: "Plugins" },
  { id: "mcp", label: "MCP Servers" },
  { id: "skills", label: "Skills" },
  { id: "instructions", label: "Instructions" },
  { id: "agents", label: "Agents" },
  { id: "hooks", label: "Hooks" },
  { id: "tools", label: "Tools" },
  { id: "extensions", label: "Extensions", separator: true },
];
// The row after the separator (Extensions) is 8px taller: the separator gap sits inside it (padding-top 12px,
// Insiders 2026-11-01; earlier builds used a 26px row).
const SEPARATOR_EXTRA = 8;
const LIST_HEIGHT = CUSTOMIZATION_SECTIONS.length * 26 + SEPARATOR_EXTRA;
// src/vs/workbench/contrib/chat/browser/aiCustomization/aiCustomizationManagement.ts
const CUSTOMIZATION_SIDEBAR = { default: 200, min: 150, max: 350, contentMin: 400 };

/*
 * ds.sash(element, { start, move, reset }): makes a `.monaco-sash.vertical` draggable like the product's Sash —
 * `.hover` after a 300ms hover delay, `.active` while dragging, a col-resize cursor on the whole page during the
 * drag and `reset` on double-click. `start()` runs on pointerdown; `move(dx)` gets the horizontal distance since then.
 */
ds.sash = ds.sash || function sash(el, { start, move, end, reset }) {
  let hoverTimer;
  el.addEventListener("pointerenter", () => { hoverTimer = setTimeout(() => el.classList.add("hover"), 300); });
  el.addEventListener("pointerleave", () => { clearTimeout(hoverTimer); if (!el.classList.contains("active")) el.classList.remove("hover"); });
  el.addEventListener("dblclick", (e) => { e.preventDefault(); reset?.(); });
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    el.classList.add("active");
    const x0 = e.clientX;
    const cursor = document.documentElement.style.cursor;
    document.documentElement.style.cursor = getComputedStyle(el).cursor;
    start?.();
    const onMove = (ev) => move?.(ev.clientX - x0);
    const onUp = () => {
      el.classList.remove("active");
      if (!el.matches(":hover")) el.classList.remove("hover");
      document.documentElement.style.cursor = cursor;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      end?.();
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });
  return el;
};

class CustomizationsEditor extends ds.Element {
  static hostClass = "ai-customization-management-editor pointer-focus";
  static props = ["section", "sidebar-width", "counts", "list-focused"];

  attributeChangedCallback(name) {
    if (this.__built && (name === "section" || name === "sidebar-width")) {
      this.applyState();
      return;
    }
    super.attributeChangedCallback();
  }

  render() {
    const h = ds.h;
    const counts = this.attr("counts", "2,7,32,2,3,1,36").split(",").map((c) => c.trim());
    const select = (id) => {
      this.setAttribute("section", id);
      this.dispatchEvent(new CustomEvent("section-change", { bubbles: true, detail: { section: id } }));
    };
    this.__rows = CUSTOMIZATION_SECTIONS.map((s, i) => {
      const count = counts[i];
      // Sections with nothing in them (empty count) show no count, like the product.
      const hasCount = s.id !== "extensions" && count !== undefined && count !== "";
      const label = hasCount ? `${s.label}, ${count} items` : s.label;
      return h("div.monaco-list-row.section-list-item" + (s.separator ? ".section-separator-before" : ""),
        { role: "listitem", "data-section": s.id, "data-index": String(i), "data-last-element": i === CUSTOMIZATION_SECTIONS.length - 1 ? "true" : "false", "aria-setsize": String(CUSTOMIZATION_SECTIONS.length), "aria-posinset": String(i + 1), "aria-selected": "false", "aria-label": label, draggable: "false", style: `top: ${i * 26}px; height: ${s.separator ? 26 + SEPARATOR_EXTRA : 26}px;`, onclick: () => select(s.id) },
        h("div.section-label", null, s.label),
        h("div.section-badge", { "aria-hidden": "true", style: "display: none;" }),
        hasCount ? h("div.section-count", null, count) : h("div.section-count", { style: "display: none;" }));
    });
    this.__home = h("button.sidebar-home-button.sidebar-harness-home-button", { "aria-label": "Browse", title: "Back to Customizations", style: "flex: 1 1 0%;", onclick: () => select("browse") },
      h("span.sidebar-home-label", null, "Browse"));
    this.__list = h("div.monaco-list.list_id_c6.mouse-support", { role: "list", "aria-label": "Agent Customization Sections" },
      h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden;" },
        h("div.monaco-list-rows", { style: `transform: translate3d(0px, 0px, 0px); overflow: hidden; contain: strict; height: ${LIST_HEIGHT}px; left: 0px; top: 0px;` }, this.__rows),
        h("div.invisible.scrollbar.horizontal", { role: "presentation", "aria-hidden": "true", style: "position: absolute; width: 0px; height: 10px; left: 0px; bottom: 0px;" }, h("div.slider", { style: "position: absolute; top: 0px; left: 0px; height: 10px; transform: translate3d(0px, 0px, 0px); contain: strict; width: 0px;" })),
        h("div.invisible.scrollbar.vertical", { role: "presentation", "aria-hidden": "true", style: `position: absolute; width: 10px; height: ${LIST_HEIGHT}px; right: 0px; top: 0px;` }, h("div.slider", { style: `position: absolute; top: 0px; left: 0px; width: 10px; transform: translate3d(0px, 0px, 0px); contain: strict; height: ${LIST_HEIGHT}px;` }))));
    this.__sidebar = h("div.management-sidebar", null,
      h("div.sidebar-content", null,
        h("div.sidebar-header-row", null, this.__home),
        h("div.sidebar-sections-list", { style: `height: ${LIST_HEIGHT}px;` }, this.__list)));
    this.__pages = this.slotted("").filter((n) => n.nodeType === 1);
    this.__sash = h("div.monaco-sash.mac.vertical");
    this.__sidebarView = h("div.split-view-view.visible", { style: "left: 0px; height: 100%;" }, this.__sidebar);
    this.__contentView = h("div.split-view-view.visible", { style: "height: 100%;" },
      h("div.management-content", { style: "width: 100%;" }, h("div.content-inner", null, this.__pages)));
    let startWidth = 0;
    ds.sash(this.__sash, {
      start: () => { startWidth = this.__width; },
      move: (dx) => this.layoutSidebar(startWidth + dx),
      end: () => {
        this.__requested = this.__width;
        this.setAttribute("sidebar-width", String(this.__width));
        this.dispatchEvent(new CustomEvent("sidebar-resize", { bubbles: true, detail: { width: this.__width } }));
      },
      reset: () => this.setAttribute("sidebar-width", String(CUSTOMIZATION_SIDEBAR.default)),
    });
    this.__built = true;
    return h("div.management-split-view", { style: "height: 100%;" },
      h("div.monaco-split-view2.horizontal", null,
        h("div.sash-container", null, this.__sash),
        h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden; height: 100%;" },
          h("div.split-view-container", { style: "overflow: hidden; height: 100%;" }, this.__sidebarView, this.__contentView))));
  }

  updated() {
    this.applyState();
    if (!this.__ro) {
      // Like SplitView.layout(): when the editor shrinks, the sidebar gives way so the content keeps its minimum.
      this.__ro = new ResizeObserver(() => this.layoutSidebar(this.__requested));
      this.__ro.observe(this);
    }
  }

  applyState() {
    const section = this.attr("section", "browse");
    for (const row of this.__rows) {
      const selected = row.dataset.section === section;
      row.classList.toggle("focused", selected);
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-selected", String(selected));
    }
    this.__home.classList.toggle("selected", section === "browse");
    const anySelected = section !== "browse";
    // The section list only becomes `last-focused` once a row has been selected (the product opens on Browse with
    // the list never focused).
    if (anySelected || this.flag("list-focused")) this.__listFocused = true;
    this.__list.classList.toggle("last-focused", !!this.__listFocused);
    this.__list.classList.toggle("element-focused", anySelected);
    this.__list.classList.toggle("selection-single", anySelected);
    this.__list.classList.toggle("selection-none", !anySelected);
    for (const page of this.__pages) page.style.display = (page.getAttribute("section") || "browse") === section ? "" : "none";
    this.__requested = Number(this.attr("sidebar-width", String(CUSTOMIZATION_SIDEBAR.default)));
    this.layoutSidebar(this.__requested);
  }

  /** Lays out the split for a requested sidebar width, clamped to the sidebar and content limits. */
  layoutSidebar(requested) {
    const { min, max, contentMin } = CUSTOMIZATION_SIDEBAR;
    const total = this.clientWidth;
    const limit = total ? Math.max(min, Math.min(max, total - contentMin)) : max;
    const width = Math.round(Math.min(limit, Math.max(min, requested)));
    this.__width = width;
    this.__sidebar.style.width = `${width}px`;
    this.__sidebarView.style.width = `${width}px`;
    this.__contentView.style.left = `${width}px`;
    this.__contentView.style.width = `calc(100% - ${width}px)`;
    this.__sash.style.left = `${width - 3}px`;
    this.__sash.classList.toggle("minimum", width <= min);
    this.__sash.classList.toggle("maximum", width >= limit && width > min);
  }
}

ds.define("vsc-customizations-editor", CustomizationsEditor);
