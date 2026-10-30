/*
 * Customizations editor content, from the live Agents window (VS Code Insiders 1.145.0, 2026-10-29 build,
 * chat.customizations.marketplace.enabled: true, signed in). Shared by both side-panel variants.
 * renderCustomizationsEditor(el) fills a <vsc-customizations-editor> with every section page.
 */
(function () {
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== false).map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(" ");
  // Marketplace and connector icons, downloaded from the feeds into assets/icons so the prototype renders offline.
  const ICONS = "assets/icons/";

  const BROWSE = [
    { heading: "Editor's picks", featured: true, cards: [
      ["Azure DevOps Copilot Plugin", "Plugin · GitHub Feed", "The Azure DevOps Copilot Plugin integrates Azure DevOps work into the GitHub Copilot App, allowing users to manage work items and pull requests seamlessly.", ICONS + "microsoft-azure-devops.png", "extensions"],
      ["Impeccable Design Tool", "Skill · GitHub Feed", "A tool for designing and improving frontend interfaces, including websites, dashboards, and mobile screens, with features for UX review, typography, color, and accessibility.", ICONS + "pbakaus-impeccable.png", "lightbulb"],
      ["Microsoft Foundry Canvas", "Plugin · GitHub Feed", "A GitHub Copilot App extension for designing, configuring, testing, and deploying Microsoft Foundry hosted agents, featuring live project resources and an embedded local Agent Inspector.", ICONS + "microsoft-microsoft-foundry.png", "extensions"],
    ] },
    { heading: "Plan, build, and ship", cards: [
      ["Figma MCP Server", "MCP server · GitHub Feed", "The Figma MCP Server integrates Figma design context directly into AI workflows, enabling code generation and design implementation.", ICONS + "figma-figma.png", "server"],
      ["Playwright MCP", "MCP server · GitHub Feed", "Playwright MCP is a Model Context Protocol (MCP) server that provides browser automation capabilities using Playwright, enabling interaction with web pages through structured accessibility snapshots.", ICONS + "microsoft-playwright.png", "server"],
      ["Web Design Guidelines Reviewer", "Skill · GitHub Feed", "Reviews UI code for compliance with Web Interface Guidelines, including accessibility and best practices.", ICONS + "vercel-labs-web-design-guidelines.png", "lightbulb"],
      ["Security & Code Quality Plugin", "Plugin · GitHub Feed", "Provides security frameworks, accessibility guidelines, performance optimization, and code quality best practices to help build secure, maintainable, and high-performance applications.", ICONS + "github-security-best-practices.png", "extensions"],
    ] },
    { heading: "Connect your work", cards: [
      ["WorkIQ Tools for Microsoft 365", "Plugin · GitHub Feed", "WorkIQ Tools for Microsoft 365 provides a comprehensive suite for interacting with Microsoft 365 data, enabling semantic queries and structured reads and writes across emails, meetings, calendars, documents, and files.", ICONS + "microsoft-workiq.png", "extensions"],
      ["Jira Sprint Dashboard", "Plugin · GitHub Feed", "A live, read-only Copilot canvas dashboard for Jira issues in currently open sprints, highlighting flow, owner load, and top-priority work.", ICONS + "atlassian-labs-jira.png", "extensions"],
      ["Sentry Triage Plugin", "Plugin · GitHub Feed", "Scans live Sentry issues in a Copilot canvas, groups them by urgency, and allows for tracking or creating a fix pull request.", ICONS + "sentry-sentry-triage.png", "extensions"],
      ["Microsoft Azure Skills Plugin", "Plugin · GitHub Feed", "Integrate Microsoft Azure services with GitHub Copilot or Claude Code to manage resources, deploy applications, and monitor services directly within your development environment.", ICONS + "microsoft-azure.png", "extensions"],
      ["Azure DevOps MCP Server", "MCP server · GitHub Feed", "Provides access to Azure DevOps services, allowing interaction with features like repositories, work items, builds, releases, test plans, and code search through AI agents.", ICONS + "microsoft-azure-devops.png", "server"],
      ["Power BI Authoring MCP Server", "MCP server · GitHub Feed", "The Power BI Authoring MCP server allows an AI agent to create and modify Power BI semantic models using natural language commands.", ICONS + "microsoft-power-bi.png", "server"],
    ] },
    { heading: "Copilot Connectors", showAll: true, cards: [
      ["Airtable", "MCP server · Copilot Connectors", "Read Airtable records, schemas, comments, and workspace metadata.", ICONS + "gh-9687261.png", "server"],
      ["Amplitude", "MCP server · Copilot Connectors", "Analyze product usage data in Amplitude.", ICONS + "gh-2291562.png", "server"],
      ["Apify", "MCP server · Copilot Connectors", "Find and run Apify Actors to collect and process web data.", ICONS + "gh-24586296.png", "server"],
      ["Atlassian Rovo", "MCP server · Copilot Connectors", "Search and manage Jira and Confluence content with Atlassian Rovo.", ICONS + "gh-168166.png", "server"],
    ] },
    { heading: "MCP Gallery", showAll: true, cards: [
      ["Markitdown", "MCP server · MCP Gallery", "Convert various file formats (PDF, Word, Excel, images, audio) to Markdown.", ICONS + "gh-6154722.png", "server"],
      ["Netdata", "MCP server · MCP Gallery", "Real-time infrastructure monitoring with metrics, logs, alerts, and ML-based anomaly detection.", ICONS + "gh-43390781.png", "server"],
      ["Context7", "MCP server · MCP Gallery", "Up-to-date docs for AI agents", ICONS + "context7.png", "server"],
      ["Chrome DevTools MCP", "MCP server · MCP Gallery", "MCP server for Chrome DevTools", ICONS + "gh-11260967.png", "server"],
    ] },
  ];

  const APP = "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app";
  const skill = (n, base = "~/.copilot/skills") => [n, `${base}/${n}/SKILL.md`];
  const PROMPT_PAGES = {
    skills: {
      heading: "Skills", newLabel: "New Skill", icon: "ai-customization-skill",
      description: "Folders of instructions, scripts, and resources that Copilot loads when relevant to perform specialized tasks.",
      link: "Learn more about agent skills",
      groups: [
        { label: "User", items: [skill("comparison-screenshot"), skill("cpr"), skill("end-of-day-pr-report"), skill("ffmpeg", "~/.agents/skills"), skill("find-skills"), skill("grilling"), skill("local-section-repro"), skill("user-configured-prompt"), skill("user-configured-skill"), skill("user-review"), skill("user-review-2"), skill("vsc-launch", "~/.agents/skills"), skill("vscode-bsky"), skill("vscode-issue-dispatcher"), skill("vscode-to-figma", "~/.agents/skills"), skill("vscode-worktree-bootstrap")] },
        { label: "Workspace", items: [] },
        { label: "Remote", items: [["ai-prompt-engineering-safety-review", "~/.copilot/installed-plugins/awesome-copilot/security-best-practices/skills/ai-prompt-engineering-safety-review/SKILL.md"]] },
        { label: "Built-in", items: [
          ["act-on-feedback", "sessions"], ["agent-customization", "copilot"], ["code-review", "sessions"], ["commit", "sessions"], ["create-draft-pr", "sessions"],
          ["create-pr", "sessions"], ["fix-ci", "sessions"], ["generate-run-commands", "sessions"], ["merge", "sessions"], ["migrate-customizations", "copilot"],
          ["sync", "sessions"], ["sync-upstream", "sessions"], ["troubleshoot", "sessions"], ["update-pr", "sessions"], ["update-skills", "sessions"],
        ].map(([n, where]) => [n, where === "copilot" ? `${APP}/extensions/copilot/assets/prompts/skills/${n}/SKILL.md` : `${APP}/out/vs/sessions/skills/${n}/SKILL.md`]) },
      ],
    },
    instructions: {
      heading: "Instructions", newLabel: "New Instruction", icon: "ai-customization-user",
      description: "Define common guidelines and rules that automatically influence how AI generates code and handles development tasks.",
      link: "Learn more about custom instructions",
      groups: [
        { label: "User", items: [["user-configured.instructions.md", "~/.copilot/instructions/user-configured.instructions.md"], ["user-style.instructions.md", "~/.copilot/instructions/user-style.instructions.md"]] },
        { label: "Workspace", items: [] },
      ],
    },
    agents: {
      heading: "Agents", newLabel: "New Agent", icon: "ai-customization-agent",
      description: "Configure the AI to adopt different personas tailored to specific development tasks. Each agent has its own instructions, tools, and behavior.",
      link: "Learn more about custom agents",
      groups: [
        { label: "User", items: [["Ask", "ask.agent.md"], ["user-configured", "~/.copilot/agents/user-configured.agent.md"], ["user-planner", "~/.copilot/agents/user-planner.agent.md"]] },
        { label: "Workspace", items: [] },
      ],
    },
    hooks: {
      heading: "Hooks", newLabel: "New Hook", icon: "ai-customization-hook",
      description: "Prompts executed at specific points during an agentic lifecycle.",
      link: "Learn more about hooks",
      groups: [
        { label: "User", items: [["orca.json", "~/.copilot/hooks/orca.json"]] },
        { label: "Workspace", items: [] },
      ],
    },
  };

  function promptPage(id) {
    const p = PROMPT_PAGES[id];
    let rows = "";
    p.groups.forEach((g, gi) => {
      rows += `<vsc-customization-group ${attrs({ label: g.label, count: g.items.length, "add-label": g.label === "User" || g.label === "Workspace" ? p.newLabel : undefined, actions: g.label === "User" || g.label === "Workspace" ? "add" : "", first: gi === 0 })}></vsc-customization-group>`;
      for (const [name, path] of g.items) rows += `<vsc-customization-item ${attrs({ name, path, icon: p.icon })}></vsc-customization-item>`;
    });
    return `<vsc-customization-list ${attrs({ section: id, kind: "prompts", heading: p.heading, description: p.description, link: p.link })}>${rows}</vsc-customization-list>`;
  }

  function mcpPage() {
    const src = "~/.copilot/mcp-config.json";
    const server = (name, extra = {}) => `<vsc-mcp-server-item ${attrs({ name, source: src, builtin: true, enabled: true, ...extra })}></vsc-mcp-server-item>`;
    return `<vsc-customization-list ${attrs({ section: "mcp", kind: "mcp", heading: "MCP Servers", description: "An open standard that lets AI use external tools and services. MCP servers provide tools for file operations, databases, APIs, and more.", link: "Learn more about MCP servers" })}>`
      + `<vsc-customization-group label="User" count="4" icon="account" actions="add" add-label="Add Server" first></vsc-customization-group>`
      + server("com.microsoft/microsoft-fabric") + server("io.github.github/github-mcp-server") + server("playwright") + server("sprue")
      + `<vsc-customization-group label="Workspace" count="0" icon="folder" actions="add" add-label="Add Server"></vsc-customization-group>`
      + `<vsc-customization-group label="Plugins" count="2" icon="plug"></vsc-customization-group>`
      + `<vsc-mcp-server-item ${attrs({ name: "kusto", description: "Connector: Azure Data Explorer", "icon-src": ICONS + "kusto.png", "no-toggle": true })}></vsc-mcp-server-item>`
      + `<vsc-mcp-server-item ${attrs({ name: "workiqmcp", description: "Connector: Work IQ", "icon-src": ICONS + "workiqmcp.png", "no-toggle": true })}></vsc-mcp-server-item>`
      + `<vsc-customization-group label="Built-In" count="1" icon="ai-customization-mcp-server"></vsc-customization-group>`
      + `<vsc-mcp-server-item ${attrs({ name: "github-mcp-server", action: "start", enabled: true })}></vsc-mcp-server-item>`
      + `</vsc-customization-list>`;
  }

  function pluginsPage() {
    const loc = "~/.copilot/installed-plugins/awesome-copilot";
    return `<vsc-customization-list ${attrs({ section: "plugins", kind: "plugins", heading: "Plugins", description: "Extend your AI agent with plugins that add commands, skills, agents, hooks, and MCP servers from reusable packages.", link: "Learn more about agent plugins" })}>`
      + `<vsc-customization-group label="User" count="2" icon="account" actions="refresh,add" add-label="Install Plugin from Source" first></vsc-customization-group>`
      + `<vsc-plugin-item ${attrs({ name: "accessibility-kanban", location: loc, enabled: true })}></vsc-plugin-item>`
      + `<vsc-plugin-item ${attrs({ name: "security-best-practices", location: loc, metadata: "1 skill", enabled: true })}></vsc-plugin-item>`
      + `<vsc-customization-group label="Workspace" count="0" icon="folder" actions="refresh,add" add-label="Install Plugin from Source"></vsc-customization-group>`
      + `</vsc-customization-list>`;
  }

  function browsePage() {
    const sections = BROWSE.map((s) => `<vsc-customization-discovery-section ${attrs({ heading: s.heading, featured: !!s.featured, "show-all": !!s.showAll })}>`
      + s.cards.map(([name, meta, description, src, fallback]) => `<vsc-customization-discovery-card ${attrs({ name, meta, description, "icon-src": src, "fallback-icon": fallback })}></vsc-customization-discovery-card>`).join("")
      + `</vsc-customization-discovery-section>`).join("");
    return `<vsc-customization-browse section="browse">${sections}</vsc-customization-browse>`;
  }

  window.renderCustomizationsEditor = function (editor) {
    editor.innerHTML = browsePage() + pluginsPage() + mcpPage() + promptPage("skills") + promptPage("instructions") + promptPage("agents") + promptPage("hooks");
    // Browse buttons on list pages go back to the marketplace, like the product.
    editor.addEventListener("browse", () => editor.setAttribute("section", "browse"));
  };
})();
