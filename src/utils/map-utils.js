import maplibregl from 'maplibre-gl';
import polylabel from 'polylabel';

const MIN_LNG = -180;
const MAX_LNG = 180;
const MIN_LAT = -90;
const MAX_LAT = 90;
const POLYLABEL_PRECISION = 0.000001;

/**
 * Returns an array of all features contained in the given GeoJSON.
 * @param {GeoJSON.GeoJSON} geoJson
 * @returns {GeoJSON.Feature[]}
 */
export function collectFeatures(geoJson) {
  if (geoJson.type === 'Feature') {
    return [geoJson];
  }
  if (geoJson.type === 'FeatureCollection') {
    return geoJson.features;
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
