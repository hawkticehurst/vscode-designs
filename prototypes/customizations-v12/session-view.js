/* "This session": the customizations a session uses, grouped by where they're defined (workspace, user, plugins,
   built-in) in precedence order, plus what doesn't apply and why. The scope comes from scope-store.js: the
   composer's pickers for a new session, fixed for an open one. */
import { filterList, openMenu, toast } from "./panel-shell.js";
import { store, subscribe, renderScopeBar } from "./scope-store.js";
const { TYPES, SOURCES, HARNESSES, ENVIRONMENTS, WORKSPACES, resolve, type: typeOf, workspaceLabel, workspaceTitle } = window.SCOPE;
const esc = window.CUST.esc;
const keyOf = (it) => `${it.source}:${it.type}:${it.name}`;
const withAttrs = (html, attrs) => html.replace(/^<([a-z-]+)/, (m) => m + " " + Object.entries(attrs).filter(([, v]) => v != null).map(([k, v]) => v === true ? k : `${k}="${esc(v)}"`).join(" "));
const asItem = (it, badge) => `<vsc-customization-item ${Object.entries({ name: it.name, path: it.path, icon: typeOf(it.type).icon, badge }).map(([k, v]) => `${k}="${esc(v || "")}"`).join(" ")} data-key="${esc(keyOf(it))}"></vsc-customization-item>`;

export function mountSession(root, opts) {
  let scope = store.scope;
  // Turned-off items, per session ("new" until one starts): key -> "session" | "everywhere".
  const offs = new Map();
  const off = () => { const k = store.session?.id || "new"; if (!offs.has(k)) offs.set(k, new Map()); return offs.get(k); };
  root.innerHTML = `
    <div class="ss-scope"></div>
    <div class="cp-search"><vsc-input class="ss-q" placeholder="Search this session's customizations"></vsc-input></div>
    <div class="cp-scroll ss-scroll"><div class="ai-customization-management-editor cust-flow ss-flow"></div><div class="cp-empty" hidden></div></div>
    <div class="ss-footer"${opts.footer === false ? " hidden" : ""}>
      <button class="ss-foot-btn" data-act="browse"><span class="codicon codicon-compass" aria-hidden="true"></span>Browse</button>
      <button class="ss-foot-btn" data-act="library"><span class="codicon codicon-library" aria-hidden="true"></span>${esc(opts.libraryLabel || "Open Library")}</button>
    </div>`;
  const flow = root.querySelector(".ss-flow"), empty = root.querySelector(".cp-empty");
  let query = "";
  const folded = new Map(); // section id or "section/group" -> collapsed (kept across re-renders)
  const remember = () => {
    for (const sec of flow.querySelectorAll(".ss-sec")) {
      folded.set(sec.dataset.src, sec.hasAttribute("data-collapsed"));
      for (const g of sec.querySelectorAll("vsc-customization-group")) folded.set(sec.dataset.src + "/" + g.getAttribute("label"), g.hasAttribute("collapsed"));
    }
  };


  function lists(rows, { badge, collapseOver = 5, src } = {}) {
    let html = "", prompts = "";
    for (const t of TYPES) {
      const of = rows.filter((it) => it.type === t.id);
      if (!of.length) continue;
      const group = (first) => `<vsc-customization-group label="${t.label}" count="${of.length}" icon="${t.icon}" actions=""${first ? " first" : ""}${(folded.get(src + "/" + t.label) ?? of.length > collapseOver) ? " collapsed" : ""}></vsc-customization-group>`;
      const rowHtml = of.map((it) => {
        const o = off().get(keyOf(it));
        if (badge || t.kind === "prompts") return asItem(it, badge ? it.blocked.badge : o === "session" ? "Off in this session" : o === "everywhere" ? "Off everywhere" : "");
        return withAttrs(it.html.replace(/ enabled(="")?/, o ? "" : "$&"), { "data-key": keyOf(it) });
      }).join("");
      if (badge || t.kind === "prompts") prompts += group(!prompts) + rowHtml;
      else html += `<vsc-customization-list kind="${t.kind}">${group(true)}${rowHtml}</vsc-customization-list>`;
    }
    if (prompts) html += `<vsc-customization-list kind="prompts">${prompts}</vsc-customization-list>`;
    return html;
  }

  function section(id, { icon, label, sub, count, body, add, muted, collapsed }) {
    collapsed = folded.get(id) ?? collapsed;
    return `<section class="cp-sec ss-sec${muted ? " ss-muted" : ""}" data-src="${id}"${collapsed ? " data-collapsed" : ""}>
      <div class="cp-sec-head" role="button" tabindex="0" aria-expanded="${!collapsed}">
        <span class="codicon codicon-chevron-down cp-twist" aria-hidden="true"></span><span class="codicon codicon-${icon} cp-sec-icon" aria-hidden="true"></span>
        <span class="cp-sec-label">${esc(label)}</span>${count != null ? `<span class="cp-count">${count}</span>` : ""}<span class="grow"></span>
        ${add ? `<vsc-toolbar label="${esc(label)} Actions"><vsc-action icon="add" label="${esc(add)}" data-add="${id}"></vsc-action></vsc-toolbar>` : ""}
      </div>
      ${sub ? `<p class="ss-sub">${sub}</p>` : ""}
      <div class="cust-list-wrap">${body}</div>
    </section>`;
  }

  function render() {
    remember();
    renderScopeBar(root.querySelector(".ss-scope"), { new: "Your new session will use", session: "This session uses" });
    const { applies, excluded } = resolve(scope);
    const h = HARNESSES[scope.harness], env = ENVIRONMENTS[scope.environment];
    const by = (src) => applies.filter((it) => it.source === src);
    const ws = WORKSPACES[scope.workspace];
    let html = "";
    if (scope.workspace === "chat") {
      html += section("workspace", { icon: "folder", label: "No workspace", sub: "Pick a folder to use the customizations in it, like a repo's skills and AGENTS.md.", body: "" });
    } else {
      const rows = by("workspace");
      html += section("workspace", { icon: "folder", label: workspaceTitle(scope.workspace), count: rows.length, add: `New in ${workspaceTitle(scope.workspace)}...`,
        sub: `Only in sessions in this workspace${ws ? ` · <span class="ss-path">${esc(ws.path)}</span>` : ""}`,
        body: rows.length ? lists(rows, { src: "workspace" }) : `<p class="ss-none">No customizations in ${esc(workspaceTitle(scope.workspace))} yet. Add skills, instructions or an AGENTS.md to share them with everyone who works here.</p>` });
    }
    for (const src of ["user", "plugin", "builtin"]) {
      const rows = by(src);
      if (!rows.length) continue;
      html += section(src, { icon: SOURCES[src].icon, label: SOURCES[src].label, count: rows.length, sub: SOURCES[src].sub, body: lists(rows, { src }), add: src === "user" ? "New for All Your Sessions..." : null });
    }
    if (excluded.length) {
      html += section("excluded", { icon: "circle-slash", label: "Not used in this session", count: excluded.length, muted: true, collapsed: true,
        sub: `Defined for you or this workspace, but not available with ${esc(h.label)} on ${esc(env.label)}.`, body: lists(excluded, { badge: true, collapseOver: 99, src: "excluded" }) });
    }
    flow.innerHTML = html;
    // Groups that start collapsed hide their rows once the lists have upgraded.
    customElements.whenDefined("vsc-customization-list").then(() => requestAnimationFrame(() => {
      for (const l of flow.querySelectorAll("vsc-customization-list")) l.applyVisibility?.();
      if (query) applyQuery();
    }));
  }

  function applyQuery() {
    let shown = 0;
    for (const sec of flow.querySelectorAll(".ss-sec")) {
      const ls = [...sec.querySelectorAll("vsc-customization-list")];
      const n = ls.reduce((a, l) => a + filterList(l, query), 0);
      sec.hidden = !!query && n === 0;
      if (query && n) sec.removeAttribute("data-collapsed");
      if (!sec.hidden) shown++;
    }
    empty.hidden = !query || shown > 0;
    empty.textContent = `Nothing in this session matches "${query}".`;
  }

  subscribe((st) => { scope = st.scope; render(); });

  root.querySelector(".ss-q").addEventListener("input", (e) => { query = e.target.value.trim(); applyQuery(); });

  // Sections collapse; ＋ asks what to create and says where it goes.
  flow.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const where = add.dataset.add;
      const wsName = workspaceLabel(scope.workspace);
      const items = ["skills", "instructions", "agents", "hooks"].map((id) => ({ label: `New ${typeOf(id).one[0].toUpperCase() + typeOf(id).one.slice(1)}...`, type: id }));
      items.push("-", { label: "Add MCP Server...", type: "mcp" });
      if (where === "user") items.push({ label: "Install Plugin from Source...", type: "plugins" });
      openMenu(add, items, (it) => {
        const t = typeOf(it.type);
        const dir = where === "user" ? { skills: "~/.copilot/skills/", instructions: "~/.copilot/instructions/", agents: "~/.copilot/agents/", hooks: "~/.copilot/hooks/", mcp: "~/.copilot/mcp-config.json", plugins: "~/.copilot/installed-plugins/" }[it.type]
          : { skills: ".github/skills/", instructions: ".github/instructions/", agents: ".github/agents/", hooks: ".github/hooks/", mcp: ".vscode/mcp.json" }[it.type];
        toast(where === "user" ? `New ${t.one} in ${dir}. All your sessions will use it.` : `New ${t.one} in ${wsName}/${dir}. Only sessions in ${workspaceTitle(scope.workspace)} will use it, and it's shared with everyone who clones the repo.`);
      });
      return;
    }
    const head = e.target.closest(".cp-sec-head");
    if (head && !e.target.closest("vsc-toolbar")) {
      const sec = head.parentElement, collapse = !sec.hasAttribute("data-collapsed");
      sec.toggleAttribute("data-collapsed", collapse);
      head.setAttribute("aria-expanded", String(!collapse));
      return;
    }
    // Row ⋯: actions say how far they reach.
    const more = e.target.closest('.codicon-ellipsis, [aria-label^="More actions"], [aria-label="More Actions..."]');
    const row = more && more.closest("[data-key]");
    if (!row) return;
    e.stopPropagation();
    const key = row.dataset.key, [src] = key.split(":"), name = row.getAttribute("name"), state = off().get(key);
    if (src === "excluded" || row.closest('[data-src="excluded"]')) return;
    const turn = state ? { label: state === "session" ? "Turn On for This Session" : "Turn On Everywhere", act: "on" } : { label: "Turn Off for This Session", act: "session" };
    const items = src === "workspace" ? [{ label: "Open File", act: "open" }, "-", turn, "-", { label: `Delete from ${workspaceTitle(scope.workspace)}...`, act: "delete" }]
      : src === "user" ? [{ label: "Edit (Applies to All Your Sessions)", act: "edit" }, "-", turn, ...(state ? [] : [{ label: "Turn Off Everywhere", act: "everywhere" }])]
      : [{ label: src === "plugin" ? "Show Plugin" : "View", act: "open" }, "-", turn];
    openMenu(more, items, (it) => {
      if (it.act === "session" || it.act === "everywhere") {
        off().set(key, it.act);
        render();
        toast(it.act === "session" ? `${name} is off for this session. Your other sessions still use it.` : `${name} is off in all your sessions.`, ["Undo"], () => { off().delete(key); render(); });
      } else if (it.act === "on") { off().delete(key); render(); }
      else if (it.act === "edit") toast(`Editing ${name} changes it for all your sessions, not just this one.`);
      else if (it.act === "delete") toast(`Deleting ${name} removes it from the repo for everyone.`);
    });
  });
  flow.addEventListener("keydown", (e) => {
    const head = e.target.closest(".cp-sec-head");
    if (head && e.target === head && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); head.click(); }
  });
  root.querySelector(".ss-footer").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (b) (b.dataset.act === "browse" ? opts.onBrowse : opts.onLibrary)?.();
  });

  render();
  return {};
}
