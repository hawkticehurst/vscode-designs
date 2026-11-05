class CustomizationDiscoveryResult extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "meta", "description", "icon-src", "fallback-icon", "action", "status"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const src = this.attr("icon-src", "");
    const action = this.attr("action", "Install");
    const status = this.attr("status", "");
    this.setAttribute("role", "option");
    this.setAttribute("aria-label", [name, this.attr("meta", ""), this.attr("description", "")].filter(Boolean).join(". "));
    return h("div.customization-discovery-result-content", null,
      h("button.customization-discovery-result-primary", { type: "button", "aria-label": `View details for ${name}` }),
      h("div.customization-discovery-result-icon" + (src ? ".has-custom-icon" : ".is-fallback"), null,
        h("div.codicon.codicon-" + this.attr("fallback-icon", "lightbulb"), src ? { "aria-hidden": "true", hidden: "", style: "display: none;" } : { "aria-hidden": "true" }),
        src ? h("img", { alt: "", loading: "lazy", referrerpolicy: "no-referrer", src }) : null),
      h("div.customization-discovery-result-identity", null,
        h("div.customization-discovery-result-heading", null,
          h("div.customization-discovery-result-name", null, name),
          h("div.customization-discovery-result-detail", null, this.attr("meta", ""))),
        h("div.customization-discovery-result-description", null, this.attr("description", ""))),
      h("div.customization-discovery-result-aside", null,
        h("div.customization-discovery-result-status", status ? null : { style: "display: none;" }, status),
        h("div.customization-discovery-result-actions", null,
          h("a.monaco-button.secondary.small.monaco-text-button", { tabindex: "0", role: "button", "aria-disabled": "false", "aria-label": `${action} ${name}`, "aria-busy": "false",
            style: "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);",
            onclick: (event) => { event.stopPropagation(); this.dispatchEvent(new CustomEvent("install", { bubbles: true, detail: { name } })); } }, action))));
  }
}

ds.define("vsc-customization-discovery-result", CustomizationDiscoveryResult);
