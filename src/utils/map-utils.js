import maplibregl from 'maplibre-gl';
import polylabel from 'polylabel';
import * as topojson from 'topojson-client';
import { validateGeoJson, validateTopoJson } from './validation.js';

/**
 * @import { Feature } from '../types.js'
 */

const MIN_LNG = -180;
const MAX_LNG = 180;
const MIN_LAT = -90;
const MAX_LAT = 90;
const POLYLABEL_PRECISION = 0.000001;

/**
 * Sets the ID on each given feature object.
 * @param {GeoJSON.Feature[]} features
 * @returns {Feature[]}
 */
export function setFeatureIds(features) {
  for (let i = 0; i < features.length; i += 1) {
    features[i].id = i;
  }
  return features;
}

/**
 * Parses GeoJSON features and data attribution from given JSON string.
 * @param {string} textData
 * @returns {Promise<{ features: GeoJSON.Feature[], attribution?: string }>}
 */
export async function parseFeaturesAndAttribution(textData) {
  /** @type {unknown} */
  const data = JSON.parse(textData);
  if (typeof data !== 'object' || data === null) {
    throw new Error('Failed to parse features from given data');
  }
  const attribution = data.attribution;
  if ((await validateTopoJson)(data)) {
    const topologyObjectKeys = Object.keys(data.objects);
    const features = topologyObjectKeys
      .map((objectKey) => topojson.feature(data, objectKey))
      .flatMap(collectFeatures);
    return {
      features,
      ...(typeof attribution === 'string' ? { attribution } : {}),
    };
  }
  if ((await validateGeoJson)(data)) {
    if (data.type === 'FeatureCollection') {
      const features = collectFeatures(data);
      return {
        features,
        ...(typeof attribution === 'string' ? { attribution } : {}),
      };
    }
    throw new Error('GeoJSON must be a FeatureCollection');
  }
  throw new Error('Failed to parse features from given data');
}

/**
 * Returns all features contained in the given GeoJSON object.
 * @param {GeoJSON.Feature | GeoJSON.FeatureCollection} geoJsonObject
 * @returns {GeoJSON.Feature[]}
 */
function collectFeatures(geoJsonObject) {
  if (geoJsonObject.type === 'Feature') {
    return [geoJsonObject];
  }
  if (geoJsonObject.type === 'FeatureCollection') {
    return geoJsonObject.features;
  }
  return [];
}

/**
 * Converts the given `Feature` array into a `FeatureCollection`.
 * @param {GeoJSON.Feature[]} features
 * @returns {GeoJSON.FeatureCollection}
 */
export function convertFeaturesToFeatureCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Calculates the bounding coordinates of the given GeoJSON object.
 * @param {GeoJSON.GeoJSON} geoJson
 * @returns {[[number, number], [number, number]]}
 */
export function calcGeoJsonBounds(geoJson) {
  const positions = collectGeoJsonPositions(geoJson);
  if (positions.length === 0) {
    return [
      [MIN_LNG, MIN_LAT],
      [MAX_LNG, MAX_LAT],
    ];
  }
  const lngLatBounds = positions.reduce((bounds, position) => {
    return bounds.extend([position[0], position[1]])
  }, new maplibregl.LngLatBounds());
  const bounds = lngLatBounds.toArray();
  return [bounds[0], bounds[1]];
}

/**
 * @param {GeoJSON.GeoJSON} geoJson
 * @returns {GeoJSON.Position[]}
 */
function collectGeoJsonPositions(geoJson) {
  if (geoJson.bbox !== undefined) {
    if (geoJson.bbox.length === 4) {
      return [geoJson.bbox.slice(0, 2), geoJson.bbox.slice(2, 4)];
    } else { // geoJson.bbox.length === 6
      return [geoJson.bbox.slice(0, 3), geoJson.bbox.slice(3, 6)];
    }
  }
  switch (geoJson.type) {
    case 'Feature':
      return geoJson.geometry === null
        ? []
        : collectGeoJsonPositions(geoJson.geometry);
    case 'FeatureCollection':
      return geoJson.features.flatMap(collectGeoJsonPositions);
    case 'GeometryCollection':
      return geoJson.geometries.flatMap(collectGeoJsonPositions);
    case 'Point':
      return [geoJson.coordinates];
    case 'MultiPoint':
    case 'LineString':
      return geoJson.coordinates;
    case 'MultiLineString':
    case 'Polygon':
      return geoJson.coordinates.flat();
    case 'MultiPolygon':
      return geoJson.coordinates.flat(2);
    default:
      return [];
  }
}

/**
 * Calculates a visual centrepoint for the given geometry.
 * @param {GeoJSON.Geometry} geometry
 * @returns {GeoJSON.Position | undefined}
 */
export function calcGeometryCentre(geometry) {
  switch (geometry.type) {
    case 'Polygon':
      return calcPolygonCentre(geometry);
    case 'MultiPolygon':
      return calcMultiPolygonCentre(geometry);
    default:
      return undefined;
  }
}

/**
 * @param {GeoJSON.Polygon} polygon
 * @returns {GeoJSON.Position}
 */
function calcPolygonCentre(polygon) {
  return polylabel(polygon.coordinates, POLYLABEL_PRECISION);
}

/**
 * @param {GeoJSON.MultiPolygon} multiPolygon
 * @returns {GeoJSON.Position | undefined}
 */
function calcMultiPolygonCentre(multiPolygon) {
  /** @type {{ coordinates: GeoJSON.Position | undefined, score: number }} */
  const initPolygonCentre = { coordinates: undefined, score: Number.NEGATIVE_INFINITY };
  const bestPolygonCentre = multiPolygon.coordinates.reduce((acc, polygonCoordinates) => {
    const polygonCentre = polylabel(polygonCoordinates, POLYLABEL_PRECISION);
    const score = polygonCentre.distance;
    return (score > acc.score)
      ? { coordinates: polygonCentre, score }
      : acc;
  }, initPolygonCentre);
  return bestPolygonCentre.coordinates;
}
