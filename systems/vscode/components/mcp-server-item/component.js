class McpServerItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "source", "description", "icon-src", "builtin", "enabled", "no-toggle", "action", "error"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const source = this.attr("source", "");
    const description = this.attr("description", "");
    const src = this.attr("icon-src", "");
    const enabled = this.hasAttribute("enabled");
    const action = this.attr("action", "");
    const secondary = "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);";
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", source ? `${name}, configured in ${source}` : `${name}. ${description}.`);
    this.setAttribute("aria-level", "2");
    this.setAttribute("draggable", "false");
    this.style.cssText = "position: relative; top: 0px; height: 44px;";
    const pathEl = source ? ds.customizationPathLabel("a.mcp-server-source-path", source)
      : h("a.mcp-server-source-path.middle-ellipsis-path-label.single-segment", { style: "display: none;" });
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents.mcp-server-item", { class: [this.flag("builtin") ? "builtin" : "", description ? "has-detail" : ""].join(" ").trim() || undefined, style: "min-height: 44px;" },
        h("div.mcp-server-icon" + (src ? ".has-custom-icon" : ".is-fallback"), null,
          h("div.codicon.codicon-ai-customization-mcp-server", src ? { "aria-hidden": "true", hidden: "", style: "display: none;" } : { "aria-hidden": "true" }),
          src ? h("img", { alt: "", loading: "lazy", referrerpolicy: "no-referrer", src }) : null),
        h("div.mcp-server-details", null,
          h("div.mcp-server-name-row", null, h("div.mcp-server-name", null, name)),
          h("div.mcp-server-secondary-line" + (source ? ".has-source" : ""), null,
            h("div.mcp-server-compatibility-message", { style: "display: none;" }),
            pathEl),
          h("div.mcp-server-description", { style: description ? "" : "display: none;" }, description),
          h("div.mcp-server-issue", { style: "display: none;" })),
        h("div.mcp-server-actions", null,
          action === "start" ? h("a.monaco-button.secondary.small.monaco-text-button.mcp-server-start", { tabindex: "0", role: "button", "aria-label": `Start ${name}`, "aria-disabled": "false", style: secondary }, "Start") : null,
          action === "sign-in" ? h("a.monaco-button.secondary.small.monaco-text-button.mcp-server-sign-in", { tabindex: "0", role: "button", "aria-label": `Sign in to ${name}`, "aria-disabled": "false", style: secondary }, h("span", null, "Sign In")) : null,
          this.flag("error") ? h("div.mcp-server-error-actions", null, h("div.mcp-server-status.mcp-server-state-icon.error.codicon.codicon-error", { "aria-hidden": "true" })) : null,
          h("div.mcp-server-disabled-label", { style: "display: none;" }),
          this.flag("no-toggle") ? null : h("span.customization-toggle", null,
            h("button.monaco-switch" + (enabled ? ".checked" : ""), { type: "button", role: "switch", "aria-label": `${enabled ? "Disable" : "Enable"} ${name}`, "aria-checked": String(enabled),
              onclick: () => { this.toggleAttribute("enabled"); this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { name, enabled: !enabled } })); } },
              h("div.monaco-switch-thumb"))),
          h("a.monaco-button.secondary.plugin-card-icon-button.codicon.codicon-ellipsis", { tabindex: "0", role: "button", "aria-label": `More actions for ${name}`, "aria-disabled": "false" }))));
  }
}

ds.define("vsc-mcp-server-item", McpServerItem);
