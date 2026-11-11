/* One scope per window: the workspace, harness and environment the side panel describes.
   - New session ("new"): the composer's pickers own it. The panel shows the same three pickers, bound to the same
     state; changing either changes both, and the composer's picker flashes so it's clear they're one setting.
   - Open session ("session"): it was fixed when the session started, so the panel shows it read-only.
   Views subscribe and re-render; nothing else keeps its own copy. */
import { openMenu } from "./panel-shell.js";
const { HARNESSES, ENVIRONMENTS, WORKSPACES, workspaceLabel } = window.SCOPE;
const esc = window.CUST.esc;
const listeners = new Set();
const composer = () => document.getElementById("composer");

export const store = { mode: "new", scope: { ...window.PANEL_CONFIG.scope }, session: null };

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function setState(patch) {
  if (patch.scope) patch = { ...patch, scope: { ...store.scope, ...patch.scope } };
  Object.assign(store, patch);
  listeners.forEach((fn) => fn(store));
}

/** New-session scope change from the panel: write it to the composer and flash the composer's picker. */
function setFromPanel(kind, value) {
  setState({ scope: { [kind]: value } });
  const c = composer();
  if (!c) return;
  c.setAttribute(kind, value);
  requestAnimationFrame(() => {
    const p = c.querySelector(`vsc-session-picker[kind="${kind}"]`);
    if (!p) return;
    p.classList.remove("scope-flash");
    void p.offsetWidth;
    p.classList.add("scope-flash");
  });
}
// The composer's own pickers.
composer()?.addEventListener("change", (e) => {
  if (store.mode !== "new") return;
  const next = {};
  for (const k of ["workspace", "harness", "environment"]) if (e.detail?.[k]) next[k] = e.detail[k];
  if (Object.keys(next).length) setState({ scope: next });
});

const valueOf = (kind, scope) => kind === "workspace"
  ? { icon: scope.workspace === "chat" ? "circle-slash" : "folder", label: workspaceLabel(scope.workspace) }
  : kind === "harness" ? HARNESSES[scope.harness] : ENVIRONMENTS[scope.environment];

/** The scope bar at the top of a panel view. */
export function renderScopeBar(el, label) {
  const { mode, scope } = store;
  const kinds = ["workspace", "harness", "environment"];
  if (mode === "session") {
    el.innerHTML = `${label.session ? `<div class="ss-scope-label">${esc(label.session)}</div>` : ""}
      <div class="ss-chips ss-fixed" role="group" aria-label="Session scope (set when the session started)">${kinds.map((k) => {
        const v = valueOf(k, scope);
        return `<span class="ss-chip"><span class="codicon codicon-${v.icon}" aria-hidden="true"></span><span>${esc(v.label)}</span></span>`;
      }).join('<span class="ss-sep" aria-hidden="true">·</span>')}<span class="ss-lock" title="Set when the session started. Start a new session to use a different workspace, agent or environment."><span class="codicon codicon-lock-small" aria-hidden="true"></span></span></div>`;
    return;
  }
  el.innerHTML = `${label.new ? `<div class="ss-scope-label">${esc(label.new)}</div>` : ""}
    <div class="ss-chips" role="group" aria-label="New session scope (same as the composer)">${kinds.map((k) => {
      const v = valueOf(k, scope);
      return `<button class="ss-chip" data-pick="${k}" title="Same setting as the composer's ${k} picker"><span class="codicon codicon-${v.icon}" aria-hidden="true"></span><span>${esc(v.label)}</span><span class="codicon codicon-chevron-down ss-chev" aria-hidden="true"></span></button>`;
    }).join("")}</div>`;
  el.querySelector(".ss-chips").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-pick]");
    if (!chip) return;
    const kind = chip.dataset.pick;
    const options = kind === "workspace"
      ? [...new Set([...Object.keys(WORKSPACES), "temp-test"]), "-", "chat"].map((id) => (id === "-" ? "-" : { label: workspaceLabel(id), value: id, checked: scope.workspace === id }))
      : Object.entries(kind === "harness" ? HARNESSES : ENVIRONMENTS).map(([id, v]) => ({ label: v.label, value: id, checked: scope[kind] === id }));
    openMenu(chip, options, (it) => setFromPanel(kind, it.value));
  });
}
