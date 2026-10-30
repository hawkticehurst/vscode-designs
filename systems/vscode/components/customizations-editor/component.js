/*
 * AICustomizationManagementEditor: section sidebar + content split. The sidebar's section list is a monaco list
 * (list_id_c6, 26px rows); rows are rendered statically at their real offsets. Content pages are slotted children
 * with a `section` attribute; only the page for the current section is shown.
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

class CustomizationsEditor extends ds.Element {
  static hostClass = "ai-customization-management-editor pointer-focus";
  static props = ["section", "sidebar-width", "counts"];

  render() {
    const h = ds.h;
    const section = this.attr("section", "browse");
    const width = Number(this.attr("sidebar-width", "200"));
    const counts = this.attr("counts", "2,7,32,2,3,1,36").split(",").map((c) => c.trim());
    const select = (id) => {
      this.setAttribute("section", id);
      this.dispatchEvent(new CustomEvent("section-change", { bubbles: true, detail: { section: id } }));
    };
    const rows = CUSTOMIZATION_SECTIONS.map((s, i) => {
      const selected = s.id === section;
      const count = counts[i];
      const label = s.id === "extensions" ? s.label : `${s.label}, ${count} items`;
      return h("div.monaco-list-row.section-list-item" + (selected ? ".focused.selected" : "") + (s.separator ? ".section-separator-before" : ""),
        { role: "listitem", "data-index": String(i), "data-last-element": i === CUSTOMIZATION_SECTIONS.length - 1 ? "true" : "false", "aria-setsize": String(CUSTOMIZATION_SECTIONS.length), "aria-posinset": String(i + 1), "aria-selected": String(selected), "aria-label": label, draggable: "false", style: `top: ${i * 26}px; height: 26px;`, onclick: () => select(s.id) },
        h("div.section-label", null, s.label),
        h("div.section-badge", { "aria-hidden": "true", style: "display: none;" }),
        s.id === "extensions" ? h("div.section-count", { style: "display: none;" }) : h("div.section-count", null, count));
    });
    const anySelected = section !== "browse";
    const sidebar = h("div.management-sidebar", { style: `width: ${width}px;` },
      h("div.sidebar-content", null,
        h("div.sidebar-header-row", null,
          h("button.sidebar-home-button.sidebar-harness-home-button" + (section === "browse" ? ".selected" : ""), { "aria-label": "Browse", title: "Back to Customizations", style: "flex: 1 1 0%;", onclick: () => select("browse") },
            h("span.sidebar-home-label", null, "Browse"))),
        h("div.sidebar-sections-list", { style: `height: ${CUSTOMIZATION_SECTIONS.length * 26}px;` },
          h("div.monaco-list.list_id_c6.mouse-support" + (anySelected ? ".last-focused.element-focused.selection-single" : ".last-focused.selection-none"), { role: "list", "aria-label": "Agent Customization Sections" },
            h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden;" },
              h("div.monaco-list-rows", { style: `transform: translate3d(0px, 0px, 0px); overflow: hidden; contain: strict; height: ${CUSTOMIZATION_SECTIONS.length * 26}px; left: 0px; top: 0px;` }, rows),
              h("div.invisible.scrollbar.horizontal", { role: "presentation", "aria-hidden": "true", style: "position: absolute; width: 0px; height: 10px; left: 0px; bottom: 0px;" }, h("div.slider", { style: "position: absolute; top: 0px; left: 0px; height: 10px; transform: translate3d(0px, 0px, 0px); contain: strict; width: 0px;" })),
              h("div.invisible.scrollbar.vertical", { role: "presentation", "aria-hidden": "true", style: `position: absolute; width: 10px; height: ${CUSTOMIZATION_SECTIONS.length * 26}px; right: 0px; top: 0px;` }, h("div.slider", { style: `position: absolute; top: 0px; left: 0px; width: 10px; transform: translate3d(0px, 0px, 0px); contain: strict; height: ${CUSTOMIZATION_SECTIONS.length * 26}px;` })))))));
    const pages = this.slotted("").filter((n) => n.nodeType === 1);
    for (const page of pages) page.style.display = (page.getAttribute("section") || "browse") === section ? "" : "none";
    return h("div.management-split-view", { style: "height: 100%;" },
      h("div.monaco-split-view2.horizontal", null,
        h("div.sash-container", null, h("div.monaco-sash.mac.vertical" + (width <= 150 ? ".minimum" : ""), { style: `left: ${width - 3}px;` })),
        h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden; height: 100%;" },
          h("div.split-view-container", { style: "overflow: hidden; height: 100%;" },
            h("div.split-view-view.visible", { style: `left: 0px; width: ${width}px; height: 100%;` }, sidebar),
            h("div.split-view-view.visible", { style: `left: ${width}px; width: calc(100% - ${width}px); height: 100%;` },
              h("div.management-content", { style: "width: 100%;" },
                h("div.content-inner", null, pages)))))));
  }
}

ds.define("vsc-customizations-editor", CustomizationsEditor);
