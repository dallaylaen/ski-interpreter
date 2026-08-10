import { expect } from 'chai';

export function isInstanceOf<T> (
  value: unknown,
  ctor: new (...args: never[]) => T,
  message?: string
): asserts value is T {
  expect(value).to.be.an.instanceOf(ctor, message);
}
