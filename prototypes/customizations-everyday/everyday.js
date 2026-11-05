/* V8 — Everyday. Customizations for people using agents, not building them: what the session can reach
   (connections) and the workflows it knows (skills), with toggles where the scope already lives (the composer),
   and in-chat moments when something's missing, broken or just used.  Connections are the user's real MCP servers and connectors; states and accounts are illustrative. */
import { store, subscribe, renderScopeBar } from "./scope-store.js";
import { openMenu, toast } from "./panel-shell.js";
const { esc } = window.CUST;
const { resolve, workspaceTitle, WORKSPACES } = window.SCOPE;
const ICONS = "assets/icons/";

// ---------- Data ----------
const CONNECTIONS = [
  { id: "github", name: "GitHub", icon: { img: "github.png" }, account: "hawkticehurst", does: "Issues, pull requests and code search", state: "ok" },
  { id: "slack", name: "Slack", icon: { img: "slack.png" }, account: "hawkticehurst", does: "Read channels and threads, send messages", state: "expired" },
  { id: "figma", name: "Figma", icon: { img: "figma-figma.png" }, account: "hawk@contoso.com", does: "Read design files and components", state: "ok", offIn: ["vscode"] },
  { id: "workiq", name: "Work IQ", icon: { img: "microsoft-workiq.png" }, account: "hawk@microsoft.com", does: "Email, meetings and files in Microsoft 365", state: "ok" },
  { id: "kusto", name: "Azure Data Explorer", icon: { img: "kusto.png" }, account: "hawk@microsoft.com", does: "Run Kusto queries", state: "ok" },
  { id: "playwright", name: "Playwright", icon: { img: "microsoft-playwright.png" }, account: null, does: "Drive a browser on this computer", state: "ok", local: true },
  { id: "sprue", name: "Sprue", icon: { img: "sprue.png" }, account: null, does: "Design prototypes and systems", state: "ok", local: true },
];
const SUGGESTED = [
  { id: "notion", name: "Notion", icon: { letter: "N", bg: "#191919" }, does: "Pages and databases", match: /notion\.(so|site)/i },
  { id: "jira", name: "Jira", icon: { img: "atlassian-labs-jira.png" }, does: "Issues and sprints", match: /atlassian\.net/i },
  { id: "sentry", name: "Sentry", icon: { img: "sentry-sentry-triage.png" }, does: "Errors and releases", match: /sentry\.io/i },
];
// Skills each demo session used, and skills saved in this prototype.
const USED = { triage: ["issue-grouping"], "tree-collapse": ["component-fixtures"], "settings-ia": [] };
const SAVED = [];

// ---------- State ----------
const off = new Map(); // session key -> Set(connection ids turned off/on for this session) as { off:Set, on:Set }
const key = () => store.session?.id || "new";
const ses = () => { if (!off.has(key())) off.set(key(), { off: new Set(), on: new Set() }); return off.get(key()); };
const subs = new Set();
const changed = () => subs.forEach((f) => f());
subscribe(() => changed());
const all = () => [...CONNECTIONS, ...SUGGESTED.filter((s) => s.connected)];
/** on | off; why = "session" | "workspace" | null */
function connState(c) {
  const s = ses();
  if (s.off.has(c.id)) return { on: false, why: "session" };
  if (s.on.has(c.id)) return { on: true, why: null };
  if (c.offIn?.includes(store.scope.workspace)) return { on: false, why: "workspace" };
  return { on: true, why: null };
}
function setConn(id, on) {
  const s = ses();
  s.off.delete(id); s.on.delete(id);
  const c = all().find((x) => x.id === id);
  const def = !c.offIn?.includes(store.scope.workspace);
  if (on !== def) (on ? s.on : s.off).add(id);
  changed();
}
function signIn(id) {
  const c = all().find((x) => x.id === id);
  c.state = "ok";
  changed();
  toast(`Signed in to ${c.name} as ${c.account || "hawkticehurst"}.`);
}
function connect(s) {
  s.connected = true; s.state = "ok"; s.account = "hawkticehurst";
  changed();
  toast(`Connected to ${s.name}. All your sessions can use it.`);
}
const skillsHere = () => {
  const { applies } = resolve(store.scope);
  return [...applies.filter((it) => it.type === "skills"), ...SAVED.filter((s) => s.source === "user" || s.workspace === store.scope.workspace)];
};
const usedHere = () => (USED[store.session?.id] || []).map((n) => skillsHere().find((s) => s.name === n)).filter(Boolean);
const SKILL_SOURCES = ["workspace", "user", "plugin", "builtin"];
const groupLabel = (src) => (src === "workspace" ? workspaceTitle(store.scope.workspace) : src === "user" ? "User" : src === "plugin" ? "From plugins" : "Built-in");
const srcLabel = (it) => (it.source === "workspace" ? workspaceTitle(it.workspace || store.scope.workspace) : it.source === "user" ? "User" : it.source === "plugin" ? "Plugin" : "Built-in");

// ---------- Pieces ----------
const iconHtml = (c, size = 20) => c.icon.img ? `<img class="ev-logo" src="${ICONS}${c.icon.img}" alt="" style="width:${size}px;height:${size}px">`
  : c.icon.codicon ? `<span class="ev-logo ev-logo-glyph" style="width:${size}px;height:${size}px"><span class="codicon codicon-${c.icon.codicon}"></span></span>`
    : `<span class="ev-logo ev-logo-letter" style="width:${size}px;height:${size}px;background:${c.icon.bg}">${c.icon.letter}</span>`;
const sw = (id, on, label) => `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-conn-toggle="${id}"><div class="monaco-switch-thumb"></div></button>`;
function connSub(c, st) {
  if (c.state === "expired") return `<span class="ev-warn"><span class="codicon codicon-warning" aria-hidden="true"></span>Sign-in expired</span>`;
  if (!st.on) return st.why === "workspace" ? `Off in ${esc(workspaceTitle(store.scope.workspace))}` : "Off for this session";
  return c.account ? esc(c.account) : "";
}
function connRow(c) {
  const st = connState(c);
  return `<div class="ev-row ev-conn${st.on ? "" : " is-off"}" data-conn="${c.id}">
    ${iconHtml(c)}<div class="ev-row-text"><div class="ev-row-name">${esc(c.name)}</div><div class="ev-row-sub">${connSub(c, st)}</div></div>
    ${c.state === "expired" ? `<button class="ev-btn primary" data-sign-in="${c.id}">Sign in</button>` : ""}
    ${sw(c.id, st.on, `${st.on ? "Turn off" : "Turn on"} ${c.name} for this session`)}
    <vsc-toolbar label="${esc(c.name)} Actions"><vsc-action icon="ellipsis" label="More Actions..." data-conn-more="${c.id}"></vsc-action></vsc-toolbar>
  </div>`;
}

// ---------- Composer: Connections pill + popover ----------
let popover = null;
function closePopover() { popover?.remove(); popover = null; }
function pillHtml() {
  const list = all(), on = list.filter((c) => connState(c).on), attention = list.some((c) => c.state === "expired" && connState(c).on);
  return `<button class="ev-pill" data-conn-pill aria-haspopup="dialog" title="What this session can reach">
    <span class="ev-pill-logos">${on.slice(0, 3).map((c) => iconHtml(c, 14)).join("")}</span>
    <span>${on.length} connection${on.length === 1 ? "" : "s"}</span>${attention ? '<span class="ev-dot" title="A connection needs attention"></span>' : ""}
    <span class="codicon codicon-chevron-down-compact" aria-hidden="true"></span></button>`;
}
function usedPillHtml() {
  const used = usedHere();
  return used.length ? `<button class="ev-pill" data-used-pill title="What the agent used in this session"><span class="codicon codicon-ai-customization-skill" aria-hidden="true"></span><span>Used ${used.map((s) => esc(s.name)).join(", ")}</span><span class="codicon codicon-chevron-down-compact" aria-hidden="true"></span></button>` : "";
}
function openPopover(anchor, html) {
  closePopover();
  const wb = document.getElementById("wb"), box = wb.getBoundingClientRect(), r = anchor.getBoundingClientRect();
  popover = document.createElement("div");
  popover.className = "ev-popover";
  popover.setAttribute("role", "dialog");
  popover.innerHTML = html;
  wb.append(popover);
  // Open on the side with more room (above by default), and fit its height to it; the list scrolls.
  const above = r.top - box.top - 14, below = box.bottom - r.bottom - 14;
  const up = above >= popover.offsetHeight || above >= below;
  popover.style.maxHeight = Math.max(160, up ? above : below) + "px";
  const h = popover.offsetHeight, w = popover.offsetWidth;
  popover.style.top = (up ? r.top - box.top - h - 6 : r.bottom - box.top + 6) + "px";
  popover.style.left = Math.min(r.left - box.left, box.width - w - 8) + "px";
}
function connPopoverHtml() {
  return `<div class="ev-pop-head"><span>${store.mode === "session" ? "This session can reach" : "Your new session can reach"}</span></div>
    <div class="ev-pop-list">${all().map(connRow).join("")}</div>
    ${store.mode === "session" ? '<div class="ev-pop-note">Changes apply from your next message.</div>' : ""}
    <div class="ev-pop-foot"><button class="ev-link" data-open-panel>Manage</button></div>`;
}
function usedPopoverHtml() {
  return `<div class="ev-pop-head"><span>Used in this session</span></div><div class="ev-pop-list">${usedHere().map((s) => `
    <div class="ev-row"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span>
      <div class="ev-row-text"><div class="ev-row-name">${esc(s.name)}</div><div class="ev-row-sub">${esc(srcLabel(s))} skill</div></div></div>`).join("")}</div>`;
}
document.addEventListener("click", (e) => {
  if (popover && !popover.contains(e.target) && !e.target.closest("[data-conn-pill], [data-used-pill], vsc-menu")) closePopover();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && popover) closePopover(); });

// Rows above the composers (new session and open session), like the product's session pills.
function renderPills() {
  const newRow = document.getElementById("ev-new-pills");
  if (newRow) newRow.innerHTML = pillHtml();
  const sRow = document.querySelector("#session-page .ev-pills");
  if (sRow) sRow.innerHTML = pillHtml() + usedPillHtml();
  if (popover?.dataset.kind === "conn") popover.querySelector(".ev-pop-list").innerHTML = all().map(connRow).join("");
}
(function mountNewSessionRow() {
  const composer = document.getElementById("composer");
  const row = document.createElement("div");
  row.className = "ev-pills ev-new-pills";
  row.id = "ev-new-pills";
  composer.before(row);
  // Typing a link to a tool that isn't connected suggests connecting it.
  const hint = document.createElement("div");
  hint.className = "ev-hint";
  hint.hidden = true;
  row.after(hint);
  let dismissed = new Set();
  const check = () => {
    const v = composer._value || "";
    const s = SUGGESTED.find((x) => !x.connected && !dismissed.has(x.id) && x.match.test(v));
    hint.hidden = !s;
    if (!s) return;
    hint.innerHTML = `${iconHtml(s, 20)}<div class="ev-row-text"><div class="ev-row-name">Connect ${esc(s.name)} so agents can read this link</div><div class="ev-row-sub">${esc(s.does)}. You'll sign in once; every session can use it.</div></div>
      <button class="ev-btn primary" data-hint-connect="${s.id}">Connect</button><button class="ev-icon-btn" data-hint-dismiss="${s.id}" aria-label="Not now" title="Not now"><span class="codicon codicon-close-compact"></span></button>`;
  };
  composer.addEventListener("input", () => requestAnimationFrame(check));
  composer.addEventListener("keyup", () => requestAnimationFrame(check));
  hint.addEventListener("click", (e) => {
    const c = e.target.closest("[data-hint-connect]"), d = e.target.closest("[data-hint-dismiss]");
    if (c) { connect(SUGGESTED.find((x) => x.id === c.dataset.hintConnect)); check(); }
    if (d) { dismissed.add(d.dataset.hintDismiss); check(); }
  });
})();

// ---------- In-chat moments for the demo session ----------
const triage = { slack: "pending", saved: null, savePhase: "suggest" };
function triageHtml() {
  const slack = all().find((c) => c.id === "slack");
  if (triage.slack === "pending" && slack.state === "ok") triage.slack = "done";
  let html = `<vsc-chat-view>
    <vsc-chat-request timestamp="Yesterday">Group the open customization migration issues by root cause. Also check the Slack thread for anything we missed: https://vscode.slack.com/archives/C07AGENTS/p1730</vsc-chat-request>
    <vsc-chat-response><vsc-chat-tool-chain>
      <vsc-chat-tool-call icon="book-compact">Read skill <button class="ev-skill-link" data-skill="issue-grouping">issue-grouping</button></vsc-chat-tool-call>
      <vsc-chat-tool-call icon="github">Searched GitHub issues · <strong>label:customization-migration</strong></vsc-chat-tool-call>
    </vsc-chat-tool-chain></vsc-chat-response></vsc-chat-view>`;
  if (triage.slack === "pending") {
    html += `<div class="ev-card ev-auth">
      <div class="ev-card-head">${iconHtml(slack, 20)}<div class="ev-row-text"><div class="ev-row-name">Sign in to Slack to read the thread you linked</div>
        <div class="ev-row-sub">Your Slack sign-in expired. The agent will continue once you're back in.</div></div></div>
      <div class="ev-card-actions"><button class="ev-btn primary" data-sign-in="slack">Sign in to Slack</button><button class="ev-btn" data-skip-slack>Continue without Slack</button></div></div>`;
    return html;
  }
  html += `<div class="ev-inline-note">${triage.slack === "done" ? `<span class="codicon codicon-check" aria-hidden="true"></span>Signed in to Slack as hawkticehurst` : `<span class="codicon codicon-circle-slash" aria-hidden="true"></span>Continued without Slack · <button class="ev-link" data-undo-skip>Sign in instead</button>`}</div>
    <vsc-chat-view><vsc-chat-response><vsc-chat-tool-chain>${triage.slack === "done" ? '<vsc-chat-tool-call icon="comment-discussion">Read Slack thread in <strong>#vscode-agents</strong> · 24 messages</vsc-chat-tool-call>' : ""}</vsc-chat-tool-chain>
      <vsc-chat-markdown>14 issues fall into 4 groups. The largest is shadowed MCP servers after migration (6 issues).${triage.slack === "done" ? " The Slack thread adds a fifth: hooks that silently stop running after a rename (2 reports, no issues filed yet)." : ""}</vsc-chat-markdown>
    </vsc-chat-response></vsc-chat-view>`;
  // Repeatable workflow → offer to save it as a skill.
  if (triage.savePhase === "suggest") html += `<div class="ev-card ev-save">
      <div class="ev-card-head"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span><div class="ev-row-text"><div class="ev-row-name">Save this as a skill?</div>
        <div class="ev-row-sub">Agents can repeat this triage the same way next time: search issues, check Slack, group by root cause.</div></div></div>
      <div class="ev-card-actions"><button class="ev-btn primary" data-save-draft>Save as skill…</button><button class="ev-btn" data-save-dismiss>Not now</button></div></div>`;
  else if (triage.savePhase === "draft") html += `<div class="ev-card ev-save">
      <div class="ev-card-title">New skill</div>
      <label class="ev-field"><span>Name</span><vsc-input id="ev-skill-name" value="triage-migration-issues"></vsc-input></label>
      <label class="ev-field"><span>When to use it</span><textarea id="ev-skill-desc" rows="2">Triage customization migration issues: search GitHub for the label, read linked Slack threads, then group by root cause with counts.</textarea></label>
      <div class="ev-field"><span>Who can use it</span><div class="ev-seg" role="radiogroup">
        <button class="ev-seg-btn" role="radio" aria-checked="${triage.scope !== "workspace"}" data-scope="user">Just me<small>All your sessions</small></button>
        <button class="ev-seg-btn" role="radio" aria-checked="${triage.scope === "workspace"}" data-scope="workspace">Everyone in vscode<small>Saved to the repo</small></button></div></div>
      <div class="ev-card-actions"><button class="ev-btn primary" data-save>Save skill</button><button class="ev-btn" data-save-dismiss>Cancel</button></div></div>`;
  else if (triage.savePhase === "saved") html += `<div class="ev-inline-note"><span class="codicon codicon-check" aria-hidden="true"></span>Saved skill <strong>${esc(triage.saved.name)}</strong> · ${esc(srcLabel(triage.saved))}</div>`;
  return html;
}
function renderTriage() {
  const chat = document.querySelector("#session-page .s-chat");
  if (chat && store.session?.id === "triage") chat.innerHTML = triageHtml();
}
document.addEventListener("session-open", (e) => {
  const { el, id } = e.detail;
  const composer = el.querySelector(".s-composer");
  const row = document.createElement("div");
  row.className = "ev-pills";
  composer.prepend(row);
  if (id === "triage") renderTriage();
  renderPills();
});
document.addEventListener("session-new", () => renderPills());
document.getElementById("page").addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  if (t("[data-skip-slack]")) { triage.slack = "skipped"; ses().off.add("slack"); renderTriage(); changed(); return; }
  if (t("[data-undo-skip]")) { triage.slack = "pending"; ses().off.delete("slack"); renderTriage(); changed(); return; }
  if (t("[data-save-draft]")) { triage.savePhase = "draft"; return renderTriage(); }
  if (t("[data-save-dismiss]")) { triage.savePhase = "none"; return renderTriage(); }
  const scopeBtn = t("[data-scope]");
  if (scopeBtn) { triage.scope = scopeBtn.dataset.scope; for (const b of scopeBtn.parentElement.children) b.setAttribute("aria-checked", String(b === scopeBtn)); return; }
  if (t("[data-save]")) {
    const name = (document.querySelector("#ev-skill-name input")?.value || "triage-migration-issues").trim();
    const ws = triage.scope === "workspace";
    triage.saved = { type: "skills", name, source: ws ? "workspace" : "user", workspace: store.scope.workspace, isNew: true, path: ws ? `.github/skills/${name}/SKILL.md` : `~/.copilot/skills/${name}/SKILL.md` };
    SAVED.push(triage.saved);
    triage.savePhase = "saved";
    renderTriage(); changed();
    return toast(ws ? `Saved ${name} to vscode/.github/skills/. Commit it to share it with your team.` : `Saved ${name}. All your sessions can use it.`);
  }
  const sk = t("[data-skill]");
  if (sk) return revealSkill(sk.dataset.skill);
  const pill = t("[data-conn-pill]");
  if (pill) { if (popover?.dataset.kind === "conn") return closePopover(); openPopover(pill, connPopoverHtml()); popover.dataset.kind = "conn"; return; }
  const used = t("[data-used-pill]");
  if (used) { if (popover?.dataset.kind === "used") return closePopover(); openPopover(used, usedPopoverHtml()); popover.dataset.kind = "used"; return; }
});

// ---------- Shared actions (panel + popover) ----------
document.addEventListener("click", (e) => {
  const t = (s) => e.target.closest(s);
  const tg = t("[data-conn-toggle]");
  if (tg) { const c = all().find((x) => x.id === tg.dataset.connToggle); const on = !connState(c).on; setConn(c.id, on); if (!on) toast(`${c.name} is off for this session.`, ["Undo"], () => setConn(c.id, true)); return; }
  const si = t("[data-sign-in]");
  if (si) { signIn(si.dataset.signIn); renderTriage(); return; }
  const more = t("[data-conn-more]");
  if (more) {
    const c = all().find((x) => x.id === more.dataset.connMore), ws = store.scope.workspace, wsT = workspaceTitle(ws), inWs = c.offIn?.includes(ws);
    return openMenu(more, [
      ...(WORKSPACES[ws] ? [{ label: inWs ? `Turn On by Default in ${wsT}` : `Turn Off by Default in ${wsT}`, act: "ws" }, "-"] : []),
      ...(c.account ? [{ label: `Switch Account (${c.account})...`, act: "account" }] : []),
      { label: "What It Can Do...", act: "info" }, "-", { label: `Disconnect ${c.name}`, act: "disconnect" },
    ], (it) => {
      if (it.act === "ws") { c.offIn = inWs ? c.offIn.filter((x) => x !== ws) : [...(c.offIn || []), ws]; ses().off.delete(c.id); ses().on.delete(c.id); changed(); toast(`${c.name} is ${inWs ? "on" : "off"} by default for sessions in ${wsT}.`); }
      else if (it.act === "info") toast(`${c.name}: ${c.does}.`);
      else if (it.act === "disconnect") toast(`Disconnecting ${c.name} would remove it from all your sessions.`);
      else toast("Pick another account to sign in with.");
    });
  }
  if (t("[data-open-panel]")) { closePopover(); window.__evOpenPanel?.(); }
});

// ---------- Side panel ----------
export function mountEveryday(root, opts) {
  root.innerHTML = `
    <div class="ev-stack" data-view="home">
      <div class="ev-view ev-home">
        <div class="ss-scope ev-scope"></div>
        <div class="cp-scroll ev-scroll"></div>
      </div>
      <div class="ev-view ev-skills" aria-hidden="true">
        <header class="cp-header ev-sub-head"><vsc-toolbar label="Navigation"><vsc-action icon="arrow-left" label="Back" data-ev-back></vsc-action></vsc-toolbar>
          <h2 class="cp-title"><span class="ev-skill-title"></span><span class="cp-count ev-skill-count"></span></h2></header>
        <div class="cp-search"><vsc-input class="ev-skill-q" placeholder="Filter skills"></vsc-input></div>
        <div class="cp-scroll ev-skill-list"></div>
      </div>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const stack = $(".ev-stack");
  const skillOff = new Map();
  const sOff = () => { if (!skillOff.has(key())) skillOff.set(key(), new Set()); return skillOff.get(key()); };

  function render() {
    renderScopeBar($(".ev-scope"), { new: "", session: "" });
    const conns = all();
    const skills = skillsHere(), used = usedHere(), newOnes = skills.filter((s) => s.isNew);
    // One row per source; each opens a page with just that source's skills.
    const groups = SKILL_SOURCES.map((src) => [src, skills.filter((x) => x.source === src)]).filter(([, l]) => l.length);
    const groupRow = ([src, list]) => {
      return `<button class="ov-row ev-skill-group" data-ev-skills="${src}"><span class="ov-text"><span class="ov-title">${esc(groupLabel(src))}</span></span>
        <span class="cp-count">${list.length}</span><span class="codicon codicon-chevron-right ov-chev" aria-hidden="true"></span></button>`;
    };
    $(".ev-scroll").innerHTML = `
      <section class="ev-sec"><div class="ev-sec-head"><h3>Connections</h3><span class="grow"></span>
        <vsc-toolbar label="Connections Actions"><vsc-action icon="add" label="Add Connection..." data-ev-browse></vsc-action></vsc-toolbar></div>
        <div class="ov-list">${conns.map(connRow).join("")}</div></section>
      <section class="ev-sec"><div class="ev-sec-head"><h3>Skills</h3></div>
        <div class="ov-list">
          ${[...used, ...newOnes.filter((n) => !used.includes(n))].map((s) => `<div class="ev-row ev-skill${sOff().has(s.name) ? " is-off" : ""}" data-skill-row="${esc(s.name)}"><span class="ev-logo ev-logo-glyph"><span class="codicon codicon-ai-customization-skill"></span></span>
            <div class="ev-row-text"><div class="ev-row-name">${esc(s.name)}${s.isNew ? '<span class="lc-flag on">New</span>' : '<span class="lc-flag">Used here</span>'}</div></div>
            ${skillSw(s.name)}</div>`).join("")}
          ${groups.map(groupRow).join("")}
        </div></section>`;
    if (stack.dataset.view === "skills") renderSkills();
  }
  const skillSw = (name) => { const on = !sOff().has(name); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${on ? "Turn off" : "Turn on"} ${esc(name)} for this session" data-skill-toggle="${esc(name)}"><div class="monaco-switch-thumb"></div></button>`; };
  let group = null; // source shown on the skills page
  function renderSkills() {
    const all = skillsHere().filter((x) => x.source === group), q = ($(".ev-skill-q input")?.value || "").trim().toLowerCase();
    const list = all.filter((x) => !q || x.name.toLowerCase().includes(q));
    $(".ev-skill-title").textContent = groupLabel(group);
    $(".ev-skill-count").textContent = all.length;
    $(".ev-skill-list").innerHTML = list.length ? `<div class="ov-list">${list.map((it) => `
      <div class="ev-row ev-skill${sOff().has(it.name) ? " is-off" : ""}" data-skill-row="${esc(it.name)}"><div class="ev-row-text"><div class="ev-row-name">${esc(it.name)}${it.isNew ? '<span class="lc-flag on">New</span>' : ""}</div></div>${skillSw(it.name)}</div>`).join("")}</div>`
      : '<div class="cp-empty">No skills match.</div>';
  }
  function go(view, src) {
    if (view === "skills" && src && src !== group) { group = src; const q = $(".ev-skill-q input"); if (q) q.value = ""; $(".ev-skill-list").scrollTop = 0; }
    stack.dataset.view = view;
    for (const v of ["home", "skills"]) root.querySelector(".ev-" + v).setAttribute("aria-hidden", String(v !== view));
    if (view === "skills") renderSkills();
  }
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    if (t("[data-ev-back]")) return go("home");
    const grp = t("[data-ev-skills]");
    if (grp) return go("skills", grp.dataset.evSkills);
    if (t("[data-ev-browse]")) return opts.onBrowse?.();
    const st = t("[data-skill-toggle]");
    if (st) { const n = st.dataset.skillToggle, s = sOff(); s.has(n) ? s.delete(n) : s.add(n); render(); if (s.has(n)) toast(`${n} is off for this session.`, ["Undo"], () => { s.delete(n); render(); }); }
  });
  $(".ev-skill-q").addEventListener("input", renderSkills);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && stack.dataset.view === "skills" && !e.target.closest?.("input") && !document.querySelector("vsc-menu")) go("home"); });
  subs.add(() => { render(); renderPills(); });
  render();
  const flash = (name) => { const row = root.querySelector(`.ev-view:not([aria-hidden="true"]) [data-skill-row="${CSS.escape(name)}"]`); if (row) { row.scrollIntoView({ block: "nearest" }); row.classList.remove("ev-flash"); void row.offsetWidth; row.classList.add("ev-flash"); } };
  return { go, highlightSkill(name) {
    // On the overview if it's listed there (used or new); otherwise on its source's page.
    go("home");
    if (root.querySelector(`.ev-home [data-skill-row="${CSS.escape(name)}"]`)) return flash(name);
    const s = skillsHere().find((x) => x.name === name);
    if (s) { go("skills", s.source); requestAnimationFrame(() => flash(name)); }
  } };
}
let panelApi = null;
export function setPanelApi(api) { panelApi = api; }
function revealSkill(name) { window.__evOpenPanel?.(); panelApi?.highlightSkill(name); }
renderPills();
