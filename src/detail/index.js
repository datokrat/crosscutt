import { MarkdownModel } from "./markdown/model";
import { Renderer as MarkdownRenderer } from "./markdown/renderer";
import { Model } from "./model";
import { ArticleDetailRenderer } from "./renderer";

export class ArticleDetail {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;

    this.model = new Model(() => this.onStateChanged(), dataSource);
    this.markdownModel = new MarkdownModel(() => this.notify());
    this.markdownRenderer = new MarkdownRenderer(this.markdownModel);
    this.renderer = new ArticleDetailRenderer(
      this.model,
      this.markdownRenderer
    );

    this.stopped = false;
  }

  onStateChanged() {
    this.markdownModel.onArticleChanged(this.model.getVisibleArticle());
    this.notify();
  }

  start(id) {
    this.model.start(id);
  }

  stop() {
    this.stopped = true;
  }

  render() {
    return this.renderer.render();
  }
}
