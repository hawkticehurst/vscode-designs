/* The Session Activity Bar (src/vs/sessions/browser/parts/sessionActivityBar.ts) docked in its own grid column at the
   right edge of the Agents window. The column's width comes from the workbench grid (30px strip + 4px gap). */
class SessionActivityBar extends ds.Element {
  static hostClass = "session-activity-bar-column session-activity-bar-host";
  static props = ["label"];
  render() {
    const h = ds.h;
    if (!this.style.width) this.style.width = "34px";
    if (!this.style.flex) this.style.flex = "none";
    return h("div.menu-activity-bar.size-compact.session-activity-bar.docked", { style: "top: 0px;" },
      h("div.session-activity-bar-drag-handle", { "aria-hidden": "true" }, h("span.session-activity-bar-drag-handle-icon.codicon.codicon-gripper")),
      h("div.monaco-toolbar", null, h("div.monaco-action-bar.vertical", null,
        h("ul.actions-container", { role: "toolbar", "aria-label": this.attr("label", "Session Activity Bar") }, this.slotted("")))));
  }
}
ds.define("vsc-session-activity-bar", SessionActivityBar);
