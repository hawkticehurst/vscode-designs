/* "How it runs": the session's customizations along the agent loop (session start → each prompt → while the agent
   works → when it stops), with what they cost in context, what overrides what and what doesn't apply. Each row
   drills into its items (V2's overview → detail pattern). */
import { openMenu, toast } from "./panel-shell.js";
import { store, subscribe, renderScopeBar } from "./scope-store.js";
const { WORKSPACES, workspaceTitle } = window.SCOPE;
const { build } = window.LIFECYCLE;
const esc = window.CUST.esc;
const STAGE_ICON = { start: "debug-start", prompt: "comment", work: "gear", stop: "debug-stop" };

export function mountLifecycle(root, opts) {
  let scope = store.scope;
  root.innerHTML = `
    <div class="cp-stack lc-stack" data-depth="0">
      <div class="cp-view lc-home">
        <div class="ss-scope"></div>
        <div class="cp-scroll lc-scroll"></div>
        <div class="ss-footer">
          <button class="ss-foot-btn" data-act="browse"><span class="codicon codicon-compass" aria-hidden="true"></span>Browse</button>
          <button class="ss-foot-btn" data-act="library"><span class="codicon codicon-extensions" aria-hidden="true"></span>Open Library</button>
        </div>
      </div>
      <div class="cp-view lc-detail" aria-hidden="true">
        <header class="cp-header lc-detail-head">
          <vsc-toolbar label="Navigation"><vsc-action icon="arrow-left" label="Back (Esc)" data-back></vsc-action></vsc-toolbar>
          <h2 class="cp-title"><span class="lc-d-title"></span><span class="cp-count lc-d-count"></span></h2>
          <vsc-toolbar label="Actions"><vsc-action icon="extensions" label="Open in Customizations" data-act="library-type"></vsc-action></vsc-toolbar>
        </header>
        <p class="lc-d-intro"></p>
        <div class="cp-search"><vsc-input class="lc-d-q" placeholder="Filter"></vsc-input></div>
        <div class="cp-scroll lc-d-list"></div>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const stack = $(".lc-stack"), scroll = $(".lc-scroll");
  let model = null, current = null;
  // Per session ("new" until one starts): items turned off here, and callouts kept as they are.
  const perSession = new Map();
  const mine = () => { const k = store.session?.id || "new"; if (!perSession.has(k)) perSession.set(k, { off: new Set(), kept: new Set() }); return perSession.get(k); };

  const FLAG_ICON = { warn: "warning" };
  const flag = (f) => `<span class="lc-flag ${f.kind}">${FLAG_ICON[f.kind] ? `<span class="codicon codicon-${FLAG_ICON[f.kind]}" aria-hidden="true"></span>` : ""}${esc(f.text)}</span>`;
  const tokens = (n) => (n ? `<span class="lc-tok" title="Estimated tokens in every request">~${model.fmtTok(n)}</span>` : "");

  function render() {
    renderScopeBar($(".lc-home .ss-scope"), { new: "How customizations will apply to your new session", session: "How customizations apply to this session" });
    const { off, kept } = mine();
    model = build(scope, off);
    const full = off.size ? build(scope).budget.total : model.budget.total;
    const b = model.budget, pct = (n) => (b.total ? (n / b.total) * 100 : 0);
    let html = `<section class="lc-budget" aria-label="Context used before your first message">
      <div class="lc-budget-head"><span>${store.mode === "session" ? "Context added to every request" : "Context before your first message"}</span><span class="lc-budget-total">~${model.fmtTok(b.total)} tokens</span></div>
      <div class="lc-bar" role="img" aria-label="Instructions ${b.instructions}, skills ${b.skills}, tools ${b.tools} tokens">
        <span class="seg instr" style="width:${pct(b.instructions)}%"></span><span class="seg skills" style="width:${pct(b.skills)}%"></span><span class="seg tools" style="width:${pct(b.tools)}%"></span></div>
      <div class="lc-legend">
        <button class="lc-leg" data-go="always"><span class="dot instr"></span>Always-on instructions<span class="v">~${model.fmtTok(b.instructions)}</span></button>
        <button class="lc-leg" data-go="skills"><span class="dot skills"></span>Skill names and descriptions<span class="v">~${model.fmtTok(b.skills)}</span></button>
        <button class="lc-leg" data-go="tools"><span class="dot tools"></span>Tool definitions<span class="v">~${model.fmtTok(b.tools)}</span></button>
      </div>
      ${off.size ? `<div class="lc-budget-foot"><span>${off.size} turned off for this session · ~${model.fmtTok(full - b.total)} saved</span><button class="lc-link" data-act="reset-off">Turn all back on</button></div>` : ""}</section>`;
    const open = model.conflicts.filter((c) => !kept.has(c.id));
    if (open.length) {
      html += `<section class="lc-notes"><h3 class="ov-group-label">Overrides and overlaps</h3><div class="ov-list">${open.map((c) => `
        <div class="ov-row lc-note" role="button" tabindex="0" data-go="${c.go}">
          <span class="ov-text"><span class="ov-title">${esc(c.title)}</span><span class="ov-sub lc-wrap">${esc(c.detail)}</span></span>
          <span class="codicon codicon-chevron-right ov-chev" aria-hidden="true"></span></div>`).join("")}</div></section>`;
    }
    html += `<ol class="lc-timeline">${model.stages.map((s, i) => `
      <li class="lc-stage" data-stage="${s.id}">
        <div class="lc-stage-head"><span class="lc-node" aria-hidden="true"><span class="codicon codicon-${STAGE_ICON[s.id]}"></span></span>
          <span class="lc-stage-text"><span class="lc-stage-label">${i + 1}. ${esc(s.label)}</span><span class="lc-stage-sub">${esc(s.sub)}</span></span></div>
        <div class="ov-list">${s.rows.map((r) => r.empty
          ? `<div class="ov-row lc-empty"><span class="lc-empty-text">No ${esc(r.hook.label)} hooks</span>${model.hooksSupported
              ? `<button class="lc-add" data-add-hook="${r.hook.id}" title="${esc(r.hook.when)}"><span class="codicon codicon-add" aria-hidden="true"></span>Add hook</button>` : ""}</div>`
          : `<button class="ov-row" data-go="${r.id}">
              <span class="ov-text"><span class="ov-title-row"><span class="ov-title">${esc(r.title)}</span>${r.flags.map(flag).join("")}</span><span class="ov-sub">${esc(r.summary)}</span></span>
              ${tokens(r.tokens)}<span class="cp-count">${r.count}</span><span class="codicon codicon-chevron-right ov-chev" aria-hidden="true"></span></button>`).join("")}</div>
      </li>`).join("")}</ol>`;
    scroll.innerHTML = html;
    if (current) {
      const list = $(".lc-d-list"), top = list.scrollTop, q = $(".lc-d-q input")?.value || "";
      openDetail(current, false);
      if (q) { $(".lc-d-q input").value = q; $(".lc-d-q input").dispatchEvent(new Event("input", { bubbles: true })); }
      list.scrollTop = top;
    }
  }
  // The design system's switch (.monaco-switch): on = used in this session.
  const sw = (key, name, on) => `<button class="monaco-switch lc-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc((on ? "Turn off " : "Turn on ") + name + " for this session")}"
    title="${on ? "On for this session" : "Off for this session"}" data-toggle="${esc(key)}" data-label="${esc(name)}"><div class="monaco-switch-thumb"></div></button>`;
  const actionsHtml = (id, actions = []) => actions.length ? `<span class="lc-acts">${actions.map((a, i) =>
    `<button class="lc-act${i === 0 ? " primary" : ""}" data-resolve="${esc(id)}" data-i="${i}">${esc(a.label)}</button>`).join("")}</span>` : "";
  function resolveAction(id, i) {
    const c = model.conflicts.find((x) => x.id === id), a = c?.actions[i], { off, kept } = mine();
    if (!a) return;
    if (a.dismiss) { kept.add(id); render(); return; }
    a.off.forEach((k) => off.add(k));
    render();
    toast(a.done, ["Undo"], () => { a.off.forEach((k) => off.delete(k)); render(); });
  }
  function toggle(key, name) {
    const { off } = mine();
    if (off.has(key)) { off.delete(key); render(); return; }
    off.add(key);
    render();
    toast(`${name} is off for this session. Your other sessions still use it.`, ["Undo"], () => { off.delete(key); render(); });
  }

  const rowById = (id) => model.stages.flatMap((s) => s.rows).find((r) => r.id === id);
  // Clicking an item opens it in the Customizations modal (built-in agent and the like have nothing to open).
  const openAttrs = (it) => it.type ? ` role="button" tabindex="0" data-open-type="${esc(it.type)}" data-open-name="${esc(it.name)}" data-open-source="${esc(it.source || "")}" title="Open in Customizations"` : "";
  const STATE_NOTE = { overridden: "arrow-swap", unavailable: "circle-slash", off: "circle-slash" };
  function openDetail(id, animate = true) {
    const r = rowById(id);
    if (!r) return;
    current = id;
    if (!animate) stack.querySelectorAll(".cp-view").forEach((v) => (v.style.transition = "none"));
    $(".lc-d-title").textContent = r.title;
    $(".lc-d-count").textContent = r.count;
    $(".lc-d-intro").textContent = r.intro || "";
    $(".lc-d-q").querySelector("input") && ($(".lc-d-q").querySelector("input").value = "");
    // Items grouped by where they come from, in the order they apply.
    const groups = [];
    for (const it of r.rows) {
      const g = groups[groups.length - 1];
      if (g && g.source === it.source) g.items.push(it); else groups.push({ source: it.source, items: [it] });
    }
    // Overrides first: which copy of a name is used, and which one it replaces.
    const keep = (id, label, keptLabel) => mine().kept.has(id)
      ? `<div class="lc-ovr-foot"><span>${keptLabel}</span><button class="lc-link" data-unkeep="${esc(id)}">Undo</button></div>`
      : `<div class="lc-ovr-foot"><span>Hidden from the overview once you keep it.</span><button class="lc-link" data-resolve="${esc(id)}" data-i="${label}">Keep as is</button></div>`;
    // Overrides: the copy that's used and the one it replaces; "Use instead" switches them for this session.
    const ovr = (r.overrides || []).map((o) => `
      <div class="lc-item lc-ovr" data-name="${esc((o.name + " " + o.winnerWhen).toLowerCase())}">
        <div class="lc-ovr-name">${esc(o.name)}</div>
        <div class="lc-ovr-pair">
          <div class="lc-ovr-side win"${openAttrs({ type: "skills", name: o.name, source: o.winner })}>
            <div class="lc-ovr-text"><div class="lc-ovr-head"><span class="lc-ovr-src">${esc(o.winner)}</span><span class="lc-flag on">Used</span></div><div class="lc-item-when">${esc(o.winnerWhen)}</div></div></div>
          <div class="lc-ovr-side lose"${openAttrs({ type: "skills", name: o.name, source: o.loser })}>
            <div class="lc-ovr-text"><div class="lc-ovr-head"><span class="lc-ovr-src">${esc(o.loser)}</span><span class="lc-flag">Not used</span></div><div class="lc-item-when">${esc(o.loserWhen)}</div></div>
            <button class="lc-use" data-resolve="${esc(o.id)}" data-i="0" title="${esc(o.actions[0].label)}">Use instead</button></div>
        </div>${keep(o.id, 1, "Kept as is")}
      </div>`).join("");
    // Overlaps: each copy with its switch; turning one off resolves it.
    const ovl = (r.overlaps || []).map((o) => `
      <div class="lc-item lc-ovr">
        <div class="lc-ovr-name">${esc(o.title)}</div><div class="lc-item-when lc-ovr-detail">${esc(o.detail)}</div>
        <div class="lc-ovr-pair">${o.items.map((x) => `<div class="lc-ovr-side dup"${openAttrs(x)}>
          <div class="lc-ovr-text"><div class="lc-ovr-head"><span class="lc-ovr-src">${esc(x.source)}</span></div><div class="lc-ovr-item">${esc(x.name)}</div></div>${sw(x.key, x.name, true)}</div>`).join("")}</div>${keep(o.id, 2, "Kept both")}
      </div>`).join("");
    $(".lc-d-list").innerHTML = (ovl ? `<section class="lc-d-group lc-ovr-group"><h3 class="ov-group-label">Overlaps<span class="n">${r.overlaps.length}</span></h3><div class="ov-list">${ovl}</div></section>` : "") + (ovr ? `<section class="lc-d-group lc-ovr-group"><h3 class="ov-group-label">Overrides<span class="n">${r.overrides.length}</span></h3>
      <p class="lc-ovr-intro">Skills with the same name in more than one place. Only one is used.</p><div class="ov-list">${ovr}</div></section>` : "") + groups.map((g) => `<section class="lc-d-group"><h3 class="ov-group-label">${esc(g.source)}<span class="n">${g.items.length}</span></h3><div class="ov-list">${g.items.map((it) => `
      <div class="lc-item state-${it.state}" data-name="${esc((it.name + " " + (it.when || "")).toLowerCase())}"${openAttrs(it)}>
        <div class="lc-item-main">
          <div class="lc-item-name"><span class="nm">${esc(it.name)}</span>${it.active ? '<span class="lc-flag on"><span class="codicon codicon-check" aria-hidden="true"></span>Active</span>' : ""}${it.overriddenBy ? `<span class="lc-flag override">Overridden by ${esc(it.overriddenBy)}</span>` : ""}${it.overrides ? `<span class="lc-flag override">Overrides ${esc(it.overrides)}</span>` : ""}${it.dup ? '<span class="lc-flag warn"><span class="codicon codicon-warning" aria-hidden="true"></span>Duplicate tools</span>' : ""}</div>
          ${it.when ? `<div class="lc-item-when${it.mono ? " mono" : ""}">${esc(it.when)}</div>` : ""}
          ${it.note ? `<div class="lc-item-note"><span class="codicon codicon-${STATE_NOTE[it.state] || "info"}" aria-hidden="true"></span>${esc(it.note)}</div>` : ""}
        </div>${it.tokens ? `<span class="lc-tok">~${model.fmtTok(it.tokens)}</span>` : ""}${it.key && (it.state === "on" || it.userOff) ? sw(it.key, it.name, it.state === "on") : ""}
      </div>`).join("")}</div></section>`).join("");
    $(".lc-d-list").scrollTop = 0;
    stack.dataset.depth = "1";
    $(".lc-detail").removeAttribute("aria-hidden");
    if (!animate) requestAnimationFrame(() => stack.querySelectorAll(".cp-view").forEach((v) => (v.style.transition = "")));
  }
  function back() {
    if (stack.dataset.depth !== "1") return;
    stack.dataset.depth = "0";
    $(".lc-detail").setAttribute("aria-hidden", "true");
    const from = current;
    current = null;
    scroll.querySelector(`[data-go="${from}"]`)?.focus({ preventScroll: true });
  }

  subscribe((st) => { scope = st.scope; render(); });

  root.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add-hook]");
    if (add) {
      const ev = window.LIFECYCLE.HOOK_EVENTS.find((x) => x.id === add.dataset.addHook), ws = workspaceTitle(scope.workspace), dir = WORKSPACES[scope.workspace]?.label;
      const where = [...(WORKSPACES[scope.workspace] ? [{ label: `In ${ws} (.github/hooks/)`, where: "workspace" }] : []), { label: "For All Your Sessions (~/.copilot/hooks/)", where: "user" }];
      return openMenu(add, where, (it) => toast(`New ${ev.label} hook ${it.where === "user" ? "in ~/.copilot/hooks/. It runs in all your sessions" : `in ${dir}/.github/hooks/. It runs in every session in ${ws}`}, ${ev.when.toLowerCase()}.`));
    }
    const res = e.target.closest("[data-resolve]");
    if (res) { e.stopPropagation(); return resolveAction(res.dataset.resolve, +res.dataset.i); }
    const uk = e.target.closest("[data-unkeep]");
    if (uk) { mine().kept.delete(uk.dataset.unkeep); return render(); }
    const tg = e.target.closest("[data-toggle]");
    if (tg) return toggle(tg.dataset.toggle, tg.dataset.label);
    const open = e.target.closest("[data-open-type]");
    if (open) return opts.onOpenItem?.({ type: open.dataset.openType, name: open.dataset.openName, source: open.dataset.openSource });
    const go = e.target.closest("[data-go]");
    if (go) return openDetail(go.dataset.go);
    if (e.target.closest("[data-back]")) return back();
    const act = e.target.closest("[data-act]");
    if (!act) return;
    if (act.dataset.act === "browse") opts.onBrowse?.();
    else if (act.dataset.act === "library") opts.onLibrary?.();
    else if (act.dataset.act === "reset-off") { const { off } = mine(), was = [...off]; off.clear(); render(); toast("Everything is back on for this session.", ["Undo"], () => { was.forEach((k) => off.add(k)); render(); }); }
    else if (act.dataset.act === "library-type") {
      const type = { agent: "agents", always: "instructions", glob: "instructions", described: "instructions", skills: "skills", tools: "mcp" }[current] || (current?.startsWith("hook") ? "hooks" : null);
      opts.onLibrary?.(type);
    }
  });
  root.addEventListener("keydown", (e) => {
    const open = e.target.closest?.("[data-open-type], .lc-note");
    if (open && e.target === open && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open.click(); }
  });
  $(".lc-d-q").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    for (const g of root.querySelectorAll(".lc-d-group")) {
      let any = false;
      for (const it of g.querySelectorAll(".lc-item")) { const hit = !q || it.dataset.name.includes(q); it.hidden = !hit; any ||= hit; }
      g.hidden = !any;
      const n = g.querySelector(".ov-group-label .n");
      if (n) n.textContent = q ? g.querySelectorAll(".lc-item:not([hidden])").length : g.querySelectorAll(".lc-item").length;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!e.defaultPrevented && root.offsetParent && stack.dataset.depth === "1" && ((e.key === "Escape" && !e.target.closest?.("input") && !document.querySelector("vsc-menu")) || (e.altKey && e.key === "ArrowLeft"))) { e.preventDefault(); back(); }
  });

  render();
  return { openDetail };
}
