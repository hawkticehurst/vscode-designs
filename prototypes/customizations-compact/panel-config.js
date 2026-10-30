/* V2 — the docked editor part widened toward the modal's proportions (820px) with the Customizations editor's
 * default 200px section sidebar. List pages get their wide layout (content ≥ 600px); Browse stays single-column
 * below 800px, as in the product. */
window.PANEL_CONFIG = {
  width: 820,
  sidebarWidth: 200,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  section: "browse",
  open: true,
};
