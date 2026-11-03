/* V2 — Installed / Browse. Customizations stays an editor tab in the side panel, without the section sidebar:
 * an Installed · Browse switch in the panel title, one search box and type filters over a single scrolling list.
 * Resize from the panel's left edge; double-click resets. URL: ?view=browse, ?filter=skills, ?theme=light. */
window.PANEL_CONFIG = {
  width: 440,
  minWidth: 340,
  view: "installed",
  filter: "all",
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: true,
};
