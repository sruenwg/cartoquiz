import AppComponent from './components/app.js';
import ConfigurerComponent from './components/configurer.js';
import DataLoaderComponent from './components/data-loader.js';
import FilterPaneComponent from './components/filter-pane.js';
import FilterRowComponent from './components/filter-row.js';
import GuessedPaneComponent from './components/guessed-pane.js';
import GuessedRowComponent from './components/guessed-row.js';
import IconButtonComponent from './components/icon-button.js';
import MapComponent from './components/map.js';
import QuizPanesComponent from './components/quiz-panes.js';
import ViewToggleComponent from './components/view-toggle.js';

customElements.define('cq-app', AppComponent);
customElements.define('cq-configurer', ConfigurerComponent);
customElements.define('cq-data-loader', DataLoaderComponent);
customElements.define('cq-filter-pane', FilterPaneComponent);
customElements.define('cq-filter-row', FilterRowComponent);
customElements.define('cq-guessed-pane', GuessedPaneComponent);
customElements.define('cq-guessed-row', GuessedRowComponent);
customElements.define('cq-icon-button', IconButtonComponent);
customElements.define('cq-map', MapComponent);
customElements.define('cq-quiz-panes', QuizPanesComponent);
customElements.define('cq-view-toggle', ViewToggleComponent);

document.body.prepend(document.createElement('cq-app'));
