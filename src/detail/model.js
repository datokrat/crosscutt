import { LocatorSerializationService } from "../domain/locator";
import { Map } from "immutable";

/*
 * State :
 * {
 *   mode: "load",
 * } | {
 *   mode: "error",
 *   message: string,
 * } |
 * {
 *   mode: "read",
 *   article: Article,
 * } | {
 *   mode: "edit",
 *   article: Article,
 *   draft: Draft,
 * } | {
 *   mode: "create",
 *   draft: Draft,
 * }
 *
 * context = {
 *   notify,
 *   transition,
 *   dataSource,
 *   editor,
 * }
 */

export class LoadState {
  constructor(locator) {
    this.locator = locator;
  }

  init(context) {
    this.context = context;
    this.context.editor.setDraftData(null);
    this.context.editor.setIsEditable(false);
    this.context.dataSource
      .loadArticle(this.locator)
      .then((article) => this.acceptArticle(article))
      .catch((e) => this.acceptErrorMessage(e));
  }

  getMode() {
    return "load";
  }

  // private

  acceptArticle(article) {
    this.context.transition(new ReadState(article));
  }

  acceptErrorMessage(error) {
    switch (error.reason) {
      case "not found":
        // SMELL: encapsulate permission logic in domain
        if (error.data.permissions === "full") {
          this.context.transition(new CreateState(this.locator));
        } else {
          this.context.transition(new ErrorState(error.reason));
        }
        break;
      default:
        this.context.transition(new ErrorState(error.reason));
    }
  }
}

export class ErrorState {
  constructor(reason) {
    this.reason = reason;
  }

  init(context) {
    context.editor.setIsEditable(false);
    context.editor.setDraftData(null);
  }

  getMode() {
    return "error";
  }

  getReason() {
    return this.reason;
  }
}

export class CreateState {
  constructor(locator) {
    this.locator = locator;
  }

  init(context) {
    this.context = context;
    this.isSaving = false;

    this.context.editor.setDraftData(
      Map({
        namespace: this.locator.getNamespace(),
        id: null,
        title: this.locator.getName(),
        text: "",
      })
    );
    this.context.editor.setIsEditable(true);
    this.context.notify();
  }

  getMode() {
    return "create";
  }

  getDraft() {
    return this.draft;
  }

  getIsSaving() {
    return this.isSaving;
  }

  create() {
    this.isSaving = true;
    this.context.notify();

    this.context.dataSource
      .createArticle(this.context.editor.getDraftData())
      .then((article) => this.onArticleCreated(article));
  }

  onArticleCreated(article) {
    this.isSaving = false;
    this.context.transition(
      new EditState(article, this.context.editor.getDraftData())
    );
  }
}

export class EditState {
  constructor(article, draftData) {
    this.article = article;
    this.draftData = draftData;
  }

  init(context) {
    this.context = context;
    this.isSaving = false;

    this.context.editor.setDraftData(this.draftData);
    this.context.editor.setIsEditable(true);
    delete this.draftData;

    this.context.notify();
  }

  getMode() {
    return "edit";
  }

  getIsSaving() {
    return this.isSaving;
  }

  getIsSaved() {
    return this.article.getData().equals(this.context.editor.getDraftData());
  }

  abortEditing() {
    this.context.transition(new ReadState(this.article));
  }

  save() {
    this.isSaving = true;
    this.context.notify();

    this.context.dataSource
      .saveArticle(this.article, this.context.editor.getDraftData())
      .then((article) => this.onArticleSaved(article));
  }

  onArticleSaved(article) {
    this.article = article;
    this.isSaving = false;
    this.context.notify();
  }
}

export class ReadState {
  constructor(article) {
    this.article = article;
  }

  init(context) {
    this.context = context;
    this.context.editor.setIsEditable(false);
    this.context.editor.setDraftData(this.article.getData());
    this.context.notify();
  }

  getMode() {
    return "read";
  }

  isReadOnly() {
    return this.article.isReadOnly();
  }

  edit() {
    this.context.transition(
      new EditState(this.article, this.article.getData())
    );
  }
}

export class Model {
  constructor(notify, dataSource, editor) {
    this.notify = notify;
    this.dataSource = dataSource;
    this.editor = editor;
  }

  start(path) {
    const locator = LocatorSerializationService.deserialize(path);
    const context = {
      notify: this.notify,
      transition: (nextState) => {
        this.state = nextState;
        this.state.init(context);
      },
      dataSource: this.dataSource,
      editor: this.editor,
    };

    this.state = new LoadState(locator);
    this.state.init(context);
  }

  getState() {
    return this.state;
  }
}
