/*
 *  Common functions related to SKI and not to just HTML.
 */

function permalink (engine, sample) {
  const terms = engine.getTerms();
  const saved = Object.keys(terms)
    .filter(name => !(terms[name] instanceof SKI.classes.Native))
    .map(name => name + ':' + terms[name].expand()).join(',');
  return '?code=' + encode(sample) + '&terms=' + encode(saved);
}

/**
 *
 * @param {Expr} term
 * @return {string}
 */
function showTerm(term) {
  // TODO terser name
  return (term.note ?? term.impl?.toString({terse:true}) ?? term.toString({terse: true}))
      .replaceAll(/\s*->\s*/g, '&rarr;');
}

let displayOptions = {
  html: true,
};

function setDisplay(options) {
  for (const key of Object.keys(options)) {
    if (options[key] === undefined)
      delete displayOptions[key];
    else
      displayOptions[key] = options[key];
  }
}

let nextId = 0;

class EvalBox {
  /**
   * @param { Element } parent
   * @param {{
   *      height: number?,
   *      engine: SKI?,
   *      onStop: function?,
   *      onStart: function?,
   *      step: function?,
   *      delay: number?,
   *      id: number?,
   *      headless: boolean?,
   * }} [options]
   */
  constructor (parent, options={}) {
    // properties setup
    this.options = options;
    this.id = options.id ?? nextId++
    this.height = options.height ?? 5;
    this.running = false;
    this.delay = options.delay ?? 0;
    this.maxSteps = options.max ?? Infinity;
    this.onStart = options.onStart ?? (() => {});
    this.onStop = options.onStop ?? (() => {});

    this.engine = options.engine ?? new SKI();

    // view setup
    this.parent = parent;
    this.view = {};
    this.view.content = append(parent, 'div', { class: ['console'] });
    this.view.head = append(this.view.content, 'div', { class: ['con-header'] });
    this.view.main = append(this.view.content, 'div', { class: ['eval-box'] });
    this.view.foot = append(this.view.content, 'div', { class: ['con-footer'] });
  }

  /**
   * @desc Takes a string and a iterator containing expr: Expr, steps: number, and final: boolean
   * @param {string} src
   * @param {function(e:Expr): IterableIterator<{final: boolean, expr: Expr, steps: number}>} [generator]
   */
  run (src, generator = e => e.walk()) {
    // scr is required because we need to start with the actual user input, not with the parsed expr

    if (!this.options.headless) {
      // TODO demolish content beforehand
      this.view.permalink = append(this.view.head, 'a', {class: ['con-permalink']});
      this.view.permalink.target = '_blank';
      this.view.permalink.innerHTML = '#' + this.id;
      this.view.src = append(this.view.head, 'span', {class: ['con-source']});
      this.view.src.innerHTML = sanitize(src);
      this.view.counter = append(this.view.head, 'span', {class: ['con-number', 'float-right']});
      this.view.counter.innerHTML = '-';
    }

    try {
      this.expr = typeof src === 'string'
        ? this.engine.parse(src)
        : src;
      this.seq = generator(this.expr);
    } catch (e) {
      return this.stop(e.message);
    }

    if (!this.options.headless) {
      this.view.permalink.href = permalink(this.engine, src);
      this.view.src.innerHTML = sanitize(src);
    }

    return this.restart();
  }

  restart () {
    // separated from setup() to avoid restarting a stopped evaluation
    if (this.running) return;
    this.running = true;
    this.onStart();
    this.tick();
  }

  tick () {
    if (!this.running) return;
    const { value, done } = this.seq.next();

    if (value) {
      this.print(value.expr.format(displayOptions),{line: value.steps});

      if (this.view.counter)
        this.view.counter.innerHTML = '' + value.steps;
    }

    if (done || value.final) {
      // could've just used next().done but that creates one extra iteration
      // finished execution, congratulations
      if (this.view.last)
        this.view.last.classList.add('success');
      return this.stop();
    }

    if (value.steps >= this.maxSteps)
      return this.stop('Max steps reached: '+ this.maxSteps);
    setTimeout(() => this.tick(), this.delay);
  }

  stop (reason) {
    this.running = false;
    if (reason)
      this.print(reason, { class: ['error'], line: '' });
    this.onStop();
  }

  remove() {
    if (this.parent) {
      this.parent.removeChild(this.view.content);
      this.parent = null;
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

    this.parent.scrollTop = line.offsetTop;

    return line;
  }
}
