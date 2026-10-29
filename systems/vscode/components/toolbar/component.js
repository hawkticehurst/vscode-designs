class Toolbar extends ds.Element {
  static hostClass = "monaco-toolbar";
  static props = ["vertical", "label", "highlight-toggled"];
  render() {
    return ds.h("div.monaco-action-bar" + (this.flag("vertical") ? ".vertical" : ""), null,
      ds.h("ul.actions-container" + (this.flag("highlight-toggled") ? ".highlight-toggled" : ""), { role: "toolbar", "aria-label": this.attr("label") }, this.slotted("")));
  }
}
ds.define("vsc-toolbar", Toolbar);
