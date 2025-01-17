import PubSub from '../utils/pub-sub.js';

/**
 * @typedef {'configurer' | 'quiz'} AppView
 */

export default class ViewState extends PubSub {
  /** @type {AppView} */
  #view;

  get view() {
    return this.#view;
  }

  set view(value) {
    if (value !== this.#view) {
      this.#view = value;
      this.publish('viewUpdate', this.#view);
    }
  }

  /**
   * @param {AppView} initialView
   */
  constructor(initialView = 'configurer') {
    super();

    this.#view = initialView;
  }
}
