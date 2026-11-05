/* V10 — Progressive. V9's model (environments × agents, global Configure vs. session Customize), shown so it scales:
   - Level 0, a row: one plain summary of where it's installed ("Everywhere", "All but mac-mini-2", "This Computer only").
   - Level 1, open (click the row): the item itself, like the product's embedded detail views: file content for prompt
     files, status, errors, output, configuration and tools for connections, what a plugin includes. Where it's installed
     is managed here, and only here.
   - Environment lens: pick one environment and every row says what's true there.
   - Installing asks Everywhere / Only here / This Computer / Choose…, and agents only when you ask for them.
   Every page groups by scope like the customizations editor rework (User, Workspace · folder, Built-in), with items from
   a plugin, extension or organization nested under one source row, and the agent's own items tagged in Built-in.
   An environment can stay synced with another (hawks-framework with This Computer), so most installs don't need choosing. */
import { store } from "./scope-store.js";
import { openMenu, toast } from "./panel-shell.js";
import { ENVS, AGENTS, CONNECTIONS, USER_SKILLS, PLUGINS, K, split, ALL_SLOTS, polOf, POLICY, tri, iconHtml, plural, sessions, slotOf, placeLabel, changed, subs, countsFor, envOf, hooks, EXTRA_SKILLS, setInstallImpl, openInstall } from "./env.js?v=10";
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
  slack: { file: "Copilot Connectors", def: { type: "http", url: "https://mcp.slack.com/mcp" } },
  figma: { file: "~/.copilot/mcp-config.json", def: { type: "http", url: "https://mcp.figma.com/mcp" } },
  workiq: { file: "Copilot Connectors", def: { type: "http", url: "https://workiq.svc.cloud.microsoft/mcp" } },
  kusto: { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: "npx", args: ["-y", "@azure/mcp@latest", "server", "start", "--namespace", "kusto"] },
    error: "Process exited with code 1. Error: connect ECONNREFUSED 127.0.0.1:47011",
    output: ["10:41:12.204 [info] Starting server Azure Data Explorer", "10:41:12.871 [info] Connection state: Starting", "10:41:13.019 [warning] Failed to read cached token; signing in again", "10:41:13.402 [error] Error: connect ECONNREFUSED 127.0.0.1:47011", "10:41:13.403 [info] Connection state: Error Process exited with code 1"] },
  playwright: { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: "npx", args: ["@playwright/mcp@latest"] }, compat: { cloud: "Cloud sessions can't run a local browser server." } },
  sprue: { file: "~/.copilot/mcp-config.json", def: { type: "stdio", command: "sprue", args: ["mcp"] } },
  semgrep: { file: "~/.copilot/installed-plugins/security-best-practices/.mcp.json", def: { type: "stdio", command: "semgrep", args: ["mcp"] } },
};
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

// ---------- Rows: every page's items, grouped by scope with nested sources ----------
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
/** { groups: [{ id, label, icon, note, rows, sources: [{ src, rows }] }] } */
function model(type) {
  const g = (id, label, icon, note) => ({ id, label, icon, note, rows: [], sources: new Map() });
  const user = g("user", "User", "account", "");
  const wsGroups = Object.keys(WORKSPACES).map((w) => ({ ...g("ws:" + w, `Workspace · ${workspaceLabel(w)}`, "folder", "Follows the repo"), workspace: w }));
  const builtin = g("builtin", "Built-in", "vscode-insiders", "");
  const add = (grp, r) => { if (r.origin) { const k = r.origin.id; if (!grp.sources.has(k)) grp.sources.set(k, { src: r.origin, rows: [] }); grp.sources.get(k).rows.push(r); } else grp.rows.push(r); };
  const fromScope = (it, extra = {}) => ({ type, key: `${it.source}:${it.workspace || ""}:${it.name}`, name: it.name, path: it.path, scope: it.source === "workspace" ? "workspace" : it.source === "builtin" ? "builtin" : "user", workspace: it.workspace, tag: it.source === "builtin" && it.copilotOnly ? "Copilot" : "", raw: it, ...extra });
  if (isConn(type)) for (const c of CONNECTIONS.filter((x) => !!x.connector === (type === "connectors"))) add(user, { type, key: c.id, name: c.name, item: c, scope: "user", origin: c.origin, editable: !c.origin, path: MCP[c.id]?.file });
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
  const groups = [user, ...wsGroups, builtin].filter((x) => x.rows.length || x.sources.size);
  for (const x of groups) { x.rows.sort((a, b) => a.name.localeCompare(b.name)); x.sources = [...x.sources.values()].sort((a, b) => a.src.label.localeCompare(b.src.label)); }
  return { groups };
}
const allRows = (type) => model(type).groups.flatMap((g) => [...g.rows, ...g.sources.flatMap((s) => s.rows)]);
/** Slots where a row is available: its own installs, its source's, the repo's environments, or the agent's. */
function slotsOf(r) {
  if (r.conn) return r.conn.at;
  if (r.item && r.editable) return r.item.at;
  if (r.origin) return r.origin.slots();
  if (r.scope === "workspace") return new Set(ENVS.filter((e) => e.workspaces.includes(r.workspace)).flatMap((e) => e.agents.filter((a) => canUse({ kind: r.type }, a)).map((a) => K(e.id, a))));
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
  const st = { where: "local", envSel: new Set(), perEnv: new Map(), agents: null, showAgents: false, picked: new Set(items.map((x) => x.id)), scope: "all", pol: it0.kind === "connection" ? (it0.def || "on") : null };
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
    if (st.scope !== "all" && it0.kind === "skill") return `Saved to ${workspaceLabel(st.scope)}/.github/skills/ · follows the repo everywhere`;
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
    const scopeSec = mode !== "copy" && it0.kind !== "plugin" && WORKSPACES[store.scope.workspace] ? `<div class="en-dlg-sec"><div class="en-dlg-label">Where</div><div class="ev-seg" role="radiogroup">
        <button class="ev-seg-btn" type="button" role="radio" aria-checked="${st.scope === "all"}" data-dscope="all">All workspaces<small>Any session where it's installed</small></button>
        <button class="ev-seg-btn" type="button" role="radio" aria-checked="${st.scope !== "all"}" data-dscope="${store.scope.workspace}">Only ${esc(workspaceLabel(store.scope.workspace))}<small>${it0.kind === "skill" ? "Saved to the repo; follows it everywhere" : `Saved in ${esc(workspaceLabel(store.scope.workspace))}/.vscode/mcp.json`}</small></button></div></div>` : "";
    const polSec = mode === "new" && it0.kind === "connection" ? `<div class="en-dlg-sec en-dlg-inline"><div class="en-dlg-label">When agents use it</div>${tri({ id: "dlg", name: it0.name }, "data-dpol", st.pol)}</div>` : "";
    const itemsSec = !single ? `<div class="en-dlg-sec"><div class="en-dlg-label">Customizations</div><div class="en-dlg-items">${items.map((it) => `
        <label class="en-dlg-item"><vsc-checkbox data-pick="${esc(it.id)}"${st.picked.has(it.id) ? " checked" : ""} label="${esc(it.name)}"></vsc-checkbox>${iconHtml(it, 16)}<span class="en-dlg-item-name">${esc(it.name)}</span><small>${it.kind === "connection" ? "Connection" : it.kind === "plugin" ? "Plugin" : it.kind === "skill" ? "Skill" : TYPES[it.kind]?.one || ""}</small></label>`).join("")}</div></div>` : "";
    const repo = st.scope !== "all" && it0.kind === "skill";
    const ok = mode === "edit" ? "Save" : mode === "copy" ? `Install ${plural(st.picked.size, "item")}` : "Install";
    const disabled = ((!slots().size || !agentsOn().size) && !repo) || (!single && !st.picked.size);
    block.innerHTML = `<div class="en-dlg sc-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <header class="en-dlg-head">${single ? iconHtml(it0, 28) : '<span class="ev-logo ev-logo-glyph" style="width:28px;height:28px"><span class="codicon codicon-cloud-download"></span></span>'}
        <div class="ev-row-text"><h2>${esc(title)}</h2><div class="ev-row-sub">${esc(opts.sub || (single ? (it0.does || it0.sub || "") : "Pick what to install, and where"))}</div></div>
        <button class="ev-icon-btn" data-dlg-close aria-label="Close" title="Close"><span class="codicon codicon-close-compact"></span></button></header>
      <div class="en-dlg-body">${itemsSec}${scopeSec}
        ${repo ? "" : agentsSec}${polSec}
        <div class="en-dlg-sec${repo ? " is-locked" : ""}"><div class="en-dlg-label">In what environment</div><div class="sc-radios" role="radiogroup">
          ${radio("local", "This Computer only", "")}
          ${hereEnv && hereEnv.id !== "local" ? radio("here", `Only ${hereEnv.label}`, "Where this session runs") : ""}
          ${radio("all", "Everywhere", `All ${ENVS.length} environments, and ones you add later`)}
          ${radio("choose", "Choose environments…", st.where === "choose" ? "" : `${ENVS.length} environments`)}
          ${choose}</div></div>
      </div>
      <footer class="en-dlg-foot"><span class="en-dlg-sum">${esc(summary())}</span><button class="ev-btn" data-dlg-close>Cancel</button><button class="ev-btn primary" data-dlg-ok${disabled ? " disabled" : ""}>${ok}</button></footer>
    </div>`;
  }
  function apply() {
    const sel = slots(), repo = st.scope !== "all";
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
      if (it.kind === "connection") { it.def = st.pol || "on"; if (repo) it.workspace = st.scope; }
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
    const sc = t("[data-dscope]");
    if (sc) { st.scope = sc.dataset.dscope; return render(); }
    const dp = t("[data-dpol]");
    if (dp) { st.pol = dp.dataset.v; return render(); }
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
const NAV = [{ id: "browse", label: "Discover" }, "-", { id: "connectors" }, { id: "mcp" }, { id: "skills" }, { id: "plugins" },
  { id: "instructions" }, { id: "agents" }, { id: "hooks" }, { id: "tools" }, { id: "canvases" }, "-",
  { id: "environments", label: "Environments" }, { id: "extensions", label: "Extensions" }];
export function mountConfigure(root, opts) {
  const pages = window.CUST.first;
  root.className = "se lib en-cfg sc-cfg";
  root.innerHTML = `<nav class="se-nav" aria-label="Customizations"><div class="se-nav-list" role="tablist" aria-orientation="vertical">${NAV.map((n) => n === "-" ? '<div class="se-nav-sep" role="presentation"></div>'
      : !n.id ? `<div class="se-nav-sep" role="presentation"></div><div class="sc-nav-label">${n.label}</div>`
      : `<div class="se-nav-item" role="tab" tabindex="-1" data-id="${n.id}"><span class="se-nav-label">${n.label || TYPES[n.id].label}</span><span class="se-nav-count" data-count="${n.id}"></span></div>`).join("")}</div></nav>
    <div class="se-main"><div class="lib-host"></div></div>`;
  const host = root.querySelector(".lib-host");
  const hosted = {};
  const f = { env: null, ws: null, agent: null, q: "" };
  // The context picker (Environment › Workspace › Agent): what an agent would see there. Any part can be left open.
  const ctxOn = () => !!(f.env || f.ws || f.agent);
  const slotOk = (k) => { const [e, a] = split(k); return (!f.env || e === f.env) && (!f.agent || a === f.agent) && (!f.ws || envOf(e).workspaces.includes(f.ws)); };
  const inCtx = (r) => (!ctxOn() || [...slotsOf(r)].some(slotOk)) && !(f.ws && r.scope === "workspace" && r.workspace !== f.ws);
  const ctxEnvs = () => ENVS.filter((e) => (!f.ws || e.workspaces.includes(f.ws)) && (!f.agent || e.agents.includes(f.agent)));
  const ctxWorkspaces = () => Object.keys(WORKSPACES).filter((w) => (!f.env || envOf(f.env).workspaces.includes(w)) && ENVS.some((e) => e.workspaces.includes(w) && (!f.agent || e.agents.includes(f.agent))));
  const ctxAgents = () => AGENTS.filter((a) => (!f.env || envOf(f.env).agents.includes(a)) && (!f.ws || ENVS.some((e) => e.workspaces.includes(f.ws) && e.agents.includes(a))));
  // A sentence: "View skills for Claude in vscode on devbox-1"; each part is a dropdown.
  function ctxBar() {
    const seg = (kind, label, set) => `<button type="button" class="sc-ctx-seg${set ? " set" : ""}" data-ctx="${kind}" aria-haspopup="menu">${esc(label)}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>`;
    return `<div class="sc-ctx" role="group" aria-label="Filter"><span class="sc-ctx-word">View ${esc(TYPES[section].label.replace(/\b[A-Z][a-z]+/g, (w) => w.toLowerCase()))} for</span>${seg("agent", f.agent ? HARNESSES[f.agent].label : "all agents", f.agent)}<span class="sc-ctx-word">in</span>${seg("ws", f.ws ? workspaceLabel(f.ws) : "all workspaces", f.ws)}<span class="sc-ctx-word">${f.env ? "on" : "across"}</span>${seg("env", f.env ? envOf(f.env).label : "all environments", f.env)}${ctxOn() ? '<button type="button" class="sc-ctx-clear" data-ctx-clear aria-label="Show everything" title="Show everything"><span class="codicon codicon-close" aria-hidden="true"></span></button>' : ""}</div>`;
  }

  const open = new Set(), openSrc = new Set(["security"]), openEnv = new Set(), closedGroups = new Set(), openSets = new Set();
  let section = "connectors", target = null, detail = null, outputOpen = false;
  const listScroll = {};
  const navCount = (id) => (TYPES[id] ? allRows(id).filter(inCtx).length : { environments: ENVS.length, extensions: 11 }[id] ?? "");
  for (const card of pages.browse.querySelectorAll("vsc-customization-discovery-card")) if (cardItem(card.getAttribute("name"))) card.setAttribute("action", "Manage");
  function cardItem(name) { for (const l of [CONNECTIONS, USER_SKILLS, PLUGINS]) { const it = l.find((x) => x.card === name || x.name === name); if (it) return it; } return null; }
  const rowOf = (type, key) => allRows(type).find((r) => r.key === key);

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
    if (isConn(r.type)) return `<span class="sc-pol" title="What agents do with it by default">${tri(r.item, "data-tri-def", r.item.def)}</span>`;
    if (r.type === "tools") { const on = enabledCount(r.tools) > 0; return r.tools.locked ? `<span class="codicon codicon-lock-small sc-lock" title="Copilot's own tools can't be turned off"></span>` : `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${esc(r.name)}" data-tool-toggle="${esc(r.key)}"><div class="monaco-switch-thumb"></div></button>`; }
    return "";
  }
  function rowHtml(r, nested) {
    const sub = isConn(r.type) ? (r.item.account ? esc(r.item.account) : "") : r.type === "tools" ? plural(r.tools.count, "tool") : r.sub ? esc(r.sub) : "";
    return `<div class="sc-row sc-item${nested ? " sc-nested" : ""}" data-row="${r.type}|${esc(r.key)}">
      ${iconFor(r)}
      <div class="sc-text"><div class="sc-name-row"><button type="button" class="sc-name" data-open="${r.type}|${esc(r.key)}" title="Open">${esc(r.name)}</button>${r.tag ? `<span class="en-tag">${esc(r.tag)}</span>` : ""}${r.item?.isNew ? '<span class="lc-flag on">New</span>' : ""}</div>${sub ? `<div class="sc-sub">${sub}</div>` : ""}</div>
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
  // The type pages are the product's tree (the customizations editor's list widgets): groups (User, Workspace · folder,
  // Built-in), rows, and plugin/extension/organization source nodes with their items nested beneath.
  const LIST_KIND = { connectors: "mcp", mcp: "mcp", plugins: "plugins", tools: "tools" };
  const SRC_KIND = { plugin: "plugin", extension: "extension", account: "organization" };
  const GROUP_ICON = { user: "account", builtin: "vscode-insiders" };
  const ADD = { skills: "New Skill", instructions: "New Instruction", agents: "New Agent", hooks: "New Hook", mcp: "Add Server" };
  const attrs = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== false && v !== null && v !== "").map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(" ");
  function treeItem(r, nested) {
    const base = { "data-row": `${r.type}|${r.key}`, nested };
    if (isConn(r.type)) {
      const c = r.item, src = c.icon?.img ? ICONS + c.icon.img : c.icon?.src, compat = MCP[c.id]?.compat || {};
      const state = { error: "error", stopped: "stopped", starting: "starting", signin: "auth-required" }[c.state] || "running";
      const compatibility = f.env ? (compat[f.env] ? "unsupported" : "") : Object.keys(compat).length ? "partially-supported" : "";
      // On / Ask / Off replaces the switch (added after the row renders); workspaces with their own setting show beside it.
      const ws = f.ws ? "" : Object.entries(c.ws || {}).filter(([, v]) => v !== c.def).map(([w, v]) => `${POLICY[v]} in ${workspaceLabel(w)}`).join(", ");
      return `<vsc-mcp-server-item ${attrs({ ...base, name: c.name, "icon-src": src, description: c.connector ? c.account : "", state, compatibility, "no-toggle": true,
        enabled: !ws, "disabled-label": ws, "data-pol": c.id })}></vsc-mcp-server-item>`;
    }
    if (r.type === "plugins") return `<vsc-plugin-item ${attrs({ ...base, name: r.name, location: `~/.copilot/installed-plugins/${r.key}`, metadata: r.sub, enabled: !r.item.disabled })}></vsc-plugin-item>`;
    if (r.type === "tools") {
      const t = r.tools, on = enabledCount(t), open = openSets.has(t.id);
      return `<vsc-tool-set-item ${attrs({ ...base, name: r.name, description: r.conn?.does || (r.origin ? r.origin.label : ""), count: `${on}/${t.count}`, enabled: !t.locked && on > 0, locked: t.locked, more: true, expanded: open })}></vsc-tool-set-item>`
        + (open ? t.tools.map((x) => `<vsc-tool-item ${attrs({ name: x, description: TOOL_DESC[x], enabled: t.locked || !offIn(t.id).has(x), readonly: t.locked, "data-tool": `${t.id}|${x}` })}></vsc-tool-item>`).join("") : "");
    }
    return `<vsc-customization-item ${attrs({ ...base, name: r.name, path: r.path || (r.origin ? `${r.origin.tag}: ${r.origin.label}` : ""), icon: TYPES[r.type].icon, badge: r.tag })}></vsc-customization-item>`;
  }
  function treePage(type) {
    const { groups } = model(type), kind = LIST_KIND[type] || "prompts";
    let html = "", first = true;
    for (const g of groups) {
      if (f.ws && g.workspace && g.workspace !== f.ws) continue;
      const rows = g.rows.filter(inCtx), srcs = g.sources.map((x) => ({ ...x, rows: x.rows.filter(inCtx) })).filter((x) => x.rows.length);
      const n = rows.length + srcs.reduce((m, x) => m + x.rows.length, 0);
      if (!n) continue;
      const canAdd = ADD[type] && g.id !== "builtin";
      html += `<vsc-customization-group ${attrs({ label: g.label, count: n, icon: g.workspace ? "folder" : GROUP_ICON[g.id], first, collapsed: closedGroups.has(type + ":" + g.id), actions: canAdd ? "add" : "", "add-label": canAdd ? ADD[type] : "", "data-group": g.id })}></vsc-customization-group>`;
      first = false;
      html += rows.map((r) => treeItem(r)).join("");
      for (const x of srcs) html += `<vsc-customization-source-node ${attrs({ label: x.src.label, kind: SRC_KIND[x.src.kind], count: x.rows.length, "open-label": x.src.kind === "plugin" ? "Show Plugin" : x.src.kind === "extension" ? "Show Extension" : "", "data-src": x.src.id, collapsed: !openSrc.has(x.src.id) })}></vsc-customization-source-node>` + x.rows.map((r) => treeItem(r, true)).join("");
    }
    const tmp = document.createElement("div");
    if (!html && ctxOn()) html = `<div class="sc-ctx-empty">No ${TYPES[type].label.toLowerCase()} here. <button type="button" class="ev-link" data-ctx-clear>Show everything</button></div>`;
    tmp.innerHTML = `<vsc-customization-list ${attrs({ section: type, kind, heading: TYPES[type].label, description: TYPES[type].desc })}>${html}</vsc-customization-list>`;
    return tmp.firstElementChild;
  }
  function listPage(type) {
    const { groups } = model(type), q = f.q.toLowerCase(), m = (r) => !q || r.name.toLowerCase().includes(q);
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

  // ---------- Level 2: the item ----------
  const code = (text, editable) => `<div class="sc-code${editable ? " is-editable" : ""}" role="textbox" aria-multiline="true" aria-readonly="${!editable}"${editable ? ' contenteditable="plaintext-only" spellcheck="false"' : ""}>${text.split("\n").map((l) => `<div class="sc-code-line">${esc(l) || "<br>"}</div>`).join("")}</div>`;
  // Where it's installed, configured in place: per environment, its state, which agents have it (a checkable menu), and
  // Install or ⋯ (Restart, Remove). Items from the repo, a plugin, an extension or the agent are read-only here.
  function whereSection(r) {
    const sl = slotsOf(r), c = r.item, ref = `${r.type}|${esc(r.key)}`;
    const usable = (e) => e.agents.filter((a) => canUse(c || { kind: r.type }, a));
    const rows = ENVS.map((e) => {
      const ag = e.agents.filter((a) => sl.has(K(e.id, a))), on = ag.length > 0, err = isConn(r.type) && c?.state === "error" && e.id === "local";
      const st = !on ? "" : e.offline ? '<span class="sc-status">Offline</span>'
        : err ? '<span class="sc-status is-error"><span class="codicon codicon-error" aria-hidden="true"></span>Error</span>'
        : isConn(r.type) && c?.state === "stopped" && e.id === "local" ? '<span class="sc-status">Stopped</span>'
        : "";
      const follows = r.editable && SYNC.has(e.id) && !c?.skip?.has(e.id) ? `<span class="sc-follow" title="Stays synced with ${esc(syncLabel(e.id))}"><span class="codicon codicon-sync" aria-hidden="true"></span>Synced with ${esc(syncLabel(e.id))}</span>` : "";
      let controls;
      if (!r.editable) controls = on ? `<span class="sc-agents-static">${esc(ag.map((a) => HARNESSES[a].label).join(", "))}</span>` : '<span class="sc-muted">Not available</span>';
      else if (!on) controls = usable(e).length ? `<button class="ev-btn sc-install" data-env-toggle="${ref}|${e.id}" title="Install on ${esc(e.label)}${e.offline ? " when it reconnects" : ""}">Install</button>`
        : `<span class="sc-muted" title="No agent on ${esc(e.label)} can use it">Not supported</span>`;
      else controls = `<button type="button" class="sc-agents" data-row-agents="${ref}|${e.id}" title="Agents that use it on ${esc(e.label)}">${esc(ag.length === usable(e).length && ag.length > 1 ? "All agents" : ag.map((a) => HARNESSES[a].label).join(", "))}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
        <vsc-toolbar label="${esc(e.label)} Actions"><vsc-action icon="ellipsis" label="More Actions..." data-where-more="${ref}|${e.id}"></vsc-action></vsc-toolbar>`;
      return `<div class="sc-env-line${on ? "" : " is-off"}${r.editable ? " is-editable" : ""}"><span class="codicon codicon-${e.icon}" aria-hidden="true"></span><span class="sc-env-name">${esc(e.label)}</span><small>${esc(e.detail)}</small>${follows}<span class="grow"></span>${st}${controls}</div>`;
    }).join("");
    const missing = r.editable && ENVS.some((e) => usable(e).some((a) => !sl.has(K(e.id, a))));
    return `<section class="sc-section"><div class="sc-section-head"><h3>Where it's installed</h3><span class="grow"></span>
      ${missing ? `<button class="ev-link" data-where-all="${ref}">Install Everywhere</button>` : ""}</div><div class="sc-env-list">${rows}</div></section>`;
  }
  function detailHtml(r) {
    const c = r.item, mcp = isConn(r.type) ? MCP[c.id] || {} : null;
    const back = `<button type="button" class="ev-icon-btn sc-back" data-back aria-label="Back to ${esc(TYPES[r.type].label)}" title="Back to ${esc(TYPES[r.type].label)}"><span class="codicon codicon-arrow-left"></span></button>`;
    const path = isConn(r.type) ? mcp.file : r.path || (r.origin ? `${r.origin.tag}: ${r.origin.label}` : r.scope === "builtin" ? `Built-in · ${r.tag || "Agents window"}` : "");
    const actions = isConn(r.type) ? `${c.state === "error" ? '<button class="ev-btn" data-restart-detail>Restart</button>' : ""}<button class="ev-btn" data-edit-config>Edit Configuration</button>`
      : ["skills", "instructions", "agents", "hooks"].includes(r.type) ? (r.scope === "builtin" || r.origin ? '<span class="sc-saved">Read-only</span>' : '<span class="sc-saved"><span class="codicon codicon-check" aria-hidden="true"></span>Saved</span>') : "";
    let body = "";
    if (isConn(r.type)) {
      if (c.state === "error") body += `<section class="sc-diag is-error"><div class="sc-diag-head"><span class="codicon codicon-error" aria-hidden="true"></span><span>This server reported an error</span><span class="sc-diag-where">This Computer · Copilot</span></div>
        <p class="sc-diag-msg">${esc(mcp.error)}</p><div class="sc-diag-actions"><button class="ev-btn" data-restart-detail>Restart</button></div></section>`;
      if (c.state === "signin") body += `<section class="sc-diag"><div class="sc-diag-head"><span class="codicon codicon-account" aria-hidden="true"></span><span>Not signed in</span></div>
        <p class="sc-diag-msg">Agents ask you to sign in the first time they need ${esc(c.name)}. Nothing is blocked until then.</p><div class="sc-diag-actions"><button class="ev-btn" data-signin-detail>Sign In Now</button></div></section>`;
      for (const [envId, why] of Object.entries(mcp.compat || {})) body += `<section class="sc-diag is-warn"><div class="sc-diag-head"><span class="codicon codicon-warning" aria-hidden="true"></span><span>Not supported on ${esc(envOf(envId).label)}</span></div><p class="sc-diag-msg">${esc(why)}</p></section>`;
      body += whereSection(r);
      const tools = TOOLS_OF[c.id];
      if (tools) body += `<section class="sc-section"><div class="sc-section-head"><h3>Tools</h3><span class="sc-section-meta">${tools.count}</span></div><div class="sc-tool-chips">${tools.tools.map((t) => `<span class="sc-tool">${esc(t)}</span>`).join("")}</div></section>`;
      body += `<section class="sc-section"><div class="sc-section-head"><h3>Configuration</h3></div>${mcp.def ? code(JSON.stringify({ [c.id]: mcp.def }, null, 2), false) : '<p class="sc-section-desc">No definition is available for this MCP server.</p>'}</section>`;
    } else if (r.type === "plugins") {
      const list = [["Skills", c === PLUGIN ? ALL.filter((x) => x.type === "skills" && x.source === "plugin").map((x) => x.name) : []], ["Connections", CONNECTIONS.filter((x) => x.origin?.plugin === c).map((x) => x.name)],
        ["Canvases", CANVASES.filter((x) => SRC[x.origin]?.plugin === c).map((x) => x.name)]].filter(([, l]) => l.length);
      body += `<section class="sc-section"><div class="sc-section-head"><h3>Includes</h3></div><div class="sc-env-list">${list.map(([k, l]) => `<div class="sc-env-line"><span class="sc-env-name">${k}</span><span class="grow"></span><span class="sc-agents-static">${esc(l.join(", "))}</span></div>`).join("")}</div></section>`;
      body += whereSection(r);
    } else if (r.type === "tools") {
      const t = r.tools;
      body += `<section class="sc-section"><div class="sc-section-head"><h3>Tools</h3><span class="sc-section-meta">${enabledCount(t)} of ${t.count} on</span></div><div class="sc-env-list">${t.tools.map((x) => {
        const on = t.locked || !offIn(t.id).has(x);
        return `<div class="sc-env-line"><span class="sc-env-name sc-mono">${esc(x)}</span>${TOOL_DESC[x] ? `<small>${esc(TOOL_DESC[x])}</small>` : ""}<span class="grow"></span>
          ${t.locked ? '<span class="sc-agents-static">Always Available</span>' : `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="Enable ${esc(x)}" data-detail-tool="${t.id}|${esc(x)}"><div class="monaco-switch-thumb"></div></button>`}</div>`;
      }).join("")}</div></section>`;
      body += whereSection(r);
    } else if (r.type === "canvases") {
      body += `<section class="sc-section"><p class="sc-section-desc">${esc(r.sub)} Agents open it next to the chat when your task needs it.</p></section>` + whereSection(r);
    } else {
      if (r.scope === "builtin") body += `<div class="sc-banner"><span class="codicon codicon-info" aria-hidden="true"></span>Built-in. Editing saves an override to User or Workspace.</div>`;
      else if (r.origin) body += `<div class="sc-banner"><span class="codicon codicon-info" aria-hidden="true"></span>Managed by ${r.origin.kind === "account" ? "your organization" : `the ${esc(r.origin.label)} ${r.origin.tag.toLowerCase()}`}. Changes come from there.</div>`;
      body += `<section class="sc-section sc-editor-section"><div class="sc-section-head"><h3>${r.type === "hooks" ? "Hook" : "Content"}</h3><span class="grow"></span><span class="sc-section-meta sc-mono">${esc((r.path || "").split("/").pop() || "")}</span></div>${code(contentOf(r), r.editable || r.scope === "workspace")}</section>`;
      body += whereSection(r);
    }
    return `<div class="sc-detail"><header class="sc-detail-head">${back}${iconFor(r, 28)}<div class="sc-detail-title"><div class="sc-detail-name">${esc(r.name)}${r.tag ? `<span class="en-tag">${esc(r.tag)}</span>` : ""}${statusChip(r)}</div>
        ${path ? `<button type="button" class="sc-detail-path" data-open-path title="Open in the editor">${esc(path)}</button>` : ""}</div><span class="grow"></span><div class="sc-detail-actions">${actions}</div>
        <vsc-toolbar label="Actions"><vsc-action icon="ellipsis" label="More Actions..." data-row-more="${r.type}|${esc(r.key)}"></vsc-action></vsc-toolbar></header>
      <div class="sc-detail-body">${body}</div></div>`;
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
        <div class="sc-env-line"><span class="codicon codicon-folder" aria-hidden="true"></span><span>Workspaces: ${esc(e.workspaces.map(workspaceLabel).join(", "))}</span></div>
        ${ses.map(([id, s]) => `<div class="sc-env-line"><span class="codicon codicon-comment-discussion" aria-hidden="true"></span><span>${esc(s.title)}</span><span class="grow"></span><button type="button" class="ev-link" data-customize-session="${id}">Customize</button></div>`).join("")}
        <div class="sc-env-line"><span class="grow"></span><button type="button" class="ev-link" data-env-lens="${e.id}">Show its customizations</button></div></div>` : ""}`;
    }).join("")}<button type="button" class="sc-add-row" data-add-env><span class="codicon codicon-add" aria-hidden="true"></span>Add Environment…</button></div>`;
  }


  // ---------- Pages ----------
  const DESC = { environments: "Where your sessions run. Each has its own agents and customizations." };
  function renderPage(id) {
    if (id === "browse" || id === "extensions") {
      if (!hosted[id]) {
        const wrap = document.createElement("div");
        wrap.className = "lib-hosted";
        wrap.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${id === "browse" ? "Discover" : "Extensions"}</h2></div><div class="en-target"></div></div>`;
        const page = window.CUST.hostPage(pages[id]);
        page.style.cssText = "flex:1;min-height:0";
        wrap.append(page);
        hosted[id] = wrap;
        host.append(wrap);
      }
      if (id === "browse") hosted.browse.querySelector(".en-target").innerHTML = target ? `<span class="en-target-label">Installs to</span>${placeLabel(target)}<button class="lib-chip-x" data-clear-target aria-label="Install anywhere" title="Install anywhere"><span class="codicon codicon-close-compact" aria-hidden="true"></span></button>` : "";
    } else {
      if (!hosted[id]) { hosted[id] = document.createElement("div"); hosted[id].className = "lib-hosted en-page sc-page"; host.append(hosted[id]); }
      const scroller = (x) => x.querySelector(".en-page-scroll") || x.querySelector(".cust-page .monaco-scrollable-element");
      const el = hosted[id], prev = scroller(el)?.scrollTop || 0, prevDetail = el.dataset.detail, focusQ = document.activeElement?.closest?.(".en-q");
      const r = detail && detail.type === id ? rowOf(id, detail.key) : null;
      if (r) el.innerHTML = `<div class="en-page-scroll sc-detail-scroll">${detailHtml(r)}</div>`;
      else if (TYPES[id]) {
        el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${TYPES[id].label}</h2></div><div class="sc-head-actions">${["connectors", "mcp", "skills", "plugins"].includes(id) ? '<button class="se-btn small" data-go="browse">Browse</button>' : ""}</div></div>`;
        const page = window.CUST.hostPage(treePage(id));
        page.style.cssText = "flex:1;min-height:0";
        el.append(page);
        const bar = document.createElement("div");
        bar.className = "sc-lens";
        bar.innerHTML = ctxBar();
        const placeBar = () => {
          const search = page.querySelector(".list-search-and-button-container, .tools-list-search-and-button-container");
          if (!search) return requestAnimationFrame(placeBar);
          // The filter sentence takes the search row; the search box moves up beside Browse.
          search.append(bar);
          const box = search.querySelector(".list-search-container, .tools-list-search-container");
          const head = el.querySelector(".sc-head-actions");
          if (box && head) head.prepend(box);
          const input = search.querySelector("input");
          if (input && f.q) { input.value = f.q; input.classList.remove("empty"); page.querySelector("vsc-customization-list").filter(f.q); }
          for (const row of page.querySelectorAll("vsc-mcp-server-item[data-pol]")) {
            const c = CONNECTIONS.find((x) => x.id === row.dataset.pol), actions = row.querySelector(".mcp-server-actions");
            if (!c || !actions || actions.querySelector(".en-tri")) continue;
            const tmp = document.createElement("div");
            tmp.innerHTML = f.ws ? tri(c, "data-tri-ws", c.ws?.[f.ws] || c.def) : tri(c, "data-tri-def", c.def);
            actions.insertBefore(tmp.firstElementChild, actions.querySelector(".codicon-ellipsis"));
          }
          const sc = scroller(el);
          if (sc) sc.scrollTop = prevDetail ? listScroll[id] || 0 : prev;
        };
        customElements.whenDefined("vsc-customization-list").then(() => requestAnimationFrame(placeBar));
      } else {
        const isType = false;
        el.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">${TYPES[id]?.label || "Environments"}</h2><p class="se-page-desc">${esc(TYPES[id]?.desc || DESC[id])}</p></div>${["connectors", "mcp", "skills", "plugins"].includes(id) ? '<button class="se-btn small" data-go="browse">Browse</button>' : ""}</div>
          ${isType ? `<div class="lib-filters en-filters"><button class="lib-filter${f.env ? " set" : ""}" data-lens>${esc(f.env ? envOf(f.env).label : "All environments")}<span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>
            ${f.env ? `<span class="lib-chip">Showing what's on ${esc(envOf(f.env).label)}<button class="lib-chip-x" data-lens-clear aria-label="Show all environments" title="Show all environments"><span class="codicon codicon-close-compact" aria-hidden="true"></span></button></span>` : ""}
            <span class="grow"></span><vsc-input class="en-q" placeholder="Filter" value="${esc(f.q)}"></vsc-input></div>` : ""}
          <div class="en-page-scroll">${isType ? listPage(id) : envPage()}</div>`;
      }
      if (r && !prevDetail) listScroll[id] = prev;
      if (r || !TYPES[id]) el.querySelector(".en-page-scroll").scrollTop = r ? (prevDetail === r.key ? prev : 0) : prevDetail ? listScroll[id] || 0 : prev;
      if (r) { el.dataset.detail = r.key; } else delete el.dataset.detail;
      if (focusQ && !r) requestAnimationFrame(() => { const i = el.querySelector(".en-q input"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
    }
    for (const [k, el] of Object.entries(hosted)) el.style.display = k === id ? "flex" : "none";
    for (const el of root.querySelectorAll("[data-count]")) el.textContent = navCount(el.dataset.count);
  }
  function show(id, o = {}) {
    if (id === "connections") id = "mcp";
    if ("target" in o) target = o.target;
    if (o.env !== undefined) { f.env = o.env; f.ws = o.ws || null; f.agent = o.agent || null; }
    if (id !== section || !o.keepDetail) { detail = o.detail ? { type: id, key: o.detail } : null; outputOpen = !!o.output; }
    section = id;
    for (const el of root.querySelectorAll(".se-nav-item")) { const on = el.dataset.id === id; el.classList.toggle("active", on); el.setAttribute("aria-selected", String(on)); el.tabIndex = on ? 0 : -1; }
    renderPage(id);
  }
  function ctxChanged() { renderPage(section); }
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
    const nav = t(".se-nav-item");
    if (nav) return show(nav.dataset.id);
    if (t("[data-go]")) return show(t("[data-go]").dataset.go);
    if (t("[data-clear-target]")) { target = null; return renderPage("browse"); }
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
    const tw = t("[data-tri-ws]");
    if (tw) { const it = CONNECTIONS.find((c) => c.id === tw.dataset.triWs), v = tw.dataset.v; it.ws ||= {}; if (v === it.def) delete it.ws[f.ws]; else it.ws[f.ws] = v; changed(); return toast(`${it.name}: ${POLICY[v]} in ${workspaceLabel(f.ws)}.${v === it.def ? " Same as everywhere else." : ""}`); }
    const td = t("[data-tri-def]");
    if (td) { const it = CONNECTIONS.find((c) => c.id === td.dataset.triDef); it.def = td.dataset.v; changed(); return toast(`${it.name}: ${POLICY[it.def]} by default.${it.ws && Object.keys(it.ws).length ? " Workspaces with their own setting keep it." : ""}`); }
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
    if (t("button, a, input, vsc-toolbar, vsc-input, .en-tri, .monaco-switch")) return;
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
    if (isConn(r.type)) { r.item.def = e.detail.enabled ? "on" : "off"; changed(); return toast(`${r.name}: ${e.detail.enabled ? "On" : "Off"} by default.`); }
    if (r.type === "tools") {
      const t = r.tools;
      if (e.detail.enabled) offIn(t.id).clear(); else for (const x of t.tools) offIn(t.id).add(x);
      renderPage(section);
      return toast(`${e.detail.enabled ? "Turned on" : "Turned off"} all ${plural(t.count, "tool")} in ${r.name}.`);
    }
    if (r.type === "plugins") { r.item.disabled = !e.detail.enabled; return toast(`${r.name} is ${e.detail.enabled ? "on" : "off"}.`); }
  });
  root.addEventListener("input", (e) => {
    if (e.target.closest(".cust-page") && e.target.matches("input")) f.q = e.target.value || "";
    if (e.target.closest(".en-q")) { f.q = e.target.value || ""; renderPage(section); }
  });
  host.addEventListener("install", (e) => {
    const card = e.target.closest("vsc-customization-discovery-card"), name = card.getAttribute("name"), existing = cardItem(name);
    if (existing) return openInstall({ items: [existing], mode: "edit", here: target });
    const meta = card.getAttribute("meta") || "", kind = /^Skill/.test(meta) ? "skill" : /^Plugin/.test(meta) ? "plugin" : "connection";
    const item = { kind, id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, card: name, icon: { src: card.getAttribute("icon-src") }, does: card.getAttribute("description"), sub: meta, at: new Set(), def: "on" };
    openInstall({ items: [item], mode: "new", preset: target ? [target] : null, here: target, sub: meta, onDone: () => card.setAttribute("action", "Manage") });
  });
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
  /** From the panel: open an item's details (a skill by name: this session's copy first). */
  function openDetail(type, id, o = {}) {
    let key = id;
    if (type === "connections") type = CONNECTIONS.find((c) => c.id === id)?.connector ? "connectors" : "mcp";
    if (type === "skills") {
      const rows = allRows("skills").filter((r) => r.name === id);
      const r = rows.find((x) => x.scope === "workspace" && x.workspace === store.scope.workspace) || rows.find((x) => x.scope === "user") || rows[0];
      key = r?.key;
    }
    show(type, { detail: key, output: o.output, env: null });
  }
  return { show, openDetail, get section() { return section; } };
}
/** The panel's "More" rows: other types this session has, with counts. */
export function moreFor(scope, ids = ["instructions", "agents", "hooks", "tools", "canvases"]) {
  const k = K(scope.environment, scope.harness);
  return ids.map((id) => ({ id, label: TYPES[id].label,
    count: allRows(id).filter((r) => (r.scope !== "workspace" || r.workspace === scope.workspace) && slotsOf(r).has(k)).length }));
}
