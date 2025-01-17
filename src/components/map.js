import maplibregl from 'maplibre-gl';
import { noLabels } from 'protomaps-themes-base';
import {
  calcGeoJsonBounds,
  convertFeaturesToFeatureCollection,
  getFeatureId,
  calcGeometryCentre,
} from '../utils/map-utils.js';

/**
 * @import QuizState from '../services/quiz-state.js'
 * @import ViewState from '../services/view-state.js'
 */

const STATIC_ATTRIBUTIONS = [
  // Renderer
  '<a href="https://maplibre.org/" target="_blank">MapLibre</a>',
  // Theme
  '<a href="https://github.com/protomaps/basemaps" target="_blank">Protomaps</a>',
];
/** @type {maplibregl.StyleSpecification} */
const MAP_STYLE = {
  version: 8,
  layers: noLabels('openmaptiles', 'white'),
  sources: {
    'openmaptiles': {
      type: 'vector',
      scheme: 'xyz',
      url: 'https://tiles.stadiamaps.com/data/openmaptiles.json',
      attribution: `
        &copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>
        &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>
      `,
    },
  },
};
const USER_SOURCE_ID = 'user-source';
const HANDLERS = [
  'boxZoom',
  'doubleClickZoom',
  'dragPan',
  'dragRotate',
  'keyboard',
  'scrollZoom',
  'touchZoomRotate',
];
const LAST_GUESSED_CONDITION = ['boolean', ['feature-state', 'last-guessed'], false];
const HOVER_CONDITION = ['boolean', ['feature-state', 'hover'], false];

export default class MapComponent extends HTMLElement {
  /** @type {QuizState} */
  quizState;

  /** @type {maplibregl.Map} */
  map;
  /** @type {boolean | undefined} */
  isInteractive;
  /** @type {HTMLDivElement} */
  canvasContainer;
  /** @type {HTMLDivElement} */
  canvasOverlay;
  attributionControl = new maplibregl.AttributionControl({
    compact: true,
    customAttribution: STATIC_ATTRIBUTIONS,
  });
  navigationControl = new maplibregl.NavigationControl();
  /** @type {maplibregl.Popup} */
  popup;

  /**
   * Interval ID (set by setInterval) for the map's scroll animation
   * @type {number | undefined}
   */
  mapScrollAnimationInterval = undefined;

  constructor() {
    super();

    this.trackFeaturesUnderCursor = this.trackFeaturesUnderCursor.bind(this);
    this.updateHighlightStylesAndPopup = this.updateHighlightStylesAndPopup.bind(this);
  }

  connectedCallback() {
    this.render();
  }

  /**
   * @param {QuizState} quizState
   * @param {ViewState} viewState
   */
  init(quizState, viewState) {
    this.quizState = quizState;
    this.viewState = viewState;
  }
  
  render() {
    this.id = 'map';
    this.popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
      maxWidth: getComputedStyle(this).getPropertyValue('--max-popup-width'),
    });

    this.map = new maplibregl.Map({
      container: this.id,
      style: MAP_STYLE,
      center: [0, 45],
      zoom: 4,
      attributionControl: false,
    });
    this.map.addControl(this.attributionControl, 'bottom-right');
    this.createCanvasOverlay();
    this.enableBackdropOverlay();
    this.matchMapToView(this.viewState.view);
    this.viewState.subscribe('viewUpdate', () => {
      this.matchMapToView(this.viewState.view);
    });

    this.quizState.subscribe('quizStart', () => {
      if (this.map.getLayer('user-source-layer') !== undefined) {
        this.map.removeLayer('user-source-layer');
      }
      if (this.map.getLayer('user-source-outline-layer') !== undefined) {
        this.map.removeLayer('user-source-outline-layer');
      }
      if (this.map.getSource(USER_SOURCE_ID) !== undefined) {
        this.map.removeSource(USER_SOURCE_ID);
      }
      this.map.addSource(
        USER_SOURCE_ID,
        {
          type: 'geojson',
          data: convertFeaturesToFeatureCollection(this.quizState.features),
          attribution: this.quizState.dataAttribution ?? '',
        },
      );
      this.map.addLayer({
        source: USER_SOURCE_ID,
        id: 'user-source-layer',
        type: 'fill',
        filter: this.getUserSourceLayerFilter(),
        paint: {
          'fill-color': [
            'case',
            LAST_GUESSED_CONDITION,
            '#bc002d',
            '#000',
          ],
          'fill-opacity': [
            'case',
            LAST_GUESSED_CONDITION,
            0.2,
            0.1,
          ],
        },
      });
      this.map.addLayer({
        source: USER_SOURCE_ID,
        id: 'user-source-outline-layer',
        type: 'line',
        filter: this.getUserSourceLayerFilter(),
        paint: {
          'line-color': [
            'case',
            LAST_GUESSED_CONDITION,
            '#bc002d',
            '#000',
          ],
          'line-width': [
            'case',
            LAST_GUESSED_CONDITION,
            ['case', HOVER_CONDITION, 1.8, 0.8],
            ['case', HOVER_CONDITION, 1.2, 0.2],
          ],
        },
      });
    });
    this.quizState.subscribe('filtersUpdate', () => {
      this.fitMapToFeatures(this.quizState.filteredFeatures);
    });
    this.quizState.subscribe('matchesUpdate', ({ prevMatches, newMatches }) => {
      this.map.setFilter('user-source-layer', this.getUserSourceLayerFilter());
      this.map.setFilter('user-source-outline-layer', this.getUserSourceLayerFilter());
      for (const match of prevMatches) {
        this.map.setFeatureState(
          { source: USER_SOURCE_ID, id: getFeatureId(match) },
          { 'last-guessed': false },
        );
      }
      for (const match of newMatches) {
        this.map.setFeatureState(
          { source: USER_SOURCE_ID, id: getFeatureId(match) },
          { 'last-guessed': true },
        );
      }
    });
  }

  matchMapToView() {
    switch (this.viewState.view) {
      case 'configurer': {
        this.disableInteractivity();
        if (this.quizState.started) {
          this.fitMapToFeatures(this.quizState.features);
        } else {
          this.playMapScrollAnimation();
        }
        break;
      }
      case 'quiz': {
        this.fitMapToFeatures(this.quizState.filteredFeatures);
        this.enableInteractivity();
        break;
      }
    }
  }

  getUserSourceLayerFilter() {
    return [
      'all',
      [
        'in',
        ['geometry-type'],
        ['literal', ['Polygon', 'MultiPolygon']],
      ],
      [
        'in',
        ['number', ['id']],
        ['literal', this.quizState.guessedFeatures.map(getFeatureId)],
      ],
    ];
  }

  /**
   * @param {maplibregl.MapMouseEvent} mousemoveEvent
   */
  trackFeaturesUnderCursor(mousemoveEvent) {
    const featuresUnderCursor = this.map.queryRenderedFeatures(
      mousemoveEvent.point,
      { layers: ['user-source-layer'] },
    );
    if (featuresUnderCursor.length === 0) {
      this.quizState.highlightedFeatureId = undefined;
    } else {
      const featureId = getFeatureId(featuresUnderCursor[0]);
      this.quizState.highlightedFeatureId = featureId;
    }
  }

  /**
   * @param {{ previousHighlightedId: number | undefined, currentHighlightedId: number | undefined }} updateInfo
   */
  updateHighlightStylesAndPopup(updateInfo) {
    const { previousHighlightedId, currentHighlightedId } = updateInfo;
    if (previousHighlightedId !== undefined) {
      // Remove effects for previously highlighted feature
      this.map.setFeatureState(
        { source: USER_SOURCE_ID, id: previousHighlightedId },
        { 'hover': false },
      );
      if (currentHighlightedId === undefined) {
        this.popup.remove();
        return;
      }
    }
    // currentHighlightedId is defined
    // Add effects for currently highlighted feature
    this.map.setFeatureState(
      { source: USER_SOURCE_ID, id: currentHighlightedId },
      { 'hover': true },
    );
    const feature = this.quizState.getFeatureById(currentHighlightedId);
    this.popup
      .setHTML(this.createPopupHtml(feature.properties))
      .setLngLat(calcGeometryCentre(feature.geometry));
    if (!this.popup.isOpen()) {
      this.popup.addTo(this.map);
    }
  }

  createCanvasOverlay() {
    this.canvasContainer = this.map.getCanvasContainer();
    this.canvasOverlay = document.createElement('div');
    this.canvasOverlay.classList.add('map__canvas-overlay');
    this.canvasContainer.prepend(this.canvasOverlay);
  }

  enableInteractivity() {
    if (this.isInteractive !== undefined && this.isInteractive) {
      return;
    }
    this.disableBackdropOverlay();
    this.canvasContainer.classList.add('maplibregl-interactive');
    for (const handler of HANDLERS) {
      this.map[handler].enable();
    }
    if (!this.map.hasControl(this.navigationControl)) {
      this.map.addControl(this.navigationControl, 'bottom-right');
    }

    this.quizState.subscribe('highlightedFeatureUpdate', this.updateHighlightStylesAndPopup);
    this.map.on('mousemove', this.trackFeaturesUnderCursor);
    
    this.isInteractive = true;
  }

  disableInteractivity() {
    if (this.isInteractive !== undefined && !this.isInteractive) {
      return;
    }
    this.quizState.highlightedFeatureId = undefined;
    this.enableBackdropOverlay();
    this.canvasContainer.classList.remove('maplibregl-interactive');
    for (const handler of HANDLERS) {
      this.map[handler].disable();
    }
    if (this.map.hasControl(this.navigationControl)) {
      this.map.removeControl(this.navigationControl);
    }

    this.map.off('mousemove', this.trackFeaturesUnderCursor);
    this.quizState.unsubscribe('highlightedFeatureUpdate', this.updateHighlightStylesAndPopup);
    
    this.isInteractive = false;
  }

  enableBackdropOverlay() {
    this.canvasOverlay.classList.add('map__canvas-overlay--backdrop');
  }

  disableBackdropOverlay() {
    this.canvasOverlay.classList.remove('map__canvas-overlay--backdrop');
  }

  playMapScrollAnimation() {
    if (this.mapScrollAnimationInterval === undefined) {
      this.mapScrollAnimationInterval = setInterval(() => {
        this.map.panBy(
          [-5, 0],
          { easing: x => x, duration: 500 },
        );
      }, 500);
    }
  }

  pauseMapScrollAnimation() {
    clearInterval(this.mapScrollAnimationInterval);
    this.mapScrollAnimationInterval = undefined;
  }

  /**
   * @param {GeoJSON.Feature[]} features
   */
  fitMapToFeatures(features) {
    this.pauseMapScrollAnimation();
    const bounds = calcGeoJsonBounds(convertFeaturesToFeatureCollection(features));
    this.map.fitBounds(bounds, { padding: 25, speed: 2 });
  }

  /**
   * @param {GeoJSON.GeoJsonProperties} properties
   */
  createPopupHtml(properties) {
    const matchProperty = this.quizState.matchProperty;
    const rows = Object.entries(properties).map(([key, value]) => `
      <tr>
        <td>${key}</td>
        <td${key === matchProperty ? ' style="font-weight: bold;"' : ''}>${value}</td>
      </tr>
    `);
    return `<table class="map__popup-table">${rows.join('')}</table>`;
  }
}
