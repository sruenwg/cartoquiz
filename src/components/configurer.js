import { collectKeyValues, repopulateOptions } from '../utils/misc.js';

export default class ConfigurerComponent extends HTMLElement {
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
  /** @type {{ [key: string]: any[] }} */
  collectedPropertyValues = {};

  get isValidDataLoaded() {
    return this.dataSource !== undefined;
  }

  connectedCallback() {
    this.classList.add('configurer');
    this.render();
  }

  render() {
    this.innerHTML = `
      <h1 class="configurer__app-title">Cartoquiz</h1>
      <div class="configurer__section">
        <div class="configurer__section-label">Load data source (GeoJSON or TopoJSON):</div>
        <cq-data-loader></cq-data-loader>
      </div>
      <div class="configurer__section">
        <label for="match-property-select" class="configurer__section-label">Quiz on data property:</label>
        <select id="match-property-select" required disabled>
          <option value="" selected>Select property name</option>
        </select>
      </div>
      <button id="start-quiz-button" type="button" class="start-quiz-button" disabled>Start new quiz</button>
    `;

    const dataLoader = this.querySelector('cq-data-loader');
    this.matchPropertySelect = this.querySelector('#match-property-select');
    this.startQuizButton = this.querySelector('#start-quiz-button');

    dataLoader.addEventListener('dataUpdate', (event) => {
      this.dataSource = event.detail.dataSource;
      this.features = event.detail.data?.features ?? [];
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

      this.dispatchEvent(
        new CustomEvent(
          'matchPropertyUpdate',
          { detail: this.matchPropertySelect.value },
        ),
      );
    };

    this.startQuizButton.onclick = () => {
      const payload = {
        dataSource: this.dataSource,
        features: this.features,
        attribution: this.attribution,
        collectedPropertyValues: this.collectedPropertyValues,
        matchProperty: this.matchPropertySelect.value,
      };
      this.dispatchEvent(new CustomEvent('start', { detail: payload }));
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
}
