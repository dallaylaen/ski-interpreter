import {
  classes, builtin, control, FreeVar, Church, toposort,
} from './expr';
import { Parser } from './parser';

import * as quest from './quest';
import { extras } from './extras';
extras.toposort = toposort;

export class SKI extends Parser {
  static builtin = builtin;
  static control = control;
  static classes = classes;
  // TODO declare in a loop?
  static B = builtin.B;
  static C = builtin.C;
  static I = builtin.I;
  static K = builtin.K;
  static S = builtin.S;
  static W = builtin.W;

  /**
 *  Create a proxy object that generates variables on demand,
 *       with names corresponding to the property accessed.
 *       Different invocations will return distinct variables,
 *       even if with the same name.
 *
 * @example const {x, y, z} = SKI.vars();
 *          x.name; // 'x'
 *          x instanceof FreeVar; // true
 *          x.apply(y).apply(z); // x(y)(z)
 */
  static vars (scope: object = {}): { [key: string]: FreeVar } {
    const vars: { [key: string]: FreeVar } = {};
    return new Proxy(vars, {
      get (target, prop: string) {
        if (!(prop in target))
          target[prop] = new FreeVar(prop, scope);

        return target[prop];
      }
    });
  }

  static church (n: number): Church {
    return new Church(n);
  }

  static extras = extras;
  static quest = quest;
}

declare global {
  interface Window { SKI: typeof SKI }
}

type AnyGlobal = typeof globalThis & {
  SKI: typeof SKI;
  process?: { env: Record<string, string | undefined> };
};

const g = globalThis as AnyGlobal;

// SKI_REPL=1 node -r ./index.js
if (g.process?.env.SKI_REPL) {
  g.SKI = SKI;
  console.log('SKI_REPL activated, try `new SKI();`');
}

// we're in a browser
if (typeof window !== 'undefined')
  window.SKI = SKI;
