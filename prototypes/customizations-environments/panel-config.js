/* V9 — Environments. Global vs. session, always labeled.
 * - Configure (sidebar, was Customizations): the Agent Window's settings. Connections, Skills and Plugins show where each
 *   one is installed across every environment (This Computer, devbox-1, Cloud) and agent (Copilot, Claude, Codex); click a
 *   cell to install or remove, or select rows and "Install on…". Environments, Sessions (each with Customize), Extensions
 *   and Discover, where installing asks where: any set of environments × agents.
 * - Customize (one session): the button in the session header, the side panel and the composer's Connections pill, all
 *   labeled with the session's environment and agent. Connections are On / Ask first / Off, saved for the workspace or
 *   just this session. The panel flags what's on This Computer but not here; Developer mode adds How it runs.
 * Try: the "Triage customization migration issues" session (devbox-1): allow Slack, install what's missing, save a skill.
 * URL: ?session=triage, ?panel=open, ?configure=connections|skills|environments|sessions|browse, ?dev=1, ?theme=light. */
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
