/* V14 explores a single selected session as the Customizations editor's shared context. */
const v12ListStyles = document.createElement("link");
v12ListStyles.rel = "stylesheet";
v12ListStyles.href = "v12-list.css";
document.head.append(v12ListStyles);

const sessionContext = document.createElement("script");
sessionContext.type = "module";
sessionContext.src = "session-context.js?v=7";
document.head.append(sessionContext);

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
