import * as Gdal from '../utils/gdal.js';
import { repopulateOptions } from '../utils/misc.js';

/**
 * @import { DatasetWithAttribution } from '../types.js'
 */

/**
 * @typedef {Object} FilesWithAttribution
 * @property {File | FileList} files
 * @property {string} [attribution]
 */

const PRESETS_DIR = './data';
const PRESETS = [
  { label: 'German states (BKG, 2024)', filename: 'de-states-2024.topojson' },
  { label: 'German municipalities (BKG, 2024)', filename: 'de-municipalities-2024.topojson' },
  { label: 'Swiss cantons (swisstopo, 2025)', filename: 'ch-cantons-2025.topojson' },
  { label: 'Swiss municipalities (swisstopo, 2025)', filename: 'ch-municipalities-2025.topojson' },
  { label: 'Japanese prefectures (ROIS-DS CODH, 2023)', filename: 'jp-prefectures-2023.topojson' },
  { label: 'Japanese municipalities (ROIS-DS CODH, 2023)', filename: 'jp-municipalities-2023.topojson' },
];

export default class DatasetLoaderComponent extends HTMLElement {
  get disabled() {
    return this.#disabled;
  }
  set disabled(value) {
    this.#disabled = value;
    for (const control of this.controls) {
      control.disabled = value;
    }
  }

  get state() {
    return {
      datasetInfo: this.#datasetInfo,
      datasetLoadId: this.#datasetLoadId,
    };
  }
  set state({ datasetInfo, datasetLoadId }) {
    const lastDatasetInfo = this.#datasetInfo;
    const lastDatasetLoadId = this.#datasetLoadId;
    if (lastDatasetInfo === datasetInfo && lastDatasetLoadId === datasetLoadId) {
      return;
    }
    this.#datasetInfo = datasetInfo;
    this.#datasetLoadId = datasetLoadId;

    this.dispatchEvent(new CustomEvent('loadingStateUpdate', {
      detail: {
        loading: datasetLoadId !== undefined,
        datasetInfo,
      },
    }));

    if (lastDatasetInfo?.dataset !== undefined) {
      Gdal.close(lastDatasetInfo.dataset);
    }
  }

  /** @type {number | undefined} */
  #datasetLoadId = undefined;

  /** @type {DatasetWithAttribution | undefined} */
  #datasetInfo = undefined;

  /** @type {(HTMLButtonElement | HTMLInputElement | HTMLSelectElement)[]} */
  controls = [];

  #disabled = false;

  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.resetState();
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
            <input id="file-input" type="file" class="data-loader__data-input" multiple>
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
    urlInput.pattern = `https?://.+\..+\/.+\..+`;
    const urlFetchButton = this.querySelector('#url-fetch-button');

    const fileLoaderElement = this.querySelector('#data-loader__file');
    const fileRadio = this.querySelector('#file-radio');
    const fileInputContainer = this.querySelector('#file-input-container');
    const fileInput = this.querySelector('#file-input');

    const presetLoaderElement = this.querySelector('#data-loader__preset');
    const presetRadio = this.querySelector('#preset-radio');
    const presetSelectContainer = this.querySelector('#preset-select-container');
    const presetSelect = this.querySelector('#preset-select');
    repopulateOptions(
      presetSelect,
      PRESETS.map(({ label, filename }) => new Option(label, filename)),
    );

    this.controls = [
      urlRadio,
      urlInput,
      urlFetchButton,
      fileRadio,
      fileInput,
      presetRadio,
      presetSelect,
    ];

    urlRadio.onchange = () => {
      this.resetState();
      fileInputContainer.remove();
      presetSelectContainer.remove();
      urlInput.value = '';
      urlLoaderElement.appendChild(urlInputContainer);
    };
    fileRadio.onchange = () => {
      this.resetState();
      urlInputContainer.remove();
      presetSelectContainer.remove();
      fileInput.value = '';
      fileLoaderElement.appendChild(fileInputContainer);
    };
    presetRadio.onchange = () => {
      this.resetState();
      fileInputContainer.remove();
      urlInputContainer.remove();
      presetSelect.value = '';
      presetLoaderElement.appendChild(presetSelectContainer);
    };

    urlInput.onkeydown = async ({ isComposing, key }) => {
      if (key === 'Enter' && !isComposing) {
        await this.loadDataset(loadRemoteFile(urlInput));
      }
    };
    urlFetchButton.onclick = async () => {
      await this.loadDataset(loadRemoteFile(urlInput));
    };
    fileInput.onchange = async () => {
      await this.loadDataset(loadInputFiles(fileInput));
    };
    presetSelect.onchange = async () => {
      await this.loadDataset(loadPresetFile(presetSelect));
    };

    urlRadio.checked = true;
    urlRadio.dispatchEvent(new Event('change'));
  }

  resetState() {
    this.state = {};
  }

  /**
   * 
   * @param {Promise<FilesWithAttribution>} filesWithAttribution
   */
  async loadDataset(filesWithAttribution) {
    const id = Date.now();
    this.state = {
      datasetInfo: undefined,
      datasetLoadId: id,
    };
    try {
      const { files, attribution } = await filesWithAttribution;
      const dataset = await Gdal.openFirstDataset(files);
      if (this.state.datasetLoadId === id) {
        this.state = {
          datasetInfo: { dataset, attribution },
          datasetLoadId: undefined,
        };
      } else {
        // A more recent loadDataset call was made, so cancel this one
        Gdal.close(dataset);
      }
    } catch (err) {
      console.error(err);
      if (this.state.datasetLoadId === id) {
        this.resetState();
      }
    }
  }
}

/**
 * 
 * @param {HTMLInputElement} urlInput
 * @returns {Promise<FilesWithAttribution>}
 */
async function loadRemoteFile(urlInput) {
  const url = urlInput.value;
  if (!urlInput.checkValidity() || url === '') {
    throw new Error(`Invalid URL: "${url}"`);
  }
  const filename = url.split('/').at(-1);
  const response = await fetch(url);
  return {
    files: new File([await response.blob()], filename),
  };
}

/**
 * 
 * @param {HTMLInputElement} fileInput
 * @returns {Promise<FilesWithAttribution>}
 */
async function loadInputFiles(fileInput) {
  const files = fileInput.files;
  if (files === null || files.length === 0) {
    throw new Error('No files selected');
  }
  return { files };
}

/**
 * 
 * @param {HTMLSelectElement} presetSelect
 * @returns {Promise<FilesWithAttribution>}
 */
async function loadPresetFile(presetSelect) {
  const filename = presetSelect.value;
  const selectedPreset = PRESETS.find((preset) => preset.filename === filename);
  if (selectedPreset === undefined) {
    throw new Error(`Invalid option: "${filename}"`);
  }
  const response = await fetch(`${PRESETS_DIR}/${filename}`);
  const blob = await response.blob();
  const json = JSON.parse(await blob.text());
  return {
    files: new File([blob], filename),
    attribution: json.attribution,
  };
}
