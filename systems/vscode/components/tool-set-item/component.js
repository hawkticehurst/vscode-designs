/* ToolsListWidget rows (src/vs/workbench/contrib/chat/browser/aiCustomization/toolsListWidget.ts). */
class ToolSetItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "description", "count", "enabled", "locked", "more", "connected", "action"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const description = this.attr("description", "");
    const enabled = this.hasAttribute("enabled");
    const connected = this.flag("connected");
    const height = connected || !description ? 34 : 48;
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", name);
    this.setAttribute("aria-level", "2");
    this.setAttribute("draggable", "false");
    this.style.cssText = `position: relative; top: 0px; height: ${height}px; line-height: ${height}px;`;
    const toggle = () => { this.toggleAttribute("enabled"); this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { name, enabled: !enabled } })); };
    const sw = this.flag("locked")
      ? h("span.customization-toggle", { style: "visibility: hidden;" }, h("button.monaco-switch", { type: "button", role: "switch", "aria-label": "", "aria-checked": "false", tabindex: "-1" }, h("div.monaco-switch-thumb")))
      : h("span.customization-toggle", null, h("button.monaco-switch" + (enabled ? ".checked" : ""), { type: "button", role: "switch", "aria-label": `Enable ${name}`, "aria-checked": String(enabled), tabindex: "-1", onclick: toggle }, h("div.monaco-switch-thumb")));
    const text = h("div.tools-list-row-text", null,
      h("span.tools-list-row-label", null, h("span.monaco-highlighted-label", null, name)),
      h("span.tools-list-row-subtext", description ? null : { style: "display: none;" }, description));
    let contents;
    if (connected) {
      contents = h("div.monaco-tl-contents.tools-list-connected-row.tools-list-setrow.readonly", { "aria-checked": String(enabled), style: "--tools-connected-depth: 0;" },
        sw, text,
        h("div.tools-list-connected-actions", null,
          this.attr("action") === "start" ? h("a.monaco-button.secondary.small.monaco-text-button.mcp-server-start", { tabindex: "-1", role: "button", "aria-label": `Start ${name}`, "aria-disabled": "false",
            style: "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);" }, "Start") : null),
        h("a.tools-list-chevron.codicon", { "aria-hidden": "true", style: "visibility: hidden;" }));
    } else {
      const count = this.attr("count", "");
      const [on, total] = count.split("/");
      contents = h("div.monaco-tl-contents.tools-list-setrow", this.flag("locked") ? { "aria-expanded": "false" } : { "aria-checked": String(enabled), "aria-expanded": "false" },
        sw,
        h("div.tools-list-row-main", null, text),
        h("span.tools-list-always-available", { style: "display: none;" }, "Always Available"),
        h("span.tools-list-row-count", { "aria-label": `${on} of ${total} tools enabled` }, count),
        this.flag("more")
          ? h("button.tools-list-more-action.codicon.codicon-ellipsis", { type: "button", tabindex: "-1", style: "", "aria-label": `More actions for ${name}`, title: `More actions for ${name}` })
          : h("button.tools-list-more-action.codicon.codicon-ellipsis", { type: "button", tabindex: "-1", style: "display: none;" }),
        h("a.tools-list-chevron.codicon.codicon-chevron-right-compact", { "aria-hidden": "true" }));
    }
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      contents);
  }
}

ds.define("vsc-tool-set-item", ToolSetItem);
