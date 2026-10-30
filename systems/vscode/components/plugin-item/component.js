class PluginItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "badge", "location", "metadata", "enabled"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const location = this.attr("location", "");
    const metadata = this.attr("metadata", "");
    const badge = this.attr("badge", "Local");
    const enabled = this.hasAttribute("enabled");
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", `${name}. ${location}`);
    this.setAttribute("aria-level", "2");
    this.setAttribute("draggable", "false");
    this.style.cssText = "position: relative; top: 0px; height: 58px;";
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents.plugin-list-item.plugin-installed-item", null,
        h("div.item-sync-toggle", { style: "display: none;" }),
        h("div.plugin-list-item-details", null,
          h("div.plugin-list-item-name-row", null,
            h("div.plugin-list-item-name", null, name),
            badge ? h("div.inline-badge.plugin-source-badge", { title: "Installed from a local source" }, badge) : null),
          ds.customizationPathLabel("div.plugin-list-item-location", location),
          h("div.plugin-list-item-metadata", metadata ? null : { style: "display: none;" }, metadata)),
        h("div.plugin-list-item-action", null,
          h("span.customization-toggle", null,
            h("button.monaco-switch" + (enabled ? ".checked" : ""), { type: "button", role: "switch", "aria-label": `${enabled ? "Exclude" : "Include"} ${name} ${enabled ? "from" : "in"} Profile`, "aria-checked": String(enabled),
              onclick: () => { this.toggleAttribute("enabled"); this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { name, enabled: !enabled } })); } },
              h("div.monaco-switch-thumb"))),
          h("a.monaco-button.secondary.plugin-card-icon-button.codicon.codicon-ellipsis", { tabindex: "0", role: "button", "aria-label": `More actions for ${name}`, "aria-disabled": "false" }))));
  }
}

ds.define("vsc-plugin-item", PluginItem);
