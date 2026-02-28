# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-02-28

### BREAKING CHANGES

- `ski.js` CLI interface changed (see below)
- Quest page css changes (see below)
- `diag()` does not indent `Alias` to reduce diffs
- Swapped `Expr.expect()` arguments: expected.expect(actual).
Mnemonic: expected is always an expr, actual may be whatever.

### Added

- `Quest.Group` class and `Quest.verify()` for quest self-check capability.
- `Quest.selfCheck({ accepted: ..., rejected: ... })` replaces the homegrown `solution` mechanism.
- `{order: LI|LO}` option to `Expr.traverse()` for left-innermost / left-outermost traversal order.
- `FreeVar.global` constant as an explicit replacement for the `context=SKI` convention.
- `TermInfo` typedef for `infer()` results.
- CLI (`bin/ski.js`) rewritten with `commander`, now supports subcommands: `repl`, `eval`, `file`, `quest-check`.
- Quest authoring guide added to docs.
- `expr.expect(actual)` now returns `diag()` as -actual / +expected.

### Fixed

- `infer()` now limits recursion depth to prevent stack overflows (#10).
- Alias indentation in `diag()` output corrected.
- Quest page links fixed after previous rewrite.
- Aliases are no longer canonized without an explicit request.

### Changed

- `toLambda()` and `toSKI()` rewritten using left-innermost traverse.
- `Church` is now a descendant of `Expr` instead of `Native` (minor speedup).
- `Expr.constructor` removed for a minor speedup.
- `parser.add()` now accepts an options object in place of a plain note string.
- Quest solutions moved to `data/quest-solutions.json`; removed from quest-data.
- Quest nav items use stable `.ski-quest-nav-item` class instead of fragile `.ski-quest-index a`.

## [2.2.1] - 2026-02-22

### Added

- `Expr.diag()` outputs an expression as an indented tree (breadth-first) with class names and variables labeled for deduplication.
- `lib/ski-quest.min.js` bundle to create quest pages.
- The [playground](https://dallaylaen.github.io/ski-interpreter/playground.html) gets history!

### Fixed

- Greatly improved type definitions.
- Quests calculate solution complexity via `fold()`.

## [2.2.0] - 2026-02-14

### BREAKING CHANGES

- Remove `Expr.declare()` method for good, use `toposort()` or static `declare` instead

### Added

- `SKI.extras.toposort(list, env)` function to output named terms in dependency order
- `SKI.extras.declare(term, {env})` function for term declarations
- `Expr.unroll()` method to get a list of terms
that give the initial expression when applied
from left to right: `((a, b), (c, d)) => [a, b, (c, d)]`
- Parser: Support for chained assignments (`'foo=bar=baz'` expressions)
- Parser: Support for multi-line comment syntax (`/* comments */`)
- `SKI_REPL=1 node -r @dallaylaen/ski-interpreter` will now start a REPL with the `SKI` class available globally.

### Changed

- Parser improvements and bug fixes for variable handling
- `expand()` method refactored to use `traverse()`
- Package now builds both CJS and ESM bundles.
- Moved source from `lib/` to `src/` directory

## [2.1.0] - 2026-02-12

### BREAKING CHANGES

- Quest: rename `vars` -> `env`, `title` -> `name`, and `descr` -> `intro`.
- Quest: remove `subst` for good, use input: `{ name, fancy }` instead
- App: remove `split()` method, use `foo.fun` and `foo.arg` directly or better yet `foo.unroll()` instead.

### Added

- `SKI.extras.search(seed: Expr[], options:{...}, predicate: (e: Expr, props: infer()) => 1|0|-1)` that brute forces all possible applications of `seed` (with some heuristics) returns the first matching expr (if can)
- Add experimental `Expr.fold<T>(initial : T, combine: (acc : T, expr) => T?)` that folds an expression tree in LO order. Composite nodes are first checked as is and then descended into. If `combine` returns null, it is discarded and the previous value is kept.
- Add `SKI.control.{descend, prune, stop}` helper functions for more precise `fold` control.
- Add optional `Expr.context{ parser, scope, env, src }` which is filled by the parser.
- Add `SKI.extras.deepFormat({}|[]|Expr|..., options={})` that recursively formats a deep structure with given options, leaving non-Expr values as is. Useful for debugging.
- Add `Expr.toJSON()`, currently just `format()` with no options
- Add `Expr.unroll()` that returns a list of terms
that give the initial expression when applied
from left to right: `((a, b), (c, d)) => [a, b, (c, d)]`

## [2.0.0] - 2026-02-06

### BREAKING CHANGES

- Rename `guess()` to `infer()` for clarity;
- Remove `replace()` method, use `subst()` or `traverse()` instead;
- Rename `rewriteSKI` to `toSKI`, `lambdify` to `toLambda` for clarity and consistence;
- Remove `getSymbols()` method. Partially replaced by traverse();
- Remove `freeVars()` method (enumeration of vars is problematic with current scope impl);
- Remove `contains()` method, use `any(e=>e.equals(other))` instead;
- Remove `Expr.hasLambda()`, use `any(e => e instanceof Lambda)` instead;
- Remove `postParse()` method (did nothing anyway and was only used in the parser);
- Replace `parse(src, jar, options)` with `parse(src, options = { ..., env: jar })`;
- Remove global `SKI.options`;
- Remove `SKI.free()`, use `const {x, y} = SKI.vars()` instead.

### Added

- `expr.traverse(transform: Expr->Expr|null): Expr|null` for term traversal and replacement;
- `expr.any(predicate: Expr->boolean)` method for matching expressions;
- expr.diff(expr2) shows exactly where the terms begin differing (or returns null);
- Parse now has 2 arguments: `ski.parse(src, options={})`:
  - All `parse()` arguments are now immutable;
  - Passing extra terms: `ski.parse(src, { env: { myterm } })`;
  - Variable scope restriction: `ski.parse('x(y)', { scope: myObject })`;
- `SKI.vars(scope?)` returns a magic proxy for variable declarations;
- Added semi-official `Named.fancyName` property
- `@typedef QuestResult` for better type definitions.

### Changed

- Parsing without context produces global free vars;
- Better variable handling with scope/context distinction;
- Quest system now uses `diff()` instead of `equals()` for more detailed comparisons.

## [1.3.0] - 2026-01-25

### BREAKING CHANGES

- Remove `Expr.reduce()` method for good (too ambiguous). See also `Expr.invoke()` below.
- Remove `onApply` hook from `Native` combinators.

### Added

- Expr: Add `invoke(arg: Expr)` method implementing actual rewriting rules.
- SKI: `add(term, impl, note?)` method now accepts a function as `impl` to define native combinators directly.
- Improved jsdoc somewhat.

## [1.2.0] - 2025-12-14

### BREAKING CHANGES

- Remove `toString()` options, use `format()` instead.
- Make `needsParens()` private (should've been to begin with)
- Remove unused `renameVars()` method.
- Remove Expr.`toJSON()`

### Added

- SKI: `toJSON()` now recreates declarations exactly, preserving named subexpressions.
- SKI: `declare()` / `bulkAdd()` methods to export/import term definitions.
- Expr: `format(options?)` method for pretty-printing expressions with various options: html, verbosity, custom lambdas, custom brackets etc.
- Expr: `subst(find, replace)` now works for any type of find  except application and lambdas.
- Playground: permalinks now use #hash instead of a ?query string. (Old links still supported).
- Playground: togglable frames around subexpressions & variable/redex highlighting.

## [1.1.0] - 2025-12-07

### BREAKING CHANGES

- Expr: canonize() renamed to guess(), output semantics changed
  & returns nothing for non-normalizable terms.
  Always check `result.normal` to be true.
- Expr: wantsArgs() removed.
- Quest: LinearCase class replaced with PropertyCase
  supporting boolean properties `normal`, `proper`, `discard`, `duplicate`,
  `linear`, and `affine`, and numeric `arity`.

### Added
- Expr: guess() method to normalize terms.
  Returns an object with `normal`: boolean and `steps`:
  number properties, as well as optional `expr`: Expr -
  equivalent lambda expression; `arity`: number,
  and other properties.
- Expr: replace(terms: Expr[], options: {}) replaces
  subtrees with matching canonical form (if they have one).
- Expr: expect(expr: Expr, comment: string?) now handles coments like proper assertion.
- Quest: PropertyCase class for matching based on term properties.
- Proper changelog
- Lots of new quests at https://dallaylaen.github.io/ski-interpreter/quest.html

### Fixed
- Expr: equals() and expect() handle aliases correctly.
- Expr: run() always executes at least 1 step.
- Quest: improve typedefs
- package.json: rely on `npx` instead of handwritten scripts, improve dev dependencies.

## [1.0.1] - 2025-07-18

### Fixed

- README.md

## [1.0.0] - 2025-07-18

### Added

- Parser
    - B, C, I, K, S, W
    - Church numerals
    - Lambdas as `x -> expr`
    - Declare new terms `foo = expr`
- Quest engine
- Basically everything


