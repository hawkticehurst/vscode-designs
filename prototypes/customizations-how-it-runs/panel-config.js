/* V7 — How it runs. V5's session panel and Library, with a "How it runs" view (default) that lays the session's
 * customizations out along the agent loop: session start → each prompt → while the agent works → when it stops.
 * It estimates what they cost in context, calls out overrides and duplicates, and shows what doesn't apply and why;
 * every row drills into its items (V2's overview → detail pattern), where items can be turned off for the session
 * or opened in the Customizations modal. URL: ?detail=skills, ?library=skills, ?harness=claude, ?workspace=chat, ?environment=cloud, ?theme=light. */
window.PANEL_CONFIG = {
  width: 460,
  minWidth: 360,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: true,
  sidebar: true,
  scope: { workspace: "vscode", harness: "copilot", environment: "local" },
  view: "runs",
  library: null,
};
