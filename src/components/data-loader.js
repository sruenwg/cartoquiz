import { parseFeaturesAndAttribution } from '../utils/map-utils.js';
import { repopulateOptions } from '../utils/misc.js';

const VALID_FILE_EXTENSIONS = ['json', 'geojson', 'topojson'];
const PRESETS_DIR = './data';
const PRESETS = [
  { label: 'German states (BKG, 2024)', filename: 'de-states-2024.topojson' },
  { label: 'German municipalities (BKG, 2024)', filename: 'de-municipalities-2024.topojson' },
  { label: 'Swiss cantons (swisstopo, 2025)', filename: 'ch-cantons-2025.topojson' },
  { label: 'Swiss municipalities (swisstopo, 2025)', filename: 'ch-municipalities-2025.topojson' },
  { label: 'Japanese prefectures (ROIS-DS CODH, 2023)', filename: 'jp-prefectures-2023.topojson' },
  { label: 'Japanese municipalities (ROIS-DS CODH, 2023)', filename: 'jp-municipalities-2023.topojson' },
];

export default class DataLoaderComponent extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div id="data-loader__url" class="data-loader__option">
        <label for="url-radio" class="data-loader__radio-label">
          <input id="url-radio" name="data-source" type="radio" class="data-loader__radio">
          URL
        </label>
        <div id="url-input-container" class="data-loader__data-input-container">
          <input id="url-input" type="url" class="data-loader__data-input">
          <button id="url-fetch-button" class="data-loader__fetch-data-button">Fetch</button>
        </div>
      </div>
      <div id="data-loader__file" class="data-loader__option">
        <label for="file-radio" class="data-loader__radio-label">
          <input id="file-radio" name="data-source" type="radio" class="data-loader__radio">
          File
        </label>
        <div id="file-input-container" class="data-loader__data-input-container">
          <label for="file-input" class="data-loader__file-input-label">
            <input id="file-input" type="file" class="data-loader__data-input">
          </label>
        </div>
      </div>
      <div id="data-loader__preset" class="data-loader__option">
        <label for="preset-radio" class="data-loader__radio-label">
          <input id="preset-radio" name="data-source" type="radio" class="data-loader__radio">
          Preset
        </label>
        <div id="preset-select-container" class="data-loader__data-input-container">
          <select id="preset-select" class="data-loader__preset-select" required>
            <option value="" selected>Select preset data</option>
          </select>
        </div>
      </div>
    `;

    const urlLoaderElement = this.querySelector('#data-loader__url');
    const urlRadio = this.querySelector('#url-radio');
    const urlInputContainer = this.querySelector('#url-input-container');
    const urlInput = this.querySelector('#url-input');
    urlInput.pattern = `https?://.+\..+\\.(${VALID_FILE_EXTENSIONS.join('|')})`;
    const urlFetchButton = this.querySelector('#url-fetch-button');

    const fileLoaderElement = this.querySelector('#data-loader__file');
    const fileRadio = this.querySelector('#file-radio');
    const fileInputContainer = this.querySelector('#file-input-container');
    const fileInput = this.querySelector('#file-input');
    fileInput.accept = VALID_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(', ');

    const presetLoaderElement = this.querySelector('#data-loader__preset');
    const presetRadio = this.querySelector('#preset-radio');
    const presetSelectContainer = this.querySelector('#preset-select-container');
    const presetSelect = this.querySelector('#preset-select');
    repopulateOptions(
      presetSelect,
      PRESETS.map(({ label, filename }) => new Option(label, filename)),
    );

    const urlLoader = new Loader(
      () => loadRemoteText(urlInput),
      parseFeaturesAndAttribution,
      (loader) => {
        urlFetchButton.disabled = loader.isPending;
        this.emitLoaderUpdate(loader);
      },
    );
    const fileLoader = new Loader(
      () => loadFileText(fileInput),
      parseFeaturesAndAttribution,
      (loader) => this.emitLoaderUpdate(loader),
    );
    const presetLoader = new Loader(
      () => loadPresetText(presetSelect),
      parseFeaturesAndAttribution,
      (loader) => this.emitLoaderUpdate(loader),
    );

    urlRadio.onchange = () => {
      fileInputContainer.remove();
      presetSelectContainer.remove();
      if (!urlLoader.isPending && !urlLoader.hasData) {
        urlInput.value = '';
      }
      urlLoaderElement.appendChild(urlInputContainer);
      this.emitLoaderUpdate(urlLoader);
    };
    fileRadio.onchange = () => {
      urlInputContainer.remove();
      presetSelectContainer.remove();
      if (!fileLoader.isPending && !fileLoader.hasData) {
        fileInput.value = '';
      }
      fileLoaderElement.appendChild(fileInputContainer);
      this.emitLoaderUpdate(fileLoader);
    };
    presetRadio.onchange = () => {
      fileInputContainer.remove();
      urlInputContainer.remove();
      if (!presetLoader.isPending && !presetLoader.hasData) {
        presetSelect.value = '';
      }
      presetLoaderElement.appendChild(presetSelectContainer);
      this.emitLoaderUpdate(presetLoader);
    };

    urlInput.onkeydown = ({ isComposing, key }) => {
      if (key === 'Enter' && !isComposing) {
        this.loadData(urlLoader);
      }
    };
    urlFetchButton.onclick = () => this.loadData(urlLoader);
    fileInput.onchange = () => this.loadData(fileLoader);
    presetSelect.onchange = () => this.loadData(presetLoader);

    urlRadio.checked = true;
    urlRadio.dispatchEvent(new Event('change'));
  }

  /**
   * @param {Loader} loader
   */
  emitLoaderUpdate(loader) {
    const payload = {
      dataSource: loader.dataSource,
      data: loader.data,
      isPending: loader.isPending,
    };
    this.dispatchEvent(new CustomEvent('dataUpdate', { detail: payload }));
  }

  /**
   * @param {Loader} loader
   */
  async loadData(loader) {
    this.dispatchEvent(new CustomEvent('loadStart'));
    await loader.loadData();
    this.dispatchEvent(new CustomEvent('loadEnd'));
  }
}

class Loader {
  /** @type {() => Promise<{ dataSource: string, text: string }>} */
  textLoader;
  /** @type {(text: string) => any} */
  dataParser;
  /** @type {(loader: Loader) => void} */
  onStateChange;
  isPending = false;
  /** @type {string | undefined} */
  dataSource;
  /** @type {any | undefined} */
  data;

  get hasData() {
    return this.dataSource !== undefined;
  }

  /**
   * @param {() => Promise<{ dataSource: string, text: string }>} textLoader
   * @param {(text: string) => any} dataParser
   * @param {(loader: Loader) => void} onStateChange
   */
  constructor(textLoader, dataParser, onStateChange) {
    this.textLoader = textLoader;
    this.dataParser = dataParser;
    this.onStateChange = onStateChange;
  }

  loadData() {
    this.isPending = true;
    this.dataSource = undefined;
    this.data = undefined;
    this.onStateChange(this);

    return this.textLoader()
      .then(({ dataSource, text }) => {
        this.dataSource = dataSource;
        this.data = this.dataParser(text);
      })
      .catch((err) => {
        this.dataSource = undefined;
        this.data = undefined;
        console.error(err);
      })
      .finally(() => {
        this.isPending = false;
        this.onStateChange(this);
      });
  }
}

/**
 * Loads text data from the URL in the given URL input element.
 * @param {HTMLInputElement} urlInput
 * @returns {Promise<{ dataSource: string; text: string }>}
 */
function loadRemoteText(urlInput) {
  const url = urlInput.value;
  if (!urlInput.checkValidity() || url === '') {
    return Promise.reject(`Invalid URL: "${url}"`);
  }
  return fetch(url)
    .then((response) => response.text())
    .then((text) => ({ dataSource: url, text }));
}

/**
 * Loads text data from the file in the given file input element.
 * @param {HTMLInputElement} fileInput
 * @returns {Promise<{ dataSource: string; text: string }>}
 */
function loadFileText(fileInput) {
  return new Promise((resolve, reject) => {
    if (fileInput.files.length !== 1) {
      return reject();
    }
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => resolve({ dataSource: file.name, text: reader.result });
    reader.onerror = () => reject();
    reader.readAsText(file);
  });
}

/**
 * Loads the preset file data selected in the given select element.
 * @param {HTMLSelectElement} select
 * @returns {Promise<{ dataSource: string; text: string }>}
 */
function loadPresetText(select) {
  const filename = select.value;
  const selectedPreset = PRESETS.find((preset) => preset.filename === filename);
  if (selectedPreset === undefined) {
    return Promise.reject(`Invalid option: "${filename}"`);
  }
  return fetch(`${PRESETS_DIR}/${filename}`)
    .then((response) => response.text())
    .then((text) => ({ dataSource: selectedPreset.label, text }));
}
