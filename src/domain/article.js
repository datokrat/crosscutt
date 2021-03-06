import { Locator } from "./locator";
import { Map } from "immutable";

export class Article {
  /**
   * data = Map({ namespace, id, title, text})
   * permissions \in { "none", "readonly", "full" }
   */
  constructor(data, permissions) {
    this.data = ArticleSerializationService.cleanData(data);
    this.permissions = permissions;
  }

  getData() {
    this.ensureIsReadable();
    return this.data;
  }

  getTitleBasedLocator() {
    this.ensureIsReadable();
    return new Locator(this.data.get("namespace"), this.data.get("title"));
  }

  isReadOnly() {
    return this.permissions === "readonly";
  }

  isReadable() {
    return this.permissions === "readonly" || this.permissions === "full";
  }

  isReadableAndWritable() {
    return this.data.permissions === "full";
  }

  ensureIsReadable() {
    if (!this.isReadable()) {
      throw new ForbiddenOperationException();
    }
  }
}

export class ForbiddenOperationException extends Error {}

export class ArticleSerializationService {
  static serialize(article) {
    return JSON.stringify({
      data: ArticleSerializationService.serializeData(article.getData()),
      permissions: article.permissions,
    });
  }

  static deserialize(string) {
    const parsed = JSON.parse(string);
    return new Article(
      ArticleSerializationService.deserializeData(parsed.data),
      parsed.permissions
    );
  }

  static serializeData(data) {
    return JSON.stringify(ArticleSerializationService.cleanData(data));
  }

  static deserializeData(string) {
    return ArticleSerializationService.cleanData(Map(JSON.parse(string)));
  }

  static cleanData(data) {
    return Map({
      namespace: data.get("namespace"),
      id: data.get("id"),
      title: data.get("title"),
      text: data.get("text"),
    });
  }
}
