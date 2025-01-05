/** @typedef { import('../services/view-state.js').default } ViewState */

const closeIcon = `<span class="material-symbols-rounded">close</span>`;
const settingsIcon = `<span class="material-symbols-rounded">settings</span>`;

export default class ViewToggleComponent extends HTMLElement {
  /** @type {ViewState} */
  viewState;

  /** @type {HTMLButtonElement} */
  button;

  /**
   * @param {ViewState} viewState
   */
  init(viewState) {
    this.viewState = viewState;
  }

  connectedCallback() {
    this.classList.add('view-toggle');
    this.render();
  }

  render() {
    this.innerHTML = `<cq-icon-button></cq-icon-button>`;

    this.button = this.querySelector('cq-icon-button');
    this.button.addEventListener('click', () => {
      if (this.viewState.view === 'configurer') {
        this.viewState.view = 'quiz';
      } else {
        this.viewState.view = 'configurer';
      }
    });

    this.updateIcon();
    this.updateTooltip();
    this.viewState.subscribe('viewUpdate', () => {
      this.updateIcon();
      this.updateTooltip();
    });
  }

  updateIcon() {
    this.button.innerHTML = this.viewState.view === 'configurer'
      ? closeIcon
      : settingsIcon;
  }

  updateTooltip() {
    this.button.title = this.viewState.view === 'configurer'
      ? 'Return to quiz'
      : 'Reconfigure quiz';
  }
}
