const INITIAL_VISIBILITY = 'hidden';

export default class LoadingComponent extends HTMLElement {
  /**
   * @type {HTMLSpanElement}
   */
  #spinner;

  constructor() {
    super();

    this.#spinner = document.createElement('span');
    this.#spinner.style.visibility = INITIAL_VISIBILITY;
    this.#spinner.classList.add('loading__spinner');
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.replaceChildren(this.#spinner);
  }

  play() {
    this.#spinner.style.visibility = 'visible';
  }

  pause() {
    this.#spinner.style.visibility = 'hidden';
  }
}
