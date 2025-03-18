/**
 * @type {Gdal}
 */
const gdal = await createGdal();

async function createGdal() {
  const gdalJs = await fetch('https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package/gdal3.js');
  const gdalJsUrl = URL.createObjectURL(await gdalJs.blob());
  const paths = {
    js: gdalJsUrl,
    wasm: 'https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package/gdal3WebAssembly.wasm',
    data: 'https://cdn.jsdelivr.net/npm/gdal3.js@2.8.1/dist/package/gdal3WebAssembly.data',
  };
  await import(gdalJsUrl);
  return initGdalJs({ paths, useWorker: true });
}

/**
 * Opens and returns the first Dataset found in the given File or FileList.
 * @param {File | FileList} files
 */
export async function openFirstDataset(files) {
  const datasetList = await gdal.open(files);
  if (datasetList.datasets.length === 0) {
    throw new Error('Failed to open dataset');
  }
  const [firstDataset, ...datasetsToClose] = datasetList.datasets;
  datasetsToClose.forEach((dataset) => close(dataset));
  return firstDataset;
}

/**
 * Closes the opened Dataset.
 * @param {Dataset} dataset
 */
export async function close(dataset) {
  await gdal.close(dataset);
}

/**
 * Converts the given layer of the given vector dataset to GeoJSON.
 * @param {Dataset} vectorDataset - A vector dataset
 * @param {Layer} layer - The dataset layer to convert to GeoJSON
 * @returns {Promise<GeoJSON.GeoJSON>}
 */
export async function toGeoJson(vectorDataset, layer) {
  const additionalOptions = [];
  if (!hasProjectionInfo(layer)) {
    additionalOptions.push('-s_srs', 'EPSG:4326');
  }
  const filePath = await gdal.ogr2ogr(vectorDataset, [
    '-of', 'GeoJSON',
    '-t_srs', 'EPSG:4326',
    '-lco', 'rfc7946=yes',
    '-lco', 'id_generate=yes',
    ...additionalOptions,
    layer.name,
  ]);
  const fileBytes = await gdal.getFileBytes(filePath);
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(fileBytes);
  return JSON.parse(jsonString);
}

/**
 * @param {Layer} layer
 */
function hasProjectionInfo(layer) {
  return !!layer.geometryFields?.[0]?.coordinateSystem;
}
