/* CustomizationsToolbar (src/vs/sessions/contrib/sessions/browser/customizationsToolbar.contribution.ts). */
const CUSTOMIZATION_SHORTCUTS = [
  { id: "overview", label: "Overview", icon: "home" },
  { id: "plugins", label: "Plugins", icon: "ai-customization-plugin" },
  { id: "mcp", label: "MCP Servers", icon: "ai-customization-mcp-server" },
  { id: "skills", label: "Skills", icon: "ai-customization-skill" },
  { id: "instructions", label: "Instructions", icon: "ai-customization-instructions" },
  { id: "agents", label: "Agents", icon: "ai-customization-agent" },
  { id: "hooks", label: "Hooks", icon: "ai-customization-hook" },
  { id: "tools", label: "Tools", icon: "ai-customization-tools" },
  { id: "extensions", label: "Extensions", icon: "extensions-view-icon" },
];

class CustomizationShortcuts extends ds.Element {
  static hostClass = "agent-sessions-customizations-section";
  static props = ["active", "counts", "height"];

  render() {
    const h = ds.h;
    const counts = this.attr("counts", "2,5,32,2,3,1,36").split(",").map((c) => c.trim());
    const active = this.attr("active", "");
    this.style.height = `${this.attr("height", "300")}px`;
    const links = CUSTOMIZATION_SHORTCUTS.map((s, i) => {
      const count = i >= 1 && i <= 7 ? counts[i - 1] : "";
      return h("li.action-item.customization-link-widget.sidebar-action", { role: "presentation" },
        h("div.customization-link-button-container", null,
          h("a.monaco-button.secondary.customization-link-button.sidebar-action-button.monaco-text-button", {
            tabindex: "0", role: "button", "aria-disabled": "false", "data-section": s.id, "aria-current": s.id === active ? "true" : undefined,
            style: s.id === active ? "background-color: var(--vscode-list-inactiveSelectionBackground);" : "background-color: transparent;",
            onclick: () => this.dispatchEvent(new CustomEvent("open-customizations", { bubbles: true, detail: { section: s.id === "overview" ? "browse" : s.id } })) },
            h("span.codicon.codicon-" + s.icon),
            h("span", null, s.label),
            count ? h("span.customization-link-counts", null, h("span.source-count-badge", null, h("span.source-count-num", null, count)))
              : h("span.customization-link-counts.hidden"))));
    });
    return h("div.ai-customization-shortcuts-widget", null,
      h("div.ai-customization-toolbar", { style: "padding: 6px 0px;" },
        h("div.ai-customization-header", { role: "button", tabindex: "0", "aria-expanded": "true" },
          h("span.ai-customization-header-label", null, "Customizations"),
          h("span.ai-customization-header-total-count.hidden", null, String(counts.reduce((a, c) => a + (Number(c) || 0), 0))),
          h("span.ai-customization-suggestion-badge.hidden", { role: "img" }),
          h("span.ai-customization-chevron.codicon.codicon-chevron-down", { "aria-hidden": "true" })),
        h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden;" },
          h("div.ai-customization-toolbar-content-scrollable", { style: "overflow: hidden;" },
            h("div.ai-customization-toolbar-content.sidebar-action-list", null,
              h("div.monaco-toolbar", null, h("div.monaco-action-bar", null, h("ul.actions-container", { role: "toolbar" }, links))))),
          h("div.invisible.scrollbar.horizontal", { role: "presentation", "aria-hidden": "true", style: "position: absolute; width: 270px; height: 0px; left: 0px; bottom: 0px;" },
            h("div.slider", { style: "position: absolute; top: 0px; left: 0px; height: 10px; transform: translate3d(0px, 0px, 0px); contain: strict; width: 270px;" })),
          h("div.invisible.scrollbar.vertical", { role: "presentation", "aria-hidden": "true", style: "position: absolute; width: 10px; height: 254px; right: 0px; top: 0px;" },
            h("div.slider", { style: "position: absolute; top: 0px; left: 0px; width: 10px; transform: translate3d(0px, 0px, 0px); contain: strict; height: 254px;" })))));
  }
}

ds.define("vsc-customization-shortcuts", CustomizationShortcuts);
