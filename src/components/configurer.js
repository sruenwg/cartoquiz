import { setFeatureIds } from '../utils/map-utils.js';
import { collectKeyValues, repopulateOptions } from '../utils/misc.js';

/**
 * @import DatabaseService from '../services/db.js'
 * @import QuizState from '../services/quiz-state.js'
 * @import ViewState from '../services/view-state.js'
 * @import { LoadedData, PropertyValues, QuizInfo } from '../types.js'
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
  layerSelect;
  /** @type {HTMLSelectElement} */
  matchPropertySelect;
  /** @type {HTMLButtonElement} */
  startQuizButton;

  /** @type {HTMLElement} */
  dataLoaderContainer;
  /** @type {HTMLElement} */
  layerSelectContainer;

  get data() {
    return this.#data;
  }
  set data(value) {
    this.#data = value;

    if (this.data?.type === 'geojson') {
      this.features = this.data.getFeatures();
    } else { // this.data === undefined || this.data.type === 'topojson'
      this.features = undefined;
    }

    this.updateLayerSelect();
  }
  /** @type {LoadedData | undefined} */
  #data = undefined;

  get features() {
    return this.#features;
  }
  set features(value) {
    this.#features = value;

    if (this.features === undefined) {
      this.collectedPropertyValues = undefined;
    } else {
      const allProperties = this.features.map((feature) => feature.properties);
      this.collectedPropertyValues = collectKeyValues(allProperties);
    }

    this.dispatchEvent(new CustomEvent('featuresUpdate', { detail: this.features }));
  }
  /** @type {GeoJSON.Feature[] | undefined} */
  #features = undefined;

  get collectedPropertyValues() {
    return this.#collectedPropertyValues;
  }
  set collectedPropertyValues(value) {
    this.#collectedPropertyValues = value;

    this.matchProperty = undefined;

    this.updateMatchPropertySelect();
  }
  /** @type {PropertyValues | undefined} */
  #collectedPropertyValues = undefined;


  get matchProperty() {
    return this.#matchProperty;
  }
  set matchProperty(value) {
    this.#matchProperty = value;

    this.updateStartButton();
  }
  /** @type {string | undefined} */
  #matchProperty = undefined;

  get isValidDataLoaded() {
    return this.data !== undefined;
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
          <div class="configurer__control-group" id="data-loader-container">
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

    this.dataLoaderContainer = this.querySelector('#data-loader-container');
    const { layerSelect, layerSelectContainer } = this.createLayerSelectAndContainer();
    this.layerSelectContainer = layerSelectContainer;
    this.layerSelect = layerSelect;

    dataLoader.addEventListener('loadStart', () => {
      loadingIndicator.play();
    });
    dataLoader.addEventListener('loadEnd', () => {
      loadingIndicator.pause();
    });

    dataLoader.addEventListener('dataLoaderUpdate', (event) => {
      if (event.detail?.dataSource === undefined || event.detail?.data === undefined) {
        this.data = undefined;
      } else {
        this.data = {
          ...event.detail.data,
          source: event.detail.dataSource,
        };
      }
    });

    this.layerSelect.onchange = () => {
      if (this.data === undefined) {
        this.features = undefined;
      } else if (this.data.type === 'geojson') {
        this.features = this.data.getFeatures();
      } else { // this.data.type === 'topojson'
        this.features = this.layerSelect.value
          ? this.data.getLayerFeatures(this.layerSelect.value)
          : undefined;
      }
    };

    this.matchPropertySelect.onchange = () => {
      this.matchProperty = this.matchPropertySelect.value.trim() || undefined;
    };

    this.startQuizButton.onclick = async () => {
      loadingIndicator.play();
      /** @type {QuizInfo} */
      const quizInfo = {
        dataSource: this.data.source,
        features: setFeatureIds(this.features),
        attribution: this.data.attribution,
        collectedPropertyValues: this.collectedPropertyValues,
        matchProperty: this.matchProperty,
      };
      await this.quizState.startNewQuiz(quizInfo);
      loadingIndicator.pause();
      this.viewState.view = 'quiz';
    };
  }

  createLayerSelectAndContainer() {
    const layerSelectContainer = document.createElement('div');
    layerSelectContainer.classList.add('configurer__control-group');
    layerSelectContainer.id = 'layer-select-container';
    layerSelectContainer.innerHTML = `
      <label for="layer-select" class="configurer__control-group-label">
        Dataset layer:
      </label>
      <select id="layer-select" required>
        <option value="" selected>Select layer</option>
      </select>
    `;
    const layerSelect = layerSelectContainer.querySelector('#layer-select');
    return { layerSelectContainer, layerSelect };
  }

  updateLayerSelect() {
    this.layerSelect.disabled = true;

    if (this.data?.type !== 'topojson') {
      this.layerSelectContainer.remove();
      return;
    }
    const layerOptions = [...this.data.layerNames]
      .sort()
      .map((layerName) => new Option(layerName));
    repopulateOptions(this.layerSelect, layerOptions, true);
    if (!document.contains(this.layerSelectContainer)) {
      this.dataLoaderContainer.after(this.layerSelectContainer);
    }
    if (layerOptions.length === 1) {
      // Auto-select sole layer
      this.layerSelect.value = layerOptions[0].value;
      this.layerSelect.dispatchEvent(new Event('change'));
    }

    this.layerSelect.disabled = this.data === undefined;
  }

  updateMatchPropertySelect() {
    this.matchPropertySelect.disabled = true;

    const matchPropertyOptions = Object.keys(this.collectedPropertyValues ?? {})
      .sort()
      .map((key) => new Option(key));
    repopulateOptions(this.matchPropertySelect, matchPropertyOptions, true);
    if (matchPropertyOptions.length === 1) {
      // Auto-select sole property
      this.matchPropertySelect.value = matchPropertyOptions[0].value;
      this.matchPropertySelect.dispatchEvent(new Event('change'));
    }

    this.matchPropertySelect.disabled = this.collectedPropertyValues === undefined;
  }

  updateStartButton() {
    this.startQuizButton.disabled = this.matchProperty === undefined;
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
