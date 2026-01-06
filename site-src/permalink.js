'use strict';
const linkprefix = '#expr:';

const { encode, decode } = require('./html-util');

/**
 * @desc   Creates a permalink for the given engine and code snippet.
 * @param {SKI} engine
 * @param {string} code
 * @returns {string}
 */
function permalink (engine, code) {
  // TODO tree shaking but LATER
  return linkprefix + encode(code) + '?' + engine.declare()
    .map(s => s.split('=').map(part => encode(part)).join('=')).join(';');
}

/**
 * @desc  Reads a permalink() hash and returns code and declarations.
 * @param hash
 * @returns {{code: string, decls: string[]}|null}
 */
function readlink (hash) {
  const match = hash.match(new RegExp('^' + linkprefix + '([^?]+)\\??(.*)$'));
  if (!match) return null;
  const expr = decode(match[1]);
  const decls = match[2]
    ? match[2].split(';').map(s => decode(s))
    : [];
  return { expr, decls };
}

function readOldLink(location) {
// recover old style links via ?code=...&terms=...
// via redirect to hash consumable by readlink()
  const params = new URLSearchParams(location);
  if (params.has('code') || params.has('terms')) {
    const code = params.get('code') ?? '';
    const terms = params.get('terms').split(',');
    console.log("Migrating old-style link to new-style hash, code =", code, "terms =", terms);
    const reworkTerms = terms
      .map(s => s.split(':').map(decodeURIComponent).join('='))
      .join(';');
    return '#expr:' + encodeURIComponent(code) + '?' + reworkTerms;
  }
}

module.exports = { permalink, readlink, readOldLink, };