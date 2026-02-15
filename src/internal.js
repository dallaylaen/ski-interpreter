class Tokenizer {
  /**
   * @desc Create a tokenizer that splits strings into tokens according to the given terms.
   * The terms are interpreted as regular expressions, and are sorted by length
   * to ensure that longer matches are preferred over shorter ones.
   * @param {...string|RegExp} terms
   */
  constructor (...terms) {
    const src = '$|(\\s+)|' + terms
      .map(s => '(?:' + s + ')')
      .sort((a, b) => b.length - a.length)
      .join('|');
    this.rex = new RegExp(src, 'gys');
  }

  /**
   * @desc Split the given string into tokens according to the terms specified in the constructor.
   * @param {string} str
   * @return {string[]}
   */
  split (str) {
    this.rex.lastIndex = 0;
    const list = [...str.matchAll(this.rex)];

    // did we parse everything?
    const eol = list.pop();
    const last = eol?.index ?? 0;

    if (last !== str.length) {
      throw new Error('Unknown tokens at pos ' + last + '/' + str.length
                + ' starting with ' + str.substring(last));
    }

    // skip whitespace
    return list.filter(x => x[1] === undefined).map(x => x[0]);
  }
}

const tokRestrict = new Tokenizer('[-=+]', '[A-Z]', '\\b[a-z_][a-z_0-9]*\\b');

/**
 * @desc Add ot remove tokens from a set according to a spec string.
 * The spec string is a sequence of tokens, with each group optionally prefixed
 * by one of the operators '=', '+', or '-'.
 * The '=' operator resets the set to contain only the following token(s).
 * @param {Set<string>} set
 * @param {string} [spec]
 * @returns {Set<string>}
 */
function restrict (set, spec) {
  if (!spec)
    return set;
  let out = new Set([...set]);
  const act = {
    '=': sym => { out = new Set([sym]); mode = '+'; },
    '+': sym => { out.add(sym); },
    '-': sym => { out.delete(sym); },
  };

  let mode = '=';
  for (const sym of tokRestrict.split(spec)) {
    if (act[sym])
      mode = sym;
    else
      act[mode](sym);
  }
  return out;
}

class TraverseControl {
  /**
   * @desc A wrapper for values returned by fold/traverse callbacks
   *       which instructs the traversal to alter its behavior while
   *       retaining the value in question.
   *
   *       This class is instantiated internally be `SKI.control.*` functions,
   *       and is not intended to be used directly by client code.
   *
   * @template T
   * @param {T} value
   * @param {function(T): TraverseControl<T>} decoration
   */
  constructor (value, decoration) {
    this.value = value;
    this.decoration = decoration;
  }
}

/**
 * @private
 * @template T
 * @param {T|TraverseControl<T>|null} value
 * @returns {[T?, function|undefined]}
 */
function unwrap (value) {
  // `?? undefined` so that null is not 'an object'
  if (value instanceof TraverseControl)
    return [value.value ?? undefined, value.decoration];
  return [value ?? undefined, undefined];
}

/**
 *
 * @desc Prepare a self-referencing wrapper function for use as a fold/traverse control decorator.
 *
 *       If `fun` is created by `prepareWrapper`, then
 *       unwrap(fun(x)) will always return exactly [x, fun], and the second value can be checked with ===.
 *
 *       An optional name can be given for debugging purposes.
 *
 * @private
 * @template T
 * @param {string} [name]
 * @returns {function(T): TraverseControl<T>}
 */
function prepareWrapper (name) {
  const fun = value => new TraverseControl(value, fun);
  fun.name = name;
  fun.toString = () => 'TraverseControl::' + name;
  return fun;
}

module.exports = { Tokenizer, restrict, unwrap, prepareWrapper };
