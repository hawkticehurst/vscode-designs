import { openMenu } from "./panel-shell.js";
import { store } from "./scope-store.js";

const esc = window.CUST.esc;
let root, header, pickers, filter, modal;
let lastSession = null;

function installStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* The header pickers set the filters, so the filter row (its search box moved to the header) has nothing left to show. */
    .sc-page :is(.list-search-and-button-container, .tools-list-search-and-button-container) { display: none !important; }
    .sc-scope-filters { flex: none; display: flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-bottom: 1px solid var(--vscode-agentsCard-border); box-sizing: content-box; overflow-x: auto; }
    .sc-scope-pickers { display: flex; align-items: center; gap: 6px; flex: none; }
    .sc-scope-filters .ct-search { flex: 0 1 220px; min-width: 120px; margin: 0 0 0 auto !important; }
    .sc-scope-filters .ct-search .monaco-inputbox { height: 24px; box-sizing: border-box; border-radius: var(--vscode-cornerRadius-medium); }
    .sc-scope-filters .ct-search .input { height: 22px; padding-block: 0; }
    /* Discover has its own search and Environments has nothing to search. */
    #cfg-root[data-section="environments"] .sc-scope-filters .ct-search { display: none; }
    /* General pages apply everywhere, so there's no remote to pick; Settings, Environments and Models have their own search or none. */
    #cfg-root[data-group="general"] .sc-scope-pickers { display: none; }
    #cfg-root[data-section="models"] .mg-segs { display: none; }
    #cfg-root:is([data-section="settings"], [data-section="environments"]) .sc-scope-filters { display: none; }
    #cfg-root[data-section="extensions"] .sc-src-filter { display: none; }
    #cfg-root:not([data-section="extensions"]) .sc-scope-filters .ct-search .input { padding-right: 26px; }
    .sc-scope-filters .ct-search .monaco-inputbox { position: relative; }
    .sc-src-filter { position: absolute; top: 50%; right: 2px; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; padding: 0; border: 1px solid transparent; border-radius: var(--vscode-cornerRadius-small, 3px); background: none; color: var(--vscode-icon-foreground); cursor: pointer; }
    .sc-src-filter:hover { background: var(--vscode-toolbar-hoverBackground); }
    .sc-src-filter:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
    .sc-src-filter[aria-pressed="true"] { color: var(--vscode-inputOption-activeForeground); background: var(--vscode-inputOption-activeBackground); border-color: var(--vscode-inputOption-activeBorder); }
    .sc-src-filter .codicon { font-size: 14px; }
    #cfg-root[data-section="browse"] .customization-discovery-search-row { display: none; }
    .sc-scope-picker { display: inline-flex; align-items: center; gap: 6px; flex: none; max-width: 220px; height: 24px; padding: 0 8px; border: 1px solid var(--vscode-dropdown-border, var(--vscode-widget-border)); border-radius: var(--vscode-cornerRadius-medium); background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground, var(--vscode-foreground)); font: inherit; font-size: var(--vscode-fontSize-label1, 12px); cursor: pointer; }
    .sc-scope-picker:hover { border-color: var(--vscode-focusBorder); }
    .sc-scope-picker:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
    .sc-scope-picker .codicon { flex: none; font-size: 14px; color: var(--vscode-icon-foreground); }
    .sc-scope-picker .codicon-chevron-down { font-size: 12px; }
    .sc-scope-picker-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    /* A picker that moved because another one changed (e.g. Codex isn't on devbox-1) flashes, like the composer's pickers. */
    @keyframes sc-scope-flash { from { border-color: var(--vscode-focusBorder); box-shadow: 0 0 0 1px var(--vscode-focusBorder); } }
    .sc-scope-picker.flash { animation: sc-scope-flash 1.2s ease-out; }
    .sc-scope-menu vsc-menu-item:not([disabled]):is(:hover, :focus-within, .focused) > .action-menu-item { background-color: var(--vscode-menu-selectionBackground); border-radius: var(--vscode-cornerRadius-medium); }
    @media (prefers-reduced-motion: reduce) { .sc-scope-picker.flash { animation: none; } }
  `;
  document.head.append(style);
}

// V21 — Scope (All · User · Workspace · Managed) and Agent (All, Copilot, Claude, Codex) filter every customization page.
const SCOPES = [{ id: "all", label: "All" }, { id: "user", label: "User", icon: "account" }, { id: "workspace", label: "Workspace", icon: "folder" }, { id: "managed", label: "Managed", icon: "lock" }];
const AGENT_LIST = [{ value: null, label: "All Agents", icon: "hubot" }, { value: "copilot", label: "Copilot", icon: "copilot" }, { value: "claude", label: "Claude", icon: "claude" }, { value: "codex", label: "Codex", icon: "openai" }];

function renderHeader() {
  const cur = filter.get(), counts = filter.counts();
  const wsName = filter.workspaces().find((w) => w.value === cur.home)?.label || cur.home;
  const seg = (s) => {
    const on = cur.scope === s.id, label = s.id === "workspace" ? `Workspace · ${wsName}` : s.label, n = counts?.[s.id];
    return `<button type="button" class="mg-seg${on ? " on" : ""}" role="radio" aria-checked="${on}" tabindex="${on ? 0 : -1}" data-scope-seg="${s.id}"${s.id === "workspace" ? ' title="Workspace: click again to pick another workspace"' : ""}>${s.icon ? `<span class="codicon codicon-${s.icon}" aria-hidden="true"></span>` : ""}<span>${esc(label)}</span>${counts ? `<span class="mg-seg-count">${n}</span>` : ""}${s.id === "workspace" && on ? '<span class="codicon codicon-chevron-down" aria-hidden="true"></span>' : ""}</button>`;
  };
  const ag = AGENT_LIST.find((a) => a.value === cur.agent) || AGENT_LIST[0];
  pickers.innerHTML = `<div class="mg-segs" role="radiogroup" aria-label="Scope">${SCOPES.map(seg).join("")}</div>
    <button class="sc-scope-picker mg-agent-picker${cur.agent ? " set" : ""}" type="button" data-scope="agent" aria-haspopup="menu" aria-label="Agent: ${esc(ag.label)}" title="Show what an agent can use">
      <span class="codicon codicon-${ag.icon}" aria-hidden="true"></span><span class="sc-scope-picker-name">Agent: ${esc(cur.agent ? ag.label : "All")}</span><span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>`;
}

function onHeaderClick(event) {
  const seg = event.target.closest("[data-scope-seg]");
  if (seg) {
    const id = seg.dataset.scopeSeg, cur = filter.get();
    if (id === "workspace" && cur.scope === "workspace") {
      const menu = openMenu(seg, filter.workspaces().map((w) => ({ ...w, icon: "folder", checked: w.value === cur.home })), (c) => { filter.set({ home: c.value }); header.querySelector('[data-scope-seg="workspace"]')?.focus(); });
      menu.classList.add("sc-scope-menu");
      return;
    }
    filter.set({ scope: id });
    return header.querySelector(`[data-scope-seg="${id}"]`)?.focus();
  }
  const button = event.target.closest('[data-scope="agent"]');
  if (!button) return;
  const cur = filter.get().agent;
  const items = AGENT_LIST.map((a) => ({ ...a, checked: a.value === cur }));
  const menu = openMenu(button, [items[0], "-", ...items.slice(1)], (c) => { filter.set({ agent: c.value }); header.querySelector('[data-scope="agent"]')?.focus(); });
  menu.classList.add("sc-scope-menu");
  menu.setAttribute("label", "Agent");
}
function onHeaderKey(event) {
  const seg = event.target.closest("[data-scope-seg]");
  if (!seg || !/^Arrow(Left|Right)$/.test(event.key)) return;
  event.preventDefault();
  const all = [...header.querySelectorAll("[data-scope-seg]")], next = all[(all.indexOf(seg) + (event.key === "ArrowLeft" ? -1 : 1) + all.length) % all.length];
  filter.set({ scope: next.dataset.scopeSeg });
  header.querySelector(`[data-scope-seg="${next.dataset.scopeSeg}"]`)?.focus();
}

/** The active session, else the one open most recently, else what the new-session composer has picked. */
function sessionScope() {
  const session = store.session || lastSession;
  return session?.scope || store.scope;
}

/** Each time the modal opens, Workspace means the session's workspace. Scope and agent stay as you left them. */
function syncToSession() {
  filter.set({ home: sessionScope().workspace });
  renderHeader();
}

function boot() {
  root = document.getElementById("cfg-root");
  modal = document.getElementById("configure");
  const host = root?.querySelector(".lib-host");
  filter = root?.scopeFilter;
  if (!host || !filter || !modal) return requestAnimationFrame(boot);
  installStyles();
  header = document.createElement("div");
  header.className = "sc-scope-filters";
  header.setAttribute("role", "toolbar");
  header.setAttribute("aria-label", "Filter");
  header.innerHTML = `<div class="sc-scope-pickers"></div><div class="list-search-container ct-search"><div class="monaco-inputbox idle" style="background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent);"><div class="ibwrapper"><input class="input empty" autocorrect="off" autocapitalize="off" spellcheck="false" type="text" wrap="off" placeholder="Type to search..." aria-label="Search customizations" style="background-color: inherit; color: var(--vscode-input-foreground);"></div><button type="button" class="sc-src-filter" data-src-filter aria-haspopup="menu" aria-pressed="false" aria-label="Filter by Source" title="Filter by Source"><span class="codicon codicon-filter" aria-hidden="true"></span></button></div></div>`;
  pickers = header.querySelector(".sc-scope-pickers");
  root.querySelector(".se-main").insertBefore(header, host);
  header.addEventListener("click", onHeaderClick);
  header.addEventListener("keydown", onHeaderKey);
  root.addEventListener("scope-filter-change", () => renderHeader());
  if (store.session) lastSession = store.session;
  document.addEventListener("session-open", (event) => { lastSession = { id: event.detail.id, ...event.detail.session }; });
  new MutationObserver(() => { if (!modal.hidden) syncToSession(); }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  syncToSession();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
