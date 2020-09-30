import { Map } from "immutable";

function initialState() {
  return Map({
    savedArticle: null,
    editedArticle: null,
    isCreating: false,
    isSaving: false,
  });
}

function initialCreateState(id) {
  return Map({
    savedArticle: null,
    editedArticle: Map({
      id: id,
      title: "",
      text: "",
    }),
    isCreating: true,
    isSaving: false,
  });
}

function readonlyArticleState(article) {
  return Map({
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

  start(id) {
    this.dataSource.loadArticle(id).then((article) => {
      if (article !== null) {
        // if article already exists, show it
        this.showArticle(article);
      } else {
        // if article does not exist yet, create
        this.startCreating(id);
      }
    });
  }

  showArticle(article) {
    this.updateState(() => readonlyArticleState(article));
  }

  startCreating(id) {
    this.ensureCanEdit();
    this.updateState(() => initialCreateState(id));
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
        .saveArticle(this.state.getIn(["savedArticle", "id"]), updatedArticle)
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
    return !this.dataSource.isReadOnly();
  }

  ensureCanEdit() {
    if (!this.canEdit()) {
      throw new Error("data source is read-only, cannot edit articles");
    }
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
