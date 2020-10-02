import { MarkdownModel } from "./markdown/model";
import { Renderer as MarkdownRenderer } from "./markdown/renderer";
import { Model } from "./model";
import { ArticleDetailRenderer } from "./renderer";
import { Model as EditorModel } from "./editor/model";
import { Renderer as EditorRenderer } from "./editor/renderer";

export class ArticleDetail {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;

    this.markdownModel = new MarkdownModel(this.notify);
    this.markdownRenderer = new MarkdownRenderer(this.markdownModel);

    this.editorModel = new EditorModel(this.notify, this.markdownModel);
    this.editorRenderer = new EditorRenderer(
      this.editorModel,
      this.markdownRenderer
    );

    this.model = new Model(this.notify, dataSource, this.editorModel);
    this.renderer = new ArticleDetailRenderer(this.model, this.editorRenderer);

    this.stopped = false;
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
