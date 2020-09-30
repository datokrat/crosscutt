import { parseMarkdown } from "../../markdown";

export class MarkdownModel {
  constructor(notify) {
    this.notify = notify;

    this.willApplyMarkdown = false;
    this.article = null;
    this.ast = null;
    this.title = null;
    this.collapsedSections = new Set();
  }

  getAST() {
    return this.ast;
  }

  getTitle() {
    return this.title;
  }

  isSectionCollapsed(sectionId) {
    return this.collapsedSections.has(sectionId);
  }

  toggleSection(id) {
    const isCollapsed = this.isSectionCollapsed(id);
    if (isCollapsed) {
      this.collapsedSections.delete(id);
    } else {
      this.collapsedSections.add(id);
    }
    this.notify();
  }

  onArticleChanged(article) {
    this.article = article;

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

  applyMarkdown() {
    const text = this.article.get("text");
    this.title = this.article.get("title");
    this.ast = parseMarkdown(text).toJS();

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
}
