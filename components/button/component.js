export class Button {
  static selector = '.fn-button';

  constructor(element) {
    this.element = element;
  }

  setLoading(loading) {
    this.element.setAttribute('aria-busy', String(loading));
    this.element.toggleAttribute('disabled', loading);
  }

  static initAll(root = document) {
    return [...root.querySelectorAll(this.selector)].map((el) => new Button(el));
  }
}
