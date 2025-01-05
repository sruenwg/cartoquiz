import { getFeatureId } from '../utils/map-utils.js';

/**
 * @typedef {number} FeatureId
 * @typedef {import('../services/quiz-state.js').default} QuizState
 */

export default class GuessedRowComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;
  /** @type {GeoJSON.Feature} */
  feature;
  /** @type {FeatureId} */
  featureId;

  /**
   * @param {QuizState} quizState
   * @param {GeoJSON.Feature} feature
   */
  init(quizState, feature) {
    this.quizState = quizState;
    this.feature = feature;
    this.featureId = getFeatureId(this.feature);
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
        if (this.featureId === previousHighlightedId) {
          this.classList.remove(highlightClass);
        } else if (this.featureId === currentHighlightedId) {
          this.classList.add(highlightClass);
        }
      },
    );

    this.onmouseover = () => {
      this.quizState.highlightedFeatureId = this.featureId;
    };
    this.onmouseout = () => {
      this.quizState.highlightedFeatureId = undefined;
    };
  }
}
