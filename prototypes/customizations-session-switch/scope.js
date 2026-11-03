/* What applies to a session: every customization tagged with its type and source (where it's defined), plus the
   rules that decide whether it applies for a given workspace, harness and environment. Runs while the page parses,
   after stage.js (it reads the pages' rows before system.js upgrades them).
   Workspace items are the real ones in microsoft/vscode (.github/instructions, .github/skills, .github/agents,
   .github/hooks, AGENTS.md). The harness and environment rules are illustrative, not product behavior. */
(function () {
  const { first: pages, esc } = window.CUST;
  const TYPES = [
    { id: "plugins", label: "Plugins", one: "plugin", kind: "plugins", icon: "ai-customization-plugin" },
    { id: "mcp", label: "MCP Servers", one: "MCP server", kind: "mcp", icon: "ai-customization-mcp-server" },
    { id: "skills", label: "Skills", one: "skill", kind: "prompts", icon: "ai-customization-skill" },
    { id: "instructions", label: "Instructions", one: "instruction", kind: "prompts", icon: "ai-customization-instructions" },
    { id: "agents", label: "Agents", one: "agent", kind: "prompts", icon: "ai-customization-agent" },
    { id: "hooks", label: "Hooks", one: "hook", kind: "prompts", icon: "ai-customization-hook" },
  ];
  const SOURCES = {
    workspace: { label: "Workspace", icon: "folder" },
    user: { label: "Yours", icon: "account", sub: "In all your sessions" },
    plugin: { label: "From plugins", icon: "ai-customization-plugin", sub: "Added by plugins you installed" },
    builtin: { label: "Built-in", icon: "vscode-insiders", sub: "Included with the Agents window" },
  };
  const GROUP_SOURCE = { "User": "user", "Workspace": "workspace", "Plugins": "plugin", "Remote": "plugin", "Built-in": "builtin", "Built-In": "builtin" };
  const items = [];
  // Existing pages: user, plugin and built-in rows (the captured product data).
  for (const t of TYPES) {
    let source = null;
    for (const el of pages[t.id].children) {
      if (el.localName === "vsc-customization-group") { source = GROUP_SOURCE[el.getAttribute("label")]; continue; }
      const name = el.getAttribute("name");
      const path = el.getAttribute("path") || el.getAttribute("source") || el.getAttribute("location") || "";
      items.push({ type: t.id, source, name, path, html: el.outerHTML, copilotOnly: /extensions\/copilot\//.test(path) });
    }
  }
  // Workspace rows, per workspace id (the composer's workspace picker ids).
  const WS = {"instructions": [".github/copilot-instructions.md", "AGENTS.md", ".github/instructions/accessibility.instructions.md", ".github/instructions/agent-host-interoperability.instructions.md", ".github/instructions/agentHostTesting.instructions.md", ".github/instructions/ai-customization.instructions.md", ".github/instructions/best-practices.instructions.md", ".github/instructions/buildNext.instructions.md", ".github/instructions/chat.instructions.md", ".github/instructions/coding-guidelines.instructions.md", ".github/instructions/committing.instructions.md", ".github/instructions/css-best-practices.instructions.md", ".github/instructions/design-philosophy.instructions.md", ".github/instructions/design-tokens.instructions.md", ".github/instructions/disposable.instructions.md", ".github/instructions/interactive.instructions.md", ".github/instructions/kusto.instructions.md", ".github/instructions/language-model-tool-descriptions.instructions.md", ".github/instructions/learnings.instructions.md", ".github/instructions/notebook.instructions.md", ".github/instructions/observables.instructions.md", ".github/instructions/oss-third-party-notices.instructions.md", ".github/instructions/oss.instructions.md", ".github/instructions/sessions.instructions.md", ".github/instructions/source-code-organization.instructions.md", ".github/instructions/telemetry.instructions.md", ".github/instructions/tree-widgets.instructions.md", ".github/instructions/writing-tests.instructions.md"], "skills": [".github/skills/accessibility/SKILL.md", ".github/skills/agent-host-chat-contributions/SKILL.md", ".github/skills/agent-host-e2e-tests/SKILL.md", ".github/skills/agent-host-logs/SKILL.md", ".github/skills/author-contributions/SKILL.md", ".github/skills/auto-perf-optimize/SKILL.md", ".github/skills/azure-pipelines/SKILL.md", ".github/skills/build-champ-triage/SKILL.md", ".github/skills/chat-customizations-editor/SKILL.md", ".github/skills/chat-perf/SKILL.md", ".github/skills/chat-pet-sprite-creation/SKILL.md", ".github/skills/ci-artifact-testing/SKILL.md", ".github/skills/code-oss-logs/SKILL.md", ".github/skills/code-review/SKILL.md", ".github/skills/codenotify/SKILL.md", ".github/skills/component/SKILL.md", ".github/skills/component-fixtures/SKILL.md", ".github/skills/cpu-profile-analysis/SKILL.md", ".github/skills/customizations-in-the-agent-host/SKILL.md", ".github/skills/design-philosophy/SKILL.md", ".github/skills/doc-comments/SKILL.md", ".github/skills/experiments/SKILL.md", ".github/skills/feature-tryouts/SKILL.md", ".github/skills/feedback-learning/SKILL.md", ".github/skills/fix-ci-failures/SKILL.md", ".github/skills/fixissueno/SKILL.md", ".github/skills/flaky-smoke-tests/SKILL.md", ".github/skills/heap-snapshot-analysis/SKILL.md", ".github/skills/hover/SKILL.md", ".github/skills/integrated-browser/SKILL.md", ".github/skills/integration-tests/SKILL.md", ".github/skills/issue-grouping/SKILL.md", ".github/skills/memory-leak-audit/SKILL.md", ".github/skills/migrate-issues/SKILL.md", ".github/skills/otel/SKILL.md", ".github/skills/policy-and-managed-settings/SKILL.md", ".github/skills/sessions/SKILL.md", ".github/skills/setup-environment/SKILL.md", ".github/skills/smoke-tests/SKILL.md", ".github/skills/sweeper-implement/SKILL.md", ".github/skills/sweeper-plan/SKILL.md", ".github/skills/symbolicate-crash-dump/SKILL.md", ".github/skills/unit-tests/SKILL.md", ".github/skills/update-instructions/SKILL.md", ".github/skills/update-screenshots/SKILL.md", ".github/skills/ux-css-layout/SKILL.md", ".github/skills/ux-theming/SKILL.md", ".github/skills/validate-ui-scenario/SKILL.md", ".github/skills/vscode-dev-workbench/SKILL.md"], "agents": [".github/agents/data.md"], "hooks": [".github/hooks/build.json.disabled", ".github/hooks/cloud-sandbox.json"]};
  const row = (type, path, extra = "") => {
    const t = TYPES.find((x) => x.id === type);
    const file = path.split("/").pop();
    const name = type === "skills" ? path.split("/").slice(-2, -1)[0] : type === "agents" ? file.replace(/\.(agent\.)?md$/, "") : file;
    return { type, name, path, html: '<vsc-customization-item name="' + esc(name) + '" path="' + esc(path) + '" icon="' + t.icon + '"' + extra + '></vsc-customization-item>' };
  };
  const WORKSPACES = {
    vscode: { label: "vscode", path: "~/Code/work/vscode", items: [
      ...WS.instructions.map((p) => row("instructions", p)), ...WS.skills.map((p) => row("skills", p)),
      ...WS.agents.map((p) => row("agents", p)), ...WS.hooks.map((p) => row("hooks", p)),
    ] },
  };
  for (const [id, w] of Object.entries(WORKSPACES)) for (const it of w.items) items.push({ ...it, source: "workspace", workspace: id });

  const HARNESSES = {
    copilot: { label: "Copilot", icon: "copilot", unsupported: {} },
    claude: { label: "Claude", icon: "claude", unsupported: { instructions: "Claude reads CLAUDE.md instead", hooks: "Claude uses its own hook settings", plugins: "Copilot plugins don't load in Claude" } },
    codex: { label: "Codex", icon: "openai", unsupported: { agents: "Codex doesn't use custom agents", hooks: "Codex doesn't run hooks", plugins: "Copilot plugins don't load in Codex" } },
  };
  const ENVIRONMENTS = { local: { label: "This Computer", icon: "device-desktop" }, cloud: { label: "Cloud", icon: "cloud" } };

  /** Why an item doesn't apply in this scope (or null). Short form for badges, long form for descriptions. */
  function blocked(it, scope) {
    const h = HARNESSES[scope.harness];
    if (/\.disabled$/.test(it.path)) return { badge: "Turned off", why: "Renamed .disabled in the repo" };
    if (/cloud-sandbox/.test(it.path) && scope.environment !== "cloud") return { badge: "Cloud only", why: "Runs only in cloud sessions" };
    if (h.unsupported[it.type]) return { badge: "Not in " + h.label, why: h.unsupported[it.type] };
    if (it.source === "plugin" && h.unsupported.plugins) return { badge: "Not in " + h.label, why: "Comes from a Copilot plugin" };
    if (it.copilotOnly && scope.harness !== "copilot") return { badge: "Copilot only", why: "Built into Copilot" };
    return null;
  }
  /** The session's effective set: what applies and what doesn't (and why), given a scope. */
  function resolve(scope) {
    const inScope = items.filter((it) => it.source !== "workspace" || it.workspace === scope.workspace);
    const applies = [], excluded = [];
    for (const it of inScope) { const b = blocked(it, scope); (b ? excluded : applies).push(b ? { ...it, blocked: b } : it); }
    return { applies, excluded };
  }
  window.SCOPE = { TYPES, SOURCES, HARNESSES, ENVIRONMENTS, WORKSPACES, items, resolve, type: (id) => TYPES.find((t) => t.id === id),
    workspaceLabel: (id) => (WORKSPACES[id] ? WORKSPACES[id].label : (id === "chat" ? "No workspace" : id)) };
})();
