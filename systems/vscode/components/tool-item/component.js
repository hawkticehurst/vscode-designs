/* ToolsToolRowRenderer (src/vs/workbench/contrib/chat/browser/aiCustomization/toolsListWidget.ts): one tool in an expanded set. */
class ToolItem extends ds.Element {
  static hostClass = "monaco-list-row";
  static props = ["name", "description", "enabled", "readonly"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "");
    const description = this.attr("description", "");
    const enabled = this.hasAttribute("enabled");
    const readonly = this.flag("readonly");
    const height = 12 + 18 + (description ? 16 : 0);
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-selected", "false");
    this.setAttribute("aria-label", name);
    this.setAttribute("aria-level", "3");
    this.setAttribute("draggable", "false");
    this.style.cssText = `position: relative; top: 0px; height: ${height}px; line-height: ${height}px;`;
    const toggle = (e) => {
      e?.stopPropagation();
      this.toggleAttribute("enabled");
      this.dispatchEvent(new CustomEvent("toggle", { bubbles: true, detail: { name, enabled: !enabled, tool: true } }));
    };
    return h("div.monaco-tl-row", null,
      h("div.monaco-tl-indent", { style: "width: 8px;" }),
      h("div.monaco-tl-twistie", { style: "padding-left: 16px;" }),
      h("div.monaco-tl-contents.tools-list-toolrow" + (readonly ? ".readonly" : ""), { "aria-checked": readonly ? undefined : String(enabled), onclick: readonly ? undefined : (e) => { if (!e.target.closest(".customization-toggle")) toggle(e); } },
        h("span.customization-toggle", readonly ? { style: "display: none;" } : null,
          h("button.monaco-switch" + (enabled ? ".checked" : ""), { type: "button", role: "switch", "aria-label": `Enable ${name}`, "aria-checked": String(enabled), tabindex: "-1", onclick: toggle }, h("div.monaco-switch-thumb"))),
        h("div.tools-list-row-text", null,
          h("span.tools-list-row-label", null, h("span.monaco-highlighted-label", null, name)),
          h("span.tools-list-row-subtext", description ? null : { style: "display: none;" }, description)),
        h("span.tools-list-always-available", readonly ? null : { style: "display: none;" }, "Always Available")));
  }
}

ds.define("vsc-tool-item", ToolItem);
