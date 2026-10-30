/*
 * The Agents window's docked editor part (right side, `.dock-detail-panel`): connected tabs + editor area.
 * Inline styles mirror what EditorGroupView/MultiEditorTabsControl set at runtime, with the resolved colors
 * replaced by the theme tokens they come from (tab border, active top border, editor background).
 */
class AgentsEditorPart extends ds.Element {
  static props = ["tabs", "active"];

  render() {
    const h = ds.h;
    const tabs = this.attr("tabs", "Changes,Files").split(",").map((t) => t.trim()).filter(Boolean);
    const active = this.attr("active", tabs[0]);
    const labelClass = { Changes: "session-changes-editor-label", Customizations: "ai-customization-management-editor-label" };
    const actionBar = (label, ...items) => h("div.monaco-action-bar", null, h("ul.actions-container", { role: "toolbar", "aria-label": label }, items));
    const tabEls = tabs.map((label, i) => {
      const isActive = label === active;
      const isLast = i === tabs.length - 1;
      const cls = "div.tab" + (isActive ? ".tab-actions-right.sizing-fit.active.selected.tab-border-bottom.tab-border-top" : ".sizing-fit.tab-border-bottom.connected-tab-top-row.tab-actions-right")
        + (isLast ? ".last-tab.connected-tab-last" : "") + (isActive ? ".connected-tab-top-row" : "");
      const style = "left: auto; border-right: 1px solid var(--vscode-tab-border); --tab-border-bottom-color: var(--vscode-editor-background);"
        + (isActive ? " --tab-border-top-color: var(--vscode-tab-activeBorderTop);" : "");
      return h(cls, { draggable: "true", role: "tab", "aria-label": label, "aria-description": "", "aria-selected": String(isActive), tabindex: isActive ? "0" : "-1", style, "data-tab": label,
        onclick: (e) => { if (!e.target.closest(".tab-actions")) this.dispatchEvent(new CustomEvent("tab-select", { bubbles: true, detail: { label } })); } },
        h("div.tab-fill", { "aria-hidden": "true" }),
        h("div.tab-connected-edge", { "aria-hidden": "true" }),
        h("div.tab-divider", { "aria-hidden": "true" }),
        h("div.tab-border-top-container"),
        h("div.monaco-icon-label.tab-label.tab-label-has-badge", { class: labelClass[label], "aria-label": label },
          h("div.monaco-icon-label-container", null, h("span.monaco-icon-name-container", null, h("a.label-name", null, label)))),
        h("div.tab-actions", null, actionBar("Tab actions",
          h("li.action-item", { role: "presentation" }, h("a.action-label.codicon.codicon-close-small", { role: "button", "aria-label": "Close (⌘W)", tabindex: "0",
            onclick: () => this.dispatchEvent(new CustomEvent("tab-close", { bubbles: true, detail: { label } })) })))),
        h("div.tab-fade-hider"),
        h("div.tab-border-bottom-container"));
    });
    const addTab = h("div.tabs-bar-add-tab", null, h("div.monaco-toolbar", null, actionBar("Add Tab",
      h("li.action-item", { role: "presentation" }, h("div.monaco-dropdown", null, h("div.dropdown-label", null,
        h("a.action-label.codicon.codicon-add", { role: "button", "aria-haspopup": "true", "aria-expanded": "false", "aria-label": "Add Tab", "aria-disabled": "false", tabindex: "0",
          onclick: () => this.dispatchEvent(new CustomEvent("tab-add", { bubbles: true })) })))))));
    this.__tabsContainer = h("div.tabs-container.has-add-tab", { role: "tablist", "aria-multiselectable": "true", draggable: "true", style: "overflow: hidden; --last-tab-add-tab-width: 18px;" }, tabEls, addTab);
    this.__overflowEdge = h("div.tab-connected-overflow-edge.connected-tab-top-row", { "aria-hidden": "true",
      style: "--modern-ui-connected-tab-border: var(--vscode-tab-border); --modern-ui-connected-tab-overflow-top-border: var(--vscode-tab-border); --modern-ui-connected-tab-overflow-top-background: none; inset: 0px 0px 0px 0px;" },
      h("div.tab-connected-overflow-right", null, h("div.tab-connected-overflow-right-edge")));
    const title = h("div.title.tab-actions-reserve-space.tabs.connected-tabs-labels", { style: "--editor-group-tab-height: 32px; background-color: var(--modern-ui-editor-title-background, var(--vscode-editorGroupHeader-tabsBackground)); --title-border-bottom-width: 100%;" },
      h("div.tabs-and-actions-container.tabs-border-bottom.has-add-tab", { style: "--tabs-border-bottom-color: var(--vscode-editorGroupHeader-tabsBorder);" },
        h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden;" },
          this.__tabsContainer,
          h("div.sticky-tabs-background", { "aria-hidden": "true", style: "width: 0px;" }),
          this.__overflowEdge),
        h("div.editor-toolbars", null,
          h("div.editor-actions", null, h("div.monaco-toolbar", null, h("div.monaco-action-bar", null, h("ul.actions-container.highlight-toggled", { role: "toolbar", "aria-label": "Editor actions" })))),
          h("div.editor-actions-separator", { "aria-hidden": "true", style: "display: none;" }),
          h("div.editor-layout-actions", null, h("div.monaco-toolbar", null, h("div.monaco-action-bar", null, h("ul.actions-container.highlight-toggled", { role: "toolbar", "aria-label": "Editor layout actions" },
            h("li.action-item.menu-entry", { role: "presentation" }, h("a.action-label.codicon.codicon-screen-full", { role: "button", "aria-label": "Maximize Editor Area (⌥⌘E)", tabindex: "0" })))))))));
    const part = h("div.part.editor.editor-tabs-multiple", { id: "workbench.parts.editor", role: "main", style: "--sessions-editor-content-right-inset: 0px; width: 100%; height: 100%; box-sizing: border-box;" },
      h("div.content", { style: "overflow: hidden; background-color: var(--vscode-editor-background); width: 100%; height: 100%;" },
      h("div.grid-view-container", null, h("div.monaco-grid-view", null, h("div.monaco-grid-branch-node", null,
        h("div.monaco-split-view2.vertical.separator-border", { style: "--separator-border: var(--vscode-editorGroup-border);" },
          h("div.sash-container"),
          h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden; height: 100%;" },
            h("div.split-view-container", { style: "overflow: hidden; height: 100%;" },
              h("div.split-view-view.visible", { style: "top: 0px; height: 100%;" },
                h("div.editor-group-container.active", null,
                  h("div.editor-group-container-toolbar", null, h("div.monaco-action-bar", null, h("ul.actions-container.highlight-toggled", { role: "toolbar", "aria-label": "Empty editor group actions" }))),
                  title,
                  h("div.editor-container.agent-feedback-editor-overlay-host", { style: "background-color: var(--vscode-editor-background); width: 100%; height: calc(100% - 32px);" },
                    h("div.editor-instance", { style: "height: 100%;" }, this.slotted("")))))))))))));
    // The Agents window lays parts out in the workbench grid; part frame rules are scoped to `.monaco-grid-view`.
    return h("div.monaco-grid-view", { style: "width: 100%; height: 100%;" }, part);
  }

  updated() {
    // Like MultiEditorTabsControl: the connected overflow edge covers the tab strip up to the last tab.
    requestAnimationFrame(() => {
      const tabs = this.__tabsContainer?.querySelectorAll(".tab");
      if (!tabs?.length) return;
      const last = tabs[tabs.length - 1];
      const right = this.__tabsContainer.clientWidth - (last.offsetLeft + last.offsetWidth);
      this.__overflowEdge.style.inset = `0px ${Math.max(0, right)}px 0px 0px`;
    });
  }
}

ds.define("vsc-agents-editor-part", AgentsEditorPart);
