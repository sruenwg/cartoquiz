import PubSub from '../utils/pub-sub.js';
import { normalizeString, omitKeys } from '../utils/misc.js';
import { getFeatureId, setFeatureId } from '../utils/map-utils.js';

/**
 * @import { FeatureId, Filter, PropertyValues } from '../types.js'
 */

export default class QuizState extends PubSub {
  /**
   * The feature properties key on which the user is quizzed.
   * For example, `matchProperty === 'name'` would require the user to guess
   * 'London' for the feature `{ ..., properties: { ..., name: 'London' } }`.
   * @type {string}
   */
  #matchProperty;

  /**
   * The attribution text for the loaded data.
   * @type {string}
   */
  #dataAttribution;

  /**
   * The loaded features, indexed by feature ID.
   * @type {Map<FeatureId, GeoJSON.Feature>}
   */
  #features = new Map();

  /**
   * An object containing all values in the dataset for each property key.
   * @type {PropertyValues}
   */
  #collectedPropertyValues = {};

  /**
   * The filters to apply on user guesses, the guessed list, and the map.
   * @type {Filter[]}
   */
  #filters = [];

  /**
   * The IDs of items guessed so far.
   * @type {FeatureId[]}
   */
  #guessedIds = [];

  /**
   * The IDs of items guessed in the most recent guess.
   * @type {FeatureId[]}
   */
  #lastGuessedIds = [];

  /**
   * The ID of the currently highlighted item.
   * @type {FeatureId}
   */
  #highlightedId;

  get matchProperty() {
    return this.#matchProperty;
  }

  get dataAttribution() {
    return this.#dataAttribution;
  }

  get features() {
    return [...this.#features.values()];
  }

  get filteredFeatures() {
    return this.features.filter((feature) => this.#matchesFilters(feature));
  }

  get guessedFeatures() {
    return this.#guessedIds.map((id) => this.getFeatureById(id));
  }

  get filteredGuessedFeatures() {
    return this.guessedFeatures.filter((feature) => this.#matchesFilters(feature));
  }

  get highlightedFeatureId() {
    return this.#highlightedId;
  }

  /**
   * @param {FeatureId | undefined} featureId
   */
  set highlightedFeatureId(featureId) {
    if (featureId === this.#highlightedId) {
      return;
    }
    const previousHighlightedId = this.#highlightedId;
    this.#highlightedId = featureId;
    this.publish(
      'highlightedFeatureUpdate',
      { previousHighlightedId, currentHighlightedId: this.#highlightedId },
    );
  }

  get propertyValuesForFilter() {
    return omitKeys(this.#collectedPropertyValues, [this.#matchProperty]);
  }

  get filters() {
    return this.#filters;
  }

  set filters(value) {
    const oldFilters = this.#filters;
    this.#filters = value.filter((filter, index, filters) => (
      filter
      && filter.key !== undefined
      && filter.value !== undefined
      && index === filters.findIndex((f) => f.key === filter.key && f.value === filter.value)
    ));
    const filtersChanged = !(
      oldFilters.length === this.#filters.length
      && oldFilters.every((oldFilter) => {
        return this.#filters.some((f) => f.key === oldFilter.key && f.value === oldFilter.value);
      })
    );
    if (filtersChanged) {
      this.publish('filtersUpdate', this.#filters);
    }
  }

  /**
   * @param {FeatureId} featureId
   */
  getFeatureById(featureId) {
    return this.#features.get(featureId);
  }

  /**
   * @param {GeoJSON.Feature} feature
   */
  getFeatureMatchPropertyValue(feature) {
    return feature.properties[this.#matchProperty];
  }

  /**
   * @param {GeoJSON.Feature[]} features
   * @param {string} attribution
   * @param {string} matchProperty
   * @param {PropertyValues} collectedPropertyValues
   */
  startQuiz(features, attribution, matchProperty, collectedPropertyValues) {
    this.#features = features.reduce((acc, feature, i) => {
      feature = setFeatureId(feature, i);
      acc.set(i, feature);
      return acc;
    }, new Map());
    this.#dataAttribution = attribution;
    this.#matchProperty = matchProperty;
    this.#collectedPropertyValues = collectedPropertyValues;
    this.#filters = [];
    this.#guessedIds = [];
    this.#lastGuessedIds = [];
    this.#highlightedId = undefined;
    this.publish('quizStart');
  }

  /**
   * @param {string} rawGuess
   */
  makeGuess(rawGuess) {
    const guess = normalizeString(rawGuess);
    const { newMatches } = this.#getMatches(guess);
    if (newMatches.length > 0) {
      const prevMatches = this.#lastGuessedIds.map((id) => this.#features.get(id));
      const newlyGuessedIds = newMatches.map((feat) => getFeatureId(feat));
      this.#lastGuessedIds = newlyGuessedIds;
      this.#guessedIds.push(...newlyGuessedIds);
      this.publish('matchesUpdate', { prevMatches, newMatches });
    }
  }

  /**
   * @param {string} guess
   * @returns {{ existingMatches: GeoJSON.Feature[], newMatches: GeoJSON.Feature[] }}
   */
  #getMatches(guess) {
    const matches = this.filteredFeatures
      .filter((feat) => this.#isMatch(guess, feat));
    return matches.reduce((acc, feat) => {
      (this.#isGuessed(feat) ? acc.existingMatches : acc.newMatches).push(feat);
      return acc;
    }, { existingMatches: [], newMatches: [] });
  }

  /**
   * @param {string} guess
   * @param {GeoJSON.Feature} feature
   */
  #isMatch(guess, feature) {
    const matchValue = this.getFeatureMatchPropertyValue(feature);
    if (typeof matchValue === 'string') {
      return guess === normalizeString(matchValue);
    }
    if (Array.isArray(matchValue)) {
      return matchValue.some((value) => guess === normalizeString(value));
    }
    return false;
  }

  /**
   * @param {GeoJSON.Feature} feature
   */
  #matchesFilters(feature) {
    return this.filters.every(({ key, value }) => {
      return feature.properties[key] == value;
    });
  }

  /**
   * @param {GeoJSON.Feature} feature
   */
  #isGuessed(feature) {
    return this.#guessedIds.includes(getFeatureId(feature));
  }
}
