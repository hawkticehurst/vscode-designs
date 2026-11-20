/* V10 — Progressive. V9's model (environments × agents, global Configure vs. session Customize), shown so it scales:
   - Level 0, a row: one plain summary of where it's installed ("Everywhere", "All but mac-mini-2", "This Computer only").
   - Level 1, open (click the row): the item itself, like the product's embedded detail views: file content for prompt
     files, status, errors, output, configuration and tools for connections, and what a plugin includes.
   - Environment lens: pick one environment and every row says what's true there.
   - Installing asks Everywhere / Only here / This Computer / Choose…, and agents only when you ask for them.
   Every page groups by scope like the customizations editor rework (Workspace · folder, User, Built-in), with items from
   a plugin, extension or organization flattened into their scope and ordered by source, and the agent's own items tagged in Built-in.
   An environment can stay synced with another (hawks-framework with This Computer), so most installs don't need choosing. */
import { store } from "./scope-store.js";
import { openMenu, toast } from "./panel-shell.js";
import { ENVS, AGENTS, CONNECTIONS, USER_SKILLS, PLUGINS, K, split, ALL_SLOTS, iconHtml, plural, sessions, slotOf, placeLabel, changed, subs, countsFor, envOf, hooks, EXTRA_SKILLS, setInstallImpl, openInstall, agentsIn } from "./env.js?v=12";
import { CONNECTOR_INFO, DISCOVER_INFO, MCP_ENV, MCP_HEADERS } from "./detail-data.js?v=1";
const { esc } = window.CUST;
const { HARNESSES, WORKSPACES, workspaceLabel, items: ALL, worksWith } = window.SCOPE;
const CONTENT = window.CUSTOMIZATION_CONTENT || {};
const ICONS = "assets/icons/";
const S = (...ks) => new Set(ks);

// ---------- Types ----------
const TYPES = {
  connectors: { label: "Connectors", one: "connector", icon: "plug", desc: "Apps and accounts agents can work in, like Slack and Microsoft 365." },
  mcp: { label: "MCP Servers", one: "MCP server", icon: "server", desc: "Servers that give agents tools: local commands, remote endpoints and servers that come with plugins." },
  skills: { label: "Skills", one: "skill", icon: "ai-customization-skill", desc: "Workflows agents follow when your task matches." },
  plugins: { label: "Plugins", one: "plugin", icon: "ai-customization-plugin", desc: "Bundles of skills, connections, agents and hooks." },
  instructions: { label: "Instructions", one: "instruction", icon: "ai-customization-instructions", desc: "Guidance added to the agent's context." },
  agents: { label: "Agents", one: "agent", icon: "ai-customization-agent", desc: "Agents with their own instructions, tools and model." },
  hooks: { label: "Hooks", one: "hook", icon: "ai-customization-hook", desc: "Commands that run at set points while an agent works." },
  tools: { label: "Tools", one: "tool set", icon: "tools", desc: "Tools agents can call. Turned-off tools aren't shown to the agent." },
  canvases: { label: "Canvases", one: "canvas", icon: "preview", desc: "Interactive views an agent can open next to the chat." },
};
const isConn = (t) => t === "connectors" || t === "mcp";
/** Whether an agent can use a type at all (Claude reads CLAUDE.md, not instructions; Codex has no agents or hooks; plugins load in Copilot). */
const canUse = (it, a) => {
  const t = it.kind === "connection" ? "mcp" : it.kind === "skill" ? "skills" : it.kind === "plugin" ? "plugins" : it.kind;
  return !HARNESSES[a].unsupported[t];
};

// ---------- More sources: plugins, extensions and your organization ----------
const PLUGIN = PLUGINS[0];
PLUGINS.push({ kind: "plugin", id: "jira", name: "Jira Sprint Dashboard", icon: { img: "atlassian-labs-jira.png" }, sub: "A canvas for Jira sprints", at: S("local:copilot"), card: "Jira Sprint Dashboard" });
const JIRA = PLUGINS[1];
const extSlots = (envs) => new Set(ENVS.filter((e) => envs.includes(e.id)).flatMap((e) => e.agents.map((a) => K(e.id, a))));
const SRC = {
  security: { kind: "plugin", id: "security", label: PLUGIN.name, icon: "ai-customization-plugin", tag: "Plugin", slots: () => PLUGIN.at, plugin: PLUGIN },
  jira: { kind: "plugin", id: "jira", label: JIRA.name, icon: "ai-customization-plugin", tag: "Plugin", slots: () => JIRA.at, plugin: JIRA },
  "github-pr": { kind: "extension", id: "github-pr", label: "GitHub Pull Requests", icon: "extensions", tag: "Extension", slots: () => extSlots(["local", "devbox-1", "hawks-framework"]) },
  foundry: { kind: "extension", id: "foundry", label: "Microsoft Foundry Canvas", icon: "extensions", tag: "Extension", slots: () => extSlots(["local"]) },
  microsoft: { kind: "account", id: "microsoft", label: "microsoft", icon: "organization", tag: "Organization", slots: () => new Set(ALL_SLOTS) },
};
const srcWhere = (src) => (src.kind === "account" ? "Follows your account" : src.kind === "extension" ? `With the extension · ${whereText(envsOf(src.slots()))}` : whereText(envsOf(src.slots())));
// Connectors are accounts (Copilot Connectors); the rest are MCP servers. Sprue's server is stopped (rows offer Start).
for (const id of ["slack", "workiq"]) CONNECTIONS.find((c) => c.id === id).connector = true;
CONNECTIONS.find((c) => c.id === "sprue").state = "stopped";
// A connection that comes with the security plugin: it goes wherever the plugin does.
// Servers a repo brings with it (its .vscode/mcp.json): they show only when that workspace is picked.
CONNECTIONS.push(
  { kind: "connection", id: "context7", name: "Context7", icon: { img: "context7.png" }, workspace: "vscode-copilot-chat", account: null, does: "Up-to-date library docs", at: S("local:copilot", "local:claude", "devbox-1:copilot", "cloud:copilot"), def: "on" },
  { kind: "connection", id: "huggingface", name: "Hugging Face", workspace: "ml-experiments", account: "hawkticehurst", does: "Search models and datasets", at: S("hawks-framework:claude", "hawks-framework:codex"), def: "on" },
  { kind: "connection", id: "xcodebuild", name: "XcodeBuildMCP", workspace: "ios-companion", account: null, does: "Build and run on the simulator", at: S("mac-mini-1:copilot"), def: "on" },
);
CONNECTIONS.push({ kind: "connection", id: "semgrep", name: "Semgrep", origin: SRC.security, account: null, does: "Static analysis for security issues", get at() { return PLUGIN.at; }, set at(v) {}, def: "on" });
// Organization and extension skills show in a session's panel where they're available.
EXTRA_SKILLS.push(
  { type: "skills", name: "secure-development", source: "user", origin: { kind: "account", label: "microsoft" } },
  { type: "skills", name: "ado-pipelines", source: "user", origin: { kind: "account", label: "microsoft" } },
  { type: "skills", name: "address-pr-comments", source: "user", origin: { kind: "extension", label: "GitHub Pull Requests" }, envs: ["local", "devbox-1", "hawks-framework"] },
);
// Your instructions, agents and hooks are installed per machine and agent, like your skills.
const USER_FILES = {};
for (const t of ["instructions", "agents", "hooks"]) USER_FILES[t] = ALL.filter((it) => it.type === t && it.source === "user").map((it) => {
  const o = { kind: t, id: it.name, name: it.name, path: it.path, at: new Set() };
  for (const e of ["local", "devbox-1", "hawks-framework"]) for (const a of envOf(e).agents) if (canUse(o, a) && (e === "local" || a === "copilot")) o.at.add(K(e, a));
  return o;
});
const ORG_FILES = {
  instructions: [{ name: "microsoft-security.instructions.md", path: "github/microsoft/instructions/microsoft-security.instructions.md" }],
  agents: [{ name: "1es-assistant", path: "github/microsoft/agents/1es-assistant.agent.md" }],
};
// Tool sets and their tools. GitHub, Playwright and Slack are those servers' real tool names; Copilot's are the CLI's own.
const GH_TOOLS = ["actions_get", "actions_list", "add_issue_comment", "assign_copilot_to_issue", "create_branch", "create_or_update_file", "create_pull_request", "get_commit", "get_file_contents", "get_job_logs",
  "get_me", "issue_read", "issue_write", "list_branches", "list_commits", "list_issues", "list_pull_requests", "list_releases", "merge_pull_request", "pull_request_read", "pull_request_review_write",
  "push_files", "request_copilot_review", "search_code", "search_issues", "search_pull_requests", "search_repositories", "search_users", "sub_issue_write", "update_pull_request"];
const PW_TOOLS = ["browser_click", "browser_close", "browser_console_messages", "browser_drag", "browser_evaluate", "browser_file_upload", "browser_fill_form", "browser_handle_dialog", "browser_hover", "browser_install",
  "browser_navigate", "browser_navigate_back", "browser_network_requests", "browser_press_key", "browser_resize", "browser_select_option", "browser_snapshot", "browser_tabs", "browser_take_screenshot", "browser_type", "browser_wait_for"];
const SLACK_TOOLS = ["slack_add_reaction", "slack_create_canvas", "slack_list_channels", "slack_read_canvas", "slack_read_channel", "slack_read_file", "slack_read_thread", "slack_read_user_profile",
  "slack_schedule_message", "slack_search_channels", "slack_search_public", "slack_search_users", "slack_send_message", "slack_update_canvas"];
const TOOL_DESC = { search_issues: "Search issues across GitHub", issue_write: "Create or update an issue", create_pull_request: "Open a pull request", merge_pull_request: "Merge a pull request",
  browser_navigate: "Navigate to a URL", browser_evaluate: "Run JavaScript in the page", slack_send_message: "Post a message to a channel or DM", slack_read_thread: "Read a thread's replies",
  bash: "Run shell commands", edit: "Edit files", web_fetch: "Fetch a URL" };
const TOOLSETS = {
  user: [
    { id: "github", name: "GitHub", conn: "github", tools: GH_TOOLS },
    { id: "playwright", name: "Playwright", conn: "playwright", tools: PW_TOOLS },
    { id: "slack", name: "Slack", conn: "slack", tools: SLACK_TOOLS },
  ],
  extension: [{ id: "gh-pr", name: "GitHub Pull Requests", origin: "github-pr", tools: ["activePullRequest", "openPullRequest", "copilot-coding-agent", "issue_fetch", "doSearch"] }],
  builtin: [
    { id: "copilot", name: "Copilot", tag: "Copilot", locked: true, tools: ["bash", "create", "edit", "glob", "grep", "list_agents", "list_bash", "read_agent", "read_bash", "report_intent", "sql", "stop_bash", "task", "view", "web_fetch", "write_agent", "write_bash"] },
    { id: "vscode", name: "VS Code", tools: ["runVscodeCommand"] },
    { id: "browser", name: "Integrated Browser", tools: ["openBrowserPage", "navigatePage", "readPage", "screenshotPage", "clickElement", "typeInPage", "hoverElement", "dragElement", "handleDialog", "runPlaywrightCode"] },
    { id: "automations", name: "Automations", tools: ["listAutomations", "configureAutomation", "runAutomation", "deleteAutomation"] },
    { id: "sessions", name: "Sessions List", tools: ["readSessionsList", "organizeSessionsList"] },
  ],
};
for (const t of Object.values(TOOLSETS).flat()) t.count = t.tools.length;
// Turned-off tools, per set; a set's switch turns all of its tools on or off. Slack's write tools start off.
const toolsOff = new Map([["slack", new Set(["slack_send_message", "slack_schedule_message", "slack_update_canvas", "slack_create_canvas"])]]);
const offIn = (setId) => { if (!toolsOff.has(setId)) toolsOff.set(setId, new Set()); return toolsOff.get(setId); };
const enabledCount = (t) => t.locked ? t.count : t.tools.filter((x) => !offIn(t.id).has(x)).length;
const CANVASES = [
  { id: "inspector", name: "Agent Inspector", origin: "foundry", does: "Test and debug Microsoft Foundry hosted agents." },
  { id: "sprint", name: "Sprint Dashboard", origin: "jira", does: "Issues in open sprints, by flow, owner load and priority." },
];
// MCP server details: definitions, tools and output (illustrative; Playwright's are the real package and tool names).
const MCP = {
  github: { file: "~/.copilot/mcp-config.json", def: { type: "http", url: "https://api.githubcopilot.com/mcp/" } },
  slack: { file: "Copilot Connectors", def: { type: "http", url: CONNECTOR_INFO.slack.url } },
  figma: { file: "~/.copilot/mcp-config.json", def: { type: "http", url: "https://mcp.figma.com/mcp" } },
  workiq: { file: "Copilot Connectors", def: { type: "http", url: CONNECTOR_INFO.workiq.url } },
  kusto: { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: "npx", args: ["-y", "@azure/mcp@latest", "server", "start", "--namespace", "kusto"] },
    error: "Process exited with code 1. Error: connect ECONNREFUSED 127.0.0.1:47011",
    output: ["10:41:12.204 [info] Starting server Azure Data Explorer", "10:41:12.871 [info] Connection state: Starting", "10:41:13.019 [warning] Failed to read cached token; signing in again", "10:41:13.402 [error] Error: connect ECONNREFUSED 127.0.0.1:47011", "10:41:13.403 [info] Connection state: Error Process exited with code 1"] },
  playwright: { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: "npx", args: ["@playwright/mcp@latest"] }, compat: { cloud: "Cloud sessions can't run a local browser server." } },
  sprue: { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: "sprue", args: ["mcp"] } },
  context7: { file: "vscode-copilot-chat/.vscode/mcp.json", def: { type: "http", url: "https://mcp.context7.com/mcp" } },
  huggingface: { file: "ml-experiments/.vscode/mcp.json", def: { type: "http", url: "https://huggingface.co/mcp" } },
  xcodebuild: { file: "ios-companion/.vscode/mcp.json", def: { type: "stdio", command: "npx", args: ["-y", "xcodebuildmcp@latest"] } },
  semgrep: { file: "~/.copilot/installed-plugins/security-best-practices/.mcp.json", def: { type: "stdio", command: "semgrep", args: ["mcp"] } },
};
for (const [id, list] of Object.entries(MCP_ENV)) MCP[id].def.env = Object.fromEntries(list);
for (const [id, list] of Object.entries(MCP_HEADERS)) MCP[id].def.headers = Object.fromEntries(list);
const TOOLS_OF = { github: TOOLSETS.user[0], playwright: TOOLSETS.user[1], slack: TOOLSETS.user[2] };
const OUTPUT_DEFAULT = (c) => [`10:02:41.118 [info] Starting server ${c.name}`, "10:02:41.592 [info] Connection state: Running", `10:02:41.884 [info] Discovered ${TOOLS_OF[c.id]?.count || 8} tools`];
// What your own skills say (the descriptions of the real ones); the rest are placeholders.
const SKILL_DESC = {
  "comparison-screenshot": "Create or validate a polished composite Before/After screenshot from authentic UI captures using the standard Pillow layout. Use for visual issue evidence and pull request comparisons.",
  "end-of-day-pr-report": "Generate an end-of-day report for closed microsoft/vscode pull requests and collect the comparison images already embedded in their descriptions.",
  grilling: "Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking.",
  "local-section-repro": "A harmless personal skill for reproducing the Local section in the Skills page.",
  "vscode-issue-dispatcher": "Discover, classify, and dispatch configured-assignee issues from a configured repository into isolated Agents-window sessions.",
  "vscode-worktree-bootstrap": "Prepare or repair a Microsoft VS Code source checkout or worktree when dependency readiness is actually needed.",
};
function contentOf(r) {
  if (r.path && CONTENT[r.path]) return CONTENT[r.path];
  if (r.type === "hooks") return JSON.stringify({ hooks: { PreToolUse: [{ matcher: "edit|create", command: "./scripts/guard-secrets.sh" }] } }, null, 2);
  const desc = SKILL_DESC[r.name] || (r.scope === "builtin" ? `Built-in ${TYPES[r.type].one} that comes with ${r.tag || "the Agents window"}.` : `When agents should use this ${TYPES[r.type].one}.`);
  return `---\nname: ${r.name.replace(/\.(instructions|agent)\.md$/, "")}\ndescription: ${desc}\n---\n\n# ${r.name.replace(/\.(instructions|agent)\.md$/, "")}\n\n${r.type === "skills" ? "## Steps\n\n1. …\n2. …" : "…"}`;
}

// ---------- Rows: every page's items, grouped by scope with contributed items flattened ----------
const envsOf = (slots) => ENVS.filter((e) => e.agents.some((a) => slots.has(K(e.id, a))));
function whereText(envs) {
  if (!envs.length) return "Not installed";
  const missing = ENVS.filter((e) => !envs.includes(e));
  if (!missing.length) return "Everywhere";
  if (envs.length === 1) return `${envs[0].label} only`;
  if (missing.length <= 2) return `All but ${missing.map((e) => e.label).join(", ")}`;
  return `${envs.length} of ${ENVS.length} environments`;
}
const iconFor = (r, size = 20) => (!(isConn(r.type) || r.type === "plugins") ? "" : r.item?.icon ? iconHtml(r.item, size) : `<span class="ev-logo ev-logo-glyph" style="width:${size}px;height:${size}px"><span class="codicon codicon-${TYPES[r.type].icon}"></span></span>`);
/** { groups: [{ id, label, icon, note, rows, sources: [] }] } */
function model(type, workspace = store.scope.workspace) {
  const g = (id, label, icon, note) => ({ id, label, icon, note, rows: [], sources: new Map() });
  const user = g("user", "User", "account", "");
  const activeWorkspace = WORKSPACES[workspace] ? workspace : null;
  const wsGroups = activeWorkspace ? [{ ...g("ws:" + activeWorkspace, `Workspace · ${workspaceLabel(activeWorkspace)}`, "folder", "Follows the repo"), workspace: activeWorkspace }] : [];
  const builtin = g("builtin", "Built-in", "vscode-insiders", "");
  const add = (grp, r) => grp.rows.push(r);
  const fromScope = (it, extra = {}) => ({ type, key: `${it.source}:${it.workspace || ""}:${it.name}`, name: it.name, path: it.path, scope: it.source === "workspace" ? "workspace" : it.source === "builtin" ? "builtin" : "user", workspace: it.workspace, tag: it.source === "builtin" && it.copilotOnly ? "Copilot" : "", raw: it, ...extra });
  if (isConn(type)) for (const c of CONNECTIONS.filter((x) => type === "mcp" || !!x.connector)) {
    const workspaceGroup = c.workspace && wsGroups.find((x) => x.workspace === c.workspace);
    add(workspaceGroup || user, { type, key: c.id, name: c.name, item: c, scope: workspaceGroup ? "workspace" : "user", workspace: workspaceGroup?.workspace, origin: c.origin, editable: !c.origin, path: MCP[c.id]?.file });
  }
  if (type === "plugins") for (const p of PLUGINS) add(user, { type, key: p.id, name: p.name, item: p, scope: "user", editable: true, sub: p.sub });
  if (type === "skills") {
    for (const s of USER_SKILLS) add(user, { type, key: "user::" + s.name, name: s.name, item: s, path: s.path, scope: "user", editable: true });
    for (const it of ALL.filter((x) => x.type === "skills" && x.source === "plugin")) add(user, fromScope(it, { origin: SRC.security }));
    for (const x of EXTRA_SKILLS) add(user, { type, key: "x::" + x.name, name: x.name, scope: "user", origin: x.origin.kind === "account" ? SRC.microsoft : SRC["github-pr"] });
  }
  if (["instructions", "agents", "hooks"].includes(type)) {
    for (const o of USER_FILES[type]) add(user, { type, key: "user::" + o.name, name: o.name, item: o, path: o.path, scope: "user", editable: true });
    for (const it of ALL.filter((x) => x.type === type && x.source === "plugin")) add(user, fromScope(it, { origin: SRC.security }));
    for (const o of ORG_FILES[type] || []) add(user, { type, key: "org::" + o.name, name: o.name, path: o.path, scope: "user", origin: SRC.microsoft });
  }
  if (["skills", "instructions", "agents", "hooks"].includes(type)) {
    for (const w of wsGroups) for (const it of ALL.filter((x) => x.type === type && x.source === "workspace" && x.workspace === w.workspace)) add(w, fromScope(it));
    for (const it of ALL.filter((x) => x.type === type && x.source === "builtin")) add(builtin, fromScope(it));
  }
  if (type === "tools") {
    for (const t of TOOLSETS.user) add(user, { type, key: t.id, name: t.name, tools: t, scope: "user", conn: CONNECTIONS.find((c) => c.id === t.conn) });
    for (const t of TOOLSETS.extension) add(user, { type, key: t.id, name: t.name, tools: t, scope: "user", origin: SRC[t.origin] });
    for (const t of TOOLSETS.builtin) add(builtin, { type, key: t.id, name: t.name, tools: t, scope: "builtin", tag: t.tag || "" });
  }
  if (type === "canvases") for (const c of CANVASES) add(user, { type, key: c.id, name: c.name, scope: "user", origin: SRC[c.origin], sub: c.does });
  const groups = [...wsGroups, user, builtin].filter((x) => x.rows.length || x.sources.size || x.workspace === workspace || x.id === "user");
  for (const x of groups) {
    x.rows.sort((a, b) => {
      if (!!a.origin !== !!b.origin) return a.origin ? 1 : -1;
      const bySource = (a.origin?.label || "").localeCompare(b.origin?.label || "");
      return bySource || a.name.localeCompare(b.name);
    });
    x.sources = [];
  }
  return { groups };
}
const allRows = (type, workspace) => model(type, workspace).groups.flatMap((g) => [...g.rows, ...g.sources.flatMap((s) => s.rows)]);
/** Slots where a row is available: its own installs, its source's, the repo's environments, or the agent's. */
function slotsOf(r) {
  if (r.conn) return r.conn.at;
  if (r.item && r.editable) return r.item.at;
  if (r.origin) return r.origin.slots();
  if (r.scope === "workspace") return new Set(ENVS.filter((e) => e.workspaces.includes(r.workspace)).flatMap((e) => agentsIn(e, r.workspace).filter((a) => canUse({ kind: r.type }, a)).map((a) => K(e.id, a))));
  if (r.scope === "builtin") return new Set(ALL_SLOTS.filter((k) => (r.tag ? split(k)[1] === "copilot" : true) && (!r.raw || worksWith(r.raw, split(k)[1]))));
  return new Set();
}
const groupWhere = (grp) => (grp.workspace ? `Follows the repo · ${whereText(ENVS.filter((e) => e.workspaces.includes(grp.workspace)))}` : grp.id === "builtin" ? "Comes with each agent" : "");

// ---------- Install: Everywhere / Only here / This Computer / Choose… ----------
let sheet = null;
const closeSheet = () => { sheet?.remove(); sheet = null; };
function progressiveInstall(opts) {
  closeSheet();
  const { items, mode } = opts, single = items.length === 1, it0 = items[0];
  const here = opts.here && envOf(split(opts.here)[0]) ? opts.here : null;
  const st = { where: "local", envSel: new Set(), perEnv: new Map(), agents: null, showAgents: false, picked: new Set(items.map((x) => x.id)), wsMode: "user", wsSel: new Set(WORKSPACES[store.scope.workspace] ? [store.scope.workspace] : []), pol: it0.kind === "connection" ? (it0.def || "on") : null };
  const usable = (e) => e.agents.filter((a) => items.some((it) => canUse(it, a)));
  if (mode === "edit") {
    const envs = envsOf(it0.at);
    const full = (e) => usable(e).every((a) => it0.at.has(K(e.id, a)));
    st.where = envs.length === ENVS.length && envs.every(full) ? "all" : "choose";
    st.envSel = new Set(envs.map((e) => e.id));
    for (const e of envs) if (!full(e)) st.perEnv.set(e.id, new Set(usable(e).filter((a) => it0.at.has(K(e.id, a)))));
  } else if (opts.preset && opts.preset.length) {
    const envs = [...new Set(opts.preset.map((k) => split(k)[0]))];
    if (here && envs.length === 1 && envs[0] === split(here)[0]) st.where = "here";
    else { st.where = "choose"; st.envSel = new Set(envs); }
  }
  if (st.where === "here" && split(here)[0] === "local") { st.where = "local"; st.agents = new Set([split(here)[1]]); }
  const envList = () => (st.where === "all" ? ENVS : st.where === "here" ? [envOf(split(here)[0])] : st.where === "local" ? [envOf("local")] : ENVS.filter((e) => st.envSel.has(e.id)));
  const agentsFor = (e) => {
    if (st.perEnv.has(e.id)) return [...st.perEnv.get(e.id)];
    if (st.agents) return usable(e).filter((a) => st.agents.has(a));
    if (st.where === "here" && mode !== "edit") return [split(here)[1]];
    return usable(e);
  };
  const usableAny = AGENTS.filter((a) => items.some((it) => canUse(it, a)));
  const agentsOn = () => st.agents || new Set(st.where === "here" && mode !== "edit" ? [split(here)[1]] : usableAny);
  const slots = () => new Set(envList().flatMap((e) => agentsFor(e).map((a) => K(e.id, a))));
  const block = document.createElement("div");
  block.className = "en-dlg-block";
  const title = opts.title || (mode === "edit" ? `Where ${it0.name} is installed` : `Install ${it0.name}`);
  const agentNames = (list) => (list.length ? list.map((a) => HARNESSES[a].label).join(", ") : "No agents");
  function summary() {
    const sl = slots(), envs = envsOf(sl), n = Object.values(sessions()).filter((s) => sl.has(slotOf(s))).length;
    if (st.wsMode === "workspace" && !st.wsSel.size) return "Pick at least one workspace";
    if (st.wsMode === "workspace" && it0.kind === "skill") return `Saved to ${st.wsSel.size === 1 ? workspaceLabel([...st.wsSel][0]) + "/" : plural(st.wsSel.size, "repo") + " · "}.github/skills/ · follows the repo everywhere`;
    if (!agentsOn().size) return "Pick at least one agent";
    if (!sl.size) return "Pick at least one environment";
    return `${st.where === "all" ? "Every environment, and ones you add later" : plural(envs.length, "environment")}${n ? ` · ${plural(n, "session")} can use it from their next message` : ""}`;
  }
  const radio = (id, label, sub) => `<button type="button" class="sc-radio" role="radio" aria-checked="${st.where === id}" data-where="${id}"><span class="sc-radio-dot" aria-hidden="true"></span><span class="sc-radio-text"><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>`;
  function render() {
    const hereEnv = here && envOf(split(here)[0]);
    const choose = st.where === "choose" ? `<div class="sc-choose">${ENVS.map((e) => {
      const on = st.envSel.has(e.id), ag = on ? agentsFor(e) : [];
      return `<div class="sc-choose-row"><vsc-checkbox data-env="${e.id}"${on ? " checked" : ""} label="${esc(e.label)}"></vsc-checkbox><span class="codicon codicon-${e.icon}" aria-hidden="true"></span>
        <span class="sc-env-name">${esc(e.label)}</span><small>${esc(e.offline ? "Offline, installs when it reconnects" : e.detail)}</small><span class="grow"></span>
        ${on ? `<button type="button" class="sc-agents" data-env-agents="${e.id}">${esc(ag.length === usable(e).length ? "All agents" : agentNames(ag))}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>` : ""}</div>`;
    }).join("")}</div>` : "";
    const kindLabel = TYPES[it0.kind === "connection" ? "mcp" : it0.kind === "skill" ? "skills" : it0.kind === "plugin" ? "plugins" : it0.kind]?.one || "this";
    const agentsSec = `<div class="en-dlg-sec"><div class="en-dlg-label">For what agents</div><div class="sc-checks">${AGENTS.map((a) => {
      const ok = usableAny.includes(a), on = ok && agentsOn().has(a);
      return `<div class="sc-check-row${ok ? "" : " is-disabled"}" data-agent="${a}"><vsc-checkbox${on ? " checked" : ""}${ok ? "" : " disabled"} label="${esc(HARNESSES[a].label)}"></vsc-checkbox><span>${esc(HARNESSES[a].label)}</span>${ok ? "" : `<small>Can't use this ${esc(kindLabel)}</small>`}</div>`;
    }).join("")}</div></div>`;
    // Workspace follows the environment: only workspaces open on the chosen environments are offered.
    const wsAvail = Object.keys(WORKSPACES).filter((w) => envList().some((e) => e.workspaces.includes(w)));
    for (const w of [...st.wsSel]) if (!wsAvail.includes(w)) st.wsSel.delete(w);
    const wsFile = (w) => (it0.kind === "skill" ? `${workspaceLabel(w)}/.github/skills/` : `${workspaceLabel(w)}/.vscode/mcp.json`);
    const wsRadio = (id, label, sub) => `<button type="button" class="sc-radio" role="radio" aria-checked="${st.wsMode === id}" data-wsmode="${id}"><span class="sc-radio-dot" aria-hidden="true"></span><span class="sc-radio-text"><span>${esc(label)}</span>${sub ? `<small>${esc(sub)}</small>` : ""}</span></button>`;
    const wsChoose = st.wsMode === "workspace" ? (wsAvail.length ? `<div class="sc-choose">${wsAvail.map((w) => `<div class="sc-choose-row"><vsc-checkbox data-ws="${esc(w)}"${st.wsSel.has(w) ? " checked" : ""} label="${esc(workspaceLabel(w))}"></vsc-checkbox><span class="codicon codicon-folder" aria-hidden="true"></span>
        <span class="sc-env-name">${esc(workspaceLabel(w))}</span><small>${esc(WORKSPACES[w].path || "")}</small></div>`).join("")}</div>` : `<div class="sc-choose-empty">No workspaces on the selected environments</div>`) : "";
    // Plugins only install per user; a repo can recommend one (enabledPlugins in .github/copilot/settings.json) but can't install it.
    const scopeSec = mode === "copy" ? "" : it0.kind === "plugin" ? `<div class="en-dlg-sec"><div class="en-dlg-label">In what workspace</div><div class="sc-note">Plugins always install to your user profile, so they work in every workspace</div></div>` : `<div class="en-dlg-sec"><div class="en-dlg-label">In what workspace</div><div class="sc-radios" role="radiogroup">
        ${wsRadio("user", "User", "Every workspace, saved to your user profile")}
        ${wsRadio("workspace", "Workspace", st.wsMode === "workspace" ? (st.wsSel.size ? `Saved to ${[...st.wsSel].map(wsFile).join(", ")}` : "Pick one or more workspaces") : `${plural(wsAvail.length, "workspace")} on the selected environments`)}
        ${wsChoose}</div></div>`;
    const polSec = mode === "new" && it0.kind === "connection" ? `<div class="en-dlg-sec en-dlg-inline"><div class="en-dlg-label">Enabled</div>
      <button class="monaco-switch${st.pol !== "off" ? " checked" : ""}" type="button" role="switch" aria-checked="${st.pol !== "off"}" aria-label="${st.pol !== "off" ? "Disable" : "Enable"} ${esc(it0.name)}" data-dpol><div class="monaco-switch-thumb"></div></button></div>` : "";
    const itemsSec = !single ? `<div class="en-dlg-sec"><div class="en-dlg-label">Customizations</div><div class="en-dlg-items">${items.map((it) => `
        <label class="en-dlg-item"><vsc-checkbox data-pick="${esc(it.id)}"${st.picked.has(it.id) ? " checked" : ""} label="${esc(it.name)}"></vsc-checkbox>${iconHtml(it, 16)}<span class="en-dlg-item-name">${esc(it.name)}</span><small>${it.kind === "connection" ? "Connection" : it.kind === "plugin" ? "Plugin" : it.kind === "skill" ? "Skill" : TYPES[it.kind]?.one || ""}</small></label>`).join("")}</div></div>` : "";
    const repo = st.wsMode === "workspace" && it0.kind === "skill";
    const ok = mode === "edit" ? "Save" : mode === "copy" ? `Install ${plural(st.picked.size, "item")}` : "Install";
    const disabled = ((!slots().size || !agentsOn().size) && !repo) || (!single && !st.picked.size) || (st.wsMode === "workspace" && !st.wsSel.size);
    block.innerHTML = `<div class="en-dlg sc-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="en-dlg-head">${single ? iconHtml(it0, 28) : '<span class="ev-logo ev-logo-glyph" style="width:28px;height:28px"><span class="codicon codicon-cloud-download"></span></span>'}
        <div class="ev-row-text"><h2>${esc(title)}</h2><div class="ev-row-sub">${esc(opts.sub || (single ? (it0.does || it0.sub || "") : "Pick what to install, and where"))}</div></div>
        <button class="ev-icon-btn" data-dlg-close aria-label="Close" title="Close"><span class="codicon codicon-close-compact"></span></button></header>
      <div class="en-dlg-body">${itemsSec}
        <div class="en-dlg-sec"><div class="en-dlg-label">In what environment</div><div class="sc-radios" role="radiogroup">
          ${radio("local", "This Computer only", "")}
          ${hereEnv && hereEnv.id !== "local" ? radio("here", `Only ${hereEnv.label}`, "Where this session runs") : ""}
          ${radio("all", "Everywhere", `All ${ENVS.length} environments, and ones you add later`)}
          ${radio("choose", "Choose environments…", st.where === "choose" ? "" : `${ENVS.length} environments`)}
          ${choose}</div></div>
        ${scopeSec}
        ${repo ? "" : agentsSec}${polSec}
      </div>
      <footer class="en-dlg-foot"><span class="en-dlg-sum">${esc(summary())}</span><button class="ev-btn" data-dlg-close>Cancel</button><button class="ev-btn primary" data-dlg-ok${disabled ? " disabled" : ""}>${ok}</button></footer>
    </div>`;
  }
  function apply() {
    const sel = slots(), repo = st.wsMode === "workspace";
    if (mode === "edit") {
      const before = new Set(it0.at);
      it0.at = sel;
      it0.follow = st.where === "all";
      for (const e of ENVS) if (!sel.has(K(e.id, "copilot")) && !e.agents.some((a) => sel.has(K(e.id, a)))) (it0.skip ||= new Set()).add(e.id); else it0.skip?.delete(e.id);
      toast(`${it0.name}: ${whereText(envsOf(sel))}.`, ["Undo"], () => { it0.at = before; changed(); });
    } else if (mode === "copy") {
      const picked = items.filter((x) => st.picked.has(x.id));
      for (const it of picked) for (const k of sel) if (canUse(it, split(k)[1])) it.at.add(k);
      toast(`Installed ${plural(picked.length, "customization")} on ${whereText(envsOf(sel))}.`);
      opts.onDone?.();
    } else {
      const it = { ...it0, at: sel, isNew: true, follow: st.where === "all" };
      if (it.kind === "connection") { it.def = st.pol || "on"; if (repo) { it.workspaces = [...st.wsSel]; it.workspace = it.workspaces[0]; } }
      ({ connection: CONNECTIONS, skill: USER_SKILLS, plugin: PLUGINS })[it.kind].push(it);
      toast(`Installed ${it.name}: ${whereText(envsOf(sel))}.`);
      opts.onDone?.(it);
    }
    closeSheet();
    changed();
  }
  block.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    if (e.target === block || t("[data-dlg-close]")) return closeSheet();
    if (t("[data-dlg-ok]:not([disabled])")) return apply();
    const w = t("[data-where]");
    if (w) { st.where = w.dataset.where; if (st.where === "choose" && !st.envSel.size) st.envSel = new Set(here ? [split(here)[0]] : ["local"]); return render(); }
    const ce = t("vsc-checkbox[data-env]");
    if (ce) { ce.hasAttribute("checked") ? st.envSel.add(ce.dataset.env) : st.envSel.delete(ce.dataset.env); return render(); }
    const ea = t("[data-env-agents]");
    if (ea) {
      const e2 = envOf(ea.dataset.envAgents), cur = new Set(agentsFor(e2));
      return openMenu(ea, [{ label: "All Agents", all: true, checked: cur.size === usable(e2).length }, "-", ...e2.agents.map((a) => ({ label: HARNESSES[a].label, a, checked: cur.has(a), disabled: !usable(e2).includes(a) }))], (m) => {
        if (m.all) st.perEnv.delete(e2.id); else { cur.has(m.a) ? cur.delete(m.a) : cur.add(m.a); st.perEnv.set(e2.id, cur); }
        render();
      });
    }
    const ag = t(".sc-check-row[data-agent]:not(.is-disabled)");
    if (ag) { const set = new Set(agentsOn()); set.has(ag.dataset.agent) ? set.delete(ag.dataset.agent) : set.add(ag.dataset.agent); st.agents = set; st.perEnv.clear(); return render(); }
    const pk = t("vsc-checkbox[data-pick]");
    if (pk) { pk.hasAttribute("checked") ? st.picked.add(pk.dataset.pick) : st.picked.delete(pk.dataset.pick); return render(); }
    const wm = t("[data-wsmode]");
    if (wm) { st.wsMode = wm.dataset.wsmode; return render(); }
    const cw = t("vsc-checkbox[data-ws]");
    if (cw) { cw.hasAttribute("checked") ? st.wsSel.add(cw.dataset.ws) : st.wsSel.delete(cw.dataset.ws); return render(); }
    if (t("[data-dpol]")) { st.pol = st.pol === "off" ? "on" : "off"; return render(); }
  });

  render();
  document.getElementById("wb").append(block);
  sheet = block;
  requestAnimationFrame(() => block.querySelector("[data-dlg-ok]")?.focus());
}
window.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet && !document.querySelector("vsc-menu")) { e.preventDefault(); e.stopImmediatePropagation(); closeSheet(); } }, true);
setInstallImpl(progressiveInstall);

// ---------- Synced environments: one keeps the customizations of another (environment id -> the one it syncs with) ----------
const SYNC = new Map([["hawks-framework", "local"]]);
const syncLabel = (id) => envOf(SYNC.get(id))?.label;
CONNECTIONS.find((c) => c.id === "kusto").skip = new Set(["hawks-framework"]);
const syncable = () => [...CONNECTIONS.filter((c) => !c.origin), ...USER_SKILLS, ...PLUGINS, ...Object.values(USER_FILES).flat()];
function reconcile() {
  // Twice, so an environment synced with a synced one catches up too.
  for (let pass = 0; pass < 2; pass++) for (const [id, from] of SYNC) {
    const e = envOf(id);
    for (const it of syncable()) {
      if (it.skip?.has(id) || it.workspace) continue;
      for (const a of e.agents) if (it.at.has(K(from, a)) && canUse(it, a)) it.at.add(K(id, a));
    }
    // Items set to Everywhere also land on environments added later; here, that's every environment.
  }
  for (const it of syncable()) if (it.follow) for (const k of ALL_SLOTS) if (canUse(it, split(k)[1]) && !it.skip?.has(split(k)[0])) it.at.add(k);
}
subs.add(reconcile);
reconcile();
hooks.onUninstall = (it, k) => { (it.skip ||= new Set()).add(split(k)[0]); it.follow = false; };

// ---------- Customizations (global) ----------
// V18 — Manage: true globals first, then each agent harness with only the customization types it supports.
const HARNESS_TYPES = ["plugins", "mcp", "skills", "instructions", "agents", "hooks", "tools", "canvases"];
const NAV = [{ id: "browse", label: "Discover" }, { label: "General" }, { id: "settings", label: "Settings" }, { id: "environments", label: "Remotes" }, { id: "models", label: "Models" }, { id: "extensions", label: "Extensions" },
  ...AGENTS.flatMap((a) => [{ label: HARNESSES[a].label }, ...HARNESS_TYPES.filter((t) => !HARNESSES[a].unsupported[t]).map((t) => ({ id: `${a}:${t}`, label: TYPES[t].label }))])];
const MODELS = [
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", provider: "OpenAI", agents: ["copilot", "codex"], on: true },
  { id: "gpt-5.6-sol-fast", name: "GPT-5.6 Sol Fast", provider: "OpenAI", agents: ["copilot", "codex"], on: true },
  { id: "gpt-5.3-codex", name: "GPT-5.3 Codex", provider: "OpenAI", agents: ["copilot", "codex"], on: true },
  { id: "claude-opus-5.5", name: "Claude Opus 5.5", provider: "Anthropic", agents: ["copilot", "claude"], on: true },
  { id: "claude-sonnet-5.5", name: "Claude Sonnet 5.5", provider: "Anthropic", agents: ["copilot", "claude"], on: true },
  { id: "claude-haiku-5.5", name: "Claude Haiku 5.5", provider: "Anthropic", agents: ["copilot", "claude"], on: false },
  { id: "gemini-4-argon", name: "Gemini 4 Argon", provider: "Google", agents: ["copilot"], on: false },
];
export function mountConfigure(root, opts) {
  const pages = window.CUST.first;
  root.className = "se lib en-cfg sc-cfg";
  root.innerHTML = `<nav class="se-nav" aria-label="Manage"><div class="se-nav-list" role="tablist" aria-orientation="vertical">${NAV.map((n) => n === "-" ? '<div class="se-nav-sep" role="presentation"></div>'
      : !n.id ? `<div class="se-nav-sep" role="presentation"></div><div class="sc-nav-label">${n.label}</div>`
      : `<div class="se-nav-item" role="tab" tabindex="-1" data-id="${n.id}"><span class="se-nav-label">${n.label || TYPES[n.id].label}</span><span class="se-nav-count" data-count="${n.id}"></span></div>`).join("")}</div></nav>
    <div class="se-main"><div class="lib-host"></div></div>`;
  const host = root.querySelector(".lib-host");
  const hosted = {};
  const f = { env: null, ws: null, agent: null, q: "", src: null };
  // Discover keeps its own query and feed filter; its cards aren't customizations, so the table pages' filters don't apply.
  const disc = { q: "", src: null };
  // The context picker (Environment › Workspace › Agent): what an agent would see there. Any part can be left open.
  const ctxOn = () => !!(f.env || f.ws || f.agent);
  const slotOk = (k) => { const [e, a] = split(k); return (!f.env || e === f.env) && (!f.agent || a === f.agent) && (!f.ws || agentsIn(envOf(e), f.ws).includes(a)); };
  const inCtx = (r) => (!ctxOn() || [...slotsOf(r)].some(slotOk)) && !(f.ws && r.scope === "workspace" && r.workspace !== f.ws);
  // A picked workspace brings its own repo group, even when the open session is in another one.
  const ctxWorkspace = () => (WORKSPACES[f.ws] ? f.ws : undefined);
  const ctxEnvs = () => ENVS.filter((e) => (!f.ws || e.workspaces.includes(f.ws)) && (!f.agent || e.agents.includes(f.agent)));
  const ctxWorkspaces = () => Object.keys(WORKSPACES).filter((w) => (!f.env || envOf(f.env).workspaces.includes(w)) && ENVS.some((e) => e.workspaces.includes(w) && (!f.agent || e.agents.includes(f.agent))));
  const ctxAgents = () => AGENTS.filter((a) => (!f.env || envOf(f.env).agents.includes(a)) && (!f.ws || ENVS.some((e) => e.workspaces.includes(f.ws) && e.agents.includes(a))));
  // A sentence: "View skills for Claude in vscode on devbox-1"; each part is a dropdown.
  function ctxBar() {
    const seg = (kind, label, set) => `<button type="button" class="sc-ctx-seg${set ? " set" : ""}" data-ctx="${kind}" aria-haspopup="menu">${esc(label)}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>`;
    return `<div class="sc-ctx" role="group" aria-label="Filter"><span class="sc-ctx-word">View ${esc(TYPES[section].label.replace(/\b[A-Z][a-z]+/g, (w) => w.toLowerCase()))} for</span>${seg("agent", f.agent ? HARNESSES[f.agent].label : "all agents", f.agent)}<span class="sc-ctx-word">in</span>${seg("ws", f.ws ? workspaceLabel(f.ws) : "all workspaces", f.ws)}<span class="sc-ctx-word">${f.env ? "on" : "across"}</span>${seg("env", f.env ? envOf(f.env).label : "all environments", f.env)}${ctxOn() ? '<button type="button" class="sc-ctx-clear" data-ctx-clear aria-label="Show everything" title="Show everything"><span class="codicon codicon-close" aria-hidden="true"></span></button>' : ""}</div>`;
  }

  const open = new Set(), openSrc = new Set(["security"]), openEnv = new Set(), closedGroups = new Set(), openSets = new Set();
  let section = "browse", target = null, detail = null, outputOpen = false;
  const listScroll = {};
  const navCount = () => "";
  for (const card of pages.browse.querySelectorAll("vsc-customization-discovery-card")) if (cardItem(card.getAttribute("name"))) card.setAttribute("action", "Manage");
  function cardItem(name) { for (const l of [CONNECTIONS, USER_SKILLS, PLUGINS]) { const it = l.find((x) => x.card === name || x.name === name); if (it) return it; } return null; }
  const rowOf = (type, key) => allRows(type, ctxWorkspace()).find((r) => r.key === key);

  // A row's state in the environment lens.
  function lensCell(r) {
    const e = envOf(f.env), sl = slotsOf(r), ag = e.agents.filter((a) => sl.has(K(e.id, a)));
    if (!r.editable) return `<span class="sc-where${ag.length ? "" : " is-muted"}">${ag.length ? (r.scope === "workspace" ? "From the repo" : r.origin ? `With ${esc(r.origin.tag.toLowerCase())}` : "Here") : "Not here"}</span>`;
    const all = ag.length === e.agents.filter((a) => canUse(r.item, a)).length;
    return `<span class="sc-where${ag.length ? "" : " is-muted"}">${ag.length ? (all ? "Here" : `Here · ${esc(ag.map((a) => HARNESSES[a].label).join(", "))}`) : "Not here"}</span>`;
  }
  function statusChip(r) {
    const c = r.item || r.conn;
    if (isConn(r.type) && c?.state === "error") return `<span class="sc-status is-error" title="${esc(MCP[c.id]?.error || "")}"><span class="codicon codicon-error" aria-hidden="true"></span>Error on This Computer</span>`;
    if (isConn(r.type) && c?.state === "signin") return `<span class="sc-status" title="You'll be asked to sign in the first time an agent needs it"><span class="codicon codicon-account" aria-hidden="true"></span>Sign in when needed</span>`;
    return "";
  }
  function control(r) {
    if (isConn(r.type)) {
      const on = (f.ws ? r.item.ws?.[f.ws] || r.item.def : r.item.def) !== "off";
      return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${on ? "Disable" : "Enable"} ${esc(r.name)}" data-conn-toggle="${esc(r.key)}"><div class="monaco-switch-thumb"></div></button>`;
    }
    if (r.type === "tools") { const on = enabledCount(r.tools) > 0; return r.tools.locked ? `<span class="codicon codicon-lock-small sc-lock" title="Copilot's own tools can't be turned off"></span>` : `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${esc(r.name)}" data-tool-toggle="${esc(r.key)}"><div class="monaco-switch-thumb"></div></button>`; }
    return "";
  }
  function rowHtml(r, nested) {
    const sub = isConn(r.type) ? (r.item.account ? esc(r.item.account) : "") : r.type === "tools" ? plural(r.tools.count, "tool") : r.sub ? esc(r.sub) : "";
    return `<div class="sc-row sc-item${nested ? " sc-nested" : ""}" data-row="${r.type}|${esc(r.key)}">
      ${iconFor(r)}
      <div class="sc-text"><div class="sc-name-row"><button type="button" class="sc-name" data-open="${r.type}|${esc(r.key)}" title="Open">${esc(r.name)}</button>${r.tag && r.tag !== "Copilot" ? `<span class="en-tag">${esc(r.tag)}</span>` : ""}${r.item?.isNew ? '<span class="lc-flag on">New</span>' : ""}</div>${sub ? `<div class="sc-sub">${sub}</div>` : ""}</div>
      ${statusChip(r)}
      ${f.env ? lensCell(r) : ""}
      ${control(r)}
      <vsc-toolbar label="${esc(r.name)} Actions"><vsc-action icon="ellipsis" label="More Actions..." data-row-more="${r.type}|${esc(r.key)}"></vsc-action></vsc-toolbar>
    </div>`;
  }
  /** Level 1: the environments it's on (with their agents and status), then one line for the rest. */
  function whereDetail(r) {
    const sl = slotsOf(r), on = envsOf(sl), off = ENVS.filter((e) => !on.includes(e));
    return `<div class="sc-where-detail">${on.map((e) => envLine(r, e)).join("")}
      ${off.length ? `<div class="sc-env-line is-off"><span class="codicon codicon-circle-slash" aria-hidden="true"></span><span class="sc-muted">Not on ${esc(off.map((e) => e.label).join(", "))}</span><span class="grow"></span><button type="button" class="ev-link" data-install-rest="${r.type}|${esc(r.key)}">Install…</button></div>` : ""}
    </div>`;
  }
  function envLine(r, e) {
    const sl = slotsOf(r), ag = e.agents.filter((a) => sl.has(K(e.id, a))), c = r.item;
    const st = e.offline ? '<span class="sc-status">Offline</span>' : c?.state === "error" && e.id === "local" ? '<span class="sc-status is-error"><span class="codicon codicon-error" aria-hidden="true"></span>Error</span>' : "";
    const all = ag.length === e.agents.filter((a) => canUse(c || { kind: r.type }, a)).length;
    return `<div class="sc-env-line"><span class="codicon codicon-${e.icon}" aria-hidden="true"></span><span class="sc-env-name">${esc(e.label)}</span>${st}<span class="grow"></span>
      <button type="button" class="sc-agents" data-row-agents="${r.type}|${esc(r.key)}|${e.id}">${esc(all ? "All agents" : ag.map((a) => HARNESSES[a].label).join(", "))}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
      <button type="button" class="ev-icon-btn" data-env-toggle="${r.type}|${esc(r.key)}|${e.id}" aria-label="Remove from ${esc(e.label)}" title="Remove from ${esc(e.label)}"><span class="codicon codicon-close-compact"></span></button></div>`;
  }
  // The type pages are the product's tree (the customizations editor's list widgets): groups (Workspace · folder, User,
  // Built-in), with plugin/extension/organization contributions flattened into their scope.
  const LIST_KIND = { connectors: "mcp", mcp: "mcp", plugins: "plugins", tools: "tools" };
  const GROUP_ICON = { user: "account", builtin: "vscode-insiders" };
  const ADD = { skills: "New Skill", instructions: "New Instruction", agents: "New Agent", hooks: "New Hook", mcp: "Add Server" };
  const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== null && v !== "").map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(" ");
  function treeItem(r, nested) {
    const base = { "data-row": `${r.type}|${r.key}`, nested };
    if (isConn(r.type)) {
      const c = r.item, src = c.icon?.img ? ICONS + c.icon.img : c.icon?.src, compat = MCP[c.id]?.compat || {};
      const state = { error: "error", stopped: "stopped", starting: "starting", signin: "auth-required" }[c.state] || "running";
      const compatibility = f.env ? (compat[f.env] ? "unsupported" : "") : Object.keys(compat).length ? "partially-supported" : "";
      const on = (f.ws ? c.ws?.[f.ws] || c.def : c.def) !== "off";
      return `<vsc-mcp-server-item ${attrs({ ...base, name: c.name, "icon-src": src, description: c.connector ? c.account : "", state, compatibility,
        enabled: on })}></vsc-mcp-server-item>`;
    }
    if (r.type === "plugins") return `<vsc-plugin-item ${attrs({ ...base, name: r.name, location: `~/.copilot/installed-plugins/${r.key}`, metadata: r.sub, enabled: !r.item.disabled })}></vsc-plugin-item>`;
    if (r.type === "tools") {
      const t = r.tools, on = enabledCount(t), open = openSets.has(t.id);
      return `<vsc-tool-set-item ${attrs({ ...base, name: r.name, description: r.conn?.does || (r.origin ? r.origin.label : ""), count: `${on}/${t.count}`, enabled: !t.locked && on > 0, locked: t.locked, more: true, expanded: open })}></vsc-tool-set-item>`
        + (open ? t.tools.map((x) => `<vsc-tool-item ${attrs({ name: x, description: TOOL_DESC[x], enabled: t.locked || !offIn(t.id).has(x), readonly: t.locked, "data-tool": `${t.id}|${x}` })}></vsc-tool-item>`).join("") : "");
    }
    return `<vsc-customization-item ${attrs({ ...base, name: r.name, path: r.path || (r.origin ? `${r.origin.tag}: ${r.origin.label}` : ""), icon: TYPES[r.type].icon, badge: r.tag === "Copilot" ? "" : r.tag })}></vsc-customization-item>`;
  }
  function treePage(type) {
    const { groups } = model(type, ctxWorkspace()), kind = LIST_KIND[type] || "prompts";
    let html = "", first = true;
    for (const g of groups) {
      if (f.ws && g.workspace && g.workspace !== f.ws) continue;
      const rows = g.rows.filter(inCtx);
      const n = rows.length;
      const keepEmpty = !ctxOn() && (g.workspace === store.scope.workspace || g.id === "user");
      if (!n && !keepEmpty) continue;
      const canAdd = ADD[type] && g.id !== "builtin";
      html += `<vsc-customization-group ${attrs({ label: g.label, count: n, icon: g.workspace ? "folder" : GROUP_ICON[g.id], first, collapsed: closedGroups.has(type + ":" + g.id), actions: canAdd ? "add" : "", "add-label": canAdd ? ADD[type] : "", "data-group": g.id })}></vsc-customization-group>`;
      first = false;
      html += rows.map((r) => treeItem(r)).join("");
    }
    const tmp = document.createElement("div");
    if (!html && ctxOn()) html = `<div class="sc-ctx-empty">No ${TYPES[type].label.toLowerCase()} for this workspace, agent and environment.</div>`;
    tmp.innerHTML = `<vsc-customization-list ${attrs({ section: type, kind, heading: TYPES[type].label, description: TYPES[type].desc })}>${html}</vsc-customization-list>`;
    return tmp.firstElementChild;
  }
  function listPage(type) {
    const { groups } = model(type, ctxWorkspace()), q = f.q.toLowerCase(), m = (r) => !q || r.name.toLowerCase().includes(q);
    const lensEnv = f.env && envOf(f.env);
    return `<div class="sc-list">${groups.map((g) => {
      const rows = g.rows.filter(m), srcs = g.sources.map((s) => ({ ...s, rows: s.rows.filter(m) })).filter((s) => s.rows.length);
      if (!rows.length && !srcs.length) return "";
      const note = "";
      return `<section class="se-group sc-grp"><div class="se-group-header"><h3 class="se-group-title">${esc(g.label)}</h3><span class="se-group-count">${rows.length + srcs.reduce((n, s) => n + s.rows.length, 0)}</span>${note ? `<span class="sc-group-note">${esc(note)}</span>` : ""}</div>
        <div class="sc-group">
        ${rows.map((r) => rowHtml(r)).join("")}
        ${srcs.map((s) => { const isOpen = openSrc.has(s.src.id) || !!q; return `<div class="sc-row sc-src" data-src="${s.src.id}">
            <button type="button" class="sc-twisty" data-src-toggle="${s.src.id}" aria-expanded="${isOpen}" aria-label="${isOpen ? "Collapse" : "Expand"} ${esc(s.src.label)}"><span class="codicon codicon-chevron-${isOpen ? "down" : "right"}" aria-hidden="true"></span></button>
            <span class="codicon codicon-${s.src.icon} sc-src-icon" aria-hidden="true"></span><span class="sc-src-label">${esc(s.src.label)}</span><span class="sc-src-kind">${s.src.tag}</span><span class="cp-count">${s.rows.length}</span>
            <span class="grow"></span>${lensEnv ? `<span class="sc-where is-static">${envsOf(s.src.slots()).includes(lensEnv) ? "Here" : "Not here"}</span>` : ""}
            ${s.src.kind !== "account" ? `<button type="button" class="ev-icon-btn sc-src-open" data-src-open="${s.src.id}" aria-label="Open ${esc(s.src.label)}" title="${s.src.kind === "plugin" ? "Open plugin" : "Show extension"}"><span class="codicon codicon-link-external"></span></button>` : '<span class="sc-src-open-space"></span>'}
          </div>${isOpen ? s.rows.map((r) => rowHtml(r, true)).join("") : ""}`; }).join("")}
      </div></section>`;
    }).join("")}</div>`;
  }

  // ---------- Tables: every type page is a VS Code-style table; an item opens in a resizable side panel ----------
  const sortBy = {};
  // Martin's three scopes: yours (home folder, plugins, your org), the harness's own, and VS Code's (built-ins and extensions).
  const bucketOf = (r) => (r.scope === "builtin" ? (r.tag ? "harness" : "vscode") : r.origin?.kind === "extension" ? "vscode" : "you");
  const BUCKET_RANK = { you: 0, harness: 1, vscode: 2 };
  const bucketLabel = (b) => ({ you: "Yours", harness: `From ${HARNESSES[f.agent].label}`, vscode: "From VS Code" })[b];
  const bucketNote = (b, type) => ({ you: `In your home folder on ${envOf(f.env).label}, or from plugins and your organization`, harness: `Comes with ${HARNESSES[f.agent].label}`, vscode: "Built into VS Code or contributed by extensions" })[b];
  const rankOf = (r) => BUCKET_RANK[bucketOf(r)] * 10 + (r.origin ? 1 : 0);
  const sourceOf = (r) => (r.origin ? { icon: r.origin.icon, label: r.origin.label, tag: r.origin.tag }
    : r.scope === "workspace" ? { icon: "folder", label: `Workspace · ${workspaceLabel(r.workspace)}` }
    : r.scope === "builtin" ? { icon: "vscode-insiders", label: "Built-in", tag: r.tag || "" }
    : { icon: "account", label: "User" });
  const SRC_KINDS = [{ id: "workspace", label: "Workspace" }, { id: "user", label: "User" }, { id: "plugin", label: "Plugins" }, { id: "extension", label: "Extensions" }, { id: "org", label: "Organization" }, { id: "builtin", label: "Built-in" }];
  const srcKindOf = (r) => (r.origin ? (r.origin.kind === "account" ? "org" : r.origin.kind) : r.scope);
  const srcKindLabel = (id) => SRC_KINDS.find((k) => k.id === id)?.label || "";
  const feedOf = (card) => (card.getAttribute("meta") || "").split(" · ")[1] || "";
  const COLS = { mcp: ["status"], connectors: ["status"], plugins: ["desc"], canvases: ["desc"], tools: ["count", "desc"] };
  const COL_LABEL = { status: "Status", desc: "Description", count: "Tools", path: "Location" };
  const colsOf = (type) => COLS[type] || ["path"];
  const hasSwitch = (type) => isConn(type) || type === "plugins" || type === "tools";
  const connOn = (c) => (f.ws ? c.ws?.[f.ws] || c.def : c.def) !== "off";
  function statusCell(r) {
    const c = r.item, ref = `${r.type}|${esc(r.key)}`, compat = f.env && MCP[c.id]?.compat?.[f.env];
    const st = (cls, icon, label, title = "") => `<span class="ct-status ${cls}"${title ? ` title="${esc(title)}"` : ""}><span class="codicon codicon-${icon}" aria-hidden="true"></span>${label}</span>`;
    if (compat) return st("is-warn", "warning", "Not supported here", compat);
    if (!connOn(c)) return st("is-muted", "circle-slash", "Disabled");
    if (c.state === "error") return st("is-error", "error", "Error", MCP[c.id]?.error) + `<button type="button" class="ev-link" data-row-output="${ref}">Show Output</button>`;
    if (c.state === "signin") return st("is-muted", "account", "Needs sign-in") + `<button type="button" class="ev-link" data-row-signin="${ref}">Sign In</button>`;
    if (c.state === "stopped") return st("is-muted", "debug-stop", "Stopped") + `<button type="button" class="ev-link" data-row-start="${ref}">Start</button>`;
    if (c.state === "disconnected") return st("is-muted", "debug-disconnect", "Disconnected") + `<button type="button" class="ev-link" data-conn-connect="${ref}">Connect</button>`;
    if (c.state === "starting") return st("is-muted", "loading codicon-modifier-spin", "Starting");
    return st("is-ok", "circle-filled", "Running");
  }
  const pluginSwitch = (r) => { const on = !r.item.disabled; return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${on ? "Disable" : "Enable"} ${esc(r.name)}" data-plugin-toggle="${esc(r.key)}"><div class="monaco-switch-thumb"></div></button>`; };
  function cellOf(r, col) {
    if (col === "status") return statusCell(r);
    if (col === "count") return `<span class="ct-label">${enabledCount(r.tools)}/${r.tools.count}</span>`;
    if (col === "desc") { const t = r.tools, d = t ? t.tools.slice(0, 4).join(", ") + (t.count > 4 ? ", …" : "") : r.sub || r.item?.does || ""; return `<span class="ct-label ct-muted" title="${esc(d)}">${esc(d)}</span>`; }
    return r.path ? `<span class="ct-label ct-muted" title="${esc(r.path)}">${esc(r.path)}</span>` : "";
  }
  function tableRow(r, sel) {
    const ref = `${r.type}|${esc(r.key)}`, src = sourceOf(r);
    const icon = iconFor(r, 16);
    const badges = `${r.tag && r.tag !== "Copilot" ? `<span class="en-tag">${esc(r.tag)}</span>` : ""}${r.item?.isNew ? '<span class="lc-flag on">New</span>' : ""}`;
    return `<tr class="ct-row${sel ? " selected" : ""}" data-row="${ref}" tabindex="-1" aria-selected="${sel}">
      <td><div class="ct-cell">${icon}<span class="ct-label ct-name" title="${esc(r.name)}">${esc(r.name)}</span>${badges}</div></td>
      <td><div class="ct-cell" title="${esc(src.label + (src.tag ? ` (${src.tag})` : ""))}"><span class="codicon codicon-${src.icon} ct-src-icon" aria-hidden="true"></span><span class="ct-label">${esc(src.label)}</span>${src.tag ? `<span class="ct-muted ct-tag">${esc(src.tag)}</span>` : ""}</div></td>
      ${colsOf(r.type).map((c) => `<td><div class="ct-cell ct-${c}">${cellOf(r, c)}</div></td>`).join("")}
      ${hasSwitch(r.type) ? `<td><div class="ct-cell ct-center">${r.type === "plugins" ? pluginSwitch(r) : control(r)}</div></td>` : ""}
      <td><div class="ct-cell ct-center"><button type="button" class="ev-icon-btn ct-more" data-row-more="${ref}" aria-label="More Actions for ${esc(r.name)}" title="More Actions..."><span class="codicon codicon-ellipsis" aria-hidden="true"></span></button></div></td>
    </tr>`;
  }
  function tableHtml(type) {
    const q = f.q.trim().toLowerCase(), label = TYPES[type].label.toLowerCase();
    let rows = allRows(type, ctxWorkspace()).filter((r) => r.scope !== "workspace").filter(inCtx);
    if (f.src) rows = rows.filter((r) => srcKindOf(r) === f.src);
    if (q) rows = rows.filter((r) => [r.name, r.path, r.sub, sourceOf(r).label].some((x) => x && x.toLowerCase().includes(q)));
    if (!rows.length) {
      const from = f.src ? ` from ${esc(srcKindLabel(f.src))}` : "";
      const clear = f.src ? ` <button type="button" class="ev-link" data-src-clear>Show All Sources</button>` : "";
      return `<div class="sc-ctx-empty">${q ? `No ${esc(label)}${from} match “${esc(f.q.trim())}”.` : `No ${esc(label)}${from} for ${esc(HARNESSES[f.agent].label)} on ${esc(envOf(f.env).label)}.`}${clear}</div>`;
    }
    const s = sortBy[type] || { col: "source", dir: 1 };
    const byName = (a, b) => a.name.localeCompare(b.name);
    const bySource = (a, b) => rankOf(a) - rankOf(b) || sourceOf(a).label.localeCompare(sourceOf(b).label);
    rows.sort((a, b) => s.dir * (s.col === "name" ? byName(a, b) || bySource(a, b) : bySource(a, b) || byName(a, b)));
    const th = (col, text) => {
      const on = s.col === col;
      return `<th scope="col" aria-sort="${on ? (s.dir > 0 ? "ascending" : "descending") : "none"}"><button type="button" class="ct-sort" data-sort="${col}" title="Sort by ${text}">${text}${on ? `<span class="codicon codicon-arrow-${s.dir > 0 ? "up" : "down"}" aria-hidden="true"></span>` : ""}</button></th>`;
    };
    const cols = colsOf(type);
    const widths = { name: "34%", source: "22%", status: "auto", desc: "auto", path: "auto", count: "64px" };
    return `<table class="ct-table" aria-label="${esc(TYPES[type].label)}">
      <colgroup><col style="width:${widths.name}"><col style="width:${widths.source}">${cols.map((c) => `<col style="width:${widths[c]}">`).join("")}${hasSwitch(type) ? '<col style="width:72px">' : ""}<col style="width:36px"></colgroup>
      <thead><tr>${th("name", "Name")}${th("source", "Source")}${cols.map((c) => `<th scope="col"><span class="ct-th">${COL_LABEL[c]}</span></th>`).join("")}${hasSwitch(type) ? '<th scope="col"><span class="ct-th ct-center">Enabled</span></th>' : ""}<th scope="col" aria-label="Actions"></th></tr></thead>
      <tbody>${rows.map((r, i) => {
        const b = bucketOf(r), head = s.col === "source" && (i === 0 || bucketOf(rows[i - 1]) !== b);
        const span = 3 + cols.length + (hasSwitch(type) ? 1 : 0);
        return (head ? `<tr class="ct-group"><th colspan="${span}" scope="colgroup"><span class="ct-group-label">${esc(bucketLabel(b))}</span><span class="ct-group-note">${esc(bucketNote(b, type))}</span></th></tr>` : "") + tableRow(r, !!detail && detail.type === type && detail.key === r.key);
      }).join("")}</tbody></table>
      <p class="ct-ws-note"><span class="codicon codicon-folder" aria-hidden="true"></span>${esc(TYPES[type].label)} that come with a repository load in sessions in that workspace. See them in a session's Customizations panel.</p>`;
  }
  // The page search lives at the right end of the scope picker row (session-context.js); one query is shared by every page.
  function syncSearch(label) {
    const input = root.querySelector(".sc-scope-filters .ct-search input"), st = section === "browse" ? disc : f;
    if (!input) return;
    input.setAttribute("aria-label", `Search ${label}`);
    if (input !== document.activeElement) { input.value = st.q; input.classList.toggle("empty", !st.q); }
    const btn = root.querySelector("[data-src-filter]");
    if (!btn) return;
    const on = section === "browse" ? disc.src : f.src && srcKindLabel(f.src), title = on ? `Filter by Source: ${on}` : "Filter by Source";
    btn.setAttribute("aria-pressed", String(!!on)); btn.title = title; btn.setAttribute("aria-label", title);
    btn.firstElementChild.className = `codicon codicon-${on ? "filter-filled" : "filter"}`;
  }
  function filterCards() {
    const q = disc.q.trim().toLowerCase();
    let total = 0;
    for (const s of host.querySelectorAll("vsc-customization-discovery-section")) {
      let any = false;
      for (const card of s.querySelectorAll("vsc-customization-discovery-card")) {
        const hit = (!disc.src || feedOf(card) === disc.src) && (!q || ["name", "description", "meta"].some((a) => (card.getAttribute(a) || "").toLowerCase().includes(q)));
        card.style.display = hit ? "" : "none"; any ||= hit; total += hit;
      }
      s.style.display = any ? "" : "none";
    }
    const list = host.querySelector(".customization-discovery-sections");
    if (list && !list.previousElementSibling?.matches(".disc-empty")) list.insertAdjacentHTML("beforebegin", '<div class="sc-ctx-empty disc-empty" role="status" hidden></div>');
    const empty = list?.previousElementSibling;
    if (empty) {
      empty.hidden = !!total;
      empty.innerHTML = total ? "" : `No results${disc.src ? ` from ${esc(disc.src)}` : ""}${q ? ` match “${esc(disc.q.trim())}”` : ""}.${disc.src ? ` <button type="button" class="ev-link" data-src-clear>Show All Sources</button>` : ""}`;
    }
  }
  function tablePage(id, el) {
    if (!el.querySelector(".ct-wrap")) {
      el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${TYPES[id].label}</h2><p class="se-page-desc">${esc(TYPES[id].desc)}</p></div>
        <div class="sc-head-actions">${ADD[id] ? `<button type="button" class="se-btn small" data-add-new>${ADD[id]}</button>` : ""}${["connectors", "mcp", "skills", "plugins"].includes(id) ? '<button class="se-btn small" data-go="browse">Browse</button>' : ""}</div></div>
        <div class="ct-wrap"></div>`;
    }
    syncSearch(TYPES[id].label);
    const wrap = el.querySelector(".ct-wrap"), prev = wrap.scrollTop, focusKey = wrap.contains(document.activeElement) ? document.activeElement.closest("tr[data-row]")?.dataset.row : null;
    wrap.innerHTML = tableHtml(id);
    wrap.scrollTop = prev;
    const rows = [...wrap.querySelectorAll("tr[data-row]")];
    const focusRow = rows.find((x) => x.dataset.row === focusKey) || rows.find((x) => x.classList.contains("selected")) || rows[0];
    if (focusRow) focusRow.tabIndex = 0;
    if (focusKey && focusRow) focusRow.focus({ preventScroll: true });
  }
  // Extensions: the same table, from the Agents window's extension list (category = the list's group).
  const EXTS = (() => { let cat = ""; return [...pages.extensions.querySelectorAll("vsc-customization-group, vsc-agents-extension-item")].flatMap((el) => {
    if (el.localName === "vsc-customization-group") { cat = el.getAttribute("label"); return []; }
    const a = (k) => el.getAttribute(k) || "";
    return [{ name: a("name"), publisher: a("publisher"), desc: a("description"), icon: a("icon-src"), warning: a("warning"), tag: a("contributions"), category: cat, on: el.hasAttribute("enabled") }];
  }); })();
  const CAT_RANK = ["AI Features", "Supported", "Other Extensions"];
  function extTableHtml() {
    const q = f.q.trim().toLowerCase();
    const rows = EXTS.filter((x) => !q || [x.name, x.publisher, x.desc, x.category].some((v) => v.toLowerCase().includes(q)));
    if (!rows.length) return `<div class="sc-ctx-empty">No extensions match “${esc(f.q.trim())}”.</div>`;
    const s = sortBy.extensions || { col: "category", dir: 1 };
    const byName = (a, b) => a.name.localeCompare(b.name);
    const cmp = { name: byName, publisher: (a, b) => a.publisher.localeCompare(b.publisher) || byName(a, b), category: (a, b) => CAT_RANK.indexOf(a.category) - CAT_RANK.indexOf(b.category) || byName(a, b) }[s.col];
    rows.sort((a, b) => s.dir * cmp(a, b));
    const th = (col, text) => { const on = s.col === col;
      return `<th scope="col" aria-sort="${on ? (s.dir > 0 ? "ascending" : "descending") : "none"}"><button type="button" class="ct-sort" data-sort="${col}" title="Sort by ${text}">${text}${on ? `<span class="codicon codicon-arrow-${s.dir > 0 ? "up" : "down"}" aria-hidden="true"></span>` : ""}</button></th>`; };
    return `<table class="ct-table" aria-label="Extensions">
      <colgroup><col style="width:30%"><col style="width:14%"><col style="width:16%"><col><col style="width:72px"></colgroup>
      <thead><tr>${th("name", "Name")}${th("publisher", "Publisher")}${th("category", "Category")}<th scope="col"><span class="ct-th">Description</span></th><th scope="col"><span class="ct-th ct-center">Enabled</span></th></tr></thead>
      <tbody>${rows.map((x) => `<tr class="ct-row" data-ext-row="${esc(x.name)}">
        <td><div class="ct-cell"><img class="ct-ext-icon" src="${esc(x.icon)}" alt=""><span class="ct-label ct-name" title="${esc(x.name)}">${esc(x.name)}</span>${x.warning ? `<span class="codicon codicon-warning ct-ext-warn" title="Not supported in the Agents window: ${esc(x.warning)}" aria-label="Not supported in the Agents window: ${esc(x.warning)}"></span>` : ""}${x.tag ? `<span class="en-tag">${esc(x.tag)}</span>` : ""}</div></td>
        <td><div class="ct-cell"><span class="ct-label" title="${esc(x.publisher)}">${esc(x.publisher)}</span></div></td>
        <td><div class="ct-cell"><span class="ct-label" title="${esc(x.category)}">${esc(x.category)}</span></div></td>
        <td><div class="ct-cell"><span class="ct-label ct-muted" title="${esc(x.desc)}">${esc(x.desc)}</span></div></td>
        <td><div class="ct-cell ct-center"><button class="monaco-switch${x.on ? " checked" : ""}" type="button" role="switch" aria-checked="${x.on}" aria-label="${x.on ? "Disable" : "Enable"} ${esc(x.name)} in the Agents window" data-ext-toggle="${esc(x.name)}"><div class="monaco-switch-thumb"></div></button></div></td>
      </tr>`).join("")}</tbody></table>`;
  }
  function extPage(el) {
    if (!el.querySelector(".ct-wrap")) {
      el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">Extensions</h2><p class="se-page-desc">Choose which installed extensions run in the Agents window. Extensions that haven't declared support for the Agents window are disabled by default and might not work as expected. Changes only apply to the Agents window.</p></div>
        </div>
        <div class="ct-wrap"></div>`;
    }
    syncSearch("Extensions");
    const wrap = el.querySelector(".ct-wrap"), prev = wrap.scrollTop, focused = document.activeElement?.dataset?.extToggle;
    wrap.innerHTML = extTableHtml();
    wrap.scrollTop = prev;
    if (focused) wrap.querySelector(`[data-ext-toggle="${CSS.escape(focused)}"]`)?.focus();
  }
  function openRow(tr) { const [type, key] = refOf(tr.dataset.row); show(type, { detail: key }); }

  // The side panel is the Settings editor's settings.json panel: the item's file, read-only, with its line highlighted.
  let drawer = null, drawerFor = "", drawerW = null;
  const hlJson = (text) => esc(text).replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g, (m, str, colon, kw, num) => {
    if (str) return `<span class="${colon ? "j-key" : "j-str"}">${str}</span>${colon || ""}`;
    if (kw) return `<span class="j-kw">${kw}</span>`;
    return `<span class="j-num">${num}</span>`;
  });
  function hlMarkdown(lines) {
    let fm = lines[0] === "---" ? 0 : -1;
    return lines.map((l, i) => {
      if (fm >= 0 && l === "---") { if (i > 0) fm = -1; return `<span class="j-kw">${esc(l)}</span>`; }
      if (fm >= 0) return esc(l).replace(/^([\w-]+)(:)(.*)$/, '<span class="j-key">$1</span>$2<span class="j-str">$3</span>');
      if (/^#{1,6} /.test(l)) return `<span class="md-h">${esc(l)}</span>`;
      return esc(l).replace(/^(\s*(?:\d+\.|[-*]))( )/, '<span class="j-kw">$1</span>$2').replace(/`([^`]+)`/g, '<span class="j-str">`$1`</span>');
    });
  }
  const hlLog = (l) => esc(l).replace(/^(\S+ )\[(\w+)\]/, (m, ts, lvl) => `<span class="lg-ts">${ts}</span><span class="lg-${lvl}">[${lvl}]</span>`);
  const splitPath = (p) => { const i = p.lastIndexOf("/"); return i < 0 ? [p, ""] : [p.slice(i + 1), p.slice(0, i)]; };
  const jsonBlock = (out, indent, k, v, hl, comma) => {
    const body = JSON.stringify(v, null, "\t").split("\n");
    body.forEach((l, i) => out.push({ text: indent + (i === 0 && k != null ? `"${k}": ` : "") + l + (i === body.length - 1 && comma ? "," : ""), hl }));
  };
  const jsonDoc = (v) => { const out = []; jsonBlock(out, "", null, v, false, false); return out; };
  /** { kind: json | md | log, title, path, lines: [{ text, hl }] } */
  function docOf(r) {
    const c = r.item;
    if (isConn(r.type) && outputOpen) return { kind: "log", title: "Output", path: `MCP: ${r.name}`, lines: (MCP[c.id]?.output || OUTPUT_DEFAULT(c)).map((text) => ({ text })) };
    if (isConn(r.type)) {
      const m = MCP[c.id] || { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: c.id } };
      if (m.file === "Copilot Connectors") return { kind: "json", title: r.name, path: "Copilot Connectors", lines: jsonDoc({ name: c.name, ...m.def, account: c.account || undefined }) };
      const ids = Object.keys(MCP).filter((id) => MCP[id].file === m.file), lines = [{ text: "{" }, { text: '\t"servers": {' }];
      ids.forEach((id, i) => jsonBlock(lines, "\t\t", id, MCP[id].def, id === c.id, i < ids.length - 1));
      lines.push({ text: "\t}" }, { text: "}" });
      const [title, path] = splitPath(m.file);
      return { kind: "json", title, path, lines };
    }
    if (r.type === "plugins") return { kind: "json", title: "plugin.json", path: `~/.copilot/installed-plugins/${r.key}/.plugin`,
      lines: jsonDoc({ name: r.key, displayName: r.name, description: r.sub || "", version: "1.0.0", ...(r.key === "jira" ? { extensions: "extensions/" } : { skills: "skills/", agents: "agents/", hooks: "hooks/hooks.json", mcpServers: ".mcp.json" }) }) };
    if (r.type === "tools") {
      const t = r.tools, tools = Object.fromEntries(t.tools.map((x) => [x, t.locked || !offIn(t.id).has(x)]));
      return { kind: "json", title: r.name, path: r.conn ? `MCP server · ${MCP[r.conn.id]?.file || ""}` : r.origin ? `${r.origin.tag} · ${r.origin.label}` : "Built-in tool set", lines: jsonDoc({ toolSet: t.id, tools }) };
    }
    if (r.type === "canvases") return { kind: "json", title: r.name, path: `Canvas · ${r.origin.label}`, lines: jsonDoc({ id: r.key, name: r.name, description: r.sub, contributedBy: r.origin.label }) };
    const text = contentOf(r), [title, path] = r.path ? splitPath(r.path) : [r.name, r.origin ? `${r.origin.tag} · ${r.origin.label}` : ""];
    return { kind: /\.json$/.test(r.path || "") || text.trimStart().startsWith("{") ? "json" : "md", title, path, lines: text.replace(/\n$/, "").split("\n").map((t) => ({ text: t })) };
  }
  // ---------- Rich UI: the panel's default view of an item, scoped to the Workspace, Agent and Environment pickers ----------
  let drawerMode = "rich";
  const VIEWS = { rich: { label: "Rich UI", icon: "preview" }, editor: { label: "Editor", icon: "code" }, output: { label: "Output", icon: "output" } };
  const viewOf = (r) => (r.type === "browse" ? "rich" : isConn(r.type) && outputOpen ? "output" : drawerMode);
  const switchHtml = (on, label, attr) => `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" ${attr}><div class="monaco-switch-thumb"></div></button>`;
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  function mdHtml(text) {
    const out = [], lines = text.split("\n");
    let list = null, para = [], fence = null;
    const flush = () => { if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`); para = []; if (list) out.push(`</${list}>`); list = null; };
    for (const l of lines) {
      if (fence) { if (/^```/.test(l)) { out.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`); fence = null; } else fence.push(l); continue; }
      if (/^```/.test(l)) { flush(); fence = []; continue; }
      const h = l.match(/^(#{1,4}) (.*)/), li = l.match(/^\s*(?:([-*])|\d+\.) (.*)/);
      if (h) { flush(); out.push(`<h${h[1].length + 2}>${inline(h[2])}</h${h[1].length + 2}>`); }
      else if (li) { const tag = li[1] ? "ul" : "ol"; if (para.length || list !== tag) flush(); if (!list) { out.push(`<${tag}>`); list = tag; } out.push(`<li>${inline(li[2])}</li>`); }
      else if (!l.trim()) flush();
      else { if (list) flush(); para.push(l.trim()); }
    }
    if (fence) out.push(`<pre><code>${esc(fence.join("\n"))}</code></pre>`);
    flush();
    return out.join("");
  }
  const frontmatter = (text) => {
    const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
    if (!m) return { props: {}, body: text };
    const props = {};
    for (const l of m[1].split("\n")) { const kv = l.match(/^([\w-]+):\s*(.*)$/); if (kv) props[kv[1]] = kv[2].replace(/^(['"])(.*)\1$/, "$2"); }
    return { props, body: text.slice(m[0].length) };
  };
  const sec = (title, body, meta = "", boxed = false) => `<section class="cd-sec${boxed ? " is-boxed" : ""}"><div class="cd-sec-head"><h3>${esc(title)}</h3>${meta ? `<span class="cd-sec-meta">${meta}</span>` : ""}</div>${body}</section>`;
  const setting = (title, desc, ctl) => `<div class="cd-setting"><div class="cd-setting-text"><div class="cd-setting-title">${esc(title)}</div>${desc ? `<div class="cd-setting-desc">${desc}</div>` : ""}</div><div class="cd-setting-ctl">${ctl}</div></div>`;
  const props = (pairs) => `<dl class="cd-props">${pairs.filter(([, v]) => v).map(([k, v, mono]) => `<dt>${esc(k)}</dt><dd${mono ? ' class="is-mono"' : ""}>${v}</dd>`).join("")}</dl>`;
  const diag = (cls, icon, title, msg, actions) => icon ? `<div class="sc-diag ${cls}"><div class="sc-diag-head"><span class="codicon codicon-${icon}" aria-hidden="true"></span><span>${esc(title)}</span></div>${msg ? `<p class="sc-diag-msg">${esc(msg)}</p>` : ""}${actions ? `<div class="sc-diag-actions">${actions}</div>` : ""}</div>`
    : `<div class="sc-diag is-inline ${cls}"><div class="sc-diag-text"><div class="sc-diag-head"><span>${esc(title)}</span></div>${msg ? `<p class="sc-diag-msg">${esc(msg)}</p>` : ""}</div>${actions ? `<div class="sc-diag-actions">${actions}</div>` : ""}</div>`;
  const btn = (label, attr, primary) => `<button type="button" class="se-btn small${primary ? " primary" : ""}" ${attr}>${esc(label)}</button>`;
  const splitBtn = (label) => `<div class="monaco-button-dropdown sc-split is-primary"><button type="button" class="se-btn small primary" data-disc-install title="${esc(label)} for Copilot on This Computer">${esc(label)}</button><div class="monaco-button-dropdown-separator"><div></div></div><button type="button" class="se-btn small primary monaco-dropdown-button" data-disc-install-more aria-haspopup="menu" aria-label="More ${esc(label.toLowerCase())} options" title="More ${esc(label.toLowerCase())} options"><span class="codicon codicon-chevron-down" aria-hidden="true"></span></button></div>`;
  // Bordered key/value tables and a "Contains" box, as in the product's connector and plugin details.
  const kvTable = (pairs) => `<div class="cd-kv" role="table">${pairs.filter(([, v]) => v).map(([k, v]) => `<div class="cd-kv-row" role="row"><div class="cd-kv-k" role="rowheader">${esc(k)}</div><div class="cd-kv-v" role="cell">${v}</div></div>`).join("")}</div>`;
  const urlLink = (u) => u && `<button type="button" class="se-link-btn cd-url" data-ext-link="${esc(u)}">${esc(u)}</button>`;
  const containsBox = (groups) => `<div class="cd-box">${groups.filter((g) => g.items.length).map((g) => `<div class="cd-box-group"><div class="cd-box-head">${esc(g.label)}<span class="cd-box-count">${g.items.length}</span></div>${g.items.map(([n, sub]) => `<div class="cd-box-item"><div class="cd-box-name">${esc(n)}</div>${sub ? `<div class="cd-box-sub">${esc(sub)}</div>` : ""}</div>`).join("")}</div>`).join("")}</div>`;
  const otherInfo = (i, flat) => sec("Other Information", (flat ? props : kvTable)([["Author Website", urlLink(i.authorSite)], ["Repository", urlLink(i.repo)], ["Keywords", i.keywords && esc(i.keywords)], ["Homepage", urlLink(i.homepage)], ["License", i.license && esc(i.license)], ["Export Supported", i.kind === "connector" ? (i.exportable ? "Yes" : "No") : ""]]), "", !flat);
  const connStatus = (c) => ({ signin: "Needs sign-in", disconnected: "Disconnected", error: "Error", stopped: "Stopped" })[c.state] || "Connected";

  // ---------- MCP server configuration form (the product's server editor) ----------
  const mcpDraft = new Map();
  const formOf = (id) => {
    const d = MCP[id]?.def || {};
    return { type: d.type || "stdio", command: d.command || "", args: (d.args || []).map((a) => (/\s/.test(a) || !a ? JSON.stringify(a) : a)).join(" "), env: Object.entries(d.env || {}), cwd: d.cwd || "", url: d.url || "", headers: Object.entries(d.headers || {}) };
  };
  const draftOf = (id) => mcpDraft.get(id) || formOf(id);
  const editDraft = (id) => { if (!mcpDraft.has(id)) mcpDraft.set(id, structuredClone(formOf(id))); return mcpDraft.get(id); };
  const isDirty = (id) => mcpDraft.has(id) && JSON.stringify(mcpDraft.get(id)) !== JSON.stringify(formOf(id));
  const parseArgs = (s) => { const t = s.trim(); if (t.startsWith("[")) { try { return JSON.parse(t).map(String); } catch {} } return (t.match(/"[^"]*"|\S+/g) || []).map((a) => (a.startsWith('"') ? a.slice(1, -1) : a)); };
  function saveDraft(id) {
    const d = mcpDraft.get(id), pairs = (l) => Object.fromEntries(l.filter(([k]) => k.trim()).map(([k, v]) => [k.trim(), v]));
    const def = { type: d.type };
    if (d.type === "stdio") { def.command = d.command.trim(); const a = parseArgs(d.args); if (a.length) def.args = a; if (Object.keys(pairs(d.env)).length) def.env = pairs(d.env); if (d.cwd.trim()) def.cwd = d.cwd.trim(); }
    else { def.url = d.url.trim(); if (Object.keys(pairs(d.headers)).length) def.headers = pairs(d.headers); }
    (MCP[id] ||= { file: "~/.copilot/mcp-config.json" }).def = def;
    mcpDraft.delete(id);
  }
  function mcpForm(c, m) {
    const d = draftOf(c.id), ro = !!c.origin, dis = ro ? " readonly" : "", file = m.file || "";
    const label = (forId, text, opt) => `<label class="cd-label" for="${forId}">${text}${opt ? ' <span class="cd-opt">(optional)</span>' : ""}</label>`;
    const field = (key, text, o = {}) => `<div class="cd-field">${label(`mcpf-${key}`, text, o.opt)}<input id="mcpf-${key}" class="cd-input" data-mcp-field="${key}" value="${esc(d[key])}" placeholder="${esc(o.ph || "")}" spellcheck="false" autocomplete="off"${dis}>${o.hint ? `<div class="cd-hint">${o.hint}</div>` : ""}</div>`;
    const pairs = (key, text, hint, add) => `<div class="cd-field" role="group" aria-labelledby="mcpf-${key}-l"><div class="cd-label" id="mcpf-${key}-l">${text} <span class="cd-opt">(optional)</span></div>${hint ? `<div class="cd-hint is-top">${hint}</div>` : ""}
      <div class="cd-pairs">${d[key].length ? '<div class="cd-pairs-head" aria-hidden="true"><span>Name</span><span>Value</span></div>' : ""}${d[key].map(([k, v], i) => `<div class="cd-pair">
        <input class="cd-input" data-mcp-pair="${key}|${i}|0" value="${esc(k)}" aria-label="${text}: name ${i + 1}" spellcheck="false" autocomplete="off"${dis}>
        <input class="cd-input" data-mcp-pair="${key}|${i}|1" value="${esc(v)}" aria-label="${text}: value of ${esc(k || `row ${i + 1}`)}" spellcheck="false" autocomplete="off"${dis}>
        ${ro ? "" : `<button type="button" class="se-icon-btn" data-mcp-pair-del="${key}|${i}" title="Remove" aria-label="Remove ${esc(k || `row ${i + 1}`)}"><span class="codicon codicon-close" aria-hidden="true"></span></button>`}</div>`).join("")}</div>
      ${ro ? "" : `<div>${btn(add, `data-mcp-pair-add="${key}"`)}</div>`}</div>`;
    const local = /^~\/\.copilot\//.test(file);
    const envHint = ro ? "Set by the plugin." : local ? "Values are read by the Copilot CLI. VS Code input variables such as <code>${input:id}</code> are not supported in this file." : "Use <code>${input:id}</code> to prompt for a secret instead of saving it in the repo.";
    const types = ["stdio", "http", "sse"];
    let html = `<div class="cd-field"><div class="cd-label" id="mcpf-type-l">Server Type</div><div class="cd-seg" role="radiogroup" aria-labelledby="mcpf-type-l">${types.map((t) => `<button type="button" role="radio" aria-checked="${d.type === t}" tabindex="${d.type === t ? 0 : -1}" data-mcp-type="${t}"${ro ? " disabled" : ""}>${t}</button>`).join("")}</div></div>`;
    if (d.type === "stdio") html += field("command", "Command", { ph: "npx" })
      + field("args", "Arguments", { opt: true, hint: "Separate arguments with spaces, or enter a JSON array if an argument contains spaces or is empty." })
      + pairs("env", "Environment Variables", envHint, "Add Variable")
      + field("cwd", "Working Directory", { opt: true, ph: "/path/to/project" });
    else html += field("url", "URL", { ph: "https://example.com/mcp" }) + pairs("headers", "Headers", envHint, "Add Header");
    const dirty = isDirty(c.id);
    html += `<div class="cd-form-foot">${btn("Other Properties", 'data-drawer-mode="editor"')}<span class="se-flex"></span>${ro ? "" : `<button type="button" class="se-btn small" data-mcp-discard${dirty ? "" : " disabled"}>Discard Changes</button><button type="button" class="se-btn small primary" data-mcp-save${dirty ? "" : " disabled"}>Save</button>`}</div>`;
    return `<div class="cd-form" data-mcp-form="${esc(c.id)}">${html}</div>`;
  }
  const syncFormFoot = (form) => { const dirty = isDirty(form.dataset.mcpForm); for (const b of form.querySelectorAll("[data-mcp-discard], [data-mcp-save]")) b.disabled = !dirty; };
  const toolList = (t) => `<div class="cd-list">${t.tools.map((x) => {
    const on = t.locked || !offIn(t.id).has(x);
    return `<div class="cd-list-row"><span class="codicon codicon-tools" aria-hidden="true"></span><div class="cd-list-text"><span class="cd-list-name is-mono">${esc(x)}</span>${TOOL_DESC[x] ? `<span class="cd-list-desc">${esc(TOOL_DESC[x])}</span>` : ""}</div>
      ${t.locked ? '<span class="codicon codicon-lock-small sc-lock" title="Always available"></span>' : switchHtml(on, `${on ? "Turn off" : "Turn on"} ${x}`, `data-detail-tool="${t.id}|${esc(x)}"`)}</div>`;
  }).join("")}</div>`;
  function richHtml(r) {
    const c = r.item, ref = `${r.type}|${esc(r.key)}`, src = sourceOf(r), ws = f.ws ? workspaceLabel(f.ws) : "";
    const srcMeta = `<span class="cd-meta-item"><span class="codicon codicon-${src.icon}" aria-hidden="true"></span>${esc(src.label)}${src.tag ? ` <span class="ct-muted">${esc(src.tag)}</span>` : ""}</span>`;
    const openEditor = r.path || isConn(r.type) ? `<button type="button" class="se-link-btn cd-link" data-drawer-mode="editor">${esc(r.path || MCP[c?.id]?.file || "")}</button>` : "";
    let desc = "", actions = "", body = "", lead = "";
    if (isConn(r.type) && c.connector) {
      // Connectors (Copilot Connectors): an account, not a server you configure.
      const m = MCP[c.id] || {}, info = CONNECTOR_INFO[c.id] || { identifier: c.id, url: m.def?.url, author: "GitHub" }, tools = TOOLS_OF[c.id], off = c.state === "disconnected";
      desc = info.desc || c.does || "";
      actions = (off ? btn("Connect", `data-conn-connect="${ref}"`, true) : btn("Disconnect", "data-conn-disconnect")) + (off ? "" : btn("Show Output", 'data-drawer-mode="output"'));
      if (c.state === "signin") body += diag("", "", "Not signed in", `Agents ask you to sign in the first time they need ${c.name}.`, btn("Sign In", "data-signin-detail", true));
      if (off) body += diag("", "", "Not connected", `Connect to let agents use ${c.name}.`, btn("Connect", `data-conn-connect="${ref}"`, true));
      body += sec("Details", props([["Identifier", esc(info.identifier), true], ["Author", esc(info.author)], ["Account", c.account && esc(c.account)], ["Source", srcMeta]]));
      body += flatContains([{ label: "MCP Servers", items: [[info.identifier, `http · ${info.url}`]] }]);
      if (tools) body += sec("Tools", toolList(tools), `${enabledCount(tools)} of ${tools.count} on`);
      body += otherInfo({ kind: "connector", ...info }, true);
    } else if (isConn(r.type)) {
      const m = MCP[c.id] || {}, tools = TOOLS_OF[c.id], compat = f.env && m.compat?.[f.env];
      desc = c.does || "";
      actions = (c.origin ? "" : btn("Edit Configuration", 'data-drawer-mode="editor"')) + (c.state === "error" ? "" : btn("Show Output", 'data-drawer-mode="output"'));
      if (c.state === "error") body += diag("is-error", "error", "This server reported an error", m.error, btn("Restart", "data-restart-detail", true) + btn("Show Output", 'data-drawer-mode="output"'));
      if (c.state === "stopped") body += diag("", "", "Stopped", "Agents start it when they need its tools.", btn("Start", `data-row-start="${ref}"`, true));
      if (compat) body += diag("is-warn", "warning", `Not supported on ${envOf(f.env).label}`, compat);
      if (c.origin) body += `<div class="sc-banner"><span class="codicon codicon-info" aria-hidden="true"></span>Managed by the ${esc(c.origin.label)} plugin. Changes come from there.</div>`;
      body += sec("Details", props([["Location", m.file && `<button type="button" class="se-link-btn cd-link" data-drawer-mode="editor" title="Open ${esc(m.file)}">${esc(m.file)}</button>`], ["Source", srcMeta]]));
      body += mcpForm(c, m);
      if (tools) body += sec("Tools", toolList(tools), `${enabledCount(tools)} of ${tools.count} on`);
    } else if (r.type === "plugins") {
      desc = r.sub || "";
      actions = btn("Edit plugin.json", 'data-drawer-mode="editor"');
      body += sec("Details", props([["Version", "1.0.0"], ["Location", esc(`~/.copilot/installed-plugins/${r.key}`), true], ["Source", srcMeta]]));
      body += sec("Settings", setting("Enabled", "Turn off to unload everything it includes.", pluginSwitch(r)));
      const inc = [
        ...(c === PLUGIN ? ALL.filter((x) => x.source === "plugin").map((x) => ({ type: x.type, key: `plugin::${x.name}`, name: x.name })) : []),
        ...CONNECTIONS.filter((x) => x.origin?.plugin === c).map((x) => ({ type: "mcp", key: x.id, name: x.name })),
        ...CANVASES.filter((x) => SRC[x.origin]?.plugin === c).map((x) => ({ type: "canvases", key: x.id, name: x.name })),
      ];
      if (inc.length) body += sec("Includes", `<div class="cd-list">${inc.map((x) => `<button type="button" class="cd-list-row is-link" data-open="${x.type}|${esc(x.key)}"><span class="codicon codicon-${TYPES[x.type].icon}" aria-hidden="true"></span><div class="cd-list-text"><span class="cd-list-name">${esc(x.name)}</span><span class="cd-list-desc">${esc(TYPES[x.type].one[0].toUpperCase() + TYPES[x.type].one.slice(1))}</span></div><span class="codicon codicon-chevron-right" aria-hidden="true"></span></button>`).join("")}</div>`, String(inc.length));
    } else if (r.type === "tools") {
      const t = r.tools;
      desc = r.conn?.does || (r.origin ? `Tools from the ${r.origin.label} ${r.origin.tag.toLowerCase()}.` : `Tools that come with ${r.tag || "the agent"}.`);
      body += sec("Details", props([["Source", srcMeta]]));
      if (!t.locked) body += sec("Settings", setting("Enabled", "Turn off to hide all of its tools from agents.", control(r)));
      body += sec("Tools", toolList(t), t.locked ? "Always available" : `${enabledCount(t)} of ${t.count} on`);
    } else if (r.type === "canvases") {
      desc = r.sub ? `${r.sub} Agents open it next to the chat when your task needs it.` : "";
      actions = r.origin ? btn(r.origin.kind === "plugin" ? "Show Plugin" : "Show Extension", `data-src-open="${r.origin.id}"`) : "";
      body += sec("Details", props([["ID", esc(r.key), true], ["Source", srcMeta]]));
    } else {
      const text = contentOf(r);
      if (r.scope === "builtin") body += `<div class="sc-banner"><span class="codicon codicon-info" aria-hidden="true"></span>Built-in. Editing saves an override to User or Workspace.</div>`;
      else if (r.origin) body += `<div class="sc-banner"><span class="codicon codicon-info" aria-hidden="true"></span>Managed by ${r.origin.kind === "account" ? "your organization" : `the ${esc(r.origin.label)} ${r.origin.tag.toLowerCase()}`}. Changes come from there.</div>`;
      actions = btn(r.editable || r.scope === "workspace" ? "Edit" : "View Source", 'data-drawer-mode="editor"') + (r.path ? btn("Open File", "data-open-path") : "");
      if (r.type === "hooks" && text.trimStart().startsWith("{")) {
        let hooksObj = {};
        try { hooksObj = JSON.parse(text.replace(/\n…\s*$/, "")).hooks || {}; } catch {}
        desc = /\.disabled$/.test(r.path || "") ? "Disabled. Rename the file to turn it on." : "Commands that run at set points while an agent works.";
        const rows = Object.entries(hooksObj).flatMap(([ev, list]) => (Array.isArray(list) ? list : [list]).map((h) => ({ ev, cmd: h.bash || h.command || h.powershell || "", timeout: h.timeoutSec, matcher: h.matcher })));
        body += sec("Details", props([["Location", r.path && openEditor], ["Source", srcMeta]]));
        body += sec("Events", rows.length ? `<div class="cd-list">${rows.map((h) => `<div class="cd-list-row is-tall"><span class="codicon codicon-zap" aria-hidden="true"></span><div class="cd-list-text"><span class="cd-list-name">${esc(h.ev)}${h.matcher ? ` <span class="ct-muted">· ${esc(h.matcher)}</span>` : ""}</span><span class="cd-list-desc is-mono" title="${esc(h.cmd)}">${esc(h.cmd)}</span></div>${h.timeout ? `<span class="cd-sec-meta">${h.timeout}s timeout</span>` : ""}</div>`).join("")}</div>` : '<p class="cd-empty">No hooks.</p>', String(rows.length));
      } else {
        const fm = frontmatter(text);
        desc = fm.props.description || "";
        const extra = Object.entries(fm.props).filter(([k]) => !["description", "name"].includes(k)).map(([k, v]) => [k === "applyTo" ? "Applies to" : k.replace(/-/g, " ").replace(/^\w/, (x) => x.toUpperCase()), esc(v), k === "applyTo"]);
        body += sec("Details", props([["Location", openEditor], ["Source", srcMeta], ...extra]));
        if (fm.body.trim()) body += sec("Content", `<div class="cd-md">${mdHtml(fm.body.replace(/\n…\s*$/, "\n"))}</div>`);
      }
    }
    // Actions live in the view picker (Editor, Output); status sits next to the name in the panel header.
    return `${desc ? `<div class="cd-hero"><p class="cd-desc">${esc(desc)}</p></div>` : ""}${body}`;
  }

  // ---------- Discover: a card's details in the same side panel ----------
  const discCards = () => host.querySelectorAll("vsc-customization-discovery-card");
  const DISC_TYPE = { connector: "connectors", mcp: "mcp", plugin: "plugins", skill: "skills" };
  function discRow(name) {
    const card = [...discCards()].find((x) => x.getAttribute("name") === name);
    if (!card) return null;
    const meta = card.getAttribute("meta") || "", [kindLabel, feed = ""] = meta.split(" · ");
    const info = DISCOVER_INFO[name] || { kind: /^Skill/.test(meta) ? "skill" : /^Plugin/.test(meta) ? "plugin" : "mcp" };
    return { type: "browse", key: name, name, card, info, kindLabel, feed, desc: card.getAttribute("description") || "", icon: card.getAttribute("icon-src"), fallback: card.getAttribute("fallback-icon") || "extensions", installed: cardItem(name) };
  }
  const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const defLine = (d) => (d.type === "stdio" ? `stdio · ${[d.command, ...(d.args || [])].join(" ")}` : `${d.type} · ${d.url}`);
  // Discover panels: one flat list section per group, like the Tools list in Skills / Tools details.
  const CONTAINS_ICON = { Skills: TYPES.skills.icon, "MCP Servers": TYPES.mcp.icon, Canvases: TYPES.canvases.icon, Files: "file" };
  const flatContains = (groups) => groups.filter((g) => g.items.length).map((g) => sec(g.label, `<div class="cd-list">${g.items.map(([n, sub]) => `<div class="cd-list-row"><span class="codicon codicon-${CONTAINS_ICON[g.label] || "symbol-misc"}" aria-hidden="true"></span><div class="cd-list-text"><span class="cd-list-name">${esc(n)}</span>${sub ? `<span class="cd-list-desc" title="${esc(sub)}">${esc(sub)}</span>` : ""}</div></div>`).join("")}</div>`, String(g.items.length))).join("");
  function discHtml(d) {
    const i = d.info, inst = d.installed, isC = i.kind === "connector", tIcon = TYPES[DISC_TYPE[i.kind]].icon;
    const meta = `<span class="cd-meta-item"><span class="codicon codicon-${tIcon}" aria-hidden="true"></span>${esc(isC ? "Connector" : d.kindLabel)}</span>${d.feed ? `<span class="cd-meta-item"><span class="codicon codicon-${d.feed === "GitHub Feed" ? "github" : "globe"}" aria-hidden="true"></span>${esc(d.feed)}</span>` : ""}`;
    const actions = inst ? btn("Manage", "data-disc-install") + btn(`Show in ${TYPES[DISC_TYPE[i.kind]].label}`, "data-disc-show")
      : splitBtn(isC ? "Connect" : "Install");
    let body = "";
    if (isC) {
      body += sec("Details", props([["Status", inst ? "Connected" : "Not connected"], ["Identifier", esc(i.identifier)], ["Author", esc(i.author)]]));
      if (inst) body += flatContains([{ label: "MCP Servers", items: [[i.identifier, `http · ${i.url}`]] }]);
    } else if (i.kind === "mcp") {
      const def = i.def || { type: "stdio", command: slug(d.name) };
      body += sec("Details", props([["Publisher", i.author && esc(i.author)], ["Version", i.version && esc(i.version)], ["Server Type", esc(def.type)], ["Status", inst ? "Installed" : ""]]));
      const asks = [...(i.env || []), ...(i.headers || [])];
      if (inst) {
        body += flatContains([{ label: "MCP Servers", items: [[slug(d.name), defLine(def)]] }]);
        if (asks.length) body += sec("Asks for", props(asks.map((k) => [k, `<span class="ct-muted">${i.env?.includes(k) ? "Environment variable" : "Header"}, asked for when you install</span>`])));
      }
    } else if (i.kind === "plugin") {
      const c = i.contains || {};
      body += sec("Details", props([["Author", i.author && esc(i.author)], ["Version", i.version && esc(i.version)], ["Status", inst ? "Installed" : ""]]));
      if (inst) {
        body += flatContains([
          { label: "Skills", items: (c.skills || []).map((n) => [n]) },
          { label: "MCP Servers", items: c.mcp || [] },
          { label: "Canvases", items: (c.canvases || []).map((n) => [n]) },
        ]);
      }
    } else {
      body += sec("Details", props([["Author", i.author && esc(i.author)], ["Version", i.version && esc(i.version)], ["Status", inst ? "Installed" : ""]]));
      if (inst && i.files) body += flatContains([{ label: "Files", items: i.files.map((n) => [n]) }]);
    }
    body += otherInfo(i, true);
    return `<div class="cd-hero"><div class="cd-browse-toolbar"><div class="cd-meta">${meta}</div><div class="cd-actions">${actions}</div></div><p class="cd-desc">${esc(d.desc)}</p></div>${body}`;
  }
  /** Editor view of a Discover card: the manifest it installs from. */
  function discDoc(d) {
    const i = d.info, path = d.feed || "Discover";
    if (i.kind === "connector") return { kind: "json", title: `${i.identifier}.json`, path, lines: jsonDoc({ name: d.name, identifier: i.identifier, description: d.desc, type: "http", url: i.url }) };
    if (i.kind === "mcp") return { kind: "json", title: "server.json", path, lines: jsonDoc({ name: slug(d.name), description: d.desc, version: i.version, repository: i.repo && { url: i.repo }, ...(i.def || {}) }) };
    if (i.kind === "plugin") { const c = i.contains || {};
      return { kind: "json", title: "plugin.json", path, lines: jsonDoc({ name: slug(d.name), displayName: d.name, description: d.desc, version: i.version, author: i.author && { name: i.author }, ...(c.skills ? { skills: "skills/" } : {}), ...(c.mcp ? { mcpServers: ".mcp.json" } : {}), ...(c.canvases ? { extensions: "extensions/" } : {}) }) }; }
    return { kind: "md", title: "SKILL.md", path, lines: `---\nname: ${slug(d.name)}\ndescription: ${d.desc}\n---\n\n# ${d.name}\n\n${d.desc}`.split("\n").map((text) => ({ text })) };
  }
  /** Happy path: one click always installs to This Computer, for your user, for Copilot (ignores any "Installs to" target). The split button's menu opens the full dialog. */
  function installCard(card, advanced) {
    const name = card.getAttribute("name"), existing = cardItem(name);
    if (existing) return openInstall({ items: [existing], mode: "edit", here: target });
    const meta = card.getAttribute("meta") || "", kind = /^Skill/.test(meta) ? "skill" : /^Plugin/.test(meta) ? "plugin" : "connection", info = DISCOVER_INFO[name];
    const item = { kind, id: slug(name), name, card: name, icon: { src: card.getAttribute("icon-src") }, does: card.getAttribute("description"), sub: meta, at: new Set(), def: "on" };
    if (info?.kind === "connector") { item.connector = true; CONNECTOR_INFO[item.id] = { ...info, desc: item.does }; MCP[item.id] = { file: "Copilot Connectors", def: { type: "http", url: info.url } }; }
    else if (info?.kind === "mcp" && info.def) MCP[item.id] = { file: "~/.copilot/mcp-config.json", def: structuredClone(info.def) };
    if (advanced) return openInstall({ items: [item], mode: "new", preset: target ? [target] : null, here: target, sub: meta, onDone: () => card.setAttribute("action", "Manage") });
    const slot = K("local", "copilot"), [envId, agent] = split(slot), isC = !!item.connector;
    const it = { ...item, at: new Set([slot]), isNew: true };
    const list = { connection: CONNECTIONS, skill: USER_SKILLS, plugin: PLUGINS }[kind];
    list.push(it);
    card.setAttribute("action", "Manage");
    changed();
    toast(`${isC ? "Connected" : "Installed"} ${name} for ${HARNESSES[agent].label} on ${envOf(envId).label}.`, ["Undo", "Change Where…"], (label) => {
      if (label === "Undo") { const i = list.indexOf(it); if (i >= 0) list.splice(i, 1); card.setAttribute("action", isC ? "Connect" : "Install"); return changed(); }
      openInstall({ items: [it], mode: "edit" });
    });
  }
  function installMenu(at, card) {
    const isC = DISCOVER_INFO[card.getAttribute("name")]?.kind === "connector", verb = isC ? "Connect" : "Install";
    openMenu(at, [{ label: `${verb} for Copilot on This Computer`, quick: true }, "-", { label: `${verb} Where…` }], (m) => installCard(card, !m.quick));
  }
  /** The design-system card has a single action button; give Install / Connect a dropdown half, like VS Code's split buttons. */
  function splitCards() {
    for (const card of discCards()) {
      const box = card.querySelector(".customization-discovery-card-actions"), main = box?.querySelector("a.monaco-button:not(.monaco-dropdown-button)");
      if (!main) continue;
      const wrap = box.querySelector(".monaco-button-dropdown"), want = /^(Install|Connect)$/.test(card.getAttribute("action") || "Install");
      if (want && !wrap) {
        const w = document.createElement("div");
        w.className = "monaco-button-dropdown sc-split";
        w.innerHTML = `<div class="monaco-button-dropdown-separator"><div></div></div><a class="monaco-button secondary small monaco-text-button monaco-dropdown-button" tabindex="0" role="button" aria-haspopup="menu" aria-label="More ${main.textContent.toLowerCase()} options" title="More ${main.textContent.toLowerCase()} options" data-card-install-more><span class="codicon codicon-chevron-down" aria-hidden="true"></span></a>`;
        main.title = `${main.textContent} for Copilot on This Computer`;
        w.lastElementChild.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } });
        w.prepend(main);
        box.append(w);
      } else if (!want && wrap) { box.append(main); wrap.remove(); }
    }
  }
  new MutationObserver(splitCards).observe(host, { subtree: true, childList: true, attributes: true, attributeFilter: ["action"] });
  const curRow = () => (!detail ? null : detail.type === "browse" ? discRow(detail.key) : rowOf(detail.type, detail.key));

  function renderDrawer(r) {
    const view = viewOf(r), rich = view === "rich";
    const isDisc = r.type === "browse", d = rich ? null : isDisc ? discDoc(r) : docOf(r), key = `${r.type}|${r.key}|${view}`, same = !!drawer && drawerFor === key;
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.className = "se-json-drawer";
      drawer.setAttribute("role", "dialog");
      drawer.innerHTML = `<div class="se-json-sash" role="separator" aria-orientation="vertical" aria-label="Resize" tabindex="0"></div>
        <header><span class="se-json-icon-slot" aria-hidden="true"></span><span class="se-json-title"></span><span class="cd-head-status"></span><span class="cd-badge" hidden>Preview</span><span class="se-json-path"></span><span class="se-flex"></span>
          <button type="button" class="cd-view-pick" data-drawer-view aria-haspopup="menu" title="Change view"><span class="codicon" aria-hidden="true"></span><span class="cd-view-label"></span><span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
          <button type="button" class="se-icon-btn" title="Close" aria-label="Close" data-drawer-close><span class="codicon codicon-close" aria-hidden="true"></span></button></header>
        <div class="cd-rich"></div><pre class="se-json-file"><code></code></pre>`;
      root.append(drawer);
      // Discover reflows its cards beside the panel (the open card stays visible); tables keep the overlay.
      new ResizeObserver(() => drawer && root.style.setProperty("--cd-drawer-w", `${drawer.getBoundingClientRect().width}px`)).observe(drawer);
      // Drag the left edge (or use ←/→) to resize; the width is kept for the session.
      const sash = drawer.querySelector(".se-json-sash");
      const setWidth = (w) => { drawerW = Math.max(320, Math.min(root.clientWidth - 240, w)); drawer.style.width = drawerW + "px"; };
      if (drawerW) setWidth(drawerW);
      sash.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        sash.setPointerCapture(e.pointerId);
        const startX = e.clientX, startW = drawer.getBoundingClientRect().width;
        sash.classList.add("active"); root.classList.add("resizing-json");
        const move = (ev) => setWidth(startW + (startX - ev.clientX));
        const up = () => { sash.classList.remove("active"); root.classList.remove("resizing-json"); sash.removeEventListener("pointermove", move); sash.removeEventListener("pointerup", up); };
        sash.addEventListener("pointermove", move);
        sash.addEventListener("pointerup", up);
      });
      sash.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setWidth(drawer.getBoundingClientRect().width + (e.key === "ArrowLeft" ? 24 : -24)); }
      });
    }
    const title = rich ? r.name : d.title, path = rich ? "" : d.path;
    drawer.setAttribute("aria-label", title);
    drawer.querySelector(".se-json-badge, .cd-badge").hidden = !(rich && (isDisc ? r.info.preview : r.item?.connector && CONNECTOR_INFO[r.item.id]?.preview));
    drawer.querySelector(".se-json-icon-slot").innerHTML = rich ? (isDisc ? (r.icon ? `<img class="cd-head-img" src="${esc(r.icon)}" alt="">` : `<span class="codicon codicon-${esc(r.fallback)} se-json-icon"></span>`) : iconFor(r, 16) || `<span class="codicon codicon-${TYPES[r.type].icon} se-json-icon"></span>`)
      : `<span class="codicon codicon-${{ json: "json", md: "markdown", log: "output" }[d.kind]} se-json-icon"></span>`;
    drawer.querySelector(".se-json-title").textContent = title;
    drawer.querySelector(".cd-head-status").innerHTML = !isDisc && isConn(r.type) ? statusCell(r).replace(/<button[\s\S]*$/, "") : "";
    const pathEl = drawer.querySelector(".se-json-path");
    pathEl.textContent = path; pathEl.title = path;
    const pick = drawer.querySelector(".cd-view-pick");
    pick.firstElementChild.className = `codicon codicon-${VIEWS[view].icon}`;
    pick.querySelector(".cd-view-label").textContent = VIEWS[view].label;
    pick.setAttribute("aria-label", `View: ${VIEWS[view].label}`);
    // Discover items are not installed yet, so there is no file to show in an editor.
    pick.hidden = isDisc;
    drawer.classList.toggle("is-rich", rich);
    const pre = drawer.querySelector(".se-json-file"), richEl = drawer.querySelector(".cd-rich");
    if (rich) {
      // Re-rendering after a switch keeps the scroll position and the focused control.
      const top = same ? richEl.scrollTop : 0, a = document.activeElement, focusSel = same && richEl.contains(a) ? [...a.attributes].filter((x) => x.name.startsWith("data-")).map((x) => `[${x.name}="${CSS.escape(x.value)}"]`).join("") : "";
      richEl.innerHTML = isDisc ? discHtml(r) : richHtml(r);
      richEl.scrollTop = top;
      if (focusSel) richEl.querySelector(focusSel)?.focus();
      drawerFor = key;
      return;
    }
    const top = pre.scrollTop;
    const html = d.kind === "md" ? hlMarkdown(d.lines.map((l) => l.text)) : d.lines.map((l) => (d.kind === "log" ? hlLog(l.text) : hlJson(l.text)));
    pre.firstElementChild.innerHTML = d.lines.map((l, i) => `<span class="se-json-line${l.hl ? " hl" : ""}">${html[i] || " "}</span>`).join("");
    drawerFor = key;
    if (same) { pre.scrollTop = top; return; }
    pre.scrollTop = 0;
    const hl = pre.querySelector(".hl");
    if (hl) pre.scrollTop = hl.offsetTop - pre.offsetTop - (pre.clientHeight - hl.offsetHeight) / 2;
  }
  function syncDrawer() {
    const dr = section === "browse" && detail?.type === "browse" ? discRow(detail.key) : null;
    for (const card of discCards()) card.classList.toggle("is-selected", card === dr?.card);
    root.classList.toggle("has-disc-drawer", !!dr);
    if (dr) setTimeout(() => dr.card.isConnected && dr.card.scrollIntoView({ block: "nearest" }), 60);
    const r = dr || (detail && TYPES[section] && detail.type === section ? rowOf(section, detail.key) : null);
    if (r) return renderDrawer(r);
    if (detail?.type === "browse") detail = null;
    if (detail && TYPES[section]) { detail = null; outputOpen = false; renderPage(section); }
    drawer?.remove(); drawer = null; drawerFor = "";
  }
  function setView(v) {
    if (v === "output") outputOpen = true;
    else { drawerMode = v; outputOpen = false; }
    renderPage(section);
    drawer?.querySelector(".cd-view-pick")?.focus();
  }
  /** Closes the side panel; returns whether one was open. */
  function closeDrawer() {
    if (!drawer) return false;
    const key = detail ? `${detail.type}|${detail.key}` : "";
    detail = null; outputOpen = false;
    renderPage(section);
    const tr = [...(hosted[section]?.querySelectorAll("tr[data-row]") || [])].find((x) => x.dataset.row === key);
    tr?.focus();
    if (key.startsWith("browse|")) [...discCards()].find((x) => x.getAttribute("name") === key.slice(7))?.querySelector(".customization-discovery-card-primary")?.focus();
    return true;
  }

  // ---------- Environments and Sessions ----------
  function envPage() {
    return `<div class="sc-list">${ENVS.map((e) => {
      const conns = CONNECTIONS.filter((c) => !c.origin && e.agents.some((a) => c.at.has(K(e.id, a)))), skills = USER_SKILLS.filter((s) => e.agents.some((a) => s.at.has(K(e.id, a))));
      const ses = Object.entries(sessions()).filter(([, s]) => s.scope.environment === e.id), isOpen = openEnv.has(e.id);
      const onLocal = (x) => e.agents.some((a) => x.at.has(K("local", a))), here = (x) => e.agents.some((a) => x.at.has(K(e.id, a)));
      const missing = e.id === "local" ? [] : syncable().filter((x) => onLocal(x) && !here(x));
      return `<div class="sc-row sc-env-row${isOpen ? " is-open" : ""}">
        <button type="button" class="sc-twisty" data-env-expand="${e.id}" aria-expanded="${isOpen}" aria-label="Details"><span class="codicon codicon-chevron-${isOpen ? "down" : "right"}" aria-hidden="true"></span></button>
        <div class="sc-text"><div class="sc-name-row"><span class="sc-name is-static">${esc(e.label)}</span><span class="en-status${e.offline ? " is-offline" : ""}"><span class="en-status-dot" aria-hidden="true"></span>${e.offline ? "Offline" : "Connected"}</span></div>
          <div class="sc-sub">${esc(e.detail)} · ${esc(e.agents.map((a) => HARNESSES[a].label).join(", "))} · ${plural(conns.length, "connection")}, ${plural(skills.length, "skill")}${ses.length ? ` · ${plural(ses.length, "session")}` : ""}</div></div>
        ${e.id === "local" ? "" : `<button type="button" class="sc-agents" data-sync="${e.id}">${SYNC.has(e.id) ? `<span class="codicon codicon-sync sc-sync-ic" aria-hidden="true"></span>Synced with ${esc(syncLabel(e.id))}` : "Not synced"}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>`}
        <vsc-toolbar label="${esc(e.label)} Actions"><vsc-action icon="ellipsis" label="More Actions..." data-env-more="${e.id}"></vsc-action></vsc-toolbar>
      </div>${isOpen ? `<div class="sc-where-detail">
        ${missing.length ? `<div class="sc-env-line"><span class="codicon codicon-info" aria-hidden="true"></span><span>${esc(plural(missing.length, "customization"))} on This Computer ${missing.length === 1 ? "isn't" : "aren't"} here: ${esc(missing.slice(0, 4).map((x) => x.name).join(", "))}${missing.length > 4 ? ` and ${missing.length - 4} more` : ""}</span><span class="grow"></span><button type="button" class="ev-link" data-copy-from="${e.id}">Copy…</button></div>` : `<div class="sc-env-line"><span class="codicon codicon-check" aria-hidden="true"></span><span>Has everything This Computer has${e.id === "local" ? "" : ""}.</span></div>`}
        <div class="sc-env-line"><span class="codicon codicon-folder" aria-hidden="true"></span><span>Workspaces: ${esc(e.workspaces.map((w) => `${workspaceLabel(w)} (${agentsIn(e, w).map((a) => HARNESSES[a].label).join(", ")})`).join(", "))}</span></div>
        ${ses.map(([id, s]) => `<div class="sc-env-line"><span class="codicon codicon-comment-discussion" aria-hidden="true"></span><span>${esc(s.title)}</span><span class="grow"></span><button type="button" class="ev-link" data-customize-session="${id}">Customize</button></div>`).join("")}
        <div class="sc-env-line"><span class="grow"></span><button type="button" class="ev-link" data-env-lens="${e.id}">Show its customizations</button></div></div>` : ""}`;
    }).join("")}<button type="button" class="sc-add-row" data-add-env><span class="codicon codicon-add" aria-hidden="true"></span>Add Environment…</button></div>`;
  }


  // ---------- Pages ----------
  const DESC = { environments: "Machines your sessions can run on. Each has its own agents and customizations." };
  // Agents window settings: the true globals, as settings rather than bare booleans.
  function settingsPage(el) {
    if (el.querySelector(".mg-settings")) return;
    const sel = (key, value, opts) => `<span class="mg-select-wrap"><select class="monaco-select-box mg-select" data-setting="${key}" aria-label="${esc(key)}">${opts.map((o) => `<option${o === value ? " selected" : ""}>${esc(o)}</option>`).join("")}</select><span class="codicon codicon-chevron-down" aria-hidden="true"></span></span>`;
    const sw = (key, on) => `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" data-setting-switch="${key}" aria-label="${esc(key)}"><div class="monaco-switch-thumb"></div></button>`;
    const item = (title, desc, control) => `<div class="mg-setting"><div class="mg-setting-text"><div class="mg-setting-title">${title}</div><div class="mg-setting-desc">${desc}</div></div><div class="mg-setting-control">${control}</div></div>`;
    el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">Settings</h2><p class="se-page-desc">How new sessions start and how agents ask for things. These apply to every agent and remote.</p></div>
      <div class="sc-head-actions"><button type="button" class="se-btn small" data-all-settings>Open All Settings</button></div></div>
      <div class="en-page-scroll mg-settings">
        <h3 class="mg-sec">New Sessions</h3>
        ${item("Agent", "The agent new sessions start with. You can switch in the composer.", sel("agent", "Copilot", AGENTS.map((a) => HARNESSES[a].label)))}
        ${item("Run On", "Where new sessions run.", sel("remote", "This Computer", ENVS.map((e) => e.label)))}
        ${item("Model", "The model new sessions start with.", sel("model", "GPT-5.6 Sol Fast", MODELS.filter((m) => m.on).map((m) => m.name)))}
        <h3 class="mg-sec">Permissions</h3>
        ${item("Tool Approvals", "Whether agents ask before running terminal commands and editing files outside the workspace.", sel("approvals", "Ask Each Time", ["Ask Each Time", "Allow in This Session", "Allow All"]))}
        ${item("Customizations an Agent Needs", "When an agent needs an MCP server or connector that's off for its session, it asks in the chat first.", sel("jit", "Ask in Chat", ["Ask in Chat", "Turn On Automatically", "Never"]))}
        <h3 class="mg-sec">Notifications</h3>
        ${item("Needs Input", "Notify you when a session is waiting on you.", sw("notify-input", true))}
        ${item("Finished", "Notify you when a background session finishes.", sw("notify-done", false))}
      </div>`;
  }
  function modelsPage(el) {
    const prev = el.querySelector(".ct-wrap")?.scrollTop || 0;
    el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">Models</h2><p class="se-page-desc">Choose which models appear in the model picker. Each agent offers the ones it supports.</p></div>
      <div class="sc-head-actions"><button type="button" class="se-btn small" data-add-model>Add Models…</button></div></div>
      <div class="ct-wrap"><table class="ct-table" aria-label="Models">
      <colgroup><col style="width:34%"><col style="width:18%"><col><col style="width:72px"></colgroup>
      <thead><tr><th scope="col"><span class="ct-th">Name</span></th><th scope="col"><span class="ct-th">Provider</span></th><th scope="col"><span class="ct-th">Agents</span></th><th scope="col"><span class="ct-th ct-center">Enabled</span></th></tr></thead>
      <tbody>${MODELS.map((m) => `<tr class="ct-row" data-model-row="${m.id}">
        <td><div class="ct-cell"><span class="ct-label ct-name">${esc(m.name)}</span></div></td>
        <td><div class="ct-cell"><span class="ct-label">${esc(m.provider)}</span></div></td>
        <td><div class="ct-cell"><span class="ct-label ct-muted">${esc(m.agents.map((a) => HARNESSES[a].label).join(", "))}</span></div></td>
        <td><div class="ct-cell ct-center"><button class="monaco-switch${m.on ? " checked" : ""}" type="button" role="switch" aria-checked="${m.on}" aria-label="${m.on ? "Hide" : "Show"} ${esc(m.name)} in the model picker" data-model-toggle="${m.id}"><div class="monaco-switch-thumb"></div></button></div></td>
      </tr>`).join("")}</tbody></table></div>`;
    el.querySelector(".ct-wrap").scrollTop = prev;
  }
  function renderPage(id) {
    if (id === "browse") {
      if (!hosted[id]) {
        const wrap = document.createElement("div");
        wrap.className = "lib-hosted";
        wrap.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">Discover</h2></div><div class="en-target"></div></div>`;
        const page = window.CUST.hostPage(pages[id]);
        page.style.cssText = "flex:1;min-height:0";
        wrap.append(page);
        hosted[id] = wrap;
        host.append(wrap);
      }
      syncSearch("Discover"); filterCards();
      hosted.browse.querySelector(".en-target").innerHTML = target ? `<span class="en-target-label">Installs to</span>${placeLabel(target)}<button class="lib-chip-x" data-clear-target aria-label="Install anywhere" title="Install anywhere"><span class="codicon codicon-close-compact" aria-hidden="true"></span></button>` : "";
    } else {
      if (!hosted[id]) { hosted[id] = document.createElement("div"); hosted[id].className = "lib-hosted en-page sc-page"; host.append(hosted[id]); }
      const el = hosted[id];
      if (TYPES[id]) tablePage(id, el);
      else if (id === "extensions") extPage(el);
      else if (id === "settings") settingsPage(el);
      else if (id === "models") modelsPage(el);
      else {
        const prev = el.querySelector(".en-page-scroll")?.scrollTop || 0;
        el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">Remotes</h2><p class="se-page-desc">${esc(DESC[id])}</p></div></div><div class="en-page-scroll">${envPage()}</div>`;
        el.querySelector(".en-page-scroll").scrollTop = prev;
      }
    }
    root.dataset.section = id;
    for (const [k, el] of Object.entries(hosted)) el.style.display = k === id ? "flex" : "none";
    for (const el of root.querySelectorAll("[data-count]")) el.textContent = navCount(el.dataset.count);
    syncDrawer();
  }
  function show(id, o = {}) {
    if (id === "connections") id = "mcp";
    if (id.includes(":")) { const [a, t] = id.split(":"); f.agent = a; id = t; settle(); }
    if ("target" in o) target = o.target;
    if (o.env !== undefined) { f.env = o.env; f.ws = null; f.agent = o.agent || f.agent; settle(); }
    if (id !== section || !o.keepDetail) { detail = o.detail ? { type: id, key: o.detail } : null; outputOpen = !!o.output; }
    section = id;
    syncNav();
    renderPage(id);
  }
  const navIdOf = () => (TYPES[section] ? `${f.agent}:${section}` : section);
  function syncNav() {
    const id = navIdOf();
    root.dataset.group = TYPES[section] ? "harness" : "general";
    for (const el of root.querySelectorAll(".se-nav-item")) { const on = el.dataset.id === id; el.classList.toggle("active", on); el.setAttribute("aria-selected", String(on)); el.tabIndex = on ? 0 : -1; }
  }
  function ctxChanged() { syncNav(); renderPage(section); root.dispatchEvent(new CustomEvent("scope-filter-change")); }
  // Every picker always holds a value, and they cascade: the environment has its own workspaces, and the workspace
  // its own agents there. A choice the next picker no longer offers falls back to its first option.
  function settle() {
    f.agent ||= "copilot";
    f.ws = null;
    const e = envOf(f.env);
    f.env = (e && e.agents.includes(f.agent) ? e : ENVS.find((x) => x.agents.includes(f.agent)) || ENVS[0]).id;
  }
  // The modal header's Workspace, Agent and Environment pickers drive the same filter as the page's sentence.
  root.scopeFilter = {
    get: () => ({ ws: f.ws, agent: f.agent, env: f.env }),
    options: (kind) => kind === "env" ? ENVS.filter((e) => e.agents.includes(f.agent)).map((e) => ({ label: e.label, value: e.id, icon: e.icon }))
      : kind === "ws" ? envOf(f.env).workspaces.map((w) => ({ label: workspaceLabel(w), value: w, icon: "folder" }))
      : agentsIn(envOf(f.env), f.ws).map((a) => ({ label: HARNESSES[a].label, value: a, icon: HARNESSES[a].icon })),
    set(values) {
      const keep = ["ws", "agent", "env"].filter((kind) => kind in values);
      for (const kind of keep) f[kind] = values[kind];
      settle(keep);
      ctxChanged();
    },
  };
  subs.add(() => { if (!root.closest("[hidden]")) renderPage(section); });

  const refOf = (s) => { const [type, ...rest] = s.split("|"); return [type, rest.join("|")]; };
  function rowMenu(anchor, ref) {
    const [type, key] = refOf(ref), r = rowOf(type, key);
      const items = [{ label: "Open", act: "open" }];
      if (isConn(r.type)) items.push({ label: "Show Configuration", act: "config" });
      if (r.editable) items.push("-", { label: "Change Where It's Installed...", act: "where" }, { label: "Install Everywhere", act: "all" });
      if (r.path) items.push("-", { label: "Copy Full Path", act: "copy" });
      if (r.origin) items.push("-", { label: r.origin.kind === "plugin" ? "Show Plugin" : r.origin.kind === "extension" ? "Show Extension" : "Managed by Your Organization", act: "source", disabled: r.origin.kind === "account" });
      if (r.editable) items.push("-", { label: isConn(r.type) ? "Uninstall Everywhere" : `Delete ${TYPES[r.type].one[0].toUpperCase() + TYPES[r.type].one.slice(1)}`, act: "none" });
      return openMenu(anchor, items, (m) => {
        if (m.act === "open") return show(type, { detail: key });
        if (m.act === "config") return show(type, { detail: key });
        if (m.act === "where") return openInstall({ items: [r.item], mode: "edit" });
        if (m.act === "copy") return toast(`Copied ${r.path}.`);
        if (m.act === "source") return r.origin.plugin ? show("plugins", { detail: r.origin.plugin.id }) : show("extensions");
        const before = new Set(r.item.at);
        r.item.at = m.act === "all" ? new Set(ALL_SLOTS.filter((k) => canUse(r.item, split(k)[1]))) : new Set();
        r.item.follow = m.act === "all";
        changed();
        toast(m.act === "all" ? `Installed ${r.name} everywhere, including environments you add later.` : `Removed ${r.name} from every environment.`, ["Undo"], () => { r.item.at = before; changed(); });
      });
  }

  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    // A click anywhere else in the modal, except on another row, dismisses the side panel. No re-render, so the clicked control still works.
    if (drawer && !t(".se-json-drawer, tr[data-row], vsc-customization-discovery-card")) {
      detail = null; outputOpen = false;
      drawer.remove(); drawer = null; drawerFor = "";
      root.querySelectorAll("tr[data-row].selected").forEach((x) => { x.classList.remove("selected"); x.setAttribute("aria-selected", "false"); });
      for (const card of discCards()) card.classList.remove("is-selected");
      root.classList.remove("has-disc-drawer");
    }
    const card = t("vsc-customization-discovery-card");
    if (card && !t(".customization-discovery-card-actions")) return show("browse", { detail: card.getAttribute("name") });
    const nav = t(".se-nav-item");
    if (nav) return show(nav.dataset.id);
    const mdl = t("[data-model-toggle]");
    if (mdl) { const m = MODELS.find((x) => x.id === mdl.dataset.modelToggle); m.on = !m.on; renderPage("models"); root.querySelector(`[data-model-toggle="${m.id}"]`)?.focus(); return toast(`${m.name} is ${m.on ? "in" : "out of"} the model picker.`); }
    const ss = t("[data-setting-switch]");
    if (ss) { const on = !ss.classList.contains("checked"); ss.classList.toggle("checked", on); ss.setAttribute("aria-checked", String(on)); return; }
    if (t("[data-all-settings]")) return toast("Opens the Settings editor, filtered to Agents.");
    if (t("[data-add-model]")) return toast("Opens Manage Models to add providers and models.");
    if (t("[data-go]")) return show(t("[data-go]").dataset.go);
    if (t("[data-clear-target]")) { target = null; return renderPage("browse"); }
    if (t("[data-src-clear]")) { if (section === "browse") disc.src = null; else f.src = null; return renderPage(section); }
    const sf = t("[data-src-filter]");
    if (sf) {
      if (section === "browse") {
        const feeds = [...new Set([...host.querySelectorAll("vsc-customization-discovery-card")].map(feedOf).filter(Boolean))];
        return openMenu(sf, [{ label: "All Sources", v: null, checked: !disc.src }, "-", ...feeds.map((v) => ({ label: v, v, checked: disc.src === v }))], (m) => { disc.src = m.v; renderPage(section); sf.focus(); });
      }
      const base = TYPES[section] ? allRows(section, ctxWorkspace()).filter(inCtx) : [];
      const has = new Set(base.map(srcKindOf));
      return openMenu(sf, [{ label: "All Sources", v: null, checked: !f.src }, "-", ...SRC_KINDS.map((k) => ({ label: k.label, v: k.id, checked: f.src === k.id, disabled: !has.has(k.id) && f.src !== k.id }))], (m) => { f.src = m.v; renderPage(section); sf.focus(); });
    }
    if (t("[data-drawer-close]")) return closeDrawer();
    const vp = t("[data-drawer-view]");
    if (vp) {
      const r = curRow(), cur = r ? viewOf(r) : drawerMode;
      const ids = ["rich", "editor", ...(r && isConn(r.type) ? ["output"] : [])];
      return openMenu(vp, ids.map((v) => ({ label: VIEWS[v].label, v, checked: cur === v })), (m) => setView(m.v));
    }
    const dm = t("[data-drawer-mode]");
    if (dm) return setView(dm.dataset.drawerMode);
    if (t("[data-disc-install]")) { const dr = curRow(); return dr && installCard(dr.card); }
    if (t("[data-disc-install-more]")) { const dr = curRow(); return dr && installMenu(t("[data-disc-install-more]"), dr.card); }
    const cm = t("[data-card-install-more]");
    if (cm) return installMenu(cm, cm.closest("vsc-customization-discovery-card"));
    if (t("[data-disc-show]")) { const dr = curRow(), it = dr?.installed; if (!it) return; const type = DISC_TYPE[dr.info.kind]; return show(type, { detail: type === "skills" ? undefined : it.id }); }
    const xl = t("[data-ext-link]");
    if (xl) return toast(`Opens ${xl.dataset.extLink} in your browser.`);
    if (t("[data-conn-disconnect]")) {
      const r = curRow(), before = r.item.state;
      r.item.state = "disconnected"; changed();
      return toast(`Disconnected ${r.name}. Agents can't use it until you connect again.`, ["Undo"], () => { r.item.state = before; changed(); });
    }
    const cc = t("[data-conn-connect]");
    if (cc) { const r = rowOf(...refOf(cc.dataset.connConnect)); r.item.state = "ok"; changed(); return toast(`Connected ${r.name} as ${r.item.account || "you"}.`); }
    // The MCP server form: Server Type, Add/Remove rows, Discard and Save.
    const form = t("[data-mcp-form]"), fid = form?.dataset.mcpForm;
    const mt = t("[data-mcp-type]");
    if (mt) { if (draftOf(fid).type !== mt.dataset.mcpType) { editDraft(fid).type = mt.dataset.mcpType; renderPage(section); } return; }
    const pa = t("[data-mcp-pair-add]");
    if (pa) { const key = pa.dataset.mcpPairAdd, list = editDraft(fid)[key]; list.push(["", ""]); renderPage(section); return drawer?.querySelector(`[data-mcp-pair="${key}|${list.length - 1}|0"]`)?.focus(); }
    const pd = t("[data-mcp-pair-del]");
    if (pd) { const [key, i] = pd.dataset.mcpPairDel.split("|"); editDraft(fid)[key].splice(+i, 1); renderPage(section); return drawer?.querySelector(`[data-mcp-pair-add="${key}"]`)?.focus(); }
    if (t("[data-mcp-discard]:not(:disabled)")) { mcpDraft.delete(fid); renderPage(section); return toast("Discarded your changes."); }
    if (t("[data-mcp-save]:not(:disabled)")) { saveDraft(fid); renderPage(section); return toast(`Saved to ${MCP[fid].file}.`); }
    const xt = t("[data-ext-toggle]") || t("tr[data-ext-row]")?.querySelector("[data-ext-toggle]");
    if (xt) { const x = EXTS.find((e) => e.name === xt.dataset.extToggle); x.on = !x.on; renderPage(section); return toast(`${x.name} is ${x.on ? "on" : "off"} in the Agents window.`); }
    const sortBtn = t("[data-sort]");
    if (sortBtn) { const col = sortBtn.dataset.sort, cur = sortBy[section] || { col: section === "extensions" ? "category" : "source", dir: 1 }; sortBy[section] = { col, dir: cur.col === col ? -cur.dir : 1 }; return renderPage(section); }
    if (t("[data-add-new]")) return toast(`New ${TYPES[section].one} in your user folder, on This Computer.`);
    const pt = t("[data-plugin-toggle]");
    if (pt) { const r = rowOf("plugins", pt.dataset.pluginToggle); r.item.disabled = !r.item.disabled; renderPage(section); return toast(`${r.name} is ${r.item.disabled ? "off" : "on"}.`); }
    const ro = t("[data-row-output]");
    if (ro) { const [type, key] = refOf(ro.dataset.rowOutput); return show(type, { detail: key, output: true }); }
    const rs = t("[data-row-signin]");
    if (rs) { const r = rowOf(...refOf(rs.dataset.rowSignin)); r.item.state = "ok"; changed(); return toast(`Signed in to ${r.name} as ${r.item.account}.`); }
    const rst = t("[data-row-start]");
    if (rst) { const r = rowOf(...refOf(rst.dataset.rowStart)); r.item.state = "ok"; changed(); return toast(`Started ${r.name}.`); }
    const cx = t("[data-ctx]");
    if (cx) {
      const kind = cx.dataset.ctx, all = { env: "All Environments", ws: "All Workspaces", agent: "All Agents" }[kind];
      const opts = kind === "env" ? ctxEnvs().map((e) => ({ label: e.label, value: e.id })) : kind === "ws" ? ctxWorkspaces().map((w) => ({ label: workspaceLabel(w), value: w })) : ctxAgents().map((a) => ({ label: HARNESSES[a].label, value: a }));
      return openMenu(cx, [{ label: all, value: null, checked: !f[kind] }, "-", ...opts.map((o) => ({ ...o, checked: f[kind] === o.value }))], (it) => { f[kind] = it.value; ctxChanged(); });
    }
    if (t("[data-ctx-clear]")) { f.env = f.ws = f.agent = null; return ctxChanged(); }
    const ex = t("[data-expand]");
    if (ex) { const k = ex.dataset.expand; open.has(k) ? open.delete(k) : open.add(k); return renderPage(section); }
    const so = t("[data-src-toggle]");
    if (so) { const k = so.dataset.srcToggle; openSrc.has(k) ? openSrc.delete(k) : openSrc.add(k); return renderPage(section); }
    const sop = t("[data-src-open]");
    if (sop) { const src = SRC[sop.dataset.srcOpen]; return src.plugin ? show("plugins", { detail: src.plugin.id }) : show("extensions"); }
    const op = t("[data-open]");
    if (op) { const [type, key] = refOf(op.dataset.open); return show(type, { detail: key }); }
    if (t("[data-back]")) { detail = null; outputOpen = false; return renderPage(section); }
    const ra = t("[data-row-agents]");
    if (ra) {
      const [type, key, envId] = ra.dataset.rowAgents.split("|"), r = rowOf(type, key), e2 = envOf(envId), it = r.item;
      return openMenu(ra, e2.agents.map((a) => ({ label: HARNESSES[a].label, a, checked: it.at.has(K(envId, a)), disabled: !canUse(it, a) })), (m) => {
        const k = K(envId, m.a);
        it.at.has(k) ? (it.at.delete(k), hooks.onUninstall?.(it, k)) : it.at.add(k);
        changed();
      });
    }
    const et = t("[data-env-toggle]");
    if (et) {
      const [type, key, envId] = et.dataset.envToggle.split("|"), it = rowOf(type, key).item, e2 = envOf(envId), had = e2.agents.filter((a) => it.at.has(K(envId, a)));
      if (had.length) { for (const a of had) it.at.delete(K(envId, a)); hooks.onUninstall?.(it, K(envId, had[0])); }
      else { it.skip?.delete(envId); for (const a of e2.agents) if (canUse(it, a)) it.at.add(K(envId, a)); }
      changed();
      return toast(`${had.length ? "Removed" : "Installed"} ${it.name} ${had.length ? "from" : "on"} ${e2.label}.`, ["Undo"], () => { if (had.length) { for (const a of had) it.at.add(K(envId, a)); it.skip?.delete(envId); } else for (const a of e2.agents) it.at.delete(K(envId, a)); changed(); });
    }
    const wa = t("[data-where-all]");
    if (wa) {
      const [type, key] = refOf(wa.dataset.whereAll), it = rowOf(type, key).item, before = new Set(it.at);
      it.at = new Set(ALL_SLOTS.filter((k) => canUse(it, split(k)[1]))); it.follow = true; it.skip?.clear();
      changed();
      return toast(`Installed ${it.name} everywhere, including environments you add later.`, ["Undo"], () => { it.at = before; it.follow = false; changed(); });
    }
    const wm = t("[data-where-more]");
    if (wm) {
      const parts = wm.dataset.whereMore.split("|"), envId = parts.pop(), [type, key] = refOf(parts.join("|")), r = rowOf(type, key), it = r.item, e2 = envOf(envId);
      const items = [];
      if (isConn(type) && envId === "local" && it.state === "error") items.push({ label: "Restart", act: "restart" }, "-");
      if (SYNC.has(envId)) items.push({ label: it.skip?.has(envId) ? `Sync with ${syncLabel(envId)}` : `Stop Syncing with ${syncLabel(envId)}`, act: "follow" }, "-");
      items.push({ label: `Remove from ${e2.label}`, act: "remove" });
      return openMenu(wm, items, (m) => {
        if (m.act === "restart") { it.state = "ok"; changed(); return toast(`Restarted ${it.name}.`); }
        if (m.act === "follow") { it.skip?.has(envId) ? it.skip.delete(envId) : (it.skip ||= new Set()).add(envId); changed(); return; }
        const had = e2.agents.filter((a) => it.at.has(K(envId, a)));
        for (const a of had) it.at.delete(K(envId, a));
        hooks.onUninstall?.(it, K(envId, had[0]));
        changed();
        toast(`Removed ${it.name} from ${e2.label}.`, ["Undo"], () => { for (const a of had) it.at.add(K(envId, a)); it.skip?.delete(envId); changed(); });
      });
    }
    const ir = t("[data-install-rest]");
    if (ir) { const [type, key] = refOf(ir.dataset.installRest); return openInstall({ items: [rowOf(type, key).item], mode: "edit" }); }
    const ew = t("[data-edit-where]");
    if (ew) { const [type, key] = refOf(ew.dataset.editWhere); return openInstall({ items: [rowOf(type, key).item], mode: "edit" }); }
    const ct = t("[data-conn-toggle]");
    if (ct) {
      const it = CONNECTIONS.find((c) => c.id === ct.dataset.connToggle), enabled = ct.getAttribute("aria-checked") !== "true", v = enabled ? "on" : "off";
      if (f.ws) { it.ws ||= {}; if (v === it.def) delete it.ws[f.ws]; else it.ws[f.ws] = v; }
      else it.def = v;
      changed();
      return toast(`${it.name}: ${enabled ? "On" : "Off"}${f.ws ? ` in ${workspaceLabel(f.ws)}` : " by default"}.`);
    }
    const dtl = t("[data-detail-tool]");
    if (dtl) { const [setId, name] = dtl.dataset.detailTool.split("|"); const off = offIn(setId); off.has(name) ? off.delete(name) : off.add(name); return renderPage(section); }
    const tt = t("[data-tool-toggle]");
    if (tt) { const t2 = rowOf("tools", tt.dataset.toolToggle).tools, on = enabledCount(t2) > 0; if (on) for (const x of t2.tools) offIn(t2.id).add(x); else offIn(t2.id).clear(); return renderPage(section); }
    const rw = t("[data-reset-ws]");
    if (rw) { const r = rowOf(section, detail.key); delete r.item.ws[rw.dataset.resetWs]; changed(); return; }
    if (t("[data-show-output]")) { outputOpen = !outputOpen; return renderPage(section); }
    if (t("[data-restart-detail]")) { const r = rowOf(section, detail.key); r.item.state = "ok"; outputOpen = false; changed(); return toast(`Restarted ${r.name}.`); }
    if (t("[data-signin-detail]")) { const r = rowOf(section, detail.key); r.item.state = "ok"; changed(); return toast(`Signed in to ${r.name} as ${r.item.account}.`); }
    if (t("[data-edit-config]")) return toast("Opens mcp-config.json in the editor at this server's entry.");
    if (t("[data-open-path]")) return toast("Opens the file in the editor.");
    const rm = t("[data-row-more]");
    if (rm) return rowMenu(rm, rm.dataset.rowMore);
    const ee = t("[data-env-expand]");
    if (ee) { const k = ee.dataset.envExpand; openEnv.has(k) ? openEnv.delete(k) : openEnv.add(k); return renderPage(section); }
    const sy = t("[data-sync]");
    if (sy) {
      const id = sy.dataset.sync;
      // Sync with any other environment that isn't already synced with this one.
      const sources = ENVS.filter((x) => x.id !== id && SYNC.get(x.id) !== id);
      return openMenu(sy, [...sources.map((x) => ({ label: `Sync with ${x.label}`, v: x.id, checked: SYNC.get(id) === x.id })), "-", { label: "Don't Sync", v: null, checked: !SYNC.has(id) }], (m) => {
        m.v ? SYNC.set(id, m.v) : SYNC.delete(id);
        changed();
        toast(m.v ? `${envOf(id).label} is synced with ${envOf(m.v).label}: what you install there is installed here too, except what you remove here.` : `${envOf(id).label} isn't synced. It keeps what it has.`);
      });
    }
    const cf = t("[data-copy-from]");
    if (cf) {
      const e2 = envOf(cf.dataset.copyFrom), onLocal = (x) => e2.agents.some((a) => x.at.has(K("local", a))), here = (x) => e2.agents.some((a) => x.at.has(K(e2.id, a)));
      return openInstall({ items: syncable().filter((x) => onLocal(x) && !here(x)), mode: "copy", preset: e2.agents.map((a) => K(e2.id, a)), title: `Copy to ${e2.label}`, sub: "From This Computer" });
    }
    const el = t("[data-env-lens]");
    if (el) return show("mcp", { env: el.dataset.envLens });
    const em = t("[data-env-more]");
    if (em) return openMenu(em, [{ label: "Show Its Customizations", act: "lens" }, { label: "Set Up Agent...", act: "agent" }, "-", { label: "Remove Environment", act: "remove" }], (m) => m.act === "lens" ? show("mcp", { env: em.dataset.envMore }) : toast(m.act === "agent" ? "Install an agent on this environment, like Claude or Codex." : "Removing an environment leaves its files in place."));
    if (t("[data-add-env]")) return toast("Add an SSH host, tunnel, dev container or cloud environment. It can start with everything you have on This Computer.");
    const cs = t("[data-customize-session]");
    if (cs) return opts.onSession(cs.dataset.customizeSession);
    // Remember what's collapsed in the tree (the list toggles it), so a re-render keeps it.
    const srcNode = t("vsc-customization-source-node");
    if (srcNode) { srcNode.hasAttribute("collapsed") ? openSrc.delete(srcNode.dataset.src) : openSrc.add(srcNode.dataset.src); return; }
    const grpNode = t("vsc-customization-group");
    if (grpNode && !t(".group-actions")) { const k = section + ":" + grpNode.dataset.group; grpNode.hasAttribute("collapsed") ? closedGroups.add(k) : closedGroups.delete(k); return; }
    // Inside the tree: ⋯ opens the row's menu, Sign In / Start act, + creates in that group; the rest of a row opens it.
    const treeMore = t("[data-row] .codicon-ellipsis");
    if (treeMore) { e.stopPropagation(); return rowMenu(treeMore, t("[data-row]").dataset.row); }
    const signIn = t("[data-row] .mcp-server-sign-in");
    if (signIn) { const r = rowOf(...refOf(t("[data-row]").dataset.row)); r.item.state = "ok"; changed(); return toast(`Signed in to ${r.name} as ${r.item.account}.`); }
    if (t("[data-row] .mcp-server-start")) return toast("Starting the server.");
    const addG = t("vsc-customization-group .codicon-add");
    if (addG) { const g = t("vsc-customization-group"); return toast(g.dataset.group === "user" ? `New ${TYPES[section].one} in your user folder, on This Computer.` : `New ${TYPES[section].one} in ${g.getAttribute("label").replace("Workspace · ", "")}. It follows the repo.`); }
    if (t("[data-row] .customization-toggle")) return;
    const treeRow = t("[data-row]");
    if (treeRow && !t("button, a, input")) { const [type, key] = refOf(treeRow.dataset.row); return show(type, { detail: key }); }
    // The rest of a row: an item opens its details; a source row or an environment row expands. Its own controls handled above.
    if (t("button, a, input, vsc-toolbar, vsc-input, .monaco-switch")) return;
    const row = t(".sc-row[data-row]");
    if (row) { const [type, key] = refOf(row.dataset.row); return show(type, { detail: key }); }
    const src = t(".sc-row.sc-src");
    if (src) { const k = src.dataset.src; openSrc.has(k) ? openSrc.delete(k) : openSrc.add(k); return renderPage(section); }
    const envRow = t(".sc-env-row");
    if (envRow) { const k = envRow.querySelector("[data-env-expand]").dataset.envExpand; openEnv.has(k) ? openEnv.delete(k) : openEnv.add(k); return renderPage(section); }
  });
  // The tree rows' own actions (microsoft/vscode#337402): Show Output, Start, Sign In, the Migrations link, switches.
  const rowOfEvent = (e) => { const el = e.target.closest("[data-row]"); return el ? rowOf(...refOf(el.dataset.row)) : null; };
  root.addEventListener("show-output", (e) => { const r = rowOfEvent(e); if (r) show(r.type, { detail: r.key, output: true }); });
  root.addEventListener("start", (e) => { const r = rowOfEvent(e); if (!r) return; r.item.state = "ok"; changed(); toast(`Started ${r.name}.`); });
  root.addEventListener("sign-in", (e) => { const r = rowOfEvent(e); if (!r) return; r.item.state = "ok"; changed(); toast(`Signed in to ${r.name} as ${r.item.account}.`); });
  root.addEventListener("open-migrations", (e) => { const r = rowOfEvent(e); if (r) show(r.type, { detail: r.key }); });
  root.addEventListener("open-source", (e) => { const src = SRC[e.target.closest("[data-src]")?.dataset.src]; if (src) src.plugin ? show("plugins", { detail: src.plugin.id }) : show("extensions"); });
  root.addEventListener("expand", (e) => {
    const r = rowOfEvent(e);
    if (!r || r.type !== "tools") return;
    e.detail.expanded ? openSets.add(r.tools.id) : openSets.delete(r.tools.id);
    renderPage(section);
  });
  root.addEventListener("toggle", (e) => {
    const tool = e.target.closest("[data-tool]");
    if (tool) {
      const [setId, name] = tool.dataset.tool.split("|");
      e.detail.enabled ? offIn(setId).delete(name) : offIn(setId).add(name);
      return renderPage(section);
    }
    const r = rowOfEvent(e);
    if (!r) return;
    if (isConn(r.type)) {
      const v = e.detail.enabled ? "on" : "off";
      if (f.ws) { r.item.ws ||= {}; if (v === r.item.def) delete r.item.ws[f.ws]; else r.item.ws[f.ws] = v; }
      else r.item.def = v;
      changed();
      return toast(`${r.name}: ${e.detail.enabled ? "On" : "Off"}${f.ws ? ` in ${workspaceLabel(f.ws)}` : " by default"}.`);
    }
    if (r.type === "tools") {
      const t = r.tools;
      if (e.detail.enabled) offIn(t.id).clear(); else for (const x of t.tools) offIn(t.id).add(x);
      renderPage(section);
      return toast(`${e.detail.enabled ? "Turned on" : "Turned off"} all ${plural(t.count, "tool")} in ${r.name}.`);
    }
    if (r.type === "plugins") { r.item.disabled = !e.detail.enabled; return toast(`${r.name} is ${e.detail.enabled ? "on" : "off"}.`); }
  });
  root.addEventListener("input", (e) => {
    const form = e.target.closest("[data-mcp-form]");
    if (form) {
      const d = editDraft(form.dataset.mcpForm), fld = e.target.dataset.mcpField, pr = e.target.dataset.mcpPair;
      if (fld) d[fld] = e.target.value;
      else if (pr) { const [key, i, j] = pr.split("|"); d[key][+i][+j] = e.target.value; }
      return syncFormFoot(form);
    }
    if (e.target.closest(".ct-search")) {
      const st = section === "browse" ? disc : f;
      st.q = e.target.value || ""; e.target.classList.toggle("empty", !st.q);
      return section === "browse" ? filterCards() : renderPage(section);
    }
    if (e.target.closest(".cust-page") && e.target.matches("input")) f.q = e.target.value || "";
    if (e.target.closest(".en-q")) { f.q = e.target.value || ""; renderPage(section); }
  });
  host.addEventListener("install", (e) => installCard(e.target.closest("vsc-customization-discovery-card")));
  host.addEventListener("search", (e) => {
    const q = e.detail.query.trim().toLowerCase();
    for (const s of host.querySelectorAll("vsc-customization-discovery-section")) {
      let any = false;
      for (const card of s.querySelectorAll("vsc-customization-discovery-card")) { const hit = !q || ["name", "description", "meta"].some((a) => (card.getAttribute(a) || "").toLowerCase().includes(q)); card.style.display = hit ? "" : "none"; any ||= hit; }
      s.style.display = any ? "" : "none";
    }
  });
  root.querySelector(".se-nav-list").addEventListener("keydown", (e) => {
    const list = [...root.querySelectorAll(".se-nav-item")], i = list.indexOf(document.activeElement), next = { ArrowDown: i + 1, ArrowUp: i - 1 }[e.key];
    if (i < 0 || next == null) return;
    e.preventDefault();
    const el = list[(next + list.length) % list.length];
    el.focus(); show(el.dataset.id);
  });
  // Rows are a list: Up/Down, Home/End and Page Up/Down move; Enter or Space opens. With the side panel open, it follows.
  root.addEventListener("keydown", (e) => {
    if (e.target.matches?.("[data-mcp-type]") && /^Arrow(Left|Right|Up|Down)$/.test(e.key)) {
      e.preventDefault();
      const all = [...e.target.parentElement.children], next = all[(all.indexOf(e.target) + (/Left|Up/.test(e.key) ? -1 : 1) + all.length) % all.length];
      next.focus();
      return next.click();
    }
    const tr = e.target.matches?.("tr[data-row]") ? e.target : null;
    if (!tr) return;
    const rows = [...tr.parentElement.children], i = rows.indexOf(tr), last = rows.length - 1;
    const go = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: last, PageDown: i + 10, PageUp: i - 10 }[e.key];
    if (go != null) {
      e.preventDefault();
      const nx = rows[Math.max(0, Math.min(last, go))];
      tr.tabIndex = -1; nx.tabIndex = 0; nx.focus();
      if (drawer) openRow(nx);
      return;
    }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRow(tr); }
  });
  /** From the panel: open an item's details (a skill by name: this session's copy first). */
  function openDetail(type, id, o = {}) {
    let key = id;
    if (type === "connections") type = "mcp";
    if (type === "skills") {
      const rows = allRows("skills").filter((r) => r.name === id);
      const r = rows.find((x) => x.scope === "workspace" && x.workspace === store.scope.workspace) || rows.find((x) => x.scope === "user") || rows[0];
      key = r?.key;
    }
    show(type, { detail: key, output: o.output, env: null });
  }
  return { show, openDetail, closeDrawer, get section() { return section; } };
}
/** The panel's "More" rows: other types this session has, with counts. */
export function moreFor(scope, ids = ["instructions", "agents", "hooks", "tools", "canvases"]) {
  const k = K(scope.environment, scope.harness);
  return ids.map((id) => ({ id, label: TYPES[id].label,
    count: allRows(id).filter((r) => (r.scope !== "workspace" || r.workspace === scope.workspace) && slotsOf(r).has(k)).length }));
}
/** A session's rows of one type: the ones its agent can use in its environment, and how many others its scopes have. */
export function sessionSummary(scope, id) {
  const k = K(scope.environment, scope.harness);
  const rows = allRows(id, scope.workspace).filter((r) => r.scope !== "workspace" || r.workspace === scope.workspace);
  const available = rows.filter((r) => slotsOf(r).has(k));
  return { id, label: TYPES[id].label, icon: TYPES[id].icon, available, unavailable: rows.length - available.length };
}
