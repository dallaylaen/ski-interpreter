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

let nextId = 0;

class EvalBox {
  /**
     * @param { TeletypeBox } box
     * @param {{
     *      height: number?,
     *      engine: SKI?,
     *      onStop: function?,
     *      onStart: function?,
     *      delay: number?,
     *      id: number?
     * }} options
     */
  constructor (box, options) {
    this.id = options.id ?? ++nextId;

    this.height = options.height ?? 5;
    this.options = options;
    this.running = false;
    this.delay = options.delay ?? 0;
    this.count = 0;
    this.onStart = options.onStart ?? (() => {});
    this.onStop = options.onStop ?? (() => {});

    this.parent = parent;
    this.engine = options.engine;
    this.box = box;
    this.box.height = this.height;
    this.head = this.box.head;
    this.foot = this.box.foot;

    this.permalink = append(this.head, 'a', { class: ['con-permalink'] });
    this.permalink.target = '_blank';
    this.permalink.innerHTML = '#' + this.id;
    this.src = append(this.head, 'span', { class: ['con-source'] });
    this.counter = append(this.head, 'span', { class: ['con-number', 'float-right'] });
  }

  setup (src, expr) {
    this.running = false;
    this.count = 0;
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
    this.box.print(this.expr.toString({ terse: true }), { line: this.count });
    return this.start();
  }

  start () {
    if (this.running) return;
    this.running = true;
    this.onStart();
    this.tick();
  }

  tick () {
    if (!this.running) return;
    const next = this.expr.step();

    if (next.steps === 0) {
      // no steps = finished execution, congratulations
      this.box.last.classList.add('success');
      return this.stop();
    }

    this.expr = next.expr;
    this.count += next.steps;
    this.box.print(this.expr.toString({ terse: true }), { line: this.count });
    this.counter.innerHTML = this.count;
    this.expr = next.expr;
    setTimeout(() => this.tick(), this.delay);
  }

  stop (reason) {
    this.running = false;
    if (reason)
      this.box.print(reason, { class: ['error'], line: '' });
    this.onStop();
  }
}
