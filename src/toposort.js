const { Expr, Named, control } = require('./expr');

/**
 * @desc  Sort a list in such a way that dependent terms come after the (named) terms they depend on.
 *        If env is given, only terms listed there are taken into account.
 *        If env is omitted, it will be implied from the list.
 *        If list is omitted, it will default to values of env.
 *        If just one term is given instead of a list, it will be coerced into a list.
 *
 *        No terms outside env + list may ever appear in the result.
 *
 *        The terms in env must be named and their names must match their keys.
 *
 * @param {Expr|Expr[]} list
 * @param {{[s:string]: Named}} env
 * @returns {{list: Expr[], env: {[s:string]: Named}}}
 *
 * @example
 *    const expr = ski.parse(src);
 *    toposort([expr], ski.getTerms()); // returns all terms appearing in Expr in correct order
 */
function toposort (list, env) {
  if (list instanceof Expr)
    list = [list];
  if (env) {
    // TODO check in[name].name === name
    if (!list)
      list = Object.keys(env).sort().map(k => env[k]); // ensure deterministic order
  } else {
    if (!list)
      return [];
    if (!env) {
      env = {};
      for (const item of list) {
        if (!(item instanceof Named))
          continue;
        if (env[item.name])
          throw new Error('duplicate name ' + item);
        env[item.name] = item;
      }
    }
  }

  const out = [];
  const seen = new Set();
  const rec = term => {
    if (seen.has(term))
      return;
    term.fold(null, (acc, e) => {
      if (e !== term && e instanceof Named && env[e.name] === e) {
        rec(e);
        return Expr.control.prune(null);
      }
    });
    out.push(term);
    seen.add(term);
  };

  for (const term of list)
    rec(term);

  return {
    list: out,
    env,
  };
}


module.exports = { toposort };
