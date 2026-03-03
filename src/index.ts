import { classes, native, control, FreeVar, Church, Native } from './expr';
import { Parser } from './parser';

const { Quest } = require ('./quest');
const { toposort } = require ('./toposort');
import { extras } from './extras';
extras.toposort = toposort;

export class SKI extends Parser {
  static native = native;
  static control = control;
  static classes = classes;

  // TODO declare in a loop?
  static B = native.B;
  static C = native.C;
  static I = native.I;
  static K = native.K;
  static S = native.S;
  static W = native.W;

  // variable generator shortcut
  static vars (scope: object={}): { [key: string]: FreeVar } {
    const vars: { [key: string]: FreeVar } = {};
    return new Proxy(vars, {
      get (target, prop: string) {
        if (!(prop in target)) {
          target[prop] = new FreeVar(prop, scope);
        }
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
