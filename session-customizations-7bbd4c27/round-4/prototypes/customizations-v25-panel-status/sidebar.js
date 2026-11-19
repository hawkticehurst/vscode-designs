/* V20 — The session's Customizations panel, now one you can customize (after Gemma and Julia: "let the user decide what goes
   there", like Word's customizable ribbon).
   - Sections (Needs Attention, Used in This Session, Plugins, MCP Servers, Skills…) show, hide and reorder from the
     Customize Panel page, from a preset, or with a section header's Hide button or context menu. The layout persists.
   - Used in This Session (after Alex): what the agent loaded and called, its cost, and stalls.
   - Switches are per session; a row that differs from its default says so ("Off in this session").
   - When the panel is wide (an existing session with room, or maximized), a Source column appears.
   - Workspace customizations stay a sub-page, with a breadcrumb back. */
import { store } from "./scope-store.js";
import { toast, openMenu } from "./panel-shell.js";
import { CONNECTIONS, PLUGINS, USER_SKILLS, K, polOf, iconHtml, subs, envOf, hooks } from "./env.js?v=12";
import { USAGE, SECTIONS, PRESETS, layout, saveLayout, applyPreset, resetLayout, settlePreset, money } from "./usage.js?v=1";
const { esc } = window.CUST;
const { HARNESSES, TYPES, WORKSPACES, resolve, workspaceLabel } = window.SCOPE;

const skey = () => store.session?.id || "new";
const hereKey = () => K(store.scope.environment, store.scope.harness);
// Per-session switches (id → on); otherwise the item's own policy. The triage session starts with Slack off.
const sessionOn = new Map([["triage", new Map([["slack", false]])]]);
const onMap = (k = skey()) => { if (!sessionOn.has(k)) sessionOn.set(k, new Map()); return sessionOn.get(k); };
const defOn = (it) => (it.kind === "plugin" ? !it.disabled : it.kind === "file" ? !it.blocked : polOf(it).v !== "off");
const ownOn = (it) => (onMap().has(it.id) ? onMap().get(it.id) : defOn(it));
const parentOf = (it) => it.origin?.plugin || it.parent;
const isOn = (it) => ownOn(it) && (!parentOf(it) || ownOn(parentOf(it)));
const NEEDS = {
  signin: { status: "Not signed in", action: "Sign In", attr: "data-sb-signin", cls: "is-warn", icon: "warning" },
  error: { status: "Couldn't start", action: "Show Output", attr: "data-sb-output", cls: "is-error", icon: "error" },
};
const WS_TYPES = ["skills", "instructions", "agents", "hooks"];
const WIDE = 520;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const typeIcon = (t) => TYPES.find((x) => x.id === t)?.icon || "file";
// V23 tries three looks for the panel's rows and controls: tree (a VS Code view), checklist, and status first.
const LOOK = (() => { const q = new URLSearchParams(location.search).get("look"); return ["tree", "checklist", "status"].includes(q) ? q : window.PANEL_CONFIG?.look || "tree"; })();

export function mountSidebar(root, opts) {
  root.innerHTML = `<div class="sb-panel cv-panel pt-panel"><div class="pt-sub" hidden></div><div class="pt-top" hidden></div><div class="cp-scroll pt-scroll"></div></div>`;
  const $ = (s) => root.querySelector(s);
  const collapsed = new Set();
  let view = "main", wide = false, filterQ = "";
  const files = new Map();

  // Rows of the repo's own customizations, as items the panel can switch per session.
  function wsItems() {
    const scope = store.scope, { applies, excluded } = resolve(scope);
    return [...applies, ...excluded].filter((x) => x.source === "workspace" && WS_TYPES.includes(x.type)).map((x) => {
      const id = `file:${x.workspace}:${x.path}`;
      if (!files.has(id)) files.set(id, { kind: "file", id, type: x.type, name: x.name, path: x.path, src: "Workspace" });
      return Object.assign(files.get(id), { blocked: x.blocked || null });
    });
  }
  // A plugin's skills and other files (every plugin-sourced row in the data belongs to the Security plugin).
  function pluginFiles(p) {
    if (p.id !== "security") return [];
    return window.SCOPE.items.filter((x) => x.source === "plugin" && WS_TYPES.includes(x.type)).map((x) => {
      const id = `pfile:${x.path || x.name}`;
      if (!files.has(id)) files.set(id, { kind: "file", id, type: x.type, name: x.name, path: x.path, parent: p });
      return files.get(id);
    });
  }
  function sourceOf(it) {
    if (it.src) return it.src;
    const p = parentOf(it);
    if (p) return p.id === "security" ? "Security plugin" : p.name;
    if (it.kind === "plugin") return "Marketplace";
    if (it.workspace) return "Workspace";
    return "User";
  }

  // ---- What each row says and can do, shared by every look ----
  const needOf = (it) => (!it.blocked && NEEDS[it.state] && isOn(it) ? NEEDS[it.state] : null);
  const canToggle = (it) => !it.blocked && !(parentOf(it) && !ownOn(parentOf(it)));
  function statusInfo(it) {
    const p = parentOf(it);
    if (it.blocked) return { text: esc(it.blocked.badge), cls: "is-muted" };
    if (p && !ownOn(p)) return { text: "Off with plugin", cls: "is-muted" };
    const own = onMap().has(it.id) && onMap().get(it.id) !== defOn(it);
    if (!ownOn(it)) return { text: own ? "Off in this session" : "Off", cls: own ? "is-muted pt-session" : "is-muted" };
    if (NEEDS[it.state]) { const n = NEEDS[it.state]; return { text: n.status, cls: n.cls, icon: n.icon }; }
    if (own) return { text: "On in this session", cls: "is-muted pt-session" };
    if (it.state === "stopped") return { text: "On demand", cls: "is-muted" };
    return null;
  }
  const statusHtml = (s) => (s ? `<span class="ct-status ${s.cls}">${s.icon ? `<span class="codicon codicon-${s.icon}" aria-hidden="true"></span>` : ""}<span class="ct-label">${s.text}</span></span>` : "");
  const iconOf = (it, size = 16) => (it.kind === "file" ? `<span class="codicon codicon-${typeIcon(it.type)} ct-icon" aria-hidden="true"></span>` : iconHtml(it, size));
  const btn = (attrs, icon, label, cls = "") => `<button type="button" class="lk-act ${cls}" ${attrs} aria-label="${esc(label)}" title="${esc(label)}"><span class="codicon codicon-${icon}" aria-hidden="true"></span></button>`;
  const moreBtn = (id, name) => btn(`data-sb-menu="${esc(id)}"`, "ellipsis", `More Actions for ${name}`, "lk-more");
  const tw = (key, isOpen, label) => `<span class="lk-tw codicon codicon-chevron-${isOpen ? "down" : "right"}" data-pt-toggle="${esc(key)}" role="button" aria-label="${isOpen ? "Collapse" : "Expand"} ${esc(label)}"></span>`;
  const twSpace = '<span class="lk-tw-space"></span>';
  const sw = (it) => { const on = ownOn(it); return `<button class="monaco-switch${on ? " checked" : ""}" type="button" role="switch" aria-checked="${on}" aria-label="${esc(it.name)} in this session" data-sb-toggle="${esc(it.id)}"><div class="monaco-switch-thumb"></div></button>`; };
  const cb = (it) => `<vsc-checkbox class="lk-cb" ${ownOn(it) ? "checked" : ""}${canToggle(it) ? "" : " disabled"} label="${esc(it.name)} in this session" data-sb-toggle="${esc(it.id)}"></vsc-checkbox>`;
  const needBtn = (it, n) => `<vsc-button secondary class="lk-btn" ${n.attr}="${esc(it.id)}">${n.action}</vsc-button>`;
  const onCount = (list) => `${list.filter(isOn).length} of ${list.length} on`;

  // ---- The page as data: sections of entries (item, use, drill, note) ----
  function usageEntries() {
    const list = (USAGE[skey()] || []).map((u) => ({ t: "use", u, ...usageItem(u) })).filter((x) => x.name).sort((a, b) => b.u.cost - a.u.cost);
    const total = list.reduce((s, x) => s + x.u.cost, 0), stalls = list.reduce((s, x) => s + (x.u.stalls?.n || 0), 0);
    const meta = list.length ? `${layout.cost && total ? `${money(total)} · ` : ""}${list.length} used${stalls ? ` · <span class="pt-warn-text">${plural(stalls, "stall")}</span>` : ""}` : "";
    return { entries: list.length ? list : [{ t: "note", html: store.session ? "Nothing used yet." : "Usage shows here once the session starts." }], meta };
  }
  function mainSections() {
    const k = hereKey(), env = envOf(store.scope.environment), agent = HARNESSES[store.scope.harness].label;
    const here = (it) => it.at.has(k) && (!it.workspace || it.workspace === store.scope.workspace);
    const plugins = PLUGINS.filter(here), mcp = CONNECTIONS.filter(here);
    const kidsOf = (p) => [...mcp.filter((c) => parentOf(c) === p), ...pluginFiles(p)];
    const needs = mcp.filter((c) => needOf(c));
    const cardsOnTop = LOOK === "status";
    const own = mcp.filter((c) => !parentOf(c) && (cardsOnTop || !(layout.shown.includes("needs") && needs.includes(c))));
    const none = [{ t: "note", html: `None on ${esc(env.label)} for ${esc(agent)}` }];
    const ws = store.scope.workspace, wsList = WORKSPACES[ws] ? wsItems() : [];
    const yours = USER_SKILLS.filter((x) => x.at.has(k));
    const SEC = {
      needs: () => (needs.length && !cardsOnTop ? { label: "Needs Attention", badge: needs.length, entries: needs.map((it) => ({ t: "item", it })) } : null),
      activity: () => { const u = usageEntries(); return { label: "Used in This Session", meta: u.meta, entries: u.entries }; },
      plugins: () => ({ label: "Plugins", meta: plugins.length ? onCount(plugins) : "", entries: plugins.map((it) => ({ t: "item", it, kids: kidsOf(it) })) }),
      mcp: () => ({ label: "MCP Servers", meta: own.length ? onCount(own) : "", badge: LOOK === "tree" ? own.filter(needOf).length : 0, entries: own.map((it) => ({ t: "item", it })) }),
      more: () => ({ label: "Skills, Instructions &amp; Agents", entries: [
        ...(WORKSPACES[ws] ? [{ t: "drill", attr: "data-sb-ws", icon: "folder", name: workspaceLabel(ws), text: plural(wsList.filter((x) => !x.blocked).length, "item"), src: "Workspace" }] : []),
        { t: "drill", attr: 'data-sb-more-type="skills"', icon: "account", name: "Yours", text: plural(yours.length, "skill"), src: "User" }] }),
    };
    const sections = layout.order.filter((id) => layout.shown.includes(id)).map((id) => { const s = SEC[id](); return s && { id, section: id, ...s, entries: s.entries.length ? s.entries : none }; }).filter(Boolean);
    return { sections, needs, anyShown: layout.shown.length > 0 };
  }
  function wsSections() {
    const list = wsItems();
    return WS_TYPES.map((t) => {
      const of = list.filter((x) => x.type === t).sort((a, b) => a.name.localeCompare(b.name));
      return of.length ? { id: `ws:${t}`, label: TYPES.find((x) => x.id === t).label, meta: onCount(of), entries: of.map((it) => ({ t: "item", it })) } : null;
    }).filter(Boolean);
  }
  // The Tree look's filter box narrows every section to matching rows (a plugin stays when one of its children matches).
  function applyFilter(sections) {
    const q = filterQ.trim().toLowerCase();
    if (!q) return sections;
    const hit = (name) => String(name).toLowerCase().includes(q);
    return sections.map((s) => {
      const entries = s.entries.flatMap((e) => {
        if (e.t === "note") return [];
        if (e.t !== "item") return hit(e.name) ? [e] : [];
        if (hit(e.it.name)) return [e];
        const kids = (e.kids || []).filter((k) => hit(k.name));
        return kids.length ? [{ ...e, kids, forceOpen: true }] : [];
      });
      return entries.length ? { ...s, entries } : null;
    }).filter(Boolean);
  }

  // ---- Looks ----
  const title = (it) => esc(it.path || it.does || it.name);
  const LOOKS = {
    // Tree: a VS Code view. Pane headers, one-line rows with a muted description, decorations and inline actions on hover.
    tree: {
      head(s, isOpen) {
        const hide = s.section ? btn(`data-sb-hide="${esc(s.section)}"`, "eye-closed", `Hide ${s.label.replace("&amp;", "&")} from This Panel`) : "";
        return `<div class="pt-group lk-head" role="treeitem" aria-level="1" aria-expanded="${isOpen}" tabindex="-1" data-pt-row-toggle="${esc(s.id)}"${s.section ? ` data-sb-section="${esc(s.section)}"` : ""}>
          <span class="lk-tw codicon codicon-chevron-${isOpen ? "down" : "right"}" aria-hidden="true"></span><span class="lk-head-label">${s.label}</span>
          ${s.meta ? `<span class="lk-head-meta">${s.meta}</span>` : ""}${s.badge ? `<vsc-count-badge class="lk-badge is-warn" title="${plural(s.badge, "item")} ${s.badge === 1 ? "needs" : "need"} attention">${s.badge}</vsc-count-badge>` : ""}<span class="lk-head-acts">${hide}</span></div>`;
      },
      item(it, level, kids, isOpen) {
        const st = statusInfo(it), n = needOf(it), off = !isOn(it) || it.blocked;
        const deco = n ? `<span class="codicon codicon-${n.icon} lk-deco ${n.cls}" aria-hidden="true"></span>` : "";
        const acts = [
          n ? btn(`${n.attr}="${esc(it.id)}"`, n.attr === "data-sb-signin" ? "sign-in" : "output", n.action) : "",
          canToggle(it) ? btn(`data-sb-toggle="${esc(it.id)}"`, ownOn(it) ? "circle-slash" : "pass", `${ownOn(it) ? "Turn Off" : "Turn On"} for This Session`) : "",
          moreBtn(it.id, it.name),
        ].join("");
        return `<div class="ct-row lk-row${off ? " is-off" : ""}" role="treeitem" tabindex="-1" aria-level="${level}"${kids.length ? ` aria-expanded="${!!isOpen}"` : ""} data-sb-row="${esc(it.id)}" title="${title(it)}" style="--lk-level:${level}">
          ${kids.length ? tw(`item:${it.id}`, isOpen, it.name) : twSpace}${iconOf(it)}<span class="lk-label">${esc(it.name)}</span>${st ? `<span class="lk-desc ${st.cls}">${st.text}</span>` : ""}
          <span class="lk-end"><span class="lk-acts">${acts}</span>${deco}</span></div>`;
      },
      use(e) {
        const st = e.u.stalls ? `<span class="lk-desc is-warn">${plural(e.u.stalls.n, "stall")} · ${e.u.stalls.secs}s</span>` : `<span class="lk-desc">${esc(e.u.wait || e.u.uses)}</span>`;
        return `<div class="ct-row lk-row" role="treeitem" tabindex="-1" aria-level="2" data-sb-use="${esc(e.id)}" title="${esc(useTip(e))}" style="--lk-level:2">${twSpace}${e.icon}<span class="lk-label">${esc(e.name)}</span>${st}
          <span class="lk-end">${e.u.stalls ? '<span class="codicon codicon-warning lk-deco is-warn" aria-hidden="true"></span>' : ""}${layout.cost && e.u.cost ? `<span class="lk-cost">${money(e.u.cost)}</span>` : ""}</span></div>`;
      },
      drill: (e) => `<div class="ct-row lk-row" role="treeitem" tabindex="-1" aria-level="2" ${e.attr} style="--lk-level:2">${twSpace}<span class="codicon codicon-${e.icon} ct-icon" aria-hidden="true"></span><span class="lk-label">${esc(e.name)}</span><span class="lk-desc">${esc(e.text)}</span><span class="lk-end"><span class="codicon codicon-chevron-right lk-deco" aria-hidden="true"></span></span></div>`,
      note: (e) => `<div class="lk-note" style="--lk-level:2">${twSpace}<span>${e.html}</span></div>`,
      top: () => `<div class="lk-bar"><div class="lk-filter monaco-inputbox"><span class="codicon codicon-filter" aria-hidden="true"></span><input class="input lk-q" type="text" placeholder="Filter" aria-label="Filter customizations" spellcheck="false"></div>
        <vsc-toolbar label="Customizations Actions"><vsc-action icon="compass" label="Discover" data-sb-browse></vsc-action><vsc-action icon="settings-gear" label="Manage Customizations" data-sb-more-type="plugins"></vsc-action><vsc-action icon="layout" label="Customize Panel" data-sb-customize></vsc-action><vsc-action icon="collapse-all" label="Collapse All" data-sb-collapse-all></vsc-action></vsc-toolbar></div>`,
      foot: () => "",
    },
    // Checklist: each row's checkbox is its switch for this session, always visible; sign-ins and errors get a real button.
    checklist: {
      head(s, isOpen) {
        const hide = s.section ? btn(`data-sb-hide="${esc(s.section)}"`, "eye-closed", `Hide ${s.label.replace("&amp;", "&")} from This Panel`) : "";
        return `<div class="pt-group lk-head" role="treeitem" aria-level="1" aria-expanded="${isOpen}" tabindex="-1" data-pt-row-toggle="${esc(s.id)}"${s.section ? ` data-sb-section="${esc(s.section)}"` : ""}>
          <span class="lk-tw codicon codicon-chevron-${isOpen ? "down" : "right"}" aria-hidden="true"></span><span class="lk-head-label">${s.label}</span><span class="lk-head-acts">${hide}</span>
          ${s.meta || s.badge ? `<span class="lk-head-meta">${s.meta || plural(s.badge, "item")}</span>` : ""}</div>`;
      },
      item(it, level, kids, isOpen) {
        const st = statusInfo(it), n = needOf(it), off = !isOn(it) || it.blocked;
        return `<div class="ct-row lk-row${off ? " is-off" : ""}" role="treeitem" tabindex="-1" aria-level="${level}"${kids.length ? ` aria-expanded="${!!isOpen}"` : ""} data-sb-row="${esc(it.id)}" title="${title(it)}" style="--lk-level:${level}">
          ${kids.length ? tw(`item:${it.id}`, isOpen, it.name) : twSpace}${cb(it)}${iconOf(it)}<span class="lk-label">${esc(it.name)}</span>
          <span class="lk-end">${n ? `${statusHtml(st)}${needBtn(it, n)}` : statusHtml(st)}</span></div>`;
      },
      use(e) {
        const st = e.u.stalls ? statusHtml({ text: `${plural(e.u.stalls.n, "stall")} · ${e.u.stalls.secs}s`, cls: "is-warn", icon: "warning" }) : statusHtml({ text: esc(e.u.wait || e.u.uses), cls: "is-muted" });
        return `<div class="ct-row lk-row" role="treeitem" tabindex="-1" aria-level="2" data-sb-use="${esc(e.id)}" title="${esc(useTip(e))}" style="--lk-level:2">${twSpace}${e.icon}<span class="lk-label">${esc(e.name)}</span>
          <span class="lk-end">${st}${layout.cost ? `<span class="lk-cost">${money(e.u.cost) || "&nbsp;"}</span>` : ""}</span></div>`;
      },
      drill: (e) => `<div class="ct-row lk-row" role="treeitem" tabindex="-1" aria-level="2" ${e.attr} style="--lk-level:2">${twSpace}<span class="codicon codicon-${e.icon} ct-icon" aria-hidden="true"></span><span class="lk-label">${esc(e.name)}</span><span class="lk-end">${statusHtml({ text: esc(e.text), cls: "is-muted" })}<span class="codicon codicon-chevron-right lk-deco" aria-hidden="true"></span></span></div>`,
      note: (e) => `<div class="lk-note" style="--lk-level:2">${twSpace}<span>${e.html}</span></div>`,
      top: () => "",
      foot: () => `<div class="lk-foot"><vsc-button secondary icon="compass" data-sb-browse>Discover</vsc-button><vsc-button secondary icon="settings-gear" data-sb-more-type="plugins">Manage</vsc-button>
        <vsc-toolbar label="Panel"><vsc-action icon="layout" label="Customize Panel" data-sb-customize></vsc-action></vsc-toolbar></div>`,
    },
    // Status first: what needs you sits on top as notifications; rows have two lines (name, then source and state) and a switch.
    status: {
      head(s, isOpen) {
        return `<div class="pt-group lk-head" role="treeitem" aria-level="1" aria-expanded="${isOpen}" tabindex="-1" data-pt-row-toggle="${esc(s.id)}"${s.section ? ` data-sb-section="${esc(s.section)}"` : ""}>
          <span class="lk-head-label">${s.label}</span>${s.meta ? `<span class="lk-head-meta">${s.meta}</span>` : ""}<span class="lk-tw codicon codicon-chevron-${isOpen ? "up" : "down"}" aria-hidden="true"></span></div>`;
      },
      item(it, level, kids, isOpen) {
        const st = statusInfo(it), off = !isOn(it) || it.blocked, sub = [esc(sourceOf(it)), st && !NEEDS[it.state] ? st.text : "", kids.length ? plural(kids.length, "item") : ""].filter(Boolean).join(" · ");
        const n = NEEDS[it.state] && isOn(it) && !it.blocked;
        const two = level === 2;
        return `<div class="ct-row lk-row${two ? " is-two" : ""}${off ? " is-off" : ""}" role="treeitem" tabindex="-1" aria-level="${level}"${kids.length ? ` aria-expanded="${!!isOpen}"` : ""} data-sb-row="${esc(it.id)}" title="${title(it)}" style="--lk-level:${level}">
          ${iconOf(it, two ? 20 : 16)}<span class="lk-text"><span class="lk-label">${esc(it.name)}${n ? ` <span class="codicon codicon-${NEEDS[it.state].icon} lk-deco ${NEEDS[it.state].cls}" aria-label="${NEEDS[it.state].status}"></span>` : ""}</span>${two ? `<span class="lk-sub">${sub}</span>` : ""}</span>
          <span class="lk-end">${kids.length ? btn(`data-pt-toggle="item:${esc(it.id)}"`, isOpen ? "chevron-up" : "chevron-down", `${isOpen ? "Hide" : "Show"} What ${it.name} Brings`) : ""}${moreBtn(it.id, it.name)}${canToggle(it) ? sw(it) : ""}</span></div>`;
      },
      use(e) {
        const sub = [esc(e.src), e.u.stalls ? `<span class="pt-warn-text">${plural(e.u.stalls.n, "stall")} · ${e.u.stalls.secs}s</span>` : esc(e.u.wait || e.u.uses)].join(" · ");
        return `<div class="ct-row lk-row is-two" role="treeitem" tabindex="-1" aria-level="2" data-sb-use="${esc(e.id)}" title="${esc(useTip(e))}" style="--lk-level:2">${e.icon.replace("width:16px;height:16px", "width:20px;height:20px")}<span class="lk-text"><span class="lk-label">${esc(e.name)}</span><span class="lk-sub">${sub}</span></span>
          <span class="lk-end">${layout.cost && e.u.cost ? `<span class="lk-cost">${money(e.u.cost)}</span>` : ""}</span></div>`;
      },
      drill: (e) => `<div class="ct-row lk-row is-two" role="treeitem" tabindex="-1" aria-level="2" ${e.attr} style="--lk-level:2"><span class="codicon codicon-${e.icon} ct-icon" aria-hidden="true"></span><span class="lk-text"><span class="lk-label">${esc(e.name)}</span><span class="lk-sub">${esc(e.src)} · ${esc(e.text)}</span></span><span class="lk-end"><span class="codicon codicon-chevron-right lk-deco" aria-hidden="true"></span></span></div>`,
      note: (e) => `<div class="lk-note">${e.html}</div>`,
      top: () => {
        const agent = HARNESSES[store.scope.harness].label, env = envOf(store.scope.environment).label;
        return `<div class="lk-bar"><span class="lk-ctx" title="Where this session runs"><span class="codicon codicon-repo" aria-hidden="true"></span>${esc(workspaceLabel(store.scope.workspace))}<span class="lk-dot">·</span>${esc(agent)}<span class="lk-dot">·</span>${esc(env)}</span>
          <vsc-toolbar label="Customizations Actions"><vsc-action icon="compass" label="Discover" data-sb-browse></vsc-action><vsc-action icon="settings-gear" label="Manage Customizations" data-sb-more-type="plugins"></vsc-action><vsc-action icon="layout" label="Customize Panel" data-sb-customize></vsc-action></vsc-toolbar></div>`;
      },
      foot: () => "",
      cards(needs) {
        if (!needs.length) return "";
        const say = { signin: (c) => `<b>${esc(c.name)}</b> isn't signed in. Tools that use it will wait.`, error: (c) => `<b>${esc(c.name)}</b> couldn't start.` };
        return `<div class="lk-cards" role="region" aria-label="Needs attention">${needs.map((c) => { const n = NEEDS[c.state]; return `<div class="lk-card ${n.cls}" role="status"><span class="codicon codicon-${n.icon}" aria-hidden="true"></span><span class="lk-card-text">${say[c.state](c)}</span>${needBtn(c, n)}</div>`; }).join("")}</div>`;
      },
    },
  };
  const L = () => LOOKS[LOOK];
  const useTip = (e) => `${e.name} · ${e.u.uses}${e.u.tokens ? ` · ${Math.round(e.u.tokens / 100) / 10}k tokens` : ""}${e.u.cost ? ` · ${money(e.u.cost)}` : ""}`;
  function entryHtml(e, level = 2) {
    const look = L();
    if (e.t === "note") return look.note(e);
    if (e.t === "use") return look.use(e);
    if (e.t === "drill") return look.drill(e);
    const kids = e.kids || [], key = `item:${e.it.id}`, isOpen = kids.length && (e.forceOpen || !collapsed.has(key));
    return look.item(e.it, level, kids, isOpen) + (isOpen ? kids.map((k) => look.item(k, level + 1, [], false)).join("") : "");
  }
  const sectionsHtml = (sections, label) => `<div class="lk-list lk-${LOOK}" role="tree" aria-label="${esc(label)}">${sections.map((s) => {
    const isOpen = !!filterQ.trim() || !collapsed.has(s.id);
    return `<div class="lk-sec" role="group">${L().head(s, isOpen)}${isOpen ? s.entries.map((e) => entryHtml(e)).join("") : ""}</div>`;
  }).join("")}</div>`;
  let lastTop = null;
  function setTop(html) {
    const top = $(".pt-top");
    if (html === lastTop) return;
    lastTop = html; top.innerHTML = html; top.hidden = !html;
    const q = top.querySelector(".lk-q");
    if (q) q.value = filterQ;
  }

  // Used in This Session: a row per customization the agent loaded or called, most expensive first.
  function usageItem(u) {
    if (u.conn) { const c = CONNECTIONS.find((x) => x.id === u.conn); return c && { it: c, icon: iconHtml(c, 16), id: c.id, name: c.name, src: sourceOf(c) }; }
    if (u.skill) { const mine = USER_SKILLS.some((s) => s.name === u.skill); return { icon: `<span class="codicon codicon-${typeIcon("skills")} ct-icon" aria-hidden="true"></span>`, id: `skill:${u.skill}`, name: u.skill, src: mine ? "User" : "Workspace" }; }
    return { icon: `<span class="codicon codicon-${typeIcon(u.type)} ct-icon" aria-hidden="true"></span>`, id: `doc:${u.file}`, name: u.file, src: "Workspace" };
  }

  function renderMain() {
    const { sections, needs, anyShown } = mainSections(), shown = applyFilter(sections);
    setTop(L().top());
    const cards = LOOK === "status" && !filterQ ? L().cards(needs) : "";
    const empty = !anyShown ? `<div class="pt-blank"><p>This panel is empty.</p><button type="button" class="pt-link" data-sb-customize><span class="codicon codicon-layout" aria-hidden="true"></span>Customize Panel</button></div>`
      : !shown.length ? `<div class="pt-blank"><p>No customizations match “${esc(filterQ.trim())}”.</p></div>` : "";
    $(".pt-scroll").innerHTML = cards + (empty || sectionsHtml(shown, "Customizations in this session")) + L().foot();
  }

  function renderWorkspace() {
    const ws = store.scope.workspace, w = WORKSPACES[ws];
    if (!w) { view = "main"; return renderMain(); }
    setTop("");
    const list = wsItems(), agent = HARNESSES[store.scope.harness].label;
    $(".pt-sub").innerHTML = crumbs(w.label);
    const off = list.filter((x) => x.blocked).length;
    $(".pt-scroll").innerHTML = `<p class="pt-note">From <span class="pt-path">${esc(w.path)}</span>. They load with every session in this repo${off ? `; ${plural(off, "item")} ${off === 1 ? "doesn't" : "don't"} apply in ${esc(agent)}` : ""}.</p>${sectionsHtml(wsSections(), `${w.label} customizations`)}`;
  }
  const crumbs = (label) => `<div class="pt-crumbs"><button type="button" class="pt-crumb" data-sb-back>Customizations</button><span class="codicon codicon-chevron-right" aria-hidden="true"></span><span class="pt-crumb is-current" aria-current="page">${esc(label)}</span></div>`;

  // Customize Panel: a preset to start from, then each section's checkbox and its place in the order.
  function renderCustomize() {
    $(".pt-sub").innerHTML = crumbs("Customize Panel");
    const presets = [...PRESETS, ...(layout.preset === "custom" ? [{ id: "custom", label: "Custom" }] : [])];
    const rows = layout.order.map((id, i) => {
      const s = SECTIONS.find((x) => x.id === id), on = layout.shown.includes(id);
      return `<li class="pc-row${on ? "" : " is-off"}" draggable="true" data-pc-sec="${id}">
        <span class="codicon codicon-gripper pc-grip" aria-hidden="true"></span>
        <vsc-checkbox ${on ? "checked" : ""} label="Show ${esc(s.label)}" data-pc-show="${id}"></vsc-checkbox>
        <span class="pc-text"><span class="pc-label">${esc(s.label)}</span><span class="pc-desc">${esc(s.desc)}</span></span>
        <span class="pc-move"><button type="button" class="pt-icon-btn" data-pc-move="-1" aria-label="Move ${esc(s.label)} up"${i === 0 ? " disabled" : ""}><span class="codicon codicon-arrow-up" aria-hidden="true"></span></button><button type="button" class="pt-icon-btn" data-pc-move="1" aria-label="Move ${esc(s.label)} down"${i === layout.order.length - 1 ? " disabled" : ""}><span class="codicon codicon-arrow-down" aria-hidden="true"></span></button></span></li>`;
    }).join("");
    const opt = (key, label, desc) => `<li class="pc-row pc-opt"><vsc-checkbox ${layout[key] ? "checked" : ""} label="${esc(label)}" data-pc-opt="${key}"></vsc-checkbox><span class="pc-text"><span class="pc-label">${esc(label)}</span><span class="pc-desc">${esc(desc)}</span></span></li>`;
    $(".pt-scroll").innerHTML = `<p class="pt-note">Choose what this panel shows in every session. Drag sections to reorder them.</p>
      <div class="pc-head" id="pc-presets">Start From</div>
      <div class="pc-presets" role="radiogroup" aria-labelledby="pc-presets">${presets.map((p) => `<button type="button" role="radio" class="pc-preset${layout.preset === p.id ? " is-on" : ""}" aria-checked="${layout.preset === p.id}" data-pc-preset="${p.id}"${p.id === "custom" ? " disabled" : ""}>${esc(p.label)}</button>`).join("")}</div>
      <div class="pc-head" id="pc-secs">Sections</div>
      <ul class="pc-list" aria-labelledby="pc-secs">${rows}</ul>
      <div class="pc-head" id="pc-rows">Rows</div>
      <ul class="pc-list" aria-labelledby="pc-rows">${LOOK === "tree" ? opt("hoverSwitches", "Show row actions on hover", "Keep rows quiet until you point at one") : ""}${opt("cost", "Show cost", "In Used in This Session")}</ul>
      <div class="pt-foot"><button type="button" class="pt-link" data-pc-reset><span class="codicon codicon-discard" aria-hidden="true"></span>Reset to Default</button></div>`;
  }

  function render() {
    const panel = root.querySelector(".pt-panel");
    $(".pt-sub").hidden = view === "main";
    panel.classList.toggle("is-sub", view !== "main");
    panel.classList.toggle("is-wide", wide);
    panel.classList.toggle("is-switches-always", !layout.hoverSwitches);
    panel.classList.add(`lk-look-${LOOK}`);
    if (view !== "main") setTop("");
    if (view === "workspace") renderWorkspace();
    else if (view === "customize") renderCustomize();
    else renderMain();
    // One row in the tree takes Tab; arrows move from there.
    const rows = [...root.querySelectorAll(".pt-scroll :is(.ct-row, .pt-group)")];
    if (rows.length && !rows.some((r) => r.tabIndex === 0)) rows[0].tabIndex = 0;
  }
  function go(v) {
    view = v; render();
    $(".pt-scroll").scrollTop = 0;
    requestAnimationFrame(() => (v !== "main" ? $(".pt-crumb[data-sb-back]") : $("[data-sb-ws]") || $(".pt-scroll .pt-group"))?.focus());
  }
  function hideSection(id) {
    const s = SECTIONS.find((x) => x.id === id);
    layout.shown = layout.shown.filter((x) => x !== id); settlePreset(); render();
    toast(`${s.label} is hidden from this panel.`, ["Undo", "Customize Panel"], (b) => {
      if (b === "Undo") { layout.shown.push(id); settlePreset(); render(); } else go("customize");
    });
  }
  function move(id, d) {
    const i = layout.order.indexOf(id), j = i + d;
    if (j < 0 || j >= layout.order.length) return;
    layout.order.splice(i, 1); layout.order.splice(j, 0, id); settlePreset(); render();
  }

  const all = () => [...PLUGINS, ...CONNECTIONS, ...files.values()];
  const byId = (id) => all().find((x) => x.id === id);
  const ctx = () => ({ env: store.scope.environment, ws: store.scope.workspace, agent: store.scope.harness });
  const childrenOf = (p) => CONNECTIONS.filter((c) => parentOf(c) === p && c.at.has(hereKey()));
  function openItem(it) {
    if (it.kind === "file") return toast(`Opened ${it.path || it.name}.`);
    return hooks.openDetail(it.kind === "plugin" ? "plugins" : "connections", it.id);
  }
  const focusKey = (sel) => { const el = root.querySelector(sel); (el?.closest(".ct-row, .pt-group") || el)?.focus(); };
  function toggleItem(it) {
    const m = onMap(), was = ownOn(it);
    m.set(it.id, !was); render();
    focusKey(`.pt-scroll [data-sb-row="${CSS.escape(it.id)}"]`);
    const kids = it.kind === "plugin" ? childrenOf(it) : [];
    const also = kids.length ? ` ${kids.map((c) => c.name).join(", ")} ${was ? "is off" : "is back on"} with it.` : "";
    toast(`${it.name} is ${was ? "off" : "on"} in this session only. Other sessions in ${workspaceLabel(store.scope.workspace)} keep their setting.${also}`, ["Undo"], () => { m.set(it.id, was); render(); });
  }
  function signIn(it) { it.state = "ok"; render(); document.dispatchEvent(new CustomEvent("item-signed-in", { detail: { id: it.id } })); toast(`Signed in to ${it.name}.`); }
  // Every row's actions in one menu, from its ... button or a right-click.
  function rowMenu(it, at) {
    const n = needOf(it), sec = at instanceof Element ? at.closest(".lk-sec")?.querySelector("[data-sb-section]")?.dataset.sbSection : null;
    openMenu(at, [
      { label: it.kind === "file" ? "Open File" : "Show Details", act: "open" },
      ...(n ? [{ label: n.action, act: n.attr }] : []),
      "-",
      { label: ownOn(it) ? "Turn Off for This Session" : "Turn On for This Session", act: "toggle", disabled: !canToggle(it) },
      ...(it.kind !== "file" ? [{ label: "Manage in Customizations...", act: "manage" }] : []),
      ...(sec && view === "main" ? ["-", { label: "Hide This Section", act: "hide" }] : []),
    ], (m) => {
      if (m.act === "open") return openItem(it);
      if (m.act === "data-sb-signin") return signIn(it);
      if (m.act === "data-sb-output") return hooks.openDetail("connections", it.id, { output: true });
      if (m.act === "toggle") return toggleItem(it);
      if (m.act === "manage") return opts.onConfigure(`${store.scope.harness}:${it.kind === "plugin" ? "plugins" : "mcp"}`, ctx());
      if (m.act === "hide") return hideSection(sec);
    });
  }
  root.addEventListener("input", (e) => { if (e.target.matches(".lk-q")) { filterQ = e.target.value; render(); } });
  root.addEventListener("keydown", (e) => { if (e.target.matches(".lk-q") && e.key === "Escape" && filterQ) { e.stopPropagation(); e.target.value = filterQ = ""; render(); } else if (e.target.matches(".lk-q") && e.key === "ArrowDown") { e.preventDefault(); $(".pt-scroll :is(.ct-row, .pt-group)")?.focus(); } });
  root.addEventListener("click", (e) => {
    const t = (s) => e.target.closest(s);
    const menu = t("[data-sb-menu]");
    if (menu) { e.stopPropagation(); return rowMenu(byId(menu.dataset.sbMenu), menu); }
    if (t("[data-sb-collapse-all]")) { for (const s of root.querySelectorAll(".pt-scroll [data-pt-row-toggle]")) collapsed.add(s.dataset.ptRowToggle); return render(); }
    const hide = t("[data-sb-hide]");
    if (hide) return hideSection(hide.dataset.sbHide);
    const tw = t("[data-pt-toggle]") || t("[data-pt-row-toggle]");
    if (tw) {
      const key = tw.dataset.ptToggle || tw.dataset.ptRowToggle;
      collapsed.has(key) ? collapsed.delete(key) : collapsed.add(key);
      render();
      return focusKey(`[data-pt-row-toggle="${CSS.escape(key)}"], [data-pt-toggle="${CSS.escape(key)}"]`);
    }
    const tg = t("[data-sb-toggle]");
    if (tg) { if (tg.hasAttribute("disabled")) return; return toggleItem(byId(tg.dataset.sbToggle)); }
    if (t("[data-sb-back]")) return go("main");
    if (t("[data-sb-ws]")) return go("workspace");
    if (t("[data-sb-customize]")) return go("customize");
    const pr = t("[data-pc-preset]");
    if (pr) { applyPreset(pr.dataset.pcPreset); render(); return $(`[data-pc-preset="${pr.dataset.pcPreset}"]`)?.focus(); }
    const show = t("[data-pc-show]");
    if (show) {
      const id = show.dataset.pcShow;
      layout.shown = layout.shown.includes(id) ? layout.shown.filter((x) => x !== id) : [...layout.shown, id];
      settlePreset(); render(); return $(`[data-pc-show="${id}"]`)?.focus();
    }
    const opt = t("[data-pc-opt]");
    if (opt) { layout[opt.dataset.pcOpt] = !layout[opt.dataset.pcOpt]; saveLayout(); render(); return $(`[data-pc-opt="${opt.dataset.pcOpt}"]`)?.focus(); }
    const mv = t("[data-pc-move]");
    if (mv) { const id = mv.closest("[data-pc-sec]").dataset.pcSec; move(id, +mv.dataset.pcMove); return $(`[data-pc-sec="${id}"] [data-pc-move="${mv.dataset.pcMove}"]:not([disabled])`)?.focus() || $(`[data-pc-show="${id}"]`)?.focus(); }
    if (t("[data-pc-reset]")) { resetLayout(); render(); return toast("The panel is back to its default sections."); }
    const out = t("[data-sb-output]");
    if (out) return hooks.openDetail("connections", out.dataset.sbOutput, { output: true });
    const si = t("[data-sb-signin]");
    if (si) return signIn(byId(si.dataset.sbSignin));
    if (t("[data-sb-browse]")) return opts.onBrowse();
    const mt = t("[data-sb-more-type]");
    if (mt) return opts.onConfigure(`${store.scope.harness}:${mt.dataset.sbMoreType}`, ctx());
    const use = t("[data-sb-use]");
    if (use) {
      const id = use.dataset.sbUse;
      if (id.startsWith("skill:")) return hooks.openDetail("skills", id.slice(6));
      if (id.startsWith("doc:")) return toast(`Opened ${id.slice(4)}.`);
      return hooks.openDetail("connections", id, USAGE[skey()]?.find((u) => u.conn === id)?.stalls ? { output: true } : undefined);
    }
    const rr = t("[data-sb-row]");
    if (rr) return openItem(byId(rr.dataset.sbRow));
  });
  // A section header's context menu, like a toolbar's: hide it, or customize the whole panel.
  root.addEventListener("contextmenu", (e) => {
    const r = e.target.closest("[data-sb-row]");
    if (r && byId(r.dataset.sbRow)) { e.preventDefault(); return rowMenu(byId(r.dataset.sbRow), { x: e.clientX, y: e.clientY }); }
    const g = e.target.closest("[data-sb-section]");
    if (!g || view !== "main") return;
    e.preventDefault();
    const id = g.dataset.sbSection, s = SECTIONS.find((x) => x.id === id), i = layout.order.filter((x) => layout.shown.includes(x)).indexOf(id), n = layout.shown.length;
    openMenu({ x: e.clientX, y: e.clientY }, [
      { label: `Hide ${s.label}`, act: "hide" }, "-",
      { label: "Move Up", act: "up", disabled: i === 0 }, { label: "Move Down", act: "down", disabled: i === n - 1 }, "-",
      { label: "Customize Panel...", act: "customize" },
    ], (m) => {
      if (m.act === "hide") return hideSection(id);
      if (m.act === "customize") return go("customize");
      const vis = layout.order.filter((x) => layout.shown.includes(x)), other = vis[i + (m.act === "up" ? -1 : 1)];
      const a = layout.order.indexOf(id), b = layout.order.indexOf(other);
      [layout.order[a], layout.order[b]] = [layout.order[b], layout.order[a]];
      settlePreset(); render();
    });
  });
  // Drag a section on the Customize Panel page to reorder it.
  let dragId = null;
  root.addEventListener("dragstart", (e) => { const li = e.target.closest?.("[data-pc-sec]"); if (!li) return; dragId = li.dataset.pcSec; li.classList.add("is-dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); });
  root.addEventListener("dragover", (e) => {
    const li = e.target.closest?.("[data-pc-sec]");
    if (!li || !dragId) return;
    e.preventDefault();
    const r = li.getBoundingClientRect(), after = e.clientY > r.top + r.height / 2;
    for (const x of root.querySelectorAll(".pc-row")) x.classList.remove("drop-before", "drop-after");
    if (li.dataset.pcSec !== dragId) li.classList.add(after ? "drop-after" : "drop-before");
  });
  root.addEventListener("drop", (e) => {
    const li = e.target.closest?.("[data-pc-sec]");
    if (!li || !dragId) return;
    e.preventDefault();
    const target = li.dataset.pcSec, after = li.classList.contains("drop-after");
    if (target !== dragId) {
      layout.order.splice(layout.order.indexOf(dragId), 1);
      layout.order.splice(layout.order.indexOf(target) + (after ? 1 : 0), 0, dragId);
      settlePreset();
    }
    dragId = null; render();
  });
  root.addEventListener("dragend", () => { dragId = null; for (const x of root.querySelectorAll(".pc-row")) x.classList.remove("is-dragging", "drop-before", "drop-after"); });
  // Keyboard: arrows move between rows, Left/Right collapse and expand, Enter opens, Backspace leaves a sub-page.
  root.addEventListener("keydown", (e) => {
    const row = e.target.closest?.(".pt-scroll :is(.ct-row, .pt-group)");
    if (e.key === "Backspace" && view !== "main" && !e.target.matches("input")) { e.preventDefault(); return go("main"); }
    if (!row || e.target.closest(".monaco-switch, .lk-act, vsc-checkbox, vsc-button, .pt-hide")) return;
    const rows = [...root.querySelectorAll(".pt-scroll :is(.ct-row, .pt-group)")], i = rows.indexOf(row);
    const focusRow = (r) => { if (!r) return; for (const x of rows) x.tabIndex = -1; r.tabIndex = 0; r.focus(); };
    const toggler = row.matches("[data-pt-row-toggle]") ? row : row.querySelector("[data-pt-toggle]");
    if (e.key === " " && row.dataset.sbRow) { const it = byId(row.dataset.sbRow); if (it && canToggle(it)) { e.preventDefault(); return toggleItem(it); } }
    if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) { const it = byId(row.dataset.sbRow); if (it) { e.preventDefault(); return rowMenu(it, row); } }
    if (e.key === "ArrowDown") { e.preventDefault(); focusRow(rows[i + 1]); }
    else if (e.key === "ArrowUp") { e.preventDefault(); focusRow(rows[i - 1]); }
    else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && row.hasAttribute("aria-expanded")) {
      const open = row.getAttribute("aria-expanded") === "true";
      if ((e.key === "ArrowLeft") === open) { e.preventDefault(); toggler?.click(); }
    } else if (e.key === "Enter") { e.preventDefault(); (row.matches(".pt-group") ? toggler : row).click(); }
  });
  // Wide panels get a Source column.
  new ResizeObserver(() => { const w = root.clientWidth >= WIDE; if (w !== wide) { wide = w; render(); } }).observe(root);
  // The chat turns an item on for this session (Allow in This Session), and the panel shows it.
  document.addEventListener("session-item-on", (e) => { onMap(e.detail.session).set(e.detail.id, true); render(); });
  subs.add(render);
  const reset = () => requestAnimationFrame(() => { if (view === "workspace") view = "main"; render(); });
  document.addEventListener("session-open", reset);
  document.addEventListener("session-new", reset);
  render();
  return { render, customize: () => go("customize") };
}
export const sessionItemOn = (session, id) => (sessionOn.get(session)?.has(id) ? sessionOn.get(session).get(id) : null);
window.__sessionItemOn = sessionItemOn;
