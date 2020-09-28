import { getSeed } from "./data-seed";

export class DataSource {
  constructor() {
    this.data = getSeed();
  }

  isReadOnly() {
    return true;
  }

  loadArticlePreviews() {
    return immediatePromise(
      this.data.articles.map((article) => article.getPreview())
    );
  }

  loadArticle(id) {
    const foundArticle = this.data.articles.find(
      (article) => article.getId() === id
    );
    return immediatePromise(foundArticle !== undefined ? foundArticle : null);
  }

  loadReference(id) {
    const foundReference = this.data.references.find(
      (reference) => reference.getId() === id
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

  loadArticle(id) {
    const url = new URL("api/get/article/", location.href);
    url.searchParams.append("id", id);
    return fetch(url, { method: "get" })
      .then((response) => response.json())
      .then((jsonData) => {
        return this.deserializeArticle(jsonData);
      });
  }

  saveArticle(id, article) {
    const url = new URL("api/change/article/", location.href);
    url.searchParams.append("id", id);
    url.searchParams.append("new_id", article.getId());
    url.searchParams.append("new_title", article.getTitle());
    url.searchParams.append("new_text", article.getText());

    return fetch(url, { method: "get" }).then((response) => response.json());
  }

  createArticle(article) {
    const url = new URL("api/create/article/", location.href);
    url.searchParams.append("id", article.getId());
    url.searchParams.append("title", article.getTitle());
    url.searchParams.append("text", article.getText());

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
      return new Article({
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

export class Article {
  constructor({ id, title, text }) {
    this.id = id;
    this.title = title;
    this.text = text;
  }

  getId() {
    return this.id;
  }

  getTitle() {
    return this.title;
  }

  getText() {
    return this.text;
  }

  getPreview() {
    return new ArticlePreview({
      id: this.id,
      title: this.title,
      description: this.text.slice(0, 200),
    });
  }
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
