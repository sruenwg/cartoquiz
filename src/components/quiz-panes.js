/**
 * @typedef {import('../services/quiz-state.js').default} QuizState
 */

export default class QuizPanesComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;

  /** @type {HTMLInputElement} */
  guessInput;
  /** @type {import('./filter-pane.js').default} */
  filterPane;
  /** @type {import('./guessed-pane.js').default} */
  guessedPane;

  /**
   * @param {QuizState} quizState
   */
  init(quizState) {
    this.quizState = quizState;
  }

  connectedCallback() {
    this.classList.add('quiz-panes');
    this.render();
  }

  disconnectedCallback() {
    this.filterPane = undefined;
  }

  render() {
    this.guessInput = this.createGuessInput();
    this.guessedPane = this.createGuessedPane();

    if (Object.keys(this.quizState.propertyValuesForFilter).length > 0) {
      this.filterPane = this.createFilterPane();
    }

    this.guessInput.onkeydown = ({ isComposing, key }) => {
      if (!isComposing && key === 'Enter') {
        this.quizState.makeGuess(this.guessInput.value);
        this.guessInput.value = '';
      }
    };

    const children = [this.guessInput, this.filterPane, this.guessedPane]
      .filter((pane) => pane !== undefined);
    this.replaceChildren(...children);
  }
  
  createGuessInput() {
    const guessInput = document.createElement('input');
    guessInput.classList.add('pane', 'guess-input');
    guessInput.type = 'text';
    guessInput.autocomplete = 'false';
    guessInput.spellcheck = false;
    guessInput.placeholder = 'Enter guess';
    guessInput.autofocus = true;
    guessInput.enterKeyHint = 'done';
    return guessInput;
  }

  createGuessedPane() {
    const guessedPane = document.createElement('cq-guessed-pane');
    guessedPane.init(this.quizState);
    return guessedPane;
  }

  createFilterPane() {
    const filterPane = document.createElement('cq-filter-pane');
    filterPane.init(this.quizState);
    return filterPane;
  }
}
