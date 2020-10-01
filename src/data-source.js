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
      this.data.articles.map((article) => getPreview(article))
    );
  }

  loadArticle(name) {
    const foundArticle = this.data.articles.find(
      (article) => article.get("id") === name || article.get("title") === name
    );
    return immediatePromise(foundArticle !== undefined ? foundArticle : null);
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

  loadArticle(name) {
    const url = new URL("api/get/article/", location.href);
    url.searchParams.append("name", name);
    return fetch(url, { method: "get" })
      .then((response) => response.json())
      .then((jsonData) => {
        return this.deserializeArticle(jsonData);
      });
  }

  saveArticle(title, article) {
    const url = new URL("api/change/article/", location.href);
    url.searchParams.append("title", title);
    url.searchParams.append("new_id", article.get("id") || "");
    url.searchParams.append("new_title", article.get("title"));
    url.searchParams.append("new_text", article.get("text"));

    return fetch(url, { method: "get" }).then((response) => response.json());
  }

  createArticle(article) {
    const url = new URL("api/create/article/", location.href);
    url.searchParams.append("id", article.get("id") || "");
    url.searchParams.append("title", article.get("title"));
    url.searchParams.append("text", article.get("text"));

    return fetch(url, { method: "get" }).then((response) => response.json());
  }

  deserializePreview(data) {
    return new ArticlePreview({
      id: data.id,
      title: data.title,
      description: data.description,
    });
  }

  deserializeArticle(data) {
    if (data.success) {
      return Map({
        id: data.id,
        title: data.title,
        text: data.text,
      });
    } else {
      return null;
    }
  }
}

function immediatePromise(value) {
  return new Promise((resolve) => resolve(value));
}

function getArticlePreview(article) {
  return new ArticlePreview({
    id: article.get("id"),
    title: article.get("title"),
    description: article.get("text").slice(0, 200),
  });
}

export class ArticlePreview {
  constructor({ id, title, description }) {
    this.id = id;
    this.title = title;
    this.description = description;
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
