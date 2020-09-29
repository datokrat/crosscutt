import { renderToString } from "katex";
import { h } from "snabbdom/build/package/h";
import { renderNavigation } from "./skeleton";
import { parseMarkdown } from "./markdown";
import { Map } from "immutable";

function initialState() {
  return Map({
    savedArticle: null,
    editedArticle: null,
    isCreating: false,
    isSaving: false,
  });
}

function initialCreateState(id) {
  return Map({
    savedArticle: null,
    editedArticle: Map({
      id: id,
      title: "",
      text: "",
    }),
    isCreating: true,
    isSaving: false,
  });
}

function readonlyArticleState(article) {
  return Map({
    savedArticle: article,
    editedArticle: null,
    isCreating: false,
    isSaving: false,
  });
}

function startEditing(state) {
  return state.merge({
    editedArticle: state.get("savedArticle"),
  });
}

function abortEditing(state) {
  if (state.get("isCreating")) {
    throw new Error("Cannot abort creating an article.");
  }

  return state.merge({
    editedArticle: null,
  });
}

function startSaving(state) {
  return state.set("isSaving", true);
}

function completeSaving(state, article) {
  return state
    .set("isSaving", false)
    .set("isCreating", false)
    .set("savedArticle", article);
}

function changeEditedTitle(state, title) {
  return state.setIn(["editedArticle", "title"], title);
}

function changeEditedText(state, text) {
  return state.setIn(["editedArticle", "text"], text);
}

function isSaved(state) {
  if (state.get("savedArticle") === null) {
    return false;
  }

  return state.get("savedArticle").equals(state.get("editedArticle"));
}

function isEditing(state) {
  return state.get("editedArticle") !== null;
}

function visibleArticle(state) {
  return isEditing(state)
    ? state.get("editedArticle")
    : state.get("savedArticle");
}

export class Model {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;
    this.state = initialState();
  }

  updateState(updater) {
    this.state = updater(this.state);
    this.notify();
  }

  isSaved() {
    return isSaved(this.state);
  }

  isEditing() {
    return isEditing(this.state);
  }

  isSaving() {
    return this.state.get("isSaving");
  }

  isCreating() {
    return this.state.get("isCreating");
  }

  getVisibleArticle() {
    return visibleArticle(this.state);
  }

  getEditedArticleField(field) {
    return this.state.getIn(["editedArticle", field]);
  }

  start(id) {
    this.dataSource.loadArticle(id).then((article) => {
      if (article !== null) {
        // if article already exists, show it
        this.showArticle(article);
      } else {
        // if article does not exist yet, create
        this.startCreating(id);
      }
    });
  }

  showArticle(article) {
    this.updateState(() => readonlyArticleState(article));
  }

  startCreating(id) {
    this.ensureCanEdit();
    this.updateState(() => initialCreateState(id));
  }

  startEditing() {
    this.ensureCanEdit();
    this.updateState((state) => startEditing(state));
  }

  save() {
    this.updateState((state) => startSaving(state));

    const updatedArticle = this.state.get("editedArticle");

    if (!this.isCreating()) {
      this.dataSource
        .saveArticle(this.state.getIn(["savedArticle", "id"]), updatedArticle)
        .then(() => {
          this.updateState((state) => completeSaving(state, updatedArticle));
        });
    } else {
      this.dataSource.createArticle(updatedArticle).then(() => {
        this.updateState((state) => completeSaving(state, updatedArticle));
      });
    }
  }

  abortEditing() {
    this.updateState((state) => abortEditing(state));
  }

  ensureCanEdit() {
    if (this.dataSource.isReadOnly()) {
      throw new Error("data source is read-only, cannot edit articles");
    }
  }

  changeEditedTitle(title) {
    this.state = changeEditedTitle(this.state, title);
    this.notify();
  }

  changeEditedText(text) {
    this.state = changeEditedText(this.state, text);
    this.notify();
  }
}

export class ArticleDetail {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;

    this.ast = null;
    this.collapsedSections = new Set();
    this.willApplyMarkdown = false;

    this.model = new Model(() => this.onStateChanged(), dataSource);

    this.stopped = false;
  }

  onStateChanged() {
    this.onEditedArticleChanged();
    this.notify();
  }

  start(id) {
    this.model.start(id);
  }

  applyMarkdown() {
    const markdown = this.model.getVisibleArticle().get("text");

    this.ast = parseMarkdown(markdown).toJS();

    const processSectionsIn = (astItem) => {
      switch (astItem.type) {
        case "section":
          if (astItem.collapse) {
            this.collapsedSections.add(astItem.name);
          }
          astItem.content.forEach((child) => processSectionsIn(child));
          break;
      }
    };

    this.ast.map((item) => processSectionsIn(item));
    this.notify();
  }

  abortEditing() {
    if (
      this.model.isSaved() ||
      confirm("You have unsaved changes. Really abort?")
    ) {
      this.model.abortEditing();
    }
  }

  onEditedArticleChanged() {
    if (this.ast === null) {
      this.applyMarkdown();
      return;
    }

    if (!this.willApplyMarkdown) {
      this.willApplyMarkdown = true;
      setTimeout(() => {
        this.willApplyMarkdown = false;
        this.applyMarkdown();
      }, 300);
    }
  }

  stop() {
    this.stopped = true;
  }

  adjustTextareaSize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
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
        h("div.article-markdown.my-3", [this.renderArticleMarkdown()]),
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
              this.renderArticleMarkdown(),
            ]),
          ]),
        ]),
      ]);
    }
  }

  renderArticleMarkdown() {
    return h("div", [
      h("h4", [this.model.getVisibleArticle().get("title")]),
      h("section", this.renderAST(this.ast)),
    ]);
  }

  renderLoading() {
    return h("div.container", [
      h("div.article.my-3", [h("span", ["Loading..."])]),
    ]);
  }

  renderNormalViewToolbar() {
    if (this.dataSource.isReadOnly()) {
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
    if (this.dataSource.isReadOnly()) {
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

  renderAST(ast) {
    return ast.map((item) => this.renderMarkdownItem(item));
  }

  renderMarkdownItem(item) {
    switch (item.type) {
      case "section":
        return h(
          "section",
          {
            class: {
              collapsed: this.isCollapsed(item.name),
            },
            dataset: { sectionName: item.name },
          },
          item.content.map((child) => this.renderMarkdownItem(child))
        );
      case "paragraph":
        return h(
          "p",
          item.content.map((child) => this.renderMarkdownItem(child))
        );
      case "table":
        return h("p", [
          h("table.table", [
            h("thead", [
              h(
                "tr",
                item.head.map((col) =>
                  h(
                    "th",
                    col.map((item) => this.renderMarkdownItem(item))
                  )
                )
              ),
            ]),
            h(
              "tbody",
              item.body.map((row) =>
                h(
                  "tr",
                  row.map((col) =>
                    h(
                      "td",
                      col.map((item) => this.renderMarkdownItem(item))
                    )
                  )
                )
              )
            ),
          ]),
        ]);
      case "heading-1":
        return h("h4", [item.value]);
      case "bold":
        return h(
          "strong",
          item.content.map((child) => this.renderMarkdownItem(child))
        );
      case "italic":
        return h(
          "em",
          item.content.map((child) => this.renderMarkdownItem(child))
        );
      case "text":
        return item.value;
      case "link":
        return h("a", { props: { href: item.address } }, [item.content]);
      case "ref-link":
        return h(
          "a",
          {
            class: { "ref-link": true },
            props: { href: "./?reference/" + item.path },
          },
          [item.content]
        );
      case "toggler-link":
        return h(
          "a",
          {
            class: {
              "toggler-link": true,
            },
            on: { click: () => this.toggleSection(item.targetId) },
          },
          [
            this.renderTogglerIcon(!this.isCollapsed(item.targetId)),
            item.content,
          ]
        );
      case "article-link":
        return h(
          "a",
          {
            props: { href: "./?article/" + item.path },
          },
          [item.content]
        );
      case "katex-block":
        return h(
          "div",
          {
            props: {
              innerHTML: renderToString(item.tex, { displayMode: true }),
            },
          },
          []
        );
      case "katex-inline":
        return h(
          "span",
          {
            props: {
              innerHTML: renderToString(item.tex, { displayMode: false }),
            },
          },
          []
        );
    }
  }

  renderTogglerIcon(willCollapse) {
    if (willCollapse) {
      return createSvg([
        createPath(
          "M7.646 2.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 3.707 2.354 9.354a.5.5 0 1 1-.708-.708l6-6z"
        ),
        createPath(
          "M7.646 6.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 7.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"
        ),
      ]);
    } else {
      return createSvg([
        createPath(
          "M1.646 6.646a.5.5 0 0 1 .708 0L8 12.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
        ),
        createPath(
          "M1.646 2.646a.5.5 0 0 1 .708 0L8 8.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"
        ),
      ]);
    }

    function createSvg(children) {
      // Source of the SVG images: bootstrap-icons
      // https://icons.getbootstrap.com/
      // chevron-double-up and chevron-double-down
      return h(
        "svg",
        {
          attrs: {
            width: "1em",
            height: "1em",
            viewBox: "0 0 16 16",
            fill: "currentColor",
            xmlns: "http://www.w3.org/2000/svg",
          },
        },
        children
      );
    }

    function createPath(d) {
      return h("path", { attrs: { "fill-rule": "evenodd", d } }, []);
    }
  }

  toggleSection(id) {
    const isCollapsed = this.isCollapsed(id);
    if (isCollapsed) {
      this.collapsedSections.delete(id);
    } else {
      this.collapsedSections.add(id);
    }
    this.notify();
  }

  isCollapsed(id) {
    return this.collapsedSections.has(id);
  }

  renderParagraph(paragraph) {
    return h("p", this.renderMarkdown(paragraph));
  }
}
