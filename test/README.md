# Test structure

All unit tests are written in native TypeScript and live under `unit/`,
grouped into the categories below. Please put new tests into one of these
categories, or create a new one and document it here:

* `unit/core` - required to boot the module, or to run other tests
* `unit/edge-cases` - edge cases and incorrect inputs
* `unit/eval` - tests based on code samples and snippets
* `unit/extras` - extra features not in the core
* `unit/manage` - operations on the parser object: adding/removing terms, restricting, save/load etc.
* `unit/quest` - quests
* `unit/transform` - SKI<->Lambda, fancy formatting, and tree traversals
* `integration` - end-to-end tests (e.g. the `bin/ski.js` CLI), run separately via `npm run test:int`
* `REAMDE.md` - this file

