/* V11 — Session sidebar (pared back), from the Nov 5 Customization Squad Sync.
 * - No customization UI in the composer.
 * - The right sidebar holds what you can turn on and off for this session: plugins, MCP servers and connectors.
 *   Ask first is an advanced option in a row's ⋯ menu. Skills, instructions, agents, hooks, tools and canvases are
 *   links into the Customizations modal, narrowed to this session; so is Discover (the + on each section).
 * - The modal is V10's.
 * URL: ?session=triage, ?panel=open, ?configure=<page>, ?detail=<key>, ?theme=light. */
window.PANEL_CONFIG = {
  width: 420,
  minWidth: 340,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: false,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  library: null,
  composerPills: false,
  customizeChip: false,
};
