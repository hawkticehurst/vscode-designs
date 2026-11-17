/* Placement 1 · Turn Zero — "this session". What a new session starts with is a one-line summary above the composer;
   expanding it shows the setup as short state labels, each adjustable for this session. Sending the first request turns
   the same line into the transcript's first entry, pinned at the top. The setup visibly shapes the first response. */
(function () {
  const { h, icon, srcGlyph, switchEl, popover, closePop, toast, agentsWindow } = window.CZUI;
  const C = window.CZ;

  const S = {
    phase: "new", harness: "copilot", workspace: "vscode", environment: "local",
    agent: null, off: new Set(), expanded: false, turns: 0, title: null,
  };
  const HL = (id = S.harness) => C.HARNESSES.find((x) => x.id === id).label;

  // Built-in capabilities, controllable per session (the tool sets an agent's `tools:` list names).
  const CAPS = [
    { id: "cap-edit", type: "toolset", cap: true, name: "edit files", short: "edit", toolIds: ["edit"], src: "builtin", desc: "Create and edit files in the workspace." },
    { id: "cap-term", type: "toolset", cap: true, name: "terminal", short: "terminal", toolIds: ["execute"], src: "builtin", desc: "Run commands in a terminal." },
    { id: "cap-read", type: "toolset", cap: true, name: "read and search", short: "read", toolIds: ["read", "search"], src: "builtin", desc: "Read files and problems; search files, text and symbols." },
  ];
  const get = (id) => C.byId[id] || CAPS.find((c) => c.id === id);
  const CONNECTIONS = ["m-github", "c-workiq", "c-slack", "c-figma", "m-playwright", "m-sprue", "m-semgrep", "m-browsertools"].map((id) => C.byId[id]);

  /* ── Effective state ────────────────────────────────────────── */
  const inWs = (it) => it.src !== "repo" || S.workspace === "vscode";
  const reads = (it) => !it.harness || C.supported(it, S.harness);
  const configured = (it) => inWs(it) && reads(it) && !it.duplicateOf;
  const live = (it) => configured(it) && it.enabled !== false && it.locked !== "blocked";
  const pick = (pred) => C.items.filter((i) => pred(i) && live(i));
  const agent = () => (S.agent && live(C.byId[S.agent]) ? C.byId[S.agent] : null);
  const allows = (it) => {
    const a = agent(); if (!a || !a.tools || !(it.cap || it.type === "mcp" || it.type === "connector")) return true;
    if (it.toolIds) return a.tools.some((t) => it.toolIds.some((k) => t === k || t.startsWith(k + "/")));
    return a.tools.includes(it.name.toLowerCase().replace(/\s+/g, "") + "/*");
  };
  // One availability predicate for connections: enabled, signed in / configured, allowed by policy.
  const unavailableReason = (c) => c.locked === "blocked" ? "Blocked by microsoft's MCP allowlist" : c.enabled === false ? "Turned off"
    : c.state.auth === "signed-out" ? "Signed out" : c.state.auth === "env" ? "Needs SEMGREP_APP_TOKEN" : null;
  const available = (it) => it.cap || (configured(it) && !unavailableReason(it));
  const usable = (it) => available(it) && allows(it) && !S.off.has(it.id);
  const shownConnections = () => CONNECTIONS.filter((c) => configured(c) && !unavailableReason(c));
  const unavailable = () => CONNECTIONS.filter((c) => configured(c) && unavailableReason(c) && allows(c));
  const needsSetup = () => unavailable().filter((c) => c.locked !== "blocked" && c.enabled !== false);
  const blocked = () => unavailable().filter((c) => c.locked === "blocked");
  const setupLabel = (n) => `${n} ${n === 1 ? "needs" : "need"} sign-in or setup`;
  const hooks = () => C.items.filter((i) => i.type === "hook" && configured(i) && i.enabled !== false && (i.id !== "h-cloud" || S.environment === "cloud"));
  const everyRequest = (i) => i.mode === "standing" || (i.mode === "glob" && i.applyTo === "**");
  const HOOK_WHEN = { postToolUse: "after each edit", sessionStart: "at session start", agentStop: "when the agent finishes" };
  function notRead() {
    const mirror = { claude: "agents-md", copilot: "claude-md", codex: "claude-md" }[S.harness];
    return C.items.filter((i) => ["instruction", "skill", "agent", "hook", "prompt"].includes(i.type) && inWs(i) && i.enabled !== false && !i.duplicateOf && i.id !== mirror && !reads(i));
  }

  /* ── Tokens and popovers ────────────────────────────────────── */
  const join = (nodes, last = ", ") => nodes.flatMap((n, i) => (i === 0 ? [n] : [i === nodes.length - 1 ? last : ", ", n]));
  function tk(key, label, onOpen, opts = {}) {
    const cls = "span.tk" + (opts.off ? ".off" : "") + (opts.na ? ".na" : "") + (opts.warn ? ".warn" : "");
    const t = h(cls, { tabindex: "0", role: "button", "aria-haspopup": "dialog", "data-key": key, title: opts.title || null,
      "aria-label": opts.off ? label + ", off for this session" : opts.na ? label + ", " + opts.title : null }, opts.warn ? icon("warning") : null, label);
    const go = (e) => { e.stopPropagation(); onOpen(t); };
    t.addEventListener("click", go);
    t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });
    return t;
  }
  const itemTk = (it, label) => tk(it.id, label || it.name, (a) => inspect(it, a), { off: S.off.has(it.id), na: !allows(it), title: !allows(it) ? `Not in ${agent().name}'s tools` : S.off.has(it.id) ? "Off for this session" : null });
  const pop = (anchor, kids, width = 320) => popover(anchor, h("div.cz.tzp", null, kids), { width });

  // Rerender the setup but keep the open popover (and the focus inside it) pinned to the rebuilt anchor.
  function refresh(key) {
    render();
    const p = document.querySelector(".pop"), a = key && document.querySelector(`.tz [data-key="${key}"]`);
    if (!p || !a) return;
    const r = a.getBoundingClientRect(), pr = p.getBoundingClientRect();
    p.style.left = Math.min(Math.max(8, r.left), innerWidth - pr.width - 8) + "px";
    p.style.top = (r.bottom + 6 + pr.height > innerHeight - 8 ? Math.max(8, r.top - pr.height - 6) : r.bottom + 6) + "px";
  }
  const toggleOff = (it, v) => { v ? S.off.delete(it.id) : S.off.add(it.id); };

  function whenText(it) {
    if (it.cap) return "Built in; the agent uses it when a step needs it";
    switch (it.type) {
      case "instruction": return everyRequest(it) ? "Attached to every request" : it.mode === "glob" ? h("span", null, "Attached when files in context match ", h("code", null, it.applyTo)) : "Listed; the model reads it when it's relevant";
      case "skill": return it.modelInvocable ? "Listed; the model may load it when relevant" : h("span", null, "Only with ", h("code", null, "/" + it.name));
      case "hook": return h("span", null, "Runs ", HOOK_WHEN[it.event] || "when " + it.eventLabel, it.condition ? ", " + it.condition : "");
      default: return it.reach === "online" ? (it.account ? `Acts as ${it.account}` : "Acts with your account") : "Runs on this computer";
    }
  }
  function inspect(it, anchor) {
    const key = anchor.dataset.key;
    const T = C.TYPES[it.type];
    let control;
    if (it.locked === "required") control = h("span.tzp-lock", null, icon("lock"), "Required by microsoft");
    else {
      const lbl = h("span", null, S.off.has(it.id) ? "Off for this session" : "On for this session");
      control = h("label.tzp-sw", null, switchEl(!S.off.has(it.id), (v) => { toggleOff(it, v); lbl.textContent = v ? "On for this session" : "Off for this session"; refresh(key); }, { label: "Use " + it.name + " in this session" }), lbl);
    }
    pop(anchor, [
      h("div.tzp-h", null, icon(T.icon), h("b", null, it.cap ? it.name[0].toUpperCase() + it.name.slice(1) : it.name), it.src !== "repo" && !it.cap ? srcGlyph(it) : null),
      it.desc ? h("p.tzp-d", null, it.desc) : null,
      h("div.tzp-when", null, whenText(it)),
      !allows(it) ? h("div.tzp-when", null, `${agent().name} doesn't use it.`) : null,
      h("div.tzp-f", null, control, h("span.grow"),
        it.cap ? null : h("button.sb", { onclick: () => { closePop(); toast(it.path && !it.via && !["Organization policy", "Built-in"].includes(it.path) ? "Opened " + it.path : `Opened ${it.name} in Customizations`, "go-to-file"); } }, "Open")),
    ]);
  }
  // A disclosure token: its items, each with a session switch and when it applies.
  function groupPop(anchor, title, items, when) {
    const key = anchor.dataset.key;
    pop(anchor, [
      h("div.tzp-h", null, h("b", null, title)),
      h("div.tzp-list", null, items.map((it) => {
        const row = h("div.tzp-row" + (S.off.has(it.id) ? ".off" : ""), null,
          h("button.tzp-n", { title: it.desc || it.name, onclick: (e) => inspect(it, e.currentTarget) }, h("span.nm", null, it.name), h("span.wh", null, when(it))),
          it.locked === "required" ? h("span.tzp-lock", { title: "Required by microsoft" }, icon("lock")) :
            switchEl(!S.off.has(it.id), (v) => { toggleOff(it, v); row.classList.toggle("off", !v); refresh(key); }, { label: "Use " + it.name + " in this session" }));
        return row;
      })),
    ], 360);
  }
  function agentPop(anchor) {
    const choices = [{ id: null, name: "Default agent", desc: `${HL()}'s built-in agent, with every tool.` }].concat(pick((i) => i.type === "agent" && i.userInvocable !== false));
    pop(anchor, [
      h("div.tzp-list", { role: "listbox", "aria-label": "Agent for this session" }, choices.map((c) => {
        const sel = (S.agent || null) === c.id;
        return h("button.tzp-opt" + (sel ? ".sel" : ""), { role: "option", "aria-selected": String(sel), onclick: (e) => { S.agent = c.id; closePop(); render(); const t = document.querySelector('.tz [data-key="agent"]'); if (t && !e.detail) t.focus(); } },
          icon(sel ? "check" : "blank"), h("span.t", null, h("span", null, c.name), h("small", null, c.desc), c.tools && c.id ? h("small", null, "Tools: " + c.tools.join(", ")) : null, c.status === "warn" ? h("small.st-warn", null, c.statusText) : null));
      })),
    ], 340);
    const s = document.querySelector(".pop .tzp-opt.sel"); s && s.focus();
  }
  function unavailablePop(anchor) {
    const list = needsSetup();
    pop(anchor, [
      h("div.tzp-h", null, h("b", null, "Needs sign-in or setup")),
      h("div.tzp-list", null, list.map((c) => {
        const r = unavailableReason(c);
        const act = c.state.auth === "signed-out" ? h("button.link", { onclick: () => fix(c, "signin") }, "Sign In")
          : h("button.link", { onclick: () => { closePop(); toast(`Opened ${c.name} setup`, "gear"); } }, "Set up…");
        return h("div.tzp-row", null, h("span.tzp-n.static", null, h("span.nm", null, c.name), h("span.wh", null, r)), act);
      })),
    ], 340);
  }

  /* ── The setup: one line, expandable to short state labels ──── */
  function row(label, ...body) { return h("div.tz-row", null, h("div.tz-k", null, label), h("div.tz-v", null, body)); }
  const dot = () => h("span.sep", null, "·");

  function body() {
    const a = agent();
    const ins = pick((i) => i.type === "instruction");
    const standing = ins.filter(everyRequest), more = ins.filter((i) => !everyRequest(i));
    const skills = pick((i) => i.type === "skill");
    const auto = skills.filter((s) => s.modelInvocable), manual = skills.filter((s) => !s.modelInvocable);
    const conns = shownConnections(), un = needsSetup(), bl = blocked(), hk = hooks(), nr = notRead();
    const offCount = (l) => l.filter((i) => S.off.has(i.id)).length;
    return h("div.tz-body", null,
      h("div.tz-rows", null,
        row("Agent", tk("agent", a ? a.name : "Default agent", agentPop)),
        row("Guidance", join(standing.map((i) => itemTk(i))),
          more.length ? [dot(), tk("guides", `${more.length} more when relevant`, (t) => groupPop(t, "Guidance when relevant", more, (i) => i.mode === "glob" ? C.describeGlob(i.applyTo) : "when the model decides"), { off: offCount(more) === more.length })] : null),
        row("Skills", auto.length ? tk("skills", `${auto.length} available`, (t) => groupPop(t, "Skills the model may load", auto, () => ""), { off: offCount(auto) === auto.length }) : h("span.muted", null, "None"),
          manual.length ? [dot(), tk("skills-manual", `${manual.length} only with /name`, (t) => groupPop(t, "Skills that load only with /name", manual, (s) => "/" + s.name), { off: offCount(manual) === manual.length })] : null),
        row("Tools", join(CAPS.map((c) => itemTk(c))), conns.length ? [dot(), join(conns.map((c) => itemTk(c)))] : null,
          un.length ? [dot(), tk("unavail", setupLabel(un.length), unavailablePop, { warn: true })] : null,
          bl.length ? h("span.muted.nowrap", null, dot(), bl.map((c) => c.name).join(", ") + " blocked by microsoft") : null),
        row("Hooks", hk.length ? join(hk.map((i) => [itemTk(i), h("span.muted", null, " " + (HOOK_WHEN[i.event] || "when " + i.eventLabel))])) : h("span.muted", null, `None in ${HL()}`))),
      h("div.tz-foot", null,
        S.phase === "session" ? h("span", null, "Changes apply from your next request.") : null,
        nr.length ? h("span", { title: nr.map((i) => i.name).join(", ") }, `${nr.length} ${nr.length === 1 ? "item isn't" : "items aren't"} read by ${HL()}`) : null));
  }

  function summaryParts() {
    const a = agent();
    const changed = CAPS.concat(C.items).filter((i) => S.off.has(i.id) && (i.cap || configured(i)) && allows(i)).map((i) => i.cap ? i.short : i.name);
    const parts = [a ? a.name : "Default agent"];
    if (changed.length) parts.push(changed.join(", ") + " off");
    return parts;
  }
  function setup() {
    const un = needsSetup();
    const line = h("button.tz-line", { "aria-expanded": String(S.expanded), onclick: (e) => { S.expanded = !S.expanded; closePop(); render(); if (S.expanded && scroller && S.phase === "session") scroller.scrollTop = 0; const l = document.querySelector(".tz-line"); if (l && !e.detail) l.focus(); } },
      icon(S.expanded ? "chevron-down" : "chevron-right"),
      h("span.tz-line-k", null, S.phase === "new" ? "Starts with" : "Session setup"),
      h("span.tz-line-t", null, summaryParts().map((p, i) => [i ? dot() : null, h("span", null, p)])),
      un.length ? h("span.tz-line-w", null, icon("warning"), setupLabel(un.length)) : null);
    return h("section.tz" + (S.expanded ? ".open" : ""), { "aria-label": "Session setup" }, line, S.expanded ? body() : null);
  }

  /* ── Fixes ──────────────────────────────────────────────────── */
  function fix(it, what) {
    if (what === "signin") { it.state.auth = "signed-in"; it.state.running = true; it.status = null; it.account = "hawkticehurst"; toast(`Signed in to ${it.name}`, "pass"); }
    closePop(); render();
    const a = document.querySelector('.tz [data-key="unavail"]');
    if (a) { unavailablePop(a); const b = document.querySelector(".pop button"); b && b.focus(); }
  }

  /* ── Transcript: the first reply follows the setup ──────────── */
  const SUGGESTED = "Review my changes to customizationCardList.ts for focus handling";
  const now = () => new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const call = ([ic, html, file, added, removed], running) => ic === "edit"
    ? h("vsc-chat-tool-call", { edit: true, icon: "pencil", file, added, removed, running: running || null })
    : h("vsc-chat-tool-call", { icon: ic, file: file || null, running: running || null, html });

  function firstReply() {
    const can = (id) => usable(get(id));
    const read = can("cap-read"), term = can("cap-term"), edit = can("cap-edit") && read, gh = can("m-github"), slack = can("c-slack");
    const semgrep = hooks().find((x) => x.id === "h-semgrep" && !S.off.has(x.id));
    const steps = [];
    if (term) steps.push(["terminal-compact", "Ran <code>git diff main -- src/vs/workbench/contrib/chat/browser/aiCustomization</code>"]);
    if (gh) steps.push(["tools", term ? "Got pull request <strong>#284113</strong> from GitHub" : "Got pull request <strong>#284113</strong> and its diff from GitHub"]);
    if (read) steps.push(["book-compact", "Read", "customizationCardList.ts"], ["search-compact", "Searched for <code>focus</code> in <code>aiCustomization/</code>, 14 results"], ["book-compact", "Read", "aiCustomizationManagement.css"]);
    if (slack) steps.push(["tools", "Searched Slack for <code>customization cards focus</code>, 1 thread"]);
    if (edit) {
      steps.push(["edit", "", "aiCustomizationManagement.css", 3, 1]);
      if (semgrep) steps.push(["zap", "Ran hook <strong>semgrep-on-edit</strong>, no findings"]);
    }
    if (!read) return { steps, md: "<p>Reading and searching files is off for this session, so I can't review the code itself." +
      (gh ? " PR #284113 changes <code>customizationCardList.ts</code> and <code>aiCustomizationManagement.css</code>." : "") + " Turn <strong>read and search</strong> back on in the session setup and ask again.</p>" };
    const a = agent();
    let tail;
    if (edit) tail = "<p>I fixed issue 2 in <code>aiCustomizationManagement.css</code> since it's a one-line change. Issues 1 and 3 change behavior, so I left them. Want me to fix them too?</p>";
    else if (a && !allows(get("cap-edit"))) tail = `<p>${a.name} doesn't edit files, so nothing changed. Use <strong>${(a.handoffs && a.handoffs[0].label) || "a handoff"}</strong> to hand these to the default agent.</p>`;
    else tail = "<p>Editing files is off for this session, so nothing changed.</p>";
    return { steps, md: "<p>Two issues in the focus handling, and one nit:</p><ol>" +
      "<li><strong>Focus is lost on re-render.</strong> <code>renderCards()</code> calls <code>replaceChildren()</code> without restoring focus, so after toggling a card keyboard users land on <code>body</code>. Remember the focused card's id and refocus it after rendering.</li>" +
      "<li><strong>The focus ring is hidden.</strong> <code>.customization-card:focus { outline: none; }</code> removes it for keyboard users too. Use <code>:focus-visible</code> with <code>--vscode-focusBorder</code>.</li>" +
      "<li><strong>Nit:</strong> the card's <code>keydown</code> listener isn't registered with <code>this._register()</code>, so it outlives the list.</li></ol>" +
      (slack ? "<p>This matches the #vscode-ux thread from Tuesday that asked for <code>:focus-visible</code> on these cards.</p>" : "") +
      (gh ? "<p>PR #284113 has no open review threads on these lines.</p>" : "") + tail };
  }
  const laterReply = () => ({ steps: [], md: "<p>This prototype scripts only the first request.</p>" });

  let wbParts, page, scroller, transcript, composer, newSlot;
  function send(text) {
    text = (text || "").trim(); if (!text) return;
    closePop();
    if (S.phase === "new") startSession(text); else appendTurn(text);
  }
  function wireComposer(input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && e.target.classList && e.target.classList.contains("dt-editor-text")) { e.preventDefault(); send(e.target.textContent); }
    }, true);
    input.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("vsc-chat-submit");
      if (b && !b.hasAttribute("disabled")) { const t = input.querySelector(".dt-editor-text"); send(t && t.textContent); }
    });
  }
  function startSession(text) {
    S.phase = "session"; S.expanded = false;
    S.title = /review/i.test(text) ? "Review focus handling in customizationCardList.ts" : text.length > 48 ? text.slice(0, 46) + "…" : text;
    renderSide();
    transcript = h("div.tz-transcript");
    scroller = h("div.tz-scroll", null, h("div.tz-col", null, h("div.tz-zero"), transcript));
    composer = h("vsc-chat-input", { variant: "session", harness: S.harness, "context-usage": "9" });
    wireComposer(composer);
    page.replaceChildren(h("div.cz.tz-sess", null, scroller, h("div.tz-dock", null, h("vsc-session-view", null, composer))));
    render();
    appendTurn(text);
  }
  function appendTurn(text) {
    const reply = S.turns++ === 0 ? firstReply() : laterReply();
    const respSlot = h("div");
    transcript.append(h("div.tz-turn", null, h("vsc-chat-view", null, h("vsc-chat-request", { timestamp: now() }, text)), respSlot));
    const t = composer && composer.querySelector(".dt-editor-text"); if (t) { t.textContent = ""; t.dispatchEvent(new Event("input")); }
    let i = 0;
    const step = () => {
      const done = i >= reply.steps.length;
      const chain = reply.steps.length ? h("vsc-chat-tool-chain", null, reply.steps.slice(0, Math.min(i + 1, reply.steps.length)).map((st, k) => call(st, !done && k === i))) : null;
      respSlot.replaceChildren(h("vsc-chat-view", null, h("vsc-chat-response", null, chain, done ? h("vsc-chat-markdown", { html: reply.md }) : null)));
      scroller.scrollTop = scroller.scrollHeight;
      if (!done) { i++; setTimeout(step, 480); }
    };
    setTimeout(step, 300);
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function render() {
    const slot = S.phase === "new" ? newSlot : page.querySelector(".tz-zero");
    slot.classList.toggle("expanded", S.expanded);
    slot.replaceChildren(setup());
  }

  const SESSIONS = () => [
    { group: "Today", items: (S.title ? [{ id: "current", label: S.title }] : []).concat([
      { id: "focus", icon: "pass", label: "Fix focus ring in customization cards" },
      { id: "telemetry", icon: "pass", label: "Telemetry: how often is the modal opened?" },
      { id: "triage", icon: "calendar", label: "Triage new issues" }]) },
    { group: "Yesterday", items: [
      { id: "perf", icon: "calendar", label: "Chat perf check" },
      { id: "sync", icon: "pass", label: "Agent host: sync user skills" },
      { id: "hover", icon: "pass", label: "Hover delay in customization list" }] },
  ];
  function renderSide() {
    wbParts.renderSide(SESSIONS(), S.phase === "session" ? "current" : null);
    const ic = S.phase === "session" && wbParts.side.querySelector(".aw-row.active .codicon");
    if (ic) ic.className = "codicon codicon-circle-filled tz-live";
  }
  function newSession() {
    S.phase = "new"; S.turns = 0; S.title = null; S.expanded = false; S.off.clear(); S.agent = null; scroller = null;
    renderSide();
    newSlot = h("div.tz-slot");
    const input = h("vsc-chat-input", { variant: "new-session", harness: S.harness, workspace: S.workspace, environment: S.environment });
    input.addEventListener("change", (e) => {
      const d = e.detail || {};
      if (d.harness) { S.harness = d.harness; if (S.agent && !live(C.byId[S.agent])) S.agent = null; }
      if (d.workspace) S.workspace = d.workspace;
      if (d.environment) S.environment = d.environment;
      if (d.harness || d.workspace || d.environment) { closePop(); render(); }
    });
    wireComposer(input);
    const sugg = h("div.tz-sugg", null, h("button.tz-sugg-b", { onclick: () => send(SUGGESTED) }, icon("comment"), h("span", null, SUGGESTED)));
    page.replaceChildren(h("div.cz.tz-new", null, h("div.tz-col", null, newSlot, h("vsc-session-view", { variant: "new" }, input), sugg)));
    render();
  }

  wbParts = agentsWindow({ sessions: SESSIONS(), onNew: newSession, onSession: (id) => { if (id !== "current") toast("Only the new session is part of this prototype", "info"); } });
  page = wbParts.page;
  newSession();
})();
