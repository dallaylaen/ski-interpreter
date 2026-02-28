#!/usr/bin/env -S node --stack-size=20600

const fs = require('node:fs/promises');
const { Command } = require('commander');

const { SKI } = require('../lib/ski-interpreter.cjs');
const { Quest } = require('../src/quest.js');

const program = new Command();

program
  .name('ski')
  .description('Simple Kombinator Interpreter - a combinatory logic & lambda calculus parser and interpreter')
  .version('2.2.1');

// REPL subcommand
program
  .command('repl')
  .description('Start interactive REPL')
  .option('--verbose', 'Show all evaluation steps')
  .action((options) => {
    startRepl(options.verbose);
  });

// Eval subcommand
program
  .command('eval <expression>')
  .description('Evaluate a single expression')
  .option('--verbose', 'Show all evaluation steps')
  .action((expression, options) => {
    evaluateExpression(expression, options.verbose);
  });

// File subcommand
program
  .command('file <filepath>')
  .description('Evaluate expressions from a file')
  .option('--verbose', 'Show all evaluation steps')
  .action((filepath, options) => {
    evaluateFile(filepath, options.verbose);
  });

// Search subcommand
program
  .command('search <target> <terms...>')
  .description('Search for an expression equivalent to target using known terms')
  .action((target, terms) => {
    searchExpression(target, terms);
  });

// Extract subcommand
program
  .command('extract <target> <terms...>')
  .description('Rewrite target expression using known terms where possible')
  .action((target, terms) => {
    extractExpression(target, terms);
  });

// Quest-check subcommand
program
  .command('quest-check <files...>')
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
  startRepl(false);

function startRepl (verbose) {
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
        processLine(str, ski, verbose, err => {
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

function evaluateExpression (expression, verbose) {
  const ski = new SKI();
  processLine(expression, ski, verbose, err => {
    console.error('' + err);
    process.exit(3);
  });
}

function evaluateFile (filepath, verbose) {
  const ski = new SKI();
  fs.readFile(filepath, 'utf8')
    .then(source => {
      processLine(source, ski, verbose, err => {
        console.error('' + err);
        process.exit(3);
      });
    })
    .catch(err => {
      console.error('ski: ' + err);
      process.exit(2);
    });
}

function processLine (source, ski, verbose, onErr) {
  if (!source.match(/\S/))
    return; // nothing to see here

  try {
    const expr = ski.parse(source);
    const t0 = new Date();
    const isAlias = expr instanceof SKI.classes.Alias;
    const aliasName = isAlias ? expr.name : null;

    for (const state of expr.walk()) {
      if (state.final)
        console.log(`// ${state.steps} step(s) in ${new Date() - t0}ms`);

      if (verbose || state.final)
        console.log('' + state.expr.format());

      if (state.final && isAlias && aliasName)
        ski.add(aliasName, state.expr);
    }
  } catch (err) {
    onErr(err);
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
    console.error('Error in quest-check:', err.message);
    process.exit(2);
  }
}

function searchExpression (targetStr, termStrs) {
  const ski = new SKI();
  const jar = {};
  const target = ski.parse(targetStr, { vars: jar });
  const seed = termStrs.map(s => ski.parse(s, { vars: jar }));

  const { expr } = target.infer();
  if (!expr) {
    console.error('target expression is not normalizable: ' + target);
    process.exit(1);
  }

  const res = SKI.extras.search(seed, { tries: 10_000_000, depth: 100 }, (e, p) => {
    if (!p.expr)
      return -1;
    if (p.expr.equals(expr))
      return 1;
    return 0;
  });

  if (res.expr) {
    console.log(`Found ${res.expr} after ${res.total} tries.`);
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
    .map(e => [e.infer().expr, e]);

  const uncanonical = pairs.filter(pair => !pair[0]);
  if (uncanonical.length) {
    console.error('Some expressions could not be canonized: '
      + uncanonical.map(p => p[1].toString()).join(', '));
    process.exit(1);
  }

  const replaced = expr.traverse(e => {
    const canon = e.infer().expr;
    for (const [lambda, term] of pairs) {
      if (canon.equals(lambda))
        return term;
    }
    return null;
  });

  if (replaced)
    console.log(replaced.toString());
  else
    console.log('// unchanged');
}

function handleCommand (input, ski) {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0];

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
    '!help': () => {
      console.log('Available commands:');
      console.log('  !ls    - List term inventory');
      console.log('  !help  - Show this help message');
    },
    '': () => {
      console.log(`Unknown command: ${cmd}`);
      console.log('Type !help for available commands.');
    }
  };

  (dispatch[cmd] || dispatch[''])(...parts.slice(1));
}
