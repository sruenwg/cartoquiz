import { COLLAPSED_ARROW, EXPANDED_ARROW } from '../constants.js';

/**
 * @import QuizState from '../services/quiz-state.js'
 * @import { Filter, PropertyValues } from '../types.js'
 * @import FilterRowComponent from './filter-row.js'
 */

export default class FilterPaneComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;
  isExpanded = false;
  /** @type {HTMLDivElement} */
  arrow;
  /** @type {HTMLDivElement} */
  listDiv;
  /** @type {HTMLButtonElement} */
  addFilterButton;

  /**
   * @param {QuizState} quizState
   */
  init(quizState) {
    this.quizState = quizState;
  }

  connectedCallback() {
    this.classList.add('filters', 'pane', 'expandable-pane');
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="pane__header">
        <div class="pane__arrow"></div>
        <div class="pane__label">Filters</div>
        <div class="pane__counter"></div>
      </div>
    `;

    const header = this.querySelector('.pane__header');
    this.arrow = this.querySelector('.pane__arrow');
    const counter = this.querySelector('.pane__counter');
    this.createListDiv();
    this.createAddFilterButton();

    counter.textContent = this.quizState.filters.length || '';
    this.quizState.subscribe('filtersUpdate', (filters) => {
      counter.textContent = filters.length || '';
    });

    header.onclick = () => {
      if (this.isExpanded) {
        this.collapse();
      } else {
        this.expand();
      }
    };

    this.collapse();
  }

  createListDiv() {
    this.listDiv = document.createElement('div');
    this.listDiv.classList.add('filters__list', 'pane__list');

    const propertyValues = this.quizState.propertyValuesForFilter;
    for (const filter of this.quizState.filters) {
      this.addFilter(filter, propertyValues);
    }
  }

  /**
   * @param {Filter} filter
   * @param {PropertyValues} propertyValues
   */
  addFilter(filter, propertyValues) {
    /** @type {FilterRowComponent} */
    const filterRow = document.createElement('cq-filter-row');
    filterRow.init(filter, propertyValues);
    filterRow.addEventListener('filterUpdate', () => {
      this.updateFilters();
    });
    this.listDiv.appendChild(filterRow);
  }

  addBlankFilter() {
    this.addFilter({}, this.quizState.propertyValuesForFilter);
  }

  updateFilters() {
    const filterRows = [...this.listDiv.children];
    this.quizState.filters = filterRows.map((filterRow) => filterRow.filter);
  }

  createAddFilterButton() {
    this.addFilterButton = document.createElement('button');
    this.addFilterButton.classList.add('filters__add-filter-button');
    this.addFilterButton.innerHTML = `
      <span class="material-symbols-rounded filters__add-filter-icon">add</span>
      Add filter
    `;
    this.addFilterButton.onclick = () => {
      this.addBlankFilter();
    };
  }

  expand() {
    this.arrow.textContent = EXPANDED_ARROW;
    this.classList.remove('pane--collapsed');
    this.classList.add('pane--expanded');
    if (this.listDiv.children.length === 0) {
      this.addBlankFilter();
    }
    this.append(this.listDiv, this.addFilterButton);

    this.isExpanded = true;
  }

  collapse() {
    this.addFilterButton.remove();
    this.listDiv.remove();
    this.removeInvalidFilters();
    this.classList.remove('pane--expanded');
    this.classList.add('pane--collapsed');
    this.arrow.textContent = COLLAPSED_ARROW;

    this.isExpanded = false;
  }

  removeInvalidFilters() {
    for (let i = this.listDiv.children.length - 1; i >= 0; i--) {
      /** @type {FilterRowComponent} */
      const filterRow = this.listDiv.children.item(i);
      const filter = filterRow.filter;
      if (filter.key === undefined || filter.value === undefined) {
        filterRow.remove();
      }
    }
  }
}
