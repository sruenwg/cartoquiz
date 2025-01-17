import { repopulateOptions, setSelectValue } from '../utils/misc.js';

/**
 * @import { Filter, PropertyValues } from '../types.js'
 */

export default class FilterRowComponent extends HTMLElement {
  /** @type {Filter} */
  #filter = {};
  /** @type {PropertyValues} */
  propertyValues;
  /** @type {HTMLSelectElement} */
  keySelect;
  /** @type {HTMLSelectElement} */
  valueSelect;
  /** @type {HTMLButtonElement} */
  removeButton;

  get filter() {
    return { ...this.#filter };
  }

  /**
   * @param {Filter} filter
   * @param {PropertyValues} propertyValues
   */
  init(filter, propertyValues) {
    this.propertyValues = propertyValues;
    this.#filter.key = filter.key;
    this.#filter.value = filter.value;
  }

  connectedCallback() {
    this.classList.add('filter');
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="filter__selections">
        <label class="filter__select-label">
          Key:
          <select class="filter__key-select">
            <option value="" selected>Select property key</option>
          </select>
        </label>
        <label class="filter__select-label">
          Value:
          <select class="filter__value-select" disabled>
            <option value="" selected>Select property value</option>
          </select>
        </label>
      </div>
      <button class="filter__remove-filter-button">
        <span class="material-symbols-rounded filter__remove-filter-icon">
          remove
        </span>
      </button>
    `;

    this.keySelect = this.querySelector('.filter__key-select');
    this.valueSelect = this.querySelector('.filter__value-select');
    this.removeButton = this.querySelector('.filter__remove-filter-button');

    for (const key in this.propertyValues) {
      this.keySelect.add(new Option(key));
    }
    setSelectValue(this.keySelect, this.#filter.key);
    this.updateValueSelectState();
    setSelectValue(this.valueSelect, this.#filter.value);

    this.keySelect.onchange = () => {
      this.#filter.key = this.keySelect.value || undefined;
      this.#filter.value = undefined;
      this.updateValueSelectState();
      this.emitFilterUpdate();
    };

    this.valueSelect.onchange = () => {
      this.#filter.value = this.valueSelect.value || undefined;
      this.emitFilterUpdate();
    };

    this.removeButton.onclick = () => {
      this.remove();
      this.emitFilterUpdate();
    };
  }

  updateValueSelectState() {
    const key = this.#filter.key;
    const values = this.propertyValues[key] ?? [];
    this.valueSelect.disabled = key === undefined;
    this.valueSelect.value = '';
    repopulateOptions(this.valueSelect, values.map((value) => new Option(value)));
  }

  emitFilterUpdate() {
    this.dispatchEvent(new Event('filterUpdate'));
  }
}
