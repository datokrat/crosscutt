export class Model {
  constructor(notify, markdownModel) {
    this.notify = notify;
    this.markdownModel = markdownModel;

    this.data = null;
    this.isEditable = false;
  }

  setDraftData(data) {
    this.data = data;
    if (this.data !== null) {
      this.markdownModel.onArticleChanged(this.data);
    }
    this.notify();
  }

  getDraftData() {
    return this.data;
  }

  setIsEditable(isEditable) {
    this.isEditable = isEditable;
  }

  get(fieldName) {
    return this.data.get(fieldName);
  }

  set(fieldName, value) {
    this.setDraftData(this.data.set(fieldName, value));
  }

  getIsEditable() {
    return this.isEditable;
  }
}
