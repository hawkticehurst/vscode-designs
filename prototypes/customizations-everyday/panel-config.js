/* V8 — Everyday. Customizations for people using agents rather than building them: what a session can reach
 * (connections) and the workflows it knows (skills). Toggles live in the composer's Connections pill; the side panel
 * is two short lists; in-chat moments cover connect, sign in again, what was used and saving a skill. Try: the "Triage customization migration issues" session (sign in to
 * Slack, then save the workflow as a skill), or type a notion.so link in the new-session composer.
 * Opens with the side panel closed (⌥⌘B or the title bar toggle opens it). URL: ?session=triage, ?panel=open, ?theme=light. */
window.PANEL_CONFIG = {
  width: 400,
  minWidth: 340,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: false,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  library: null,
};
