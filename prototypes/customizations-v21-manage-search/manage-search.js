// V21 — One search for everything in Manage (⌘,): settings, customizations, models, environments, extensions and pages.
// People shouldn't need to know where something lives before they can find it. Results are grouped by kind; each
// opens its page with the item selected (a setting opens Settings, scrolled to it).
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ORDER = ["pages", "settings", "plugins", "mcp", "skills", "instructions", "agents", "hooks", "tools", "models", "environments", "extensions", "browse"];
const LIMIT = 4, SETTINGS_LIMIT = 6;

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
  let box, input, panel, q = "", active = -1, seq = 0, settings = null, expanded = new Set(), timer = 0;

  function attach() {
    const header = modal.querySelector(".modal-editor-header");
    if (!header) return requestAnimationFrame(attach);
    if (!box || !header.contains(box)) {
      box = document.createElement("div");
      box.className = "mg-gsearch";
      box.innerHTML = `<span class="codicon codicon-search mg-gs-icon" aria-hidden="true"></span>
        <input type="text" class="mg-gs-input" role="combobox" aria-expanded="false" aria-controls="mg-gs-results" aria-autocomplete="list" aria-label="Search settings, customizations, models and more" placeholder="Search settings, customizations, models…" spellcheck="false" autocomplete="off">
        <kbd class="mg-gs-kbd" title="Open Manage and search (⌘, or Ctrl+,)">⌘,</kbd>
        <button type="button" class="mg-gs-clear" aria-label="Clear Search" title="Clear Search" hidden><span class="codicon codicon-close" aria-hidden="true"></span></button>`;
      header.append(box);
      input = box.querySelector("input");
      input.value = q;
      input.addEventListener("input", () => setQuery(input.value));
      input.addEventListener("keydown", onKey);
      input.addEventListener("focus", () => box.classList.add("focused"));
      input.addEventListener("blur", () => box.classList.remove("focused"));
      box.querySelector(".mg-gs-clear").addEventListener("click", () => { clear(); input.focus(); });
    }
    const main = modal.querySelector("#cfg-root .se-main");
    if (main && (!panel || !main.contains(panel))) {
      panel = document.createElement("div");
      panel.className = "mg-gs-results";
      panel.id = "mg-gs-results";
      panel.setAttribute("role", "listbox");
      panel.setAttribute("aria-label", "Search results");
      panel.hidden = true;
      main.append(panel);
      panel.addEventListener("mousedown", (e) => { if (e.target.closest("[role=option], [data-gs-more]")) e.preventDefault(); });
      panel.addEventListener("click", onPanelClick);
      panel.addEventListener("mousemove", (e) => { const o = e.target.closest("[role=option]"); if (o) setActive(options().indexOf(o), false); });
    }
    sync();
  }

  function setQuery(v) {
    q = v;
    expanded = new Set();
    active = 0;
    if (input && input.value !== v) input.value = v;
    clearTimeout(timer);
    const words = v.trim();
    settings = words ? { pending: true, results: [], total: 0 } : null;
    render();
    if (!words) return;
    const id = ++seq;
    // Settings live in the embedded Settings page, which answers by message.
    timer = setTimeout(() => api.settingsFind(words, (d) => { if (id !== seq) return; settings = { pending: false, results: d.results || [], total: d.total || 0 }; render(); }), 60);
  }

  const options = () => (panel ? [...panel.querySelectorAll("[role=option]")] : []);
  function setActive(i, scroll = true) {
    const list = options();
    if (!list.length) { active = -1; input?.removeAttribute("aria-activedescendant"); return; }
    active = (i + list.length) % list.length;
    list.forEach((o, j) => { o.classList.toggle("active", j === active); o.setAttribute("aria-selected", String(j === active)); });
    input.setAttribute("aria-activedescendant", list[active].id);
    if (scroll) list[active].scrollIntoView({ block: "nearest" });
  }

  let entries = [];
  function render() {
    if (!panel) return;
    const text = q.trim().toLowerCase(), words = text.split(/\s+/).filter(Boolean);
    sync();
    if (!words.length) { panel.hidden = true; panel.innerHTML = ""; return; }
    panel.hidden = false;
    const groups = new Map();
    for (const e of api.entries()) {
      const label = e.label.toLowerCase(), hay = `${label} ${(e.detail || "").toLowerCase()} ${(e.text || "").toLowerCase()} ${(api.KIND[e.kind] || "").toLowerCase()}`;
      if (!words.every((w) => hay.includes(w))) continue;
      const score = (label === text ? 400 : 0) + (label.startsWith(text) ? 200 : 0) + (label.includes(text) ? 100 : 0) + words.filter((w) => label.includes(w)).length * 10;
      if (!groups.has(e.kind)) groups.set(e.kind, []);
      groups.get(e.kind).push({ ...e, score });
    }
    // Groups with the best match come first (an exact name beats a word in a description); Pages always lead.
    const scoreOf = (label) => { const l = label.toLowerCase(); return (l === text ? 400 : 0) + (l.startsWith(text) ? 200 : 0) + (l.includes(text) ? 100 : 0) + words.filter((w) => l.includes(w)).length * 10; };
    const kinds = ORDER.filter((k) => (k === "settings" ? settings && (settings.pending || settings.total) : groups.get(k)?.length));
    const best = (k) => (k === "settings" ? Math.max(0, ...(settings.results || []).map((x) => scoreOf(x.label))) : Math.max(...groups.get(k).map((x) => x.score)));
    kinds.sort((a, b) => (b === "pages") - (a === "pages") || best(b) - best(a) || ORDER.indexOf(a) - ORDER.indexOf(b));
    entries = [];
    let html = "", n = 0;
    const row = (e, inner) => { const id = `mg-gs-${n++}`; entries.push(e); return `<div class="mg-gs-row" role="option" id="${id}" aria-selected="false" data-gs-i="${entries.length - 1}">${inner}</div>`; };
    const head = (label, count, more) => `<div class="mg-gs-head" role="presentation"><span class="mg-gs-head-label">${esc(label)}</span><span class="mg-gs-count">${count}</span>${more || ""}</div>`;
    let total = 0;
    for (const kind of kinds) {
      if (kind === "settings") {
        if (settings.pending) { html += `<div class="mg-gs-group">${head("Settings", "…")}<div class="mg-gs-note" role="presentation">Searching settings…</div></div>`; continue; }
        if (!settings.total) continue;
        total += settings.total;
        const list = settings.results.slice(0, SETTINGS_LIMIT);
        html += `<div class="mg-gs-group" role="group" aria-label="Settings, ${settings.total}">${head("Settings", settings.total)}`;
        html += list.map((s) => row({ kind: "settings", setting: s.k }, `<span class="codicon codicon-settings-gear mg-gs-ic" aria-hidden="true"></span>
          <span class="mg-gs-main"><span class="mg-gs-label">${s.prefix ? `<span class="mg-gs-prefix">${highlight(s.prefix, words)}: </span>` : ""}${highlight(s.label, words)}</span><span class="mg-gs-detail mg-gs-key">${highlight(s.k, words)}</span></span>
          ${s.managed ? '<span class="codicon codicon-lock mg-gs-lock" title="Managed by your organization" aria-label="Managed by your organization"></span>' : ""}<span class="mg-gs-where">${esc(s.catLabel)}${s.subLabel && s.subLabel !== s.catLabel ? ` › ${esc(s.subLabel)}` : ""}</span>`)).join("");
        if (settings.total > list.length) html += row({ kind: "settings-all" }, `<span class="codicon codicon-arrow-right mg-gs-ic" aria-hidden="true"></span><span class="mg-gs-main"><span class="mg-gs-label mg-gs-link">Show all ${settings.total} settings in Settings</span></span>`);
        html += "</div>";
        continue;
      }
      const list = groups.get(kind);
      if (!list?.length) continue;
      total += list.length;
      list.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
      const shown = expanded.has(kind) ? list : list.slice(0, LIMIT), label = api.KIND[kind];
      html += `<div class="mg-gs-group" role="group" aria-label="${esc(label)}, ${list.length}">${head(label, list.length)}`;
      html += shown.map((e) => row(e, `<span class="codicon codicon-${e.icon || "circle"} mg-gs-ic" aria-hidden="true"></span>
        <span class="mg-gs-main"><span class="mg-gs-label">${highlight(e.label, words)}</span>${e.detail ? `<span class="mg-gs-detail">${e.managed ? '<span class="codicon codicon-lock" aria-hidden="true"></span>' : ""}${highlight(e.detail, words)}</span>` : ""}</span>
${kind === "pages" ? '<span class="mg-gs-where">Page</span>' : ""}`)).join("");
      if (list.length > shown.length) html += row({ kind: "more", more: kind }, `<span class="codicon codicon-ellipsis mg-gs-ic" aria-hidden="true"></span><span class="mg-gs-main"><span class="mg-gs-label mg-gs-link">Show ${list.length - shown.length} more ${esc(label.toLowerCase())}</span></span>`);
      html += "</div>";
    }
    if (!total && !settings?.pending) html = `<div class="mg-gs-empty" role="presentation"><span class="codicon codicon-search" aria-hidden="true"></span><div>No results for “${esc(q.trim())}”</div><div class="mg-gs-empty-sub">Search looks through settings, customizations, models, environments and extensions.</div></div>`;
    panel.innerHTML = `<div class="mg-gs-summary" role="presentation">${settings?.pending ? "Searching…" : `${total} result${total === 1 ? "" : "s"}`} for “${esc(q.trim())}” <span class="mg-gs-hint">↑↓ to move · Enter to open · Esc to clear</span></div>${html}`;
    setActive(Math.max(0, Math.min(active, options().length - 1)), false);
  }

  function sync() {
    if (!box) return;
    const has = !!q;
    box.classList.toggle("has-value", has);
    box.querySelector(".mg-gs-clear").hidden = !has;
    box.querySelector(".mg-gs-kbd").hidden = has;
    input.setAttribute("aria-expanded", String(has && !!panel && !panel.hidden));
  }

  function pick(i) {
    const e = entries[i];
    if (!e) return;
    if (e.kind === "more") { expanded.add(e.more); const at = i; render(); return setActive(at); }
    const query = q.trim();
    clear();
    if (e.kind === "settings") return api.openSetting(e.setting);
    if (e.kind === "settings-all") return api.settingsQuery(query);
    e.go();
  }
  function onPanelClick(e) { const o = e.target.closest("[role=option]"); if (o) pick(+o.dataset.gsI); }
  function onKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { if (!q) return; e.preventDefault(); return setActive(active + (e.key === "ArrowDown" ? 1 : -1)); }
    if (e.key === "Enter") { if (!q) return; e.preventDefault(); return pick(+(options()[active]?.dataset.gsI ?? -1)); }
  }

  function clear() { clearTimeout(timer); seq++; q = ""; settings = null; if (input) input.value = ""; render(); }
  return {
    attach,
    clear,
    /** Focus the search (and optionally fill it in). */
    focus(value) { attach(); if (value != null) setQuery(value); requestAnimationFrame(() => { input?.focus(); input?.select(); }); },
    /** Escape: clears a query (true), else lets the modal handle it (false). */
    escape() { if (!q) return false; clear(); input?.focus(); return true; },
  };
}
