import { expect } from 'chai';

import { Expr, Alias, Named } from '../../src/expr';

export function isInstanceOf<T> (
  value: unknown,
  ctor: new (...args: never[]) => T,
  message?: string
): asserts value is T {
  expect(value).to.be.an.instanceOf(ctor, message);
}

/**
 * The parser may add an invisible eponymous Alias wrapper around a Named term
 * to protect the original term from modifications.
 * This function reveals the underlying term instead.
 * @param expr
 */
export function stripAlias (expr: Expr): Expr {
  let next = expr;
  while (next instanceof Alias && next.impl instanceof Named && next.impl.name === next.name)
    next = next.impl;
  return next;
}
