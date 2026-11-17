/* Placement 3 · Agent Profile. A permanent "Agent profile" destination at the top of the Agents window's sessions sidebar.
   It is a home for your defaults: what every new session in vscode starts with, per harness. You own the agent, your
   connections, hooks and additions; what this repo and microsoft provide sits behind disclosures. Changes save as you
   make them and apply to new sessions only. Each session captures the configuration it started from. */
(function () {
  const { h, icon, srcGlyph, switchEl, closePop, toast } = window.CZUI;
  const C = window.CZ;
  const ORG = C.ORG.name;

  // Popovers close when the page scrolls, but not from the scroll that brings their anchor into view.
  let popAt = 0;
  const popover = (...a) => { popAt = Date.now(); return window.CZUI.popover(...a); };

  /* ── State ──────────────────────────────────────────────────── */
  // One profile per harness: the default agent and per-item "default for new sessions" overrides.
  const S = {
    view: "profile", session: null, harness: "copilot", composerHarness: null,
    p: Object.fromEntries(C.HARNESSES.map((x) => [x.id, { agent: "default", en: {} }])),
    open: new Set(), created: [], flash: null, savedFlash: false,
  };
  const HL = (hz = S.harness) => C.HARNESSES.find((x) => x.id === hz).label;
  const all = () => C.items.concat(S.created);

  const isRead = (it, hz = S.harness) => !it.duplicateOf && C.supported(it, hz);
  const onIn = (it, prof) => (it.id in prof.en ? prof.en[it.id] : it.enabled !== false);
  const required = (it) => it.locked === "required" || (!!it.via && C.byId[it.via].locked === "required");
  const isOn = (it, hz = S.harness) => required(it) || onIn(it, S.p[hz]);
  const overridden = (it, hz = S.harness) => it.id in S.p[hz].en && S.p[hz].en[it.id] !== (it.enabled !== false);
  const blocked = (it) => it.locked === "blocked";
  const signedOut = (it) => it.state && it.state.auth === "signed-out";
  const needsEnv = (it) => it.state && it.state.auth === "env";
  const personal = (it) => !required(it) && (it.src === "user" || it.src === "plugin");
  // Session-scoped kinds of customization (automations have their own agent templates and aren't part of this).
  const SESSION_TYPES = ["instruction", "skill", "agent", "hook", "toolset", "mcp", "connector", "extension", "canvas"];

  const BUILTIN = { copilot: "Copilot", claude: "Claude Code", codex: "Codex" };
  const AGENTS = (hz = S.harness) => [{ id: "default", name: "Default", desc: `${BUILTIN[hz]}'s built-in agent: plans, edits and runs tools in the workspace.`, builtin: true }]
    .concat(all().filter((i) => i.type === "agent" && i.userInvocable !== false && !required(i) && !(i.convertedTo && i.convertedTo[hz]) && (!i.convertedFrom || isRead(i, hz))));
  const agentById = (id, hz) => AGENTS(hz).find((a) => a.id === id) || AGENTS(hz)[0];

  // A tool an agent lists that no installed server provides (Data lists azure-mcp/kusto_query).
  const missingTools = (a) => (a.tools || []).filter((t) => t.startsWith("azure-mcp/") && !all().some((i) => i.provides === "azure-mcp"));

  /* ── Snapshots: the effective configuration a session starts from ── */
  // Captured: the agent and every customization the harness reads and the profile turns on, each with a version of its
  // content (path, applyTo, command, tools, plugin version…), so a running session keeps exactly what it started with.
  // Not captured: sign-in state and organization policy. Those are live, so an older session always uses the current ones.
  const version = (it) => JSON.stringify([it.path, it.mode, it.applyTo, it.command, it.event, it.matcher, Array.isArray(it.tools) ? it.tools : null, it.model,
    it.modelInvocable, it.userInvocable, it.version, it.via ? C.byId[it.via].version : null]);
  function snap(hz) {
    const prof = S.p[hz];
    const agent = agentById(prof.agent, hz);
    return { harness: hz, agent: agent.id, agentV: agent.builtin ? "" : version(agent),
      items: new Map(all().filter((i) => SESSION_TYPES.includes(i.type) && i.type !== "agent" && isRead(i, hz) && isOn(i, hz) && !blocked(i)).map((i) => [i.id, version(i)])) };
  }
  const same = (a, b) => a.harness === b.harness && a.agent === b.agent && a.agentV === b.agentV && a.items.size === b.items.size && [...a.items].every(([id, v]) => b.items.get(id) === v);
  const noun = (it) => it.name + (it.type === "hook" ? " hook" : "");
  // How a session's snapshot differs from the current profile, from the session's point of view.
  function differs(then, now) {
    const out = [];
    if (then.agent !== now.agent) out.push(`${agentById(then.agent, then.harness).name} agent`);
    else if (then.agentV !== now.agentV) out.push(`an earlier ${agentById(then.agent, then.harness).name} agent`);
    const plugins = new Set();
    for (const [id, v] of then.items) {
      const it = C.byId[id];
      if (!now.items.has(id)) out.push("with " + noun(it));
      else if (now.items.get(id) !== v) {
        // Items a plugin adds changed together when the plugin updated: name the plugin version the session started with.
        const was = JSON.parse(v).at(-1);
        if (it.via && was !== C.byId[it.via].version) { if (!plugins.has(it.via)) { plugins.add(it.via); out.push(`${C.byId[it.via].name} ${was}`); } }
        else out.push("an earlier " + noun(it));
      }
    }
    for (const id of now.items.keys()) if (!then.items.has(id)) out.push("without " + noun(C.byId[id]));
    return out;
  }
  // What a new session starts with, in a few words: agent · connections · hooks · what you turned off.
  function summary(sn) {
    const its = [...sn.items.keys()].map((id) => C.byId[id]);
    const names = (l, max) => (l.length > max ? l.slice(0, max).join(", ") + ` +${l.length - max}` : l.join(", "));
    const conns = its.filter((i) => (i.type === "mcp" || i.type === "connector") && !required(i)).map((i) => i.name);
    const hooks = its.filter((i) => i.type === "hook" && !required(i)).map((i) => i.name);
    const off = all().filter((i) => SESSION_TYPES.includes(i.type) && i.type !== "agent" && !required(i) && !blocked(i) && isRead(i, sn.harness) && !sn.items.has(i.id)
      && (personal(i) || overridden(i, sn.harness))).map((i) => i.name);
    const out = [agentById(sn.agent, sn.harness).name];
    if (conns.length) out.push(names(conns, 3));
    if (hooks.length) out.push(hooks.length === 1 ? hooks[0] + " hook" : hooks.join(" and ") + " hooks");
    if (off.length) out.push("without " + names(off, 2));
    return out;
  }

  /* ── Saving ─────────────────────────────────────────────────── */
  // Changes save as you make them; a brief "Saved" confirms it.
  let savedTimer;
  function saved() {
    S.savedFlash = true;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { S.savedFlash = false; const el = body && body.querySelector(".saved"); if (el) el.remove(); }, 2200);
  }
  function setOn(it, v) { S.p[S.harness].en[it.id] = v; saved(); render(); }
  function setAgent(id) { S.p[S.harness].agent = id; saved(); render(); }

  /* ── Rows ───────────────────────────────────────────────────── */
  const HOOK_DESC = { "h-cloud": "When a session starts, sets up the environment (Linux cloud sandboxes only)", "h-build": "When the agent finishes, runs a fast worktree build" };
  function row(it, opts = {}) {
    const T = C.TYPES[it.type];
    const status = [];
    if (signedOut(it)) status.push(h("span.st-warn", null, "Signed out"), h("button.sb", { onclick: () => fix(it, "signin") }, "Sign In"));
    if (needsEnv(it)) status.push(h("span.st-warn", null, "Needs SEMGREP_APP_TOKEN"), h("button.sb", { onclick: (e) => envPrompt(e.currentTarget, it) }, "Set Token…"));
    const name = h("button.row-name", { onclick: (e) => inspect(it, e.currentTarget) }, it.name);
    return h("div.row" + (S.flash === it.id ? ".flash" : "") + (opts.readOnly || isOn(it) ? "" : ".is-off"), { "data-id": it.id },
      icon(T.icon),
      h("div.row-main", null, name, h("span.row-d", null, it.type === "hook" ? HOOK_DESC[it.id] || `When ${it.eventLabel}` : it.desc)),
      opts.showSrc && it.src !== "user" ? srcGlyph(it) : h("span"),
      status.length ? h("span.row-st", null, status) : h("span"),
      opts.readOnly ? h("span") : switchEl(isOn(it), (v) => setOn(it, v), { label: "On for new sessions: " + it.name }));
  }
  function rows(list) {
    const showSrc = new Set(list.map((i) => (i.via ? i.via : i.src))).size > 1;
    return h("div.rows", null, list.map((i) => row(i, { showSrc })));
  }
  function disclosure(key, label, meta, content) {
    const open = S.open.has(key);
    return h("div.disc", null,
      h("button.disc-t", { "aria-expanded": String(open), onclick: () => { open ? S.open.delete(key) : S.open.add(key); render(); } }, icon(open ? "chevron-down" : "chevron-right"), h("span", null, label), meta ? h("span.disc-m", null, meta) : null),
      open ? h("div.disc-b", null, content()) : null);
  }
  function inventory(list, when) {
    return h("div.vlist", null, list.map((it) => {
      const r = h("div.vrow", null, h("button.row-name", { onclick: (e) => inspect(it, e.currentTarget) }, it.name), h("span.d", null, when(it)),
        switchEl(isOn(it), (v) => setOn(it, v), { label: "On for new sessions: " + it.name }));
      return r;
    }));
  }

  /* ── Chapters ───────────────────────────────────────────────── */
  const ADD = { guidance: ["Add Guidance", "Opened a chat that drafts guidance with you"], skills: ["Add Skill", "Opened a chat that drafts a skill with you"],
    tools: ["Connect a Service", `Opened Copilot connectors allowed by ${ORG}`], hooks: ["Add Hook", "Opened a chat that drafts a hook with you"] };
  function chapter(id, title, mine, inv) {
    if (!mine.length && !inv) return null;
    const [addLabel, addToast] = ADD[id];
    return h("section.ch", { "data-ch": id },
      h("div.ch-h", null, h("h2", null, title), h("button.ch-add", { onclick: () => toast(addToast, "add") }, icon("add"), addLabel)),
      mine.length ? rows(mine) : h("p.ch-empty", null, "Nothing of yours yet."),
      inv);
  }
  const read = (pred) => all().filter((i) => pred(i) && isRead(i) && !blocked(i) && !(i.convertedTo && i.convertedTo[S.harness]));
  const whenGuide = (i) => i.mode === "standing" || i.applyTo === "**" ? "Every request" : i.mode === "glob" ? "When the work touches " + C.describeGlob(i.applyTo) : "Listed; read when relevant";
  const whenSkill = (s) => s.modelInvocable ? s.desc : h("span", null, "Only with ", h("code", null, "/" + s.name));

  function guidance() {
    const inv = read((i) => i.type === "instruction" && !required(i) && !personal(i) && !overridden(i));
    const mine = read((i) => i.type === "instruction" && (personal(i) || overridden(i)));
    const order = { standing: 0, glob: 1, listed: 2 };
    inv.sort((a, b) => order[a.mode] - order[b.mode]);
    return chapter("guidance", "Guidance", mine, inv.length ? disclosure("guidance", "Everything this repo provides", inv.length === 1 ? "1 instruction" : `${inv.length} instructions`, () => inventory(inv, whenGuide)) : null);
  }
  function skills() {
    const inv = read((i) => i.type === "skill" && !required(i) && !personal(i) && !overridden(i));
    const mine = read((i) => i.type === "skill" && (personal(i) || overridden(i)));
    return chapter("skills", "Skills", mine, inv.length ? disclosure("skills", "Everything this repo provides", inv.length === 1 ? "1 skill" : `${inv.length} skills`, () => [
      h("p.disc-note", null, "Available to the agent; the model decides when to load one."), inventory(inv, whenSkill)]) : null);
  }
  function tools() {
    const mine = read((i) => ((i.type === "mcp" || i.type === "connector") || (["toolset", "extension", "canvas"].includes(i.type) && overridden(i))) && !required(i));
    const inv = read((i) => ["toolset", "extension", "canvas"].includes(i.type) && !required(i) && !overridden(i));
    return chapter("tools", "Connections", mine, inv.length ? disclosure("tools", "Built-in tools, extensions and canvases", null, () => inventory(inv, (i) => i.desc)) : null);
  }
  function hooks() {
    return chapter("hooks", "Hooks", read((i) => i.type === "hook" && !required(i)), null);
  }

  function orgLine() {
    const req = all().filter((i) => SESSION_TYPES.concat("plugin").includes(i.type) && i.locked === "required" && isRead(i));
    const top = req.filter((i) => !i.via), parts = req.filter((i) => i.via);
    const blockedItems = all().filter(blocked);
    return disclosure("org", `Required by ${ORG}`, top.map((i) => i.name).join(", "), () => [
      h("div.rows.ro", null, top.concat(parts).map((i) => row(i, { readOnly: true }))),
      h("p.disc-note", null, `${ORG} allows only approved MCP servers and plugin marketplaces`, blockedItems.length ? `, so ${blockedItems.map((i) => i.name).join(", ")} doesn't start` : "", ". You can't turn these off.")]);
  }

  function inactiveReason(it) {
    if (it.convertedTo && it.convertedTo[S.harness]) return `Converted; ${HL()} uses ${it.convertedTo[S.harness]}`;
    if (it.duplicateOf) return `Same name as ${C.byId[it.duplicateOf].path}, which is found first`;
    const note = it.harness && it.harness.note, v = it.harness && it.harness[S.harness];
    // Notes name the harness they're about; only use one that's about this harness (or about none in particular).
    if (note && note.includes(HL().split(" ")[0])) return note;
    if (v === "convert") return `${HL()} uses its own format; can be converted`;
    if (note && !/Claude|Codex/.test(note)) return note;
    return `Not read by ${HL()}`;
  }
  function inactiveLine() {
    const list = all().filter((i) => !required(i) && !blocked(i) && !i.convertedFrom && SESSION_TYPES.concat("prompt").includes(i.type) && (!isRead(i) || (i.convertedTo && i.convertedTo[S.harness])));
    if (!list.length) return null;
    const groups = new Map();
    for (const i of list) { const r = inactiveReason(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); }
    const convertible = list.filter((i) => i.harness && i.harness[S.harness] === "convert" && !(i.convertedTo && i.convertedTo[S.harness]));
    const names = (l) => l.length <= 3 ? l.map((i) => i.name).join(", ") : `${l.slice(0, 2).map((i) => i.name).join(", ")} and ${l.length - 2} more`;
    return disclosure("inactive", `Not read by ${HL()}`, null, () => [
      h("div.ina-list", null, [...groups.entries()].map(([reason, l]) => h("div.ina-r", { title: l.map((i) => i.path || i.name).join("\n") }, h("span", null, names(l)), h("span.d", null, reason)))),
      convertible.length ? h("div.ina-actions", null, h("button.sb", { onclick: () => convertAll(convertible) }, `Make ${HL()} Copies of ${convertible.length}`),
        h("span.muted", null, "Copies go in its format; the originals stay where they are.")) : null]);
  }
  function destFor(it, hz) {
    const n = it.name.replace(/\.md$/, "");
    if (hz === "claude") return { instruction: `.claude/rules/${n}.md`, hook: ".claude/settings.json", agent: `.claude/agents/${n}.md`, prompt: `.claude/commands/${n}.md`, skill: `~/.claude/skills/${n}/SKILL.md` }[it.type] || `.claude/${n}`;
    if (hz === "copilot") return { prompt: `~/.copilot/skills/${n}/SKILL.md` }[it.type] || n;
    return n;
  }
  function convertAll(list) {
    const hz = S.harness;
    for (const it of list) {
      const path = destFor(it, hz);
      const copy = Object.assign({}, it, { id: it.id + "@" + hz, path, type: it.type === "prompt" && hz !== "claude" ? "skill" : it.type, harness: { copilot: "no", claude: "no", codex: "no", [hz]: "yes" }, convertedFrom: it.id });
      if (copy.type === "skill" && it.type === "prompt") { copy.modelInvocable = false; copy.userInvocable = true; }
      it.convertedTo = Object.assign(it.convertedTo || {}, { [hz]: path });
      S.created.push(copy); C.byId[copy.id] = copy;
    }
    saved(); render();
    toast(`Made ${HL()} copies of ${list.length} customizations; the originals stay in place`, "arrow-swap");
  }

  /* ── Needs attention ────────────────────────────────────────── */
  // Only problems with required dependencies. Problems with a default you chose show in place (a signed-out connection
  // in its row, a missing tool under the agent picker); problems with things you don't use aren't raised.
  function attention() {
    const out = [];
    for (const it of all()) {
      if (!required(it) || !isRead(it)) continue;
      if (needsEnv(it)) out.push({ it, text: `${it.name} can't start`, sub: "it needs SEMGREP_APP_TOKEN", acts: [["Set Token…", (e) => envPrompt(e.currentTarget, it)]] });
      else if (signedOut(it)) out.push({ it, text: `${it.name} is signed out`, sub: "", acts: [["Sign In", () => fix(it, "signin")]] });
    }
    return out;
  }
  function attentionLine() {
    const list = attention(); if (!list.length) return null;
    const conn = list.every((a) => a.it.type === "mcp" || a.it.type === "connector");
    const label = `${list.length} ${conn ? (list.length === 1 ? "connection needs" : "connections need") : list.length === 1 ? "item needs" : "items need"} attention`;
    return h("div.attn", null, disclosure("attn", label, null, () => list.map((a) => h("div.attn-r", null, icon("warning"), h("div.t", null, a.text, a.sub ? h("span", null, " · " + a.sub) : null), a.acts.map(([l, fn]) => h("button.sb", { onclick: fn }, l))))));
  }

  /* ── Header ─────────────────────────────────────────────────── */
  function header() {
    const prof = S.p[S.harness];
    const cur = agentById(prof.agent);
    const missing = cur.builtin ? [] : missingTools(cur);
    const seg = h("div.seg", { role: "group", "aria-label": "Profile for" }, C.HARNESSES.map((x) =>
      h("button", { "aria-pressed": String(S.harness === x.id), onclick: () => setHarness(x.id) }, icon(x.icon), x.label)));
    return h("header.pf-head", null,
      h("div.pf-top", null,
        h("h1", null, `Your defaults for ${HL()} sessions in vscode`),
        h("div.pf-for", null, h("span.lbl", null, "Profile for"), seg)),
      h("p.pf-sub", null, "Every new session starts from these. Running sessions keep what they started with."),
      h("div.pf-agent", null,
        h("span.lbl", null, "Default agent"),
        h("button.dd", { "aria-haspopup": "menu", onclick: (e) => agentMenu(e.currentTarget) }, icon("agent"), h("span", null, cur.name), icon("chevron-down")),
        S.savedFlash ? h("span.saved", { role: "status" }, icon("check"), "Saved") : null),
      missing.length ? h("div.agent-warn", null, icon("warning"), h("span", null, `${cur.name} lists ${missing.join(", ")}, which nothing provides.`),
        h("button.sb", { onclick: () => fix(cur, "install") }, "Install Azure MCP"), h("button.sb", { onclick: () => fix(cur, "rmtool") }, `Remove from ${cur.name}`)) : null);
  }

  // Menus: Enter/Space choose, arrows move, Escape closes and returns focus to the button.
  function menuKeys(menu, anchor) {
    const items = () => [...menu.querySelectorAll(".menu-i:not(.disabled)")];
    menu.addEventListener("keydown", (e) => {
      const list = items(), i = list.indexOf(document.activeElement);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); const n = list.length; list[(i + (e.key === "ArrowDown" ? 1 : -1) + n) % n].focus(); }
      else if (e.key === "Home" || e.key === "End") { e.preventDefault(); list[e.key === "Home" ? 0 : list.length - 1].focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); }
      else if (e.key === "Escape") { closePop(); anchor.focus(); }
      else if (e.key === "Tab") { closePop(); }
    });
    setTimeout(() => (menu.querySelector(".menu-i[aria-checked='true']:not(.disabled)") || items()[0]).focus(), 0);
  }
  function agentMenu(anchor) {
    const prof = S.p[S.harness];
    const menu = h("div.menu", { role: "menu", "aria-label": "Default agent" }, AGENTS().map((a) => {
      const ok = a.builtin || isRead(a);
      return h("div.menu-i.tall" + (ok ? "" : ".disabled"), { role: "menuitemradio", "aria-checked": String(prof.agent === a.id), "aria-disabled": ok ? null : "true", tabindex: ok ? "-1" : null,
        onclick: () => { if (!ok) return; closePop(); anchor.focus(); if (prof.agent !== a.id) setAgent(a.id); } },
        h("span.chk", null, prof.agent === a.id ? icon("check") : null),
        h("div.mi-t", null, h("span", null, a.name), h("small", null, ok ? a.desc : inactiveReason(a))));
    }));
    popover(anchor, menu, { width: 340 });
    menuKeys(menu, anchor);
  }

  /* ── Inspector ──────────────────────────────────────────────── */
  function whenText(it) {
    switch (it.type) {
      case "instruction": return it.mode === "standing" || it.applyTo === "**" ? "Attached to every request" : it.mode === "glob" ? h("span", null, "Attached when the work touches ", h("code", null, it.applyTo)) : "Listed; the agent reads it when relevant";
      case "skill": return it.modelInvocable ? (it.userInvocable ? h("span", null, "Available; the model decides. Or type ", h("code", null, "/" + it.name)) : "Available; the model decides") : h("span", null, "Only when you type ", h("code", null, "/" + it.name));
      case "agent": return it.userInvocable === false ? "When another agent delegates to it" : "When it's the session's agent";
      case "hook": return h("span", null, it.eventLabel[0].toUpperCase() + it.eventLabel.slice(1), " (", h("code", null, it.event), ")");
      case "plugin": return "Adds the items listed with it";
      case "canvas": return "When the agent opens it";
      default: return it.reach === "online" ? "When the agent calls it, as you" : "When the agent calls it";
    }
  }
  function stateText(it) {
    if (!it.state) return null;
    if (signedOut(it)) return h("span.st-warn", null, "Signed out");
    if (needsEnv(it)) return h("span.st-warn", null, "Needs SEMGREP_APP_TOKEN");
    if (it.state.auth === "signed-in") return it.account ? "Signed in as " + it.account : "Signed in";
    return it.state.running ? "Running" : "Starts when a tool is first used";
  }
  function inspect(it, anchor) {
    const T = C.TYPES[it.type];
    const readers = C.HARNESSES.filter((x) => isRead(it, x.id)).map((x) => x.label);
    const acts = [];
    if (it.update) acts.push(h("button.sb", { onclick: () => fix(it, "update") }, `Update to ${it.update}`));
    if (it.path && !it.via && !["Organization policy", "Built-in"].includes(it.path)) acts.push(h("button.sb", { onclick: () => { closePop(); toast("Opened " + it.path, "go-to-file"); } }, "Open"));
    const via = it.via ? C.byId[it.via] : null;
    const st = stateText(it);
    popover(anchor, h("div", null,
      h("div.ins-h", null, icon(T.icon), h("div.t", null, h("b", null, it.name), h("small", null, T.label)), srcGlyph(it)),
      it.desc ? h("p.ins-d", null, it.desc) : null,
      h("dl.ins-k", null,
        h("dt", null, "When"), h("dd", null, whenText(it)),
        st ? [h("dt", null, "State"), h("dd", null, st)] : null,
        it.command ? [h("dt", null, "Runs"), h("dd", null, h("code", null, it.command))] : null,
        it.type === "agent" && it.tools ? [h("dt", null, "Tools"), h("dd", null, it.tools.join(", "))] : null,
        [h("dt", null, "From"), h("dd", null, via ? `${via.name} plugin` : it.path ? h("span.mono", null, it.path) : C.SOURCES[it.src].label)],
        readers.length < C.HARNESSES.length ? [h("dt", null, "Read by"), h("dd", null, readers.join(", ") || "None")] : null),
      acts.length || required(it) ? h("div.ins-f", null, required(it) ? h("span.ctl.muted", null, icon("lock"), "Required by " + ORG) : null, h("span.grow"), acts) : null), { width: 360 });
  }

  function envPrompt(anchor, it) {
    const inp = h("input.tf", { type: "password", placeholder: "Paste the token", "aria-label": "SEMGREP_APP_TOKEN", style: { width: "100%" } });
    const save = () => { if (!inp.value.trim()) { inp.focus(); return; } fix(it, "env"); };
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
    popover(anchor, h("div", null, h("b", null, "SEMGREP_APP_TOKEN"), h("p.muted.pop-note", null, "Saved to your user secrets and passed to the Semgrep server when it starts."), inp,
      h("div.pop-actions", null, h("button.sb", { onclick: closePop }, "Cancel"), h("button.sb.primary", { onclick: save }, "Save"))), { width: 320 });
    setTimeout(() => inp.focus(), 0);
  }
  function fix(it, what) {
    closePop();
    if (what === "signin") { it.state.auth = "signed-in"; it.state.running = true; it.status = null; it.account = "hawkticehurst"; S.flash = it.id; toast(`Signed in to ${it.name}`, "pass"); }
    else if (what === "env") { it.state.auth = "none"; it.status = null; S.flash = it.id; toast("Saved SEMGREP_APP_TOKEN to your user secrets", "key"); }
    else if (what === "rmtool") { it.tools = it.tools.filter((t) => !t.startsWith("azure-mcp/")); it.status = null; saved(); toast(`Removed azure-mcp/kusto_query from ${it.path}`, "pass"); }
    else if (what === "install") {
      // Installs the server that provides the tool; the agent keeps its tool reference.
      const srv = { id: "m-azure", type: "mcp", name: "Azure MCP", src: "user", provides: "azure-mcp", transport: "stdio", command: "npx -y @azure/mcp@latest server start", path: "~/Library/.../mcp.json", reach: "machine",
        state: { configured: true, trusted: true, enabled: true, auth: "none", running: false }, tools: 34, enabled: true, desc: "Azure resources and data, including Kusto queries.", harness: { copilot: "yes", claude: "yes", codex: "yes" } };
      if (!C.byId[srv.id]) { S.created.push(srv); C.byId[srv.id] = srv; }
      it.status = null; S.flash = srv.id; saved();
      toast(`Installed Azure MCP; ${it.name} can use kusto_query`, "cloud-download");
    }
    else if (what === "update") { it.version = it.update; it.update = null; it.status = null; toast(`Updated ${it.name} to ${it.version}`, "pass"); }
    render();
  }

  /* ── Profile page ───────────────────────────────────────────── */
  let scroller = null, body = null;
  function buildProfile() {
    body = h("div.pf-wrap");
    scroller = h("div.pf-scroll", { onscroll: () => { if (Date.now() - popAt > 300) closePop(); } }, body);
    return h("div.cz.pf", null, scroller);
  }
  function setHarness(hz) { S.harness = hz; renderSidebar(); render(); }
  function render() {
    if (!body) return;
    const sc = scroller.scrollTop;
    body.replaceChildren(...[header(), attentionLine(), guidance(), skills(), tools(), hooks(), h("div.pf-foot", null, orgLine(), inactiveLine())].filter(Boolean));
    scroller.scrollTop = sc;
    const f = body.querySelector(".flash"); if (f) { const r = f.getBoundingClientRect(), sr = scroller.getBoundingClientRect(); if (r.top < sr.top || r.bottom > sr.bottom) f.scrollIntoView({ block: "center" }); }
    S.flash = null;
  }

  /* ── Sessions ───────────────────────────────────────────────── */
  const initial = snap("copilot");
  const SESSIONS = [
    { id: "focus", group: "Today", label: "Fix focus ring in customization cards", snap: initial, time: "11:42 AM",
      prompt: "The focus ring on customization cards is clipped by the card's overflow. Fix it.",
      steps: [["book-compact", "Read", "customizationCardList.ts"], ["edit-compact", null, "aiCustomizationManagement.css", 6, 2]],
      reply: "The focus ring now uses an inset outline, so the card's overflow no longer clips it." },
    { id: "telemetry", group: "Today", label: "Telemetry: how often is the modal opened?", snap: initial, time: "10:05 AM",
      prompt: "How often is the Customizations modal opened per day on Insiders?",
      steps: [["tools", "Ran a Kusto query"]],
      reply: "About 41k opens a day over the last week; 62% come from the sessions sidebar link." },
    { id: "triage", group: "Today", icon: "calendar", label: "Triage new issues", snap: initial, automation: true, time: "9:00 AM",
      prompt: "Group new issues from the last day and draft labels.",
      steps: [["tools", "Ran the issue-grouping skill"], ["tools", "Searched issues on GitHub"]],
      reply: "Grouped 14 new issues into 5 themes and drafted labels for 11 of them." },
    { id: "perf", group: "Yesterday", label: "Chat perf check", snap: initial, time: "Yesterday",
      prompt: "Run the chat perf benchmark against Insiders and report regressions.",
      steps: [["tools", "Ran the chat-perf skill"]],
      reply: "No regressions. Median render time is 212 ms, 3% faster than last week." },
    { id: "skills", group: "Yesterday", label: "Agent host: sync user skills", snap: initial, time: "Yesterday",
      prompt: "Sync user skills to the agent host when it starts.",
      steps: [["book-compact", "Read", "agentHostCustomizations.ts"], ["edit-compact", null, "agentHostCustomizations.ts", 38, 4]],
      reply: "Skills under ~/.copilot/skills now sync when the agent host starts. I added a test for the startup path." },
  ];
  let seq = 0;

  let aw, entry;
  function renderSidebar() {
    entry.classList.toggle("active", S.view === "profile");
    entry.setAttribute("aria-current", S.view === "profile" ? "page" : "false");
    entry.querySelector(".pf-entry-sub").textContent = "vscode · " + HL();
    const groups = ["Today", "Yesterday"].map((g) => ({ group: g, items: SESSIONS.filter((s) => s.group === g).map((s) => ({ id: s.id, icon: s.running ? "loading" : s.icon || "pass", label: s.label })) }));
    aw.renderSide(groups, S.view === "session" ? S.session : null);
    aw.side.querySelectorAll(".codicon-loading").forEach((i) => i.classList.add("codicon-modifier-spin"));
  }

  function show(view, id) {
    closePop();
    S.view = view; S.session = id || null;
    renderSidebar();
    if (view === "profile") { aw.page.replaceChildren(buildProfile()); render(); return; }
    body = null; scroller = null;
    aw.page.replaceChildren(view === "new" ? newSessionView() : sessionView(SESSIONS.find((s) => s.id === id)));
  }
  function editProfile(hz) { S.harness = hz; show("profile"); }

  // "Starts from your profile: Reviewer · Figma, Playwright, Sprue · build hook · without Slack · Edit profile"
  function inheritLine(hz) {
    const bits = summary(snap(hz));
    return h("div.inherit", null,
      h("span", null, "Starts from your profile: "), h("span.inh-bits", null, bits.join(" · ")),
      h("span.sep", { "aria-hidden": "true" }, "·"),
      h("button.link", { onclick: () => editProfile(hz) }, "Edit profile"));
  }

  function newSessionView() {
    const hz = S.composerHarness || S.harness;
    const line = h("div.inherit-slot", null, inheritLine(hz));
    const input = h("vsc-chat-input", { variant: "new-session", workspace: "vscode", harness: hz, isolation: "worktree" });
    input.addEventListener("change", (e) => {
      if (e.detail && e.detail.harness) { S.composerHarness = e.detail.harness; line.replaceChildren(inheritLine(e.detail.harness)); }
      if (e.detail && e.detail.workspace) line.hidden = e.detail.workspace !== "vscode";
    });
    const send = () => {
      const text = (input.querySelector(".dt-editor-text") || {}).textContent || "";
      if (!text.trim()) return;
      startSession(text.trim(), input.getAttribute("harness") || hz);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && e.target.closest(".dt-editor-text")) { e.preventDefault(); send(); } });
    input.addEventListener("click", (e) => { if (e.target.closest("vsc-chat-submit")) send(); });
    return h("vsc-session-view", { variant: "new" },
      h("div.new-session-welcome-message", null, h("h2.new-session-welcome-message-title", null, "What should we work on in vscode?")),
      line, input);
  }

  function startSession(prompt, hz) {
    const s = { id: "new-" + ++seq, group: "Today", label: prompt.length > 48 ? prompt.slice(0, 46) + "…" : prompt, snap: snap(hz), time: "Now", prompt, running: true,
      steps: [["search-compact", "Searched the workspace"]], reply: null };
    SESSIONS.unshift(s);
    show("session", s.id);
    setTimeout(() => {
      s.running = false;
      s.reply = s.snap.agent === "a-reviewer" ? "I'll review the current diff for correctness, disposables, layering and accessibility, then hand off anything to fix." : "On it. I'll start by reading the relevant code.";
      if (S.view === "session" && S.session === s.id) show("session", s.id); else renderSidebar();
    }, 2600);
  }

  function sessionView(s) {
    const steps = s.steps.map(([ic, text, file, added, removed]) => h("vsc-chat-tool-call", { icon: ic, file: file || null, edit: added != null ? "" : null, added: added != null ? String(added) : null, removed: removed != null ? String(removed) : null, running: s.running ? "" : null }, text || ""));
    const hz = s.snap.harness;
    let note = null;
    // Automations start from their own agent template, not from the profile.
    if (!s.automation) {
      const then = s.snap, now = snap(hz);
      if (!same(then, now)) {
        const d = differs(then, now);
        const shown = d.length > 3 ? d.slice(0, 3).concat(`${d.length - 3} more`) : d;
        note = h("div.inherit", { title: "Sign-ins and organization policy aren't part of the snapshot; they're always current." },
          h("span", null, "Started from an earlier profile: "), h("span.inh-bits", null, shown.join(", ")),
          h("span.sep", { "aria-hidden": "true" }, "·"), h("button.link", { onclick: () => editProfile(hz) }, "View current profile"));
      } else if (s.id.startsWith("new-")) note = h("div.inherit", null, h("span", null, "Started from your profile: "), h("span.inh-bits", null, summary(then).join(" · ")));
    }
    return h("div.pf-session", null,
      h("div.s-head", null, h("h2", null, s.label)),
      h("div.s-chat", null, h("vsc-chat-view", null,
        h("vsc-chat-request", { timestamp: s.time }, s.prompt),
        h("vsc-chat-response", null, h("vsc-chat-tool-chain", null, steps), s.reply ? h("vsc-chat-markdown", null, s.reply) : null))),
      h("div.s-composer", null, note, h("vsc-session-view", null, h("vsc-chat-input", { variant: "session", harness: hz, "context-usage": s.running ? "6" : "14" }))));
  }

  /* ── Boot ───────────────────────────────────────────────────── */
  entry = h("button.aw-row.pf-entry", { onclick: () => show("profile") }, icon("agent"),
    h("span.pf-entry-t", null, h("span", null, "Agent profile"), h("span.pf-entry-sub", null, "vscode · Copilot CLI")));
  aw = window.CZUI.agentsWindow({ sidebarTop: entry, onSession: (id) => show("session", id), onNew: () => { S.composerHarness = null; show("new"); } });
  show("profile");
})();
