const rows = document.querySelector("#rows");

function setExpanded(expanded) {
  rows.classList.toggle("split-expanded", expanded);
  document.body.classList.toggle("split-view-expanded", expanded);
  const action = rows.querySelector("[data-split-expand]");
  if (action) {
    action.setAttribute("icon", expanded ? "screen-normal" : "screen-full");
    action.setAttribute("label", expanded ? "Exit Full Screen (Escape)" : "Expand Session Preview");
  }
}

function updateHeader() {
  const preview = rows.querySelector(":scope > .preview");
  if (!preview) {
    setExpanded(false);
    return;
  }
  if (preview.querySelector(":scope > .split-head")) return;
  const header = document.createElement("header");
  header.className = "split-head";
  header.innerHTML = `<span class="split-head-title">Session preview</span>
    <button class="split-open" type="button" data-open-full>Open session<span class="codicon codicon-arrow-right" aria-hidden="true"></span></button>
    <vsc-toolbar label="Session preview">
      <vsc-action icon="screen-full" label="Expand Session Preview" data-split-expand></vsc-action>
      <vsc-action icon="close" label="Close Session Preview" data-split-close></vsc-action>
    </vsc-toolbar>`;
  preview.prepend(header);
}

new MutationObserver(updateHeader).observe(rows, { childList: true });
updateHeader();

rows.addEventListener("click", (event) => {
  if (event.target.closest("[data-split-expand]")) {
    event.stopPropagation();
    setExpanded(!rows.classList.contains("split-expanded"));
    return;
  }
  if (event.target.closest("[data-split-close]")) {
    event.stopPropagation();
    setExpanded(false);
    rows.querySelector(":scope > .row.open")?.click();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && rows.classList.contains("split-expanded")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setExpanded(false);
  }
}, true);
