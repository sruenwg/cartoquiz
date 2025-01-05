import { COLLAPSED_ARROW, EXPANDED_ARROW, removeAllChildren } from '../utils/misc.js';

/**
 * @typedef {import('../services/quiz-state.js').default} QuizState
 */

export default class GuessedPaneComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;
  isExpanded = false;
  /** @type {HTMLDivElement} */
  arrow;
  /** @type {HTMLDivElement} */
  listDiv;

  /**
   * @param {QuizState} quizState
   */
  init(quizState) {
    this.quizState = quizState;
  }

  connectedCallback() {
    this.classList.add('guessed', 'pane', 'expandable-pane');
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="pane__header">
        <div class="pane__arrow"></div>
        <div class="pane__label">Guessed</div>
        <div class="pane__counter">
          <span class="guessed__numerator">0</span>
          /
          <span class="guessed__denominator">?</span>          
        </div>
      </div>
    `;

    const header = this.querySelector('.pane__header');
    this.arrow = this.querySelector('.pane__arrow');
    const numerator = this.querySelector('.guessed__numerator');
    const denominator = this.querySelector('.guessed__denominator');
    numerator.textContent = this.quizState.filteredGuessedFeatures.length;
    denominator.textContent = this.quizState.filteredFeatures.length;
    this.createListDiv();

    this.quizState.subscribe('filtersUpdate', () => {
      removeAllChildren(this.listDiv);
      this.addListItems(this.quizState.filteredGuessedFeatures);
      this.scrollListToLastItem();
      numerator.textContent = this.quizState.filteredGuessedFeatures.length;
      denominator.textContent = this.quizState.filteredFeatures.length;
    });

    this.quizState.subscribe('matchesUpdate', ({ newMatches }) => {
      this.addListItems(newMatches);
      this.scrollListToLastItem();
      numerator.textContent = this.quizState.filteredGuessedFeatures.length;
    });

    header.onclick = () => {
      if (this.isExpanded) {
        this.collapse();
      } else {
        this.expand();
      }
    };

    this.collapse();
  }

  createListDiv() {
    this.listDiv = document.createElement('div');
    this.listDiv.classList.add('guessed__list', 'pane__list');

    this.addListItems(this.quizState.filteredGuessedFeatures);
    this.scrollListToLastItem();
  }

  /**
   * @param {GeoJSON.Feature[]} features
   */
  addListItems(features) {
    for (const feature of features) {
      this.addListItem(feature);
    }
  }

  /**
   * @param {GeoJSON.Feature} feature
   */
  addListItem(feature) {
    const guessedRow = document.createElement('cq-guessed-row');
    guessedRow.init(this.quizState, feature);
    this.listDiv.appendChild(guessedRow);
  }

  scrollListToLastItem() {
    const listItems = this.listDiv.children;
    if (listItems.length > 0) {
      const lastGuessed = listItems[listItems.length - 1];
      lastGuessed.scrollIntoView();
    }
  }

  expand() {
    this.arrow.textContent = EXPANDED_ARROW;
    this.classList.remove('pane--collapsed');
    this.classList.add('pane--expanded');
    this.appendChild(this.listDiv);
    this.scrollListToLastItem();

    this.isExpanded = true;
  }

  collapse() {
    this.listDiv.remove();
    this.classList.remove('pane--expanded');
    this.classList.add('pane--collapsed');
    this.arrow.textContent = COLLAPSED_ARROW;

    this.isExpanded = false;
  }
}
