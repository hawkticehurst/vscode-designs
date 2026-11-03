/* ExtensionRowRenderer (src/vs/sessions/contrib/extensions/browser/agentsWindowExtensionsWidget.ts), 52px rows. */
class AgentsExtensionItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "publisher", "description", "icon-src", "enabled", "warning", "contributions"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const publisher = this.attr("publisher", "");
    const src = this.attr("icon-src", "");
    const enabled = this.hasAttribute("enabled");
    const warning = this.attr("warning", "");
    const contributions = this.attr("contributions", "").split(",").map((c) => c.trim()).filter(Boolean);
    const state = enabled ? "Enabled" : "Disabled";
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", `${name}, ${publisher}, ${state}` + (warning ? `. Warning: Contributes ${warning}, which are not supported in the Agents window.` : "") + (contributions.length ? `. Contributes ${contributions.join(", ")}` : ""));
    this.setAttribute("aria-level", "2");
    this.setAttribute("draggable", "false");
    this.style.cssText = "position: relative; top: 0px; height: 52px; line-height: 52px;";
    const secondary = "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);";
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents.agents-window-extension-row" + (enabled ? "" : ".disabled"), null,
        h("div.agents-window-extension-icon", null,
          h("div.extension-icon", null,
            src ? h("img.icon", { alt: "", src, style: "display: inherit; visibility: inherit;" }) : null,
            h("div.codicon.codicon-extension-default-icon", { style: src ? "display: none;" : "" }))),
        h("div.agents-window-extension-details", null,
          h("div.agents-window-extension-name-row", null,
            h("span.agents-window-extension-name", null, h("span.monaco-highlighted-label", null, name)),
            h("span.agents-window-extension-publisher", null, publisher),
            h("span.agents-window-extension-warning.codicon.codicon-warning-compact", { "aria-hidden": "true", style: warning ? "" : "display: none;", title: warning ? `Contributes ${warning}, which are not supported in the Agents window.` : undefined }),
            h("span.agents-window-extension-contributions", { "aria-hidden": "true", style: contributions.length ? undefined : "display: none;" },
              contributions.map((c) => h("span.inline-badge", null, c)))),
          h("span.agents-window-extension-description", null, this.attr("description", ""))),
        h("a.monaco-button.secondary.small.agents-window-extension-runtime-action", { tabindex: "-1", role: "button", "aria-disabled": "false", style: secondary + " display: none;" }),
        h("span.customization-toggle", null,
          h("button.monaco-switch" + (enabled ? ".checked" : ""), { type: "button", role: "switch", "aria-label": `Run ${name} in the Agents window`, "aria-checked": String(enabled), tabindex: "-1",
            onclick: () => { this.toggleAttribute("enabled"); this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { name, enabled: !enabled } })); } },
            h("div.monaco-switch-thumb")))));
  }
}

ds.define("vsc-agents-extension-item", AgentsExtensionItem);
