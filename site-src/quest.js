'use strict';

const { SKI } = require('../index');
const { Store } = require('./store');
const { EvalBox } = require('./eval-box');
const { append } = require('./html-util')

class QuestPage {
  /**
   * @desc  A collection of combinatory logic quests organized into chapters
   *        and attached to specific elements for display.
   *
   *        Quest progress is saved in the localStorage under a given prefix.
   *
   *        The engine is also saved and loaded from the store,
   *        so that unlocked terms persist across sessions and can be used in later quests.
   *
   * @param {{
   *   index: string, // URL to fetch quest list from
   *   baseUrl?: string, // root URL to fetch quest data from, default 'data/quests/'
   *   storePrefix?: string, // prefix for localStorage keys, required unless 'store' object itself is provided
   *   // page elements to attach to:
   *   indexBox: HTMLElement, // element to attach chapter list to
   *   contentBox: HTMLElement, // element to attach chapter content to
   *   inventoryBox: HTMLElement, // element to attach inventory to
   *   // extra stuff
   *   linkedTo?: string, // id of element to scroll into view after loading
   *   store: Store, // TODO move out into callbacks, also make async
   *   engine?: SKI, // defautl = new SKI()
   *   onLoad?: function, // callback for when quests are loaded, gets list of QuestChapter objects as argument
   *   onSolved?: function, // callback for when a quest is solved
   *   onFailed?: function, // callback for when a quest is attempted but not solved
   *   onUnlock?: function, // callback for when a quest is solved and unlocks something in the engine
   *   chapterList?: QuestChapter[], // optional write-only list for observability only
   * }} options
   */
  constructor (options) {
    this.view = {};
    this.root = options.baseUrl ?? '.';

    if (!options.store && !options.storePrefix)
      throw new Error('No storePrefix provided');
    this.store = options.store ?? new Store(options.storePrefix);
    this.engine = options.engine ?? new SKI(this.store.load('engine') ?? { annotate: true, allow: 'SKI' });

    if (options.inventoryBox) {
      this.view.inventory = options.inventoryBox;
      this.showKnown();
    }
    this.view.content = options.contentBox;
    this.view.index = options.indexBox;

    this._onSolved = options.onSolved;
    this._onFailed = options.onFailed;
    this._onUnlock = options.onUnlock;

    this.chapters = [];
  }

  load (index, linkedTo, onLoad) {
    // TODO convert link into this.root

    fetch(this.mkLink(index))
      .then(resp => resp.json())
      .then(list => {
        let chapterId = 0;
        this.chapters = [];
        const joint = [];
        for (const item of list) {
          const chapter = new QuestChapter({
            number:   ++chapterId,
            link:     this.mkLink(item),
            engine:   this.engine,
            store:    this.store,
            onUnlock: x => this.onUnlock(x),
            onSolved: x => this._onSolved(x),
            onFailed: x => this._onFailed(x),
          });
          this.chapters.push(chapter);
          chapter.attach(this.view.content, { placeholder: 'loading chapter' + chapter.number + '...' });
          chapter.addLink(this.view.index);
          joint.push(chapter.fetch().then(chapter => {
            chapter.draw();
          }));
        }
        Promise.all(joint).then(() => {
          if (linkedTo) {
            const target = document.getElementById(linkedTo);
            if (target)
              target.scrollIntoView();
          }
          if (onLoad)
            onLoad(this);
        });
      });
  }

  mkLink (str) {
    return (str.match(/^\w+:\/\//) || str.match(/^[/.]/)) ? str : this.root + '/' + str;
  }

  onUnlock (term) {
    this.engine.maybeAdd(term.name, term.impl);
    if (this.store)
      this.store.save('engine', this.engine);
    this.showKnown();
    if (this._onUnlock)
      this._onUnlock(term);
  }

  showKnown () {
    // TODO ul, li
    if (!this.view.inventory)
      return;
    const elem = this.view.inventory;
    elem.innerHTML = '';
    const terms = this.engine.getTerms();
    for (const entry of Object.keys(terms).sort().map(x => [x, terms[x]]))
      append(elem, 'div', { content: `<dt>${entry[0]}</dt><dd>= ${showTerm(entry[1])}</dd>` });
  }

  demolish() {
    for (const key of this.store.scan()) {
      this.store.delete(key);
    };
    // TODO reset engine, chapters, and quest boxes
  }
}

class QuestBox {
  /**
   * @desc Create a quest box with given spec and options
   * @param {QuestSpec} spec
   * @param {{
   *   engine?: SKI,
   *   chapter?: QuestChapter,
   *   number?: number,
   *   store?: Store,
   * }}options
   */
  constructor (spec, options) {
    const engine = options.engine ?? (options.chapter?.engine);
    if (!engine)
      throw new Error('QuestBox requires an engine: SKI in either options or chapter');
    const store = options.store ?? options.chapter?.store;
    if (!store)
      throw new Error('QuestBox requires a store: Store in either options or chapter');
    this.impl = new SKI.Quest({ ...spec, engine });
    this.name = this.impl.id ? 'quest-' + this.impl.id : '';
    this.chapter = options.chapter;
    if (this.chapter && options.number)
      this.number = this.chapter.number + '.' + options.number;
    this.store = store;
    this.engine = engine;
    this.view = {};
    this.input = [];
  }

  load () {
    const data = this.store.load(this.name) ?? {};
    this.status = {
      solved:   data.solved ?? false,
      steps:    data.steps ?? 0,
      attempts: data.attempts ?? 0,
      weight:   data.weight ?? 0,
      total:    data.total ?? 0,
    };
    if (this.status.solved)
      this.onSolved();
    return this;
  }

  save () {
    this.store.save(this.name, this.status);
    return this;
  }

  update (result) {
    if (this.status.solved)
      return;
    this.status.attempts++;
    this.status.total += result.steps;
    this.status.steps = result.steps;
    this.status.weight = result.weight;
    if (result.pass) {
      this.status.solved = true;
      this.onSolved(result);
    }
    this.save();
    this.showStatus();
  }

  onSolved (result) {
    if (this.impl.meta.unlock && result) {
      const term = new SKI.classes.Alias(this.impl.meta.unlock, result.expr.expand());
      this.chapter?.onUnlock(term);
    }
    if (this.chapter)
      this.chapter.addSolved(this.impl.id);
  }

  check () {
    if (this.view.display)
      this.view.display.innerHTML = 'running...';
    const got = this.input.map(x => x.value);
    const result = this.impl.check(...got);
    this.showResult(result);
    this.update(result);
  }

  draw (element) {
    this.view.frame = append(element, 'div', { class: ['ski-quest-box'] });
    this.view.frame.id = this.name;

    const title = append(this.view.frame, 'h3');
    const body = append(this.view.frame, 'div');
    const expand = append(title, 'a', { content: this.number ? '#' + this.number + '' : 'Quest' });
    expand.href = '#' + this.name;
    expand.onclick = () => showhide(body, true);

    append(title, 'span', { content: ' ' + this.impl.name });
    const allowed = this.impl.allowed();
    if (allowed)
      append(title, 'span', { content: ' [' + allowed + ']' });
    this.view.stat = append(title, 'span', { class: ['ski-quest-float-right'] });

    const descr = append(body, 'div');
    append(descr, 'div', { content: cat(this.impl.intro), class: ['ski-quest-note'] });
    if (this.impl.meta.hint)
      hint(descr, ' Hint:...', ' Hint: ' + this.impl.meta.hint);

    this.view.display = append(body, 'div', { class: ['ski-quest-display'], content: '.....' });

    this.view.solution = append(body, 'div', { class: ['ski-quest-solution'] });

    this.drawInput(this.view.solution);

    this.showStatus();
  }

  drawInput (element) {
    const spec = this.impl.input;
    const multi = spec.length !== 1;

    for (const item of spec) {
      if (multi) {
        const label = append(element, 'div', { class: ['ski-quest-label'] });
        append(label, 'b', { content: item.name });
        if (item.note)
          append(label, 'span', { content: ' // ' + item.note, class: ['ski-quest-comment'] });
      }
      const input = append(element, 'input');
      input.type = 'text';
      input.onkeydown = e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.check();
        }
      };
      this.input.push(input);
      append(element, 'br');
    }

    const btn = append(element, 'button', { content: 'solve!' });
    btn.onclick = () => this.check();
  }

  showStatus () {
    if (!this.view.stat)
      return;
    if (this.status.attempts) {
      const tries = 'in ' + this.status.attempts + (this.status.attempts === 1 ? ' try' : ' tries');
      const steps = this.status.solved
        ? '&check; ' + this.status.steps + ' steps/' + this.status.weight + ' terms '
        : this.status.total + ' total steps ';
      this.view.stat.innerHTML = steps + ' ' + tries;
    }
  }

  /**
   *
   * @param {QuestResult} result
   */
  showResult (result) {
    if (!this.view.display)
      return;
    this.view.display.innerHTML = '';
    const echo = append(this.view.display, 'div');
    append(echo, 'span', { content: 'Your solution: ' + expand(result.expr) + ' ' });

    if (result.exception)
      append(this.view.display, 'div', { class: ['ski-quest-error'], content: 'Execution failed: ' + result.exception });

    for (const item of result.details) {
      const line = append(this.view.display, 'div', { class: item.pass ? ['ski-quest-success'] : ['ski-quest-error'] });
      append(line, 'span', { content: item.pass ? '&check; ' : '&cross; ' });
      append(line, 'span', { content: `${item.start} &rarr; ${item.found} ` });
      const showSteps = append(line, 'a', { content: `in ${item.steps} steps`, class: ['ski-quest-control'] });
      append(line, 'span', { content: ' ' });
      const hideSteps = append(line, 'a', { content: ' (hide)', class: ['ski-quest-control'], hidden: true });

      if (!item.pass) {
        append(line, 'br');
        if (item.expected !== undefined) {
          append(line, 'span', { content: '&nbsp;&nbsp;' + 'expected: ' + item.expected });
          append(line, 'br');
        }
        if (item.reason) {
          append(line, 'span', { content: '&nbsp;&nbsp;' + item.reason });
          append(line, 'br');
        }
      }
      // replay specific test case via EvalBox
      const termDiv = append(line, 'div', {});
      showSteps.onclick = () => {
        termDiv.innerHTML = '';
        hideSteps.hidden = false;
        const box = new EvalBox({ parent: termDiv, engine: this.engine, height: Infinity, max: item.steps + 2, headless: true });
        box.start(item.start);
      };
      hideSteps.onclick = () => {
        termDiv.innerHTML = '';
        hideSteps.hidden = true;
      };
    }
  }
}

class QuestChapter {
  /**
   * @desc A collection of quests, typically related,
   *       with a title and intro text. Optionally numbered, too.
   * @param {{
   *   name?: string,
   *   intro?: string|string[],
   *   link: string, // URL to fetch quest list from
   *   number?: number,
   *   engine: SKI,
   *   store: Store,
   *   onUnlock?: function, // callback for when a quest is solved and unlocks something in the engine
   * }}options
   */
  constructor (options) {
    this.options = options;
    this.quests = [];
    this.solved = new Set();
    this.view = {};
    this.number = options.number ?? 0;
    this.engine = options.engine;
    this.store = options.store;
    this.onUnlock = options.onUnlock ?? (() => {});
    this.updateMeta();
  }

  updateMeta (meta = {}) {
    this.options = { ...this.options, ...meta };
    this.id = 'chapter-' + (meta.id ?? this.number);
    if (this.view.frame)
      this.view.frame.id = this.id;
    if (this.view.link)
      this.view.link.href = '#' + this.id;
    if (this.options.name && this.view.linkText)
      this.view.linkText.innerHTML = 'Chapter ' + this.number + ': ' + this.options.name;
  }

  fetch () {
    return fetch(this.options.link)
      .then( resp => resp.json() )
      .then(data => {
        if (Array.isArray(data))
          data = { content: data };
        if (!Array.isArray(data.content))
          throw new Error('Invalid quest list in ' + this.options.link);

        this.updateMeta(data);

        let k = 0;
        for (const item of data.content)
          this.quests.push(new QuestBox(item, { chapter: this, number: ++k }));

        return this;
      });
  }

  addSolved (questId) {
    if (this.solved.has(questId))
      return;
    this.solved.add(questId);
    this.showStatus();
  }

  getProgress () {
    return {
      total:      this.quests.length,
      solved:     this.solved.size,
      complete:   this.solved.size === this.quests.length,
      percentage: Math.round(this.solved.size / this.quests.length * 100),
    }
  }

  attach (element, options) {
    this.view.frame = append(element, 'div', { class: ['ski-quest-chapter'] });
    this.view.frame.id = this.id;

    if (options.placeholder)
      this.view.placeholder = append(this.view.frame, 'div', { content: options.placeholder });
    return this;
  }

  draw () {
    this.visible = true;
    this.view.placeholder?.remove();
    const title = append(this.view.frame, 'h2');
    const body = append(this.view.frame, 'div');
    append(title, 'span', { content: 'Chapter ' + this.number + ': ' + this.options.name });
    this.view.stat = append(title, 'span', { class: ['ski-quest-float-right'] });
    title.onclick = () => { showhide(body, this.visible = !this.visible) };

    this.view.intro = append(body, 'div', { content: cat(this.options.intro), class: ['ski-quest-note', 'ski-quest-chapter-intro'] });
    this.view.content = append(body, 'div', { class: ['ski-quest-chapter-content'] });

    for (const quest of this.quests) {
      quest.load();
      quest.draw(this.view.content);
    }

    this.showStatus();
  }

  showStatus () {
    if (!this.view.stat)
      return;
    const progress = this.getProgress();
    this.view.stat.innerHTML = 'Progress: ' + progress.solved + '/' + progress.total + ' (' + progress.percentage + '%)';
    if (progress.complete)
      this.view.stat.classList.add('success');
    if (this.view.progressbar) {
      this.view.progressbar.style.paddingRight = progress.percentage + '%';
      this.view.progressbar.style.marginRight = -progress.percentage + '%';
    }
  }

  addLink (element) {
    const link = append(element, 'a');
    link.href = '#' + this.id;
    this.view.link = link;
    this.view.progressbar = append(link, 'span', { class: ['ski-quest-completion'] });
    this.view.linkText = append(link, 'span', { content: 'Chapter ' + this.number + '...' });
  }

  // TODO hide solved chapters
}

/**
 * @desc Create a self-revealing spoiler
 * @param element
 * @param shown
 * @param hidden
 */

function hint (element, shown, hidden) {
  const container = append(element, 'span', {});
  const clickme = append(container, 'span', { content: shown, class: ['ski-quest-hint'] });
  clickme.onclick = () => {
    clickme.remove();
    append(container, 'span', { content: hidden });
  };
}

/**
 * @desc Coerce array of strings to string
 * @param {string[]|string|number} input
 * @return {string}
 */
function cat (input) {
  if (Array.isArray(input))
    return input.join(' ');
  else
    return '' + input;
}

function expand (expr) {
  return expr instanceof SKI.classes.Expr
    ? (
      expr instanceof SKI.classes.Alias
        ? expr.name + ' = ' + expr.expand()
        : '' + expr.expand()
    )
    : '' + expr;
}

function showhide (element, show) {
  if (show === undefined)
    show = element.hidden;
  element.hidden = !show;
}

function showTerm (term) {
  return term.note ?? (term.impl ?? term).format({ html: true, lambda: ['', ' &mapsto; ', ''] });
}

module.exports = { QuestPage, QuestChapter, QuestBox };