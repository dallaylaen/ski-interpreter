# AUTHORING QUESTS

A **quest** is a puzzle that asks the player to find 
an expression that satisfies certain conditions. 
Quests are organized into **chapters**, 
and a set of chapters is organized into an **index**.

This project includes a [quest page](https://dallaylaen.github.io/ski-interpreter/quest.html)
with a number of quests,
but everyone can make their own!
This document describes the format of chapter files
and how to create and verify them.

## Structure

### The quest

| Field | Required | Description | Example |
|---|---|---|---|
| `id` | yes[^1] | Unique string identifier                                                                                | `"br0ingh"`                                                               |
| `name` | yes | Display name                                                                                            | "Find all the birds that sing at dawn"                                    |
| `intro` | yes | HTML description (string or array of strings). The latter will be concatenated with spaces.             | `[ "<p>Create <code>I</code>", "from <code>S</code> and <code>K</code>" ]` |
| `input` | yes | Placeholder name (string) or array of input specs                                                       | `{"name": "phi", "fancy": "&phi;" }` or just `"x"`                        
| `cases` | yes | Array of test cases, each case being itself an array: `[[...],...]`                                     | `[ [ "x K true false", "false" ], [ "x (KI) true false", "true" ] ]`      |
| `allow` | no | Restrict allowed combinators. The format is either a string of terms (uppercase lumped, lowercase space-separated) or `"-<term> ..."` to forbid term(s). | `"SK"` to only allow S and K. The `"I-I"` idiom means "no combinators at all" (e.g. the input is lambda term instead)|
| `env` | no | A list of predefined terms or variables available in the quest.                                         | `["f", "cons = BC(CI)", "nil=KI" ]`                                         |
| `hint` | no | Spoiler hint shown on demand                                                                            |
| `unlock` | no | Term name to add to the inventory when the quest is solved                                              |
| `created_at` | no[^1] | ISO 8601 timestamp of creation.                                                                         | `"2024-06-01T12:00:00Z"`                                                  |

[^1]: `id` and `created_at` can be left blank and filled in at last moment
using this command:

    ./bin/ski.js quest-lint --fix <quest-file.json>

#### Test Cases

**Reduction equality** — reduce the expression and compare to expected:
```json
["x a b", "a"]
```

**Adding options**
E.g. limit the reduction steps:
```json
[{"max" : 50}, "x x", "x" ]
```

**Property check** — verify structural properties of the reduced expression:
```json
[{"caps": {"linear": true}}, "x a b"]
```

Supported `caps` properties: `linear`, `affine`, `normal`, `proper`, `discard`, `duplicate`, `arity`.

#### Multiple Inputs

When a quest takes more than one input, set `input` to an array of input specs:

```json
"input": [
  {"name": "f", "note": "the function"},
  {"name": "x", "lambdas": true, "note": "the argument"}
]
```

Each spec can override global `allow`, `numbers`, and `lambdas` settings.

### The chapter

A chapter file contains a single object with a `content` array of quest objects:

```json
{
  "id": "unique-chapter-id",
  "name": "Chapter Name",
  "intro": [ "<p>HTML", "introduction.</p>" ],
  "content": [ /* array of quest objects described above */ ]
}
```

### The index

An index file contains a single object 
with a `chapters` array of chapter filenames:

```json
{
  "inventory": [ "S", "K", "I", "T=CI" ],
  "chapters": [
    "chapter-one.json",
    "chapter-two.json"
  ]
}
```

The inventory defaults to "SKI"; 
native combinators (BCIKSW) can just be declared
and custom terms need to be defined.

Chapter files will be loaded relative to the index files,
unless they are absolute URLs.

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

To load chapters from an index file instead, use `loadFromIndex`. 

```js
page.loadFromIndex('index.json');
```

## Verifying Quests

Run the checker against your chapter file:

```sh
./bin/ski.js quest-lint my-quests.json
```

This validates metadata, checks for duplicate IDs, and verifies that any known solutions pass all cases.

## Further Reading

- Examples: [html file](example/mini-quest.html) and [json file](example/example-quests.json)
- Core logic: [src/quest.ts](src/quest.ts)
- Rendering logic: [site-src/quest.js](site-src/quest.js)
