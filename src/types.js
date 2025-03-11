/**
 * @typedef {number} FeatureId
 * @typedef {GeoJSON.Feature & { id: FeatureId }} Feature
 * @typedef {{ key?: string, value?: any }} Filter
 * @typedef {{ [key: string]: any[] }} PropertyValues
 * @typedef {{ quizInfo: QuizInfo, guessedIds: FeatureId[] } | { quizInfo: undefined, guessedIds: undefined }} StoredData
 * 
 * @typedef {ParsedFileData & { source: string }} LoadedData
 * @typedef {ParsedTopoJsonData | ParsedGeoJsonData} ParsedFileData
 * 
 * @typedef {Object} ParsedTopoJsonData
 * @property {'topojson'} type
 * @property {string} [attribution]
 * @property {string[]} layerNames
 * @property {(layerName: string) => GeoJSON.Feature[] | undefined} getLayerFeatures
 * 
 * @typedef {Object} ParsedGeoJsonData
 * @property {'geojson'} type
 * @property {string} [attribution]
 * @property {() => GeoJSON.Feature[]} getFeatures
 * 
 * @typedef {Object} QuizInfo
 * @property {string} dataSource
 * @property {Feature[]} features
 * @property {string} attribution
 * @property {string} matchProperty
 * @property {PropertyValues} collectedPropertyValues
 * 
 * @typedef {Object} InProgressQuizOverview
 * @property {string} dataSource
 * @property {string} matchProperty
 * @property {number} numFeatures
 * @property {number} numGuessed
 */
