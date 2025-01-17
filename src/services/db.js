/**
 * @import { FeatureId, InProgressQuizOverview, QuizInfo, StoredData } from '../types.js'
 */

import { getFeatureId } from '../utils/map-utils.js';

export default class DatabaseService {
  /**
   * @type {Promise<IDBDatabase>}
   */
  #db;

  constructor() {
    this.#db = new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open('quiz-state', 1);
      openRequest.onerror = () => reject(openRequest.error);
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onupgradeneeded = (e) => {
        /** @type {IDBDatabase} */
        const db = e.target.result;
        db.createObjectStore('quiz-info');
        db.createObjectStore('features');
        db.createObjectStore('guessed-ids', { autoIncrement: true });
      };
    });
  }

  /**
   * @returns {Promise<StoredData>}
   */
  async getStoredData() {
    const db = await this.#db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['quiz-info', 'features', 'guessed-ids'], 'readonly');
      const getDataSourceRequest = tx.objectStore('quiz-info').get('data-source');
      const getAttributionRequest = tx.objectStore('quiz-info').get('attribution');
      const getMatchPropertyRequest = tx.objectStore('quiz-info').get('match-property');
      const getCollectedPropertyValues = tx.objectStore('quiz-info').get('collected-property-values');
      const getFeaturesRequest = tx.objectStore('features').getAll();
      const getGuessedIdsRequest = tx.objectStore('guessed-ids').getAll();

      tx.onabort = () => reject('getStoredData transaction aborted');
      tx.oncomplete = () => resolve({
        /** @type {QuizInfo} */
        quizInfo: {
          dataSource: getDataSourceRequest.result,
          features: getFeaturesRequest.result,
          attribution: getAttributionRequest.result,
          matchProperty: getMatchPropertyRequest.result,
          collectedPropertyValues: getCollectedPropertyValues.result,
        },
        guessedIds: getGuessedIdsRequest.result,
      });
    });
  }

  /**
   * @returns {Promise<InProgressQuizOverview>}
   */
  async getQuizOverview() {
    const db = await this.#db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['quiz-info', 'features', 'guessed-ids'], 'readonly');
      const getDataSourceRequest = tx.objectStore('quiz-info').get('data-source');
      const getMatchPropertyRequest = tx.objectStore('quiz-info').get('match-property');
      const getFeaturesCountRequest = tx.objectStore('features').count();
      const getGuessedIdsCountRequest = tx.objectStore('guessed-ids').count();
  
      tx.onabort = () => reject('getGuessedIds transaction aborted');
      tx.oncomplete = () => resolve({
        dataSource: getDataSourceRequest.result,
        matchProperty: getMatchPropertyRequest.result,
        numFeatures: getFeaturesCountRequest.result,
        numGuessed: getGuessedIdsCountRequest.result,
      });
    });

  }

  /**
   * @param {QuizInfo} quizInfo
   */
  async setQuizInfo(quizInfo) {
    const db = await this.#db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['quiz-info', 'features', 'guessed-ids'], 'readwrite');
      tx.objectStore('guessed-ids').clear();
      tx.objectStore('features').clear();

      tx.objectStore('quiz-info').put(quizInfo.dataSource, 'data-source');
      tx.objectStore('quiz-info').put(quizInfo.attribution, 'attribution');
      tx.objectStore('quiz-info').put(quizInfo.matchProperty, 'match-property');
      tx.objectStore('quiz-info').put(quizInfo.collectedPropertyValues, 'collected-property-values');

      for (const feature of quizInfo.features) {
        tx.objectStore('features').put(feature, getFeatureId(feature));
      }

      tx.onabort = () => reject('setQuizInfo transaction aborted');
      tx.oncomplete = () => resolve();
    });
  }

  /**
   * @param {FeatureId[]} ids
   */
  async addGuessedIds(ids) {
    const db = await this.#db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('guessed-ids', 'readwrite');
      for (const id of ids) {
        tx.objectStore('guessed-ids').add(id);
      }

      tx.onabort = () => reject('addGuessedIds transaction aborted');
      tx.oncomplete = () => resolve();
    });
  }
}
