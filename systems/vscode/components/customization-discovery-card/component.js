class CustomizationDiscoveryCard extends ds.Element {
  static hostClass = "customization-discovery-card";
  static props = ["name", "meta", "description", "icon-src", "fallback-icon", "action"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const src = this.attr("icon-src", "");
    const action = this.attr("action", "Install");
    return [
      h("button.customization-card-primary-action.customization-discovery-card-primary", { type: "button", "aria-label": `View details for ${name}` }),
      h("div.customization-discovery-card-icon" + (src ? ".has-custom-icon" : ".is-fallback"), null,
        h("div.codicon.codicon-" + this.attr("fallback-icon", "extensions"), src ? { "aria-hidden": "true", hidden: "", style: "display: none;" } : { "aria-hidden": "true" }),
        src ? h("img", { alt: "", loading: "lazy", referrerpolicy: "no-referrer", src }) : null),
      h("div.customization-discovery-card-body", null,
        h("div.customization-discovery-card-heading", null,
          h("div.customization-discovery-card-name", null, name),
          h("div.customization-discovery-card-metadata", null, this.attr("meta", ""))),
        h("div.customization-discovery-card-description", null, this.attr("description", ""))),
      h("div.customization-discovery-card-actions", null,
        h("a.monaco-button.secondary.small.monaco-text-button", { tabindex: "0", role: "button", "aria-disabled": "false", "aria-label": `${action} ${name}`, "aria-busy": "false",
          style: "color: var(--vscode-button-secondaryForeground); background-color: var(--vscode-button-secondaryBackground); border: 1px solid var(--vscode-button-secondaryBorder);",
          onclick: (e) => { e.stopPropagation(); this.dispatchEvent(new CustomEvent("install", { bubbles: true, detail: { name } })); } }, action)),
    ];
  }
}

ds.define("vsc-customization-discovery-card", CustomizationDiscoveryCard);
