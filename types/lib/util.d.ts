export class Tokenizer {
    constructor(...terms: any[]);
    rex: RegExp;
    /**
       *
       * @param {string} str
       * @return {string[]}
       */
    split(str: string): string[];
}
export function restrict(set: any, spec: any): any;
export function skipDup(arr: any, map: any): any[];
export function isSubset(a: any, b: any): boolean;
