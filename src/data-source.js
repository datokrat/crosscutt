import { getSeed } from "./data-seed";
import { LocatorSerializationService } from "./domain/locator";
import { Article, ArticleSerializationService } from "./domain/article";

export class RequestFailureException extends Error {
  constructor(reason, data) {
    super(reason);
    this.reason = reason;
    this.data = data;
  }
}

export class DataSource {
  constructor() {
    this.data = getSeed();
  }

  loadArticlePreviews() {
    return immediatePromise(
      this.data.articles.map((article) =>
        getArticlePreview(article.merge({ namespace: "public" }))
      )
    );
  }

  loadArticle(locator) {
    const name = locator.getName();
    const namespace = locator.getNamespace();
    const foundArticle = this.data.articles.find(
      (article) => article.get("id") === name || article.get("title") === name
    );

    if (namespace !== "public" || foundArticle === undefined) {
      return immediatelyRejectedPromise(
        new RequestFailureException("not found", {
          permissions: "readonly",
        })
      );
    }

    const resultArticle = new Article(
      foundArticle.merge({
        namespace: "public",
      }),
      "readonly"
    );

    return immediatePromise(resultArticle);
  }

  loadReference(id) {
    const foundReference = this.data.references.find(
      (reference) => reference.get("id") === id
    );
    return immediatePromise(
      foundReference !== undefined ? foundReference : null
    );
  }
}

export class RemoteDataSource {
  loadArticlePreviews() {
    return fetch("./api/get/previews/", { method: "get" })
      .then((response) => response.json())
      .then((jsonData) => {
        return jsonData.previews.map((previewData) =>
          this.deserializePreview(previewData)
        );
      });
  }

  loadArticle(locator) {
    const url = new URL("api/get/article/", location.href);
    url.searchParams.append(
      "locator",
      LocatorSerializationService.serialize(locator)
    );
    return fetch(url, { method: "get" })
      .then((response) => response.json())
      .then((jsonData) => this.deserializeArticle(jsonData));
  }

  saveArticle(article, updatedData) {
    const url = new URL("api/change/article/", location.href);
    const params = new URLSearchParams();
    params.append(
      "locator",
      LocatorSerializationService.serialize(article.getTitleBasedLocator())
    );
    params.append("new_namespace", updatedData.get("namespace"));
    params.append("new_id", updatedData.get("id") || "");
    params.append("new_title", updatedData.get("title"));
    params.append("new_text", updatedData.get("text"));

    return fetch(url, { method: "post", body: params })
      .then((response) => response.json())
      .then((jsonData) => this.deserializeArticle(jsonData));
  }

  createArticle(article) {
    const url = new URL("api/create/article/", location.href);
    const params = new URLSearchParams();
    params.append("namespace", article.get("namespace"));
    params.append("id", article.get("id") || "");
    params.append("title", article.get("title"));
    params.append("text", article.get("text"));

    return fetch(url, { method: "post", body: params })
      .then((response) => response.json())
      .then((jsonData) => this.deserializeArticle(jsonData));
  }

  deserializePreview(data) {
    return new ArticlePreview({
      namespace: data.namespace,
      id: data.id,
      title: data.title,
      description: data.description,
    });
  }

  deserializeArticle(data) {
    if (data.success) {
      return ArticleSerializationService.deserialize(data.article);
    } else {
      throw new RequestFailureException(data.reason, {
        permissions: data.permissions,
      });
    }
  }
}

function immediatePromise(value) {
  return new Promise((resolve) => resolve(value));
}

function immediatelyRejectedPromise(error) {
  return new Promise((_, reject) => reject(error));
}

function getArticlePreview(article) {
  return new ArticlePreview({
    namespace: article.get("namespace"),
    id: article.get("id"),
    title: article.get("title"),
    description: article.get("text").slice(0, 200),
  });
}

export class ArticlePreview {
  constructor({ namespace, id, title, description }) {
    this.namespace = namespace;
    this.id = id;
    this.title = title;
    this.description = description;
  }

  getNamespace() {
    return this.namespace;
  }

  getId() {
    return this.id;
  }

  getTitle() {
    return this.title;
  }

  getDescription() {
    return this.description;
  }
}

export class EpubReference {
  constructor({ id, title, filename, position }) {
    this.id = id;
    this.title = title;
    this.filename = filename;
  }

  getId() {
    return this.id;
  }

  getTitle() {
    return this.title;
  }

  getFilename() {
    return this.filename;
  }
}
