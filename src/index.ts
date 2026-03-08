import {
  classes, native, control, FreeVar, Church,
  FormatOptionsSchema
} from './expr';
import { Parser } from './parser';

import { Quest } from './quest';
import { toposort } from './toposort';
import { extras } from './extras';
extras.toposort = toposort;

export class SKI extends Parser {
  static native = native;
  static control = control;
  static classes = classes;
  static schemas = { FormatOptions: FormatOptionsSchema };

  // TODO declare in a loop?
  static B = native.B;
  static C = native.C;
  static I = native.I;
  static K = native.K;
  static S = native.S;
  static W = native.W;

  // variable generator shortcut
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
  static Quest = Quest;
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
