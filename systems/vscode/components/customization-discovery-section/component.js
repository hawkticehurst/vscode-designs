class CustomizationDiscoverySection extends ds.Element {
  static hostClass = "customization-discovery-section";
  static props = ["heading", "featured", "show-all"];

  render() {
    const h = ds.h;
    const heading = this.attr("heading", "");
    this.setClasses({ featured: this.flag("featured") });
    return [
      h("div.customization-discovery-section-header", null,
        h("h3.customization-discovery-section-title", null, heading),
        this.flag("show-all") ? h("button.customization-discovery-show-all", { type: "button", "aria-label": `View all customizations from ${heading}` }, "View All") : null),
      h("div.customization-discovery-grid", null, this.slotted("")),
    ];
  }
}

ds.define("vsc-customization-discovery-section", CustomizationDiscoverySection);
