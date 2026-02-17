/**
 *   HTML-related utility functions. Poor man's jquery & react.
 */

'use strict';

  /**
 * Locate static element with specific ids and return a hash of them.
 * @param {String} ids
 * @return {{}}
 */
function grabView (...ids) {
  const view = {};
  for (const name of ids) {
    const hyphen = name.replace(/[A-Z]/g, char => '-' + char.toLowerCase())
    view[name] = document.getElementById(hyphen);
  }
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
  if (parent)
    parent.appendChild(child);
  return child;
}

/**
 * Traverse a node tree and call func on each node.
 * @param node
 * @param func
 */
function traverse (node, func) {
  func(node);
  for (const child of node.childNodes)
    traverse(child, func);
}

function custom(html) {
  const gantry = document.createElement('div');
  gantry.innerHTML = html.replace(/^[^<]*|[^>]*$/gs, ''); // omit text outside root element
  if (gantry.childNodes.length !== 1)
    throw new Error('Custom HTML element must have exactly one root node');
  const elem = gantry.childNodes[0];

  const out = {};
  traverse(elem, node => {
    // extract data-handle attributes
    const handle = node.getAttribute && node.getAttribute('data-handle');
    if (!handle)
      return;
    if (out[handle])
      throw new Error(`Duplicate data-handle attribute: ${handle}`);
    out[handle] = node;
  });
  return { ...out, elem };
}

function tpl(name) {
  // read <script type="text/template" id="name">
  const script = document.getElementById(name);
  if (!script)
    throw new Error(`Template not found: ${name}`);
  return script.innerHTML;
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

/**
 * URL encode a string.
 * Forces encoding of parentheses because facebook (and possibly others)
 * and some markdown processors don't like raw parentheses in URLs.
 * Also replaces spaces with '+' for beauty.
 * @param s
 * @returns {string}
 */
function encode (s) {
  // md parser ambiguity compat
  const parens = {
    '(': '%28',
    ')': '%29',
  }
  return encodeURIComponent(s)
    .replace(/[()]/g, c => parens[c])
    .replace(/%20/g, '+');
}
function decode (s) {
  return decodeURIComponent(('' + s).replace(/\+/g, ' '));
}

module.exports = { append, custom, decode, encode, grabView, sanitize, tpl, traverse, };
