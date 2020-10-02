import { getSeed } from "./data-seed";
import { Map } from "immutable";

export class DataSource {
  constructor() {
    this.data = getSeed();
  }

  isReadOnly() {
    return true;
  }

  loadArticlePreviews() {
    return immediatePromise(
      this.data.articles.map((article) =>
        getArticlePreview(article.merge({ namespace: "public" }))
      )
    );
  }

  loadArticle(namespace, name) {
    const foundArticle = this.data.articles.find(
      (article) => article.get("id") === name || article.get("title") === name
    );

    const resultArticle =
      namespace === "public" && foundArticle !== undefined
        ? foundArticle.merge({
            namespace: "public",
            success: true,
            permissions: "readonly",
          })
        : Map({ success: false, reason: "not found", permissions: "readonly" });
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
  isReadOnly() {
    return false;
  }

  loadArticlePreviews() {
    return fetch("./api/get/previews/", { method: "get" })
      .then((response) => response.json())
      .then((jsonData) => {
        return jsonData.previews.map((previewData) =>
          this.deserializePreview(previewData)
        );
      });
  }

  loadArticle(namespace, name) {
    const url = new URL("api/get/article/", location.href);
    url.searchParams.append("namespace", namespace);
    url.searchParams.append("name", name);
    return fetch(url, { method: "get" })
      .then((response) => response.json())
      .then((jsonData) => {
        return this.deserializeArticle(jsonData);
      });
  }

  saveArticle(namespace, title, article) {
    const url = new URL("api/change/article/", location.href);
    const params = new URLSearchParams();
    params.append("namespace", namespace);
    params.append("title", title);
    params.append("new_id", article.get("id") || "");
    params.append("new_title", article.get("title"));
    params.append("new_text", article.get("text"));

    return fetch(url, { method: "post", body: params }).then((response) =>
      response.json()
    );
  }

  createArticle(article) {
    const url = new URL("api/create/article/", location.href);
    const params = new URLSearchParams();
    params.append("namespace", article.get("namespace"));
    params.append("id", article.get("id") || "");
    params.append("title", article.get("title"));
    params.append("text", article.get("text"));

    return fetch(url, { method: "post", body: params }).then((response) =>
      response.json()
    );
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
    return Map(data);
  }
}

function immediatePromise(value) {
  return new Promise((resolve) => resolve(value));
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
