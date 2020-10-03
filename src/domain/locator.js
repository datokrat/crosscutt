export class Locator {
  constructor(namespace, name) {
    this.namespace = namespace;
    this.name = name;
  }

  getNamespace() {
    return this.namespace;
  }

  getName() {
    return this.name;
  }

  toString() {
    return this.namespace + "/" + this.name;
  }
}

export class LocatorSerializationService {
  static serialize(locator) {
    return locator.toString();
  }

  static deserialize(string) {
    const slashIndex = string.indexOf("/");
    if (slashIndex !== -1) {
      const namespace = string.slice(0, slashIndex);
      const name = string.slice(slashIndex + 1);
      return new Locator(namespace, name);
    } else {
      throw new DeserializationException();
    }
  }
}

export class DeserializationException {}
