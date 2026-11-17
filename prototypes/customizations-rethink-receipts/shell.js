/* Shared helpers and the Agents-window shell for the Customizations Rethink concepts. Loaded as a classic script
   before system.js (a module), so the modal and its slotted root exist before the design system upgrades them. */
(function () {
  function h(tag, attrs, ...kids) {
    const [name, ...cls] = tag.split(".");
    const el = document.createElement(name || "div");
    if (cls.length) el.className = cls.join(" ");
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className += (el.className ? " " : "") + v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
    return el;
  }
  const icon = (name, extra) => h("span.codicon.codicon-" + name + (extra ? "." + extra : ""), { "aria-hidden": "true" });

  function srcGlyph(item, opts = {}) {
    const S = window.CZ.SOURCES[item.src];
    let label = S.short;
    if (item.via) label = window.CZ.byId[item.via].name;
    else if (item.type === "extension") label = item.publisher;
    return h("span.src", { title: S.detail }, icon(S.icon), opts.iconOnly ? null : label);
  }

  function switchEl(checked, onChange, opts = {}) {
    const b = h("button.monaco-switch" + (checked ? ".checked" : ""), { type: "button", role: "switch", "aria-checked": String(!!checked), "aria-label": opts.label || "Enabled", disabled: opts.disabled || null },
      h("div.monaco-switch-thumb"));
    b.addEventListener("click", (e) => { e.stopPropagation(); const v = !b.classList.contains("checked"); b.classList.toggle("checked", v); b.setAttribute("aria-checked", String(v)); onChange && onChange(v); });
    return b;
  }

  let openPop = null;
  function closePop() { if (openPop) { openPop.remove(); openPop = null; } }
  function popover(anchor, content, opts = {}) {
    closePop();
    const p = h("div.pop", { role: "dialog" }, content);
    if (opts.width) p.style.width = opts.width + "px";
    document.querySelector("#wb").append(p);
    const r = anchor.getBoundingClientRect(), pr = p.getBoundingClientRect();
    let left = Math.min(Math.max(8, r.left), innerWidth - pr.width - 8);
    let top = r.bottom + 6;
    if (top + pr.height > innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
    p.style.left = left + "px"; p.style.top = top + "px";
    openPop = p;
    setTimeout(() => document.addEventListener("mousedown", function off(e) { if (!p.contains(e.target) && !anchor.contains(e.target)) { closePop(); document.removeEventListener("mousedown", off); } }), 0);
    return p;
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });

  let toastTimer;
  function toast(msg, ic = "info") {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = h("div.toast", { role: "status" }, icon(ic), h("span", null, msg));
    document.querySelector("#wb").append(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 3600);
  }

  // The Agents window behind the modal: sessions sidebar and the new-session composer.
  function backdrop() {
    const row = (ic, label, active) => h("div.aw-row" + (active ? ".active" : ""), null, icon(ic), h("span", null, label));
    return h("div.aw", { "aria-hidden": "true" },
      h("div.aw-title", null, h("div.aw-cc", null, icon("search"), "vscode")),
      h("div.aw-parts", null,
        h("aside.aw-side", null,
          h("div.aw-new", null, icon("add"), "New Session"),
          h("div.aw-group", null, "Today"),
          row("pass", "Fix focus ring in customization cards", true), row("pass", "Telemetry: how often is the modal opened?"), row("calendar", "Triage new issues"),
          h("div.aw-group", null, "Yesterday"),
          row("pass", "Chat perf check"), row("pass", "Agent host: sync user skills"), row("pass", "Hover delay in customization list"),
          h("div.aw-foot", null, row("extensions", "Customizations"), row("settings-gear", "Settings"))),
        h("main.aw-page", null, h("vsc-session-view", { variant: "new" }, h("vsc-chat-input", { variant: "new-session" })))));
  }

  function mount({ description = "(Copilot CLI · vscode)", build }) {
    const wb = document.querySelector("#wb");
    const root = h("div.cz", { id: "app" });
    const modal = h("vsc-modal-editor", { contained: true, heading: "Customizations", description });
    modal.append(root);
    wb.append(backdrop(), modal);
    const size = () => {
      modal.setAttribute("width", String(Math.min(1440, innerWidth - 48)));
      modal.setAttribute("height", String(Math.min(900, innerHeight - 48)));
    };
    size();
    addEventListener("resize", () => { clearTimeout(size.t); size.t = setTimeout(size, 80); });
    modal.addEventListener("modal-close", () => toast("This prototype keeps the modal open", "info"));
    build(root);
    return root;
  }

  window.CZUI = { h, icon, srcGlyph, switchEl, popover, closePop, toast, mount };
})();
