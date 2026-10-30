function customizationPathLabel(cls, path) {
  const h = ds.h;
  const i = path.lastIndexOf("/");
  const prefix = i > 0 ? path.slice(0, i) : "";
  const suffix = i > 0 ? path.slice(i) : path;
  return h(cls + ".middle-ellipsis-path-label", null,
    h("span.middle-ellipsis-path-prefix", null, h("span.monaco-highlighted-label", null, prefix)),
    h("span.middle-ellipsis-path-suffix", null, h("span.monaco-highlighted-label", null, suffix)));
}
ds.customizationPathLabel = customizationPathLabel;

class CustomizationItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "path", "icon", "badge"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const path = this.attr("path", "");
    const badge = this.attr("badge", "");
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", `${name}. ${path}`);
    this.setAttribute("aria-level", "2");
    this.setAttribute("draggable", "false");
    this.style.cssText = "position: relative; top: 0px; height: 44px; line-height: 44px;";
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents.ai-customization-list-item", null,
        h("div.item-left", null,
          h("div.item-type-icon.is-fallback", null, h("div.codicon.codicon-" + this.attr("icon", "ai-customization-skill"), { "aria-hidden": "true" })),
          h("div.item-text", null,
            h("div.item-name-row", null,
              h("div.item-name", null, h("span.monaco-highlighted-label", null, name)),
              h("div.inline-badge.item-badge", badge ? null : { style: "display: none;" }, badge),
              h("div.item-status-icon", { style: "display: none;" })),
            h("div.item-description", null,
              h("span.monaco-highlighted-label", { style: "display: none;" }),
              customizationPathLabel("div.item-path", path)))),
        h("div.item-right", null, h("div.monaco-action-bar", null, h("ul.actions-container", { role: "toolbar" },
          h("li.action-item", { role: "presentation" }, h("a.action-label.codicon.codicon-ellipsis", { role: "button", "aria-label": `More actions for ${name}`, tabindex: "0" })))))));
  }
}

ds.define("vsc-customization-item", CustomizationItem);
