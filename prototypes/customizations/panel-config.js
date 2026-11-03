/* Customizations as a tab in the Agents window's docked editor part, opening at the product's default sizes
 * (578px part, 150px section sidebar: what the live window shows with workbench.editor.useModal: off).
 * Both splits are resizable: drag the part sash (left edge of the panel) or the section sash inside the editor;
 * double-click either to reset. */
window.PANEL_CONFIG = {
  width: 578,
  sidebarWidth: 150,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  section: "browse",
  open: true,
};
