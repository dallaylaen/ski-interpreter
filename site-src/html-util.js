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
  if (parent)
    parent.appendChild(child);
  return child;
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

module.exports = { append, decode, encode, grabView, sanitize, };
