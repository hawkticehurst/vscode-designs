/*
 * AICustomizationListWidget (kind=prompts) and McpListWidget / PluginListWidget (kind=mcp|plugins) inside their
 * content containers. The product virtualizes the tree (absolute rows, `contain: strict`); rows here are laid out
 * in flow and the list scrolls natively. Group headers collapse their rows; the search box filters by name.
 * kind=tools is ToolsListWidget; kind=extensions is the Agents window's AgentsWindowExtensionsWidget
 * (src/vs/sessions/contrib/extensions/browser/agentsWindowExtensionsWidget.ts).
 */
const CUSTOMIZATION_LIST_IDS = { prompts: "list_id_c8", mcp: "list_id_c9", plugins: "list_id_c10", tools: "list_id_c11", extensions: "list_id_c14" };

class CustomizationList extends ds.Element {
  static props = ["kind", "heading", "description", "link", "placeholder"];

  render() {
    const h = ds.h;
    const kind = this.attr("kind", "prompts");
    const heading = this.attr("heading", "");
    const secondary = "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);";
    const primary = "color: var(--vscode-button-foreground); background-color: var(--vscode-button-background); border: 1px solid var(--vscode-button-border);";
    this.setClasses({ "prompts-content-container": kind === "prompts", "mcp-content-container": kind === "mcp", "plugin-content-container": kind === "plugins",
      "tools-content-container": kind === "tools" || kind === "extensions", "contributed-section-container": kind === "extensions" });
    const searchInput = (ariaLabel) => h("div.monaco-inputbox.idle", { style: "background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent);" },
      h("div.ibwrapper", null, h("input.input.empty", { autocorrect: "off", autocapitalize: "off", spellcheck: "false", type: "text", wrap: "off", placeholder: this.attr("placeholder", "Type to search..."), "aria-label": ariaLabel,
        style: "background-color: inherit; color: var(--vscode-input-foreground);", oninput: (e) => { e.target.classList.toggle("empty", !e.target.value); this.filter(e.target.value); } })));
    const makeList = (cls, ariaLabel) => {
      const rows = h("div.monaco-list-rows", { style: "overflow: visible; height: auto; left: 0px; top: 0px;" }, this.slotted(""));
      rows.addEventListener("click", (e) => {
        const group = e.target.closest("vsc-customization-group");
        if (group && !e.target.closest(".group-actions")) this.toggleGroup(group);
      });
      return h("div.monaco-list.mouse-support.selection-none", { class: cls, role: "tree", "aria-label": ariaLabel },
        h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden auto; height: 100%;" }, rows));
    };
    if (kind === "tools") {
      this.__widget = h("div.tools-list-widget", null,
        h("div.section-title-header", null,
          h("div.section-title-row", null, h("h2.section-title", null, heading)),
          h("p.section-title-description", null,
            h("span.section-title-description-text", null, this.attr("description", "")), " ",
            this.attr("link") ? h("a.section-title-link", { href: "#", onclick: (e) => e.preventDefault() }, this.attr("link")) : null)),
        h("div.tools-list-search-and-button-container", null, h("div.tools-list-search-container", null, searchInput("Search tools"))),
        h("div.tools-list-tree.customization-tree-container", null, makeList(CUSTOMIZATION_LIST_IDS.tools, "Tools")));
      return this.__widget;
    }
    if (kind === "extensions") {
      this.__widget = h("div.agents-window-extensions", null,
        h("div.agents-window-extensions-header", null,
          h("div.agents-window-extensions-title-row", null,
            h("h2.agents-window-extensions-title", null, heading),
            h("a.monaco-button.secondary.small", { tabindex: "0", role: "button", "aria-disabled": "false", style: secondary + " display: none;" })),
          h("p.agents-window-extensions-description", null, this.attr("description", ""))),
        h("div.agents-window-extensions-search", null, searchInput("Search extensions")),
        h("div.agents-window-extensions-tree.customization-tree-container", null, makeList(CUSTOMIZATION_LIST_IDS.extensions, "Extensions")),
        h("div.agents-window-extensions-empty", { style: "display: none;" },
          h("div.agents-window-extensions-empty-text", null, "No extensions installed"),
          h("div.agents-window-extensions-empty-subtext", null, "Extensions you install in VS Code appear here.")));
      return this.__widget;
    }
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
    if (this.attr("kind", "prompts") === "extensions") return;
    // updateResponsiveLayout(): narrow below 500px, wide from 600px.
    this.__ro = new ResizeObserver(() => {
      const w = this.__widget.clientWidth;
      this.__widget.classList.toggle("narrow-layout", w < 500);
      // ToolsListWidget only has a narrow layout.
      if (this.attr("kind", "prompts") !== "tools") this.__widget.classList.toggle("wide-layout", w >= 600);
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
        row.removeAttribute("data-tree-hidden");
        continue;
      }
      const name = (row.getAttribute("name") || "").toLowerCase();
      const hide = collapsed || (!!this.__query && !name.includes(this.__query));
      // Rows are display: block hosts, so `hidden` alone wouldn't hide them; component.css keys off data-tree-hidden.
      row.hidden = hide;
      row.toggleAttribute("data-tree-hidden", hide);
    }
  }
}

ds.define("vsc-customization-list", CustomizationList);
