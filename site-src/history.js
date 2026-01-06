'use strict';

/**
 *  @class History
 *  @desc  Manages the history of evaluated expressions.
 *  Uses a Store instance to save and retrieve history entries.
 *  Must stay consistent if used by multiple tabs, thus entries are saved separately.
 */

class History {
  /**
   * @desc  Create a History manager.
   * @param options
   * @param {Store} options.store  The Store instance to use for saving history.
   * @param {number} [options.limit]  Maximum number of history entries to keep.
   */
  constructor(options) {
    this.store = options.store;
    this.limit = this.store.load('limit') ?? 100;
    this.head = this.store.load('head') ?? 0;
    this.tail = this.store.load('tail') ?? 0;
  }

  push(entry) {
    // no atomic operations but at least reduce inconsistency window
    this.store.save('head', this.head + 1);
    this.store.save(`entry-${this.head}`, entry);
    this.head += 1;
    if (this.head - this.tail > this.limit) {
      this.store.delete(`entry-${this.tail}`);
      this.tail += 1;
      this.store.save('tail', this.tail);
    }
  }

  list() {
    const out = [];
    for (let i = this.tail; i < this.head; i++) {
      const entry = this.store.load(`entry-${i}`);
      if (entry !== null)
        out.push(entry);
    }
    return out;
  }

  clear() {
    for (let i = this.tail; i < this.head; i++) {
      this.store.delete(`entry-${i}`);
    }
    this.head = 0;
    this.tail = 0;
    this.store.save('head', this.head);
    this.store.save('tail', this.tail);
  }

  setlimit(n) {
    this.limit = n;
    this.store.save('limit', n);
    while (this.head - this.tail > this.limit) {
      this.store.delete(`entry-${this.tail}`);
      this.tail += 1;
      this.store.save('tail', this.tail);
    }
  }
}

module.exports = { History };