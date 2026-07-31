#!/usr/bin/env node

/**
 * @desc
 * This script is a one-off script to generate test cases
 * for the rule110 quest.
 * It serves no real purpose and is only stored here for posterity.
 */

// Rule 110 cellular automaton
// Usage: node rule110.js <binary-string>
// Output: two lines in the format (V [t|f] (V [t|f] ... (V [t|f] nil)...))

// Rule 110: given left, center, right bits, output bit
// Pattern: 111->0, 110->1, 101->1, 100->0, 011->1, 010->1, 001->1, 000->0
const RULE110 = 0b01101110; // 110 in decimal

function applyRule110(bits) {
  const n = bits.length;
  return bits.map((_, i) => {
    const left   = bits[(i - 1)] ?? 0;
    const center = bits[i];
    const right  = bits[(i + 1)] ?? 0;
    const pattern = (left << 2) | (center << 1) | right;
    return (RULE110 >> pattern) & 1;
  });
}

function toListExpr(bits) {
  // Build right-to-left: (V bit (V bit ... (V bit nil)...))
  let result = 'nil';
  for (let i = bits.length - 1; i >= 0; i--) {
    result = `(V ${bits[i] ? 't' : 'f'} ${result})`;
  }
  return result;
}

const input = process.argv[2];

if (!input || !/^[01]+$/.test(input)) {
  console.error('Usage: node rule110.js <string of 0s and 1s>');
  process.exit(1);
}

const original = input.split('').map(Number);
const next     = applyRule110(original);

console.log(toListExpr(original));
console.log(toListExpr(next));
