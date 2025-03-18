class Tokenizer {
  constructor (...terms) {
    const src = '$|(\\s+)|' + terms
      .map(s => '(?:' + s + ')')
      .sort((a, b) => b.length - a.length)
      .join('|');
    this.rex = new RegExp(src, 'gys');
  }

  /**
     *
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
function restrict (set, spec) {
  if (!spec)
    return set;
  let out = new Set([...set]);
  let mode = 0;
  const act = [
    sym => { out = new Set([sym]); mode = 1; },
    sym => { out.add(sym); },
    sym => { out.delete(sym); },
  ];
  for (const sym of tokRestrict.split(spec)) {
    if (sym === '=')
      mode = 0;
    else if (sym === '+')
      mode = +1;
    else if (sym === '-')
      mode = 2;
    else
      act[mode](sym);
  }
  return out;
}

function missingIndices (arr, set) {
  const out = new Set();
  for (let n = 0; n < arr.length; n++) {
    if (!set.has(arr[n]))
      out.add(n);
  }
  return out;
}

function isSubset (a, b) {
  for (const x of a) {
    if (!b.has(x))
      return false;
  }
  return true;
}

module.exports = { Tokenizer, restrict, missingIndices, isSubset };
