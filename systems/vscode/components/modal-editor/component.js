/*
 * ModalEditorPart: backdrop block > resizable > shadow > `.part.editor.modal-editor-part` (header + editor group).
 * The block is `position: fixed` over the window; `contained` makes it fill the nearest positioned ancestor and
 * centers the panel there, for prototypes that render the modal inside a mock window.
 */
class ModalEditor extends ds.Element {
  static props = ["heading", "description", "icon", "width", "height", "contained"];

  render() {
    const h = ds.h;
    const heading = this.attr("heading", "Customizations");
    const description = this.attr("description", "");
    const icon = this.attr("icon", "settings-gear");
    const width = Number(this.attr("width", "1152"));
    const height = Number(this.attr("height", "684.8"));
    const contained = this.flag("contained");
    const close = () => this.dispatchEvent(new CustomEvent("modal-close", { bubbles: true }));
    const actions = h("div.monaco-toolbar", null, h("div.monaco-action-bar", null, h("ul.actions-container.highlight-toggled", { role: "toolbar" },
      h("li.action-item.menu-entry", { role: "presentation" }, h("a.action-label.codicon.codicon-screen-full", { role: "button", "aria-label": "Maximize Modal Editor", "aria-pressed": "false", tabindex: "0",
        onclick: () => this.dispatchEvent(new CustomEvent("modal-maximize", { bubbles: true })) })),
      h("li.action-item.menu-entry", { role: "presentation" }, h("a.action-label.codicon.codicon-close", { role: "button", "aria-label": "Close Modal Editor (Escape)", tabindex: "-1", onclick: close })))));
    const header = h("div.modal-editor-header", null,
      h("div.modal-editor-sidebar-toggle", { "aria-hidden": "true", style: "display: none;" }),
      h("div.modal-editor-title.show-file-icons", { id: "modal-editor-title" },
        h("div.monaco-icon-label.predefined-file-icon.ai-customization-management-editor-label", { class: "codicon-" + icon, "aria-label": heading },
          h("div.monaco-icon-label-container", null,
            h("span.monaco-icon-name-container", null, h("a.label-name", null, heading)),
            description ? h("span.monaco-icon-description-container", null, h("span.label-description", null, description)) : null))),
      h("div.modal-editor-navigation", { "aria-hidden": "true", style: "display: none;" }),
      h("div.modal-editor-action-container", null,
        h("div.modal-editor-editor-actions", null, h("div.monaco-toolbar", null, h("div.monaco-action-bar", null, h("ul.actions-container.highlight-toggled", { role: "toolbar" })))),
        h("div.modal-editor-action-separator", { "aria-hidden": "true", style: "display: none;" }),
        actions));
    const bodyHeight = `calc(100% - 40px)`;
    const part = h("div.part.editor.modal-editor-part", { role: "dialog", "aria-modal": "true", "aria-labelledby": "modal-editor-title", style: "width: 100%; height: 100%;" },
      header,
      h("div.content", { style: `overflow: hidden; background-color: var(--vscode-editor-background); width: 100%; height: ${bodyHeight};` },
        h("div.grid-view-container", null, h("div.monaco-grid-view", null, h("div.monaco-grid-branch-node", null,
          h("div.monaco-split-view2.vertical.separator-border", { style: "--separator-border: var(--vscode-editorGroup-border);" },
            h("div.sash-container"),
            h("div.monaco-scrollable-element.mac", { role: "presentation", style: "position: relative; overflow: hidden; height: 100%;" },
              h("div.split-view-container", { style: "overflow: hidden; height: 100%;" },
                h("div.split-view-view.visible", { style: "top: 0px; height: 100%;" },
                  h("div.editor-group-container.active", null,
                    h("div.editor-container.agent-feedback-editor-overlay-host", { style: "background-color: var(--vscode-editor-background); width: 100%; height: 100%;" },
                      h("div.editor-instance", { style: "height: 100%;" }, this.slotted("")))))))))))));
    const resizable = h("div.modal-editor-resizable", { style: contained
      ? `height: ${height}px; width: ${width}px; left: max(0px, calc(50% - ${width / 2}px)); top: max(0px, calc(50% - ${height / 2}px));`
      : `height: ${height}px; width: ${width}px; left: calc(50% - ${width / 2}px); top: calc(50% - ${height / 2}px);` },
      h("div.modal-editor-shadow", null, part));
    return h("div.monaco-modal-editor-block.compact-header", { style: contained ? "position: absolute;" : undefined,
      onclick: (e) => { if (e.target === e.currentTarget) close(); } }, resizable);
  }
}

ds.define("vsc-modal-editor", ModalEditor);
