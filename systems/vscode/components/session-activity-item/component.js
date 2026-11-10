/* An entry of the Session Activity Bar (src/vs/sessions/browser/parts/sessionActivityBar.ts): MenuActivityBar's
   `li.action-item.menu-entry` with an icon-only action label and its activity badge, or the group separator. */
class SessionActivityItem extends ds.Element {
  static hostClass = "action-item";
  static props = ["icon", "label", "checked", "badge", "separator"];
  render() {
    const h = ds.h;
    this.setAttribute("role", "presentation");
    if (this.flag("separator")) {
      this.setClasses({ disabled: true, "menu-entry": false });
      this.removeAttribute("custom-hover");
      return h("a.action-label.separator.disabled", { role: "presentation", "aria-label": "", "aria-disabled": "true", tabindex: "-1" });
    }
    this.setClasses({ disabled: false, "menu-entry": true });
    this.setAttribute("custom-hover", "true");
    const checked = this.flag("checked");
    // Roving tabindex: the toolbar's first entry is the tab stop.
    const first = !this.previousElementSibling;
    const badge = this.getAttribute("badge");
    const count = badge && /^\d+$/.test(badge) ? badge : "";
    return [
      h("a.action-label" + (checked ? ".checked" : "") + ".codicon.codicon-" + this.attr("icon", "circle"), {
        role: "button", "aria-label": this.attr("label", ""), "aria-pressed": String(checked), tabindex: first ? "0" : "-1",
      }),
      h("div.menu-activity-bar-badge" + (badge !== null ? ".visible" : "") + (count ? ".count" : ""), { "aria-hidden": "true" }, count),
    ];
  }
}
ds.define("vsc-session-activity-item", SessionActivityItem);
