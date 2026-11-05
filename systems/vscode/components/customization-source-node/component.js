const SOURCE_NODE_ICONS = { plugin: "ai-customization-plugin", extension: "extensions", organization: "organization" };
const SOURCE_NODE_KINDS = { plugin: "Plugin", extension: "Extension", organization: "Organization" };

class CustomizationSourceNode extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["label", "kind", "count", "collapsed", "open-label"];

  render() {
    const h = ds.h;
    const label = this.attr("label", "");
    const kind = this.attr("kind", "plugin");
    const collapsed = this.hasAttribute("collapsed");
    const openLabel = this.attr("open-label", "");
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-level", "2");
    this.setAttribute("aria-expanded", String(!collapsed));
    this.setAttribute("aria-label", `${label}, ${SOURCE_NODE_KINDS[kind] || ""}, ${this.attr("count", "0")} items`);
    this.setAttribute("draggable", "false");
    this.style.cssText = "position: relative; top: 0px; height: 32px; line-height: 32px;";
    const open = h("a.customization-source-node-open.codicon.codicon-link-external", { role: "button", tabindex: "-1", "aria-label": openLabel, title: openLabel, style: openLabel ? "" : "display: none;",
      onmousedown: (e) => e.stopPropagation(),
      onclick: (e) => { e.preventDefault(); e.stopPropagation(); this.dispatchEvent(new CustomEvent("open-source", { bubbles: true, detail: { label, kind } })); } });
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie.codicon.codicon-tree-item-expanded.collapsible" + (collapsed ? ".collapsed" : ""), { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents", null,
        h("div.customization-source-node", null,
          h("div.customization-source-node-icon.codicon.codicon-" + (SOURCE_NODE_ICONS[kind] || SOURCE_NODE_ICONS.plugin)),
          h("div.customization-source-node-label", null, label),
          h("div.customization-source-node-kind", null, SOURCE_NODE_KINDS[kind] || ""),
          open)));
  }
}

ds.define("vsc-customization-source-node", CustomizationSourceNode);
