'use strict';

/**
 *  @desc   A stupid state machine that can work in conjunction with persistent storage
 *          to maintain a consistent state of controls and switches.
 *
 */
class SMCtl {
  // State machine toggle for menus and such
  constructor (options = {}) {
    this.onchange = [];
    this.check = options.check ?? (any => true);
    if (options.onchange)
      this.onchange.push(options.onchange);
    if (options.storage) {
      const [engine, key] = options.storage;
      this.save = () => engine.save(key, this.value);
      this.load = () => this.set(engine.load(key) ?? options.default, true);
    } else {
      this.save = () => {};
      this.load = () => { this.set( options.default ); };
    }
    this.load(); // set without saving
  }

  set (value, nosave = false) {
    if (!this.check(value))
      throw new Error('SMCtl: invalid value ' + value);
    for (const cb of this.onchange)
      cb(value, this.value);
    this.value = value;
    if (!nosave)
      this.save(value);
  }

  get () {
    return this.value;
  }

  addAction (cb) {
    this.onchange.push(cb);
  }
}

module.exports = { SMCtl };
