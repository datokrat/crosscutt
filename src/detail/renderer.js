import { h } from "snabbdom/build/package/h";
import { renderNavigation } from "../skeleton";

export class ArticleDetailRenderer {
  constructor(model, editor) {
    this.model = model;
    this.editor = editor;
  }

  getModelState() {
    return this.model.getState();
  }

  render() {
    return h("div", [
      renderNavigation(),
      h("div.container", [this.renderArticle()]),
    ]);
  }

  renderArticle() {
    switch (this.getModelState().getMode()) {
      case "load":
        return this.renderLoading();
      case "error":
        return this.renderError(this.getModelState().getReason());
      case "read":
        return this.renderRead();
      case "create":
        return this.renderCreate();
      case "edit":
        return this.renderEdit();
      default:
        return this.renderError("Error");
    }
  }

  renderError(message) {
    return message;
  }

  renderLoading() {
    return h("div.container", [
      h("div.article.my-3", [h("span", ["Loading..."])]),
    ]);
  }

  renderRead() {
    return this.editor.render(this.renderNormalViewToolbar());
  }

  renderEdit() {
    return this.editor.render(this.renderEditingToolbar());
  }

  renderCreate() {
    return this.editor.render(this.renderCreatingToolbar());
  }

  renderNormalViewToolbar() {
    if (this.getModelState().isReadOnly()) {
      return null;
    }

    return h("span.button-edit", [
      h(
        "button.btn.btn-secondary.float-right",
        {
          props: { type: "button" },
          on: { click: () => this.getModelState().edit() },
        },
        ["✎ Edit"]
      ),
    ]);
  }

  renderEditingToolbar() {
    return h("span.button-save.float-right", [
      !this.getModelState().getIsSaving()
        ? !this.getModelState().getIsSaved()
          ? this.renderSaveButton()
          : this.renderSavedIndicator()
        : this.renderSavingIndicator(),
      " ",
      this.renderAbortButton(),
    ]);
  }

  renderCreatingToolbar() {
    return h("span.button-save.float-right", [
      !this.getModelState().getIsSaving()
        ? this.renderCreateButton()
        : this.renderSavingIndicator(),
      " ",
    ]);
  }

  renderSaveButton() {
    return h(
      "button.btn.btn-primary",
      {
        props: { type: "button", disabled: false },
        on: { click: () => this.getModelState().save() },
      },
      ["Save"]
    );
  }

  renderCreateButton() {
    return h(
      "button.btn.btn-primary",
      {
        props: { type: "button", disabled: false },
        on: { click: () => this.getModelState().create() },
      },
      ["Create"]
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
    const isDisabled = this.getModelState().getIsSaving();
    const on = isDisabled
      ? {}
      : { click: () => this.getModelState().abortEditing() };
    return h(
      "button.btn.btn-secondary",
      { props: { type: "button", disabled: isDisabled }, on },
      ["Stop Editing"]
    );
  }
}
