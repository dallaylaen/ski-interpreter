# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### BREAKING CHANGES

- Rename `guess()` to `infer()` for clarity
- Remove `replace()` method, use `subst()` or `traverse()` instead;
- Rename `rewriteSKI` to `toSKI`, `lambdify` to `toLambda` for clarity and consistence;
- Remove `getSymbols()` method. Partially replaced by traverse();
- Remove `freeVars()` method (enumeration of vars is problematic with current scope impl)
- Remove `contains()` method, use `any(e=>e.equals(other))` instead;
- Remove `Expr.hasLambda()`, use `any(e => e instanceof Lambda)` instead;
- Remove `postParse()` method (did nothing anyway and was only used in the parser)
- Replace `parse(src, jar, options)` with `parse(src, options = { ..., env: jar })`
- Remove global `SKI.options`
- Remove `SKI.free()`, use `const {x, y} = SKI.vars()` instead

### Added

- `expr.traverse(transform: Expr->Expr|null): Expr|null` for term traversal and replacement
- `expr.any(predicate: Expr->boolean)` method for matching expressions
- expr.diff(expr2) shows exactly where the terms begin differing (or returns null)
- Parse now has 2 arguments: `ski.parse(src, options={})`
  - All `parse()` arguments are now immutable
  - Passing extra terms: `ski.parse(src, { env: { myterm } })`
  - Variable scope restriction: `ski.parse('x(y)', { scope: myObject })`
- `SKI.vars(context)` returns a magic proxy for variable declarations
- Added semi-official `Named.fancyName` property
- `@typedef QuestResult` for better type definitions

### Changed

- `guess()` renamed to `infer()` with improved semantics
- Parsing without context produces global free vars
- Better variable handling with scope/context distinction
- Quest system now uses `diff()` instead of `equals()` for more detailed comparisons
- Improved quest failure details display

### Fixed

- Better display of discrepancies in guess tests
- Various test fixes and improvements
- Removed unused freevar mentions from quest.html

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


