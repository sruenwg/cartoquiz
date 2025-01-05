const template = document.createElement('template');
template.innerHTML = `
  <style>
    button {
      align-items: center;
      background: none;
      background-color: var(--icon-button-background-color, none);
      border: var(--icon-button-border, none);
      border-radius: 50%;
      display: flex;
      height: 40px;
      justify-content: center;
      margin: 0;
      padding: 0;
      pointer-events: auto;
      user-select: none;
      width: 40px;

      &:hover {
        backdrop-filter: brightness(0.95);
        cursor: pointer;
      }
    }

    .material-symbols-rounded {
      font-family: 'Material Symbols Rounded';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }
  </style>
  <button>
    <slot></slot>
  </button>
`;

export default class IconButtonComponent extends HTMLElement {
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    shadowRoot.appendChild(template.content.cloneNode(true));
  }
}
