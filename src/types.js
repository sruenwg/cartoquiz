/**
 * @typedef {number} FeatureId
 * @typedef {{ key?: string, value?: any }} Filter
 * @typedef {{ [key: string]: any[] }} PropertyValues
 * @typedef {{ quizInfo: QuizInfo, guessedIds: FeatureId[] } | { quizInfo: undefined, guessedIds: undefined }} StoredData
 * 
 * @typedef {Object} QuizInfo
 * @property {string} dataSource
 * @property {GeoJSON.Feature[]} features
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
