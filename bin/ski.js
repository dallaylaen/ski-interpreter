#!/usr/bin/env node

const fs = require('node:fs/promises');
const readline = require('readline');

const {SKI} = require('../index');

const [myname, options, positional] = parseArgs(process.argv);

if (options.help) {
    console.error(myname + ': usage: ' + myname + '[-q | -v ] -e <expression>');
    process.exit(1);
}

if (typeof options.e === 'string' && positional.length > 0 || positional.length > 1) {
    console.error(myname + ': either -e <expr> or exactly one filename must be given');
    process.exit(1);
}

const ski = new SKI();

if (options.e === undefined && !positional.length) {
    // interactive console
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    rl.on('line', runLine);
    rl.once('close', () => {
        if (!options.q)
            console.log('Bye, and may your bird fly high!');
        process.exit(0)
    });
}

const prom = positional.length > 0
    ? fs.readFile(positional[0], 'utf8')
    : Promise.resolve(options.e);

prom.then(runLine).catch(err => {
    console.error(myname + ': ' + err);
    process.exit(2);
});

function runLine(source) {
    if (source === undefined) {
        // 1st line of readline
        if (!options.q)
            console.log('Welcome to SKI interactive shell. Known combinators: '+ski.allow);
        return;
    }

    try {
        const expr = ski.parse(source);

        const t0 = new Date();
        for (let state of expr.walk()) {
            if (state.final && !options.q)
                console.log(`// ${state.steps} step(s) in ${new Date() - t0}ms`);
            if (options.v || state.final)
                console.log('' + state.expr);
        }
        return 0;
    } catch (err) {
        console.error(''+err);
        return 3;
    }
}

function parseArgs(argv) {
    const [_, script, ...list] = argv;

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

    return [script, opt, pos];
}

