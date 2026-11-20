// V21 — One search for everything in Manage (/): customizations, models, environments, extensions and pages.
// People shouldn't need to know where something lives before they can find it. Results are grouped by kind; each
// opens its page with the item selected.
// V22 — There's no search in the modal's header any more: the search box at the right of every page's header bar is
// this global search. Results cover the page below that bar, with the page you're on listed first.
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ORDER = ["pages", "plugins", "mcp", "skills", "instructions", "agents", "hooks", "tools", "models", "environments", "extensions", "browse"];
const LIMIT = 4;
const SEL = ".sc-scope-filters :is(.ct-search, .md-search) input";
const PLACEHOLDER = "Search all";

/** Wraps each query word's matches in <mark>. */
function highlight(text, words) {
  const s = String(text ?? ""), low = s.toLowerCase(), hits = [];
  for (const w of words) { if (!w) continue; let i = low.indexOf(w); while (i >= 0) { hits.push([i, i + w.length]); i = low.indexOf(w, i + w.length); } }
  if (!hits.length) return esc(s);
  hits.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const h of hits) { const last = merged[merged.length - 1]; if (last && h[0] <= last[1]) last[1] = Math.max(last[1], h[1]); else merged.push([...h]); }
  let out = "", at = 0;
  for (const [a, b] of merged) { out += esc(s.slice(at, a)) + `<mark>${esc(s.slice(a, b))}</mark>`; at = b; }
  return out + esc(s.slice(at));
}

export function mountManageSearch(modal, api) {
  let panel, q = "", active = -1, expanded = new Set(), wired = false;
  const inputs = () => [...modal.querySelectorAll(SEL)];
  // The header bar shows one search box per page (Models has its own); the visible one is the one to focus.
  const current = () => inputs().find((i) => i.offsetParent) || inputs()[0];

  function attach() {
    const main = modal.querySelector("#cfg-root .se-main");
    if (!main || !inputs().length) return requestAnimationFrame(attach);
    if (!panel || !main.contains(panel)) {
      panel = document.createElement("div");
      panel.className = "mg-gs-results";
      panel.id = "mg-gs-results";
      panel.setAttribute("role", "listbox");
      panel.setAttribute("aria-label", "Search results");
      panel.hidden = true;
      main.append(panel);
      panel.addEventListener("mousedown", (e) => { if (e.target.closest("[role=option]")) e.preventDefault(); });
      panel.addEventListener("click", onPanelClick);
      panel.addEventListener("mousemove", (e) => { const o = e.target.closest("[role=option]"); if (o) setActive(options().indexOf(o), false); });
    }
    if (!wired) {
      wired = true;
      // Capture, so the pages' own filtering (scale.js) never sees these keystrokes.
      modal.addEventListener("input", (e) => { if (!e.target.matches?.(SEL)) return; e.stopImmediatePropagation(); setQuery(e.target.value); }, true);
      modal.addEventListener("keydown", (e) => { if (e.target.matches?.(SEL)) onKey(e); }, true);
      // Going to another page from the nav ends the search.
      modal.addEventListener("click", (e) => { if (q && e.target.closest(".se-nav-item")) clear(); }, true);
      // Pages re-render their header search; keep it showing the query.
      modal.querySelector("#cfg-root")?.addEventListener("scope-filter-change", () => requestAnimationFrame(sync));
    }
    render();
  }

  function setQuery(v) {
    q = v;
    expanded = new Set();
    active = 0;
    render();
  }

  const options = () => (panel ? [...panel.querySelectorAll("[role=option]")] : []);
  function setActive(i, scroll = true) {
    const list = options(), input = current();
    if (!list.length) { active = -1; input?.removeAttribute("aria-activedescendant"); return; }
    active = (i + list.length) % list.length;
    list.forEach((o, j) => { o.classList.toggle("active", j === active); o.setAttribute("aria-selected", String(j === active)); });
    input?.setAttribute("aria-activedescendant", list[active].id);
    if (scroll) list[active].scrollIntoView({ block: "nearest" });
  }

  let entries = [];
  function render() {
    if (!panel) return;
    const text = q.trim().toLowerCase(), words = text.split(/\s+/).filter(Boolean);
    sync();
    if (!words.length) { panel.hidden = true; panel.innerHTML = ""; return; }
    const bar = modal.querySelector("#cfg-root .sc-scope-filters");
    panel.style.top = bar ? `${bar.offsetTop + bar.offsetHeight}px` : "0";
    panel.hidden = false;
    const groups = new Map();
    for (const e of api.entries()) {
      const label = e.label.toLowerCase(), hay = `${label} ${(e.detail || "").toLowerCase()} ${(e.text || "").toLowerCase()} ${(api.KIND[e.kind] || "").toLowerCase()}`;
      if (!words.every((w) => hay.includes(w))) continue;
      const score = (label === text ? 400 : 0) + (label.startsWith(text) ? 200 : 0) + (label.includes(text) ? 100 : 0) + words.filter((w) => label.includes(w)).length * 10;
      if (!groups.has(e.kind)) groups.set(e.kind, []);
      groups.get(e.kind).push({ ...e, score });
    }
    // The page you searched from leads, then Pages, then the groups with the best match.
    const here = api.section?.();
    const kinds = ORDER.filter((k) => groups.get(k)?.length);
    const best = (k) => Math.max(...groups.get(k).map((x) => x.score));
    kinds.sort((a, b) => (b === here) - (a === here) || (b === "pages") - (a === "pages") || best(b) - best(a) || ORDER.indexOf(a) - ORDER.indexOf(b));
    entries = [];
    let html = "", n = 0, total = 0;
    const row = (e, inner) => { const id = `mg-gs-${n++}`; entries.push(e); return `<div class="mg-gs-row" role="option" id="${id}" aria-selected="false" data-gs-i="${entries.length - 1}">${inner}</div>`; };
    const head = (label, count) => `<div class="mg-gs-head" role="presentation"><span class="mg-gs-head-label">${esc(label)}</span><span class="mg-gs-count">${count}</span></div>`;
    for (const kind of kinds) {
      const list = groups.get(kind);
      total += list.length;
      list.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
      const shown = expanded.has(kind) || kind === here ? list : list.slice(0, LIMIT), label = api.KIND[kind];
      html += `<div class="mg-gs-group" role="group" aria-label="${esc(label)}, ${list.length}">${head(label, list.length)}`;
      html += shown.map((e) => row(e, `<span class="codicon codicon-${e.icon || "circle"} mg-gs-ic" aria-hidden="true"></span>
        <span class="mg-gs-main"><span class="mg-gs-label">${highlight(e.label, words)}</span>${e.detail ? `<span class="mg-gs-detail">${e.managed ? '<span class="codicon codicon-lock" aria-hidden="true"></span>' : ""}${highlight(e.detail, words)}</span>` : ""}</span>
${kind === "pages" ? '<span class="mg-gs-where">Page</span>' : ""}`)).join("");
      if (list.length > shown.length) html += row({ kind: "more", more: kind }, `<span class="codicon codicon-ellipsis mg-gs-ic" aria-hidden="true"></span><span class="mg-gs-main"><span class="mg-gs-label mg-gs-link">Show ${list.length - shown.length} more ${esc(label.toLowerCase())}</span></span>`);
      html += "</div>";
    }
    if (!total) html = `<div class="mg-gs-empty" role="presentation"><span class="codicon codicon-search" aria-hidden="true"></span><div>No results for “${esc(q.trim())}”</div><div class="mg-gs-empty-sub">Search looks through customizations, models, environments and extensions.</div></div>`;
    panel.innerHTML = `<div class="mg-gs-summary" role="presentation">${total} result${total === 1 ? "" : "s"} for “${esc(q.trim())}” <span class="mg-gs-hint">↑↓ to move · Enter to open · Esc to clear</span></div>${html}`;
    setActive(Math.max(0, Math.min(active, options().length - 1)), false);
  }

  function sync() {
    const open = !!q && !!panel && !panel.hidden;
    for (const input of inputs()) {
      if (input.value !== q) input.value = q;
      input.classList.toggle("empty", !q);
      input.placeholder = PLACEHOLDER;
      // The "/" shortcut sits at the input's right end, styled as inline code, until you focus or type.
      if (!input.nextElementSibling?.matches(".gs-key")) input.insertAdjacentHTML("afterend", '<kbd class="gs-key" aria-hidden="true" title="Press / to search">/</kbd>');
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-label", "Search customizations, models, environments and extensions");
      input.setAttribute("aria-controls", "mg-gs-results");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-expanded", String(open));
      input.closest(".ct-search, .md-search")?.classList.toggle("mg-gs-on", !!q);
    }
  }

  function pick(i) {
    const e = entries[i];
    if (!e) return;
    if (e.kind === "more") { expanded.add(e.more); const at = i; render(); return setActive(at); }
    clear();
    e.go();
  }
  function onPanelClick(e) { const o = e.target.closest("[role=option]"); if (o) pick(+o.dataset.gsI); }
  function onKey(e) {
    if (!q) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); e.stopImmediatePropagation(); return setActive(active + (e.key === "ArrowDown" ? 1 : -1)); }
    if (e.key === "Enter") { e.preventDefault(); e.stopImmediatePropagation(); return pick(+(options()[active]?.dataset.gsI ?? -1)); }
  }

  function clear() { q = ""; render(); }
  return {
    attach,
    clear,
    /** Focus the page header's search (and optionally fill it in). */
    focus(value) { attach(); if (value != null) setQuery(value); requestAnimationFrame(() => { const i = current(); i?.focus(); i?.select(); }); },
    /** Escape: clears a query (true), else lets the modal handle it (false). */
    escape() { if (!q) return false; clear(); current()?.focus(); return true; },
  };
}
