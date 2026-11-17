/*
 * Shared dataset for the Customizations Rethink concepts.
 * Workspace content is the real microsoft/vscode repo (main, Nov 2026): AGENTS.md, copilot-instructions.md,
 * .github/instructions/*.instructions.md with their real applyTo globs, .github/skills (real names, descriptions and
 * disable-model-invocation flags), .github/agents/data.md, .github/hooks. User, plugin, connector, automation and
 * organization items are illustrative but follow the real data model (src/vs/workbench/contrib/chat/common).
 */
(function () {
  const HARNESSES = [
    { id: "copilot", label: "Copilot CLI", icon: "copilot" },
    { id: "claude", label: "Claude Code", icon: "claude" },
    { id: "codex", label: "Codex", icon: "openai" },
  ];

  // Who supplied an item. Independent from where it is stored (path) and which harness reads it.
  const SOURCES = {
    repo: { label: "This repo", short: "vscode", icon: "repo", detail: "microsoft/vscode, committed with the code — everyone working in this repo gets it" },
    user: { label: "You", short: "You", icon: "account", detail: "Your user profile — follows you across workspaces" },
    plugin: { label: "Plugins", short: "Plugin", icon: "plug", detail: "Installed agent plugins" },
    extension: { label: "Extensions", short: "Extension", icon: "extensions", detail: "VS Code extensions that contribute tools" },
    org: { label: "microsoft", short: "microsoft", icon: "organization", detail: "Your organization's Copilot policy" },
    builtin: { label: "Built-in", short: "Built-in", icon: "vscode", detail: "Ships with VS Code and Copilot" },
  };

  const TYPES = {
    instruction: { label: "Instruction", plural: "Instructions", icon: "book" },
    skill: { label: "Skill", plural: "Skills", icon: "lightbulb" },
    agent: { label: "Agent", plural: "Agents", icon: "agent" },
    prompt: { label: "Prompt", plural: "Prompts", icon: "bookmark" },
    hook: { label: "Hook", plural: "Hooks", icon: "zap" },
    mcp: { label: "MCP server", plural: "MCP Servers", icon: "server" },
    connector: { label: "Connector", plural: "Connectors", icon: "link" },
    toolset: { label: "Tool set", plural: "Tools", icon: "tools" },
    plugin: { label: "Plugin", plural: "Plugins", icon: "plug" },
    extension: { label: "Extension", plural: "Extensions", icon: "extensions" },
    automation: { label: "Automation", plural: "Automations", icon: "calendar" },
    canvas: { label: "Canvas", plural: "Canvases", icon: "preview" },
  };

  const items = [];
  const add = (o) => { items.push(Object.assign({ enabled: true, harness: { copilot: "yes", claude: "yes", codex: "yes" } }, o)); return o; };
  const H = (copilot, claude, codex, note) => ({ copilot, claude, codex, note });

  /* ── Instructions ─────────────────────────────────────────────── */
  // Standing guidance: attached to every request (agent instruction files).
  add({ id: "agents-md", type: "instruction", mode: "standing", name: "AGENTS.md", path: "AGENTS.md", src: "repo",
    desc: "Instructions for AI coding agents working with the VS Code codebase; points to the Copilot instructions.",
    harness: H("yes", "no", "yes", "Claude Code reads CLAUDE.md instead (.claude/CLAUDE.md mirrors this content)") });
  add({ id: "copilot-instructions", type: "instruction", mode: "standing", name: "copilot-instructions.md", path: ".github/copilot-instructions.md", src: "repo",
    desc: "Project overview, layered architecture, validation steps and coding guidelines.", lines: 212,
    harness: H("yes", "no", "no", "Read by Copilot only") });
  add({ id: "claude-md", type: "instruction", mode: "standing", name: "CLAUDE.md", path: ".claude/CLAUDE.md", src: "repo",
    desc: "Claude Code's copy of the project instructions.",
    harness: H("no", "yes", "no", "Read by Claude Code only (chat.useClaudeMdFile is off for Copilot)") });
  add({ id: "ms-security", type: "instruction", mode: "standing", name: "microsoft-security", path: "Organization policy", src: "org", locked: "required",
    desc: "Never commit secrets; use approved crypto libraries; flag new network endpoints for review.",
    harness: H("yes", "yes", "yes") });
  add({ id: "terse-commits", type: "instruction", mode: "glob", applyTo: "**", name: "terse-commits", path: "~/.copilot/instructions/terse-commits.instructions.md", src: "user",
    desc: "Prefer short, imperative commit subjects under 60 characters; no emoji.",
    harness: H("yes", "convert", "no", "Claude Code reads rules from ~/.claude/rules — can be converted") });

  // Conditional guidance (applyTo globs), real.
  const globs = [
    ["coding-guidelines", "src/vs/**", "VS Code coding guidelines — naming, style, types, strings, and code quality rules."],
    ["source-code-organization", "src/vs/**", "Layers, target environments, dependency injection, and folder structure conventions."],
    ["best-practices", "src/vs/**", "Reusing common UI primitives and patterns."],
    ["design-philosophy", "src/vs/**/browser/**/*.{ts,css}", "The shared Values → Principles → Moves vocabulary for reasoning about UI."],
    ["design-tokens", "src/vs/**/*.css", "Design-system size tokens: spacing, corner radius, font size, codicon size, stroke."],
    ["css-best-practices", "**/*.css", "CSS best practices for selector performance and maintainable state styling."],
    ["writing-tests", "{src/vs/**/test/**,src/vs/**/*.test.ts,src/vs/**/*.integrationTest.ts}", "Unit, integration and snapshot tests, and clean teardown patterns."],
    ["committing", "**", "Respect signing configuration and verification hooks; reference GitHub issues."],
    ["ai-customization", "src/vs/workbench/contrib/chat/browser/aiCustomization/**", "Architecture of the AI Customization view."],
    ["sessions", "src/vs/sessions/**", "Routes Agents Window work to its on-demand development skill."],
    ["agentHostTesting", "src/vs/platform/agentHost/**", "How to test the Agent Host."],
    ["agent-host-interoperability", "src/vs/platform/agentHost/**", "Keep Agent Host Protocol clients interoperable with non-VS Code hosts."],
    ["agent-host-uri-spaces", "src/vs/platform/agentHost/{browser,common}/**", "Rules for moving resource URIs between Agent Host clients and hosts."],
    ["language-model-tool-descriptions", "src/vs/**/*{Tool,Tools}.ts", "Writing model-facing language model tool descriptions."],
    ["buildNext", "build/next/**", "The esbuild-based build system in build/next."],
    ["automation-dialog", "src/vs/sessions/contrib/automations/browser/automationDialog*", "Keeps Automations dialog status in one notification center."],
    ["oss", "{ThirdPartyNotices.txt,cglicenses.json,cgmanifest.json}", "Third-party notices and license manifests."],
    ["oss-third-party-notices", "build/azure-pipelines/{oss/**,common/downloadNotice.ts}", "Notice generation in the OSS pipelines."],
  ];
  for (const [n, g, d] of globs) add({ id: "i-" + n, type: "instruction", mode: "glob", applyTo: g, name: n, path: `.github/instructions/${n}.instructions.md`, src: "repo", desc: d,
    harness: H("yes", "convert", "no", "Claude Code reads .claude/rules with `paths:` — can be converted") });

  // Listed guidance: no applyTo; the agent sees the description and reads the file when relevant.
  const listed = [
    ["accessibility", "Use when implementing accessibility features, ARIA labels, screen reader support or accessible help dialogs."],
    ["chat", "Chat feature area coding guidelines."],
    ["disposable", "Guidelines for writing code using IDisposable."],
    ["interactive", "Architecture of the interactive window component."],
    ["kusto", "Kusto exploration and telemetry analysis instructions."],
    ["learnings", "How to deal with learnings that you make (meta instruction)."],
    ["notebook", "Architecture of the notebook and interactive window components."],
    ["observables", "Guidelines for writing code using observables and deriveds."],
    ["telemetry", "Use when asked to work on telemetry events."],
    ["tree-widgets", "Use when asked to consume workbench tree widgets in VS Code."],
  ];
  for (const [n, d] of listed) add({ id: "i-" + n, type: "instruction", mode: "listed", name: n, path: `.github/instructions/${n}.instructions.md`, src: "repo", desc: d,
    harness: H("yes", "no", "no", "Only Copilot lists instruction descriptions for on-demand reading") });

  /* ── Skills ───────────────────────────────────────────────────── */
  // [name, description, disable-model-invocation, user-invocable:false] from .github/skills/*/SKILL.md
  const SKILLS = [
    ["accessibility","Primary accessibility skill for VS Code. REQUIRED for new feature and contribution work, and also applies to updates of existing UI. Covers accessibil",0,0],
    ["agent-host-chat-contributions","Build and review cross-cutting agent-host chat behavior through lifecycle contributions. Use when adding turn lifecycle side effects, prompt or contex",0,0],
    ["agent-host-e2e-tests","Use when writing, recording, updating, validating, or troubleshooting Agent Host end-to-end and real-provider integration tests under src/vs/platform/",0,0],
    ["agent-host-logs","Analyze Agent Host debug log exports. Use when given an ah-logs or ahp-logs zip/folder, an Export Agent Host Debug Logs bundle, events.jsonl, AHP JSON",0,0],
    ["author-contributions","Identify all files a specific author contributed to on a branch vs its upstream, tracing code through renames. Use when asked who edited what, what co",0,0],
    ["auto-perf-optimize","Run agent-driven VS Code performance or memory investigations. Use when asked to launch Code OSS, automate a VS Code scenario, run the Chat memory smo",0,0],
    ["azure-pipelines","Use when validating Azure DevOps pipeline changes for the VS Code build. Covers queueing builds, checking build status, viewing logs, and iterating on",0,0],
    ["build-champ-triage","Find out why a build has failed",1,0],
    ["chat-customizations-editor","Use when working on the Chat Customizations editor — the management UI for agents, skills, instructions, hooks, prompts, MCP servers, and plugins.",0,0],
    ["chat-perf","Run chat perf benchmarks and memory leak checks against the local dev build or any published VS Code version. Use when investigating chat rendering re",0,0],
    ["chat-pet-sprite-creation","Use when creating or changing VS Code chat pet sprite art, sprite sheets, state animations, eye treatments, Stable/Insiders variants, or pet transitio",0,0],
    ["ci-artifact-testing","Use when validating an upstream pull request or dependency fix against VS Code tests using GitHub Actions CI build artifacts instead of building local",0,0],
    ["code-oss-logs","Find and read timestamped process logs from Code OSS dev builds, including main.log, renderer.log, extension host logs, and agenthost.log. For bundles",0,0],
    ["code-review","Review code changes for correctness, regressions, and unintended scope. Use when reviewing a pull request, branch, commit, patch, or local diff, inclu",0,0],
    ["codenotify","codenotify",1,0],
    ["component-fixtures","Use when creating or updating component fixtures for screenshot testing or their shared infrastructure, or when designing UI components to be fixture-",0,0],
    ["component","Help author a component specification for an agent.",1,0],
    ["context-menus","Use when adding, changing, or reviewing context menus or menu contributions, including Action2 `menu` entries and MenuRegistry items with `group`/`ord",0,0],
    ["cpu-profile-analysis","Analyze V8/Chrome CPU profiles (.cpuprofile) and DevTools trace files (Trace-*.json). Use when: profiling performance, investigating slow functions, c",0,0],
    ["customizations-in-the-agent-host","Architecture and hard-won debugging lessons for customization enablement (plugins, MCP servers, agents, skills, instructions) in the agent host. Use w",0,0],
    ["design-philosophy","The VS Code design philosophy — a shared Values→Principles→Moves vocabulary for reasoning about UI in design terms instead of raw pixels. Use when des",0,0],
    ["doc-comments","Update doc comments",1,0],
    ["endgame-status","Report VS Code endgame status, focusing on test-plan progress, tester activity, release-branch PRs, and release-build availability.",0,0],
    ["experiments","Use when adding, changing, or reviewing a VS Code A/B experiment, either an experiment-controlled setting or a treatment read with the assignment serv",0,0],
    ["feature-tryouts","Use when adding, reviewing, or troubleshooting an interactive release-note Try This experience, including commands, views, editor samples, Chat drafts",0,0],
    ["feedback-learning","Classify and record explicit corrective feedback without turning skills or instructions into append-only knowledge dumps.",0,0],
    ["fix-ci-failures","Investigate and fix CI failures on a pull request. Use when CI checks fail on a PR branch — covers finding the PR, identifying failed checks, download",0,0],
    ["fixissueno","fixIssueNo",1,0],
    ["flaky-smoke-tests","Diagnose intermittent VS Code Electron smoke-test failures from the Azure DevOps Flaky Smoke Tests pipeline (definition 700). Covers finding failed it",0,0],
    ["heap-snapshot-analysis","Analyze V8 heap snapshots to investigate memory leaks and retention issues. Use when given .heapsnapshot files, asked to compare before/after snapshot",0,0],
    ["hover","Use when adding, changing, or reviewing hovers or tooltips on VS Code widgets and UI elements, including buttons, actions, toolbars, lists, and trees.",0,0],
    ["integrated-browser","Use this when working on the VS Code integrated browser (\"browserView\") to understand its architecture and mental model. Covers the embedded Chromium ",0,0],
    ["integration-tests","Use when running integration tests in the VS Code repo. Covers scripts/test-integration.sh (macOS/Linux) and scripts/test-integration.bat (Windows), t",0,0],
    ["issue-grouping","Group similar issues.",1,0],
    ["memory-leak-audit","Audit code for memory leaks and disposable issues. Use when reviewing event listeners, DOM handlers, lifecycle callbacks, or fixing leak reports. Cove",0,0],
    ["migrate-issues","migrate GitHub issues from one repository to another",1,0],
    ["otel","OpenTelemetry guidance for VS Code agent experiences. Use when changing Agent Host telemetry, local Copilot Chat telemetry, provider-native spans or m",0,0],
    ["policy-and-managed-settings","Use whenever adding, modifying, or reviewing any Copilot, agent, LLM, AI, tool, permission, sandbox, MCP, model, telemetry, feature-gate, setting, con",0,0],
    ["sessions","Core principles and workflow router for changes to the Agents Window under src/vs/sessions.",0,0],
    ["setup-environment","First Time Setup",1,0],
    ["smoke-tests","Use when running VS Code smoke tests or working on smoke-test CI steps. Covers pnpm run smoketest / smoketest-no-compile, grep filtering tests, and a ",0,0],
    ["sweeper-implement","Implement a VS Code Sweeper agent-ready issue — fetch the sweeper's review record from its state repo, implement the change in the current vscode chec",0,0],
    ["sweeper-plan","Plan a VS Code Sweeper agent-ready issue with the maintainer — fetch the sweeper's review record from its state repo, put the review's open decisions ",0,0],
    ["sweeper-query","Answer natural-language questions about the VS Code Sweeper's published issue index (index-<name>.json for microsoft/vscode and the enrolled family re",0,0],
    ["symbolicate-crash-dump","Symbolicate a native VS Code crash dump (.dmp) using electron-minidump. Use when given a crash dump file, asked to symbolicate a crash, resolve missin",0,0],
    ["unit-tests","Use when running unit tests in the VS Code repo. Covers the runTests tool, scripts/test.sh (macOS/Linux) and scripts/test.bat (Windows), and their sup",0,0],
    ["update-instructions","update-instructions",1,0],
    ["update-screenshots","Update the committed blocks-ci screenshot hashes after the \"Screenshots & Tests\" check fails, or investigate a screenshot diff reported on a PR. Use w",0,0],
    ["ux-css-layout","VS Code CSS conventions, file organization, class naming, standard sizes, SplitView/Grid layout, scrollable content, responsive layout, and text overf",0,0],
    ["ux-theming","VS Code theming, color tokens, widget styles, focus indicators, and high-contrast theme support. Use when registering colors, styling widgets with the",0,0],
    ["validate-ui-scenario","Use when reproducing a UI bug or verifying a fix by driving a real VS Code window end to end and capturing evidence. Writes a scenario file, runs it a",0,0],
    ["vscode-dev-workbench","Use when the user wants to run the vscode.dev server locally and exercise the VS Code workbench or Agents window in the integrated browser against the",0,0],
  ];
  for (const [n, d, manual, hidden] of SKILLS) {
    if (!n) continue;
    add({ id: "s-" + n, type: "skill", name: n, path: `.github/skills/${n}/SKILL.md`, src: "repo", desc: d,
      modelInvocable: !manual, userInvocable: !hidden,
      harness: H("yes", "yes", "no", "Codex reads .agents/skills — this skill lives in .github/skills") });
  }
  add({ id: "s-launch", type: "skill", name: "launch", path: ".agents/skills/launch/SKILL.md", src: "repo", modelInvocable: true, userInvocable: true,
    desc: "Launch Code OSS into an isolated throwaway profile with unique debug ports, drive it with @playwright/cli and attach a debugger.",
    harness: H("yes", "yes", "yes") });
  add({ id: "s-launch-claude", type: "skill", name: "launch", path: ".claude/skills/launch/SKILL.md", src: "repo", modelInvocable: true, userInvocable: true,
    duplicateOf: "s-launch", desc: "Same skill, Claude Code's copy.",
    harness: H("skipped", "skipped", "no", "Same name as .agents/skills/launch, which is found first — skipped as a duplicate") });
  add({ id: "s-standup", type: "skill", name: "standup-notes", path: "~/.copilot/skills/standup-notes/SKILL.md", src: "user", modelInvocable: false, userInvocable: true,
    desc: "Summarize yesterday's merged PRs and today's open reviews as standup notes.", harness: H("yes", "convert", "no") });
  add({ id: "s-prdesc", type: "skill", name: "pr-description", path: "~/.copilot/skills/pr-description/SKILL.md", src: "user", modelInvocable: true, userInvocable: true,
    desc: "Write PR descriptions in my voice: problem, approach, screenshots, test plan.", harness: H("yes", "convert", "no") });
  add({ id: "s-secure-dev", type: "skill", name: "secure-development", path: "Security & Code Quality", src: "plugin", via: "p-security", locked: "required", modelInvocable: true, userInvocable: true,
    desc: "Threat-model new features, check input validation, and review crypto and secret handling." });
  add({ id: "s-address-pr", type: "skill", name: "address-pr-comments", path: "GitHub Pull Requests", src: "plugin", via: "p-ghpr", modelInvocable: true, userInvocable: true,
    desc: "Work through unresolved review threads on the current pull request and reply when done." });
  add({ id: "s-ds-audit", type: "skill", name: "design-system-audit", path: "Sprue", src: "plugin", via: "p-sprue", modelInvocable: true, userInvocable: true,
    desc: "Audit a codebase into a Sprue design system: tokens, components and captures.", harness: H("yes", "yes", "no") });
  add({ id: "s-agent-cust", type: "skill", name: "agent-customization", path: "Built-in", src: "builtin", modelInvocable: true, userInvocable: false,
    desc: "Helps the agent create and edit instructions, skills, agents and hooks in the right place.", harness: H("yes", "no", "no") });

  /* ── Agents ───────────────────────────────────────────────────── */
  add({ id: "a-data", type: "agent", name: "Data", path: ".github/agents/data.md", src: "repo",
    desc: "Answer telemetry questions with data queries using Kusto Query Language (KQL).",
    tools: ["vscode/extensions", "execute/runInTerminal", "read/readFile", "search", "azure-mcp/kusto_query", "todo", "ms-vscode.kusto-client/kusto", "ms-vscode.kusto-client/kustoQueryExecution"],
    harness: H("yes", "convert", "no", "Claude Code reads .claude/agents") , status: "warn", statusText: "1 listed tool isn't available (azure-mcp isn't installed)" });
  add({ id: "a-reviewer", type: "agent", name: "Reviewer", path: "~/.copilot/agents/reviewer.agent.md", src: "user",
    desc: "Reviews the current diff like the VS Code team: correctness, disposables, layering, accessibility.", model: "Claude Opus 5.5",
    tools: ["read", "search", "github/*"], handoffs: [{ label: "Fix these", agent: "default" }], harness: H("yes", "convert", "no") });
  add({ id: "a-secrev", type: "agent", name: "security-reviewer", path: "Security & Code Quality", src: "plugin", via: "p-security", locked: "required",
    desc: "Reviews changes for injection, auth and secret-handling issues; runs Semgrep.", tools: ["read", "search", "semgrep/*"], userInvocable: false });

  /* ── Prompts ──────────────────────────────────────────────────── */
  add({ id: "pr-release", type: "prompt", name: "release-notes", path: "~/Library/.../prompts/release-notes.prompt.md", src: "user",
    desc: "Draft release notes from the milestone's closed issues.", harness: H("no", "convert", "no", "Copilot CLI doesn't read prompt files — convert to a skill to keep /release-notes") });

  /* ── Hooks ────────────────────────────────────────────────────── */
  add({ id: "h-cloud", type: "hook", name: "cloud-sandbox", path: ".github/hooks/cloud-sandbox.json", src: "repo", event: "sessionStart", eventLabel: "a session starts",
    command: "node build/npm/cloudSandboxSetup.ts --agent-pid \"$PPID\"", condition: "only in a Linux cloud sandbox (GITHUB_ENVIRONMENT_ID set)", timeout: "30 min",
    desc: "Sets up the cloud sandbox environment.", harness: H("yes", "convert", "no", "Copilot hook format; Claude Code reads hooks from .claude/settings.json") });
  add({ id: "h-build", type: "hook", name: "build", path: ".github/hooks/build.json.disabled", src: "repo", event: "agentStop", eventLabel: "the agent finishes",
    command: "node .github/hooks/scripts/worktree-build-fast.ts", timeout: "5 min", enabled: false,
    desc: "Fast worktree build after the agent stops (disabled by file name).", harness: H("yes", "convert", "no") });
  add({ id: "h-semgrep", type: "hook", name: "semgrep-on-edit", path: "Security & Code Quality", src: "plugin", via: "p-security", locked: "required", event: "postToolUse", matcher: "edit", eventLabel: "the agent edits a file",
    command: "semgrep scan --config p/ci ${file}", desc: "Scans each edited file with Semgrep.", harness: H("yes", "yes", "no") });

  /* ── Tools: built-in tool sets, MCP servers, connectors, extensions ─ */
  const builtinSets = [
    ["edit", "Edit files", 6, "Create and edit files in the workspace"],
    ["execute", "Terminal", 4, "Run commands in a terminal"],
    ["read", "Read", 5, "Read files, problems and terminal output"],
    ["search", "Search", 4, "Search files, text and symbols"],
    ["web", "Web fetch", 2, "Fetch web pages"],
    ["todo", "Todos", 1, "Track work as a todo list"],
    ["vscode", "VS Code", 7, "Commands, extensions, settings and the integrated browser"],
  ];
  for (const [id, n, c, d] of builtinSets) add({ id: "t-" + id, type: "toolset", name: n, toolId: id, src: "builtin", tools: c, desc: d, reach: id === "execute" ? "machine" : "workspace" });

  add({ id: "m-github", type: "mcp", name: "GitHub", src: "org", locked: "required", transport: "http", url: "https://api.githubcopilot.com/mcp/", reach: "online",
    state: { configured: true, trusted: true, enabled: true, auth: "signed-in", running: true }, tools: 41, account: "hawkticehurst",
    desc: "Issues, pull requests, code search and Actions on GitHub." });
  add({ id: "m-playwright", type: "mcp", name: "Playwright", src: "user", transport: "stdio", command: "npx @playwright/mcp@latest", path: "~/Library/.../mcp.json", reach: "machine",
    state: { configured: true, trusted: true, enabled: true, auth: "none", running: false }, tools: 21, statusText: "Starts when a tool is first used",
    desc: "Drive a browser: navigate, click, type and take screenshots." });
  add({ id: "m-sprue", type: "mcp", name: "Sprue", src: "plugin", via: "p-sprue", transport: "stdio", command: "sprue mcp", reach: "machine",
    state: { configured: true, trusted: true, enabled: true, auth: "none", running: true }, tools: 70, desc: "Create and review design prototypes." });
  add({ id: "m-semgrep", type: "mcp", name: "Semgrep", src: "plugin", via: "p-security", locked: "required", transport: "stdio", command: "semgrep mcp", reach: "machine",
    state: { configured: true, trusted: true, enabled: true, auth: "env", running: false }, tools: 6, status: "warn", statusText: "Needs SEMGREP_APP_TOKEN",
    desc: "Static analysis with Semgrep rules." });
  add({ id: "m-browsertools", type: "mcp", name: "browser-tools", src: "user", transport: "stdio", command: "npx browser-tools-mcp", path: "~/Library/.../mcp.json", reach: "machine",
    state: { configured: true, trusted: true, enabled: true, auth: "none", running: false }, tools: 9, locked: "blocked", status: "blocked", statusText: "Not on microsoft's MCP allowlist",
    desc: "Read console logs and network requests from a browser extension." });
  add({ id: "c-slack", type: "connector", name: "Slack", src: "user", reach: "online", state: { configured: true, trusted: true, enabled: true, auth: "signed-in", running: true }, tools: 8, account: "Microsoft workspace",
    desc: "Search messages and channels, read threads, post messages." });
  add({ id: "c-workiq", type: "connector", name: "Work IQ", src: "org", locked: "required", reach: "online", state: { configured: true, trusted: true, enabled: true, auth: "signed-in", running: true }, tools: 12,
    desc: "Your Microsoft 365 work context: mail, meetings, documents and people." });
  add({ id: "c-figma", type: "connector", name: "Figma", src: "user", reach: "online", state: { configured: true, trusted: true, enabled: true, auth: "signed-out", running: false }, tools: 7, status: "warn", statusText: "Sign in to connect",
    desc: "Read frames, components and variables from Figma files." });
  add({ id: "e-kusto", type: "extension", name: "Kusto Explorer", publisher: "ms-vscode", extId: "ms-vscode.kusto-client", src: "extension", reach: "online", tools: 2,
    desc: "Run Kusto queries and check query execution." });
  add({ id: "e-ghpr", type: "extension", name: "GitHub Pull Requests", publisher: "GitHub", extId: "github.vscode-pull-request-github", src: "extension", reach: "online", tools: 9,
    desc: "Read pull requests, review threads, notifications and issues." });

  /* ── Plugins ──────────────────────────────────────────────────── */
  add({ id: "p-security", type: "plugin", name: "Security & Code Quality", src: "org", locked: "required", version: "2.3.0", update: "2.4.0", marketplace: "microsoft/agent-plugins",
    contributes: ["s-secure-dev", "a-secrev", "h-semgrep", "m-semgrep"], status: "update", statusText: "Update available: 2.4.0",
    desc: "Secure-by-default reviews, Semgrep scanning and a security reviewer agent, managed by your organization." });
  add({ id: "p-ghpr", type: "plugin", name: "GitHub Pull Requests", src: "user", version: "1.8.2", marketplace: "github/awesome-copilot", contributes: ["s-address-pr"],
    desc: "Skills for working through review feedback on pull requests." });
  add({ id: "p-sprue", type: "plugin", name: "Sprue", src: "user", version: "0.9.0", marketplace: "Local · ~/Code/sprue", contributes: ["s-ds-audit", "m-sprue", "cv-proto"],
    desc: "Design prototypes, systems and reviews, with an MCP server and a prototype canvas." });

  /* ── Automations and canvases ─────────────────────────────────── */
  add({ id: "au-triage", type: "automation", name: "Triage new issues", src: "user", schedule: "Weekdays at 9:00", agent: "default", skill: "s-issue-grouping", target: "vscode · worktree",
    desc: "Group new issues from the last day and draft labels.", lastRun: "Today 9:00 · 14 issues grouped", harness: H("yes", "no", "no", "Automations run on the Copilot agent host") });
  add({ id: "au-perf", type: "automation", name: "Chat perf check", src: "user", schedule: "Mondays at 8:00", skill: "s-chat-perf", target: "vscode · worktree",
    desc: "Run the chat perf benchmark against Insiders and report regressions.", lastRun: "Mon 8:00 · no regressions", harness: H("yes", "no", "no") });
  add({ id: "cv-proto", type: "canvas", name: "Prototype viewer", src: "plugin", via: "p-sprue", desc: "Shows Sprue prototypes the agent builds, side by side with the chat.",
    harness: H("yes", "no", "no", "Canvases are a Copilot CLI feature") });
  add({ id: "cv-inspector", type: "canvas", name: "Agent Inspector", src: "builtin", desc: "Live view of the agent's plan, tool calls and context window.", harness: H("yes", "no", "no") });

  const byId = Object.fromEntries(items.map((i) => [i.id, i]));

  // Organization policy (customizationOrganizationPolicy.ts: required items, MCP allowlist, strict marketplaces).
  const ORG = {
    name: "microsoft",
    required: ["m-github", "c-workiq", "p-security", "ms-security"],
    mcpPolicy: "allowlist",
    blocked: ["m-browsertools"],
    marketplaces: ["microsoft/agent-plugins", "github/awesome-copilot"],
  };

  // Probe files used by "what applies here" interactions.
  const FILES = [
    "src/vs/workbench/contrib/chat/browser/aiCustomization/customizationCardList.ts",
    "src/vs/workbench/contrib/chat/browser/aiCustomization/media/aiCustomizationManagement.css",
    "src/vs/workbench/contrib/chat/test/browser/aiCustomization/customizationCardList.test.ts",
    "src/vs/sessions/contrib/automations/browser/automationDialog.ts",
    "src/vs/platform/agentHost/common/state/protocol/state.ts",
    "build/next/index.ts",
    "README.md",
  ];

  // Minimal glob matcher: **, *, {a,b}.
  function globToRegExp(glob) {
    let re = "", i = 0;
    while (i < glob.length) {
      const c = glob[i];
      if (c === "*") {
        if (glob[i + 1] === "*") { re += glob[i + 2] === "/" ? "(?:.*/)?" : ".*"; i += glob[i + 2] === "/" ? 3 : 2; continue; }
        re += "[^/]*";
      } else if (c === "{") {
        const end = glob.indexOf("}", i);
        if (end < 0) { re += "\\{"; i++; continue; }
        re += "(?:" + glob.slice(i + 1, end).split(",").map((p) => globToRegExp(p).source.slice(1, -1)).join("|") + ")";
        i = end + 1; continue;
      } else if (".+^$()|[]\\".includes(c)) re += "\\" + c;
      else re += c;
      i++;
    }
    return new RegExp("^" + re + "$");
  }
  const matches = (glob, file) => glob.split(/,(?![^{]*\})/).some((g) => globToRegExp(g.trim()).test(file));

  // Plain-language description of an applyTo glob.
  function describeGlob(g) {
    const map = {
      "**": "any file",
      "src/vs/**": "VS Code source (src/vs)",
      "**/*.css": "CSS files",
      "src/vs/**/*.css": "CSS in src/vs",
      "src/vs/**/browser/**/*.{ts,css}": "browser UI code",
      "src/vs/sessions/**": "the Agents window (src/vs/sessions)",
      "src/vs/platform/agentHost/**": "the Agent Host",
      "src/vs/platform/agentHost/{browser,common}/**": "Agent Host browser & common code",
      "build/next/**": "the new build (build/next)",
      "src/vs/workbench/contrib/chat/browser/aiCustomization/**": "the Customizations editor",
      "src/vs/**/*{Tool,Tools}.ts": "language model tools (*Tool.ts)",
      "{src/vs/**/test/**,src/vs/**/*.test.ts,src/vs/**/*.integrationTest.ts}": "tests",
      "src/vs/sessions/contrib/automations/browser/automationDialog*": "the Automations dialog",
      "{ThirdPartyNotices.txt,cglicenses.json,cgmanifest.json}": "license manifests",
      "build/azure-pipelines/{oss/**,common/downloadNotice.ts}": "OSS pipeline notices",
    };
    return map[g] || g;
  }

  function supported(item, harness) {
    const v = (item.harness || {})[harness] || "yes";
    return v === "yes" || v === "partial";
  }

  window.CZ = { HARNESSES, SOURCES, TYPES, ORG, FILES, items, byId, matches, describeGlob, supported, workspace: { name: "vscode", repo: "microsoft/vscode", branch: "main" } };
})();
