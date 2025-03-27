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
    this.count = 0;
    this.maxSteps = options.max ?? Infinity;
    this.onStart = options.onStart ?? (() => {});
    this.onStop = options.onStop ?? (() => {});
    this.step = options.step ?? ((expr) => expr.step());

    this.parent = box.parent;
    this.engine = options.engine;
    this.box = box;
    this.box.height = this.height;
    this.head = this.box.head;
    this.foot = this.box.foot;
  }

  setup (src, expr) {
    this.permalink = append(this.head, 'a', { class: ['con-permalink'] });
    this.permalink.target = '_blank';
    this.permalink.innerHTML = '#' + this.id;
    this.src = append(this.head, 'span', { class: ['con-source'] });
    this.counter = append(this.head, 'span', { class: ['con-number', 'float-right'] });

    this.counter.innerHTML = this.count;
    this.src.innerHTML = sanitize(src);
    try {
      this.expr = expr ?? this.engine.parse(src);
    } catch (e) {
      this.box.print(e.message, { class: ['error'] });
      return this.stop();
    }
    this.permalink.href = permalink(this.engine, src);
    this.src.innerHTML = sanitize(src);
    return this.start();
  }

  start (expr) {
    if (this.running) return;
    if (expr)
      this.expr = expr;
    this.running = true;
    this.limit = this.maxSteps + this.count;
    this.box.print(this.expr.toString({ terse: true }), { line: this.count });
    this.onStart();
    this.tick();
  }

  tick () {
    if (!this.running) return;
    const next = this.step(this.expr);

    if (!next.changed) {
      // finished execution, congratulations
      if (this.box.last)
        this.box.last.classList.add('success');
      return this.stop();
    }

    this.expr = next.expr;
    this.count += next.steps;
    this.box.print(this.expr.toString({ terse: true }), { line: this.count });
    if(this.counter)
      this.counter.innerHTML = '' + this.count;
    this.expr = next.expr;
    if (this.count >= this.limit)
      return this.stop('Max steps reached: '+ this.limit);
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
