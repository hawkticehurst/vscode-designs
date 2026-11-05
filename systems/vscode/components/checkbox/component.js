class Checkbox extends ds.Element {
  static hostClass = "monaco-custom-toggle codicon codicon-check";
  static props = ["checked", "disabled", "label", "variant"];
  constructor() {
    super();
    this.addEventListener("click", () => { if (!this.flag("disabled")) this.toggleAttribute("checked"); });
    this.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !this.flag("disabled")) { e.preventDefault(); this.click(); } });
  }
  render() {
    const checked = this.flag("checked"), disabled = this.flag("disabled");
    const settings = this.attr("variant", "") === "settings";
    this.setClasses({ checked, disabled, "setting-value-checkbox": settings, "monaco-checkbox": !settings });
    this.setAttribute("role", "checkbox");
    this.setAttribute("tabindex", settings ? "-1" : "0");
    this.setAttribute("aria-checked", String(checked));
    this.setAttribute("aria-disabled", String(disabled));
    if (this.hasAttribute("label")) this.setAttribute("aria-label", this.attr("label"));
    if (settings) {
      this.style.color = "inherit";
    } else {
      // Like Checkbox in src/vs/base/browser/ui/toggle/toggle.ts: the check icon only when checked (setIcon(undefined)
      // otherwise), and colors from the checkbox.* theme colors (applyStyles), disabled ones when disabled.
      this.setClasses({ "codicon codicon-check": checked });
      this.style.color = `var(--vscode-checkbox-${disabled ? "disabled-" : ""}foreground)`;
      this.style.backgroundColor = `var(--vscode-checkbox-${disabled ? "disabled-" : ""}background)`;
      this.style.borderColor = `var(--vscode-checkbox-${disabled ? "disabled-background" : "border"})`;
      this.style.fontSize = "16px";
    }
    return [];
  }
}
ds.define("vsc-checkbox", Checkbox);
