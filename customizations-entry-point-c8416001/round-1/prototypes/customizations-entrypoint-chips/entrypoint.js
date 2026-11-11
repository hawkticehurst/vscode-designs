/* Customizations entry points: alternatives to V13's single "Customizations" button at the top of the sessions sidebar
 * that keep its footprint small but name the customization types people already know (Skills, MCP, Agents, …).
 * Context: microsoft/vscode-internalbacklog#10416. Replacing the bottom-of-sidebar section that listed the types with the
 * single button cut opens of Customizations by 45% and creation starts by 40%.
 *
 * Designs (pick one with window.ENTRY_DESIGN, or ?entry=<id> to compare):
 *   inline   One row: "Customizations" followed by a muted list of the types; hovering shows each type with its count.
 *   chips    The row, plus one line of type chips under it that deep link into the modal.
 *   ticker   One row whose description cycles through the types with counts once, then settles on a summary.
 *   named    The row is labeled with the types themselves ("Skills, MCP & more"); the modal is still Customizations.
 *   welcome  V13's button is unchanged; the new-session view shows type chips under the composer. */

const ICON = { skills: "ai-customization-skill", mcp: "ai-customization-mcp-server", agents: "ai-customization-agent", plugins: "ai-customization-plugin",
  instructions: "ai-customization-instructions", hooks: "ai-customization-hook", canvases: "preview", tools: "ai-customization-tools" };
const SHORT = { mcp: "MCP" };
const ONE = { skills: "Skill", mcp: "MCP Server", agents: "Agent", plugins: "Plugin", instructions: "Instruction", hooks: "Hook", canvases: "Canvas", tools: "Tool Set" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const icon = (name, cls = "") => `<span class="codicon codicon-${name}${cls ? " " + cls : ""}" aria-hidden="true"></span>`;
const countLabel = (t) => `${t.count} ${t.count === 1 ? ONE[t.id] : t.label}`;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export const DESIGNS = ["inline", "chips", "ticker", "named", "welcome"];

/**
 * @param {object} o
 * @param {string} o.design One of DESIGNS.
 * @param {HTMLElement} o.nav The sidebar's Customizations row (V13's #nav-customizations button).
 * @param {(section?: string) => void} o.open Opens the Customizations modal, optionally on a section.
 * @param {() => {id: string, label: string, count: number}[]} o.counts Global counts per type, most familiar first.
 * @param {Set<Function>} o.subs Change subscribers (env.js), so counts stay live after installs and removals.
 * @param {HTMLElement} o.composer The new-session composer (the welcome design sits under it).
 */
export function mountEntry(o) {
  const design = DESIGNS.includes(o.design) ? o.design : "inline";
  document.documentElement.dataset.entry = design;
  o.nav.classList.add("ep-row", `ep-design-${design}`);
  const mount = { inline, chips, ticker, named, welcome }[design];
  const api = mount(o);
  o.subs?.add(() => api?.refresh?.());
  return api;
}

const typesText = (types, n = types.length) => types.slice(0, n).map((t) => SHORT[t.id] || t.label).join(", ");
const fullTitle = (types) => `Customizations: ${types.map((t) => t.label).join(", ")}`;
const rowHead = (label = "Customizations") => `${icon("extensions", "ssb-icon")}<span class="ssb-label">${esc(label)}</span>`;

// ---- inline: one row, muted type list, hover card ----
function inline(o) {
  const { nav, open, counts } = o;
  const card = hoverCard(nav, () => cardHtml(counts()), open);
  function refresh() {
    const types = counts();
    nav.innerHTML = `${rowHead()}<span class="ep-desc">${esc(types.filter((t) => t.count).slice(0, 3).map((t) => SHORT[t.id] || t.label).join(" · "))}</span>`;
    nav.setAttribute("aria-label", fullTitle(types));
  }
  refresh();
  nav.addEventListener("click", () => { card.hide(); open(); });
  return { refresh };
}

function cardHtml(types) {
  return `<div class="ep-card-head"><span class="ep-card-title">Customizations</span><span class="ep-card-sub">Everything your agents can use, across all your workspaces</span></div>
    <div class="ep-card-list" role="menu">${types.map((t) => `<button type="button" class="ep-card-row" role="menuitem" data-section="${t.id}">${icon(ICON[t.id])}<span class="ep-card-label">${esc(t.label)}</span><span class="ep-card-count">${t.count}</span></button>`).join("")}</div>
    <div class="ep-card-foot"><button type="button" class="ep-card-row" role="menuitem" data-section="browse">${icon("sparkle")}<span class="ep-card-label">Browse Marketplace</span>${icon("arrow-right", "ep-card-go")}</button></div>`;
}

/** A managed-hover-style card to the right of the anchor (after the workbench hover delay); keyboard focus shows it too. */
function hoverCard(anchor, html, onPick) {
  const host = anchor.closest("vsc-workbench") || document.body;
  const el = document.createElement("div");
  el.className = "ep-card";
  el.hidden = true;
  host.append(el);
  let showT = 0, hideT = 0;
  const place = () => {
    const r = anchor.getBoundingClientRect();
    el.style.left = `${Math.round(r.right + 6)}px`;
    el.style.top = `${Math.max(8, Math.round(r.top - 6))}px`;
  };
  const show = () => {
    clearTimeout(hideT);
    if (!el.hidden || document.querySelector("#configure:not([hidden])")) return;
    el.innerHTML = html();
    place();
    el.hidden = false;
  };
  const hide = () => { clearTimeout(showT); clearTimeout(hideT); el.hidden = true; };
  const later = () => { clearTimeout(showT); hideT = setTimeout(hide, 180); };
  anchor.addEventListener("mouseenter", () => { clearTimeout(hideT); showT = setTimeout(show, 450); });
  anchor.addEventListener("mouseleave", later);
  anchor.addEventListener("focus", () => { if (anchor.matches(":focus-visible")) show(); });
  anchor.addEventListener("blur", (e) => { if (!el.contains(e.relatedTarget)) later(); });
  anchor.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" && !el.hidden) { e.preventDefault(); el.querySelector("button")?.focus(); }
    if (e.key === "Escape" && !el.hidden) { e.preventDefault(); hide(); }
  });
  el.addEventListener("mouseenter", () => clearTimeout(hideT));
  el.addEventListener("mouseleave", later);
  el.addEventListener("focusout", (e) => { if (!el.contains(e.relatedTarget) && e.relatedTarget !== anchor) later(); });
  el.addEventListener("keydown", (e) => {
    const rows = [...el.querySelectorAll("button")], i = rows.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); rows[(i + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length]?.focus(); }
    if (e.key === "Escape" || e.key === "ArrowLeft") { e.preventDefault(); hide(); anchor.focus(); }
  });
  el.addEventListener("click", (e) => {
    const b = e.target.closest("[data-section]");
    if (!b) return;
    hide();
    onPick(b.dataset.section);
  });
  return { show, hide };
}

// ---- chips: the row, plus one line of type chips that deep link ----
function chips(o) {
  const { nav, open, counts } = o;
  nav.innerHTML = rowHead();
  const row = document.createElement("div");
  row.className = "ep-chips";
  row.setAttribute("role", "group");
  row.setAttribute("aria-label", "Customization types");
  nav.after(row);
  function refresh() {
    const types = counts().filter((t) => t.count);
    nav.setAttribute("aria-label", fullTitle(types));
    row.innerHTML = types.map((t) => `<button type="button" class="ep-chip" data-section="${t.id}" title="${esc(countLabel(t))}">${esc(SHORT[t.id] || t.label)}</button>`).join("")
      + `<button type="button" class="ep-chip ep-chip-more" data-section="" title="All Customizations"></button>`;
    fit();
  }
  // Keep the chips to one line: the ones that don't fit fold into "+N", which opens the modal.
  function fit() {
    const all = [...row.querySelectorAll(".ep-chip:not(.ep-chip-more)")], more = row.querySelector(".ep-chip-more");
    for (const c of all) c.hidden = false;
    more.hidden = true;
    const top = all[0]?.offsetTop ?? 0;
    let hidden = all.filter((c) => c.offsetTop > top);
    if (!hidden.length) return;
    for (const c of hidden) c.hidden = true;
    more.hidden = false;
    const label = () => (more.textContent = `+${hidden.length}`, more.setAttribute("aria-label", `${hidden.length} more: ${hidden.map((c) => c.title).join(", ")}`));
    label();
    while (more.offsetTop > top && hidden.length < all.length) {
      const last = all[all.length - hidden.length - 1];
      last.hidden = true;
      hidden = [last, ...hidden];
      label();
    }
  }
  refresh();
  document.fonts?.ready.then(fit);
  nav.addEventListener("click", () => open());
  row.addEventListener("click", (e) => { const b = e.target.closest(".ep-chip"); if (b) open(b.dataset.section || undefined); });
  return { refresh };
}

// ---- ticker: one row; the description cycles through types once, then settles ----
function ticker(o) {
  const { nav, open, counts } = o;
  const STEP = 2600;
  let types = [], i = 0, timer = 0, paused = false, settled = false;
  nav.innerHTML = `${rowHead()}<span class="ep-ticker" aria-hidden="true"><span class="ep-ticker-track"></span></span>`;
  const track = nav.querySelector(".ep-ticker-track");
  const summary = () => typesText(types, 3) + "…";
  function render() {
    nav.setAttribute("aria-label", fullTitle(counts()));
    types = counts().filter((t) => t.count).slice(0, 5);
    track.innerHTML = types.map((t) => `<span class="ep-ticker-item" data-section="${t.id}"><span class="ep-ticker-count">${t.count}</span> ${esc(t.count === 1 ? ONE[t.id] : t.label)}</span>`).join("")
      + `<span class="ep-ticker-item ep-ticker-summary">${esc(summary())}</span>`;
    go(settled ? types.length : i, false);
  }
  function go(n, animate = true) {
    i = n;
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translateY(${-i * 16}px)`;
    track.querySelectorAll(".ep-ticker-item").forEach((el, k) => el.classList.toggle("on", k === i));
    if (!animate) void track.offsetHeight;
  }
  function tick() {
    clearTimeout(timer);
    if (settled) return;
    timer = setTimeout(() => {
      if (paused) return tick();
      go(i + 1);
      if (i >= types.length) { settled = true; nav.classList.add("is-settled"); return; }
      tick();
    }, STEP);
  }
  function play() {
    settled = reducedMotion();
    nav.classList.toggle("is-settled", settled);
    render();
    go(settled ? types.length : 0, false);
    tick();
  }
  play();
  nav.addEventListener("mouseenter", () => (paused = true));
  nav.addEventListener("mouseleave", () => (paused = false));
  nav.addEventListener("click", (e) => {
    // While it's cycling, the description is a link to the type it shows.
    const onType = !settled && e.target.closest(".ep-ticker") && types[i];
    open(onType ? types[i].id : undefined);
  });
  // Coming back to a new session replays it once.
  document.addEventListener("session-new", play);
  return { refresh: render };
}

// ---- named: the entry is labeled with the types themselves ----
function named(o) {
  const { nav, open, counts } = o;
  function refresh() {
    const types = counts();
    nav.innerHTML = rowHead("Skills, MCP & more");
    nav.title = fullTitle(types);
    nav.setAttribute("aria-label", fullTitle(types));
  }
  refresh();
  nav.addEventListener("click", () => open());
  return { refresh };
}

// ---- welcome: V13's button; type chips under the new-session composer ----
function welcome(o) {
  const { nav, open, counts, composer } = o;
  nav.addEventListener("click", () => open());
  const box = document.createElement("div");
  box.className = "ep-welcome";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "Customizations");
  let dismissed = false;
  function refresh() {
    if (dismissed) return;
    const types = counts().filter((t) => t.count).slice(0, 5);
    box.innerHTML = `<span class="ep-welcome-label">Customize</span>${types.map((t) => `<button type="button" class="ep-wchip" data-section="${t.id}" title="${esc(countLabel(t))}">${icon(ICON[t.id])}<span>${esc(t.label)}</span><span class="ep-wchip-count">${t.count}</span></button>`).join("")}
      <button type="button" class="ep-wchip ep-wchip-browse" data-section="browse">${icon("sparkle")}<span>Browse</span></button>
      <button type="button" class="ep-welcome-close" data-dismiss aria-label="Hide customization shortcuts" title="Hide">${icon("close")}</button>`;
  }
  const place = () => { if (!box.isConnected && composer) composer.after(box); };
  refresh();
  place();
  requestAnimationFrame(place);
  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-dismiss]")) {
      dismissed = true;
      box.remove();
      return window.__notify?.("Hidden. Customizations is always at the top of the sidebar.");
    }
    const b = e.target.closest("[data-section]");
    if (b) open(b.dataset.section);
  });
  return { refresh };
}
