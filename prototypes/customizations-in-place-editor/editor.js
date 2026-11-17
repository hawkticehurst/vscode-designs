/* Placement 2 — Applies Here. In the main VS Code window, the open file's breadcrumbs end with the agent guidance
   that applies to it. The segment opens a picker (what's attached for this file, and rules that narrowly miss it);
   a row opens the rule in a peek view where applyTo is edited in place and the segment updates live. */
(function () {
  const { h, icon, toast } = window.CZUI;
  const C = window.CZ;
  const S = { file: null, harness: "copilot", pick: null, peek: null, created: [], open: [] };
  const base = (f) => f.split("/").pop();
  const all = () => C.items.concat(S.created);

  const FILES = {
    "src/vs/workbench/contrib/chat/browser/aiCustomization/customizationCardList.ts": [
      [["c", "/*---------------------------------------------------------------------------------------------"]],
      [["c", " *  Copyright (c) Microsoft Corporation. All rights reserved."]],
      [["c", " *--------------------------------------------------------------------------------------------*/"]],
      [],
      [["k", "import"], " { Disposable, DisposableStore } ", ["k", "from"], " ", ["s", "'../../../../../base/common/lifecycle.js'"], ";"],
      [["k", "import"], " { $, append, addDisposableListener, EventType } ", ["k", "from"], " ", ["s", "'../../../../../base/browser/dom.js'"], ";"],
      [["k", "import"], " { IAICustomizationItem } ", ["k", "from"], " ", ["s", "'./aiCustomizationItemsModel.js'"], ";"],
      [],
      [["k", "export class"], " ", ["t", "CustomizationCardList"], " ", ["k", "extends"], " ", ["t", "Disposable"], " {"],
      [],
      ["\t", ["k", "private readonly"], " ", ["p", "_cards"], " = ", ["k", "this"], ".", ["p", "_register"], "(", ["k", "new"], " ", ["t", "DisposableStore"], "());"],
      [],
      ["\t", ["k", "constructor"], "(", ["k", "private readonly"], " ", ["p", "container"], ": ", ["t", "HTMLElement"], ") {"],
      ["\t\t", ["k", "super"], "();"],
      ["\t", "}"],
      [],
      ["\t", ["p", "render"], "(", ["p", "items"], ": ", ["k", "readonly"], " ", ["t", "IAICustomizationItem"], "[]): ", ["k", "void"], " {"],
      ["\t\t", ["k", "this"], ".", ["p", "_cards"], ".", ["p", "clear"], "();"],
      ["\t\t", ["k", "for"], " (", ["k", "const"], " ", ["p", "item"], " ", ["k", "of"], " ", ["p", "items"], ") {"],
      ["\t\t\t", ["k", "const"], " ", ["p", "card"], " = ", ["p", "append"], "(", ["k", "this"], ".", ["p", "container"], ", $(", ["s", "'.customization-card'"], "));"],
      ["\t\t\t", ["p", "card"], ".", ["p", "tabIndex"], " = 0;"],
      ["\t\t\t", ["k", "this"], ".", ["p", "_cards"], ".", ["p", "add"], "(", ["p", "addDisposableListener"], "(", ["p", "card"], ", ", ["t", "EventType"], ".", ["p", "FOCUS_IN"], ", () => ", ["p", "card"], ".", ["p", "classList"], ".", ["p", "add"], "(", ["s", "'focused'"], ")));"],
      ["\t\t}"],
      ["\t}"],
      ["}"],
    ],
    "src/vs/workbench/contrib/chat/browser/aiCustomization/media/aiCustomizationManagement.css": [
      [["c", "/*---------------------------------------------------------------------------------------------"]],
      [["c", " *  Copyright (c) Microsoft Corporation. All rights reserved."]],
      [["c", " *--------------------------------------------------------------------------------------------*/"]],
      [],
      [["t", ".customization-card"], " {"],
      ["\t", ["p", "display"], ": flex;"],
      ["\t", ["p", "gap"], ": ", ["s", "var(--vscode-spacing-size80)"], ";"],
      ["\t", ["p", "padding"], ": ", ["s", "var(--vscode-spacing-size80) var(--vscode-spacing-size120)"], ";"],
      ["\t", ["p", "border-radius"], ": ", ["s", "var(--vscode-cornerRadius-medium)"], ";"],
      ["}"],
      [],
      [["t", ".customization-card:focus-visible"], " {"],
      ["\t", ["p", "outline"], ": 1px solid ", ["s", "var(--vscode-focusBorder)"], ";"],
      ["\t", ["p", "outline-offset"], ": -1px;"],
      ["}"],
    ],
    "src/vs/workbench/contrib/chat/test/browser/aiCustomization/customizationCardList.test.ts": [
      [["k", "import"], " assert ", ["k", "from"], " ", ["s", "'assert'"], ";"],
      [["k", "import"], " { ensureNoDisposablesAreLeakedInTestSuite } ", ["k", "from"], " ", ["s", "'../../../../../../base/test/common/utils.js'"], ";"],
      [["k", "import"], " { CustomizationCardList } ", ["k", "from"], " ", ["s", "'../../../browser/aiCustomization/customizationCardList.js'"], ";"],
      [],
      [["p", "suite"], "(", ["s", "'CustomizationCardList'"], ", () => {"],
      ["\t", ["k", "const"], " ", ["p", "store"], " = ", ["p", "ensureNoDisposablesAreLeakedInTestSuite"], "();"],
      [],
      ["\t", ["p", "test"], "(", ["s", "'renders one focusable card per item'"], ", () => {"],
      ["\t\t", ["k", "const"], " ", ["p", "list"], " = ", ["p", "store"], ".", ["p", "add"], "(", ["k", "new"], " ", ["t", "CustomizationCardList"], "(", ["p", "document"], ".", ["p", "createElement"], "(", ["s", "'div'"], ")));"],
      ["\t\t", ["p", "list"], ".", ["p", "render"], "([", ["p", "skill"], "(", ["s", "'launch'"], "), ", ["p", "skill"], "(", ["s", "'unit-tests'"], ")]);"],
      ["\t\t", ["p", "assert"], ".", ["p", "strictEqual"], "(", ["p", "list"], ".", ["p", "container"], ".", ["p", "querySelectorAll"], "(", ["s", "'[tabindex=\"0\"]'"], ").", ["p", "length"], ", 2);"],
      ["\t});"],
      ["});"],
    ],
  };
  const PATHS = Object.keys(FILES);
  S.file = PATHS[0]; S.open = PATHS.slice();

  // Opening lines of each rule (real content from microsoft/vscode .github/instructions).
  const BODY = {
    "i-coding-guidelines": "# Coding Guidelines\n\nCanonical reference: https://github.com/microsoft/vscode/wiki/Coding-Guidelines\n\n## Indentation\n\nUse tabs, not spaces.",
    "i-source-code-organization": "# Source Code Organization\n\n## Layers\n\nThe `src/vs/` core is partitioned into ordered layers — each may only import from layers below it:\n\n1. **`base`** — General utilities and UI building blocks",
    "i-best-practices": "# Best Practices\n\n## Shared UI Boundaries\n\n- Reuse shared controls through existing extension points.\n- Don't create a new class or custom CSS to render a button or action.",
    "i-design-philosophy": "# Design philosophy\n\nWhen you touch a visual surface, reason about it in **design terms, not pixels**.\n\n- **Values:** Calm · Focused · Consistent · Delightful",
    "i-design-tokens": "# Design tokens for sizing, spacing & radii\n\nVS Code ships a design-system size ramp. Use `--vscode-spacing-*` for padding, margin and gap, and `--vscode-cornerRadius-*` for radii.",
    "i-css-best-practices": "# CSS Best Practices\n\n## Selectors\n\n- Avoid `:has()` selectors.\n- Never match on the `class` attribute by substring.",
    "i-writing-tests": "# Writing Tests\n\n| Type | File suffix | Location |\n| Unit tests | `.test.ts` | `src/vs/**/test/` |\n\nAlways call `ensureNoDisposablesAreLeakedInTestSuite()`.",
    "i-committing": "# Committing\n\n- Always respect the user's commit signing configuration.\n- Never commit with `--no-verify`.",
    "i-ai-customization": "# AI Customization View\n\nThe AI Customization view provides a unified view for discovering and managing AI customization 'artifacts'.",
    "i-language-model-tool-descriptions": "# Language model tool descriptions\n\n- Begin with a direct imperative statement of the tool's capability.",
  };

  /* ── What applies to the file ───────────────────────────────── */
  const read = (it) => !it.harness || C.supported(it, S.harness);
  const glob = (it) => (S.peek && S.peek.id === it.id && S.peek.value != null ? S.peek.value : it.applyTo);
  const prefixOf = (g) => g.split(/,(?![^{]*\})/).flatMap((p) => p.trim().startsWith("{") ? p.trim().slice(1, -1).split(",") : [p.trim()]).map((p) => p.split(/[*{]/)[0].replace(/[^/]*$/, ""));
  function resolve(file) {
    const ins = all().filter((i) => i.type === "instruction" && i.enabled !== false);
    const usable = ins.filter(read);
    const always = usable.filter((i) => i.mode === "standing" || (i.mode === "glob" && (glob(i) === "**")));
    const matched = usable.filter((i) => i.mode === "glob" && glob(i) !== "**" && C.matches(glob(i), file));
    const near = usable.filter((i) => i.mode === "glob" && !C.matches(glob(i), file) && prefixOf(glob(i)).some((p) => p && file.startsWith(p)));
    const notRead = ins.filter((i) => !read(i) && i.mode === "glob" && C.matches(i.applyTo, file));
    return { always, matched, near, notRead, count: always.length + matched.length };
  }

  /* ── Segment, picker ─────────────────────────────────────────── */
  let edBody, tabsHost, seg;
  function segLabel() { const n = resolve(S.file).matched.length; return n ? `${n} rule${n === 1 ? "" : "s"} match this file` : "No rules match this file"; }
  function mountSegment(bump) {
    const bc = tabsHost.querySelector(".monaco-breadcrumbs");
    if (!bc) return void requestAnimationFrame(() => mountSegment(bump));
    const last = bc.lastElementChild; if (last && !last.classList.contains("ah-seg") && last.textContent === "\u2026") last.remove();
    bc.querySelectorAll(".ah-seg").forEach((n) => n.remove());
    const preview = S.peek && (S.peek.id === "new" || (S.peek.value != null && S.peek.value !== (all().find((i) => i.id === S.peek.id) || {}).applyTo));
    seg = h("div.monaco-breadcrumb-item.ah-seg" + (bump ? ".bump" : ""), { role: "button", tabindex: "0", "aria-haspopup": "listbox", "aria-expanded": String(!!S.pick), title: "Agent guidance for this file" }, icon("copilot"), h("span", null, segLabel()), preview ? h("span.ah-prev", null, "Preview") : null);
    seg.addEventListener("click", (e) => { e.stopPropagation(); S.pick ? closePick() : openPick(); });
    seg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPick(); } });
    bc.append(seg);
  }
  function closePick() { if (S.pick) { S.pick.remove(); S.pick = null; seg && seg.setAttribute("aria-expanded", "false"); } }
  function openPick() {
    closePick();
    const r = resolve(S.file);
    const row = (it, d, miss) => h("div.row" + (miss ? ".miss" : ""), { tabindex: "0", role: "option", onclick: () => { closePick(); openPeek(it); }, onkeydown: (e) => { if (e.key === "Enter") { closePick(); openPeek(it); } } },
      icon(it.locked ? "lock" : it.src === "user" ? "account" : it.src === "org" ? "organization" : "book"), h("span.nm", null, it.name), h("span.d", null, d));
    const everyOpen = !!S.everyOpen;
    const addRow = h("div.row.add", { tabindex: "0", role: "option", onclick: () => { closePick(); newRule(); }, onkeydown: (e) => { if (e.key === "Enter") { closePick(); newRule(); } } }, icon("add"), h("span.nm", null, "Add a rule for files like this…"));
    const p = h("div.ah-pick", { role: "listbox", "aria-label": "Rules that match " + base(S.file) }, h("div.cz.inline", null,
      r.matched.length ? [h("div.grp", null, "Match this file"), r.matched.map((i) => row(i, C.describeGlob(glob(i))))] : h("div.note", null, "No rules match this file."),
      r.near.length ? h("div.row", { tabindex: "0", role: "option", "aria-expanded": String(!!S.nearOpen), onclick: (e) => { e.stopPropagation(); S.nearOpen = !S.nearOpen; openPick(); } }, icon(S.nearOpen ? "chevron-down" : "chevron-right"), h("span.nm", null, `${r.near.length} nearby rules don't match`)) : null,
      S.nearOpen ? r.near.map((i) => row(i, h("code", null, glob(i)), true)) : null,
      r.always.length ? h("div.row", { tabindex: "0", role: "option", "aria-expanded": String(everyOpen), onclick: (e) => { e.stopPropagation(); S.everyOpen = !everyOpen; openPick(); } }, icon(everyOpen ? "chevron-down" : "chevron-right"), h("span.nm", null, `Plus ${r.always.length} rules for every request`)) : null,
      everyOpen ? r.always.map((i) => row(i, i.src === "org" ? "required by microsoft" : i.mode === "standing" ? "agent instructions file" : "applyTo **")) : null,
      h("div.sep"), addRow));
    document.querySelector("#wb").append(p);
    const b = seg.getBoundingClientRect();
    p.style.left = Math.min(b.left, innerWidth - 452) + "px"; p.style.top = b.bottom + 2 + "px";
    S.pick = p; seg.setAttribute("aria-expanded", "true");
    p.querySelector(".row") && p.querySelector(".row").focus();
  }
  document.addEventListener("mousedown", (e) => { if (S.pick && !S.pick.contains(e.target) && !(seg && seg.contains(e.target))) closePick(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (S.pick) closePick(); else if (S.peek && confirmLeave()) closePeek(); } });

  /* ── Peek ────────────────────────────────────────────────────── */
  const anchorLine = () => Math.max(0, Math.min(FILES[S.file].length - 1, Math.floor(edBody.scrollTop / 18)));
  function isDirty() { const pk = S.peek; if (!pk) return false; if (pk.id === "new") return true; const it = all().find((i) => i.id === pk.id); return (pk.value != null && pk.value !== it.applyTo) || (pk.text != null && pk.text !== (BODY[it.id] || it.desc)); }
  function closePeek() { S.peek = null; renderCode(); mountSegment(); }
  function confirmLeave() { return !isDirty() || confirm("Discard your unsaved changes to this rule?"); }
  function openPeek(it) { if (!confirmLeave()) return; S.peek = { id: it.id, value: null, text: null, at: anchorLine() }; const st = edBody.scrollTop; renderCode(); edBody.scrollTop = st; setTimeout(() => edBody.querySelector(".peek .tf")?.focus({ preventScroll: true }), 0); }
  function newRule() {
    if (!confirmLeave()) return;
    const dir = S.file.split("/").slice(0, -1).join("/").replace(/\/media$/, "");
    const ext = S.file.match(/\.test\.ts$/) ? "*.test.ts" : "*." + S.file.split(".").pop();
    const segs = S.file.split("/"); const area = segs[segs.lastIndexOf("browser") + 1] || segs[segs.indexOf("contrib") + 1] || "this-area";
    S.peek = { id: "new", value: `${dir}/**/${ext}`, name: `${area}-${ext.replace(/\*\.|\.ts$/g, "").replace(".", "-") || "files"}`, dest: "repo", text: "# " + area + "\n\n- ", at: anchorLine() };
    const st = edBody.scrollTop; renderCode(); edBody.scrollTop = st; setTimeout(() => edBody.querySelector(".peek .peek-src")?.focus({ preventScroll: true }), 0);
  }
  function peekEl() {
    const pk = S.peek; const isNew = pk.id === "new"; const it = isNew ? null : all().find((i) => i.id === pk.id);
    const g = pk.value != null ? pk.value : it.applyTo;
    const m = g && it?.mode !== "standing" ? C.matches(g, S.file) : it?.mode === "standing";
    if (!isNew && pk.text == null) pk.text = BODY[it.id] || it.desc;
    const dirty = isNew || (pk.value != null && pk.value !== it.applyTo) || pk.text !== (BODY[it.id] || it.desc);
    const close = () => { if (confirmLeave()) closePeek(); };
    const input = h("input.tf", { value: g || "", spellcheck: "false", "aria-label": "applyTo", disabled: it && (it.mode === "standing" || it.locked) ? true : null });
    input.addEventListener("input", () => { pk.value = input.value; const pos = input.selectionStart, st = edBody.scrollTop; renderCode(); edBody.scrollTop = st; mountSegment(); const el = edBody.querySelector(".peek-row .tf[aria-label='applyTo']"); if (el) { el.focus({ preventScroll: true }); el.setSelectionRange(pos, pos); } });
    const path = isNew ? (pk.dest === "repo" ? `.github/instructions/${pk.name}.instructions.md` : `~/.copilot/instructions/${pk.name}.instructions.md`) : it.path;
    return h("div.peek", { role: "region", "aria-label": "Peek: " + (isNew ? "New rule" : it.name) }, h("div.cz.inline", null,
      h("div.peek-h", null, icon(isNew ? "new-file" : "book"), h("b", null, isNew ? "New rule" : it.name + ".instructions.md"), h("span.d", null, path), h("span.grow"),
        !isNew && !it.via && it.src !== "org" ? h("button.ib", { title: "Open File", onclick: () => toast("Opened " + it.path, "go-to-file") }, icon("go-to-file")) : null,
        h("button.ib", { title: "Close (Escape)", onclick: close }, icon("close"))),
      h("div.peek-b", null,
        h("div.peek-row", null, h("span.lbl", null, "applyTo"), input, h("span.peek-res", null, icon(m ? "pass-filled" : "circle-large-outline", m ? "ic-in" : "ic-out"), it && it.mode === "standing" ? "Every request" : m ? `Matches ${base(S.file)}` : `Doesn't match ${base(S.file)}`)),
        isNew && pk.more ? [h("div.peek-row", null, h("span.lbl", null, "Name"), h("input.tf", { value: pk.name, "aria-label": "Name", oninput: (e) => { pk.name = e.target.value.replace(/[^a-z0-9-]/gi, "-"); edBody.querySelector(".peek-h .d").textContent = path.replace(/[^/]+\.instructions\.md$/, pk.name + ".instructions.md"); } })),
          h("div.peek-row", null, h("span.lbl", null, "For"), h("div.seg", null, [["repo", "This workspace"], ["user", "Just me"]].map(([k, l]) => h("button", { "aria-pressed": String(pk.dest === k), onclick: () => { pk.dest = k; const st = edBody.scrollTop; renderCode(); edBody.scrollTop = st; } }, l))))] : null,
        h("pre.peek-src", { contenteditable: it && (it.locked || it.via) ? "false" : "true", spellcheck: "false", "aria-label": "Rule text", oninput: (e) => { pk.text = e.target.innerText; syncFooter(); } }, pk.text),
        isNew && !pk.more ? h("button.link", { style: { marginTop: "8px", fontSize: "12px" }, onclick: () => { pk.more = true; const st = edBody.scrollTop; renderCode(); edBody.scrollTop = st; } }, "More options") : null),
      h("div.peek-f", { hidden: !dirty }, h("span.grow"),
          h("button.sb", { onclick: closePeek }, isNew ? "Discard" : "Cancel"),
          h("button.sb.primary", { onclick: () => save(it, pk) }, isNew ? "Create" : "Save"))));
  }
  function syncFooter() { const f = edBody.querySelector(".peek-f"); if (f) f.hidden = !isDirty(); }
  function save(it, pk) {
    if (it) { if (pk.value != null) it.applyTo = pk.value; BODY[it.id] = pk.text; toast(`Saved ${it.path}`, "save"); }
    else {
      const body = pk.text || "";
      const path = pk.dest === "repo" ? `.github/instructions/${pk.name}.instructions.md` : `~/.copilot/instructions/${pk.name}.instructions.md`;
      const n = { id: "new-" + pk.name, type: "instruction", mode: "glob", applyTo: pk.value, name: pk.name, src: pk.dest, path, desc: body.split("\n").find((l) => l.startsWith("- ")) || "New rule", harness: { copilot: "yes", claude: "convert", codex: "no" } };
      S.created.push(n); BODY[n.id] = body; toast("Created " + path, "pass");
    }
    S.peek = null; renderCode(); mountSegment(true);
  }

  /* ── Editor ─────────────────────────────────────────────────── */
  function renderCode() {
    const lines = FILES[S.file];
    const code = h("div.code", { role: "presentation" });
    lines.forEach((parts, i) => {
      code.append(h("div.ln" + (i === 0 ? ".cur" : ""), null, h("span.no", null, String(i + 1)), h("span", null, parts.map((p) => (Array.isArray(p) ? h("span." + p[0], null, p[1]) : p)))));
      if (S.peek && i === S.peek.at) code.append(peekEl());
    });
    edBody.replaceChildren(code);
  }
  function renderTabs() {
    const tabs = h("vsc-tabs", { breadcrumbs: S.file }, S.open.map((f) => {
      const t = h("vsc-tab", { label: base(f), active: f === S.file ? "" : null });
      t.addEventListener("click", () => openFile(f));
      return t;
    }), h("vsc-action", { slot: "actions", icon: "split-horizontal", label: "Split Editor Right" }), h("vsc-action", { slot: "actions", icon: "toolbar-more", label: "More Actions…", dropdown: "" }));
    tabsHost.replaceChildren(h("vsc-editor", { style: "height: 100%;" }, tabs, edBody));
    customElements.whenDefined("vsc-tabs").then(() => requestAnimationFrame(() => mountSegment()));
  }
  function openFile(f) { if (f === S.file || !confirmLeave()) return; S.file = f; S.peek = null; closePick(); renderTabs(); renderCode(); markTree(); }

  /* ── Workbench ──────────────────────────────────────────────── */
  let treeItems = [];
  function markTree() { treeItems.forEach(([el, f]) => { if (f) { el.toggleAttribute("selected", f === S.file); el.toggleAttribute("focused", f === S.file); } }); }
  function build() {
    const wb = document.querySelector("#wb");
    const T = (label, level, kind, file, expanded) => { const el = h("vsc-tree-item", { label, level: String(level), kind, expanded: expanded ? "" : null }); treeItems.push([el, file]); if (file) el.addEventListener("click", () => openFile(file)); return el; };
    const tree = h("vsc-tree", { label: "Files Explorer" },
      T(".github", 1, "folder"), T("build", 1, "folder"), T("src", 1, "folder", null, true), T("vs", 2, "folder", null, true), T("workbench", 3, "folder", null, true), T("contrib", 4, "folder", null, true), T("chat", 5, "folder", null, true),
      T("browser", 6, "folder", null, true), T("aiCustomization", 7, "folder", null, true), T("media", 8, "folder", null, true), T("aiCustomizationManagement.css", 9, "file", PATHS[1]),
      T("aiCustomizationListWidget.ts", 8, "file"), T("customizationCardList.ts", 8, "file", PATHS[0]), T("test", 6, "folder", null, true), T("browser", 7, "folder", null, true), T("aiCustomization", 8, "folder", null, true),
      T("customizationCardList.test.ts", 9, "file", PATHS[2]), T("AGENTS.md", 1, "file"), T("package.json", 1, "file"));
    tabsHost = h("div");
    edBody = h("div.ed-body");
    wb.append(
      h("div.r-title", null, h("vsc-titlebar", { label: "vscode", "can-go-back": "" })),
      h("div.r-act", null, h("vsc-activitybar")),
      h("div.r-side", null, h("vsc-sidebar", { heading: "Explorer" }, h("vsc-action", { slot: "actions", icon: "toolbar-more", label: "Views and More Actions...", dropdown: "" }), h("vsc-pane", { heading: "vscode", expanded: "" }, tree))),
      h("div.r-ed", null, tabsHost),
      h("div.r-status", null, h("vsc-statusbar", null, h("vsc-status-item", { text: "$(git-branch) main", label: "main" }), h("vsc-status-item", { text: "$(error) 0 $(warning) 0", label: "No Problems" }),
        h("vsc-status-item", { align: "right", text: "Ln 1, Col 1" }), h("vsc-status-item", { align: "right", text: "Tab Size: 4" }), h("vsc-status-item", { align: "right", text: "UTF-8" }), h("vsc-status-item", { align: "right", text: "$(copilot)", label: "Copilot status" }), h("vsc-status-item", { align: "right", text: "$(bell)", label: "Notifications" }))));
    markTree(); renderTabs(); renderCode();
  }
  build();
})();
