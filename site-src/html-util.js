/**
 *   HTML-related utility functions. Poor man's jquery & react.
 */

'use strict';

/**
 * Locate static elements with specific ids and them as hash.
 * camelCase ids are converted to hyphen-case for aesthetic reason.
 * @param {String} ids
 * @return {{}}
 */
function grabView (...ids) {
  const view = {};
  for (const name of ids) {
    const hyphen = name.replace(/[A-Z]/g, char => '-' + char.toLowerCase())
    view[name] = document.getElementById(hyphen);
    if (!view[name])
      throw new Error(`View element not found: ${hyphen}`);
  }
  return view;
}

/**
 * Create a new HTMLElement and append it to parent, if given.
 * @param parent - parent element to append to, or null to create an unattached element
 * @param tagname - tag name of the element to create
 * @param {object} options
 * @param {string[]} [options.class] - array of class names to add
 * @param {string} [options.content] - innerHTML content to set (not escaped whatsoever)
 * @param {boolean} [options.hidden] - whether to set hidden attribute
 * @param {string} [options.color] - color to set for the element
 * @param {(elem: HTMLElement) => void} decorate - do more stuff on element before returning it
 * @return {HTMLElement}
 *
 * @example
 * // create <div class="foo bar" style="color: red">Hello</div> and append to body
 * append(document.body, 'div', { class: ['foo', 'bar'], content: 'Hello', color: 'red' });
 */
function append (parent, tagname, options = {}, decorate) {
  const child = document.createElement(tagname);
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
  if (decorate)
    decorate(child);
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

function custom (html) {
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

function tpl (name) {
  // read <script type="text/template" id="name">
  const script = document.getElementById(name);
  if (!script)
    throw new Error(`Template not found: ${name}`);
  return script.innerHTML;
}

/**
 * Escape HTML special characters in a string.
 * @param text
 * @returns {string}
 */
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

module.exports = { append, custom, decode, encode, grabView, sanitize, tpl, traverse };
