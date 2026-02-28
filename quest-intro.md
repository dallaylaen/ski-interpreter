# CREATING QUESTS

A **quest** is a puzzle that asks the player to find an expression that satisfies certain conditions. Quests are organized into **chapters**, which can be loaded in the browser or verified with the command-line checker.

This project includes a [quest page](https://dallaylaen.github.io/ski-interpreter/quest.html) with a number of quests but everyone can make their own! This document describes the format of chapter files and how to create and verify them.

## Structure

A chapter file contains a single object with a `content` array of quest objects:

```json
{
  "id": "unique-chapter-id",
  "name": "Chapter Name",
  "intro": "<p>HTML introduction.</p>",
  "content": [ ...quests ]
}
```

Each quest has:

| Field | Required | Description |
|---|---|---|
| `id` | yes | Unique string identifier |
| `name` | yes | Display name |
| `intro` | yes | HTML description (string or array of strings) |
| `input` | yes | Placeholder name (string) or array of input specs |
| `cases` | yes | Array of test cases |
| `allow` | no | Restrict allowed combinators, e.g. `"SK"` or `"I-I"` |
| `hint` | no | Spoiler hint shown on demand |
| `unlock` | no | Term name to add to the inventory when solved |

## Test Cases

**Reduction equality** — reduce the expression and compare to expected:
```json
["x a b", "a"]
```

**Property check** — verify structural properties of the reduced expression:
```json
[{"caps": {"linear": true}}, "x a b"]
```

Supported `caps` properties: `linear`, `affine`, `normal`, `proper`, `discard`, `duplicate`, `arity`.

## Multiple Inputs

When a quest takes more than one input, set `input` to an array of input specs:

```json
"input": [
  {"name": "f", "note": "the function"},
  {"name": "x", "lambdas": true, "note": "the argument"}
]
```

Each spec can override global `allow`, `numbers`, and `lambdas` settings.

## Loading in the Browser

See `example/quest.html` for a minimal setup. The key call is:

```js
const page = new QuestPage({
  storePrefix: 'my-quests',
  baseUrl: '.',
  contentBox: document.getElementById('quest'),
  inventoryBox: document.getElementById('known'),
});
page.loadChapters(['my-quests.json']);
```

## Verifying Quests

Run the checker against your chapter file:

```sh
./bin/ski.js quest-check my-quests.json
```

This validates metadata, checks for duplicate IDs, and verifies that any known solutions pass all cases.

## Further Reading

- Examples: [html file](example/quest.html) and [json file](example/example-quests.json)
- Core logic: [src/quest.js](src/quest.js)
- Rendering logic: [site-src/quest.js](site-src/quest.js)


