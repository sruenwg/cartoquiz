/**
 * @typedef {(...args: any[]) => void} SubscriptionCallback
 */

export default class PubSub {
  /**
   * All callbacks currently subscribed to this object, indexed by eventName.
   * @type {{ [eventName: string]: SubscriptionCallback[] }}
   */
  #subscriptions = {};

  /**
   * Publishes the event marked by eventName by calling (and passing the given
   * data to) all callbacks currently registered to it.
   * @param {string} eventName
   * @param {any} data
   */
  publish(eventName, data) {
    if (!Array.isArray(this.#subscriptions[eventName])) {
      return;
    }
    for (const callback of this.#subscriptions[eventName]) {
      callback(data);
    }
  }

  /**
   * Registers the given callback to the event.
   * @param {string} eventName
   * @param {SubscriptionCallback} callback
   */
  subscribe(eventName, callback) {
    if (!Array.isArray(this.#subscriptions[eventName])) {
      this.#subscriptions[eventName] = [];
    }
    this.#subscriptions[eventName].push(callback);
    return callback;
  }

  /**
   * Unregisters the given callback from the event.
   * @param {string} eventName
   * @param {SubscriptionCallback} callback
   */
  unsubscribe(eventName, callback) {
    if (!Array.isArray(this.#subscriptions[eventName])) {
      return;
    }
    this.#subscriptions[eventName] = this.#subscriptions[eventName]
      .filter((subscription) => subscription !== callback);
  }

  /**
   * Clears all current subscriptions on this object.
   */
  clearSubscriptions() {
    this.#subscriptions = {};
  }
}
