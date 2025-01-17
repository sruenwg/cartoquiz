import { setFeatureIds } from '../utils/map-utils.js';
import { collectKeyValues, repopulateOptions } from '../utils/misc.js';

/**
 * @import DatabaseService from '../services/db.js'
 * @import QuizState from '../services/quiz-state.js'
 * @import ViewState from '../services/view-state.js'
 * @import { PropertyValues, QuizInfo } from '../types.js'
 * @import DataLoaderComponent from './data-loader.js'
 * @import LoadingComponent from './loading.js'
 */

export default class ConfigurerComponent extends HTMLElement {
  /** @type {DatabaseService} */
  databaseService;
  /** @type {QuizState} */
  quizState;
  /** @type {ViewState} */
  viewState;

  /** @type {HTMLSelectElement} */
  matchPropertySelect;
  /** @type {HTMLButtonElement} */
  startQuizButton;

  /** @type {string} */
  dataSource;
  /** @type {string} */
  attribution;
  /** @type {GeoJSON.Feature[]} */
  features = [];
  /** @type {PropertyValues} */
  collectedPropertyValues = {};

  get isValidDataLoaded() {
    return this.dataSource !== undefined;
  }

  /**
   * @param {DatabaseService} databaseService
   * @param {QuizState} quizState
   * @param {ViewState} viewState
   */
  init(databaseService, quizState, viewState) {
    this.databaseService = databaseService;
    this.quizState = quizState;
    this.viewState = viewState;
  }

  connectedCallback() {
    this.classList.add('configurer');
    this.render();
  }

  render() {
    this.innerHTML = `
      <h1 class="configurer__app-title">Cartoquiz</h1>
      <div class="configurer__options">
        <div class="configurer__option">
          <h3 class="configurer__option-heading">
            Create new quiz
          </h3>
          <div class="configurer__control-group">
            <div class="configurer__control-group-label">
              Load data source (GeoJSON or TopoJSON):
            </div>
            <cq-data-loader></cq-data-loader>
          </div>
          <div class="configurer__control-group">
            <label for="match-property-select" class="configurer__control-group-label">
              Quiz on data property:
            </label>
            <select id="match-property-select" required disabled>
              <option value="" selected>Select property name</option>
            </select>
          </div>
          <div class="configurer__option-main-button-row">
            <button id="start-quiz-button" type="button" disabled>
              Start
            </button>
            <cq-loading id="create-quiz-loading"></cq-loading>
          </div>
        </div>
      </div>
    `;

    if (!this.quizState.started) {
      this.showResumeQuizOption();
    }

    /** @type {DataLoaderComponent} */
    const dataLoader = this.querySelector('cq-data-loader');
    this.matchPropertySelect = this.querySelector('#match-property-select');
    this.startQuizButton = this.querySelector('#start-quiz-button');
    /** @type {LoadingComponent} */
    const loadingIndicator = this.querySelector('#create-quiz-loading');

    dataLoader.addEventListener('loadStart', () => {
      loadingIndicator.play();
    });
    dataLoader.addEventListener('loadEnd', () => {
      loadingIndicator.pause();
    });

    dataLoader.addEventListener('dataUpdate', (event) => {
      this.dataSource = event.detail.dataSource;
      this.features = event.detail.data?.features ?? [];
      setFeatureIds(this.features);
      this.attribution = event.detail.data?.attribution;
      this.updateMatchPropertySelect();
      this.updateStartButton();

      const payload = {
        features: this.features,
        attribution: this.attribution,
      };
      this.dispatchEvent(new CustomEvent('dataUpdate', { detail: payload }));
    });

    this.matchPropertySelect.onchange = () => {
      this.updateStartButton();
    };

    this.startQuizButton.onclick = async () => {
      /** @type {QuizInfo} */
      const quizInfo = {
        dataSource: this.dataSource,
        features: this.features,
        attribution: this.attribution,
        collectedPropertyValues: this.collectedPropertyValues,
        matchProperty: this.matchPropertySelect.value,
      };
      loadingIndicator.play();
      await this.quizState.startNewQuiz(quizInfo);
      loadingIndicator.pause();
      this.viewState.view = 'quiz';
    };
  }

  updateMatchPropertySelect() {
    const allProperties = this.features.map((feature) => feature.properties);
    this.collectedPropertyValues = collectKeyValues(allProperties);
    const matchPropertyOptions = Object.keys(this.collectedPropertyValues)
      .sort()
      .map((key) => new Option(key));
    repopulateOptions(this.matchPropertySelect, matchPropertyOptions, true);

    this.matchPropertySelect.disabled = !this.isValidDataLoaded;
  }

  updateStartButton() {
    this.startQuizButton.disabled = !this.isValidDataLoaded
      || this.matchPropertySelect.value === '';
  }

  showResumeQuizOption() {
    const options = this.querySelector('.configurer__options');

    const divider = document.createElement('div');
    divider.classList.add('configurer__options-divider');
    divider.textContent = 'or';

    const resumeQuizOption = document.createElement('div');
    resumeQuizOption.classList.add('configurer__option');
    resumeQuizOption.innerHTML = `
      <h3 class="configurer__option-heading">
        Resume in-progress quiz
      </h3>
      <div class="configurer__resume-quiz-info">
      </div>
      <div class="configurer__option-main-button-row">
        <button id="resume-quiz-button" type="button" disabled>
          Resume
        </button>
        <cq-loading id="resume-quiz-loading"></cq-loading>
      </div>
    `;

    options.append(divider, resumeQuizOption);

    const resumeQuizInfo = resumeQuizOption
      .querySelector('.configurer__resume-quiz-info');
    const resumeQuizButton = resumeQuizOption
      .querySelector('#resume-quiz-button');
    /** @type {LoadingComponent} */
    const loadingIndicator = resumeQuizOption
      .querySelector('#resume-quiz-loading');

    resumeQuizButton.onclick = async () => {
      loadingIndicator.play();
      await this.quizState.resumeExistingQuiz();
      loadingIndicator.pause();
      this.viewState.view = 'quiz';
    };

    loadingIndicator.play();
    this.databaseService.getQuizOverview()
      .then((overview) => {
        loadingIndicator.pause();
        const existsQuiz = overview.dataSource !== undefined;
        if (existsQuiz) {
          resumeQuizInfo.innerHTML = `
            <div class="configurer__resume-quiz-overview-entry">
              <div class="configurer__resume-quiz-overview-key">
                Data source:
              </div>
              <div class="configurer__resume-quiz-overview-value">
                ${overview.dataSource}
              </div>
            </div>
            <div class="configurer__resume-quiz-overview-entry">
              <div class="configurer__resume-quiz-overview-key">
                Quiz property:
              </div>
              <div class="configurer__resume-quiz-overview-value--monospaced">
                ${overview.matchProperty}
              </div>
            </div>
            <div class="configurer__resume-quiz-overview-entry">
              <div class="configurer__resume-quiz-overview-key">
                Guessed:
              </div>
              <div class="configurer__resume-quiz-overview-value">
                ${overview.numGuessed} / ${overview.numFeatures}
              </div>
            </div>
          `;
          resumeQuizButton.disabled = false;
        } else { // !existsQuiz
          const resumeQuizNotFoundText = document.createElement('span');
          resumeQuizNotFoundText.classList.add('configurer__resume-quiz-not-found-text');
          resumeQuizNotFoundText.textContent = 'No quiz started yet.';
          resumeQuizInfo.append(resumeQuizNotFoundText);
        }
      });
  }
}
