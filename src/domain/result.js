export class Result {
  static ok(value) {
    return new OkResult(value);
  }

  static fail(reason) {
    return new FailedResult(reason);
  }
}

export class OkResult extends Result {
  constructor(value) {
    this.value = value;
  }

  isOk() {
    return true;
  }

  extract() {
    return this.value;
  }
}

export class FailedResult extends Result {
  constructor(reason) {
    this.reason = reason;
  }

  isOk() {
    return false;
  }

  reasonForFailure() {
    return this.reason;
  }
}
