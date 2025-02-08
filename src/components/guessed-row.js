/**
 * @import QuizState from '../services/quiz-state.js'
 * @import { Feature } from '../types.js'
 */

export default class GuessedRowComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;
  /** @type {Feature} */
  feature;

  /**
   * @param {QuizState} quizState
   * @param {Feature} feature
   */
  init(quizState, feature) {
    this.quizState = quizState;
    this.feature = feature;
  }

  connectedCallback() {
    this.classList.add('guessed-row');
    this.render();
  }

  render() {
    this.innerHTML = `
      <span class="guessed-row__text">
        ${this.quizState.getFeatureMatchPropertyValue(this.feature)}
      </span>
    `;

    const highlightClass = 'guessed-row--highlight';
    this.quizState.subscribe(
      'highlightedFeatureUpdate',
      ({ previousHighlightedId, currentHighlightedId }) => {
        if (this.feature.id === previousHighlightedId) {
          this.classList.remove(highlightClass);
        } else if (this.feature.id === currentHighlightedId) {
          this.classList.add(highlightClass);
        }
      },
    );

    this.onmouseover = () => {
      this.quizState.highlightedFeatureId = this.feature.id;
    };
    this.onmouseout = () => {
      this.quizState.highlightedFeatureId = undefined;
    };
  }
}
