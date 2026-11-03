/* B — One panel: This session · Library · Browse. The side panel's Customizations tab switches between what this
 * session uses (by source, following the composer's workspace, harness and environment), everything you have
 * (by type, grouped by source, across workspaces) and the marketplace. The sessions sidebar's Customizations entry
 * opens the panel on the Library. URL: ?view=library|browse, ?filter=skills, ?harness=claude, ?workspace=chat,
 * ?environment=cloud, ?sidebar=off, ?theme=light. */
window.PANEL_CONFIG = {
  width: 460,
  minWidth: 360,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: true,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  view: "session",
  filter: "all",
};
