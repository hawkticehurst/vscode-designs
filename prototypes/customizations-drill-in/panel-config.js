/* V3 — Drill-in. The side panel opens on an overview: a Discover entry and every customization type with a one-line
 * summary of what's installed. Choosing one slides in its full-width page (back with the arrow, Esc or ⌥←).
 * Searching on the overview finds items across all types. URL: ?section=skills, ?theme=light. */
window.PANEL_CONFIG = {
  width: 420,
  minWidth: 340,
  section: null,
  tabs: ["Changes", "Files", "Customizations"],
  active: "Customizations",
  open: true,
};
