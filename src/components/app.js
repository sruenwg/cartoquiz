import DatabaseService from '../services/db.js';
import QuizState from '../services/quiz-state.js';
import ViewState from '../services/view-state.js';

/**
 * @import ConfigurerComponent from './configurer.js'
 * @import MapComponent from './map.js'
 * @import QuizPanesComponent from './quiz-panes.js'
 * @import ViewToggleComponent from './view-toggle.js'
 */

export default class AppComponent extends HTMLElement {
  /** @type {DatabaseService} */
  databaseService;
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
    this.databaseService = new DatabaseService();
    this.quizState = new QuizState(this.databaseService);
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
    this.configurer.init(this.databaseService, this.quizState, this.viewState);
    this.quizPanes = document.createElement('cq-quiz-panes');
    this.quizPanes.init(this.quizState);

    this.viewToggle = document.createElement('cq-view-toggle');
    this.viewToggle.init(this.viewState);

    this.updateView();
    this.viewState.subscribe('viewUpdate', () => {
      this.updateView();
    });

    this.quizState.subscribe('quizStart', () => {
      if (!this.overlayDiv.contains(this.viewToggle)) {
        this.overlayDiv.appendChild(this.viewToggle);
      }
    });

    this.configurer.addEventListener('featuresUpdate', (event) => {
      const features = event.detail;
      if (features?.length > 0) {
        this.map.fitMapToFeatures(features);
      }
    });
  }
  
  updateView() {
    switch (this.viewState.view) {
      case 'configurer':
        this.quizPanes.remove();
        this.overlayDiv.prepend(this.configurer);
        break;
      case 'quiz':
        this.configurer.remove();
        this.overlayDiv.prepend(this.quizPanes);
        break;
    }
  }
}
