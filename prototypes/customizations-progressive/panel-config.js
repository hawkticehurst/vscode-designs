/* V10 — Progressive. V9's environments model, disclosed in levels so it scales with more environments and agents.
 * - A row says where in one phrase ("Everywhere", "All but mac-mini-2", "This Computer only"); click it for the item
 *   itself: a file's content, a server's status, errors, output, tools and configuration, a plugin's contents, and
 *   where it's installed (the only place environments are managed). Pick an environment to see every row as it is there.
 * - Every type, each the product's tree (with hover): Connectors, MCP Servers, Skills, Plugins, Instructions, Agents, Hooks,
 *   Tools and Canvases. Groups are User, Workspace · folder and Built-in; plugin, extension and organization items nest
 *   under one source node. MCP rows show state as microsoft/vscode#337402 does (error icon + Show Output, Start, Sign In,
 *   spinner, the disabled scope beside an off switch, compatibility on the secondary line).
 * - Install asks Everywhere / Only here / This Computer only / Choose…; agents only if you ask. An environment can stay
 *   synced with another (hawks-framework is synced with This Computer), so most installs need no choosing.
 * - The session panel opens details too (click a connection or skill), and lists the session's other types under More.
 * URL: ?session=triage, ?panel=open, ?configure=<page>, ?detail=<key>, ?lens=<environment>, ?dev=1, ?theme=light. */
window.PANEL_CONFIG = {
  width: 420,
  minWidth: 340,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: false,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  library: null,
};
