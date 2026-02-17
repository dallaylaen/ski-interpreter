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
    if (!options.store)
      throw new Error('History requires a Store instance');
    this.store = options.store;
    if (options.limit)
      this.setlimit(options.limit);
    this.current = undefined;
  }

  push(entry) {
    if (entry === this.current)
      return; // skip dupes
    this.current = entry;

    // no atomic operations but at least reduce inconsistency window
    let head = this.store.load('head') ?? 0;
    this.store.save('head', ++head);
    this.store.save(`entry-${head - 1}`, entry);

    this.trim();
  }

  list(options) {
    const out = [];
    const head = this.store.load('head') ?? 0;
    const tail = this.store.load('tail') ?? 0;
    for (let i = tail; i < head; i++) {
      const entry = this.store.load(`entry-${i}`);
      if (entry !== null && (!out.length || entry !== out[out.length - 1]))
        out.push(entry);
    }
    if (options.last !== undefined && options.last !== out[out.length - 1])
      out.push(options.last);
    return out;
  }

  clear() {
    const head = this.store.load('head') ?? 0;
    const tail = this.store.load('tail') ?? 0;
    for (let i = tail; i < head; i++) {
      this.store.delete(`entry-${i}`);
    }
    this.store.save('head', 0);
    this.store.save('tail', 0);
  }

  setlimit(n) {
    if (typeof n !== 'number' || n <= 0)
      throw new Error('History limit must be a positive number');
    this.store.save('limit', n);

    // trim excess entries if new limit is smaller than current size
    this.trim(n);
  }

  trim(limit) {
    if (limit === undefined)
      limit = this.store.load('limit') ?? 100;
    const head = this.store.load('head') ?? 0;
    let tail = this.store.load('tail') ?? 0;
    while (head - tail > limit) {
      this.store.delete(`entry-${tail}`);
      this.store.save('tail', ++tail);
    }
  }
}

module.exports = { History };