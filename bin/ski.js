#!/usr/bin/env -S node --stack-size=20600

const fs = require('node:fs/promises');

const { SKI } = require('../index');

const [myname, options, positional] = parseArgs(process.argv);

if (options.help) {
  console.error(myname + ': usage: ' + myname + '[-q | -v ] -e <expression>');
  process.exit(1);
}

if ((typeof options.e === 'string' && positional.length) > 0 || positional.length > 1) {
  console.error(myname + ': either -e <expr> or exactly one filename must be given');
  process.exit(1);
}

const ski = new SKI();

if (options.e === undefined && !positional.length) {
  // interactive console
  const readline = require('readline');
  const rl = readline.createInterface({
    input:    process.stdin,
    output:   process.stdout,
    prompt:   '> ',
    terminal: true,
  });
  if (!options.q)
    console.log('Welcome to SKI interactive shell. Known combinators: ' + ski.showRestrict());
  rl.on('line', str => {
    const flag = str.match(/^\s*([-+])([qvt])\s*$/);
    if (flag)
      options[flag[2]] = flag[1] === '+';
    else {
      runLine(err => {
        console.log('' + err)
      })(str);
    }
    rl.prompt();
  });
  rl.once('close', () => {
    if (!options.q)
      console.log('Bye, and may your bird fly high!');
    process.exit(0)
  });
  rl.prompt();
} else {
  const prom = positional.length > 0
    ? fs.readFile(positional[0], 'utf8')
    : Promise.resolve(options.e);

  prom.then(runLine(err => { console.error('' + err); process.exit(3) })).catch(err => {
    console.error(myname + ': ' + err);
    process.exit(2);
  });
}

function runLine (onErr) {
  return function (source) {
    if (!source.match(/\S/))
      return 0; // nothing to see here
    try {
      const expr = ski.parse(source);

      const t0 = new Date();
      for (const state of expr.walk()) {
        if (state.final && !options.q)
          console.log(`// ${state.steps} step(s) in ${new Date() - t0}ms`);
        if (options.v || state.final)
          console.log('' + state.expr.format({ terse: options.t }));
        if (state.final && expr instanceof SKI.classes.Alias)
          ski.add(expr.name, state.expr);
      }
      return 0;
    } catch (err) {
      onErr(err);
      return 1;
    }
  }
}

function parseArgs (argv) {
  const [_, script, ...list] = argv;

  const todo = {
    '--':     () => { pos.push(...list) },
    '--help': () => { opt.help = true },
    '-q':     () => { opt.q = true },
    '-v':     () => { opt.v = true },
    '-c':     () => { opt.t = false },
    '-t':     () => { opt.t = true },
    '-e':     () => {
      if (list.length < 1)
        throw new Error('option -e requires an argument');
      opt.e = list.shift();
    },
  };

  // TODO replace with a relevant dependency
  const pos = [];
  const opt = {};

  while (list.length > 0) {
    const next = list.shift();

    if (!next.match(/^-/)) {
      pos.push(next);
      continue;
    }

    const action = todo[next];
    if (typeof action !== 'function')
      throw new Error('Unknown option ' + next + '; see ski.js --help');

    action();
  }

  return [script, opt, pos];
}
