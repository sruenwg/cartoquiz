/**
 * Aggregates all key-values from given objects,
 * creating an object with all seen keys. The value for each key
 * is a list of all seen values corresponding to that key.
 * @param {Record<PropertyKey, any>[]} objects
 * @returns {Record<PropertyKey, any[]>}
 */
export function collectKeyValues(objects) {
  /** @type {Record<PropertyKey, Set<any>>} */
  const keyValues = objects
    .reduce((acc, object) => {
      for (const key in object) {
        if (acc[key] === undefined) {
          acc[key] = new Set();
        }
        acc[key].add(object[key]);
      }
      return acc;
    }, {});
  return mapValues(keyValues, (set) => Array.from(set));
}

/**
 * Repopulates the given Select element with the given Options.
 * @param {HTMLSelectElement} select
 * @param {HTMLOptionElement[]} options
 * @param {boolean} keepFirst - whether to keep the first option
 * (often an empty option labelled 'Choose an option')
 */
export function repopulateOptions(select, options, keepFirst = true) {
  const removeDownToIndex = keepFirst ? 1 : 0;
  for (let i = select.options.length - 1; i >= removeDownToIndex; i--) {
    select.options.remove(i);
  }
  for (const option of options) {
    select.add(option);
  }
}

/**
 * Sets the value of the Select element to the given value
 * if that value exists as an option.
 * @param {HTMLSelectElement} select
 * @param {string | undefined} value
 */
export function setSelectValue(select, value) {
  if (value === undefined || value === '') {
    select.value = '';
    return;
  }
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value === value) {
      select.value = value;
      return;
    }
  }
}

/**
 * Returns a new object with the same keys as the given object
 * and with values mapped according to the given function.
 * @template InV
 * @template OutV
 * @param {Record<PropertyKey, InV>} obj
 * @param {(value: InV) => OutV} mapper
 * @returns {Record<keyof typeof obj, OutV>}
 */
function mapValues(obj, mapper) {
  const keys = Object.keys(obj);
  return keys.reduce((res, key) => {
    res[key] = mapper(obj[key]);
    return res;
  }, {});
}

/**
 * Returns a new object with the properties corresponding to the given keys
 * omitted.
 * @template {Record<PropertyKey, any>} T
 * @param {T} obj
 * @param {PropertyKey[]} keys
 * @returns {Omit<T, typeof keys[number]>}
 */
export function omitKeys(obj, keys) {
  const res = { ...obj };
  for (const key of keys) {
    delete res[key];
  }
  return res;
}

/**
 * Removes all child nodes from the given element.
 * @param {HTMLElement} element
 */
export function removeAllChildren(element) {
  while (element.hasChildNodes()) {
    element.removeChild(element.lastChild);
  }
}

/**
 * Returns a normalized version of the given string.
 * @param {string} value
 */
export function normalizeString(value) {
  return value.trim().toLowerCase();
}

/**
 * Returns a comparison function for use in Array.sort() where the given
 * callback would be applied to each element to determine its sort position.
 * @template {any} T
 * @param {(element: T) => (string | number)} callback - Function to determine element value.
 */
export function compareWithCallback(callback) {
  return (a, b) => {
    const valueA = callback(a);
    const valueB = callback(b);
    if (valueA < valueB) {
      return -1;
    }
    if (valueA > valueB) {
      return 1;
    }
    return 0;
  };
}
