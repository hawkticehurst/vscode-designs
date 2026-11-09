class PluginDetails extends ds.Element {
  static props = ["name", "version", "location", "skills", "readme", "enabled", "update-available", "auto-update", "uninstalled"];

  render() {
    const h = ds.h;
    const name = this.attr("name", "Plugin");
    const version = this.attr("version", "");
    const location = this.attr("location", "");
    const readme = this.attr("readme", "No README was provided for this plugin.");
    const skills = this.attr("skills", "").split(",").map(item => item.trim()).filter(Boolean);
    const enabled = this.hasAttribute("enabled");
    const uninstalled = this.hasAttribute("uninstalled");
    const autoUpdate = this.hasAttribute("auto-update");
    const emit = (type, detail = {}) => this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));

    const switchButton = h("button.plugin-detail-switch" + (autoUpdate ? ".checked" : ""), {
      type: "button",
      role: "switch",
      "aria-label": "Auto update",
      "aria-checked": String(autoUpdate),
      onclick: (event) => {
        const checked = event.currentTarget.getAttribute("aria-checked") !== "true";
        event.currentTarget.setAttribute("aria-checked", String(checked));
        event.currentTarget.classList.toggle("checked", checked);
        this.toggleAttribute("auto-update", checked);
        emit("auto-update-change", { checked });
      }
    }, h("span.plugin-detail-switch-thumb"));

    const installedActions = h("div.plugin-detail-actions", null,
      h("div.plugin-detail-split", null,
        h("button.plugin-detail-button.secondary", { type: "button", onclick: () => emit("enablement-change", { enabled: !enabled }) }, enabled ? "Disable" : "Enable"),
        h("button.plugin-detail-button.secondary.codicon.codicon-chevron-down", { type: "button", "aria-label": "More enablement options", onclick: () => emit("enablement-menu") })),
      h("div.plugin-detail-split", null,
        h("button.plugin-detail-button.secondary", { type: "button", onclick: () => emit("uninstall") }, "Uninstall"),
        h("button.plugin-detail-button.secondary.codicon.codicon-chevron-down", { type: "button", "aria-label": "More uninstall options", onclick: () => emit("uninstall-menu") })),
      this.hasAttribute("update-available") && !autoUpdate
        ? h("button.plugin-detail-button.primary", { type: "button", onclick: () => emit("update") }, "Update")
        : null);

    return h("div.plugin-detail-page", null,
      h("div.plugin-detail-heading", null,
        h("button.plugin-detail-back.codicon.codicon-arrow-left", { type: "button", "aria-label": "Back to Plugins", onclick: () => emit("back") }),
        h("h1", null, name),
        uninstalled
          ? h("div.plugin-detail-actions", null, h("button.plugin-detail-button.primary", { type: "button", onclick: () => emit("install") }, "Install"))
          : installedActions),
      uninstalled ? null : h("div.plugin-detail-auto-setting", null,
        h("span", null, "Auto Update"),
        switchButton),
      h("section.plugin-detail-section", null,
        h("h2", null, "Details"),
        h("div.plugin-detail-table", null,
          h("div.plugin-detail-row", null, h("span", null, "Version"), h("strong", null, version)),
          location ? h("div.plugin-detail-row", null,
            h("span", null, uninstalled ? "Source" : "Location"),
            h("div.plugin-detail-location", null,
              h("span", { title: location }, location),
              uninstalled ? null : h("button.codicon.codicon-copy", { type: "button", "aria-label": "Copy plugin location", onclick: () => emit("copy-location", { location }) }),
              uninstalled ? null : h("button.codicon.codicon-folder-opened", { type: "button", "aria-label": "Open plugin folder", onclick: () => emit("open-location", { location }) }))) : null)),
      h("section.plugin-detail-section", null,
        h("h2", null, "Contains"),
        h("div.plugin-detail-contains", null,
          h("div.plugin-detail-contains-heading", null, h("span", null, "Skills"), h("span", null, String(skills.length))),
          ...skills.map(skill => h("a", { href: "#", onclick: event => { event.preventDefault(); emit("open-skill", { skill }); } }, skill)))),
      h("section.plugin-detail-section.plugin-detail-readme", null,
        h("h2", null, "Plugin README"),
        h("p", null, readme)));
  }
}

ds.define("vsc-plugin-details", PluginDetails);
