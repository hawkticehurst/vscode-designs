/* V12 — Session Activity Bar entry point and flat VS Code-style session lists. V11's session sidebar, opened from a
 * Session Customizations entry in the Agents window's Session Activity Bar (the strip at the window's right edge) instead of
 * the Customize button at the top right of the session.
 * V11 — Session sidebar (pared back), from the Nov 5 Customization Squad Sync.
 * - No customization UI in the composer.
 * - The right sidebar holds what you can turn on and off for this session: plugins, MCP servers and connectors.
 *   Ask first is an advanced option in a row's ⋯ menu. Skills, instructions, agents, hooks, tools and canvases are
 *   links into the Customizations modal, narrowed to this session; so is Discover (the + on each section).
 * - The modal is V10's.
 * URL: ?session=triage, ?panel=open, ?configure=<page>, ?detail=<key>, ?theme=light. */
const v12ListStyles = document.createElement("link");
v12ListStyles.rel = "stylesheet";
v12ListStyles.href = "v12-list.css";
document.head.append(v12ListStyles);

window.PANEL_CONFIG = {
  width: 420,
  minWidth: 340,
  tabs: ["Changes", "Files", "Session Customizations"],
  active: "Session Customizations",
  open: false,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  library: null,
  composerPills: false,
  customizeChip: false,
};
