import { renderToString } from "katex";
import { h } from "snabbdom/build/package/h";
import { renderNavigation } from "./skeleton";
import { parseMarkdown } from "./markdown";
import { Article } from "./data-source";

export class ArticleDetail {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;
    this.articleId = null;
    this.article = null;
    this.ast = null;
    this.collapsedSections = new Set();

    this.isCreating = false;
    this.willRefreshMarkup = false;
    this.isEditing = false;
    this.savedTitle = null;
    this.savedText = null;
    this.editedTitle = null;
    this.editedText = null;
    this.isSaving = false;
    this.stopped = false;
  }

  start(id) {
    this.articleId = id;
    this.dataSource.loadArticle(id).then((article) => {
      if (article !== null) {
        // if article already exists, edit
        this.setArticle(article);
      } else {
        // if article does not exist yet, create
        this.isCreating = true;
        this.setArticle(
          new Article({
            id: id,
            title: "",
            text: "",
          })
        );
        this.edit();
      }
    });
  }

  setArticle(article) {
    this.article = article;
    this.ast = parseMarkdown(this.article.getText()).toJS();

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
    if (!this.stopped) {
      this.notify();
    }
  }

  stop() {
    this.stopped = true;
  }

  edit() {
    this.isEditing = true;
    this.editedText = this.article.getText();
    this.editedTitle = this.article.getTitle();
    this.savedTitle = this.article.getTitle();
    this.savedText = this.article.getText();
    this.notify();
  }

  abortEditing() {
    if (this.isCreating) {
      return;
    }

    if (this.isSaved() || confirm("You have unsaved changes. Really abort?")) {
      this.isEditing = false;
      const title = this.savedTitle;
      const text = this.savedText;
      this.editedTitle = null;
      this.editedText = null;
      this.savedText = null;
      this.setArticle(
        new Article({
          id: this.article.getId(),
          title: title,
          text: text,
        })
      );
      this.notify();
    }
  }

  changeEditedTitle(title) {
    this.editedTitle = title;
    this.onEditedFieldsChanged();
  }

  changeEditedText(text) {
    this.editedText = text;
    this.onEditedFieldsChanged();
  }

  onEditedFieldsChanged() {
    if (!this.willRefreshMarkup) {
      this.willRefreshMarkup = true;
      setTimeout(() => {
        this.willRefreshMarkup = false;
        this.setArticle(
          new Article({
            id: this.article.getId(),
            title: this.editedTitle,
            text: this.editedText,
          })
        );
      }, 300);
    }
  }

  isSaved() {
    return (
      this.savedText === this.editedText && this.savedTitle === this.editedTitle
    );
  }

  save() {
    this.isSaving = true;
    this.notify();

    const newArticleId = this.article.getId();
    const newTitle = this.article.getTitle();
    const newText = this.article.getText();

    if (!this.isCreating) {
      this.dataSource.saveArticle(this.articleId, this.article).then(() => {
        this.isSaving = false;
        this.savedTitle = newTitle;
        this.savedText = newText;
        this.articleId = newArticleId;
        if (!this.stopped) {
          this.notify();
        }
      });
    } else {
      this.dataSource.createArticle(this.article).then(() => {
        this.isSaving = false;
        this.isCreating = false;
        this.savedTitle = newTitle;
        this.savedText = newText;
        this.articleId = newArticleId;
        if (!this.stopped) {
          this.notify();
        }
      });
    }
  }

  render() {
    return h("div", [
      renderNavigation(),
      h("div.container", [this.renderArticle(this.article)]),
    ]);
  }

  renderArticle() {
    return this.article !== null
      ? this.renderAvailableArticle()
      : this.renderLoading();
  }

  renderAvailableArticle() {
    if (!this.isEditing) {
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
                  on: { input: (e) => this.changeEditedTitle(e.target.value) },
                  props: {
                    type: "text",
                    placeholder: "Title",
                    value: this.editedTitle,
                  },
                },
                []
              ),
              h(
                "textarea.form-control",
                {
                  on: {
                    input: (e) => this.changeEditedText(e.target.value),
                  },
                  props: { placeholder: "Text" },
                },
                [this.editedText]
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
      h("h4", [this.article.getTitle()]),
      h("section", this.renderAST(this.ast)),
    ]);
  }

  renderLoading() {
    return h("div.container", [
      h("div.article.my-3", [h("span", ["Loading..."])]),
    ]);
  }

  renderNormalViewToolbar() {
    return h("span.button-edit", [
      h(
        "button.btn.btn-secondary.float-right",
        { props: { type: "button" }, on: { click: () => this.edit() } },
        ["✎ Edit"]
      ),
    ]);
  }

  renderEditingToolbar() {
    return h("span.button-save.float-right", [
      !this.isSaving
        ? !this.isSaved()
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
        on: { click: () => this.save() },
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
    if (this.isCreating) {
      return null;
    }

    const isDisabled = this.isSaving;
    const on = isDisabled ? {} : { click: () => this.abortEditing() };
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
