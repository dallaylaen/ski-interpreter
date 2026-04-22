#!/usr/bin/env -S node --stack-size=20600

const fs = require('node:fs/promises');
const { Command } = require('commander');

const { SKI } = require('../lib/ski-interpreter.cjs');
const { Quest } = SKI;
const { version } = require('../package.json');

const runOptions = {};
/** @type FormatOptions */
let format = {};
let verbose = false;

const program = new Command();

program
  .name('ski')
  .description('Simple Kombinator Interpreter - a combinatory logic & lambda calculus parser and interpreter')
  .version(version)
  .option('-v, --verbose', 'Show all evaluation steps', () => { verbose = true; })
  .option('--format <json>', 'Format for output expressions', setFormat)
  .option('--max <number>', 'Limit computation steps', raw => {
    const n = Number.parseInt(raw);
    if (Number.isNaN(n) || n <= 0)
      throw new Error('--max requires a positive integer');
    runOptions.max = n;
  })
  .option('--max-size <number>', 'Limit expression\'s total footprint during computations', raw => {
    const n = Number.parseInt(raw);
    if (Number.isNaN(n) || n <= 0)
      throw new Error('--max-size requires a positive integer');
    runOptions.maxSize = n;
  })
  .option('--max-args <number>', 'Limit probed arguments when inferring terms', raw => {
    const n = Number.parseInt(raw);
    if (Number.isNaN(n) || n <= 0)
      throw new Error('--max-args requires a positive integer');
    runOptions.maxArgs = n;
  });

// REPL subcommand
program
  .command('repl')
  .description('Start interactive REPL')
  .action((options) => {
    startRepl(options);
  });

// Eval subcommand
program
  .command('eval <expression>')
  .description('Evaluate a single expression')
  .action((expression, options) => {
    evaluateExpression(expression, options);
  });

// File subcommand
program
  .command('file <filepath>')
  .description('Evaluate expressions from a file')
  .action((filepath, options) => {
    evaluateFile(filepath);
  });

// Infer subcommand
program
  .command('infer <expression>')
  .description('Find a canonical form of the expression and its properties')
  .action((expression) => {
    inferExpression(expression);
  });

// Extract subcommand
program
  .command('extract <target> <terms...>')
  .description('Rewrite target expression using known terms where possible')
  .action((target, terms) => {
    extractExpression(target, terms);
  });

// Search subcommand
program
  .command('search <target> <terms...>')
  .description('Search for an expression equivalent to target using known terms')
  .option('--max-depth <number>', 'Limit search depth', toInt('--max-depth'))
  .option('--max-tries <number>', 'Limit total terms probed', toInt('--max-tries'))
  .action(searchExpression);

// Quest-check subcommand
program
  .command('quest-lint <files...>')
  .description('Check quest files for validity')
  .option('--solution <file>', 'Load solutions from file')
  .action((files, options) => {
    questCheck(files, options.solution);
  });

// Default to REPL if no command provided
program
  .showHelpAfterError(true)
  .parse(process.argv);

if (!process.argv.slice(2).length)
  startRepl();

function startRepl () {
  const readline = require('readline');
  const ski = new SKI();

  const rl = readline.createInterface({
    input:    process.stdin,
    output:   process.stdout,
    prompt:   '> ',
    terminal: true,
  });

  console.log('Welcome to SKI interactive shell. Known combinators: ' + ski.showRestrict());

  rl.on('line', str => {
    if (str.match(/\S/)) {
      if (str.startsWith('!'))
        handleCommand(str, ski);
      else {
        processLine(str, ski, err => {
          console.log('' + err);
        });
      }
    }
    rl.prompt();
  });

  rl.once('close', () => {
    console.log('Bye, and may thy bird fly high!');
    process.exit(0);
  });

  rl.prompt();
}

function evaluateExpression (expression) {
  const ski = new SKI();
  processLine(expression, ski, err => {
    console.error('' + err);
    process.exit(3);
  });
}

function evaluateFile (filepath) {
  const ski = new SKI();
  fs.readFile(filepath, 'utf8')
    .then(source => {
      processLine(source, ski, err => {
        console.error('' + err);
        process.exit(3);
      });
    })
    .catch(err => {
      console.error('ski: ' + err);
      process.exit(2);
    });
}

function processLine (source, ski, onErr) {
  if (!source.match(/\S/))
    return; // nothing to see here

  try {
    const expr = ski.parse(source, { canonize: true });
    if (expr instanceof SKI.classes.Alias)
      ski.add(expr);
    const t0 = new Date();

    for (const state of expr.walk(runOptions)) {
      if (state.final) {
        console.log(`// ${state.steps} step(s) in ${new Date() - t0}ms`);
        console.log(state.expr.declare({ ...format, inventory: ski.getTerms() }));
      } else if (verbose)
        console.log(state.expr.format(format) + ';');
    }
  } catch (err) {
    onErr(err);
  }
}

function inferExpression (expression) {
  const ski = new SKI();

  const expr = ski.parse(expression);
  const guess = expr.infer(runOptions);

  if (guess.normal) {
    displayInfer(guess);
    return;
  }
  // hard case...
  let steps = guess.steps;
  const canon = expr.traverse(e => {
    if (e === expr)
      return; // already tried
    const g = e.infer(runOptions);
    steps += g.steps;
    return g.expr;
  });

  displayInfer({ expr: canon, steps, normal: false, proper: false });
}

/**
 *
 * @param {TermInfo} guess
 */
function displayInfer (guess) {
  if (guess.expr)
    console.log(guess.expr.format(format));

  for (const key of ['normal', 'proper', 'arity', 'discard', 'duplicate', 'steps']) {
    if (guess[key] !== undefined)
      console.log(`// ${key}: ${guess[key]}`);
  }
}

async function questCheck (files, solutionFile) {
  try {
    // Load solutions if provided
    let solutions = null;
    if (solutionFile) {
      const data = await fs.readFile(solutionFile, 'utf8');
      solutions = JSON.parse(data);
    }

    // Load and verify each quest file
    let hasErrors = false;
    const seenIds = new Set();

    for (const file of files) {
      try {
        const data = await fs.readFile(file, 'utf8');
        const questData = JSON.parse(data);

        // Handle both single quest objects and quest groups
        const entry = Array.isArray(questData) ? { content: questData } : questData;

        try {
          const group = new Quest.Group(entry);

          // Verify the group
          const findings = group.verify({
            date: true,
            solutions,
            seen: seenIds
          });

          // Check for errors
          const hasGroupErrors = Object.keys(findings).some(key => {
            if (key === 'content') {
              const contentErrors = findings.content?.filter(item => item !== null);
              return contentErrors && contentErrors.length > 0;
            }
            return findings[key];
          });

          if (hasGroupErrors) {
            hasErrors = true;
            console.error(`Error in ${file}:`);
            console.error(JSON.stringify(findings, null, 2));
          } else
            console.log(`✓ ${file}`);
        } catch (err) {
          hasErrors = true;
          console.error(`Error parsing quest group in ${file}:`, err.message);
        }
      } catch (err) {
        hasErrors = true;
        console.error(`Error reading file ${file}:`, err.message);
      }
    }

    // Exit with appropriate code
    process.exit(hasErrors ? 1 : 0);
  } catch (err) {
    console.error('Error in quest-lint:', err.message);
    process.exit(2);
  }
}

function searchExpression (targetStr, termStrs, options) {
  const ski = new SKI();
  const target = ski.parse(targetStr);
  const seed = termStrs.map(s => ski.parse(s));

  const { expr } = target.infer();
  if (!expr) {
    console.error('target expression is not normalizable: ' + target);
    process.exit(1);
  }

  const res = SKI.extras.search(seed, { tries: options.maxTries, depth: options.maxDepth }, (e, p) => {
    if (!p.expr)
      return -1;
    if (p.expr.equals(expr))
      return 1;
    return 0;
  });

  if (res.expr) {
    console.log(`Found ${res.expr.format(format)} after ${res.total} tries.`);
    process.exit(0);
  } else {
    console.error(`No equivalent expression found for ${target} after ${res.total} tries.`);
    process.exit(1);
  }
}

function extractExpression (targetStr, termStrs) {
  const ski = new SKI();
  const expr = ski.parse(targetStr);
  const pairs = termStrs
    .map(s => ski.parse(s))
    .map(e => [e.infer(runOptions).expr, e]);

  const uncanonical = pairs.filter(pair => !pair[0]);
  if (uncanonical.length) {
    console.error('Some expressions could not be canonized: '
      + uncanonical.map(p => p[1].toString()).join(', '));
    process.exit(1);
  }

  const replaced = expr.traverse(e => {
    const canon = e.infer(runOptions).expr;
    if (canon) {
      for (const [lambda, term] of pairs) {
        if (canon.equals(lambda))
          return term;
      }
    }
  });

  console.log((replaced ?? expr).format(format));
  if (!replaced)
    console.log('// unchanged');
}

function handleCommand (input, ski) {
  const [_, cmd, arg] = input.match(/^\s*(\S+)(?:\s+(.*\S))?\s*$/);

  const dispatch = {
    '!ls': () => {
      const terms = ski.getTerms();
      const list = Object.keys(terms).sort();
      for (const name of list) {
        const term = terms[name];
        if (term instanceof SKI.classes.Alias)
          console.log(`  ${name} = ${term.impl}`);
        else if (term instanceof SKI.classes.Native)
          console.log(`  ${name} ${term.props?.expr ?? '(native)'}`);
      }
    },
    '!verbose': flag => {
      verbose = !(['off', 'false', '0', '-'].includes(flag));
      console.log('// verbose is ' + (verbose ? 'on' : 'off'));
    },
    '!format': options => {
      if (options)
        setFormat(options);
      else
        console.log('Format: ' + JSON.stringify(format, null, 2));
    },
    '!help': () => {
      console.log('Available commands:');
      console.log('  !ls    - List term inventory');
      console.log('  !verbose [on|off] - Toggle verbose mode (show all evaluation steps)');
      console.log('  !format [json] - Set or show output format options');
      console.log('  !help  - Show this help message');
    },
    '': () => {
      console.log(`Unknown command: ${cmd}`);
      console.log('Type !help for available commands.');
    }
  };

  try {
    (dispatch[cmd] || dispatch[''])(arg)
  } catch (err) {
    console.error(`Error executing command ${cmd}:`, err.message);
  }
}

function setFormat (options) {
  const maybe = SKI.extras.checkFormatOptions(JSON.parse(options));
  if (!maybe.value)
    throw new Error('Invalid format options: ' + JSON.stringify(maybe.error));
  format = maybe.value;
}

function toInt (comment) {
  return function (str) {
    const n = Number.parseInt(str);
    if (Number.isNaN(n) || n <= 0)
      throw new Error(comment + ' requires positive integer');
    return n;
  }
}
