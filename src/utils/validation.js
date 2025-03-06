import Ajv from 'ajv';

/**
 * @import { ValidateFunction } from 'ajv'
 */

const GEOJSON_SCHEMA_PATH = 'https://geojson.org/schema/GeoJSON.json';
const TOPOJSON_SCHEMA_PATH = 'src/schema/topojson/topology.json';

const ajv = new Ajv({
  loadSchema,
  allowUnionTypes: true,
});

/**
 * Method to specify how Ajv will retrieve missing refs in schema
 * @param {string} uri
 * @returns {Promise<any>}
 */
async function loadSchema(uri) {
  const response = await fetch(uri);
  return response.json();
}

/** @type {Promise<ValidateFunction<GeoJSON.GeoJSON>>} */
export const validateGeoJson = ajv.compileAsync({ '$ref': GEOJSON_SCHEMA_PATH });
/** @type {Promise<ValidateFunction<TopoJSON.Topology>>} */
export const validateTopoJson = ajv.compileAsync({ '$ref': TOPOJSON_SCHEMA_PATH });
