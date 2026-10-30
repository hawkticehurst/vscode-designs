/*
 * CustomizationDiscoveryPage inside `.welcome-page-host`. The marketplace search box is a suggest-enabled Monaco
 * input in the product; here it's the same container/placeholder markup around a plain input.
 */
class CustomizationBrowse extends ds.Element {
  static hostClass = "welcome-page-host";
  static props = ["heading", "description", "placeholder", "source", "narrow"];

  render() {
    const h = ds.h;
    const heading = this.attr("heading", "Browse customizations");
    const description = this.attr("description", "Tailor your agent to your tools, your team, and your workflow.");
    const placeholder = this.attr("placeholder", "Search MCP servers, plugins, skills and more...");
    const source = this.attr("source", "All Sources");
    const secondary = "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);";
    const dark = (ds.system.themes.find((t) => t.id === this.closest("[data-theme]")?.getAttribute("data-theme")) || {}).kind !== "light";
    this.style.height = "100%";
    this.style.overflow = "hidden";
    const ph = h("div.suggest-input-placeholder", { style: "color: var(--vscode-input-placeholderForeground); width: calc(100% - 28px);" }, placeholder);
    const input = h("input", { type: "text", "aria-label": placeholder, style: "all: unset; width: 100%; height: 20px; font: inherit; color: var(--vscode-input-foreground);",
      oninput: (e) => {
        ph.style.display = e.target.value ? "none" : "";
        this.dispatchEvent(new CustomEvent("search", { bubbles: true, detail: { query: e.target.value } }));
      } });
    const addButton = h("a.monaco-button.secondary.small.monaco-text-button", { tabindex: "0", role: "button", "aria-disabled": "false", "aria-haspopup": "menu", "aria-label": "Add a customization", "aria-expanded": "false", style: secondary },
      h("span", null, "Add Customization"), h("span.codicon.codicon-chevron-down"));
    const filterAction = h("li.action-item", { role: "presentation" },
      h("div.monaco-dropdown", null,
        h("div.dropdown-label", null,
          h("a.action-label.codicon.codicon-filter", { tabindex: "0", role: "button", "aria-haspopup": "true", "aria-expanded": "false", "aria-label": "Filter Customizations...", "aria-disabled": "false" }))));
    const search = h("div.customization-discovery-search", null,
      h("div.suggest-input-container", { style: "--editor-font-size: 13px; background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border-width: 1px; border-style: solid; border-color: var(--vscode-input-border, transparent);" },
        ph,
        h("div.monaco-editor.no-user-select.mac.showUnused.showDeprecated", { class: dark ? "vs-dark" : "vs", role: "code", style: "width: calc(100% - 26px); height: 20px;" }, input)),
      h("div.customization-discovery-search-actions", null,
        h("div.monaco-toolbar", null,
          h("div.monaco-action-bar", null,
            h("ul.actions-container.highlight-toggled", { role: "toolbar", "aria-label": "Customization Search Actions" }, filterAction)))));
    const sourcePicker = h("div.customization-discovery-source", null,
      h("a.monaco-button.secondary.small.monaco-text-button", { tabindex: "0", role: "button", "aria-disabled": "false", "aria-haspopup": "menu", "aria-label": `Customization source: ${source}`, style: secondary },
        h("span", null, source), h("span.codicon.codicon-chevron-down")));
    const header = h("div.customization-discovery-header", null,
      h("div.customization-discovery-title-row", null, h("h2.customization-discovery-title", null, heading), addButton),
      h("p.customization-discovery-description", null, description + " ",
        h("a", { href: "https://aka.ms/vscode-customizations", "aria-label": "Learn more about agent customizations", onclick: (e) => e.preventDefault() }, "Learn more")),
      h("div.customization-discovery-progress", null,
        h("div.monaco-progress-container.done", { role: "progressbar", "aria-valuemin": "0", "aria-label": "Loading customizations", style: "display: none;", "aria-hidden": "true" },
          h("div.progress-bit", { style: "background-color: var(--vscode-progressBar-background); width: inherit; opacity: 1; display: none;" }))),
      h("div.customization-discovery-search-row", null, search, sourcePicker),
      h("div.customization-marketplace-source-warnings", { role: "group", "aria-label": "Marketplace sources", hidden: "", "aria-busy": "false" }));
    const results = h("div.monaco-scrollable-element.mac.customization-discovery-browse-scrollable", { role: "presentation", style: "position: relative; overflow: hidden;" },
      h("div.customization-discovery-browse", { "aria-busy": "false", style: "overflow: hidden auto;" },
        h("div.customization-discovery-state"),
        h("div.customization-discovery-sections", null, this.slotted(""))));
    this.__root = h("div.customization-discovery", null, h("div.customization-discovery-content", null, header, results));
    return this.__root;
  }

  updated() {
    if (this.__ro) this.__ro.disconnect();
    // CustomizationDiscoveryPage.layout(): `.narrow` below 800px.
    this.__ro = new ResizeObserver(() => this.__root.classList.toggle("narrow", this.flag("narrow") || this.__root.clientWidth < 800));
    this.__ro.observe(this.__root);
  }
}

ds.define("vsc-customization-browse", CustomizationBrowse);
