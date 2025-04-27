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

let nextId = 0;

class EvalBox {
  /**
   * @param { TeletypeBox|Element } box
   * @param {{
   *      height: number?,
   *      engine: SKI?,
   *      onStop: function?,
   *      onStart: function?,
   *      step: function?,
   *      delay: number?,
   *      id: number?
   * }} options
   */
  constructor (box, options={}) {
    if (box instanceof Element)
      box = new TeletypeBox(box, options);

    this.id = options.id ?? ++nextId;

    this.height = options.height ?? 5;
    this.options = options;
    this.running = false;
    this.delay = options.delay ?? 0;
    this.maxSteps = options.max ?? Infinity;
    this.onStart = options.onStart ?? (() => {});
    this.onStop = options.onStop ?? (() => {});

    this.parent = box.parent;
    this.engine = options.engine;
    this.box = box;
    this.box.height = this.height;
    this.head = this.box.head;
    this.foot = this.box.foot;
  }

  /**
   * @desc Takes a string and a iterator containing expr: Expr, steps: number, and final: boolean
   * @param {string} src
   * @param {function(e:Expr): IterableIterator<{final: boolean, expr: Expr, steps: number}>} [generator]
   */
  setup (src, generator = (e=>e.walk())) {
    // scr is required because we need to start with the actual user input, not with the parsed expr

    // TODO demolish content beforehand
    this.permalink = append(this.head, 'a', { class: ['con-permalink'] });
    this.permalink.target = '_blank';
    this.permalink.innerHTML = '#' + this.id;
    this.src = append(this.head, 'span', { class: ['con-source'] });
    this.counter = append(this.head, 'span', { class: ['con-number', 'float-right'] });

    this.counter.innerHTML = '-';
    this.src.innerHTML = sanitize(src);
    try {
      this.expr = this.engine.parse(src); // this is used for alias setup
      this.seq = generator(this.expr);
    } catch (e) {
      return this.stop(e.message);
    }
    this.permalink.href = permalink(this.engine, src);
    this.src.innerHTML = sanitize(src);
    return this.start();
  }

  start () {
    // separated from setup() to avoid restarting a stopped evaluation
    if (this.running) return;
    this.running = true;
    this.onStart();
    this.tick();
  }

  tick () {
    if (!this.running) return;
    const { value } = this.seq.next();

    if (!value)
      return this.stop('unexpected end of sequence');

    this.box.print(value.expr.toString({ terse: true }), { line: value.steps });

    if (value.final) {
      // could've used next().done but that creates one extra iteration
      // finished execution, congratulations
      if (this.box.last)
        this.box.last.classList.add('success');
      return this.stop();
    }

    if(this.counter)
      this.counter.innerHTML = '' + value.steps;
    if (value.steps >= this.maxSteps)
      return this.stop('Max steps reached: '+ this.maxSteps);
    setTimeout(() => this.tick(), this.delay);
  }

  stop (reason) {
    this.running = false;
    if (reason)
      this.box.print(reason, { class: ['error'], line: '' });
    this.onStop();
  }

  remove() {
    this.box.remove();
  }

  setHeight (height) {
    this.height = height;
    this.box.height = height;
  }
}
