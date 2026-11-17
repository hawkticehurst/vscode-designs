/* Concept B — Resolve. Pick a context (file, agent, where it runs) and see what's eligible, what isn't, and why, with
   the fix in place. Eligibility is computed from configuration; it never predicts what the model will choose.
   "Compare last request" shows a frozen record of that request, not a recomputation. */
(function () {
  const { h, icon, srcGlyph, switchEl, popover, closePop, toast } = window.CZUI;
  const C = window.CZ;
  const P = { file: C.FILES[1], agent: "default", harness: "copilot" };
  const UI = { sel: "context:i-design-tokens", compare: false, q: "", unavailable: false, draft: null, checks: false, more: {}, type: "all", removed: {} };
  const AGENTS = { default: { name: "Default", tools: null }, "a-data": C.byId["a-data"], "a-reviewer": C.byId["a-reviewer"] };
  const HL = () => C.HARNESSES.find((x) => x.id === P.harness).label;
  const base = (f) => (f ? f.split("/").pop() : "no file");

  // Frozen record of the last request (from its debug log). Never recomputed.
  const LAST = { at: "12:41", session: "Fix focus ring in customization cards", file: C.FILES[0], agent: "default", harness: "copilot",
    attached: ["agents-md", "copilot-instructions", "ms-security", "terse-commits", "i-coding-guidelines", "i-source-code-organization", "i-best-practices", "i-design-philosophy", "i-committing", "i-ai-customization"],
    loaded: ["s-chat-customizations-editor", "s-accessibility"], called: ["t-read", "t-search", "t-edit", "m-github"], ran: ["h-semgrep"] };

  const SAMPLE = [...C.FILES, "src/vs/workbench/contrib/chat/browser/aiCustomization/media/customizationCardList.css", "src/vs/base/browser/ui/button/button.css", "src/vs/editor/contrib/hover/browser/hover.css",
    "src/vs/sessions/browser/media/workbench.css", "src/vs/sessions/contrib/automations/browser/automationDialog.css", "src/vs/base/test/common/lifecycle.test.ts", "src/vs/workbench/contrib/terminal/browser/terminalTool.ts",
    "extensions/theme-defaults/themes/2026-dark.json", "build/next/esbuild.ts", "package.json"];

  /* ── Resolve ─────────────────────────────────────────────────── */
  const read = (it) => { const v = (it.harness || {})[P.harness] || "yes"; return v === "yes" || (v === "partial" && it.type !== "skill"); };
  const glob = (it) => (UI.draft && UI.draft.id === it.id ? UI.draft.value : it.applyTo);
  const harnessWhy = (it) => (it.harness && it.harness.note) || `Not read by ${HL()}`;

  // States: in (applies) · avail (available on demand) · manual (only with /name) · lazy (callable, starts on use) · warn (blocked, fixable) · out (unavailable) · block (policy)
  function resolve() {
    const R = { context: [], skills: [], tools: [], agents: [], hooks: [] };
    for (const it of C.items.filter((i) => i.type === "instruction")) {
      let st, why = "";
      if (!read(it)) { st = "out"; why = harnessWhy(it); }
      else if (it.enabled === false) { st = "out"; why = "Turned off"; }
      else if (it.convertedTo && it.convertedTo[P.harness]) { st = "out"; why = `Converted · ${HL()} uses ${it.convertedTo[P.harness]}`; }
      else if (it.mode === "standing") { st = "in"; why = it.src === "org" ? "Every request · required by microsoft" : it.id === "copilot-instructions" ? "Every request · linked from AGENTS.md" : "Every request"; }
      else if (it.mode === "glob") { const g = glob(it); if (C.matches(g, P.file || "")) { st = "in"; why = "applyTo matches"; } else { st = "avail"; why = "applyTo doesn't match"; } }
      else st = "avail";
      R.context.push({ it, st, why });
    }
    for (const it of C.items.filter((i) => i.type === "skill" || i.type === "prompt")) {
      let st, why = "";
      if (it.convertedTo && it.convertedTo[P.harness]) { st = "out"; why = `Converted · ${HL()} uses ${it.convertedTo[P.harness]}`; }
      else if (it.type === "prompt" && !read(it)) { st = "out"; why = harnessWhy(it); }
      else if (it.type === "prompt") { st = "manual"; why = h("span", null, "Only with ", h("code", null, "/" + it.name)); }
      else if (it.duplicateOf) { st = "out"; why = `Same name as ${C.byId[it.duplicateOf].path}, which takes precedence`; }
      else if (!read(it)) { st = "out"; why = harnessWhy(it); }
      else if (it.enabled === false) { st = "out"; why = "Turned off"; }
      else if (!it.modelInvocable) { st = "manual"; why = h("span", null, "Only with ", h("code", null, "/" + it.name)); }
      else { st = "avail"; why = it.userInvocable ? "" : "Hidden from /"; }
      R.skills.push({ it, st, why });
    }
    const agent = AGENTS[P.agent];
    for (const src of C.items.filter((i) => ["toolset", "mcp", "connector", "extension"].includes(i.type))) {
      const steps = chain(src, agent);
      const fail = steps.find((s) => s.ok === false);
      const st = src.locked === "blocked" ? "block" : fail ? (fail.fix && fail.fix !== "Add to Tools" ? "warn" : "out") : steps.some((s) => s.ok === "lazy") ? "lazy" : "in";
      R.tools.push({ it: src, st, why: fail ? fail.t : st === "lazy" ? "Starts when first used" : agent.tools ? h("span", null, "In tools: ", h("code", null, refsFor(src, agent).join(", "))) : "", steps });
    }
    if (agent.tools) for (const r of agent.tools.filter((t) => t.startsWith("azure-mcp/"))) {
      R.tools.push({ it: { id: "x-azure", type: "mcp", name: "azure-mcp", src: "repo", desc: "Named in Data's tools: list. No installed MCP server or extension provides it." }, st: "warn", missing: r,
        why: h("span", null, h("code", null, r), " · nothing provides it"), steps: [{ ok: true, t: `Named in ${agent.name}'s tools`, d: agent.path }, { ok: false, t: "Nothing provides azure-mcp", d: "No installed MCP server or extension has that name", fix: true }] });
    }
    if (agent.handoffs) R.agents.push({ it: { id: "x-handoff", type: "agent", name: "Default agent", src: "builtin", desc: "Reviewer's handoff target." }, st: "in", why: "Handoff: “Fix these”" });
    R.agents.push({ it: C.byId["a-secrev"], st: "avail", why: "Subagent only" });
    for (const id of ["a-data", "a-reviewer"]) if (id !== P.agent) { const it = C.byId[id]; const ok = read(it) && it.enabled !== false; R.agents.push({ it, st: ok ? "avail" : "out", why: !read(it) ? harnessWhy(it) : it.enabled === false ? "Turned off" : "Can be picked, or used as a subagent" }); }
    for (const it of C.items.filter((i) => i.type === "hook")) {
      const ev = P.harness === "claude" ? { sessionStart: "SessionStart", agentStop: "Stop", postToolUse: "PostToolUse" }[it.event] : it.event;
      let st, why;
      if (P.harness === "codex" && it.src !== "plugin") { st = "out"; why = "Codex doesn't read .github/hooks"; }
      else if (P.harness === "codex") { st = "out"; why = "Not provided for Codex by this plugin"; }
      else if (!read(it)) { st = "out"; why = "Copilot hook format · Claude Code reads .claude/settings.json"; }
      else if (it.enabled === false) { st = "out"; why = h("span", null, "Turned off · ", h("code", null, "build.json.disabled")); }
      else { st = "in"; why = h("span", null, "Enabled for ", h("code", null, ev), it.matcher ? ` · tool “${it.matcher}”` : ""); }
      R.hooks.push({ it, st, why });
    }
    return R;
  }

  function refsFor(src, agent) {
    if (!agent.tools) return [];
    const key = { "t-execute": "execute", "t-read": "read", "t-search": "search", "t-todo": "todo", "t-vscode": "vscode", "t-edit": "edit", "t-web": "web", "e-kusto": "ms-vscode.kusto-client", "m-github": "github", "m-semgrep": "semgrep", "m-playwright": "playwright", "m-sprue": "sprue", "c-slack": "slack", "c-figma": "figma", "c-workiq": "workiq", "e-ghpr": "github.vscode-pull-request-github" }[src.id];
    return key ? agent.tools.filter((r) => r.split("/")[0] === key) : [];
  }
  function chain(src, agent) {
    const s = src.state || {};
    const steps = [{ ok: true, t: "Found", d: src.type === "toolset" ? "Built into VS Code" : src.type === "extension" ? `${src.extId} extension` : src.type === "connector" ? "Copilot connector" : src.via ? `${C.byId[src.via].name} plugin` : src.path || C.SOURCES[src.src].label }];
    if (src.type === "mcp" || src.type === "connector") {
      steps.push(src.locked === "blocked" ? { ok: false, t: "Not on microsoft's MCP allowlist", d: "Your organization only allows approved servers" } : { ok: true, t: src.locked === "required" ? "Required by microsoft" : "Allowed by microsoft" });
      steps.push(s.trusted === false ? { ok: false, t: "Not trusted", d: "Review its configuration before the agent can start it", fix: "Review and Trust…" } : { ok: true, t: "Trusted", d: src.src === "repo" ? "You trusted this workspace's mcp.json" : "Added by you, your organization or a plugin you installed" });
    }
    steps.push(src.enabled === false ? { ok: false, t: "Turned off", fix: "Turn On" } : { ok: true, t: "Turned on" });
    if (s.auth === "signed-out") steps.push({ ok: false, t: "Signed out", d: "The agent uses it with your account", fix: "Sign In" });
    else if (s.auth === "env") steps.push({ ok: false, t: "Needs SEMGREP_APP_TOKEN", d: "The server can't start without it", fix: "Set Variable…" });
    else if (s.auth === "signed-in") steps.push({ ok: true, t: "Signed in", d: src.account ? "as " + src.account : "" });
    if ((src.type === "mcp" || src.type === "connector") && !steps.some((x) => x.ok === false)) steps.push(s.running ? { ok: true, t: "Running" } : { ok: "lazy", t: "Starts when first used" });
    if (agent.tools) {
      const refs = refsFor(src, agent);
      steps.push(refs.length ? { ok: true, t: `In ${agent.name}'s tools`, d: refs.join(", ") } : { ok: false, t: `Not in ${agent.name}'s tools`, d: agent.path, fix: "Add to Tools" });
    }
    return steps;
  }

  /* ── List ────────────────────────────────────────────────────── */
  const ST = { in: ["pass-filled", "ic-in"], avail: ["circle-large-outline", "ic-list"], manual: ["terminal", "ic-list"], lazy: ["pass", "ic-in"], warn: ["warning", "ic-warn"], out: ["circle-slash", "ic-out"], block: ["circle-slash", "ic-block"] };
  const LABEL = { in: "Applies", avail: "Available on demand", manual: "Only with /", lazy: "Callable", warn: "Blocked", out: "Unavailable", block: "Blocked by microsoft" };
  const SECTIONS = [
    { id: "context", icon: "book", label: "Instructions", rec: "Attached", recSet: () => LAST.attached, collapseAvail: true },
    { id: "skills", icon: "lightbulb", label: "Skills and prompts", rec: "Loaded", recSet: () => LAST.loaded, limit: 12 },
    { id: "tools", icon: "tools", label: "Tools", rec: "Called", recSet: () => LAST.called },
    { id: "agents", icon: "agent", label: "Agents" },
    { id: "hooks", icon: "zap", label: "Hooks", rec: "Ran", recSet: () => LAST.ran },
  ];
  const order = { warn: 0, block: 1, in: 2, lazy: 3, manual: 4, avail: 5, out: 6 };
  let list, ins, prev = {};

  function rowEl(sec, r) {
    const k = sec.id + ":" + r.it.id;
    const [ic, cls] = ST[r.st];
    const el = h("div.row" + (r.st === "out" || r.st === "block" ? ".dim" : "") + (UI.sel === k ? ".sel" : ""), { tabindex: "0", role: "option", "aria-selected": String(UI.sel === k), "data-k": k, title: LABEL[r.st] },
      icon(ic, cls), h("span.nm", null, r.it.name), h("span.why", null, r.why),
      r.it.src !== "repo" ? srcGlyph(r.it) : h("span"),
      UI.compare ? recCell(sec, r) : null);
    el.addEventListener("click", () => select(k));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") select(k); });
    if (prev[k] && prev[k] !== r.st) el.classList.add("flash");
    return el;
  }
  function recCell(sec, r) {
    if (!sec.recSet) return h("span.rec", null, "Not recorded");
    const yes = sec.recSet().includes(r.it.id);
    return h("span.rec", null, yes ? icon("pass-filled", "ic-in") : null, yes ? sec.rec : "—");
  }

  function render() {
    const R = resolve();
    const q = UI.q.toLowerCase();
    const parts = [];
    if (UI.compare) {
      const diffs = [P.file !== LAST.file && "context file", P.agent !== LAST.agent && "agent", P.harness !== LAST.harness && "runs in"].filter(Boolean);
      parts.push(h("div.cmp-h", null, icon("history"), h("span", null, `Last request · ${LAST.at} · ${base(LAST.file)} · Default · Copilot CLI`),
        diffs.length ? h("span.diff", null, `· differs: ${diffs.join(", ")}`) : null));
    }
    if (UI.draft) parts.push(h("div.draft-h", null, icon("edit"), h("span.grow", null, "Previewing an unsaved applyTo change to ", h("b", null, C.byId[UI.draft.id].name)),
      h("button.sb", { onclick: () => { UI.draft = null; render(); } }, "Cancel"), h("button.sb.primary", { onclick: saveDraft }, "Save")));
    let any = false;
    for (const sec of SECTIONS) {
      if (UI.type !== "all" && UI.type !== sec.id) continue;
      let rows = R[sec.id].filter((r) => (!q || (r.it.name + " " + (r.it.desc || "")).toLowerCase().includes(q)) && (!UI.unavailable || ["out", "block", "warn"].includes(r.st)));
      if (!rows.length) continue;
      any = true;
      const ord = sec.id === "skills" ? { out: 0, warn: 0, avail: 1, manual: 2 } : order;
      rows.sort((a, b) => ord[a.st] - ord[b.st]);
      const limit = sec.limit && !UI.more[sec.id] && !q && !UI.unavailable ? sec.limit : 1e9;
      let shown = rows.slice(0, limit);
      if (sec.collapseAvail && !UI.more[sec.id] && !q && !UI.unavailable) shown = rows.filter((r) => r.st !== "avail");
      if (UI.sel && UI.sel.startsWith(sec.id + ":") && !shown.find((r) => sec.id + ":" + r.it.id === UI.sel)) { const s = rows.find((r) => sec.id + ":" + r.it.id === UI.sel); s && shown.push(s); }
      parts.push(h("div.sec-h", { id: "sec-" + sec.id }, icon(sec.icon), h("span", null, sec.label), UI.compare ? h("span.colh", null, "Last request") : h("span")));
      parts.push(...shown.map((r) => rowEl(sec, r)));
      if (rows.length > shown.length) parts.push(h("div.more-row", null, h("button.link", { onclick: () => { UI.more[sec.id] = true; render(); } }, sec.collapseAvail ? `Show ${rows.length - shown.length} available on demand` : `Show ${rows.length - shown.length} more`)));
    }
    if (!any) parts.push(h("div.empty", null, "Nothing matches."));
    const sc = list.scrollTop;
    list.classList.toggle("cmpon", UI.compare);
    list.replaceChildren(...parts);
    list.scrollTop = sc;
    prev = {}; for (const sec of SECTIONS) for (const r of R[sec.id]) prev[sec.id + ":" + r.it.id] = r.st;
    renderInspector(R);
  }

  /* ── Inspector ──────────────────────────────────────────────── */
  function verdict(sec, r) {
    const it = r.it;
    const fixes = [];
    const fail = (r.steps || []).find((s) => s.ok === false && s.fix);
    if (r.missing) { fixes.push(["Install Azure MCP", () => toast("Installing Azure MCP Server (ms-azuretools.vscode-azure-mcp-server)…", "cloud-download")]); fixes.push(["Remove from Data's Tools", () => editTools(AGENTS["a-data"], r.missing, false)]); }
    else if (fail && fail.fix === "Add to Tools") fixes.push([`Add to ${AGENTS[P.agent].name}'s Tools`, () => editTools(AGENTS[P.agent], toolRef(it), true)]);
    else if (fail && fail.fix !== "Turn On") fixes.push([fail.fix, (e) => fix(it, fail.fix, e && e.currentTarget)]);
    if (r.st === "out" && (it.harness || {})[P.harness] === "convert" && !(it.convertedTo && it.convertedTo[P.harness])) fixes.push([`Convert for ${HL()}`, () => fix(it, "Convert")]);
    const outByDesign = r.st === "out" && fail && fail.fix === "Add to Tools";
    const head = outByDesign ? `Not in ${AGENTS[P.agent].name}'s tools` : { in: sec === "hooks" ? "Enabled for this event" : sec === "context" ? "Attached to the request" : sec === "agents" ? "Applies" : "Callable", avail: "Available on demand", manual: "Only when you ask", lazy: "Callable", warn: "Blocked", out: "Unavailable here", block: "Blocked by microsoft" }[r.st] || "";
    const [ic, cls] = ST[r.st];
    return h("div.verdict", null, icon(ic, cls), h("div.t", null, h("b", null, head), r.why ? h("div", null, r.why instanceof Node ? r.why.cloneNode(true) : r.why) : null,
      fixes.length ? h("div.fix", null, fixes.map(([l, fn], i) => h("button.sb" + (i === 0 ? ".primary" : ""), { onclick: (e) => fn(e) }, l))) : null));
  }
  function checksFor(sec, r) {
    if (r.steps) return r.steps;
    const it = r.it, steps = [{ ok: true, t: "Found", d: it.via ? `${C.byId[it.via].name} plugin` : it.path }];
    if (it.duplicateOf) return steps.concat({ ok: false, t: "Skipped: duplicate name", d: `${C.byId[it.duplicateOf].path} takes precedence` });
    steps.push(read(it) ? { ok: true, t: `Read by ${HL()}` } : { ok: false, t: `Not read by ${HL()}`, d: harnessWhy(it) });
    if (!read(it)) return steps;
    steps.push(it.locked === "required" ? { ok: true, t: "Required by microsoft" } : it.enabled === false ? { ok: false, t: "Turned off" } : { ok: true, t: "Turned on" });
    if (sec === "context" && it.mode === "glob") steps.push({ ok: P.file && C.matches(glob(it), P.file) ? true : "lazy", t: P.file && C.matches(glob(it), P.file) ? "applyTo matches the context file" : "applyTo doesn't match · still listed by description" });
    if (sec === "skills" && it.modelInvocable) steps.push({ ok: "lazy", t: "Listed for the model", d: "Name and description are sent; the model decides whether to load it" });
    return steps;
  }
  function renderInspector(R) {
    const [secId, id] = (UI.sel || ":").split(":");
    const sec = SECTIONS.find((s) => s.id === secId);
    const r = sec && R[secId].find((x) => x.it.id === id);
    if (!r) { ins.replaceChildren(h("div.empty", null, "Select a row to see why.")); return; }
    const it = r.it, T = C.TYPES[it.type] || C.TYPES.mcp;
    const parts = [h("div.in-h", null, icon(T.icon), h("div.t", null, h("b", null, it.name), h("small", null, T.label)), it.src !== "repo" ? srcGlyph(it) : null), verdict(secId, r)];

    if (secId === "context" && it.mode === "glob") {
      const input = h("input.tf", { value: glob(it), "aria-label": "applyTo", spellcheck: "false" });
      const res = h("div.glob-res");
      const ex = h("ul.glob-files", { hidden: !UI.examples });
      const upd = () => {
        const g = input.value.trim();
        const m = g && P.file && C.matches(g, P.file);
        res.replaceChildren(icon(m ? "pass-filled" : "circle-large-outline", m ? "ic-in" : "ic-out"), m ? `Matches ${base(P.file)}` : `Doesn't match ${base(P.file)}`);
        const hits = g ? SAMPLE.filter((f) => C.matches(g, f) && f !== P.file).slice(0, 5) : [];
        ex.replaceChildren(...(hits.length ? hits.map((f) => h("li", { title: "Use as context file", onclick: () => { P.file = f; probe(); render(); } }, f)) : [h("li", null, "No examples in the sample")]));
      };
      input.addEventListener("input", () => { const v = input.value; UI.draft = v === it.applyTo ? null : { id: it.id, value: v }; upd(); clearTimeout(input.t); input.t = setTimeout(() => { render(); const el = ins.querySelector(".glob .tf"); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 400); });
      upd();
      parts.push(h("div.in-sec", null, h("div.lbl", null, "applyTo"), h("div.glob", null, input), res,
        UI.draft && UI.draft.id === it.id ? [h("div.lbl.muted", { style: { fontSize: "11.5px", marginTop: "8px" } }, "Other files it would match"), (ex.hidden = false, ex)] : null));
    }
    if (it.id === "agents-md" || it.id === "copilot-instructions") parts.push(h("div.in-sec", null, h("div.refs", null, icon("link"), it.id === "agents-md" ? "Links to " : "Linked from ",
      h("button.link", { onclick: () => select("context:" + (it.id === "agents-md" ? "copilot-instructions" : "agents-md")) }, it.id === "agents-md" ? ".github/copilot-instructions.md" : "AGENTS.md"))));
    if (secId === "tools" && AGENTS[P.agent].tools && !r.missing && toolRef(it)) {
      const ag = AGENTS[P.agent], cur = refsFor(it, ag), key = toolRef(it).split("/")[0], saved = (UI.removed[P.agent] || {})[key];
      const shownRefs = cur.length ? cur : saved || [toolRef(it)];
      parts.push(h("div.in-sec", null, h("div.lbl", null, `${ag.name}'s tools`), h("div.tperm", null, h("span.grow", null, "Allow ", join(shownRefs.map((x) => h("code", null, x)))),
        switchEl(cur.length > 0, (v) => editTools(ag, shownRefs, v), { label: `Allow ${ag.name} to use ${it.name}` }))));
    }

    parts.push(h("button.disc", { onclick: () => { UI.checks = !UI.checks; render(); } }, icon(UI.checks ? "chevron-down" : "chevron-right"), "Details and checks"));
    if (UI.checks) parts.push(h("div.details", null, it.desc ? h("p", null, it.desc) : null, it.path && !it.via ? h("p.mono.muted", null, it.path) : null,
      h("ol.chain", null, checksFor(secId, r).map((s) => h("li", null, icon(s.ok === true ? "pass-filled" : s.ok === false ? "error" : "circle-large-outline", s.ok === true ? "ic-in" : s.ok === false ? "ic-block" : "ic-list"), h("div", null, s.t, s.d ? h("small", null, s.d) : null))))));

    const path = it.path && !it.via && !["Organization policy", "Built-in"].includes(it.path) ? it.path : null;
    if (!r.missing && it.id !== "x-handoff") parts.push(h("div.in-actions", null,
      it.locked === "required" ? h("span.src", null, icon("lock"), "Required by microsoft") : it.locked === "blocked" ? h("span.src", null, icon("circle-slash"), "Blocked by microsoft")
        : h("label.tperm", null, switchEl(it.enabled !== false, (v) => { it.enabled = v; render(); toast(`Turned ${v ? "on" : "off"} ${it.name}`, v ? "pass" : "circle-slash"); }, { label: "Turn on " + it.name }), it.enabled !== false ? "On" : "Off"),
      h("span.grow"), path ? h("button.sb", { onclick: () => toast("Opened " + path, "go-to-file") }, "Open File") : null));
    ins.replaceChildren(...parts);
  }

  function toolRef(src) {
    return { "t-execute": "execute", "t-read": "read", "t-search": "search", "t-todo": "todo", "t-vscode": "vscode", "t-edit": "edit", "t-web": "web", "e-kusto": "ms-vscode.kusto-client/*", "m-github": "github/*", "m-semgrep": "semgrep/*", "m-playwright": "playwright/*", "m-sprue": "sprue/*", "c-slack": "slack/*", "c-figma": "figma/*", "c-workiq": "workiq/*", "e-ghpr": "github.vscode-pull-request-github/*", "m-browsertools": "browser-tools/*" }[src.id];
  }
  function editTools(agent, refs, add) {
    refs = [].concat(refs);
    const key = refs[0].split("/")[0];
    const agentId = Object.keys(AGENTS).find((k) => AGENTS[k] === agent);
    if (add) { agent.tools = agent.tools.concat(refs.filter((r) => !agent.tools.includes(r))); }
    else { (UI.removed[agentId] = UI.removed[agentId] || {})[key] = agent.tools.filter((t) => t.split("/")[0] === key); agent.tools = agent.tools.filter((t) => t.split("/")[0] !== key); }
    toast(`${add ? "Added" : "Removed"} ${refs.join(", ")} ${add ? "to" : "from"} ${agent.path}`, "pass");
    if (!add && key === "azure-mcp") UI.sel = "tools:e-kusto";
    render();
  }
  const join = (nodes) => nodes.flatMap((n, i) => (i ? [", ", n] : [n]));
  function envPrompt(anchor, it) {
    const inp = h("input.tf", { type: "password", placeholder: "Paste the token", "aria-label": "SEMGREP_APP_TOKEN", style: { width: "100%" } });
    const save = () => { if (!inp.value.trim()) return inp.focus(); closePop(); it.state.auth = "none"; it.status = null; toast("Saved SEMGREP_APP_TOKEN to your user secrets", "key"); render(); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    popover(anchor, h("div", null, h("b", null, "SEMGREP_APP_TOKEN"), h("p.muted", { style: { margin: "4px 0 8px", fontSize: "12px" } }, "Stored in your user secrets and passed to the Semgrep server when it starts."), inp,
      h("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "10px" } }, h("button.sb", { onclick: closePop }, "Cancel"), h("button.sb.primary", { onclick: save }, "Save"))), { width: 320 });
    setTimeout(() => inp.focus(), 0);
  }
  function fix(it, what, anchor) {
    if (what === "Set Variable…") return envPrompt(anchor || ins, it);
    if (what === "Sign In") { it.state.auth = "signed-in"; it.state.running = true; it.status = null; toast(`Signed in to ${it.name}`, "pass"); }
    else if (what === "Turn On") { it.enabled = true; toast(`Turned on ${it.name}`, "pass"); }
    else if (what === "Convert") {
      const n = it.name.replace(/\.md$/, "");
      const path = P.harness === "claude" ? { instruction: `.claude/rules/${n}.md`, hook: ".claude/settings.json", agent: `.claude/agents/${n}.md`, prompt: `.claude/commands/${n}.md`, skill: `~/.claude/skills/${n}/SKILL.md` }[it.type] : `~/.copilot/skills/${n}/SKILL.md`;
      const copy = Object.assign({}, it, { id: it.id + "@" + P.harness, path, harness: { copilot: "no", claude: "no", codex: "no", [P.harness]: "yes" } });
      it.convertedTo = Object.assign(it.convertedTo || {}, { [P.harness]: path });
      C.items.push(copy); C.byId[copy.id] = copy;
      UI.sel = UI.sel.split(":")[0] + ":" + copy.id;
      toast(`Created ${path}; the original stays in place`, "arrow-swap");
    }
    else if (what === "Review and Trust…") { it.state.trusted = true; toast(`Trusted ${it.name}`, "workspace-trusted"); }
    render();
  }
  function saveDraft() { const it = C.byId[UI.draft.id]; it.applyTo = UI.draft.value; UI.draft = null; toast(`Saved applyTo in ${it.path}`, "save"); render(); }
  function select(k) { UI.sel = k; render(); const el = list.querySelector(`.row[data-k="${CSS.escape(k)}"]`); el && el.scrollIntoView({ block: "nearest" }); }

  /* ── Probe, toolbar ─────────────────────────────────────────── */
  let probeEl, typeSeg;
  function menu(anchor, items, current, onPick, width = 440) {
    popover(anchor, h("div.menu", { role: "listbox" }, items.map((x) => x === "-" ? h("div.menu-sep") : h("div.menu-i" + (x[0] === current ? ".sel" : ""), { role: "option", onclick: () => { closePop(); onPick(x[0]); } }, icon(x[1]), h("span", null, x[2]), x[3] ? h("small", null, x[3]) : null))), { width });
  }
  function probe() {
    const fileIcon = !P.file ? "circle-slash" : P.file.endsWith(".css") ? "symbol-color" : P.file.endsWith(".md") ? "markdown" : "file-code";
    probeEl.replaceChildren(
      h("span.lbl", null, "Context file"),
      h("button.pk", { title: P.file || "No file", onclick: (e) => menu(e.currentTarget, [[null, "circle-slash", "No file", "standing instructions only"], "-", ...C.FILES.map((f) => [f, f.endsWith(".css") ? "symbol-color" : f.endsWith(".md") ? "markdown" : "file-code", base(f), f.split("/").slice(-4, -1).join("/")])], P.file, (v) => { P.file = v; probe(); render(); }) },
        icon(fileIcon), h("span.v", null, base(P.file)), icon("chevron-down")),
      h("span.sep"), h("span.lbl", null, "Agent"),
      h("button.pk", { onclick: (e) => menu(e.currentTarget, [["default", "copilot", "Default", "no tools: list"], ...["a-data", "a-reviewer"].filter((id) => read(C.byId[id]) && C.byId[id].enabled !== false).map((id) => [id, "agent", C.byId[id].name, C.byId[id].path])], P.agent, (v) => { P.agent = v; if (v === "a-data") UI.sel = "tools:x-azure"; probe(); render(); }, 320) },
        icon(P.agent === "default" ? "copilot" : "agent"), h("span", null, AGENTS[P.agent].name), icon("chevron-down")),
      h("span.sep"), h("span.lbl", null, "Runs in"),
      h("div.seg", { role: "group", "aria-label": "Runs in" }, C.HARNESSES.map((x) => h("button", { "aria-pressed": String(P.harness === x.id), onclick: () => { P.harness = x.id; if (P.agent !== "default" && !read(AGENTS[P.agent])) { toast(`${AGENTS[P.agent].name} isn't read by ${x.label} — showing the default agent`, "info"); P.agent = "default"; } document.querySelector("vsc-modal-editor").setAttribute("description", `(${x.label} · vscode)`); probe(); render(); } }, icon(x.icon), x.label))),
      h("span.grow"),
      h("span.hint", null, "Shows eligibility, not what the model will choose"),
      h("button.cmp", { "aria-pressed": String(UI.compare), title: "Compare with the recorded last request", onclick: () => { UI.compare = !UI.compare; probe(); render(); } }, icon("history"), "Last Request"));
  }

  function build(r) {
    probeEl = h("div.probe", { role: "toolbar", "aria-label": "Context to resolve" });
    list = h("div.rv-list", { role: "listbox", "aria-label": "Resolved customizations" });
    ins = h("aside.rv-ins", { "aria-label": "Why" });
    const addMenu = (e) => menu(e.currentTarget, [["i", "book", "Instruction…", "describe it, AI drafts it"], ["s", "lightbulb", "Skill…", ""], ["a", "agent", "Agent…", ""], ["h", "zap", "Hook…", ""], "-",
      ["p", "plug", "Install Plugin…", "approved marketplaces"], ["m", "server", "Add MCP Server…", ""], ["c", "link", "Connect a Service…", "Jira, Linear, Sentry…"]], null, (v) => toast({ i: "Opened a chat to draft an instruction for the context file", s: "Opened a chat to draft a skill", a: "Opened a chat to draft an agent", h: "Opened a chat to draft a hook", p: "Opened plugins from microsoft/agent-plugins and github/awesome-copilot", m: "Opened the MCP server gallery", c: "Opened Copilot connectors" }[v], "add"), 300);
    r.append(h("div.rv", null, probeEl,
      h("div.tbar", null,
        h("div.find", null, icon("search"), h("input.tf", { placeholder: "Find a customization", "aria-label": "Find a customization", oninput: (e) => { UI.q = e.target.value; render(); } })),
        typeSeg = h("div.seg", { role: "group", "aria-label": "Show" }, [["all", "All"], ["context", "Instructions"], ["skills", "Skills"], ["tools", "Tools"], ["agents", "Agents"], ["hooks", "Hooks"]].map(([k, l]) =>
          h("button", { "aria-pressed": String(UI.type === k), "data-t": k, onclick: () => { UI.type = k; typeSeg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === k))); render(); } }, l))),
        h("label.chk", null, h("input", { type: "checkbox", onchange: (e) => { UI.unavailable = e.target.checked; render(); } }), "Only what's unavailable"),
        h("span.grow"),
        h("button.sb.primary", { onclick: addMenu }, icon("add"), "Add")),
      h("div.rv-body", null, list, ins)));
    probe();
    render();
  }

  window.CZUI.mount({ build });
})();
