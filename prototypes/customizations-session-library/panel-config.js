/* A — "This session" + Library. The side panel's Customizations tab shows only what this session uses, grouped by where
 * it's defined (this workspace, user, plugins, built-in) and following the composer's workspace, harness and
 * environment. Everything you have, across workspaces and agents, lives in the Library modal (the Settings prototypes'
 * modal layout), opened from the sessions sidebar's Customizations entry or the panel's footer.
 * URL: ?library=skills opens the Library, ?harness=claude, ?workspace=chat, ?environment=cloud, ?sidebar=off, ?theme=light. */
window.PANEL_CONFIG = {
  width: 440,
  minWidth: 360,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: true,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  library: null,
};
