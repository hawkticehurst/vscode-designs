/* Concept C — Receipts: "Customize from what the agent actually did."
   Two destinations: Sessions (each reply carries a receipt frozen at request time; Teach from the reply) and
   Customizations (the complete inventory, with what has no recorded use). Receipts never re-derive the past from
   today's configuration: what wasn't captured is shown as Unknown. */
(function () {
  const { h, icon, srcGlyph, switchEl, popover, closePop, toast } = window.CZUI;
  const C = window.CZ;
  const get = (id) => C.byId[id];
  const HZ = { copilot: "Copilot CLI", claude: "Claude Code", codex: "Codex" };
  const HZ_ICON = { copilot: "copilot", claude: "claude", codex: "openai" };
  const base = (p) => p.split("/").pop();
  const code = (t) => h("code", null, t);
  const DS = () => window.ds && window.ds.vscode;

  const state = { view: "sessions", session: "focus", turn: "focus-1", query: "", listCollapsed: false, open: new Set(), drafts: {}, created: [],  removed: new Set(),
    sort: { key: "status", dir: 1 }, filter: null, azure: null, flash: null, inspecting: false };

  /* ── Sessions (last 7 days in vscode) ───────────────────────── */
  const CSS = "src/vs/workbench/contrib/chat/browser/aiCustomization/media/aiCustomizationManagement.css";
  const CARD = "src/vs/workbench/contrib/chat/browser/aiCustomization/customizationCardList.ts";
  const STATE_TS = "src/vs/platform/agentHost/common/state/protocol/state.ts";
  const MCP_TS = "src/vs/platform/agentHost/node/mcpServerManager.ts";

  // Frozen per-turn records from each request's instruction debug log: [id, why]. why = "always" | "ref" (referenced by
  // AGENTS.md) | "every" (applyTo ** attaches with or without files) | "read" (agent read a listed instruction) | a file name.
  const I_BASE = [["agents-md", "always"], ["copilot-instructions", "ref"], ["ms-security", "always"], ["terse-commits", "every"], ["i-committing", "every"]];
  const I_FILE = (file, ids) => I_BASE.concat(ids.map((id) => [id, file]));
  const I_CSS = I_FILE("aiCustomizationManagement.css", ["i-coding-guidelines", "i-source-code-organization", "i-best-practices", "i-design-philosophy", "i-design-tokens", "i-css-best-practices", "i-ai-customization"]);
  const I_CARD = I_FILE("customizationCardList.ts", ["i-coding-guidelines", "i-source-code-organization", "i-best-practices", "i-design-philosophy", "i-ai-customization"]);
  const I_MCP = I_FILE("mcpServerManager.ts", ["i-coding-guidelines", "i-source-code-organization", "i-best-practices", "i-agentHostTesting", "i-agent-host-interoperability"]);
  const I_TEL1 = I_BASE.concat([["i-kusto", "read"], ["i-telemetry", "read"]]);
  // Descriptions offered, as captured with each Copilot request (names only). Claude Code turns didn't report them.
  const OFFERED_COPILOT = C.items.filter((i) => (i.type === "skill" && i.modelInvocable && !i.duplicateOf && C.supported(i, "copilot")) || (i.type === "instruction" && i.mode === "listed")).map((i) => [i.id, i.name, i.type]);

  const SESSIONS = [
    { id: "focus", title: "Fix focus ring in customization cards", group: "Today", time: "10:42 AM", icon: "pass", harness: "copilot", agent: "default", where: "Worktree · fix/focus-ring-cards",
      turns: [
        { id: "focus-1", instr: I_CSS, time: "10:31 AM", attach: [CSS],
          req: ["The focus ring on customization cards is clipped on the left edge and disappears when you Tab into the list. Spec: ",
            h("a", { href: "#", onclick: (e) => e.preventDefault() }, "figma.com/design/k2Pq9Xr/Customizations-2026?node-id=412-1180"), " ", code("#aiCustomizationManagement.css")],
          summary: "Completed 6 steps in 1m 12s", added: 9, removed: 4,
          steps: [["search-compact", "Searched for <code>outline: none</code> in <code>aiCustomization/</code>"], ["book-compact", "Read", "aiCustomizationManagement.css"], ["book-compact", "Read", "customizationCardList.ts"],
            ["book-compact", "Read", "ux-css-layout/SKILL.md"], ["book-compact", "Read", "accessibility/SKILL.md"], ["edit", "", "aiCustomizationManagement.css", 9, 4]],
          md: `<p>I couldn't open the Figma link — no Figma tool is available in this session — so I worked from the existing focus tokens instead.</p>
            <p>Two things were wrong:</p>
            <ul><li><code>.customization-card</code> set <code>outline: none</code> on <code>:focus</code> and drew the ring with a <code>box-shadow</code>, which the list's <code>overflow: hidden</code> clipped on the left edge.</li>
            <li>The ring was keyed to <code>:focus-within</code>, so tabbing to the card's <strong>More Actions</strong> button hid it on the card.</li></ul>
            <p>Both now use a <code>:focus-visible</code> outline with <code>var(--vscode-focusBorder)</code> and <code>outline-offset: -1px</code>, so it draws inside the card.</p>`,
          loaded: [["s-ux-css-layout", "read"], ["s-accessibility", "read"]],
          tools: [["t-search", "grep_search", 1], ["t-read", "read_file", 3], ["t-edit", "replace_string_in_file", 2]],
          hooks: [["h-semgrep", "postToolUse", 2, "2.1s", 0]], pins: ["figma"] },
        { id: "focus-2", instr: I_CSS, time: "10:36 AM", attach: [CSS, CARD],
          req: ["Check it in a real window — Tab through the list and screenshot keyboard focus in Dark 2026 and Light 2026."],
          summary: "Completed 7 steps in 2m 31s",
          steps: [["book-compact", "Read", "launch/SKILL.md"], ["terminal-compact", "Ran <code>./scripts/code.sh --user-data-dir .build/launch/focus-ring</code>"], ["tools", "Navigated to the Customizations modal"],
            ["tools", "Pressed <code>Tab</code> 3 times"], ["tools", "Took a screenshot", "focus-dark-2026.png"], ["tools", "Took a screenshot", "focus-light-2026.png"]],
          md: `<p>The ring now draws fully inside the card in both themes, including the first card against the list's left edge. Tabbing to <strong>More Actions</strong> keeps the card's ring visible and adds the button's own ring.</p>
            <p>Screenshots: <code>focus-dark-2026.png</code>, <code>focus-light-2026.png</code>.</p>`,
          loaded: [["s-launch", "read"]],
          tools: [["t-execute", "run_in_terminal", 1], ["m-playwright", "browser_navigate", 1], ["m-playwright", "browser_press_key", 3], ["m-playwright", "browser_take_screenshot", 2]],
          hooks: [] },
        { id: "focus-3", instr: I_CSS, time: "10:41 AM", attach: [CSS],
          req: ["Open a draft PR for it."],
          summary: "Completed 5 steps in 38s",
          steps: [["book-compact", "Read", "pr-description/SKILL.md"], ["terminal-compact", "Ran <code>git commit -m \"Keep focus ring visible on customization cards\"</code>"], ["terminal-compact", "Ran <code>git push -u origin fix/focus-ring-cards</code>"],
            ["tools", "Created pull request <strong>#279114</strong>"], ["tools", "Read pull request <strong>#279114</strong>"]],
          md: `<p>Opened draft PR <a href="#">#279114 Keep focus ring visible on customization cards</a> with both screenshots and a test plan (Tab through the list in both themes; check High Contrast).</p>`,
          loaded: [["s-prdesc", "read"]],
          tools: [["t-execute", "run_in_terminal", 2], ["m-github", "create_pull_request", 1], ["m-github", "get_pull_request", 1]],
          hooks: [] },
      ] },

    { id: "telemetry", title: "Telemetry: how often is the modal opened?", group: "Today", time: "9:58 AM", icon: "pass", harness: "copilot", agent: "a-data", where: "Local · main",
      turns: [
        { id: "tel-1", instr: I_TEL1, time: "9:41 AM", attach: [],
          req: ["How often is the Customizations modal opened per day, and from where? Last 28 days, Stable vs Insiders."],
          summary: "Completed 7 steps in 2m 04s",
          steps: [["search-compact", "Searched for <code>chatCustomizations.open</code>"], ["book-compact", "Read", "aiCustomizationManagementEditor.ts"], ["book-compact", "Read", "kusto.instructions.md"], ["book-compact", "Read", "telemetry.instructions.md"],
            ["tools", "Ran a Kusto query in <strong>Kusto Explorer</strong>"], ["tools", "Ran a Kusto query in <strong>Kusto Explorer</strong>"], ["tools", "Checked query execution"]],
          md: `<p><code>azure-mcp/kusto_query</code> is in my tools, but the azure-mcp server isn't installed, so I ran the queries through Kusto Explorer instead.</p>
            <p>The modal opens through <code>workbench.action.chat.openCustomizations</code>; the <code>source</code> property tells us where. Daily average, last 28 days:</p>
            <table><thead><tr><th>Opened from</th><th>Stable</th><th>Insiders</th></tr></thead><tbody>
            <tr><td>Sessions sidebar › Customizations</td><td>18,420</td><td>2,310</td></tr>
            <tr><td>Chat view › Configure Chat</td><td>7,960</td><td>1,140</td></tr>
            <tr><td>Command Palette</td><td>3,105</td><td>655</td></tr>
            <tr><td>Deep link (vscode://chat-customizations)</td><td>410</td><td>92</td></tr>
            </tbody></table>`,
                    tools: [["t-search", "grep_search", 2], ["t-read", "read_file", 3], ["e-kusto", "kustoQueryExecution", 2], ["e-kusto", "kusto", 1]],
          hooks: [], pins: ["azure"] },
        { id: "tel-2", instr: I_BASE, time: "9:50 AM", attach: [],
          req: ["Break the Stable number down by harness."],
          summary: "Completed 2 steps in 41s",
          steps: [["tools", "Ran a Kusto query in <strong>Kusto Explorer</strong>"], ["tools", "Checked query execution"]],
          md: `<table><thead><tr><th>Harness</th><th>Opens / day</th><th>Share</th></tr></thead><tbody>
            <tr><td>Copilot CLI</td><td>19,130</td><td>64%</td></tr><tr><td>Local agent</td><td>6,280</td><td>21%</td></tr>
            <tr><td>Claude Code</td><td>3,290</td><td>11%</td></tr><tr><td>Codex</td><td>1,195</td><td>4%</td></tr></tbody></table>
            <p>Claude Code users open it 1.8× as often per session — most of those opens land on Instructions.</p>`,
          tools: [["e-kusto", "kustoQueryExecution", 1], ["e-kusto", "kusto", 1]], hooks: [] },
        { id: "tel-3", instr: I_BASE, time: "9:57 AM", attach: [],
          req: ["Post a short summary to #vscode-agents-telemetry."],
          summary: "Completed 2 steps in 12s",
          steps: [["tools", "Searched Slack channels for <strong>vscode-agents-telemetry</strong>"], ["tools", "Sent a message to <strong>#vscode-agents-telemetry</strong>"]],
          md: `<p>Posted to <strong>#vscode-agents-telemetry</strong> with both tables and the two queries in a thread.</p>`,
          tools: [["c-slack", "slack_search_channels", 1], ["c-slack", "slack_send_message", 1]], hooks: [] },
      ] },

    { id: "triage", title: "Triage new issues", group: "Today", time: "9:00 AM", icon: "calendar", harness: "copilot", agent: "default", automation: "au-triage", where: "Automation · weekdays at 9:00",
      turns: [
        { id: "tri-1", instr: I_BASE, time: "9:00 AM", attach: [], auto: true,
          req: [code("/issue-grouping"), " Group new issues from the last day and draft labels."],
          summary: "Completed 18 steps in 3m 47s",
          steps: [["book-compact", "Read", "issue-grouping/SKILL.md"], ["tools", "Listed issues in <strong>microsoft/vscode</strong>"], ["tools", "Searched issues 3 times"], ["tools", "Read 14 issues"]],
          md: `<p>14 new issues since yesterday 9:00, in 5 groups. Labels are drafted, not applied.</p>
            <ul><li><strong>Chat customizations</strong> (4) — <code>chat-customizations</code>, 2 look like duplicates of #278801</li><li><strong>Agent host reconnect</strong> (3) — <code>agent-host</code></li><li><strong>Terminal sandbox</strong> (3), <strong>Notebook outline</strong> (2), <strong>Other</strong> (2)</li></ul>`,
          loaded: [["s-issue-grouping", "automation"]],
          tools: [["m-github", "list_issues", 1], ["m-github", "search_issues", 3], ["m-github", "issue_read", 14]], hooks: [] },
      ] },

    { id: "perf", title: "Chat perf check", group: "Yesterday", time: "4:12 PM", icon: "calendar", harness: "copilot", agent: "default", automation: "au-perf", where: "Automation · Mondays at 8:00 · run manually",
      turns: [
        { id: "perf-1", instr: I_BASE, time: "4:12 PM", attach: [], auto: true,
          req: ["Run the chat perf benchmark against Insiders and report regressions."],
          summary: "Completed 6 steps in 14m 02s",
          steps: [["book-compact", "Read", "chat-perf/SKILL.md"], ["terminal-compact", "Ran <code>npm run perf:chat -- --build insiders --runs 5</code>"], ["terminal-compact", "Ran <code>npm run perf:chat -- --build stable --runs 5</code>"], ["book-compact", "Read", "perf-results.json"]],
          md: `<p>No regressions above the 5% threshold. First token latency is flat (412 ms vs 409 ms); rendering a 200-turn transcript improved 7%.</p>`,
          loaded: [["s-chat-perf", "automation"]],
          tools: [["t-execute", "run_in_terminal", 3], ["t-read", "read_file", 2]], hooks: [] },
      ] },

    { id: "agenthost", title: "Agent host: sync user skills", group: "Yesterday", time: "2:20 PM", icon: "pass", harness: "claude", agent: "default", where: "Worktree · agent-host/sync-user-skills",
      turns: [
        { id: "ah-1", instr: null, time: "1:48 PM", attach: [STATE_TS],
          req: ["When the client reconnects, sync skills from ~/.copilot/skills into the agent host. ", code("#state.ts")],
          summary: "Completed 11 steps in 4m 10s", added: 64, removed: 12,
          steps: [["book-compact", "Read", "customizations-in-the-agent-host/SKILL.md"], ["book-compact", "Read", "state.ts"], ["book-compact", "Read", "agentHostCustomizations.ts"], ["edit", "", "state.ts", 18, 2], ["edit", "", "agentHostCustomizations.ts", 46, 10], ["terminal-compact", "Ran <code>npm run compile-check-ts-native</code>"]],
          md: `<p>Added a <code>userSkills</code> slice to the host state and resync it on <code>reconnect</code>. Paths stay client-side URIs; the host only receives skill contents.</p>`,
          loaded: [["s-customizations-in-the-agent-host", "read"]],
          tools: [["t-read", "Read", 6], ["t-edit", "Edit", 3], ["t-execute", "Bash", 2]],
          hooks: [["h-semgrep", "PostToolUse", 3, "5.8s", 0]] },
      ] },

    { id: "hover", title: "Hover delay in customization list", group: "Yesterday", time: "11:05 AM", icon: "pass", harness: "copilot", agent: "default", where: "Local · main",
      turns: [
        { id: "hov-1", instr: I_CARD, time: "10:52 AM", attach: [CARD],
          req: ["Hovers on customization rows show instantly and flicker when you move down the list. ", code("#customizationCardList.ts")],
          summary: "Completed 4 steps in 51s", added: 6, removed: 3,
          steps: [["book-compact", "Read", "hover/SKILL.md"], ["book-compact", "Read", "customizationCardList.ts"], ["edit", "", "customizationCardList.ts", 6, 3]],
          md: `<p>The rows created hovers with <code>showHover</code> directly. They now use <code>getDelayedHoverDelegate()</code>, which respects <code>workbench.hover.delay</code> and keeps one hover across adjacent rows.</p>`,
          loaded: [["s-hover", "read"]],
          tools: [["t-read", "read_file", 2], ["t-edit", "replace_string_in_file", 1]], hooks: [["h-semgrep", "postToolUse", 1, "1.4s", 0]] },
      ] },

    { id: "review", title: "Review: MCP restart race in agent host", group: "Earlier", time: "Mon", icon: "pass", harness: "copilot", agent: "a-reviewer", where: "Local · PR #278950",
      turns: [
        { id: "rev-1", instr: I_MCP, time: "Mon 3:02 PM", attach: [MCP_TS],
          req: ["Review PR #278950. ", code("#mcpServerManager.ts")],
          summary: "Completed 9 steps in 3m 20s",
          steps: [["tools", "Read pull request <strong>#278950</strong>"], ["book-compact", "Read", "mcpServerManager.ts"], ["agent", "Delegated to <strong>security-reviewer</strong>"], ["tools", "<strong>semgrep/scan</strong> failed — server didn't start"]],
          md: `<p>Two issues: <code>restart()</code> disposes the old transport before the new one is ready, so a tool call in between rejects; and the retry loop never backs off. security-reviewer found no new network endpoints, but couldn't run Semgrep.</p>`,
          sub: [["a-secrev", "Reviewer"]],
          tools: [["m-github", "pull_request_read", 2], ["t-read", "read_file", 5], ["m-semgrep", "scan", 1, true]], hooks: [], pins: ["semgrep"] },
      ] },

    { id: "standup", title: "Standup notes", group: "Earlier", time: "Tue", icon: "pass", harness: "copilot", agent: "default", where: "Quick chat",
      turns: [
        { id: "std-1", instr: I_BASE, time: "Tue 9:12 AM", attach: [],
          req: [code("/standup-notes")],
          summary: "Completed 4 steps in 22s",
          steps: [["lightbulb", "Ran <strong>/standup-notes</strong>"], ["book-compact", "Read", "standup-notes/SKILL.md"], ["tools", "Searched pull requests twice"], ["tools", "Read today's meetings from <strong>Work IQ</strong>"]],
          md: `<p><strong>Yesterday:</strong> merged #278731 (hover delegate in tool picker), reviewed #278950.<br><strong>Today:</strong> focus ring in customization cards; design review at 2:00.<br><strong>Blocked:</strong> none.</p>`,
          loaded: [["s-standup", "typed"]],
          tools: [["m-github", "search_pull_requests", 2], ["c-workiq", "get_meetings", 1]], hooks: [] },
      ] },
  ];
  const TURNS = {};
  for (const s of SESSIONS) for (const t of s.turns) { TURNS[t.id] = { s, t }; if (!("offered" in t)) t.offered = s.harness === "copilot" ? OFFERED_COPILOT.slice() : null; }
  const session = () => SESSIONS.find((s) => s.id === state.session);
  const agentName = (s) => (s.agent === "default" ? "Default agent" : get(s.agent).name);
  const LAST_LABEL = (si) => { const s = SESSIONS[si]; return s.group === "Today" ? "Today, " + s.time : s.group === "Yesterday" ? "Yesterday, " + s.time : s.time; };

  // Last recorded use, from the frozen receipts only (offered descriptions and failed calls don't count).
  const OBS = new Map();
  SESSIONS.forEach((s, si) => {
    const touch = (id) => { if (!OBS.has(id)) OBS.set(id, si); };
    if (s.agent !== "default") touch(s.agent);
    if (s.automation) touch(s.automation);
    for (const t of s.turns) {
      (t.instr || []).forEach(([id]) => touch(id));
      (t.loaded || []).forEach(([id]) => touch(id));
      (t.tools || []).filter((x) => !x[3]).forEach(([id]) => touch(id));
      (t.hooks || []).forEach(([id]) => touch(id));
      (t.sub || []).forEach(([id]) => touch(id));
    }
  });
  for (const p of C.items.filter((i) => i.type === "plugin")) {
    const seen = p.contributes.filter((id) => OBS.has(id)).map((id) => OBS.get(id));
    if (seen.length) OBS.set(p.id, Math.min(...seen));
  }
  const lastUse = (it) => (OBS.has(it.id) ? LAST_LABEL(OBS.get(it.id)) : null);

  /* ── Missed opportunities: observed failure (history) → current state → repair ── */
  const PINS = {
    figma: { label: "Figma unavailable", title: "Figma was unavailable", item: "c-figma", ev: "inferred",
      observed: () => ["The reply reports it couldn't open the ", code("figma.com"), " link."],
      now: () => "Figma is signed out now; this turn's connection state wasn't recorded.",
      fixed: () => get("c-figma").state.auth === "signed-in",
      fixedText: () => "Signed in as hawkticehurst.",
      actions: () => [h("button.sb.primary", { type: "button", onclick: () => fixItem(get("c-figma")) }, "Sign In")] },
    azure: { label: "1 tool unavailable", title: "kusto_query wasn't available", item: "a-data", ev: "recorded",
      observed: () => ["Data's tools list ", code("azure-mcp/kusto_query"), ", but no server provided it in this turn. The agent used Kusto Explorer instead."],
      now: () => "azure-mcp still isn't installed.",
      fixed: () => !!state.azure,
      fixedText: () => (state.azure === "installed" ? "Installed Azure MCP." : "Removed azure-mcp/kusto_query from Data's tools."),
      actions: () => [h("button.sb.primary", { type: "button", onclick: installAzure }, "Install Azure MCP"), h("button.sb", { type: "button", onclick: removeAzure }, "Remove from Data's Tools")] },
    semgrep: { label: "Semgrep didn't start", title: "Semgrep didn't start", item: "m-semgrep", ev: "recorded",
      observed: () => [code("semgrep/scan"), " failed: the server exited because ", code("SEMGREP_APP_TOKEN"), " wasn't set."],
      now: () => "SEMGREP_APP_TOKEN still isn't set.",
      fixed: () => get("m-semgrep").state.auth !== "env",
      fixedText: () => "Saved SEMGREP_APP_TOKEN to your user secrets.",
      actions: () => [h("button.sb.primary", { type: "button", onclick: (e) => fixItem(get("m-semgrep"), e.currentTarget) }, "Set Variable…")] },
  };
  const openPins = (t) => (t.pins || []).filter((p) => !PINS[p].fixed());

  function setVariable(it, anchor) {
    const input = h("input.tf", { type: "password", placeholder: "Value", "aria-label": "SEMGREP_APP_TOKEN value", autocomplete: "off" });
    const save = h("button.sb.primary", { type: "button", disabled: true, onclick: () => {
      if (!input.value.trim()) return;
      it.state.auth = "none"; it.status = null; it.statusText = null; closePop(); toast("Saved SEMGREP_APP_TOKEN to your user secrets", "key"); refresh();
    } }, "Save");
    input.addEventListener("input", () => { save.disabled = !input.value.trim(); });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") save.click(); });
    popover(anchor, h("div.setvar", null, h("b", null, "SEMGREP_APP_TOKEN"), h("div.muted", null, "Saved to your user secrets."), input,
      h("div.setvar-a", null, h("button.sb", { type: "button", onclick: closePop }, "Cancel"), save)), { width: 280 });
    setTimeout(() => input.focus(), 0);
  }
  function fixItem(it, anchor) {
    if (it.state && it.state.auth === "env") return setVariable(it, anchor);
    closePop();
    if (it.state && it.state.auth === "signed-out") { it.state.auth = "signed-in"; it.state.running = true; it.status = null; it.statusText = null; toast(`Signed in to ${it.name} as hawkticehurst`, "pass"); }
    else if (it.status === "update") { it.version = it.update; it.update = null; it.status = null; it.statusText = null; toast(`Updated ${it.name} to ${it.version}`, "pass"); }
    else if (it.type === "prompt") { it.harness.copilot = "yes"; it.path = "~/.copilot/skills/release-notes/SKILL.md"; toast("Converted release-notes to ~/.copilot/skills/release-notes/SKILL.md", "pass"); }
    refresh();
  }
  function installAzure() {
    const it = { id: "m-azure", type: "mcp", name: "Azure MCP", src: "user", transport: "stdio", command: "npx -y @azure/mcp@latest server start", path: "~/Library/.../mcp.json", reach: "online",
      state: { configured: true, trusted: true, enabled: true, auth: "signed-in", running: false }, tools: 34, enabled: true, desc: "Azure resources, Kusto (Data Explorer), Storage and Monitor." };
    state.created.push(it); C.byId[it.id] = it;
    const d = get("a-data"); d.status = null; d.statusText = null; state.azure = "installed";
    toast("Installed Azure MCP", "pass"); refresh();
  }
  function removeAzure() {
    const d = get("a-data"); d.tools = d.tools.filter((t) => !t.startsWith("azure-mcp/")); d.status = null; d.statusText = null; state.azure = "removed";
    toast("Removed azure-mcp/kusto_query from .github/agents/data.md", "pass"); refresh();
  }

  /* ── Item popover ───────────────────────────────────────────── */
  function whenText(it) {
    switch (it.type) {
      case "instruction": return it.mode === "standing" ? "Added to every request." : it.mode === "glob" ? h("span", null, "Attached when a request includes a file matching ", code(it.applyTo), ".") : "Its description is offered; the agent reads it when relevant.";
      case "skill": return it.modelInvocable ? h("span", null, "Its description is offered; loaded when the agent reads it", it.userInvocable ? [", or when you type ", code("/" + it.name)] : null, ".") : h("span", null, "Only when you type ", code("/" + it.name), ".");
      case "prompt": return h("span", null, "When you type ", code("/" + it.name), ".");
      case "agent": return it.userInvocable === false ? "Only as a subagent, when another agent delegates to it." : "When you pick it, or another agent delegates to it.";
      case "hook": return h("span", null, "On ", code(it.event), it.matcher ? ` (${it.matcher})` : "", it.condition ? `, ${it.condition}` : "", ".");
      case "automation": return it.schedule + ".";
      case "canvas": return "When the agent opens it in a Copilot CLI session.";
      case "plugin": return "Adds the customizations it contains.";
      default: return it.reach === "online" ? "Its tools are offered to the agent and run with your account." : "Its tools are offered to the agent and run on this machine.";
    }
  }
  function chain(it) {
    const s = it.state; if (!s) return null;
    const step = (ok, label, warn) => h("span", null, icon(ok ? "pass" : warn ? "warning" : "circle-slash", ok ? "st-ok" : warn ? "st-warn" : "st-blocked"), label);
    return h("div.ins-chain", null, step(it.locked !== "blocked", it.locked === "blocked" ? "Not allowed" : "Allowed"), step(it.enabled !== false, "Enabled"),
      s.auth === "none" ? null : s.auth === "env" ? step(false, "Needs env var", true) : step(s.auth === "signed-in", s.auth === "signed-in" ? "Signed in" : "Signed out", true),
      step(s.running, s.running ? "Running" : "Starts on use", !s.running && it.status !== "blocked"));
  }
  function inspect(it, anchor, run) {
    if (!it) return;
    const T = C.TYPES[it.type];
    const last = lastUse(it);
    const actions = [];
    if (it.state && it.state.auth === "signed-out") actions.push(h("button.sb.primary", { onclick: () => fixItem(it) }, "Sign In"));
    if (it.state && it.state.auth === "env") actions.push(h("button.sb.primary", { onclick: () => fixItem(it, anchor) }, "Set Variable…"));
    if (it.path && !["Organization policy", "Built-in"].includes(it.path) && !it.via) actions.push(h("button.sb", { onclick: () => { closePop(); toast("Opened " + it.path, "go-to-file"); } }, "Open"));
    const toolsList = it.type === "agent" && it.tools ? h("ul.ins-tools", null, it.tools.map((t) => {
      const missing = t.startsWith("azure-mcp/") && !get("m-azure");
      return h("li", null, icon(missing ? "circle-slash" : "check", missing ? "st-blocked" : "st-ok"), code(t), missing ? h("span.muted", null, "not installed") : null);
    })) : null;
    popover(anchor, h("div", null,
      h("div.ins-h", null, icon(T.icon), h("div.t", null, h("b", null, it.name), h("small", null, T.label)), srcGlyph(it)),
      it.desc ? h("p.ins-d", null, it.desc) : null,
      h("dl.ins-k", null,
        run ? [h("dt", null, "This turn"), h("dd", null, run)] : null,
        h("dt", null, "When"), h("dd", null, whenText(it)),
        it.path ? [h("dt", null, "From"), h("dd", null, it.via ? `${get(it.via).name} plugin` : h("span.mono", null, it.path))] : null,
        it.command ? [h("dt", null, "Runs"), h("dd", null, code(it.command))] : null,
        it.state ? [h("dt", null, "Status"), h("dd", null, chain(it), it.statusText ? h("div.muted", null, it.statusText) : null)] : null,
        toolsList ? [h("dt", null, "Tools"), h("dd", null, toolsList)] : null,
        h("dt", null, "Last use"), h("dd", null, last || h("span.muted", null, state.created.includes(it) ? "New" : "None recorded in 7 days"))),
      h("div.ins-f", null, lockOrSwitch(it), h("span.grow"), actions)), { width: it.type === "agent" ? 400 : 360 });
  }
  function lockOrSwitch(it) {
    if (it.locked === "required") return h("span.lock", { title: "Required by microsoft" }, icon("lock"), "Required");
    if (it.locked === "blocked") return h("span.lock", { title: "Not on microsoft's MCP allowlist" }, icon("circle-slash"), "Blocked");
    if (it.duplicateOf || state.removed.has(it.id)) return h("span");
    return switchEl(it.enabled !== false, (v) => { it.enabled = v; toast(`${v ? "Enabled" : "Disabled"} ${it.name}`, v ? "pass" : "circle-slash"); refresh(); }, { label: "Enable " + it.name });
  }

  /* ── Sessions view ──────────────────────────────────────────── */
  let bodyEl, listEl, mainEl, inspEl, segEl, searchEl, strips = {};

  function sessionList() {
    const q = state.query.toLowerCase();
    const shown = SESSIONS.filter((s) => !q || s.title.toLowerCase().includes(q));
    return h("div.rs", null, ["Today", "Yesterday", "Earlier"].map((g) => {
      const ss = shown.filter((s) => s.group === g); if (!ss.length) return null;
      return [h("div.rs-group", null, g), ss.map((s) => {
        const problem = s.turns.some((t) => openPins(t).length);
        return h("button.rs-row" + (s.id === state.session ? ".active" : ""), { type: "button", "aria-current": s.id === state.session ? "true" : null, onclick: () => openSession(s.id) },
          h("div.rs-t", null, h("div.rs-n", { title: s.title }, s.automation ? icon("calendar", "rs-ic") : null, h("span", null, s.title)),
            h("div.rs-m", null, h("span.rs-sub", null, s.automation ? "Automation" : `${HZ[s.harness]} · ${agentName(s)}`), problem ? icon("warning", "st-warn") : null, h("span", null, s.time))));
      })];
    }), !shown.length ? h("div.rs-empty.muted", null, "No sessions match.") : null);
  }

  function toolStep([ic, msg, file, added, removed]) {
    if (ic === "edit") return h("vsc-chat-tool-call", { edit: true, icon: "pencil", file, added, removed });
    return h("vsc-chat-tool-call", { icon: ic, file: file || null, html: msg });
  }
  function renderStrip(t) {
    const el = strips[t.id]; if (!el) return;
    const pins = openPins(t);
    el.replaceChildren(
      h("button.rc-chip" + (state.inspecting && t.id === state.turn ? ".on" : ""), { type: "button", onclick: (e) => { e.stopPropagation(); selectTurn(t.id); } }, icon("checklist"), "Receipt"),
      ...pins.map((p) => h("button.rc-chip.warn", { type: "button", onclick: (e) => { e.stopPropagation(); selectTurn(t.id); } }, icon("warning"), PINS[p].label)));
  }
  function transcript(s) {
    strips = {};
    const view = h("vsc-chat-view", null, s.turns.map((t, i) => {
      const resp = h("vsc-chat-response", { summary: t.summary, added: t.added || null, removed: t.removed || null },
        h("vsc-chat-tool-chain", { slot: "steps" }, t.steps.map(toolStep)), h("vsc-chat-markdown", { html: t.md }));
      const strip = h("div.rc-strip"); strips[t.id] = strip;
      const teach = h("button.sb.rc-teach", { type: "button", title: "Teach the agent from this reply", onclick: (e) => { e.stopPropagation(); startDraft(t.id); } }, icon("sparkle"), "Teach…");
      return h("div.rc-turn" + (state.inspecting && t.id === state.turn ? ".selected" : ""), { "data-turn": t.id, tabindex: "0", "aria-label": `Turn ${i + 1}`,
        onclick: (e) => { if (!e.target.closest("a, .rc-teach, .rc-chip")) selectTurn(t.id); },
        onkeydown: (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); selectTurn(t.id); } } },
        t.auto ? h("div.rc-auto", null, icon("calendar"), `Started by “${get(s.automation).name}”`) : null,
        h("vsc-chat-request", { timestamp: t.time }, t.req.map((n) => (n instanceof Node ? n.cloneNode(true) : n))),
        h("div.rc-resp", null, resp, teach, strip));
    }));
    s.turns.forEach(renderStrip);
    return view;
  }
  function renderMain() {
    const s = session();
    mainEl.replaceChildren(
      h("div.rm-head", null,
        h("button.ib", { type: "button", title: state.listCollapsed ? "Show Sessions" : "Hide Sessions", "aria-label": state.listCollapsed ? "Show sessions" : "Hide sessions", "aria-expanded": String(!state.listCollapsed),
          onclick: () => { state.listCollapsed = !state.listCollapsed; listEl.classList.toggle("collapsed", state.listCollapsed); renderMain(); } }, icon(state.listCollapsed ? "layout-sidebar-left-off" : "layout-sidebar-left")),
        h("div.rm-t", null, h("h2", null, s.title),
          h("div.rm-m", null, h("span", null, icon(HZ_ICON[s.harness]), HZ[s.harness]), h("span", null, icon("agent"), agentName(s)), h("span", null, icon(s.automation ? "calendar" : "git-branch"), s.where))),
        h("button.sb", { type: "button", onclick: () => toast(`Opened “${s.title}” in the Agents window`, "go-to-file") }, "Open Session")),
      h("div.rm-scroll", null, transcript(s)));
  }
  function setInspecting(on) {
    state.inspecting = on;
    inspEl.classList.toggle("closed", !on);
    mainEl.classList.toggle("inspecting", on);
    mainEl.querySelectorAll(".rc-turn").forEach((el) => el.classList.toggle("selected", on && el.dataset.turn === state.turn));
    session().turns.forEach(renderStrip);
  }
  function selectTurn(id) {
    state.turn = id;
    setInspecting(true);
    renderInspector();
    inspEl.scrollTop = 0;
  }
  function openSession(id) {
    state.session = id; state.turn = session().turns[0].id;
    listEl.replaceChildren(sessionList());
    renderMain(); renderInspector(); setInspecting(state.inspecting);
  }

  /* ── Receipt inspector ──────────────────────────────────────── */
  const EV = { inferred: ["Inferred", "question", "Inferred from the reply text — not recorded"], unknown: ["Unknown", "circle-large-outline", "Not recorded for this turn"], effect: ["Expected effect", "arrow-right", "What should happen on later requests — not observed yet"] };
  const ev = (k, label) => h("span.ev.ev-" + k, { title: EV[k][2] }, icon(EV[k][1]), label || EV[k][0]);

  function row(it, reason, opts = {}) {
    const name = it ? it.name : opts.name;
    const r = h("div.ri-row" + (opts.cls || ""), it ? { tabindex: "0", role: "button" } : null,
      icon(opts.icon || (it ? C.TYPES[it.type].icon : "file"), "ri-ic"),
      h("span.ri-n", null, name), reason != null ? h("span.ri-r", null, reason) : null,
      it && it.src !== "repo" ? srcGlyph(it, { iconOnly: true }) : null);
    if (it) {
      r.addEventListener("click", (e) => { e.stopPropagation(); inspect(it, r, opts.run); });
      r.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(it, r, opts.run); } });
    }
    return r;
  }
  // A disclosure section; `open` is the default, the user's choice persists across turns.
  function sec(key, title, summary, body, open) {
    const isOpen = state.open.has(key) ? true : state.open.has("-" + key) ? false : open;
    const toggle = () => { state.open.delete(key); state.open.delete("-" + key); state.open.add(isOpen ? "-" + key : key); renderInspector(); };
    return h("section.ri-sec", { "data-sec": key },
      h("button.ri-sh", { type: "button", "aria-expanded": String(isOpen), onclick: toggle }, icon(isOpen ? "chevron-down" : "chevron-right"), h("span.ri-st", null, title), !isOpen && summary ? h("span.ri-sum", null, summary) : null),
      isOpen ? h("div.ri-body", null, body) : null);
  }
  function pinCard(p) {
    const P = PINS[p], fixed = P.fixed();
    return h("div.ri-pin" + (fixed ? ".fixed" : ""), null,
      h("div.ri-pin-h", null, icon("warning", "st-warn"), h("b", null, P.title)),
      h("div.ri-pin-l", null, h("span.k", null, "Observed"), P.ev === "inferred" ? ev("inferred", "Inferred from the reply") : null),
      h("div.ri-pin-b", null, P.observed()),
      h("div.ri-pin-l", null, h("span.k", null, "Now")),
      h("div.ri-pin-b", null, fixed ? [h("b", null, "Configured · not retested. "), P.fixedText()] : P.now()),
      fixed ? null : h("div.ri-pin-a", null, P.actions(), h("button.sb", { type: "button", onclick: (e) => inspect(get(P.item), e.currentTarget) }, "Details")));
  }
  function instrReason(why) {
    if (why === "always") return "Always";
    if (why === "ref") return "Referenced by AGENTS.md";
    if (why === "every") return "Every request";
    if (why === "read") return "Read by the agent";
    return why;
  }
  function offeredPopover(anchor, list) {
    const input = h("input.tf", { placeholder: "Search descriptions offered", "aria-label": "Search descriptions offered", style: { width: "100%" } });
    const ul = h("div.off-list");
    const draw = () => {
      const q = input.value.toLowerCase();
      ul.replaceChildren(...list.filter(([, n]) => !q || n.includes(q)).map(([id, n, type]) => h("button.off-row", { type: "button", onclick: (e) => inspect(get(id), e.currentTarget) }, icon(C.TYPES[type].icon), n)));
    };
    input.addEventListener("input", draw); draw();
    popover(anchor, h("div", null, input, ul), { width: 300 });
    setTimeout(() => input.focus(), 0);
  }

  function renderInspector() {
    const { s, t } = TURNS[state.turn];
    const idx = s.turns.indexOf(t) + 1;
    const draft = state.drafts[t.id];
    const toolGroups = new Map();
    for (const [p, name, n, fail] of t.tools || []) { const it = get(p); const k = it.src === "builtin" ? "builtin" : p; if (!toolGroups.has(k)) toolGroups.set(k, { it, calls: [] }); toolGroups.get(k).calls.push({ name, n, fail }); }
    const calls = (t.tools || []).reduce((n, x) => n + x[2], 0);
    const loaded = t.loaded || [];

    inspEl.replaceChildren(h("div.ri", null,
      h("div.ri-head", null, h("span.ri-title", null, `Turn ${idx} of ${s.turns.length}`), h("span.muted", null, t.time), h("span.grow"),
        h("button.ib", { type: "button", title: "Close Receipt", "aria-label": "Close receipt", onclick: () => setInspecting(false) }, icon("close"))),
      draft ? draftCard(draft) : null,
      h("div.ri-default", null, "Recorded at request time unless marked."),
      (t.pins || []).map(pinCard),

      sec("attached", "Attached instructions", t.instr ? `${t.instr.length} files` : "Unknown",
        t.instr ? t.instr.map(([id, why]) => row(get(id), instrReason(why)))
          : h("div.ri-note", null, ev("unknown"), h("span", null, `${HZ[s.harness]} didn't report which instruction files it loaded for this turn.`)), false),

      t.tools && t.tools.length ? sec("tools", "Tools called", `${calls} calls`, [...toolGroups.entries()].map(([k, g]) =>
        h("div.ri-tg", null,
          k === "builtin" ? h("div.ri-tg-h", null, icon("vscode"), h("span", null, "Built-in"))
            : h("div.ri-tg-h.click", { role: "button", tabindex: "0", onclick: (e) => inspect(g.it, e.currentTarget) }, icon(C.TYPES[g.it.type].icon), h("span", null, g.it.name)),
          g.calls.map((x) => h("div.ri-tool" + (x.fail ? ".fail" : ""), null, code(x.name), h("span.muted", null, "×" + x.n), x.fail ? h("span.st-error", null, "failed") : null)))), true) : null,

      t.hooks && t.hooks.length ? sec("hooks", "Hooks that ran", null, t.hooks.map(([id, event, n, dur, exit]) => row(get(id), event, { run: `${n} ${n === 1 ? "run" : "runs"} · ${dur} · exit ${exit}` })), true) : null,

      sec("skills", "Skills", loaded.length ? `${loaded.length} loaded` : "None loaded", [
        loaded.map(([id, how]) => row(get(id), how === "typed" ? "Invoked with /" + get(id).name : how === "automation" ? "From the automation's prompt" : "Loaded")),
        h("div.ri-offered", null, t.offered
          ? [h("button.link", { type: "button", onclick: (e) => offeredPopover(e.currentTarget, t.offered) }, `${t.offered.length} descriptions offered`), loaded.length ? h("span.muted", null, " · only the ones above were loaded") : null]
          : [ev("unknown"), h("span.muted", null, " Descriptions offered weren't recorded.")])], loaded.length > 0),

      t.sub && t.sub.length ? sec("sub", "Subagents", null, t.sub.map(([id, by]) => row(get(id), `Delegated by ${by}`)), true) : null,

      h("div.ri-foot", null, icon("info"), h("span", null, "Attached doesn't mean it caused the answer."))));
  }

  /* ── Teach / Add drafts ─────────────────────────────────────── */
  const DEST = {
    copilot: { guidance: (n) => [`.github/instructions/${n}.instructions.md`, `~/.copilot/instructions/${n}.instructions.md`], command: (n) => [`.github/skills/${n}/SKILL.md`, `~/.copilot/skills/${n}/SKILL.md`],
      agent: (n) => [`.github/agents/${n}.agent.md`, `~/.copilot/agents/${n}.agent.md`], hook: (n) => [`.github/hooks/${n}.json`, `~/.copilot/hooks/${n}.json`] },
    claude: { guidance: (n) => [`.claude/rules/${n}.md`, `~/.claude/rules/${n}.md`], command: (n) => [`.claude/skills/${n}/SKILL.md`, `~/.claude/skills/${n}/SKILL.md`],
      agent: (n) => [`.claude/agents/${n}.md`, `~/.claude/agents/${n}.md`], hook: () => [".claude/settings.json", "~/.claude/settings.json"] },
    codex: { guidance: () => ["AGENTS.md", "~/.codex/AGENTS.md"], command: (n) => [`.agents/skills/${n}/SKILL.md`, `~/.codex/skills/${n}/SKILL.md`], agent: null, hook: null },
  };
  // A seed only pre-fills "What should change?"; everything else is derived from whatever text the user ends up with.
  const SEEDS = {
    focus: { name: "focus-rings", glob: "**/*.css", text: "Never use outline: none without a :focus-visible replacement" },
    telemetry: { name: "telemetry-answers", edit: "i-kusto", text: "Always show the KQL query and the time range next to every number" },
    triage: { name: "issue-labels", text: "Never apply labels — only draft them" },
    perf: { name: "perf-baseline", text: "Always compare against the previous Insiders build, not Stable" },
    agenthost: { name: "agent-host-paths", glob: "src/vs/platform/agentHost/**", text: "Never send client file paths to the agent host; send contents only" },
    hover: { name: "list-hovers", glob: "src/vs/workbench/contrib/chat/browser/aiCustomization/**", text: "Always use getDelayedHoverDelegate() for hovers in lists" },
    review: { name: "transport-restart", glob: "src/vs/platform/agentHost/**", text: "Always keep the old transport until the new one is ready when reviewing restart paths" },
    standup: { name: "standup-privacy", text: "Never include meetings marked private" },
  };
  const TYPES_TEACH = [["guidance", "Guidance"], ["command", "/command"], ["agent", "Agent"]];
  const TYPES_ADD = [["guidance", "Instruction"], ["command", "Skill"], ["agent", "Agent"], ["hook", "Hook"]];
  const KIND_NOUN = { guidance: "instruction", command: "skill", agent: "agent", hook: "hook" };
  const STOP = new Set("a an the and or of to in on for with without never always use using only when every next not do don't be is are it its this that from into after before each run".split(" "));
  const nameFrom = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w && !STOP.has(w)).slice(0, 3).join("-") || "untitled";

  function ctxFor(turnId) {
    const { s, t } = TURNS[turnId];
    const tools = [...new Set((t.tools || []).filter((x) => !x[3]).map(([p]) => { const it = get(p); return it.src === "builtin" ? it.toolId : it.name.toLowerCase().replace(/\s+/g, "-") + "/*"; }))];
    return { key: turnId, harness: s.harness, attach: t.attach || [], read: (t.instr || []).filter(([, why]) => why === "read").map(([id]) => id), agent: s.agent, tools, seed: SEEDS[s.id] || { text: "" } };
  }
  function globFromText(text) {
    if (/\bcss\b/i.test(text)) return "**/*.css";
    if (/typescript|\bts\b|\bany\b/i.test(text)) return "**/*.ts";
    if (/\btests?\b/i.test(text)) return "{src/vs/**/test/**,src/vs/**/*.test.ts}";
    return null;
  }
  const json = (o) => JSON.stringify(o, null, 2);

  // Everything about a draft is derived from its kind, text, scope and the session's harness.
  function plan(d) {
    const { ctx, type, dest } = d;
    const hz = ctx.harness, text = (d.text || "").trim().replace(/\.$/, ""), sd = ctx.seed;
    const pick = (pair) => pair[dest === "repo" ? 0 : 1];
    const name = sd.name && text === sd.text && type === "guidance" ? sd.name : nameFrom(text);
    if (type === "guidance") {
      if (sd.edit && hz === "copilot" && dest === "repo") {
        const it = get(sd.edit);
        return { title: `Edit · ${base(it.path)}`, path: it.path, body: `  ## Reporting results\n  - Round to 3 significant figures.\n+ - ${text}.`, edit: it,
          effect: ctx.read.includes(sd.edit) ? `Offered as part of ${base(it.path)}, which the agent read in this turn.` : `Offered as part of ${base(it.path)}; read when the agent decides it's relevant.` };
      }
      const glob = globFromText(text) || sd.glob || null;
      const file = glob && ctx.attach.find((f) => C.matches(glob, f));
      const path = pick(DEST[hz].guidance(name));
      if (hz === "codex") return { title: `Edit · ${path}`, path, body: `  ## Conventions\n+ - ${text}.`, effect: "Added to every Codex request — AGENTS.md has no file scoping.", make: { type: "instruction", mode: "standing", name: path, desc: text } };
      const body = hz === "claude" ? (glob ? `---\npaths:\n  - "${glob}"\n---\n\n${text}.` : `${text}.`)
        : glob ? `---\napplyTo: '${glob}'\n---\n\n${text}.` : `---\ndescription: ${text}\n---\n\n${text}.`;
      const effect = hz === "claude" ? (glob ? `Loaded when Claude Code reads a matching file${file ? `, like ${base(file)}` : ""}.` : "Loaded into every Claude Code session.")
        : glob ? `Attached when a request includes ${file ? `a matching file, like ${base(file)}` : C.describeGlob(glob)}.` : "Its description is offered on every request; the agent reads it when relevant.";
      return { title: `New instruction · ${name}`, path, body, effect, make: { type: "instruction", mode: glob ? "glob" : hz === "claude" ? "standing" : "listed", applyTo: glob, name, desc: text } };
    }
    if (type === "command") {
      const manual = d.invoke !== "auto";
      const path = pick(DEST[hz].command(name));
      const fm = hz === "copilot" ? `user-invocable: true\ndisable-model-invocation: ${manual}` : `disable-model-invocation: ${manual}`;
      return { title: `New skill · /${name}`, path, body: `---\nname: ${name}\ndescription: ${text}.\n${fm}\n---\n\n${text}.`, options: true,
        effect: manual ? `Available as /${name}; its description isn't offered to the agent.` : `Available as /${name}; its description is offered on every request.`,
        make: { type: "skill", name, desc: text, modelInvocable: !manual, userInvocable: true } };
    }
    if (type === "agent") {
      if (!DEST[hz].agent) return { title: "Agents aren't supported", unsupported: `${HZ[hz]} doesn't read custom agents.` };
      const tools = ctx.key === "add" || !ctx.tools.length ? ["read", "search", "edit"] : ctx.tools;
      const toolLine = hz === "claude" ? `tools: ${tools.map((x) => ({ read: "Read", search: "Grep", edit: "Edit", execute: "Bash" }[x] || x)).join(", ")}` : `tools: [${tools.join(", ")}]`;
      return { title: `New agent · ${name}`, path: pick(DEST[hz].agent(name)), body: `---\nname: ${name}\ndescription: ${text}.\n${toolLine}\n---\n\n${text}.`,
        effect: hz === "claude" ? "Claude Code can delegate to it as a subagent." : "In the agent picker; other agents can delegate to it.",
        note: ctx.key !== "add" && ctx.tools.length ? "Tools are the ones this turn called." : null,
        make: { type: "agent", name, desc: text, tools } };
    }
    if (!DEST[hz].hook) return { title: "Hooks aren't supported", unsupported: `${HZ[hz]} doesn't run hooks.` };
    // Hooks receive the tool call as JSON on stdin; the command reads the edited file's path from it.
    const tool = /stylelint|\bcss\b/i.test(text) ? "npx stylelint --fix" : /lint/i.test(text) ? "npx eslint --fix" : null;
    const command = tool ? (hz === "claude" ? `jq -r '.tool_input.file_path' | xargs ${tool}` : `jq -r '.toolArgs | fromjson | .path' | xargs ${tool}`)
      : /test/i.test(text) ? "./scripts/test.sh --run changed" : "true";
    const path = pick(DEST[hz].hook(name));
    const body = hz === "claude"
      ? json({ hooks: { PostToolUse: [{ matcher: "Edit|Write", hooks: [{ type: "command", command }] }] } })
      : json({ version: 1, hooks: { postToolUse: [{ type: "command", bash: command, timeoutSec: 60 }] } });
    return { title: `New hook · ${name}`, path, body, effect: `Runs after each file edit in ${HZ[hz]} sessions.`, note: "Hooks run shell commands without asking.",
      make: { type: "hook", name, event: hz === "claude" ? "PostToolUse" : "postToolUse", eventLabel: "the agent edits a file", command, desc: text } };
  }

  function newDraft(ctx, type) {
    return { ctx, type, text: ctx.seed.text || "", dest: "repo", invoke: "manual", showFile: false, stage: "ask" };
  }
  function startDraft(turnId) {
    if (!state.drafts[turnId]) state.drafts[turnId] = newDraft(ctxFor(turnId), "guidance");
    if (state.turn !== turnId || !state.inspecting) selectTurn(turnId); else renderInspector();
    inspEl.scrollTop = 0;
    const ta = inspEl.querySelector(".rd textarea"); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }

  function draftCard(d) {
    const add = d.ctx.key === "add";
    const rerender = () => (add ? renderAddPanel() : renderInspector());
    const close = () => { delete state.drafts[d.ctx.key]; rerender(); };
    const seg = (cur, list, on, label) => h("div.seg", { role: "group", "aria-label": label }, list.map(([k, l]) => h("button", { type: "button", "aria-pressed": String(cur === k), onclick: () => on(k) }, l)));
    const toDraft = () => { if (!d.text.trim()) return; d.stage = "draft"; rerender(); };
    const head = (title) => h("div.rd-h", null, icon("sparkle"), title, h("span.grow"), h("button.ib", { type: "button", title: "Discard", "aria-label": "Discard", onclick: close }, icon("close")));
    const ta = h("textarea.tf.rd-in", { rows: 3, "aria-label": "What should change?", placeholder: add ? "e.g. Never use any in TypeScript" : "",
      onkeydown: (e) => { if (e.key === "Enter" && !e.shiftKey && d.stage === "ask") { e.preventDefault(); toDraft(); } } });
    ta.value = d.text;

    if (d.stage === "ask") {
      const btn = h("button.sb.primary", { type: "button", disabled: !d.text.trim() || null, onclick: toDraft }, "Draft");
      ta.addEventListener("input", () => { d.text = ta.value; btn.disabled = !d.text.trim(); });
      return h("div.rd", null, head(h("b", null, add ? `New ${KIND_NOUN[d.type]}` : "Teach")), h("label.rd-l", null, "What should change?"), ta, h("div.rd-row", null, h("span.grow"), btn));
    }

    const p = plan(d);
    const titleEl = h("b", null, p.title), effectEl = h("span", null, p.effect || ""), pre = h("pre", null, p.body || ""), pathEl = h("span.mono", null, p.path || "");
    const addBtn = h("button.sb.primary", { type: "button", disabled: !d.text.trim() || !!p.unsupported || null, onclick: () => acceptDraft(d) }, "Add");
    ta.addEventListener("input", () => {
      d.text = ta.value;
      const np = plan(d); titleEl.textContent = np.title; effectEl.textContent = np.effect || ""; pre.textContent = np.body || ""; pathEl.textContent = np.path || "";
      addBtn.disabled = !d.text.trim() || !!np.unsupported;
    });
    return h("div.rd", null,
      head(titleEl),
      h("label.rd-l", null, "What should change?"), ta,
      seg(d.type, add ? TYPES_ADD : TYPES_TEACH, (k) => { d.type = k; rerender(); }, "Kind"),
      p.unsupported ? h("div.rd-note", null, icon("warning", "st-warn"), p.unsupported) : [
        p.options ? seg(d.invoke, [["manual", "Only when I type it"], ["auto", "Agent can load it"]], (k) => { d.invoke = k; rerender(); }, "Invocation") : null,
        p.effect ? h("div.rd-effect", null, ev("effect"), effectEl) : null,
        p.note ? h("div.rd-note", null, icon("info"), p.note) : null,
        h("div.rd-row", null,
          seg(d.dest, [["repo", "This workspace"], ["user", "Just me"]], (k) => { d.dest = k; rerender(); }, "Scope"),
          h("span.grow"),
          h("button.link", { type: "button", "aria-expanded": String(d.showFile), onclick: () => { d.showFile = !d.showFile; rerender(); } }, d.showFile ? "Hide file" : "Show file"),
          addBtn),
        d.showFile ? h("div.rd-file", null, h("div.fh", null, pathEl), pre) : null]);
  }
  function acceptDraft(d) {
    const p = plan(d);
    if (p.edit) toast(`Added a line to ${p.edit.path}`, "pass");
    else {
      const it = Object.assign({ id: "new-" + p.make.type + "-" + (state.created.length + 1), src: d.dest === "repo" ? "repo" : "user", path: p.path, enabled: true,
        harness: { copilot: d.ctx.harness === "copilot" ? "yes" : "no", claude: d.ctx.harness === "claude" ? "yes" : "no", codex: d.ctx.harness === "codex" ? "yes" : "no" } }, p.make);
      state.created.push(it); C.byId[it.id] = it;
      state.flash = it.id;
      toast(`Created ${p.path}`, "pass");
    }
    delete state.drafts[d.ctx.key];
    refresh();
  }

  /* ── Customizations: the complete inventory ─────────────────── */
  const TYPE_ORDER = Object.keys(C.TYPES);
  function statusOf(it) {
    if (state.removed.has(it.id)) return ["Removed", "trash", "muted", 0];
    if (it.locked === "blocked") return ["Not on microsoft's allowlist", "circle-slash", "st-blocked", 3];
    if (it.duplicateOf) return ["Skipped — duplicate name", "copy", "muted", 1];
    if (it.enabled === false) return ["Disabled", "circle-slash", "muted", 1];
    if (it.status === "warn") return [it.statusText || "Needs attention", "warning", "st-warn", 3];
    if (it.status === "update") return [it.statusText, "arrow-circle-up", "st-update", 2];
    if (it.type === "prompt" && !C.supported(it, "copilot")) return ["Not read by Copilot CLI — convert to a skill", "warning", "st-warn", 3];
    if (it.harness && !C.supported(it, "copilot")) return ["Not read by Copilot CLI", "circle-slash", "muted", 1];
    if (state.created.includes(it)) return ["New", "sparkle", "st-new", 1];
    return null;
  }
  const attention = (it) => { const s = statusOf(it); return s && s[3] >= 2; };
  function customizationsView() {
    const q = state.query.toLowerCase();
    const f = state.filter;
    let rows = C.items.concat(state.created);
    if (q) rows = rows.filter((it) => (it.name + " " + (it.desc || "") + " " + (it.path || "")).toLowerCase().includes(q));
    if (f === "attention") rows = rows.filter(attention);
    if (f === "unused") rows = rows.filter((it) => !OBS.has(it.id) && !state.created.includes(it));
    if (f === "plugins") rows = rows.filter((it) => it.via || it.type === "plugin");
    const { key, dir } = state.sort;
    const srcName = (it) => (it.via ? get(it.via).name : it.type === "extension" ? it.publisher : C.SOURCES[it.src].short);
    const val = (it) => key === "name" ? it.name.toLowerCase() : key === "type" ? TYPE_ORDER.indexOf(it.type) : key === "src" ? srcName(it).toLowerCase() : -((statusOf(it) || [0, 0, 0, 0])[3]);
    rows.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * dir || a.name.localeCompare(b.name); });
    const chip = (k, label) => h("button.rc-chip" + (f === k ? ".on" : ""), { type: "button", "aria-pressed": String(f === k), onclick: () => { state.filter = f === k ? null : k; refresh(); } }, label);
    const addBtn = h("button.sb.primary", { type: "button", "aria-haspopup": "menu", onclick: () => addMenu(addBtn) }, icon("add"), "Add", icon("chevron-down"));
    const COLS = [["name", "Name"], ["type", "Type"], ["src", "Source"], ["status", "Status"]];
    return h("div.cv", null,
      h("div.cv-main", null,
        h("div.lg-bar", null, chip("attention", "Needs attention"), chip("unused", "No use recorded in 7 days"), chip("plugins", "From plugins"), h("span.grow"), addBtn),
        h("div.lg-scroll", null, h("table.lg-t", null,
          h("thead", null, h("tr", null, COLS.map(([k, l]) => h("th", { "aria-sort": key === k ? (dir > 0 ? "ascending" : "descending") : "none" },
            h("button", { type: "button", onclick: () => { state.sort = { key: k, dir: key === k ? -dir : 1 }; refresh(); } }, l, key === k ? icon(dir > 0 ? "arrow-up" : "arrow-down") : null))), h("th.sw", null, h("span.sr", null, "Enabled")))),
          h("tbody", null, rows.map((it) => {
            const st = statusOf(it);
            const fix = it.state && ["signed-out", "env"].includes(it.state.auth) ? h("button.sb", { type: "button", onclick: (e) => { e.stopPropagation(); fixItem(it, e.currentTarget); } }, it.state.auth === "env" ? "Set Variable…" : "Sign In")
              : it.type === "prompt" && !C.supported(it, "copilot") ? h("button.sb", { type: "button", onclick: (e) => { e.stopPropagation(); fixItem(it, e.currentTarget); } }, "Convert")
              : it.status === "update" ? h("button.sb", { type: "button", onclick: (e) => { e.stopPropagation(); fixItem(it, e.currentTarget); } }, "Update") : null;
            return h("tr" + (state.flash === it.id ? ".flash" : "") + (state.removed.has(it.id) || it.enabled === false ? ".off" : ""), { onclick: (e) => { if (!e.target.closest("button")) inspect(it, e.currentTarget.firstChild); } },
              h("td", null, h("span.lg-n", null, icon(C.TYPES[it.type].icon), it.name)),
              h("td.muted", null, C.TYPES[it.type].label),
              h("td", null, it.src === "repo" ? h("span.muted", null, "This repo") : srcGlyph(it)),
              h("td", null, st ? h("span.lg-st", null, icon(st[1], st[2]), h("span" + (st[2] === "muted" ? ".muted" : ""), null, st[0]), fix) : null),
              h("td.sw", null, lockOrSwitch(it)));
          })),
          !rows.length ? h("tbody", null, h("tr", null, h("td.muted", { colspan: "5" }, "Nothing matches."))) : null))),
      state.drafts.add ? h("aside.cv-panel", { "aria-label": "New customization" }) : null);
  }
  function renderAddPanel() {
    const panel = bodyEl.querySelector(".cv-panel");
    if (!panel || !state.drafts.add) return refresh();
    panel.replaceChildren(h("div.ri", null, draftCard(state.drafts.add)));
  }
  function addMenu(anchor) {
    const items = [
      { id: "guidance", label: "Instruction…", icon: "book" }, { id: "command", label: "Skill…", icon: "lightbulb" }, { id: "agent", label: "Agent…", icon: "agent" }, { id: "hook", label: "Hook…", icon: "zap" },
      { type: "separator" },
      { id: "plugin", label: "Install Plugin…", icon: "plug" }, { id: "mcp", label: "Add MCP Server…", icon: "server" }, { id: "connector", label: "Connect a Service…", icon: "link" },
    ];
    const pick = (id) => {
      if (["plugin", "mcp", "connector"].includes(id)) return toast({ plugin: "Opens plugins from microsoft/agent-plugins and github/awesome-copilot", mcp: "Opens the MCP server gallery (microsoft's allowlist applies)", connector: "Opens Copilot Connectors: Jira, Linear, Notion, Sentry…" }[id], { plugin: "plug", mcp: "server", connector: "link" }[id]);
      state.drafts.add = newDraft({ key: "add", harness: "copilot", attach: [], agent: "default", seed: {}, read: [], tools: [] }, id);
      refresh();
      const ta = bodyEl.querySelector(".cv-panel textarea"); if (ta) ta.focus();
    };
    const ds = DS();
    if (ds && ds.actionList) return ds.actionList.open(anchor, { items, label: "Add", role: "menu", itemRole: "menuitem", minWidth: 200, onSelect: (item) => { pick(item.id); } });
    popover(anchor, h("div.menu", null, items.filter((x) => x.id).map((x) => h("button.menu-row", { onclick: () => { closePop(); pick(x.id); } }, icon(x.icon), x.label))), { width: 220 });
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function refresh() {
    if (state.view === "sessions") {
      const st = listEl.scrollTop; listEl.replaceChildren(sessionList()); listEl.scrollTop = st;
      session().turns.forEach(renderStrip);
      const sc = inspEl.scrollTop; renderInspector(); inspEl.scrollTop = sc;
    } else {
      const sc = bodyEl.querySelector(".lg-scroll"); const st = sc ? sc.scrollTop : 0;
      renderView();
      const sc2 = bodyEl.querySelector(".lg-scroll"); if (sc2) sc2.scrollTop = st;
      state.flash = null;
    }
  }
  function renderView() {
    closePop();
    segEl.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === state.view)));
    searchEl.placeholder = state.view === "sessions" ? "Search sessions" : "Search customizations";
    if (state.view === "sessions") {
      listEl = h("aside.rs-wrap" + (state.listCollapsed ? ".collapsed" : ""), { "aria-label": "Recent sessions" }, sessionList());
      mainEl = h("main.rm", { "aria-label": "Transcript" });
      inspEl = h("aside.ri-wrap", { "aria-label": "Receipt" });
      bodyEl.replaceChildren(listEl, mainEl, inspEl);
      renderMain(); renderInspector(); setInspecting(state.inspecting);
    } else {
      bodyEl.replaceChildren(customizationsView());
      if (state.drafts.add) renderAddPanel();
    }
  }

  function build(r) {
    segEl = h("div.seg", { role: "group", "aria-label": "View" }, [["sessions", "Sessions"], ["customizations", "Customizations"]].map(([v, l]) =>
      h("button", { type: "button", "data-v": v, "aria-pressed": String(state.view === v), onclick: () => { state.view = v; state.query = ""; searchEl.value = ""; renderView(); } }, l)));
    searchEl = h("input.tf", { "aria-label": "Search", oninput: (e) => { state.query = e.target.value; state.view === "sessions" ? listEl.replaceChildren(sessionList()) : refresh(); } });
    bodyEl = h("div.rc-body");
    r.append(h("div.rc", null, h("header.rc-head", null, segEl, h("span.grow"), h("div.rc-search", null, icon("search"), searchEl)), bodyEl));
    renderView();
  }

  window.CZUI.mount({ build });
})();
