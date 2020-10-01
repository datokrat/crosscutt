import { renderToString } from "katex";
import { h } from "snabbdom/build/package/h";

export class Renderer {
  constructor(model) {
    this.model = model;
  }

  renderArticleMarkdown() {
    return h("div", [
      h("h4", [this.model.getTitle()]),
      h("section", this.renderAST()),
    ]);
  }

  renderAST() {
    return this.model.getAST().map((item) => this.renderMarkdownItem(item));
  }

  renderMarkdownItem(item) {
    switch (item.type) {
      case "section":
        return h(
          "section",
          {
            class: {
              collapsed: this.model.isSectionCollapsed(item.name),
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
      case "unordered-list":
        return h(
          "ul",
          item.items.map((li) =>
            h(
              "li",
              li.map((x) => this.renderMarkdownItem(x))
            )
          )
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
            on: {
              click: () => this.model.toggleSection(item.targetId),
            },
          },
          [
            this.renderTogglerIcon(
              !this.model.isSectionCollapsed(item.targetId)
            ),
            item.content,
          ]
        );
      case "article-link":
        return h(
          "a",
          {
            props: {
              href:
                "./?article/" +
                (item.namespace !== null
                  ? item.namespace
                  : this.model.getNamespace()) +
                "/" +
                item.path,
            },
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

  renderParagraph(paragraph) {
    return h("p", this.renderMarkdown(paragraph));
  }
}
