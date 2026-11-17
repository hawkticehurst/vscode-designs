import { openMenu } from "./panel-shell.js";
import { store } from "./scope-store.js";

const esc = window.CUST.esc;
const SESSION_PAGE = "session-context";
const CONTEXT_KINDS = ["agent", "ws", "env"];
// The editor's customization pages, in nav order.
const SESSION_TYPES = ["plugins", "canvases", "mcp", "skills", "instructions", "agents", "hooks", "tools"];
let selectedSessionId = null;
let lastSessionId = null;
let modal;
let sessionSummary = null;
let root, navList, host, header, sessionNav, sessionView;

const sessionMap = () => window.__SESSIONS || {};
const sessionFor = (id) => id ? sessionMap()[id] : null;
const validSessions = () => Object.entries(sessionMap())
  .filter(([, session]) => session.scope && window.SCOPE.WORKSPACES[session.scope.workspace])
  .sort((a, b) => a[1].title.localeCompare(b[1].title));
// Same order as the composer's pickers and the Session Customizations sidebar: workspace, agent, environment.
const scopeParts = (scope) => {
  const harness = window.SCOPE.HARNESSES[scope.harness], environment = window.SCOPE.ENVIRONMENTS[scope.environment];
  return [
    { kind: "Workspace", icon: "folder", label: window.SCOPE.workspaceLabel(scope.workspace) },
    { kind: "Agent", icon: harness?.icon || "copilot", label: harness?.label || scope.harness },
    { kind: "Environment", icon: environment?.icon || "remote", label: environment?.label || scope.environment },
  ];
};
const displayContext = (session) => scopeParts(session.scope).map((part) => part.label).join(" · ");
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const listText = (parts) => parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0] || "";
// "MCP Servers" reads "MCP servers" mid-sentence, as in the filter sentence.
const lowerLabel = (label) => label.replace(/\b[A-Z][a-z]+/g, (word) => word.toLowerCase());

/** Every type page's rows for a session, counted the way the nav counts them. */
function summarize(session) {
  const types = SESSION_TYPES.map((id) => sessionSummary(session.scope, id));
  const available = types.flatMap((type) => type.available);
  const fromScope = (scope) => available.filter((row) => row.scope === scope).length;
  const sources = [[fromScope("workspace"), "workspace"], [fromScope("user"), "user"], [fromScope("builtin"), "built-in"]]
    .filter(([count]) => count).map(([count, label]) => `${count} ${label}`);
  return { types, sources, total: available.length, unavailable: types.reduce((count, type) => count + type.unavailable, 0) };
}

function installStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* The session picker sets the filters, so the filter row (its search box moved to the header) has nothing left to show. */
    .sc-page :is(.list-search-and-button-container, .tools-list-search-and-button-container) { display: none !important; }
    .sc-session-context { flex: none; display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 14px; border-bottom: 1px solid var(--vscode-agentsCard-border); box-sizing: border-box; }
    .sc-session-context-label { margin-left: auto; color: var(--vscode-descriptionForeground); font-size: var(--vscode-fontSize-label1, 12px); white-space: nowrap; }
    .sc-session-picker { display: inline-flex; align-items: center; gap: 7px; min-width: 0; max-width: min(520px, 65%); height: 28px; padding: 0 8px; border: 1px solid var(--vscode-dropdown-border, var(--vscode-widget-border)); border-radius: var(--vscode-cornerRadius-medium); background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground, var(--vscode-foreground)); font: inherit; cursor: pointer; }
    .sc-session-picker:hover { border-color: var(--vscode-focusBorder); }
    .sc-session-picker:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: 1px; }
    .sc-session-picker:disabled { opacity: .65; cursor: progress; }
    .sc-session-picker .codicon { flex: none; font-size: 14px; color: var(--vscode-icon-foreground); }
    .sc-session-picker-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sc-session-picker .codicon-chevron-down { margin-left: auto; font-size: 12px; }
    .sc-session-context-meta { display: flex; align-items: center; min-width: 0; overflow: hidden; color: var(--vscode-descriptionForeground); font-size: var(--vscode-fontSize-label1, 12px); white-space: nowrap; }
    .sc-session-context-part { display: inline-flex; align-items: center; gap: var(--vscode-spacing-size40, 4px); min-width: 0; }
    .sc-session-context-sep { margin: 0 var(--vscode-spacing-size40, 4px); }
    .sc-session-context-part .codicon { flex: none; font-size: 14px; }
    .sc-session-menu .monaco-menu .monaco-action-bar.vertical .keybinding { padding-right: 8px; }
    .sc-session-menu vsc-menu-item:not([disabled]):is(:hover, :focus-within, .focused) > .action-menu-item { background-color: var(--vscode-menu-selectionBackground); border-radius: var(--vscode-cornerRadius-medium); }
    .sc-session-view > .se-page-header { align-items: flex-start; }
    .sc-session-view .se-page-title { overflow-wrap: anywhere; }
    .sc-session-view .se-page-desc { margin-top: 4px; }
    .sc-session-vh { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
    .sc-session-body { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 14px 16px; }
    .sc-session-types { margin: 0; padding: 0; list-style: none; }
    /* Type rows: the customization list's item (44px, name over description), the whole row opens its page. */
    .sc-session-view .sc-session-type { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 6px 8px; box-sizing: border-box; border: 0; border-radius: var(--vscode-cornerRadius-medium, 4px); background: transparent; color: var(--vscode-foreground); text-align: left; cursor: pointer; }
    .sc-session-view .sc-session-type:hover { background: var(--vscode-list-hoverBackground); }
    .sc-session-view .sc-session-type:focus-visible { outline: 1px solid var(--vscode-focusBorder); outline-offset: -1px; }
    .sc-session-type > .codicon { font-size: 16px; color: var(--vscode-icon-foreground); }
    .sc-session-type-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .sc-session-type-name { display: flex; align-items: center; gap: 6px; font-size: var(--vscode-fontSize-body1, 13px); font-weight: var(--vscode-fontWeight-semiBold, 600); line-height: 18px; }
    .sc-session-type-count { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 4px; box-sizing: border-box; border-radius: var(--vscode-cornerRadius-circle, 9999px); background: var(--vscode-toolbar-hoverBackground); color: var(--vscode-descriptionForeground); font-size: var(--vscode-fontSize-label2, 11px); font-weight: var(--vscode-fontWeight-semiBold, 600); }
    .sc-session-type-items { overflow: hidden; color: var(--vscode-descriptionForeground); font-size: var(--vscode-fontSize-body2, 11px); line-height: 14px; text-overflow: ellipsis; white-space: nowrap; }
    .sc-session-type .sc-session-type-go { opacity: 0; }
    .sc-session-type:hover .sc-session-type-go, .sc-session-type:focus-visible .sc-session-type-go { opacity: 1; }
    .sc-session-note { margin: 12px 0 0; color: var(--vscode-descriptionForeground); font-size: var(--vscode-fontSize-label1, 12px); }
    @media (max-width: 760px) { .sc-session-context-meta { display: none; } }
  `;
  document.head.append(style);
}

function currentNavId() {
  return navList.querySelector(".se-nav-item.active")?.dataset.id || "browse";
}

function renderHeader() {
  const session = sessionFor(selectedSessionId);
  header.innerHTML = `${session ? `<span class="sc-session-context-meta" role="group" aria-label="Session scope">${scopeParts(session.scope).map((part) =>
      `<span class="sc-session-context-part" title="${part.kind}"><span class="codicon codicon-${part.icon}" aria-hidden="true"></span><span class="sc-session-vh">${part.kind}: </span>${esc(part.label)}</span>`)
      .join('<span class="sc-session-context-sep" aria-hidden="true">·</span>')}</span>` : ""}<span class="sc-session-context-label">Showing customizations for</span>
    <button class="sc-session-picker" type="button" aria-haspopup="menu" aria-label="${session ? `Selected session: ${esc(session.title)}` : "Select a session context"}">
      <span class="codicon codicon-comment-discussion" aria-hidden="true"></span><span class="sc-session-picker-name">${esc(session?.title || "All sessions")}</span>
      <span class="codicon codicon-chevron-down" aria-hidden="true"></span>
    </button>`;
  header.querySelector(".sc-session-picker").addEventListener("click", (event) => {
    const options = [];
    for (const [id, item] of validSessions()) {
      options.push({ label: item.title, keys: displayContext(item), value: id, checked: id === selectedSessionId });
    }
    const menu = openMenu(event.currentTarget, options, (choice) => chooseSession(choice.value));
    menu.classList.add("sc-session-menu");
  });
}

function waitFor(selector, timeout = 2500) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      const element = root.querySelector(selector);
      if (element) return resolve(element);
      if (performance.now() - start > timeout) return reject(new Error(`Timed out waiting for ${selector}.`));
      requestAnimationFrame(check);
    };
    check();
  });
}

async function chooseFilter(kind, targetLabel) {
  const button = await waitFor(`.sc-ctx [data-ctx="${kind}"]`);
  button.click();
  const start = performance.now();
  let menu, item;
  while (performance.now() - start < 2500) {
    menu = document.querySelector("vsc-menu");
    item = menu && [...menu.querySelectorAll("vsc-menu-item")].find((candidate) => candidate.getAttribute("label") === targetLabel);
    if (item) break;
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  if (!item) throw new Error(`The ${kind} filter doesn't offer ${targetLabel}.`);
  item.click();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function applySessionScope(session) {
  const restore = currentNavId();
  const mcpNav = navList.querySelector('[data-id="mcp"]');
  if (!mcpNav) throw new Error("The MCP Servers page isn't available to set the session context.");
  mcpNav.click();
  await waitFor('.sc-ctx [data-ctx="agent"]');

  const allLabels = { agent: "All Agents", ws: "All Workspaces", env: "All Environments" };
  for (const kind of CONTEXT_KINDS) await chooseFilter(kind, allLabels[kind]);

  if (session) {
    const { workspace, harness, environment } = session.scope;
    await chooseFilter("agent", window.SCOPE.HARNESSES[harness]?.label || harness);
    await chooseFilter("ws", window.SCOPE.workspaceLabel(workspace));
    await chooseFilter("env", window.SCOPE.ENVIRONMENTS[environment]?.label || environment);
  }

  if (restore === SESSION_PAGE) showSessionPage();
  else if (restore !== "mcp") navList.querySelector(`[data-id="${restore}"]`)?.click();
}

async function chooseSession(id) {
  if (navList.getAttribute("aria-busy") === "true") return;
  const session = sessionFor(id);
  if (id && (!session || !window.SCOPE.WORKSPACES[session.scope.workspace])) {
    document.querySelector("vsc-notification-toasts")?.show({ severity: "error", message: "That session doesn't have a supported workspace context in this prototype." });
    return;
  }
  selectedSessionId = id;
  renderHeader();
  navList.setAttribute("aria-busy", "true");
  navList.style.pointerEvents = "none";
  header.querySelector(".sc-session-picker").disabled = true;
  try {
    await applySessionScope(session);
    if (currentNavId() === SESSION_PAGE) renderSessionPage();
    else updateSessionCount();
  } catch (error) {
    document.querySelector("vsc-notification-toasts")?.show({ severity: "error", message: `Couldn't apply the session context: ${error.message}` });
  } finally {
    navList.removeAttribute("aria-busy");
    navList.style.pointerEvents = "";
    header.querySelector(".sc-session-picker")?.removeAttribute("disabled");
  }
}

function openCategory(type) {
  navList.querySelector(`[data-id="${type}"]`)?.click();
}

function updateSessionCount(summary) {
  const count = sessionNav.querySelector(".se-nav-count"), session = sessionFor(selectedSessionId);
  const text = session ? String((summary || summarize(session)).total) : "";
  if (count.textContent !== text) count.textContent = text;
}

function renderSessionPage() {
  const session = sessionFor(selectedSessionId);
  sessionView.style.display = "flex";
  for (const page of host.querySelectorAll(":scope > .lib-hosted")) if (page !== sessionView) page.style.display = "none";
  for (const item of navList.querySelectorAll(".se-nav-item")) {
    const active = item.dataset.id === SESSION_PAGE;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", String(active));
    item.tabIndex = active ? 0 : -1;
  }
  if (!session) {
    updateSessionCount();
    sessionView.innerHTML = `<div class="se-page-header"><div class="se-flex"><h2 class="se-page-title">Session</h2>
        <p class="se-page-desc">Choose a session to see the customizations its agent can use in its workspace and environment.</p></div></div>
      <div class="sc-session-body"><button class="se-btn primary" type="button" data-choose-session>Choose Session</button></div>`;
    sessionView.querySelector("[data-choose-session]").addEventListener("click", () => header.querySelector(".sc-session-picker")?.click());
    return;
  }
  const summary = summarize(session), [, agent, environment] = scopeParts(session.scope);
  updateSessionCount(summary);
  const rows = summary.types.map((type) => {
    const count = type.available.length, names = type.available.slice(0, 3).map((row) => row.name).join(", ");
    const preview = count ? `${names}${count > 3 ? ` and ${count - 3} more` : ""}` : `No ${lowerLabel(type.label)} available`;
    return `<li><button class="sc-session-type" type="button" data-open-category="${type.id}" aria-label="${esc(type.label)}, ${count} available" aria-describedby="sc-session-type-${type.id}">
      <span class="codicon codicon-${type.icon}" aria-hidden="true"></span>
      <span class="sc-session-type-text"><span class="sc-session-type-name">${esc(type.label)}<span class="sc-session-type-count">${count}</span></span>
        <span class="sc-session-type-items" id="sc-session-type-${type.id}">${esc(preview)}</span></span>
      <span class="codicon codicon-chevron-right sc-session-type-go" aria-hidden="true"></span></button></li>`;
  }).join("");
  const total = summary.total
    ? `${plural(summary.total, "customization")} ${summary.total === 1 ? "is" : "are"} available in this session${summary.sources.length > 1 ? `: ${listText(summary.sources)}` : ""}.`
    : "No customizations are available in this session.";
  sessionView.innerHTML = `<div class="se-page-header">
      <div class="se-flex"><h2 class="se-page-title">${esc(session.title)}</h2>
        <p class="se-page-desc">${esc(total)}</p></div>
      <button type="button" class="se-btn small" data-open-session>Open Session Customizations</button></div>
    <div class="sc-session-body">
      <ul class="sc-session-types" aria-label="Customizations by type">${rows}</ul>
      ${summary.unavailable ? `<p class="sc-session-note">${plural(summary.unavailable, "other customization")} ${summary.unavailable === 1 ? "isn't" : "aren't"} available to ${esc(agent.label)} on ${esc(environment.label)}.</p>` : ""}
    </div>`;
  for (const button of sessionView.querySelectorAll("[data-open-category]")) button.addEventListener("click", () => openCategory(button.dataset.openCategory));
  sessionView.querySelector("[data-open-session]").addEventListener("click", () => {
    document.getElementById("configure")?.dispatchEvent(new CustomEvent("modal-close"));
    window.__openSession?.(selectedSessionId);
    window.__envOpenPanel?.();
  });
}

function showSessionPage() {
  renderSessionPage();
}

const supported = (id) => !!id && !!window.SCOPE.WORKSPACES[sessionFor(id)?.scope?.workspace];

/** The active session, else the one open most recently, else the newest session in the sidebar. */
function sessionToShow() {
  if (supported(store.session?.id)) return store.session.id;
  if (supported(lastSessionId)) return lastSessionId;
  if (supported(selectedSessionId)) return selectedSessionId;
  const row = [...document.querySelectorAll("[data-session]")].find((r) => supported(r.dataset.session));
  return row?.dataset.session || validSessions()[0]?.[0] || null;
}

/** Each time the modal opens, the picker starts from the session you were just in. */
function syncToSession() {
  const id = sessionToShow();
  if (id && id !== selectedSessionId) chooseSession(id);
}

async function boot() {
  root = document.getElementById("cfg-root");
  modal = document.getElementById("configure");
  navList = root?.querySelector(".se-nav-list");
  host = root?.querySelector(".lib-host");
  if (!navList || !host || !modal) return requestAnimationFrame(boot);
  // Imported once the editor is mounted, so these are the editor's own module instances (and data).
  const [scale, env] = await Promise.all([import("./scale.js?v=44"), import("./env.js?v=10")]);
  sessionSummary = scale.sessionSummary;
  installStyles();
  const main = root.querySelector(".se-main");
  header = document.createElement("div");
  header.className = "sc-session-context";
  main.insertBefore(header, host);

  sessionNav = document.createElement("div");
  sessionNav.className = "se-nav-item";
  sessionNav.setAttribute("role", "tab");
  sessionNav.tabIndex = -1;
  sessionNav.dataset.id = SESSION_PAGE;
  sessionNav.innerHTML = '<span class="se-nav-label">Session</span><span class="se-nav-count"></span>';
  navList.prepend(sessionNav);

  sessionView = document.createElement("div");
  sessionView.className = "lib-hosted sc-session-view";
  sessionView.style.display = "none";
  host.append(sessionView);

  navList.addEventListener("click", (event) => {
    if (event.target.closest(".se-nav-item")?.dataset.id !== SESSION_PAGE) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showSessionPage();
  }, true);
  navList.addEventListener("keydown", (event) => {
    const items = [...navList.querySelectorAll(".se-nav-item")];
    const index = items.indexOf(document.activeElement);
    const next = { ArrowDown: index + 1, ArrowUp: index - 1 }[event.key];
    if (index < 0 || next == null) return;
    const item = items[(next + items.length) % items.length];
    if (item.dataset.id !== SESSION_PAGE) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    item.focus();
    showSessionPage();
  }, true);
  // The editor's show() (nav clicks, reopening the modal, links) moves the active item but only toggles its own pages.
  new MutationObserver(() => {
    if (!sessionNav.classList.contains("active")) sessionView.style.display = "none";
  }).observe(sessionNav, { attributes: true, attributeFilter: ["class"] });
  // Installs and removals change what the session has; the editor re-renders its own page, so keep this one current too.
  env.subs.add(() => {
    if (currentNavId() === SESSION_PAGE) renderSessionPage();
    else updateSessionCount();
  });

  if (store.session) lastSessionId = store.session.id;
  document.addEventListener("session-open", (event) => { lastSessionId = event.detail.id; });
  new MutationObserver(() => { if (!modal.hidden) syncToSession(); }).observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  renderHeader();
  syncToSession();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
