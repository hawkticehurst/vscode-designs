import { openMenu } from "./panel-shell.js";
import { store } from "./scope-store.js";

const esc = window.CUST.esc;
// Each picker narrows the next: the environment has its own workspaces, and each workspace its own agents there.
const PICKERS = [
  { kind: "env", name: "Environment" },
  { kind: "ws", name: "Workspace" },
  { kind: "agent", name: "Agent" },
];
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

const optionFor = (kind, value) => filter.options(kind).find((o) => o.value === value);

function renderHeader(moved = []) {
  const current = filter.get();
  pickers.innerHTML = PICKERS.map((p) => {
    const chosen = optionFor(p.kind, current[p.kind]);
    const label = chosen?.label || "";
    return `<button class="sc-scope-picker${moved.includes(p.kind) ? " flash" : ""}" type="button" data-scope="${p.kind}" aria-haspopup="menu" aria-label="${p.name}: ${esc(label)}" title="${p.name}">
      <span class="codicon codicon-${chosen?.icon || "folder"}" aria-hidden="true"></span><span class="sc-scope-picker-name">${esc(label)}</span>
      <span class="codicon codicon-chevron-down" aria-hidden="true"></span></button>`;
  }).join("");
}

function setFilter(values, focusKind) {
  const before = filter.get();
  filter.set(values);
  const after = filter.get();
  renderHeader(PICKERS.map((p) => p.kind).filter((kind) => !(kind in values) && before[kind] && before[kind] !== after[kind]));
  if (focusKind) header.querySelector(`[data-scope="${focusKind}"]`)?.focus();
}

function onHeaderClick(event) {
  const button = event.target.closest("[data-scope]");
  if (!button) return;
  const picker = PICKERS.find((p) => p.kind === button.dataset.scope), current = filter.get()[picker.kind];
  const options = filter.options(picker.kind).map((o) => ({ ...o, checked: o.value === current }));
  const menu = openMenu(button, options, (choice) => setFilter({ [picker.kind]: choice.value }, picker.kind));
  menu.classList.add("sc-scope-menu");
  menu.setAttribute("label", picker.name);
}

/** The active session, else the one open most recently, else what the new-session composer has picked. */
function sessionScope() {
  const session = store.session || lastSession;
  return session?.scope || store.scope;
}

/** Each time the modal opens, the pickers start from the session you were just in. */
function syncToSession() {
  const { workspace, harness, environment } = sessionScope();
  filter.set({ ws: window.SCOPE.WORKSPACES[workspace] ? workspace : null, agent: harness, env: environment });
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
  header.setAttribute("aria-label", "Filter customizations");
  header.innerHTML = `<div class="sc-scope-pickers"></div><div class="list-search-container ct-search"><div class="monaco-inputbox idle" style="background-color: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent);"><div class="ibwrapper"><input class="input empty" autocorrect="off" autocapitalize="off" spellcheck="false" type="text" wrap="off" placeholder="Type to search..." aria-label="Search customizations" style="background-color: inherit; color: var(--vscode-input-foreground);"></div><button type="button" class="sc-src-filter" data-src-filter aria-haspopup="menu" aria-pressed="false" aria-label="Filter by Source" title="Filter by Source"><span class="codicon codicon-filter" aria-hidden="true"></span></button></div></div>`;
  pickers = header.querySelector(".sc-scope-pickers");
  root.querySelector(".se-main").insertBefore(header, host);
  header.addEventListener("click", onHeaderClick);
  root.addEventListener("scope-filter-change", () => renderHeader());
  if (store.session) lastSession = store.session;
  document.addEventListener("session-open", (event) => { lastSession = { id: event.detail.id, ...event.detail.session }; });
  new MutationObserver(() => { if (!modal.hidden) syncToSession(); }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  syncToSession();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
