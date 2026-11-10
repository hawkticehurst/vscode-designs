/* Builds the Customizations pages (data from customizations.js) and describes the categories, so a variant can place
   the pages wherever its layout needs them. Must run while the page parses, before system.js upgrades the elements
   (they read their slotted children once). CUST.build() returns a fresh copy: { browse, plugins, mcp, ... }. */
(function () {
  const build = () => {
    const stage = document.createElement("div");
    window.renderCustomizationsEditor(stage);
    const pages = {};
    for (const el of [...stage.children]) pages[el.getAttribute("section")] = el;
    return pages;
  };
  const rows = "vsc-customization-item, vsc-mcp-server-item, vsc-plugin-item, vsc-tool-set-item, vsc-agents-extension-item";
  const ref = build();
  const n = (id) => ref[id].querySelectorAll(rows).length;
  // Summaries say where items come from, from the lists' groups: "4 user · 2 plugins · 1 built-in".
  const SOURCES = { "User": ["user"], "Workspace": ["in workspace"], "Plugins": ["plugin", "plugins"], "Remote": ["remote"], "Built-in": ["built-in"],
    "Built-In": ["built-in"], "Built-in Tools": ["built-in"], "Connected Sources": ["connected"], "Extension Tools": ["extension", "extensions"] };
  const summary = (id) => {
    if (id === "extensions") {
      const items = [...ref.extensions.querySelectorAll("vsc-agents-extension-item")], on = items.filter((i) => i.hasAttribute("enabled")).length;
      return `${on} enabled · ${items.length - on} disabled`;
    }
    return [...ref[id].querySelectorAll("vsc-customization-group")].map((g) => {
      const n = +g.getAttribute("count"), [one, many = one] = SOURCES[g.getAttribute("label")] || [g.getAttribute("label").toLowerCase()];
      return n ? `${n} ${n === 1 ? one : many}` : "";
    }).filter(Boolean).join(" · ");
  };
  const CATEGORIES = [
    { id: "plugins", label: "Plugins", icon: "ai-customization-plugin", count: n("plugins"), summary: summary("plugins"), add: "Install Plugin from Source", browse: true },
    { id: "mcp", label: "MCP Servers", sentence: "MCP servers", short: "MCP", icon: "ai-customization-mcp-server", count: n("mcp"), summary: summary("mcp"), add: "Add Server", browse: true },
    { id: "skills", label: "Skills", icon: "ai-customization-skill", count: n("skills"), summary: summary("skills"), add: "New Skill", browse: true },
    { id: "instructions", label: "Instructions", icon: "ai-customization-instructions", count: n("instructions"), summary: summary("instructions"), add: "New Instruction" },
    { id: "agents", label: "Agents", icon: "ai-customization-agent", count: n("agents"), summary: summary("agents"), add: "New Agent" },
    { id: "hooks", label: "Hooks", icon: "ai-customization-hook", count: n("hooks"), summary: summary("hooks"), add: "New Hook" },
    { id: "tools", label: "Tools", icon: "ai-customization-tools", count: 36, summary: summary("tools"), group: "window" },
    { id: "extensions", label: "Extensions", icon: "extensions-view-icon", count: n("extensions"), summary: summary("extensions"), group: "window" },
  ];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  window.CUST = { build, first: ref, rows, CATEGORIES, esc, category: (id) => CATEGORIES.find((c) => c.id === id),
    // Wraps a page in the Customizations editor's content structure, which the captured page rules are scoped to.
    hostPage: (page) => {
      const host = document.createElement("div");
      host.className = "ai-customization-management-editor cust-page";
      host.innerHTML = '<div class="management-content"><div class="content-inner"></div></div>';
      host.querySelector(".content-inner").append(page);
      return host;
    },
  };
  // ?theme=light opens the prototype in Light 2026.
  const theme = new URLSearchParams(location.search).get("theme");
  if (theme) document.getElementById("wb").setAttribute("theme", theme.includes("-") ? theme : theme + "-2026");
})();
