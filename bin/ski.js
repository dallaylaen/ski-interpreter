#!/usr/bin/env node

const {SKI} = require('../index');

const [_, script, ...args] = process.argv;

const [options, positional] = parseArgs(args);

if (options.help) {
    console.log('Usage: ' + script + '[-q | -v ] -e <expression>');
    process.exit(1);
}

if (!options.e) {
    throw new Error('only -e option supported so far');
}

// TODO should also be able to read file
const source = options.e;

const ski = new SKI();
const expr = ski.parse(source);

const t0 = new Date();
for (let state of expr.walk()) {
    if (state.final && !options.q)
      console.log(`// ${state.steps} step(s) in ${new Date() - t0}ms` );
    if (options.v || state.final)
    console.log(''+state.expr);
}

function parseArgs(list) {
    // TODO replace with a relevant dependency
    const pos = [];
    const opt = {};

    while (list.length > 0) {
        const next = list.shift();

        if (!next.match(/^-/)) {
            pos.push(next);
            continue;
        }

        if (next === '--') {
            pos.push(...list);
        } else if (next === '--help') {
            opt.help = true;
            break;
        } else if (next === '-q') {
            opt.q = true;
        } else if (next === '-v') {
            opt.v = true;
        } else if (next === '-e') {
            if (list.length < 1)
                throw new Error('option ' + next + 'requires and argument');
            opt.e = list.shift();
        } else {
            throw new Error('Unknown option ' + next + '; see ski.js --help');
        }
    }

    return [opt, pos];
}

