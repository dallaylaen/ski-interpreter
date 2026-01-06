
'use strict';

const { append } = require('./html-util');

class EvalBox {
  /**
   * @desc  Create a visual container that can run SKI code step by step and display the results.
   *
   * @param {{
   *      src: string,
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
    this.options    = options;
    this.height     = options.height ?? 5;
    this.running    = false;
    this.delay      = options.delay ?? 0;
    this.maxSteps   = options.max ?? Infinity;
    this.onStart    = options.onStart ?? (() => {});
    this.onStop     = options.onStop ?? (() => {});
    this.onStep     = options.onStep ?? (() => {});
    this.engine     = options.engine;
    this.src        = options.src;
    this.format     = options.format ?? { html: true };
    this.generator  = options.generator ?? (e => e.walk());

    // view setup
    this.view = {};
    this.view.parent  = options.parent;
    this.view.scroll  = options.scroll ?? options.parent; // containing scrollable element, may != parent
    this.view.main    = append(options.parent, 'div', { class: ['eval-box'] });
  }

  /**
   *
   * @param {string} [src] Set new source code to run
   * @return EvalBox this
   */
  start(src){
    if (this.running)
      this.stop();
    if (src !== undefined)
      this.src = src;
    try {
      this.expr = typeof src === 'string'
        ? this.engine.parse(src)
        : src;
      this.seq = this.generator(this.expr);
    } catch (e) {
      return this.stop(e.message);
    }
    this.onStart();
    this.running = true;
    this.tick();
    return this;
  }

  stop (reason) {
    this.running = false;
    if (reason)
      this.print(reason, { class: ['error'], line: '' });
    this.onStop();
  }

  // TODO pause() / resume()

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
        this.view.last.classList.add('success');
      return this.stop();
    }

    if (value.steps >= this.maxSteps)
      return this.stop('Max steps reached: ' + this.maxSteps);
    setTimeout(() => this.tick(), this.delay);
  }

  remove() {
    if (this.view.parent) {
      this.view.parent.removeChild(this.view.main);
      this.view.parent = null;
    }
  }

  setHeight (height) {
    this.height = height;
  }

  print(text, options = {}) {
    const line = append(this.view.main, 'div', options);
    this.view.last = line;

    if (options.raw)
      line.innerHTML = text;
    else {
      append(line, 'span', {class: ['line-number'], content: options.line});
      append(line, 'span', {
        class: options.class ?? ['line-text'],
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