import QuizState from '../services/quiz-state.js';
import ViewState from '../services/view-state.js';

/**
 * @import ConfigurerComponent from './configurer.js'
 * @import MapComponent from './map.js'
 * @import QuizPanesComponent from './quiz-panes.js'
 * @import ViewToggleComponent from './view-toggle.js'
 */

export default class AppComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;
  /** @type {ViewState} */
  viewState;

  /**
   * Overlay to hold quiz configurer and quiz panes
   * @type {HTMLDivElement}
   */
  overlayDiv;
  /**
   * Form to configure quiz
   * @type {ConfigurerComponent}
   */
  configurer;
  /**
   * Panes floating above map during quiz
   * @type {QuizPanesComponent}
   */
  quizPanes;
  /** @type {MapComponent} */
  map;
  /** @type {ViewToggleComponent} */
  viewToggle;

  connectedCallback() {
    this.quizState = new QuizState();
    this.viewState = new ViewState('configurer');
    this.render();
  }

  render() {
    this.innerHTML = `<div id="overlay"></div>`;

    this.map = document.createElement('cq-map');
    this.map.init(this.quizState, this.viewState);
    this.append(this.map);

    this.overlayDiv = this.querySelector('#overlay');
    this.configurer = document.createElement('cq-configurer');
    this.quizPanes = document.createElement('cq-quiz-panes');
    this.quizPanes.init(this.quizState);

    this.viewToggle = document.createElement('cq-view-toggle');
    this.viewToggle.init(this.viewState);

    this.showConfigView();
    this.viewState.subscribe('viewUpdate', () => {
      if (this.viewState.view === 'configurer') {
        this.showConfigView();
      } else {
        this.showQuizView();
      }
    });

    this.configurer.addEventListener('dataUpdate', (event) => {
      const features = event.detail.features;
      if (features.length > 0) {
        this.map.fitMapToFeatures(features);
      }
    });

    this.configurer.addEventListener('start', (event) => {
      const {
        features,
        attribution,
        matchProperty,
        collectedPropertyValues,
      } = event.detail;
      this.quizState.startQuiz(
        features,
        attribution,
        matchProperty,
        collectedPropertyValues,
      );
      this.viewState.view = 'quiz';
      if (!this.overlayDiv.contains(this.viewToggle)) {
        this.overlayDiv.appendChild(this.viewToggle);
      }
    });
  }

  showConfigView() {
    this.quizPanes.remove();
    this.overlayDiv.prepend(this.configurer);
  }

  showQuizView() {
    this.configurer.remove();
    this.overlayDiv.prepend(this.quizPanes);
  }
}
