import * as Gdal from '../utils/gdal.js';
import { collectFeatures } from '../utils/map-utils.js';
import { collectKeyValues, compareWithCallback, repopulateOptions } from '../utils/misc.js';

/**
 * @import DatabaseService from '../services/db.js'
 * @import QuizState from '../services/quiz-state.js'
 * @import ViewState from '../services/view-state.js'
 * @import { DatasetWithAttribution, PromiseWithAbort, PropertyValues, QuizInfo } from '../types.js'
 * @import DatasetLoaderComponent from './dataset-loader.js'
 * @import LoadingComponent from './loading.js'
 * 
 * @typedef {Object} FeatureData
 * @property {GeoJSON.Feature[]} features
 * @property {PropertyValues} collectedPropertyValues
 */

export default class ConfigurerComponent extends HTMLElement {
  /** @type {DatabaseService} */
  databaseService;
  /** @type {QuizState} */
  quizState;
  /** @type {ViewState} */
  viewState;

  /** @type {DatasetLoaderComponent} */
  datasetLoader;
  /** @type {HTMLSelectElement} */
  layerSelect;
  /** @type {HTMLSelectElement} */
  matchPropertySelect;
  /** @type {HTMLButtonElement} */
  startQuizButton;
  /** @type {LoadingComponent} */
  loadingIndicator;

  get loading() {
    return this.#loadingTasksCount > 0;
  }
  set loading(value) {
    if (value) {
      this.#loadingTasksCount += 1;
    } else {
      this.#loadingTasksCount -= 1;
    }
    if (this.loading) {
      this.loadingIndicator.play();
    } else {
      this.loadingIndicator.pause();
    }
  }
  #loadingTasksCount = 0;

  get datasetState() {
    return this.#datasetState;
  }
  set datasetState(value) {
    const wasLoading = this.#datasetState.loading;
    this.#datasetState = value;

    if (!wasLoading && value.loading) {
      this.loading = true;
    } else if (wasLoading && !value.loading) {
      this.loading = false;
    }
    this.selectedLayerName = undefined;
    this.updateLayerSelect(value.datasetInfo?.dataset.info.layers);
  }
  /** @type {{ loading: boolean, datasetInfo: DatasetWithAttribution | undefined }} */
  #datasetState = { loading: false, datasetInfo: undefined };

  get datasetInfo() {
    return this.#datasetState.datasetInfo;
  }

  get selectedLayerName() {
    return this.#selectedLayerName;
  }
  set selectedLayerName(value) {
    this.#selectedLayerName = value;

    this.featureData = undefined;
    /** @type {Layer | undefined} */
    const layer = this.datasetInfo?.dataset.info.layers
      .find((layer) => layer.name === this.selectedLayerName);
    if (layer !== undefined) {
      this.loading = true;
      const promiseWithResolvers = Promise.withResolvers();
      const featureData = Promise.race([
        promiseWithResolvers.promise,
        Gdal.toGeoJson(this.datasetInfo.dataset, layer),
      ])
        .then((geoJson) => {
          if (geoJson === undefined) {
            return undefined;
          }
          const features = collectFeatures(geoJson);
          const allProperties = features.map((feature) => feature.properties);
          const collectedPropertyValues = collectKeyValues(allProperties);
          return { features, collectedPropertyValues };
        })
        .catch((err) => {
          console.error(err);
          return undefined;
        })
        .finally(() => {
          this.loading = false;
        });
      this.featureData = {
        promise: featureData,
        abort: () => promiseWithResolvers.resolve(undefined),
      };
    }
  }
  /** @type {string | undefined} */
  #selectedLayerName = undefined;

  get featureData() {
    return this.#featureData;
  }
  set featureData(value) {
    this.#featureData?.abort();
    this.#featureData = value;

    this.dispatchEvent(new CustomEvent('featuresUpdate', { detail: undefined }));
    this.matchProperty = undefined;
    this.updateMatchPropertySelect(undefined);

    this.featureData?.promise
      .then((featureData) => {
        const features = featureData?.features;
        const collectedPropertyValues = featureData?.collectedPropertyValues;
        this.dispatchEvent(new CustomEvent('featuresUpdate', { detail: features }));
        this.matchProperty = undefined;
        this.updateMatchPropertySelect(collectedPropertyValues);
      });
  }
  /** @type {PromiseWithAbort<FeatureData | undefined> | undefined} */
  #featureData = undefined;

  get matchProperty() {
    return this.#matchProperty;
  }
  set matchProperty(value) {
    this.#matchProperty = value;

    this.updateStartButton();
  }
  /** @type {string | undefined} */
  #matchProperty = undefined;

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
              Load dataset:
            </div>
            <cq-dataset-loader></cq-dataset-loader>
          </div>
          <div class="configurer__control-group">
            <label for="layer-select" class="configurer__control-group-label">
              Dataset layer:
            </label>
            <select id="layer-select" required disabled>
              <option value="" selected>Select layer</option>
            </select>
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

    this.datasetLoader = this.querySelector('cq-dataset-loader');
    this.layerSelect = this.querySelector('#layer-select');
    this.matchPropertySelect = this.querySelector('#match-property-select');
    this.startQuizButton = this.querySelector('#start-quiz-button');
    this.loadingIndicator = this.querySelector('cq-loading');

    this.datasetLoader.addEventListener('loadingStateUpdate', (event) => {
      this.datasetState = event.detail;
    });

    this.layerSelect.onchange = () => {
      this.selectedLayerName = this.layerSelect.value || undefined;
    };

    this.matchPropertySelect.onchange = () => {
      this.matchProperty = this.matchPropertySelect.value || undefined;
    };

    this.startQuizButton.onclick = async () => {
      this.disableAllControls();
      this.loading = true;

      const featureData = await this.featureData.promise;
      if (featureData === undefined) {
        this.loading = false;
        this.enableAllControls();
        return;
      }
      /** @type {QuizInfo} */
      const quizInfo = {
        dataSource: this.datasetInfo.dataset.path,
        features: featureData.features,
        attribution: this.datasetInfo.attribution || undefined,
        collectedPropertyValues: featureData.collectedPropertyValues,
        matchProperty: this.matchProperty,
      };
      await this.quizState.startNewQuiz(quizInfo);
      this.loading = false;
      this.viewState.view = 'quiz';
    };
  }

  disableAllControls() {
    this.datasetLoader.disabled = true;
    this.layerSelect.disabled = true;
    this.matchPropertySelect.disabled = true;
    this.startQuizButton.disabled = true;
  }
  
  enableAllControls() {
    this.datasetLoader.disabled = false;
    this.layerSelect.disabled = false;
    this.matchPropertySelect.disabled = false;
    this.startQuizButton.disabled = false;
  }

  /**
   * @param {Layer[] | undefined}
   */
  updateLayerSelect(layers) {
    this.layerSelect.disabled = true;
    const remainDisabled = layers === undefined;
    layers = layers ?? [];

    const layerOptions = layers
      .map((layer) => new Option(layer.name))
      .sort(compareWithCallback((option) => option.value));
    repopulateOptions(this.layerSelect, layerOptions, true);
    if (layerOptions.length === 1) {
      // Auto-select sole layer
      this.layerSelect.value = layerOptions[0].value;
      this.layerSelect.dispatchEvent(new Event('change'));
    }

    this.layerSelect.disabled = remainDisabled;
  }

  /**
   * @param {PropertyValues | undefined} collectedPropertyValues
   */
  updateMatchPropertySelect(collectedPropertyValues) {
    this.matchPropertySelect.disabled = true;
    const remainDisabled = collectedPropertyValues === undefined;
    collectedPropertyValues = collectedPropertyValues ?? {};

    const matchPropertyOptions = Object.keys(collectedPropertyValues)
      .sort()
      .map((key) => new Option(key));
    repopulateOptions(this.matchPropertySelect, matchPropertyOptions, true);
    if (matchPropertyOptions.length === 1) {
      // Auto-select sole property
      this.matchPropertySelect.value = matchPropertyOptions[0].value;
      this.matchPropertySelect.dispatchEvent(new Event('change'));
    }

    this.matchPropertySelect.disabled = remainDisabled;
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
