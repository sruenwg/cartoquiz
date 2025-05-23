/**
 * @typedef {number} FeatureId
 * @typedef {GeoJSON.Feature & { id: FeatureId }} Feature
 * @typedef {{ key?: string, value?: any }} Filter
 * @typedef {{ [key: string]: any[] }} PropertyValues
 * @typedef {{ quizInfo: QuizInfo, guessedIds: FeatureId[] } | { quizInfo: undefined, guessedIds: undefined }} StoredData
 * 
 * @typedef {Object} DatasetWithAttribution
 * @property {Dataset} dataset
 * @property {string} [attribution]
 * 
 * @typedef {Object} QuizInfo
 * @property {string} dataSource
 * @property {Feature[]} features
 * @property {string} [attribution]
 * @property {string} matchProperty
 * @property {PropertyValues} collectedPropertyValues
 * 
 * @typedef {Object} InProgressQuizOverview
 * @property {string} dataSource
 * @property {string} matchProperty
 * @property {number} numFeatures
 * @property {number} numGuessed
 */

/**
 * @template {any} T
 * @typedef {{ promise: Promise<T>, abort: () => void }} PromiseWithAbort<T>
 */
