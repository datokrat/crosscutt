import { renderNavigation } from "./skeleton";
import { h } from "snabbdom/build/package/h";

export class BlogList {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;

    this.previews = null;
    this.stopped = false;
  }

  start() {
    this.dataSource.loadArticlePreviews().then((previews) => {
      this.previews = previews;
      if (!this.stopped) {
        this.notify();
      }
    });
  }

  stop() {
    this.stopped = true;
  }

  render() {
    return h("div", [renderNavigation(), this.renderArticlePreviews()]);
  }

  get_route() {
    return "list";
  }

  renderArticlePreviews() {
    const list =
      this.previews !== null
        ? h(
            "ul",
            this.previews.map((preview) => this.renderArticlePreview(preview))
          )
        : h("span", ["Loading..."]);

    return h("div.container", [
      h("div.article-previews", [h("h1.my-3", ["Articles"]), list]),
    ]);
  }

  renderArticlePreview(preview) {
    return h("li", [
      h("h4", [
        h(
          "a",
          {
            props: {
              href: "./?article/" + preview.getTitle(),
            },
          },
          [preview.getTitle()]
        ),
      ]),
      h("p", [preview.getDescription()]),
    ]);
  }
}
