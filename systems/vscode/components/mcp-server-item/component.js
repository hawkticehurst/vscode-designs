class McpServerItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "source", "description", "icon-src", "builtin", "enabled", "no-toggle", "action", "error", "state", "disabled-label", "compatibility"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const source = this.attr("source", "");
    const description = this.attr("description", "");
    const src = this.attr("icon-src", "");
    const enabled = this.hasAttribute("enabled");
    // State (microsoft/vscode#337402, getMcpStatusPresentation): `action` and `error` are the older spellings.
    const state = this.attr("state", "") || (this.flag("error") ? "error" : this.attr("action") === "start" ? "stopped" : this.attr("action") === "sign-in" ? "auth-required" : "");
    const compatibility = this.attr("compatibility", "");
    const disabledLabel = enabled ? "" : this.attr("disabled-label", "");
    const secondary = "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);";
    const fire = (type) => (e) => { e.preventDefault(); e.stopPropagation(); this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail: { name } })); };
    const compatLabel = compatibility === "unsupported" ? "Unsupported" : "Partially supported";
    const issue = state === "error" ? "Error" : compatibility ? compatLabel : "";
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", [name, description, issue, disabledLabel].filter(Boolean).join(". ") + ".");
    this.setAttribute("aria-level", "2");
    this.setAttribute("draggable", "false");
    this.style.cssText = "position: relative; top: 0px; height: 44px;";
    const pathEl = source ? ds.customizationPathLabel("a.mcp-server-source-path", source)
      : h("a.mcp-server-source-path.middle-ellipsis-path-label.single-segment", { style: "display: none;" });
    const compatEl = compatibility
      ? h("div.mcp-server-compatibility-message." + compatibility, null,
        h("span.mcp-server-compatibility-icon.codicon.codicon-" + (compatibility === "unsupported" ? "error" : "warning"), { "aria-hidden": "true" }),
        `${compatLabel}. See `, h("a.mcp-server-compatibility-link", { href: "#", onclick: fire("open-migrations") }, "Migrations"), " for details.")
      : h("div.mcp-server-compatibility-message", { style: "display: none;" });
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents.mcp-server-item", { class: [this.flag("builtin") ? "builtin" : "", description ? "has-detail" : ""].join(" ").trim() || undefined, style: "min-height: 44px;" },
        h("div.mcp-server-icon" + (src ? ".has-custom-icon" : ".is-fallback"), null,
          h("div.codicon.codicon-ai-customization-mcp-server", src ? { "aria-hidden": "true", hidden: "", style: "display: none;" } : { "aria-hidden": "true" }),
          src ? h("img", { alt: "", loading: "lazy", referrerpolicy: "no-referrer", src }) : null),
        h("div.mcp-server-details", null,
          h("div.mcp-server-name-row", null, h("div.mcp-server-name", null, name)),
          h("div.mcp-server-secondary-line" + (source ? ".has-source" : ""), compatibility || source ? null : { style: "display: none;" }, compatEl, pathEl),
          h("div.mcp-server-description", { style: description ? "" : "display: none;" }, description),
          h("div.mcp-server-issue", { style: "display: none;" })),
        h("div.mcp-server-actions", null,
          state === "stopped" ? h("a.monaco-button.secondary.small.monaco-text-button.mcp-server-start", { tabindex: "0", role: "button", title: `Start ${name}`, "aria-label": `Start ${name}`, "aria-disabled": "false", style: secondary, onclick: fire("start") }, "Start") : null,
          state === "auth-required" ? h("a.monaco-button.secondary.small.monaco-text-button.mcp-server-sign-in", { tabindex: "0", role: "button", "aria-label": `Sign in to ${name}`, "aria-disabled": "false", style: secondary, onclick: fire("sign-in") }, h("span", null, "Sign In")) : null,
          state === "starting" ? h("div.mcp-server-status.mcp-server-state-icon.starting.codicon.codicon-loading.codicon-modifier-spin", { "aria-hidden": "true", title: "Starting" }) : null,
          state === "error" ? h("div.mcp-server-error-actions", null,
            h("div.mcp-server-status.mcp-server-state-icon.error.codicon.codicon-error", { "aria-hidden": "true", title: "Error" }),
            h("a.monaco-button.secondary.small.monaco-text-button.mcp-server-show-output", { tabindex: "0", role: "button", title: `Show output for ${name}`, "aria-label": `Show output for ${name}`, "aria-disabled": "false", style: secondary, onclick: fire("show-output") }, "Show Output")) : null,
          h("div.mcp-server-disabled-label", { style: disabledLabel ? "" : "display: none;" }, disabledLabel),
          this.flag("no-toggle") ? null : h("span.customization-toggle", null,
            h("button.monaco-switch" + (enabled ? ".checked" : ""), { type: "button", role: "switch", "aria-label": `${enabled ? "Disable" : "Enable"} ${name}`, "aria-checked": String(enabled),
              onclick: () => { this.toggleAttribute("enabled"); this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { name, enabled: !enabled } })); } },
              h("div.monaco-switch-thumb"))),
          h("a.monaco-button.secondary.plugin-card-icon-button.codicon.codicon-ellipsis", { tabindex: "0", role: "button", "aria-label": `More actions for ${name}`, "aria-disabled": "false" }))));
  }
}

ds.define("vsc-mcp-server-item", McpServerItem);
