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
  addChoice (label, action, choices, startAt = null) {
    let current = startAt;
    const li = this.appendLi();
    const span = append(li, 'span', { content: label });
    const entries = [];
    for (let i = 0; i < choices.length; i++) {
      const pick = Array.isArray(choices[i]) ? choices[i][1] : choices[i];
      const display = Array.isArray(choices[i]) ? choices[i][0] : choices[i];
      const entry = append(li, 'a', { content: display, class: ['hamburger-choice'] });
      entries.push(entry);
      if (i === startAt)
        entry.classList.add('hamburger-current');
      entry.onclick = () => {
        if (current !== null)
          entries[current].classList.remove('hamburger-current');
        current = i;
        entries[i].classList.add('hamburger-current');
        action(pick);
        this.hide();
      };
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
