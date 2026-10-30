/*
 * AICustomizationListWidget (kind=prompts) and McpListWidget / PluginListWidget (kind=mcp|plugins) inside their
 * content containers. The product virtualizes the tree (absolute rows, `contain: strict`); rows here are laid out
 * in flow and the list scrolls natively. Group headers collapse their rows; the search box filters by name.
 */
const CUSTOMIZATION_LIST_IDS = { prompts: "list_id_c8", mcp: "list_id_c9", plugins: "list_id_c10" };

class CustomizationList extends ds.Element {
  static props = ["kind", "heading", "description", "link", "placeholder"];

  render() {
    const h = ds.h;
    const kind = this.attr("kind", "prompts");
    const heading = this.attr("heading", "");
    const secondary = "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);";
    const primary = "color: var(--vscode-button-foreground); background-color: var(--vscode-button-background); border: 1px solid var(--vscode-button-border);";
    this.setClasses({ "prompts-content-container": kind === "prompts", "mcp-content-container": kind === "mcp", "plugin-content-container": kind === "plugins" });
    const titleActions = [h("a.monaco-button.secondary.small.monaco-text-button", { tabindex: "0", role: "button", "aria-label": "Browse", "aria-disabled": "false", style: secondary,
      onclick: () => this.dispatchEvent(new CustomEvent("browse", { bubbles: true })) }, "Browse")];
    if (kind === "plugins") titleActions.push(h("a.monaco-button.secondary.small.section-title-more-action.codicon.codicon-ellipsis", { tabindex: "0", role: "button", "aria-label": "More Marketplace Actions", "aria-disabled": "false", "aria-haspopup": "menu", "aria-expanded": "false", style: secondary }));
    const header = h("div.section-title-header", null,
      h("div.section-title-row", null, h("h2.section-title", null, heading), h("div.section-title-actions", null, titleActions)),
      h("p.section-title-description", null,
        h("span.section-title-description-text", null, this.attr("description", "")),
        " ",
        this.attr("link") ? h("a.section-title-link", { href: "#", onclick: (e) => e.preventDefault() }, this.attr("link")) : null));
    const input = h("input.input.empty", { autocorrect: "off", autocapitalize: "off", spellcheck: "false", type: "text", wrap: "off", placeholder: this.attr("placeholder", "Type to search..."), "aria-label": `Search ${heading}`,
      style: "background-color: inherit; color: var(--vscode-input-foreground);", oninput: (e) => { e.target.classList.toggle("empty", !e.target.value); this.filter(e.target.value); } });
    const search = h("div.list-search-and-button-container", null,
      h("div.list-search-container", null,
        h("div.monaco-inputbox.idle", { style: "background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent);" },
          h("div.ibwrapper", null, input))),
      kind === "prompts" ? h("div.list-add-button-container", null,
        h("a.monaco-button.list-add-button", { role: "button", "aria-disabled": "false", style: primary + " display: none;" }),
        h("div.monaco-button-dropdown.list-add-button", { style: "display: none;" })) : null);
    const rows = h("div.monaco-list-rows", { style: "overflow: visible; height: auto; left: 0px; top: 0px;" }, this.slotted(""));
    const list = h("div.monaco-list.mouse-support.selection-none", { class: CUSTOMIZATION_LIST_IDS[kind], role: "tree", "aria-label": kind === "prompts" ? "Agent Customizations" : heading },
      h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden auto; height: 100%;" }, rows));
    rows.addEventListener("click", (e) => {
      const group = e.target.closest("vsc-customization-group");
      if (group && !e.target.closest(".group-actions")) this.toggleGroup(group);
    });
    if (kind === "prompts") {
      this.__widget = h("div.ai-customization-list-widget", null, header, search, h("div.list-container", null, list));
    } else {
      this.__widget = h("div.mcp-list-widget.plugin-list-widget", { class: kind === "mcp" ? "show-mcp-item-icons" : undefined, style: "height: 100%;" },
        header,
        kind === "plugins" ? h("div.plugin-marketplace-back-container", { style: "display: none;" }) : null,
        search,
        h("div.mcp-empty-state", { style: "display: none;" }, h("div.empty-state-header", null, h("div.empty-text")), h("div.empty-subtext")),
        h("div.mcp-list-container.customization-tree-container", { style: "flex: 1 1 0%; min-height: 0px;" }, list));
    }
    return this.__widget;
  }

  updated() {
    if (this.__ro) this.__ro.disconnect();
    // updateResponsiveLayout(): narrow below 500px, wide from 600px.
    this.__ro = new ResizeObserver(() => {
      const w = this.__widget.clientWidth;
      this.__widget.classList.toggle("narrow-layout", w < 500);
      this.__widget.classList.toggle("wide-layout", w >= 600);
    });
    this.__ro.observe(this.__widget);
  }

  rows() {
    return this.slotted("").filter((n) => n.nodeType === 1);
  }

  toggleGroup(group) {
    group.toggleAttribute("collapsed");
    this.applyVisibility();
  }

  filter(query) {
    this.__query = query.trim().toLowerCase();
    this.applyVisibility();
  }

  applyVisibility() {
    let collapsed = false;
    for (const row of this.rows()) {
      if (row.localName === "vsc-customization-group") {
        collapsed = row.hasAttribute("collapsed");
        row.hidden = false;
        continue;
      }
      const name = (row.getAttribute("name") || "").toLowerCase();
      row.hidden = collapsed || (!!this.__query && !name.includes(this.__query));
    }
  }
}

ds.define("vsc-customization-list", CustomizationList);
