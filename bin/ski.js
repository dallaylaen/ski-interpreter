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
let quiet = false;
let declare = false;
const defines = [];
/** @type {InstanceType<typeof SKI>} */
let ski;

const program = new Command();

program
  .name('ski')
  .description('Simple Kombinator Interpreter - a combinatory logic & lambda calculus\n     parser and interpreter v.' + version)
  .version(version)
  .option('-v, --verbose', 'Show all evaluation steps', () => { verbose = true; })
  .option('-q, --quiet', 'Suppress comment lines in output', () => { quiet = true; })
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
  })
  .option('--declare', 'Prepend used terms declarations to calculation result',
    () => { declare = true; })
  .option('-d, --define <name=expr>', 'Define a global alias (may be repeated)',
    (val) => { defines.push(val); })
  .option('--help [topic]', 'Show help', showHelp);

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
  .action(async (expression, options) => {
    evaluateExpression(await readExpression(expression), options);
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
  .action(async (expression) => {
    inferExpression(await readExpression(expression));
  });

program
  .command('compare <expr1> <expr2>')
  .description('Check if two expressions are equivalent')
  .action(async (expr1, expr2) => {
    expr1 = await readExpression(expr1);
    expr2 = await readExpression(expr2);
    const e1 = ski.parse(expr1);
    const e2 = ski.parse(expr2);
    const res = SKI.extras.equiv(e1, e2, runOptions);
    if (res.equal)
      console.log('Both expressions are equivalent to ' + res.canonical[0].format(format));
    else
      console.log(`Expressions differ:\n${res.canonical[0].format(format)}\n vs \n${res.canonical[1].format(format)}`);

    console.log(`// ${res.steps} step(s)`);
    process.exit(res.equal ? 0 : 1);
  });

// Extract subcommand
program
  .command('extract <target> <terms...>')
  .description('Rewrite target expression using known terms where possible')
  .action(async (target, terms) => {
    extractExpression(await readExpression(target), terms);
  });

// Search subcommand
program
  .command('search <target> <terms...>')
  .description('Search for an expression equivalent to target using known terms')
  .option('--max-depth <number>', 'Limit search depth', toInt('--max-depth'))
  .option('--max-tries <number>', 'Limit total terms probed', toInt('--max-tries'))
  .action(async (target, terms, options) => {
    searchExpression(await readExpression(target), terms, options);
  });

// Quest-check subcommand
program
  .command('quest-lint <files...>')
  .description('Check quest files for validity')
  .option('--solution <file>', 'Load solutions from file')
  .option('--fix', 'Fill empty id/created_at fields in place')
  .action((files, options) => {
    questCheck(files, options.solution, options.fix);
  });

program.command('help [topic]')
  .description('Show help for a specific subcommand or topic')
  .action(showHelp);

program
  .showHelpAfterError(true)
  .helpOption(false)
  .action(() => showHelp())
  .hook('preAction', (thisCommand, actionCommand) => {
    const name = actionCommand.name();
    if (name === 'help' || name === 'quest-lint')
      return;
    ski = new SKI();
    applyDefines(ski);
  })
  .parse(process.argv);

function showHelp (topic) {
  const header = program.description();

  const helpData = [
    [
      'syntax',
      'Syntax of the interpreter', `
    Terms:
    - Uppercase letters are single-character terms and can be concatenated:
      SKK = S K K
    - Lowercase identifiers ([a-z_][a-zA-Z0-9_]*) must be space-separated
    - Non-negative integers are Church numerals (must also be space-separated)
      i.e. "0 f x" = "x", "1 f x" = "f x", "5 f x" == "f (f (f (f (f x))))" etc
    - "+" is the Church numeral increment combinator (+0 = 1, +1 = 2 etc)
      so that "expr + 0" outputs a number if "expr" can be interpreted as such
    - Unknown terms are assumed to be free variables

    Application:
    - Left-associative: a b c = (a b) c, NOT a (b c)

    Lambda abstraction:
    - Written as x->body or x->y->body (right-associative)
    - Bound variables are local to the lambda

    Definitions:
    - name = expr  defines a new named term, e.g.
      "T=CI", "false=KI"
    - definitions can be prepended to expression, separated by semicolons, e.g.
      "T=CI; false=KI; T false x y"  is equivalent to "CI (KI) x y"

    Built-in combinators:
    - I x       = x          (identity)
    - K x y     = x          (constant)
    - S x y z   = x z (y z)  (fusion)
    - B x y z   = x (y z)    (composition)
    - C x y z   = x z y      (swap)
    - W x y     = x y y      (duplicate)
    `],
    [
      'format',
      'Output formatting options', `
    Format options are a JSON object with the following properties:

    - terse:     boolean               omit unnecessary spaces and parentheses
                                       (default: true)
    - html:      boolean               HTML-safe output with fancy decorations
                                       (default: false)
    - brackets:  [open, close]         wrap application arguments
                                       (default: ['(', ')'])
    - space:     string                separator between terms
                                       (default: ' ')
    - var:       [open, close]         wrap variable names
                                       (html default: ['<var>', '</var>'])
    - lambda:    [prefix, sep, suffix] wrap lambda abstractions
                                       (default: ['', '->', ''])
    - around:    [open, close]         wrap each top-level (sub-)expression
                                       (default: ['', ''])
    - redex:     [open, close]         wrap terms eligible for reduction
                                       (default: ['', ''])

    Examples:
      --format '{ "terse": false }'    # spell out all parentheses
      --format '{ "html": true }'      # HTML tags and entities
      --format '{ "around": ["(", ")"], "brackets": ["", ""], "lambda": ["(", "->", ")"] }'
                                       # emulate lisp notation
      --format '{ "lambda": ["\u03bb", ".", ""] }'
                                       # pretend we're writing a science paper
      --format '{"redex":["\u001b[38;5;41m", "\u001b[0m"]}'
                                       # highlight reducible terms in green
    `],
  ];

  if (!topic) {
    console.log(program.helpInformation() + '\nAdditional help topics:\n\n'
      + helpData.map(([name, description]) => `  ${name} - ${description}`).join('\n'));
    process.exit(0);
  }

  const topicData = helpData.find(([name]) => name === topic);
  if (topicData) {
    const [_, description, details] = topicData;
    console.log(`${header}\n\n${description}:\n${details}`);
    process.exit(0);
  }

  const subcommand = program.commands.find(cmd => cmd.name() === topic);
  if (subcommand) {
    console.log(subcommand.helpInformation());
    process.exit(0);
  }

  console.error(`Unknown help topic: ${topic}`);
  process.exit(2);
}

function startRepl () {
  const readline = require('node:readline');

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
          if (err)
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

function applyDefines (ski) {
  for (const def of defines) {
    let alias;
    try {
      alias = ski.parse(def, { canonize: true });
    } catch (err) {
      console.error(`ski: --define ${def}: ${err.message}`);
      process.exit(2);
    }
    if (!(alias instanceof SKI.classes.Alias)) {
      console.error(`ski: --define: expected name=expr, got: ${def}`);
      process.exit(2);
    }
    ski.add(alias);
  }
}

function evaluateExpression (expression) {
  processLine(expression, ski, err => {
    if (err)
      console.error('' + err);
    process.exit(1);
  });
}

function evaluateFile (filepath) {
  const onErr = err => {
    console.error('' + err);
    process.exit(1);
  };
  if (filepath === '-') {
    let source = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { source += chunk; });
    process.stdin.on('end', () => { processLine(source, ski, onErr); });
    return;
  }
  fs.readFile(filepath, 'utf8')
    .then(source => processLine(source, ski, onErr))
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

    let state;
    if (verbose) {
      for (const next of expr.walk(runOptions)) {
        if (state && !next.final)
          console.log(state.expr.format(format) + ';');
        state = next;
      }
    } else
      state = expr.run({ max: Infinity, ...runOptions });
    if (!quiet)
      console.log(`// ${state.steps} step(s) in ${new Date() - t0}ms`);
    if (!state.final)
      console.log('// (partial result)');
    console.log(formatExpr(state.expr));
    if (!state.final)
      onErr('');
  } catch (err) {
    onErr(err);
  }
}

function inferExpression (expression) {
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
    if (guess[key] !== undefined && !quiet)
      console.log(`// ${key}: ${guess[key]}`);
  }
}

async function questCheck (files, solutionFile, fix) {
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
        let data = await fs.readFile(file, 'utf8');
        let write = false; // write back if --fix

        // Fix empty id/created_at fields if requested
        if (fix) {
          const date = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
          const fixed = data
            .replace(/"id": *""/g, () => `"id": "${questId()}"`)
            .replace(/"created_at": *""/g, `"created_at": "${date}"`);
          if (fixed !== data) {
            data = fixed;
            write = true;
          }
        }

        const questData = JSON.parse(data);

        // Handle both single quest objects and quest groups
        const entry = Array.isArray(questData) ? { content: questData } : questData;

        // Skip files that aren't quest data (e.g. index.json)
        if (!Array.isArray(entry.content) && !entry.cases) {
          console.log(`  skipped ${file} (not a quest file)`);
          continue;
        }

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
          } else {
            if (write) {
              await fs.writeFile(file, data, 'utf8');
              console.log(`  fixed ${file}`);
            }
            console.log(`✓ ${file}`);
          }
        } catch (err) {
          hasErrors = true;
          console.error(`Error parsing quest group in ${file}:`, err.stack);
        }
      } catch (err) {
        hasErrors = true;
        console.error(`Error reading file ${file}:`, err.stack);
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
  const target = ski.parse(targetStr);
  const seed = termStrs.map(s => ski.parse(s));

  const { expr } = target.infer();
  if (!expr) {
    console.error('target expression is not normalizable: ' + target);
    process.exit(1);
  }

  const gen = SKI.extras.search(seed, { tries: options.maxTries, depth: options.maxDepth }, (e, p) => {
    if (!p.expr)
      return { offset: -1 };
    if (p.expr.equals(expr))
      return { found: true, stop: true };
  });
  const t0 = Date.now();

  if (verbose) {
    const istty = process.stdout.isTTY;
    const readline = istty
      ? require('node:readline')
      : {
        clearLine: () => {
        },
        cursorTo: () => {
        }
      };

    const printProgress = (text) => {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(text + (istty ? '' : '\n'));
    }

    const elapsed = () => ((Date.now() - t0) / 1000).toFixed(2);

    let tick = true;
    const bar = setInterval(() => {
      tick = true;
    }, 300);

    const step = () => {
      const { value } = gen.next();
      if (value.expr) {
        printProgress(`// Found: [${value.gen}] ${value.probed}/${value.total} in ${elapsed()}s\n${formatExpr(value.expr)}\n`);
        clearInterval(bar);
        process.exit(0);
      }
      if (value.stop) {
        clearInterval(bar);
        printProgress(`// Nothing found: [${value.gen}] ${value.probed}/${value.total} in ${elapsed()}s\n`);
        process.exit(1);
      }
      if (tick) {
        printProgress(`// Progress: [${value.gen}] ${value.probed}/${value.total} in ${elapsed()}s`);
        tick = false;
      }
      setImmediate(step);
    }

    step();
  } else {
    let value;
    for (value of gen) {
      if (value.expr) {
        console.log(formatExpr(value.expr));
        process.exit(0);
      }
    }

    console.log('// Nothing found');
    process.exit(1);
  }
}

function extractExpression (targetStr, termStrs) {
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

  console.log(formatExpr(replaced ?? expr));
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

function readExpression (expr) {
  if (expr !== '-')
    return Promise.resolve(expr);
  return new Promise((resolve, reject) => {
    let source = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { source += chunk; });
    process.stdin.on('end', () => resolve(source.trim()));
    process.stdin.on('error', reject);
  });
}

function toInt (comment) {
  return function (str) {
    const n = Number.parseInt(str);
    if (Number.isNaN(n) || n <= 0)
      throw new Error(comment + ' requires positive integer');
    return n;
  }
}

function formatExpr (expr) {
  return declare
    ? expr.declare({ ...format, inventory: ski.getTerms() })
    : expr.format(format);
}

function questId (len = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < len; i++)
    id += chars[Math.floor(Math.random() * 62)];
  return id;
}
