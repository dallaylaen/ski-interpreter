/**
 *   HTML-related utility functions. Poor man's jquery & react.
 */

/**
 * Locate static element with specific ids and return a hash of them.
 * @param {String} ids
 * @return {{}}
 */
function grabView (...ids) {
  const view = {};
  for (const name of ids)
    view[name] = document.getElementById(name);
  return view;
}

/**
 * Attach a child element to the given parent and return the child.
 * @param parent
 * @param type
 * @param {{class: string[]?, content: string?, hidden: boolean?}} options
 * @return {HTMLElement}
 */
function append (parent, type, options = {}) {
  const child = document.createElement(type);
  if (options.class)
    child.classList.add(...options.class);
  if (options.content !== undefined)
    child.innerHTML = '' + options.content;
  if (options.hidden)
    child.hidden = true;
  if (options.color)
    child.style.color = options.color;
  parent.appendChild(child);
  return child;
}

function rubberDesign (mainId) {
  let target;
  const other = [];
  for (const child of document.body.children) {
    if (child.id === mainId)
      target = child;
    else
      other.push(child);
  }

  if (!target)
    throw new Error('Failed to find main element with id ' + mainId)

  const resize = () => {
    const height = other.reduce( (acc, el) => acc + el.offsetHeight, 0);
    target.style.height = (window.innerHeight - height) + 'px';
    return true;
  }

  window.addEventListener('resize', resize);
  resize();
  return resize;
}

class SMCtl {
  constructor(options = {}) {
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

  set(value, nosave=false) {
    if (!this.check(value))
      throw new Error('SMCtl: invalid value ' + value);
    for (const cb of this.onchange)
      cb(value, this.value);
    this.value = value;
    if (!nosave)
      this.save(value);
  }

  get() {
    return this.value;
  }

  addAction(cb) {
    this.onchange.push(cb);
  }
}

let currentHamburger = null;

class Hamburger {
  constructor (button, options = {}) {
    this.button = button;
    button.classList.add('hamburger-button');
    this.parent = button.parentElement;
    this.hidden = true;
    this.content = append(this.parent, 'ul', { class: options.right ? ['hamburger', 'hamburger-right'] : ['hamburger'] });
    this.button.addEventListener('click', () => this.toggle());
  }

  appendLi () {
    return append(this.content, 'li');
  }

  addSeparator () {
    const li = this.appendLi();
    li.classList.add('hamburger-separator');
    return this; // for chaining
  }

  addLabel (label) {
    const li = this.appendLi();
    append(li, 'span', { content: label });
    return this; // for chaining
  }

  addLink (label, href, target) {
    if (target === '_blank')
      label = label + ' ' + '&#x1F517;';

    const li = this.appendLi();
    const link = append(li, 'a', { content: label });
    link.href = href;
    link.target = target;
    link.onclick = () => this.hide();
    return this; // for chaining
  }

  addAction (label, action) {
    const li = this.appendLi();
    const link = append(li, 'a', { content: label });
    link.onclick = () => {
      action();
      this.hide();
    };
    return this; // for chaining
  }

  /**
     * A sticky options choice
     * @param label
     * @param action
     * @param choices
     * @return {Hamburger}
     */
  addChoice (label, smctl, choices ) {
    const li = this.appendLi();
    append(li, 'span', { content: label });
    const buttons = {}; // option value -> element
    for (const entry of choices) {
      const value = Array.isArray(entry) ? entry[1] : entry;
      const display = Array.isArray(entry) ? entry[0] : entry;
      const button = append(li, 'a', { content: display, class: ['hamburger-choice'] });
      buttons[value] = button;
      button.onclick = () => {
        smctl.set(value);
        this.hide();
      };
    }
    const action = (val, old) => {
      if (old !== undefined && buttons[old])
        buttons[old].classList.remove('hamburger-current');
      if (buttons[val])
        buttons[val].classList.add('hamburger-current');
    };
    smctl.addAction(action);
    action(smctl.get(), undefined);
    return this; // for chaining
  }

  // flags: [ [label, callback, selected?], ... ]
  addFlags(label, flags) {
    const state = {};
    const li = this.appendLi();
    append(li, 'span', { content: label });
    for (const [label, smctl] of flags) {
      const button = append(li, 'a', { content: label, class: ['hamburger-choice'] });
      button.onclick = () => {
        smctl.set(!smctl.get());
        this.hide();
      };
      const action = (val, old) => {
        button.classList.toggle('hamburger-current', val);
      };
      smctl.addAction(action);
      action(smctl.get());
    }
    return this; // for chaining
  }

  hide () {
    if (currentHamburger === this)
      currentHamburger = null;
    this.hidden = true;
    this.content.style.display = 'none';
  }

  show () {
    if(currentHamburger)
      currentHamburger.hide();
    currentHamburger = this;
    this.hidden = false;
    this.content.style.display = 'block';
  }

  toggle () {
    this.hidden ? this.show() : this.hide();
    return false;
  }
}

/**
 *
 * @param {Element} element
 * @param {boolean} visible
 */
function showhide (element, visible = false) {
  element.hidden = !visible;
}

function getParams () {
  // Somewhat ad hoc but it's javascript ^_^
  const raw = window.location.search.substring(1) || '';
  const out = {};
  raw.split('&').forEach( pair => {
    const [name, value] = pair.split('=');
    if (value === undefined) return; // TODO die
    out[name] = decode(value);
  })
  return out;
}

function encode (s) {
  // FB and possibly others don't recognize '(' and ')' in URLs,
  // so have to encode these chars correctly
  const parens = {
    '(': '%28',
    ')': '%29',
  }
  return encodeURIComponent(s).replace(/[()]/g, c => parens[c]);
}
function decode (s) {
  return decodeURIComponent(('' + s).replace(/\+/g, ' '));
}

function sanitize (text) {
  if (typeof text !== 'string')
    text = '' + text;
  const escape = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
  };
  return text.replace(/[<>&]/g, c => escape[c]);
}

class Store {
  constructor (namespace) {
    this.ns = namespace + ':';
  }

  save (key, value) {
    window.localStorage.setItem(this.ns + key, JSON.stringify(value));
  }

  load (key) {
    return JSON.parse(window.localStorage.getItem(this.ns + key));
  }

  scan () {
    const st = window.localStorage;
    const out = [];
    for (let i = 0; i < st.length; i++) {
      const key = st.key(i);
      if (key.startsWith(this.ns))
        out.push(key.substring(this.ns.length));
    }
    return out;
  }

  delete (key) {
    window.localStorage.removeItem(this.ns + key);
  }
}
