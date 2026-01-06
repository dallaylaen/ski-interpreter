/**
 *   This file is included from a static HTML page.
 *   Assume that SKI engine is already loaded.
 *   Make utility functions available in the HTML context.
 */

'use strict';

const util = require ('./html-util');
const { EvalBox } = require ('./eval-box');
const { permalink, readlink, readOldLink } = require ('./permalink');
const { Store } = require ('./store');
const { SMCtl } = require('./smctl');
const { Hamburger } = require('./hamburger');
const { History } = require('./history');

// Expose classes to global context
window.SMCtl       = SMCtl;
window.Hamburger   = Hamburger;
window.EvalBox     = EvalBox;
window.Store       = Store;
window.History     = History;

// append is used so much that it's worth being global
window.append      = util.append;

// namespace all other utilities
window.util = {
  ...util,
  permalink,
  readlink,
  readOldLink,
};
