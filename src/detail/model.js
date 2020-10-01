import { Map } from "immutable";

function initialState() {
  return Map({
    isOk: true,
    isReadOnly: null,
    savedArticle: null,
    editedArticle: null,
    isCreating: false,
    isSaving: false,
  });
}

function initialCreateState(namespace, name) {
  return Map({
    isOk: true,
    isReadOnly: false,
    savedArticle: null,
    editedArticle: Map({
      namespace: namespace,
      id: null,
      title: name,
      text: "",
    }),
    isCreating: true,
    isSaving: false,
  });
}

function errorState() {
  return Map({
    isOk: false,
  });
}

function readonlyArticleState(article, isReadOnly) {
  return Map({
    isOk: true,
    isReadOnly: isReadOnly,
    savedArticle: article,
    editedArticle: null,
    isCreating: false,
    isSaving: false,
  });
}

function startEditing(state) {
  return state.merge({
    editedArticle: state.get("savedArticle"),
  });
}

function abortEditing(state) {
  if (state.get("isCreating")) {
    throw new Error("Cannot abort creating an article.");
  }

  return state.merge({
    editedArticle: null,
  });
}

function startSaving(state) {
  return state.set("isSaving", true);
}

function completeSaving(state, article) {
  return state
    .set("isSaving", false)
    .set("isCreating", false)
    .set("savedArticle", article);
}

function changeEditedId(state, id) {
  return state.setIn(["editedArticle", "id"], id);
}

function changeEditedTitle(state, title) {
  return state.setIn(["editedArticle", "title"], title);
}

function changeEditedText(state, text) {
  return state.setIn(["editedArticle", "text"], text);
}

function isSaved(state) {
  if (state.get("savedArticle") === null) {
    return false;
  }

  return state.get("savedArticle").equals(state.get("editedArticle"));
}

function isEditing(state) {
  return state.get("editedArticle") !== null;
}

function visibleArticle(state) {
  return isEditing(state)
    ? state.get("editedArticle")
    : state.get("savedArticle");
}

export class Model {
  constructor(notify, dataSource) {
    this.notify = notify;
    this.dataSource = dataSource;
    this.state = initialState();
  }

  updateState(updater) {
    this.state = updater(this.state);
    this.notify();
  }

  isOk() {
    return this.state.get("isOk");
  }

  isSaved() {
    return isSaved(this.state);
  }

  isEditing() {
    return isEditing(this.state);
  }

  isSaving() {
    return this.state.get("isSaving");
  }

  isCreating() {
    return this.state.get("isCreating");
  }

  getVisibleArticle() {
    return visibleArticle(this.state);
  }

  getEditedArticleField(field) {
    return this.state.getIn(["editedArticle", field]);
  }

  start(path) {
    const slashIndex = path.indexOf("/");

    if (slashIndex === -1) {
      throw new Error("Invalid path");
    }

    const namespace = path.slice(0, slashIndex);
    const name = path.slice(slashIndex + 1);
    this.dataSource.loadArticle(namespace, name).then((article) => {
      if (article.get("success")) {
        // if article already exists, show it
        this.showArticle(article, article.get("permissions") !== "full");
      } else if (article.get("reason") === "not found") {
        // if article does not exist yet, create
        if (article.get("permissions") === "full") {
          this.startCreating(namespace, name);
        } else {
          this.showError();
        }
      } else {
        this.showError();
      }
    });
  }

  showArticle(article, isReadOnly) {
    this.updateState(() => readonlyArticleState(article, isReadOnly));
  }

  showError() {
    this.updateState(() => errorState());
  }

  startCreating(namespace, name) {
    this.ensureCanEdit();
    this.updateState(() => initialCreateState(namespace, name));
  }

  startEditing() {
    this.ensureCanEdit();
    this.updateState((state) => startEditing(state));
  }

  save() {
    this.updateState((state) => startSaving(state));

    const updatedArticle = this.state.get("editedArticle");

    if (!this.isCreating()) {
      this.dataSource
        .saveArticle(
          this.state.getIn(["savedArticle", "namespace"]),
          this.state.getIn(["savedArticle", "title"]),
          updatedArticle
        )
        .then(() => {
          this.updateState((state) => completeSaving(state, updatedArticle));
        });
    } else {
      this.dataSource.createArticle(updatedArticle).then(() => {
        this.updateState((state) => completeSaving(state, updatedArticle));
      });
    }
  }

  abortEditing() {
    this.updateState((state) => abortEditing(state));
  }

  canEdit() {
    return !this.state.get("isReadOnly");
  }

  ensureCanEdit() {
    if (!this.canEdit()) {
      throw new Error("data source is read-only, cannot edit articles");
    }
  }

  changeEditedId(id) {
    this.state = changeEditedId(this.state, id);
    this.notify();
  }

  changeEditedTitle(title) {
    this.state = changeEditedTitle(this.state, title);
    this.notify();
  }

  changeEditedText(text) {
    this.state = changeEditedText(this.state, text);
    this.notify();
  }
}
