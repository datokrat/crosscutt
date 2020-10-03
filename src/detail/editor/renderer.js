import { h } from "snabbdom/build/package/h";

export class Renderer {
  constructor(model, markdownRenderer) {
    this.model = model;
    this.markdownRenderer = markdownRenderer;
  }

  render(toolbarItems) {
    if (this.model.getIsEditable()) {
      return this.renderEditable(toolbarItems);
    } else {
      return this.renderNotEditable(toolbarItems);
    }
  }

  renderNotEditable(toolbarItems) {
    return h("div.article.my-3", [
      h("span.float-right", [toolbarItems]),
      this.markdownRenderer.renderArticleMarkdown(),
    ]);
  }

  renderEditable(toolbarItems) {
    return h("div.article", [
      h("div.row.my-3", [
        h("div.col-sm.col-sm-6", [
          h("div.form-group", [
            this.renderTextInput(
              "Short ID",
              this.model.get("id") || "",
              (value) => this.model.set("id", value || null)
            ),
            this.renderTextInput("Title", this.model.get("title"), (value) =>
              this.model.set("title", value)
            ),
            this.renderAutoSizeTextarea(
              "Text",
              this.model.get("text"),
              (value) => this.model.set("text", value)
            ),
          ]),
        ]),
        h("div.col-sm.col-sm-6", [
          h("div.article-markdown", [
            h("span.float-right", [toolbarItems]),
            this.markdownRenderer.renderArticleMarkdown(),
          ]),
        ]),
      ]),
    ]);
  }

  renderTextInput(placeholder, value, onInput) {
    return h(
      "input.form-control",
      {
        props: { type: "text", placeholder: placeholder, value: value },
        on: { input: (e) => onInput(e.target.value) },
      },
      []
    );
  }

  renderAutoSizeTextarea(placeholder, value, onInput) {
    return h(
      "textarea.form-control.article-text-editor",
      {
        hook: {
          insert: (vnode) => this.adjustTextareaSize(vnode.elm),
        },
        on: {
          input: (e) => {
            onInput(e.target.value);
            this.adjustTextareaSize(e.target);
          },
        },
        props: { placeholder: placeholder },
      },
      [value]
    );
  }

  adjustTextareaSize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
}
