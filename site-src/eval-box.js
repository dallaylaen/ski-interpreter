'use strict';

const { append } = require('./html-util');

class EvalBox {
  /**
   * @desc  Create a visual container that can run SKI code step by step and display the results.
   *
   * @param {{
   *      expr: string | Expr | [string, Expr],
   *      engine: SKI,
   *      generator?: function(e:Expr): IterableIterator<{final: boolean, expr: Expr, steps: number}>,
   *      max?: number,
   *      height?: number,
   *      onStop?: function,
   *      onStart?: function,
   *      onStep?: function,
   *      delay?: number,
   *      id?: number,
   *      parent?: Element,
   * }} options
   */
  constructor (options={}) {
    // logic setup
    // TODO if expr is given, store it (= was parsed eslewhere)
    this.options    = options;
    this.height     = options.height ?? 5;
    this.running    = false;
    this.delay      = options.delay ?? 0;
    this.maxSteps   = options.max ?? Infinity;
    this.onStart    = options.onStart ?? (() => {});
    this.onStop     = options.onStop ?? (() => {});
    this.onStep     = options.onStep ?? (() => {});
    this.engine     = options.engine;
    this.format     = options.format ?? { html: true };
    this.generator  = options.generator ?? (e => e.walk());

    // if given an expr, normalize it
    this.set(options.expr);

    // view setup
    this.view = {};
    this.view.parent  = options.parent;
    this.view.scroll  = options.scroll ?? options.parent; // containing scrollable element, may != parent
    this.view.main    = append(options.parent, 'ol', { class: ['ski-eval-box'] });
  }

  /**
   * @descr   set this.src and this.expr according to arg, which may be:
   *          - string: set this.src to arg, this.expr to this.engine.parse(arg)
   *          - Expr: set this.expr to arg, this.src to arg.format()
   *          - [src: string, expr: Expr]: set both directly
   * @param {string|Expr|[src: string, expr: Expr]} arg
   * @return this
   */
  set(arg) {
    if (typeof arg === 'string') {
      this.src = arg;
      this.expr = this.engine.parse(arg);
    } else if (Array.isArray(arg) && arg.length === 2) {
      this.src = arg[0];
      this.expr = arg[1];
    } else if (!arg) {
      this.expr = null;
      this.src = null;
    } else if (typeof arg === 'object' && typeof arg.format === 'function') {
      // assume it's an Expr
      this.expr = arg;
      this.src = arg.format();
    } else {
      throw new Error('EvalBox.set() expects a string, Expr, or [string, Expr]');
    }
    return this;
  }

  /**
   *
   * @param {string} [src] Set new source code to run
   * @return EvalBox this
   */
  start(src){
    if (this.running)
      this.stop();

    try {
      if (src !== undefined)
        this.set(src);
      this.seq = this.generator(this.expr);
    } catch (e) {
      console.error(e);
      return this.stop(e.message);
    }
    this.view.main.innerHTML = '';
    this.onStart();
    this.running = true;
    this.tick();
    return this;
  }

  stop (reason) {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (reason)
      this.print(reason, { class: ['ski-eval-error'], line: '' });
    this.onStop();
  }

  /**
   * @desc resume execution after stopping, if the sequence is not finished yet
   */
  resume() {
    if (this.running || !this.seq)
      return;
    this.running = true;
    this.onStart();
    this.tick();
  }

  tick () {
    if (!this.running) return;
    const { value, done } = this.seq.next();
    // we're checking both done and value.final because some SKI operations know when they end and some don't

    if (value) {
      this.print(value.expr.format(this.format),{line: value.steps});
    }

    this.onStep(value, done || value.final);

    if (done || value.final) {
      // could've just used next().done but that creates one extra iteration
      // finished execution, congratulations
      if (this.view.last)
        this.view.last.classList.add('ski-eval-success');
      this.seq = null; // allow GC + prevent resuming
      return this.stop();
    }

    if (value.steps >= this.maxSteps)
      return this.stop('Max steps reached: ' + this.maxSteps);
    this.timer = setTimeout(() => this.tick(), this.delay);
  }

  remove() {
    if (this.view.parent) {
      this.view.parent.removeChild(this.view.main);
      this.view.parent = null;
    }
  }

  clear() {
    this.stop();
    this.view.main.innerHTML = '';
  }

  setHeight (height) {
    this.height = height;
  }

  print(text, options = {}) {
    const line = append(this.view.main, 'li', options);
    if (options.line !== 0 && !options.line)
      line.style['list-style'] = 'none';
    else {
      this.view.main.style['padding-left'] = ('' + options.line).length + 2.5 + 'ch';
      line.value = options.line;
    }
    this.view.last = line;

    if (options.raw)
      line.innerHTML = text;
    else {
      append(line, 'span', {
        class: options.class ?? ['ski-eval-line'],
        color: options.color,
        content: (text),
      });

      while (this.view.main.children.length > this.height)
        this.view.main.removeChild(this.view.main.firstChild);
    }

    if (this.view.scroll)
      this.view.scroll.scrollTop = line.offsetTop;

    return line;
  }
}

module.exports = { EvalBox };