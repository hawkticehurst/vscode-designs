/* Concept A — Charter. What agents can do in this workspace, as five short paragraphs. Only what's active for the
   selected harness is stated as fact; everything else is listed under "Not active here" with its reason. Every noun is
   a token you can inspect and control. A composer turns a plain description into a typed, previewed draft. */
(function () {
  const { h, icon, srcGlyph, switchEl, popover, closePop, toast } = window.CZUI;
  const C = window.CZ;
  const S = { harness: "copilot", q: "", filter: null, open: new Set(), inactiveOpen: false, draft: null, created: [], convertSel: null };
  const HL = () => C.HARNESSES.find((x) => x.id === S.harness).label;
  const all = () => C.items.concat(S.created);
  let root, doc;

  /* ── What's active ──────────────────────────────────────────── */
  const read = (it) => !it.harness || C.supported(it, S.harness);
  const broken = (it) => it.state && (it.state.auth === "signed-out" || it.state.auth === "env");
  const active = (it) => read(it) && it.enabled !== false && it.locked !== "blocked" && !it.duplicateOf && !broken(it);
  const A = (pred) => all().filter((i) => pred(i) && active(i));
  function destFor(it, hz) {
    const n = it.name.replace(/\.md$/, "");
    if (hz === "claude") return { instruction: `.claude/rules/${n}.md`, hook: ".claude/settings.json", agent: `.claude/agents/${n}.md`, prompt: `.claude/commands/${n}.md`, skill: `~/.claude/skills/${n}/SKILL.md` }[it.type] || `.claude/${n}`;
    if (hz === "copilot") return { prompt: `~/.copilot/skills/${n}/SKILL.md`, instruction: `~/.copilot/instructions/${n}.instructions.md`, skill: `~/.copilot/skills/${n}/SKILL.md` }[it.type] || n;
    return n;
  }
  function convertCopy(it) {
    const hz = S.harness, path = destFor(it, hz);
    const copy = Object.assign({}, it, { id: it.id + "@" + hz, path, type: it.type === "prompt" ? (hz === "claude" ? "prompt" : "skill") : it.type, modelInvocable: it.type === "prompt" ? false : it.modelInvocable, userInvocable: true,
      harness: { copilot: "no", claude: "no", codex: "no", [hz]: "yes" }, _new: true, convertedFrom: it.id });
    if (it.type === "instruction" && hz === "claude" && it.mode === "listed") copy.mode = "listed";
    it.convertedTo = Object.assign(it.convertedTo || {}, { [hz]: path });
    S.created.push(copy); C.byId[copy.id] = copy;
  }
  function inactiveReason(it) {
    if (it.convertedTo && it.convertedTo[S.harness]) return `Converted — ${HL()} uses the copy at ${it.convertedTo[S.harness]}`;
    if (it.duplicateOf) return `Same name as ${C.byId[it.duplicateOf].path}, which takes precedence`;
    if (it.locked === "blocked") return "Not on microsoft's MCP allowlist";
    if (!read(it)) return (it.harness && it.harness.note) || `Not read by ${HL()}`;
    if (it.enabled === false) return it.id === "h-build" ? "Turned off (file is named build.json.disabled)" : "Turned off";
    return null;
  }
  function attention() {
    const out = [];
    for (const it of all()) {
      if (it.state && it.state.auth === "signed-out") out.push({ it, text: `${it.name} is signed out`, sub: "The agent can't use it until you sign in", acts: [["Sign In", () => fix(it, "signin")]] });
      else if (it.state && it.state.auth === "env") out.push({ it, text: `${it.name} can't start`, sub: "It needs SEMGREP_APP_TOKEN", acts: [["Set Variable…", (e) => envPrompt(e.currentTarget, it)]] });
      else if (it.id === "a-data" && it.tools.some((t) => t.startsWith("azure-mcp/"))) out.push({ it, text: "Data agent lists a tool nothing provides", sub: "azure-mcp/kusto_query — Azure MCP isn't installed", acts: [["Install Azure MCP", () => toast("Installing Azure MCP Server (ms-azuretools.vscode-azure-mcp-server)…", "cloud-download")], ["Remove from Data's Tools", () => fix(it, "rmtool")]] });
    }
    return out;
  }

  /* ── Tokens ─────────────────────────────────────────────────── */
  function token(it, label) {
    const mark = it.locked === "required" ? icon("lock") : it.update ? icon("arrow-circle-up") : null;
    const t = h("span.tk" + (it._new ? ".new" : ""), { tabindex: "0", role: "button", "data-id": it.id, "data-src": it.src, "data-via": it.via || "", "data-q": (it.name + " " + (it.desc || "") + " " + (label || "")).toLowerCase() },
      label || it.name, mark);
    t.addEventListener("click", (e) => { e.stopPropagation(); inspect(it, t); });
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inspect(it, t); } });
    return t;
  }
  const join = (nodes, last = " and ") => nodes.flatMap((n, i) => (i === 0 ? [n] : [i === nodes.length - 1 ? last : ", ", n]));
  const run = (items) => join(items.map((i) => token(i)));
  function viewAll(key, label, items, cols) {
    const open = S.open.has(key) || !!S.q;
    return [" ", h("button.more", { onclick: () => { S.open.has(key) ? S.open.delete(key) : S.open.add(key); render(); } }, open && !S.q ? "Hide list" : label),
      open ? h("div.vlist", null, items.map((it) => {
        const r = h("div.vrow", { "data-q": (it.name + " " + (it.desc || "")).toLowerCase(), onclick: (e) => inspect(it, r) }, h("span", null, it.name), h("span.d", null, cols(it)), it.src !== "repo" ? srcGlyph(it) : h("span"),
          it.locked ? h("span.src", null, icon("lock")) : switchEl(it.enabled !== false, (v) => { it.enabled = v; render(); toast(`Turned ${v ? "on" : "off"} ${it.name}`, v ? "pass" : "circle-slash"); }, { label: "Turn on " + it.name }));
        return r;
      })) : null];
  }

  /* ── Paragraphs ─────────────────────────────────────────────── */
  const SKILL_GROUPS = [
    ["UI work", ["ux-css-layout", "accessibility", "hover", "ux-theming", "context-menus", "component", "component-fixtures", "chat-customizations-editor", "integrated-browser", "design-philosophy", "validate-ui-scenario", "update-screenshots", "chat-pet-sprite-creation", "design-system-audit"]],
    ["testing", ["unit-tests", "integration-tests", "smoke-tests", "flaky-smoke-tests", "agent-host-e2e-tests", "ci-artifact-testing", "feature-tryouts"]],
    ["debugging and performance", ["cpu-profile-analysis", "heap-snapshot-analysis", "memory-leak-audit", "agent-host-logs", "code-oss-logs", "symbolicate-crash-dump", "chat-perf", "auto-perf-optimize", "otel"]],
    ["CI and builds", ["fix-ci-failures", "azure-pipelines", "launch", "vscode-dev-workbench"]],
    ["reviews and repo chores", ["code-review", "address-pr-comments", "secure-development", "pr-description", "author-contributions", "endgame-status", "experiments", "policy-and-managed-settings"]],
  ];
  const TOOL_PHRASE = { "t-edit": "edit files", "t-execute": "run terminal commands", "t-read": "read", "t-search": "search the workspace", "t-web": "fetch web pages", "t-todo": "track todos", "t-vscode": "use VS Code",
    "m-playwright": "drive a browser", "m-sprue": "build design prototypes", "m-semgrep": "scan code with Semgrep", "e-kusto": "run Kusto queries", "e-ghpr": "work with pull requests" };
  const HOOK_PHRASE = { "h-cloud": ["When a session starts", "sets up the environment (only in Linux cloud sandboxes)"], "h-semgrep": ["After the agent edits a file", "scans it"], "h-build": ["When the agent finishes", "runs a fast build"] };

  function para(id, verb, body) { return h("section.cl", { "data-clause": id }, h("div.cl-verb", null, verb), h("div.cl-text", null, body)); }

  function paragraphs() {
    const out = [];
    // Guidance
    const standing = A((i) => i.type === "instruction" && i.mode === "standing");
    const globbed = A((i) => i.type === "instruction" && i.mode === "glob");
    const listed = A((i) => i.type === "instruction" && i.mode === "listed");
    const areas = new Map();
    for (const g of globbed) { const a = C.describeGlob(g.applyTo); if (!areas.has(a)) areas.set(a, []); areas.get(a).push(g); }
    const areaList = [...areas.entries()].filter(([a]) => a !== "any file").sort((a, b) => b[1].length - a[1].length);
    const areaTok = ([a, items]) => { const t = h("span.tk", { tabindex: "0", role: "button", "data-q": (a + " " + items.map((i) => i.name).join(" ")).toLowerCase(), "data-src": items[0].src, "data-ids": items.map((i) => i.id).join(" ") }, a);
      t.addEventListener("click", (e) => { e.stopPropagation(); popover(t, h("div", null, h("div.ins-h", null, icon("file-code"), h("div.t", null, h("b", null, a), h("small", null, items.length === 1 ? "1 instruction" : `${items.length} instructions`))), h("p", { style: { lineHeight: "2", margin: "8px 0 0" } }, run(items)))); });
      return t; };
    const anyFile = areas.get("any file") || [];
    out.push(para("guidance", "Guidance", [
      h("p", null, "Every request includes ", run(standing.filter((i) => i.src !== "org")), standing.some((i) => i.src === "org") ? [" and microsoft's ", run(standing.filter((i) => i.src === "org"))] : null, anyFile.length ? [", plus ", run(anyFile)] : null, "."),
      areaList.length ? h("p", null, "Adds guidance when the work touches ", join(areaList.slice(0, 5).map(areaTok), areaList.length > 5 ? ", " : " and "), areaList.length > 5 ? " and other areas" : "", ".") : null,
      listed.length ? h("p", null, "Reads guides like ", run(listed.slice(0, 3)), " when they're relevant.",
        viewAll("guidance", `View all ${standing.length + globbed.length + listed.length}`, standing.concat(globbed, listed), (i) => i.mode === "standing" ? "Every request" : i.mode === "glob" ? h("span", null, "When the work touches ", C.describeGlob(i.applyTo)) : "When relevant")) : null]));

    // Skills and agents
    const skills = A((i) => i.type === "skill");
    const auto = skills.filter((s) => s.modelInvocable), manual = skills.filter((s) => !s.modelInvocable);
    const groups = SKILL_GROUPS.map(([g, names]) => [g, names.map((n) => auto.find((s) => s.name === n)).filter(Boolean)]).filter(([, l]) => l.length);
    const groupTok = (g, items) => { const t = h("span.tk", { tabindex: "0", role: "button", "data-q": (g + " " + items.map((i) => i.name).join(" ")).toLowerCase(), "data-ids": items.map((i) => i.id).join(" ") }, g);
      t.addEventListener("click", (e) => { e.stopPropagation(); popover(t, h("div", null, h("div.ins-h", null, icon("lightbulb"), h("div.t", null, h("b", null, "Skills for " + g))), h("p", { style: { lineHeight: "2", margin: "8px 0 0" } }, run(items)))); });
      return t; };
    const agents = A((i) => i.type === "agent");
    const pick = agents.filter((a) => a.userInvocable !== false), sub = agents.filter((a) => a.userInvocable === false);
    out.push(para("skills", "Skills and agents", [
      auto.length ? h("p", null, "Loads skills for ", join(groups.map(([g, l]) => groupTok(g, l))), " when the model finds them relevant.") : h("p.muted", null, `${HL()} doesn't read this repo's skills.`),
      manual.length ? h("p", null, "Runs others, like ", run(manual.slice(0, 2)), ", only when you type ", h("code", null, "/name"), ".",
        viewAll("skills", `View all ${skills.length}`, skills, (s) => s.modelInvocable ? s.desc : h("span", null, "Only with ", h("code", null, "/" + s.name)))) : null,
      pick.length || sub.length ? h("p", null, pick.length ? ["You can pick the ", run(pick), pick.length > 1 ? " agents" : " agent"] : null, sub.length ? [pick.length ? "; " : "", run(sub), " works as a subagent"] : null, ".") : null]));

    // Tools and connections
    const tools = A((i) => ["toolset", "mcp", "connector", "extension"].includes(i.type));
    const local = tools.filter((t) => t.reach !== "online" || t.type === "extension");
    const online = tools.filter((t) => t.reach === "online" && t.type !== "extension");
    const canvases = A((i) => i.type === "canvas");
    out.push(para("tools", "Tools and connections", [
      h("p", null, "Can ", join(local.map((t) => token(t, TOOL_PHRASE[t.id] || t.name))), "."),
      online.length ? h("p", null, "Uses your connected accounts for ", run(online), ".") : null,
      canvases.length ? h("p", null, "Can show ", run(canvases), " beside the chat.") : null]));

    // Hooks and schedules
    const hooks = A((i) => i.type === "hook"), autos = A((i) => i.type === "automation");
    out.push(para("hooks", "Hooks and schedules", [
      hooks.length ? hooks.map((hk) => { const [w, v] = HOOK_PHRASE[hk.id] || [`When ${hk.eventLabel}`, "runs"]; return h("p", null, w, ", ", token(hk), " ", v, "."); }) : h("p.muted", null, `No hooks run in ${HL()}.`),
      autos.length ? h("p", null, join(autos.map((a) => h("span", null, a.schedule, ", ", token(a))), "; "), ".") : null]));

    // Organization
    out.push(h("p.policy", null, icon("lock"), "Locked items are required by microsoft, which also allows only approved MCP servers and plugin marketplaces."));
    return out;
  }

  /* ── Needs attention / Not active ───────────────────────────── */
  function attentionEl() {
    const list = attention(); if (!list.length) return null;
    return h("div.attn", null, h("div.attn-h", null, "Needs attention"), list.map((a) => h("div.attn-r", null, icon("warning"), h("div.t", null, a.text, " ", h("span", null, "· " + a.sub)), a.acts.map(([l, fn], i) => h("button.sb" + (i === 0 ? ".primary" : ""), { onclick: fn }, l)))));
  }
  function inactiveEl() {
    const att = new Set(attention().map((a) => a.it.id));
    const list = all().filter((i) => inactiveReason(i) && !att.has(i.id) && !i.convertedFrom);
    if (!list.length) return null;
    const convertible = list.filter((i) => i.harness && i.harness[S.harness] === "convert" && !(i.convertedTo && i.convertedTo[S.harness]));
    if (!S.convertSel) S.convertSel = new Set(convertible.map((i) => i.id));
    return h("div.inactive", null,
      h("button", { "aria-expanded": String(S.inactiveOpen), onclick: () => { S.inactiveOpen = !S.inactiveOpen; render(); } }, icon(S.inactiveOpen ? "chevron-down" : "chevron-right"), `Not active in ${HL()} (${list.length})`),
      S.inactiveOpen ? [h("div", { style: { marginTop: "8px" } }, list.map((i) => {
        const conv = convertible.includes(i);
        return h("div.ina-r", null, conv ? h("input", { type: "checkbox", checked: S.convertSel.has(i.id), "aria-label": "Convert " + i.name, onchange: (e) => { e.target.checked ? S.convertSel.add(i.id) : S.convertSel.delete(i.id); render(); } }) : h("span"),
          h("span", null, i.name), h("span.d", null, inactiveReason(i)),
          i.enabled === false && !i.locked ? h("button.sb", { onclick: () => { i.enabled = true; toast(`Turned on ${i.name}`, "pass"); render(); } }, "Turn On") : h("span"));
      })),
      convertible.length ? h("div.ina-actions", null, h("button.sb.primary", { disabled: !S.convertSel.size || null, onclick: () => { const n = S.convertSel.size; convertible.filter((i) => S.convertSel.has(i.id)).forEach(convertCopy); S.convertSel = null; render(); toast(`Created ${HL()} copies of ${n} customizations; originals stay in place`, "arrow-swap"); } }, `Convert ${S.convertSel.size} for ${HL()}`),
        h("span.muted", { style: { fontSize: "12px" } }, "Creates copies in its format; the originals stay where they are.")) : null] : null);
  }

  /* ── Inspector ──────────────────────────────────────────────── */
  function whenText(it) {
    switch (it.type) {
      case "instruction": return it.mode === "standing" ? "Every request" : it.mode === "glob" ? h("span", null, "When attached files match ", h("code", null, it.applyTo)) : "When the agent decides it's relevant";
      case "skill": return it.modelInvocable ? (it.userInvocable ? h("span", null, "When the model finds it relevant, or ", h("code", null, "/" + it.name)) : "When the model finds it relevant") : h("span", null, "Only with ", h("code", null, "/" + it.name));
      case "prompt": return h("span", null, "With ", h("code", null, "/" + it.name));
      case "agent": return it.userInvocable === false ? "When another agent delegates to it" : "When you pick it for a session";
      case "hook": return h("span", null, it.eventLabel[0].toUpperCase() + it.eventLabel.slice(1), " (", h("code", null, it.event), ")");
      case "automation": return it.schedule;
      case "plugin": return "Adds the items below";
      default: return it.reach === "online" ? "When the agent calls it, as you" : "When the agent calls it";
    }
  }
  function inspect(it, anchor) {
    const T = C.TYPES[it.type];
    const readers = C.HARNESSES.filter((x) => !it.harness || C.supported(it, x.id)).map((x) => x.label);
    const acts = [];
    if (it.update) acts.push(h("button.sb.primary", { onclick: () => fix(it, "update") }, `Update to ${it.update}`));
    if (it.path && !it.via && !["Organization policy", "Built-in"].includes(it.path)) acts.push(h("button.sb", { onclick: () => { closePop(); toast("Opened " + it.path, "go-to-file"); } }, "Open"));
    let control;
    if (it.locked === "required") control = h("span.src", null, icon("lock"), "Required by microsoft");
    else if (it.type === "plugin") control = h("button.sb", { onclick: () => fix(it, "disable-plugin") }, `Turn Off Plugin and Its ${it.contributes.length} Items`);
    else control = h("label", null, switchEl(it.enabled !== false, (v) => { it.enabled = v; closePop(); render(); toast(`Turned ${v ? "on" : "off"} ${it.name}`, v ? "pass" : "circle-slash"); }, { label: "Turn on " + it.name }), it.enabled !== false ? "On" : "Off");
    const via = it.via ? C.byId[it.via] : null;
    popover(anchor, h("div", null,
      h("div.ins-h", null, icon(T.icon), h("div.t", null, h("b", null, it.name), h("small", null, T.label)), srcGlyph(it)),
      it.desc ? h("p.ins-d", null, it.desc) : null,
      h("dl.ins-k", null,
        h("dt", null, "When"), h("dd", null, whenText(it)),
        it.command ? [h("dt", null, "Runs"), h("dd", null, h("code", null, it.command))] : null,
        it.tools && Array.isArray(it.tools) ? [h("dt", null, "Tools"), h("dd", null, it.tools.join(", "))] : null,
        it.handoffs ? [h("dt", null, "Hands off"), h("dd", null, `To the default agent: “${it.handoffs[0].label}”`)] : null,
        it.version ? [h("dt", null, "Version"), h("dd", null, it.version, " · ", it.marketplace)] : null,
        [h("dt", null, "From"), h("dd", null, via ? h("button.link", { onclick: () => inspect(via, anchor) }, `${via.name} plugin`) : it.path ? h("span.mono", null, it.path) : C.SOURCES[it.src].label)],
        it.harness ? [h("dt", null, "Read by"), h("dd", null, readers.join(", ") || "None")] : null),
      it.type === "plugin" ? h("p", { style: { lineHeight: "2", margin: "8px 0 0" } }, join(it.contributes.map((id) => token(C.byId[id])))) : null,
      h("div.ins-f", null, control, h("span.grow"), acts)), { width: it.type === "plugin" ? 400 : 360 });
  }

  function envPrompt(anchor, it) {
    const inp = h("input.tf", { type: "password", placeholder: "Paste the token", "aria-label": "SEMGREP_APP_TOKEN", style: { width: "100%" } });
    const save = () => { if (!inp.value.trim()) { inp.focus(); return; } fix(it, "env"); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    popover(anchor, h("div", null, h("b", null, "SEMGREP_APP_TOKEN"), h("p.muted", { style: { margin: "4px 0 8px", fontSize: "12px" } }, "Stored in your user secrets and passed to the Semgrep server when it starts."), inp,
      h("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "10px" } }, h("button.sb", { onclick: closePop }, "Cancel"), h("button.sb.primary", { onclick: save }, "Save"))), { width: 320 });
    setTimeout(() => inp.focus(), 0);
  }
  function fix(it, what) {
    closePop();
    if (what === "signin") { it.state.auth = "signed-in"; it.state.running = true; it.status = null; toast(`Signed in to ${it.name}`, "pass"); }
    else if (what === "env") { it.state.auth = "none"; it.status = null; toast("Saved SEMGREP_APP_TOKEN to your user secrets", "key"); }
    else if (what === "rmtool") { it.tools = it.tools.filter((t) => !t.startsWith("azure-mcp/")); it.status = null; toast("Removed azure-mcp/kusto_query from .github/agents/data.md", "pass"); }
    else if (what === "update") { it.version = it.update; it.update = null; it.status = null; toast(`Updated ${it.name} to ${it.version}`, "pass"); }
    else if (what === "convert") { convertCopy(it); toast(`Created ${destFor(it, S.harness)}`, "arrow-swap"); }
    else if (what === "disable-plugin") { it.enabled = false; it.contributes.forEach((id) => (C.byId[id].enabled = false)); toast(`Turned off ${it.name} and the ${it.contributes.length} items it adds`, "circle-slash"); }
    render();
  }

  /* ── Composer ───────────────────────────────────────────────── */
  const KINDS = [["instruction", "Instruction"], ["hook", "Hook"], ["skill", "Skill"], ["automation", "Automation"], ["connection", "Connection"]];
  function classify(t) {
    if (/test|lint|format|before (it )?finish|after (each|every) edit/i.test(t)) return "hook";
    if (/jira|linear|sentry|notion|figma|slack|connect|talk to/i.test(t)) return "connection";
    if (/every (day|week|monday|tuesday|wednesday|thursday|friday)|daily|weekly|schedule/i.test(t)) return "automation";
    if (/never|always|prefer|avoid|don't|do not|use .* instead/i.test(t)) return "instruction";
    if (/how to|workflow|steps to|\/\w+/i.test(t)) return "skill";
    return null;
  }
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(" ").filter((w) => w && !["the", "a", "an", "it", "my", "to", "before", "after", "every", "each", "use", "when", "agent"].includes(w)).slice(0, 3).join("-") || "new";
  function draftParts(d) {
    const n = slug(d.text), me = d.dest === "user", hz = S.harness;
    switch (d.kind) {
      case "hook": {
        const cmd = /test/i.test(d.text) ? "./scripts/test.sh --run changed" : /lint/i.test(d.text) ? "npm run eslint -- --cache" : /format/i.test(d.text) ? "npm run format -- ${file}" : "./scripts/check.sh";
        if (hz === "codex") return { note: "Codex doesn't read hooks from this repo. Pick Copilot CLI or Claude Code to add one.", blocked: true };
        const afterEdit = /after (each |every |an? )?edit|on edit|when .* edits/i.test(d.text);
        const ev = afterEdit ? (hz === "claude" ? "PostToolUse" : "postToolUse") : (hz === "claude" ? "Stop" : "agentStop");
        const file = hz === "claude" ? (me ? "~/.claude/settings.json" : ".claude/settings.json") : (me ? `~/.copilot/hooks/${n}.json` : `.github/hooks/${n}.json`);
        const body = hz === "claude" ? `{\n  "hooks": {\n    "${ev}": [{ ${afterEdit ? '"matcher": "Edit|Write", ' : ""}"hooks": [{ "type": "command", "command": "${cmd}" }] }]\n  }\n}` : `{\n  "version": 1,\n  "hooks": {\n    "${ev}": [{ "type": "command", ${afterEdit ? '"matcher": "edit", ' : ""}"bash": "${cmd}", "timeoutSec": 600 }]\n  }\n}`;
        const when = afterEdit ? "After the agent edits a file" : "When the agent finishes";
        return { title: when + ", run a command", sentence: [when, ", ", h("span.tk", null, n), " runs ", h("code", null, cmd), "."], file, body, note: "Hooks run shell commands without asking. Check the command.",
          item: { id: "new-" + n, type: "hook", name: n, src: d.dest, event: ev, eventLabel: afterEdit ? "the agent edits a file" : "the agent finishes", command: cmd, path: file, desc: d.text, harness: { copilot: hz === "copilot" ? "yes" : "convert", claude: hz === "claude" ? "yes" : "convert", codex: "no" } } };
      }
      case "instruction": {
        const glob = /typescript|\bts\b|any/i.test(d.text) ? "**/*.ts" : /css/i.test(d.text) ? "**/*.css" : null;
        if (hz === "codex" && me) return { note: "Codex reads guidance from AGENTS.md in the repo. Pick This workspace to add it there.", blocked: true };
        const file = hz === "codex" ? "AGENTS.md (new section)" : hz === "claude" ? (me ? `~/.claude/rules/${n}.md` : `.claude/rules/${n}.md`) : (me ? `~/.copilot/instructions/${n}.instructions.md` : `.github/instructions/${n}.instructions.md`);
        const fm = hz === "codex" ? `## ${n}\n\n` : glob ? (hz === "claude" ? `---\npaths: ['${glob}']\n---\n\n` : `---\napplyTo: '${glob}'\n---\n\n`) : "";
        return { sentence: glob ? ["Adds ", h("span.tk", null, n), ` when the work touches ${C.describeGlob(glob) === glob ? glob : C.describeGlob(glob)}.`] : ["Every request includes ", h("span.tk", null, n), "."], file, body: fm + d.text.charAt(0).toUpperCase() + d.text.slice(1) + ".",
          note: "Instructions guide the agent; they don't guarantee it. A hook can run a check.", item: { id: "new-" + n, type: "instruction", mode: glob ? "glob" : "standing", applyTo: glob, name: n, src: d.dest, path: file, desc: d.text, harness: { copilot: hz === "claude" ? "convert" : "yes", claude: hz === "claude" ? "yes" : "convert", codex: glob ? "no" : "yes" } } };
      }
      case "skill": {
        const file = hz === "claude" ? (me ? `~/.claude/skills/${n}/SKILL.md` : `.claude/skills/${n}/SKILL.md`) : hz === "codex" ? (me ? `~/.agents/skills/${n}/SKILL.md` : `.agents/skills/${n}/SKILL.md`) : (me ? `~/.copilot/skills/${n}/SKILL.md` : `.github/skills/${n}/SKILL.md`);
        return { sentence: ["Can load ", h("span.tk", null, n), " when relevant, or with ", h("code", null, "/" + n), "."], file, body: `---\nname: ${n}\ndescription: ${d.text}\n---\n\n# ${n}\n\n1. …`,
          note: "The agent drafts the steps with you in a chat after you add it.", item: { id: "new-" + n, type: "skill", name: n, src: d.dest, path: file, desc: d.text, modelInvocable: true, userInvocable: true } };
      }
      case "automation": {
        if (hz !== "copilot") return { note: "Automations run on the Copilot agent host. Switch Applies to Copilot CLI to schedule one.", blocked: true };
        const day = (d.text.match(/monday|tuesday|wednesday|thursday|friday|saturday|sunday/i) || [])[0];
        const sched = day ? `${day[0].toUpperCase() + day.slice(1).toLowerCase()}s at 9:00` : /daily|every day/i.test(d.text) ? "Every day at 9:00" : /weekday/i.test(d.text) ? "Weekdays at 9:00" : "Mondays at 9:00";
        const name = d.text.replace(/\b(every|each|on)\b.*$/i, "").trim().replace(/^./, (c) => c.toUpperCase()) || "New automation";
        return { title: "Run a session on a schedule", sentence: [sched, ", ", h("span.tk", null, name), "."], file: "Automation", body: `Schedule: ${sched}\nWorkspace: vscode\nPrompt: ${d.text}`,
          note: day || /daily|every day|weekday/i.test(d.text) ? "Runs on this computer's agent host while it's awake." : "No day in your request, so this starts on Mondays. Change it before adding.",
          item: { id: "new-auto-" + n, type: "automation", name, src: "user", schedule: sched, desc: d.text, harness: { copilot: "yes", claude: "no", codex: "no" } } };
      }
      case "connection": {
        const svc = (d.text.match(/jira|linear|sentry|notion|figma|slack|confluence|datadog/i) || [])[0];
        if (!svc) return { note: "Pick a service from Add → Connect a Service.", blocked: true };
        const name = svc[0].toUpperCase() + svc.slice(1).toLowerCase();
        const existing = all().find((i) => i.type === "connector" && i.name.toLowerCase() === svc.toLowerCase());
        if (existing) return { title: `${name} is already added`, note: existing.state.auth === "signed-out" ? `${name} is signed out, so the agent can't use it yet.` : `${name} is connected.`, primary: existing.state.auth === "signed-out" ? "Sign In" : null, blocked: existing.state.auth !== "signed-out", act: () => { S.draft = null; fix(existing, "signin"); } };
        return { title: `Connect ${name}`, sentence: ["Uses your connected accounts for ", h("span.tk", null, name), "."], note: `${name} is a Copilot connector allowed by microsoft. The agent acts with your ${name} permissions.`, primary: "Connect",
          item: { id: "c-" + svc.toLowerCase(), type: "connector", name, src: "user", reach: "online", state: { auth: "signed-in", running: true }, desc: `Search and update ${name} as you.` } };
      }
    }
    return {};
  }
  function draftEl() {
    const d = S.draft; if (!d) return null;
    const p = d.kind ? draftParts(d) : {};
    const seg = (opts, val, set) => h("div.seg", null, opts.map(([k, l]) => h("button", { "aria-pressed": String(val === k), onclick: () => { set(k); render(); } }, l)));
    const ask = h("input.tf", { value: d.text, placeholder: "e.g. run the unit tests before the agent finishes", "aria-label": "What should change?", style: { flex: "1" },
      onkeydown: (e) => { if (e.key === "Enter") { d.text = e.target.value.trim(); d.kind = classify(d.text); render(); } } });
    setTimeout(() => { if (!d.text) ask.focus(); }, 0);
    return h("div.draft", null,
      h("div.draft-row", null, h("span.lbl", null, "Change"), ask, h("button.ib", { title: "Discard", onclick: () => { S.draft = null; render(); } }, icon("close"))),
      d.text ? h("div.draft-row", null, h("span.lbl", null, "Type"), seg(KINDS, d.kind, (k) => (d.kind = k))) : null,
      d.kind && !["automation", "connection"].includes(d.kind) ? h("div.draft-row", null, h("span.lbl", null, "For"), seg([["repo", "Everyone in vscode"], ["user", "Just me"]], d.dest, (k) => (d.dest = k))) : null,
      d.text && !d.kind ? h("div.draft-ask", null, "Which kind of change is this? Pick a type to see the draft.") : null,
      p.title && !p.sentence ? h("div.draft-title", null, p.title) : null,
      p.sentence ? h("div.draft-sentence", null, p.sentence) : null,
      p.file ? h("div.draft-file", null, h("div.fh", null, p.file), h("pre", { contenteditable: "true", spellcheck: "false", "aria-label": "Draft contents" }, p.body)) : null,
      p.note ? h("div.draft-note", null, p.note) : null,
      h("div.draft-foot", null, h("button.sb", { onclick: () => { S.draft = null; render(); } }, "Cancel"), (p.primary || !p.blocked) ? h("button.sb.primary", { disabled: !d.kind || (p.blocked && !p.act) || null, onclick: () => (p.act ? p.act() : accept(p)) }, p.primary || "Add") : null));
  }
  function compose() { S.draft = { text: "", kind: null, dest: "repo" }; render(); doc.scrollTop = 0; }
  function accept(p) {
    const it = p.item; it._new = true; it.enabled = true;
    const pre = doc.querySelector(".draft-file pre"); if (pre) it.body = pre.textContent;
    S.created.push(it); C.byId[it.id] = it; S.draft = null;
    render();
    const t = doc.querySelector(`.tk[data-id="${it.id}"]`); t && t.scrollIntoView({ block: "center" });
    setTimeout(() => (it._new = false), 50);
    toast(it.type === "connector" ? "Connected Jira as hawkticehurst@microsoft.com" : `Created ${it.path || it.name}`, "pass");
  }

  /* ── Header menus ───────────────────────────────────────────── */
  function menu(anchor, items, onPick, width = 280) {
    popover(anchor, h("div.menu", null, items.map((x) => x === "-" ? h("div.menu-sep") : h("div.menu-i" + (x[3] ? ".sub" : ""), { onclick: () => { closePop(); onPick(x[0]); } }, x[1] ? icon(x[1]) : null, h("span", null, x[2])))), { width });
  }
  function addMenu(e) {
    menu(e.currentTarget, [["d", "sparkle", "Describe It…"], "-", ["p", "plug", "Install a Plugin…"], ["m", "server", "Add an MCP Server…"], ["c", "link", "Connect a Service…"], ["s", "lightbulb", "Find Skills…"]],
      (k) => k === "d" ? compose() : toast({ p: "Opened plugins from microsoft's approved marketplaces", m: "Opened the MCP server gallery", c: "Opened Copilot connectors", s: "Opened skills from the GitHub feed" }[k], "add"), 240);
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function render() {
    const sc = doc.scrollTop;
    doc.replaceChildren(h("div.ch-inner", null, draftEl(), attentionEl(), paragraphs(), inactiveEl()));
    doc.scrollTop = sc;
    // Find and source filter.
    const q = S.q.toLowerCase();
    doc.querySelectorAll(".cl").forEach((cl) => {
      let hit = false;
      cl.querySelectorAll(".tk, .vrow").forEach((t) => { const m = !q || (t.dataset.q || "").includes(q); t.classList.toggle("miss", !m && t.classList.contains("vrow")); if (t.classList.contains("tk")) t.classList.toggle("fade", !m); hit = hit || m; });
      cl.classList.toggle("dim", !!q && !hit);
    });
    doc.querySelectorAll(".attn-r, .ina-r").forEach((r) => r.classList.toggle("miss", !!q && !r.textContent.toLowerCase().includes(q)));
  }

  function build(r) {
    root = r;
    const seg = h("div.seg", { role: "group", "aria-label": "Applies to" }, C.HARNESSES.map((x) =>
      h("button", { "aria-pressed": String(S.harness === x.id), "data-h": x.id, onclick: () => { S.harness = x.id; S.convertSel = null; seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.h === x.id))); document.querySelector("vsc-modal-editor").setAttribute("description", `(${x.label} · vscode)`); render(); } }, icon(x.icon), x.label)));
    doc = h("div.ch-doc");
    r.append(h("div.ch", null,
      h("header.ch-head", null,
        h("div.ch-find", null, icon("search"), h("input.tf", { placeholder: "Find", "aria-label": "Find", oninput: (e) => { S.q = e.target.value; render(); } })),
        h("span.grow"), h("span.lbl", null, "Applies to"), seg,
        h("button.sb.primary", { onclick: addMenu }, icon("add"), "Add")),
      doc));
    render();
  }

  window.CZUI.mount({ build });
})();
