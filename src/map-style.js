// @ts-check

/** @type {maplibregl.StyleSpecification} */
export const MAP_STYLE = {
  version: 8,
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
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#fefefe',
      }
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'water',
      paint: {
        'fill-color': '#eaeaea',
      },
    },
    {
      id: 'waterway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['==', '$type', 'LineString'],
      paint: {
        'line-color': '#eaeaea',
        'line-opacity': 0.6,
      },
    },
    {
      id: 'landcover_wood',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: [
        'all',
        ['==', '$type', 'Polygon'],
        ['==', 'class', 'wood'],
      ],
      paint: {
        'fill-color': '#cceecc',
        'fill-opacity': 0.1,
      },
    },
    {
      id: 'landcover_ice',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: [
        'all',
        ['==', '$type', 'Polygon'],
        ['==', 'class', 'ice'],
      ],
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.9,
      },
    },
    {
      id: 'path',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 14,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'path'],
      ],
      paint: {
        'line-color': '#eee',
        'line-opacity': 0.6,
      },
    },
    {
      id: 'road_minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'minor'],
      ],
      paint: {
        'line-color': '#eee',
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          16,
          1,
          20,
          12,
        ],
      },
    },
    {
      id: 'road_major_casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 16,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['in', 'class', 'trunk', 'primary', 'secondary', 'tertiary'],
      ],
      paint: {
        'line-color': '#eee',
        'line-gap-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          12,
          1,
          20,
          16,
        ],
      },
    },
    {
      id: 'road_major_inner',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 8,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['in', 'class', 'trunk', 'primary', 'secondary', 'tertiary'],
      ],
      paint: {
        'line-color': [
          'step',
          ['zoom'],
          '#eee',
          16,
          '#fff',
        ],
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          12,
          1,
          20,
          16,
        ],
      },
    },
    {
      id: 'road_motorway_casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'motorway'],
      ],
      paint: {
        'line-color': '#eee',
        'line-gap-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          8,
          1,
          20,
          20,
        ],
      },
    },
    {
      id: 'road_motorway_inner',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'motorway'],
      ],
      paint: {
        'line-color': [
          'step',
          ['zoom'],
          '#eee',
          12,
          '#fff',
        ],
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          8,
          1,
          20,
          20,
        ],
      },
    },
    {
      id: 'aeroway_taxiway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 12,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'taxiway'],
      ],
      paint: {
        'line-color': '#eee',
      },
    },
    {
      id: 'aeroway_runway_casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 12,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'runway'],
      ],
      layout: {
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#eee',
        'line-gap-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          8,
          1,
          20,
          20,
        ],
      },
    },
    {
      id: 'aeroway_runway_inner',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 8,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'runway'],
      ],
      layout: {
        'line-cap': 'round',
      },
      paint: {
        'line-color': [
          'step',
          ['zoom'],
          '#eee',
          12,
          '#fff',
        ],
        'line-width': [
          'interpolate',
          ['exponential', 1.5],
          ['zoom'],
          8,
          1,
          20,
          20,
        ],
      },
    },
    {
      id: 'rail',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 4,
      filter: [
        'all',
        ['==', '$type', 'LineString'],
        ['==', 'class', 'rail'],
      ],
      paint: {
        'line-color': '#eee',
        'line-opacity': 0.8,
      },
    },
    {
      id: 'building',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 12,
      paint: {
        'fill-color': '#f0f0f0',
      },
    },
  ],
};
