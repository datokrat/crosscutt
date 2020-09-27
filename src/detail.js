import { renderToString } from "katex";
import { h } from "snabbdom/build/package/h";
import { renderNavigation } from "./skeleton";
import { parseMarkdown } from "./markdown";

export class ArticleDetail {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;
    this.article = null;
    this.ast = null;
    this.collapsedSections = new Set();
    this.stopped = false;
  }

  start(id) {
    this.dataSource.loadArticle(id).then((article) => {
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
    });
  }

  stop() {
    this.stopped = true;
  }

  render() {
    return h("div", [renderNavigation(), this.renderArticle(this.article)]);
  }

  renderArticle() {
    return this.article !== null
      ? h("div.container", [
          h("div.article.my-3", [
            h("h4", [this.article.getTitle()]),
            h("section", this.renderAST(this.ast)),
          ]),
        ])
      : h("div.container", [
          h("div.article.my-3", [h("span", ["Loading..."])]),
        ]);
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
