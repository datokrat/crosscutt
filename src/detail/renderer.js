import { h } from "snabbdom/build/package/h";
import { renderNavigation } from "../skeleton";

export class ArticleDetailRenderer {
  constructor(model, markdownRenderer) {
    this.model = model;
    this.markdownRenderer = markdownRenderer;
  }

  render() {
    return h("div", [
      renderNavigation(),
      h("div.container", [this.renderArticle()]),
    ]);
  }

  renderArticle() {
    return this.model.getVisibleArticle() !== null
      ? this.renderAvailableArticle()
      : this.renderLoading();
  }

  renderAvailableArticle() {
    if (!this.model.isEditing()) {
      return h("div.article", [
        this.renderNormalViewToolbar(),
        h("div.article-markdown.my-3", [this.markdownRenderer.renderArticleMarkdown()]),
      ]);
    } else {
      return h("div.article", [
        h("div.row.my-3", [
          h("div.col-sm.col-sm-6", [
            h("div.form-group", [
              h(
                "input.form-control",
                {
                  on: {
                    input: (e) => this.model.changeEditedTitle(e.target.value),
                  },
                  props: {
                    type: "text",
                    placeholder: "Title",
                    value: this.model.getEditedArticleField("title"),
                  },
                },
                []
              ),
              h(
                "textarea.form-control.article-text-editor",
                {
                  on: {
                    input: (e) => {
                      this.model.changeEditedText(e.target.value);
                      this.adjustTextareaSize(e.target);
                    },
                  },
                  props: { placeholder: "Text" },
                },
                [this.model.getEditedArticleField("text")]
              ),
            ]),
          ]),
          h("div.col-sm.col-sm-6", [
            h("div.article-markdown", [
              this.renderEditingToolbar(),
              this.markdownRenderer.renderArticleMarkdown(),
            ]),
          ]),
        ]),
      ]);
    }
  }

  renderLoading() {
    return h("div.container", [
      h("div.article.my-3", [h("span", ["Loading..."])]),
    ]);
  }

  renderNormalViewToolbar() {
    if (!this.model.canEdit()) {
      return null;
    }

    return h("span.button-edit", [
      h(
        "button.btn.btn-secondary.float-right",
        {
          props: { type: "button" },
          on: { click: () => this.model.startEditing() },
        },
        ["✎ Edit"]
      ),
    ]);
  }

  renderEditingToolbar() {
    if (!this.model.canEdit()) {
      return null;
    }

    return h("span.button-save.float-right", [
      !this.model.isSaving()
        ? !this.model.isSaved()
          ? this.renderSaveButton()
          : this.renderSavedIndicator()
        : this.renderSavingIndicator(),
      " ",
      this.renderAbortButton(),
    ]);
  }

  renderSaveButton() {
    return h(
      "button.btn.btn-primary",
      {
        props: { type: "button", disabled: false },
        on: { click: () => this.model.save() },
      },
      ["Save"]
    );
  }

  renderSavedIndicator() {
    return h(
      "button.btn.btn-primary",
      {
        props: { type: "button", disabled: true },
      },
      ["Saved"]
    );
  }

  renderSavingIndicator() {
    return h(
      "button.btn.btn-primary",
      {
        props: { type: "button", disabled: true },
      },
      ["Saving..."]
    );
  }

  renderAbortButton() {
    if (this.model.isCreating()) {
      return null;
    }

    const isDisabled = this.model.isSaving();
    const on = isDisabled ? {} : { click: () => this.model.abortEditing() };
    return h(
      "button.btn.btn-secondary",
      { props: { type: "button", disabled: isDisabled }, on },
      ["Stop Editing"]
    );
  }

  adjustTextareaSize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }
}
