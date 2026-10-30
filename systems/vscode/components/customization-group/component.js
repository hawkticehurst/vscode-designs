class CustomizationGroup extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["label", "count", "icon", "first", "collapsed", "actions", "add-label", "kind"];

  render() {
    const h = ds.h;
    const kind = this.attr("kind", this.closest("vsc-customization-list")?.getAttribute("kind") || "prompts");
    const label = this.attr("label", "");
    const count = this.attr("count", "0");
    const first = this.flag("first");
    const collapsed = this.hasAttribute("collapsed");
    const height = first ? 36 : 40;
    Object.assign(this, {});
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", `${label}, ${count} items`);
    this.setAttribute("aria-level", "1");
    this.setAttribute("aria-expanded", String(!collapsed));
    this.setAttribute("draggable", "false");
    this.style.cssText = `position: relative; top: 0px; height: ${height}px;` + (kind === "prompts" ? ` line-height: ${height}px;` : "");
    const defaultIcon = kind === "prompts" ? "ai-customization-user" : ({ Workspace: "folder", Plugins: "plug" }[label] || "account");
    const actions = this.attr("actions", kind === "prompts" ? "add" : "").split(",").map((a) => a.trim()).filter(Boolean);
    const addClass = kind === "prompts" ? "customization-create-action" : "plugin-installed-action";
    const actionEls = actions.map((a) => a === "refresh"
      ? h("a.monaco-button.secondary.plugin-card-icon-button.plugin-card-ghost-button.plugin-update-button.codicon.codicon-refresh", { tabindex: "0", role: "button", "aria-label": "Check for and Apply Updates", "aria-disabled": "false" })
      : h("a.monaco-button.secondary.plugin-card-ghost-button.plugin-card-icon-button.codicon.codicon-add", { class: addClass, tabindex: "0", role: "button", "aria-label": this.attr("add-label", "New"), "aria-disabled": "false" }));
    const labelGroup = kind === "prompts"
      ? [h("div.group-label-group", null, h("div.group-label", null, label)), h("div.group-count", null, count)]
      : [h("div.group-label-group", null, h("div.group-title-row", null, h("div.group-label", null, label), h("div.group-count", null, count)), h("div.group-description", { style: "display: none;" }))];
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 0px;" }),
      h("div.monaco-tl-twistie.codicon.codicon-tree-item-expanded.collapsible" + (collapsed ? ".collapsed" : ""), { style: "padding-left: 8px;" }),
      h("div.monaco-tl-contents.ai-customization-group-header" + (first ? "" : ".has-previous-group"), null,
        h("div.group-chevron.codicon.codicon-chevron-down-compact"),
        h("div.group-icon.codicon.codicon-" + this.attr("icon", defaultIcon)),
        labelGroup,
        h("div.group-info.codicon.codicon-info", { style: "display: none;" }),
        h("div.group-actions", null, actionEls.length ? h("div.plugin-card-section-actions", null, actionEls) : null)));
  }
}

ds.define("vsc-customization-group", CustomizationGroup);
