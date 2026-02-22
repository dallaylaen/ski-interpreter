# Creating Custom Quest Pages

This guide explains how to create your own combinatory logic quest page using the SKI Interpreter. The quest system allows you to build interactive educational experiences where users solve combinatory logic problems and progressively unlock new combinators.

## Overview

A quest page consists of three main components:

1. **HTML Page** - The visual interface that displays quests
2. **Index File** (JSON) - Lists which quest chapters to load
3. **Quest Data Files** (JSON) - Contains individual chapters with quests

The system uses the `QuestPage` class from `site-src/quest.js` to manage the entire experience, including progress tracking, term unlocking, and result verification.

## Quick Start

### Basic Architecture

```
my-quests/
├── index.html          # Your quest page HTML
├── quests/
│   ├── index.json      # Lists all chapters to load
│   ├── 01-intro.json   # First chapter
│   └── 02-advanced.json # Second chapter
└── css/                # Optional: custom styles
```

## HTML Page Template

Create an HTML file that serves as your quest page interface. The minimal setup requires:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8"/>
    <title>My Custom Quests</title>
    <link rel="shortcut icon" type="image/png" href="img/ski-64.png">
    <!-- Required scripts from the package -->
    <script src="build/js/ski-quest.min.js"></script>
    <script src="build/js/util.min.js"></script>
    <!-- Styling -->
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/quest.css">
    <style>
        body {
            height: 100vh;
            padding: 0;
            margin: 0;
            display: grid;
            grid-template-columns: 15fr 70fr 15fr;
            grid-template-rows: auto 1fr auto;
            grid-template-areas:
                "header header header"
                "chapters main inventory"
                "footer footer footer";
        }
    </style>
</head>
<body>
    <!-- Header -->
    <header id="top" class="layout" style="grid-area: header;">
        <div class="float-left"><span id="menu" class="big">&#9776;</span></div>
        <h1>My Combinatory Logic Quests</h1>
    </header>

    <!-- Left sidebar: chapter list -->
    <div class="side pane layout" style="grid-area: chapters;">
        <div class="content-table" id="chapterlist"></div>
    </div>

    <!-- Main content area: quests -->
    <div class="pane" id="quest" style="grid-area: main;"></div>

    <!-- Right sidebar: inventory of unlocked terms -->
    <div class="side pane" style="grid-area: inventory;">
        <div class="ski-quest-inventory ski-quest-box">
            <h3>Inventory</h3>
            <dl id="known" class="term-list"></dl>
        </div>
    </div>

    <!-- Footer -->
    <footer class="layout" id="bottom" style="grid-area: footer; text-align: center; font-size: smaller;">
        <div>&copy; 2026 Your Name</div>
    </footer>

    <script>
        // Get custom index URL from query parameter, or use default
        const custom = new URLSearchParams(window.location.search).get('index');
        const indexUrl = custom ?? 'quests/index.json';
        const baseUrl = custom ? custom.slice(0, custom.lastIndexOf('/') + 1) : 'quests/';

        // Get page elements
        const view = util.grabView('quest', 'known', 'chapterlist', 'menu');
        const linkedTo = window.location.hash.slice(1);

        // Initialize hamburger menu
        function initMenu() {
            const menu = new Hamburger(view.menu);
            menu.addAction('<span class="danger">&cross; erase progress</span>', () => {
                if (confirm('Are you sure you want to start over?')) {
                    page.demolish();
                    window.location.reload();
                }
            });
        }

        initMenu();

        // Create and initialize the quest page
        const page = new QuestPage({
            storePrefix: 'my-quests',  // localStorage key prefix
            baseUrl: baseUrl,
            indexBox: view.chapterlist,
            contentBox: view.quest,
            inventoryBox: view.known,
        });

        // Load quests from index and handle hash links
        page.loadFromIndex(indexUrl, linkedTo, () => {
            console.log('Quests loaded successfully');
        });
    </script>
</body>
</html>
```

## Quest Index File

The index file (`quests/index.json`) is a simple array of chapter file paths, relative to the `baseUrl`:

```json
[
    "01-intro.json",
    "02-advanced.json",
    "03-expert.json"
]
```

You can also provide chapter metadata directly in the index if needed. See the `loadChapters` method in `site-src/quest.js:117` for details.

## Quest Chapter Format

Each chapter file contains metadata and a list of quests. Basic structure:

```json
{
    "id": "chapter-intro",
    "name": "Introduction to Combinators",
    "intro": [
        "<p>Welcome to combinatory logic!</p>",
        "<p>This chapter covers the basics.</p>"
    ],
    "content": [
        { /* quest 1 */ },
        { /* quest 2 */ }
    ]
}
```

### Chapter Properties

- **id** (string, optional): Unique chapter identifier used in HTML anchors
- **name** (string, optional): Chapter title displayed in the UI
- **intro** (string or string[], optional): Introduction text (strings are joined with spaces)
- **content** (array): List of quest objects

## Quest Specification

Each quest object specifies a problem, test cases, and constraints. Here's the complete structure:

```json
{
    "id": "unique-quest-id",
    "created_at": "2024-01-01T00:00:00",
    "name": "Quest Name",
    "intro": [
        "<p>Problem description goes here.</p>",
        "<p>You can use HTML formatting.</p>"
    ],
    "input": "phi",
    "cases": [
        ["phi x", "x"],
        ["phi (K x) y", "y"]
    ],
    "allow": "SK",
    "env": ["x", "y"],
    "unlock": "I",
    "hint": "Try using S and K together.",
    "solution": "SKK"
}
```

### Quest Properties

#### Required

- **input** (string or object): Input placeholder name or specification
  - String: Simple input name, e.g., `"phi"`
  - Object: `{ name: "phi", fancy: "&phi;", allow: "SKI" }`

- **cases** (array): Test cases to verify solutions
  - Each case is `[inputExpression, expectedOutput]`
  - Optional: `[{max: stepLimit}, inputExpression, expectedOutput]`
  - Advanced: `[{caps: {...}, max: stepLimit}, inputExpression]` with capability checking

#### Optional

- **id** (string): Unique quest identifier for progress tracking
- **name** (string): Quest title
- **intro** (string or string[]): Problem description (HTML-safe)
- **allow** (string): Allowed combinators for the solution
  - Examples: `"SK"`, `"SKI"`, `"BCKW"`
  - Restrictions are enforced by the validation engine
  - If not specified, all unlocked terms are allowed

- **env** (string[]): Pre-defined variables/terms available in the quest
  - These become free variables that persist across test cases
  - Example: `["x", "y"]` makes `x` and `y` available
  - Common in higher-order function problems

- **unlock** (string): Combinator name to unlock when quest is solved
  - Example: `"M"` unlocks the Mockingbird combinator
  - Unlocked terms are saved and available for future quests

- **hint** (string): Spoiler text revealed when user clicks
- **solution** (string): The correct solution (not transmitted to browser, used for validation)
- **numbers** (boolean): Allow numeric literals in input (default: false)
- **lambdas** (boolean): Allow lambda expressions in input (default: false)

### Test Cases Detailed

Simple case:
```json
["phi x", "x"]
```
Means: when `phi` is applied to `x`, the result should be `x`.

With step limit:
```json
[{"max": 100}, "phi x y z", "f(x,y,z)"]
```
Limits computation to 100 steps maximum.

Advanced with capabilities:
```json
[{
    "caps": {
        "linear": true,
        "duplicate": true,
        "arity": 2
    },
    "max": 50
}, "phi x y", "y x"]
```
Checks that the solution has specific combinatory properties.

## Input Specifications

Simple input (single variable):
```json
"phi"
```

Multiple inputs:
```json
["f", "g", "x"]
```

With display customization:
```json
{
    "name": "phi",
    "fancy": "&phi;",
    "allow": "SKI"
}
```

The `fancy` property is used for display in the UI. The `allow` property restricts what combinators can be used in this specific input field.

## Core System Architecture

### QuestPage (site-src/quest.js:37)
Manages the entire quest page lifecycle:
- Loads chapters from index files
- Manages the shared engine and store
- Handles progress persistence
- Coordinates unlocking of new terms

### QuestChapter (site-src/quest.js:379)
Represents a collection of related quests:
- Fetches chapter data from JSON
- Draws chapter headers and collapsible sections
- Tracks progress within the chapter
- Manages unlocking callbacks

### QuestBox (site-src/quest.js:180)
Individual quest UI and logic:
- Renders quest title, description, input fields, and submit button
- Validates user solutions via `SKI.Quest.check()`
- Displays results with step counts and pass/fail status
- Saves progress to localStorage

### SKI.Quest (src/quest.js)
Core validation engine:
- Parses user input with `engine.parse()`
- Evaluates against test cases
- Handles capability restrictions (linear, affine, etc.)
- Returns detailed result information

### Store (site-src/store.js)
LocalStorage wrapper for persistence:
- Saves/loads engine state (unlocked combinators)
- Saves/loads quest progress per quest ID
- Uses a prefix for namespacing (e.g., `"quest-my-quests"`)

## Styling and Customization

The quest system uses CSS classes for styling. Key classes you can customize:

- `.ski-quest-box` - Individual quest container
- `.ski-quest-chapter` - Chapter container
- `.ski-quest-chapter-content` - Quest list within a chapter
- `.ski-quest-index` - Chapter list sidebar
- `.ski-quest-inventory` - Inventory display
- `.ski-quest-display` - Results display area
- `.ski-quest-input` - Input area for solutions
- `.ski-quest-hint` - Hint text

See `site-src/quest.js:8-35` for all CSS class documentation.

## Progress Persistence

Progress is automatically saved to the browser's `localStorage` using the `storePrefix` you provide:

```javascript
const page = new QuestPage({
    storePrefix: 'my-quests',  // Saves to localStorage with "my-quests-" prefix
    // ...
});
```

When a quest is solved:
1. The quest status is saved (solved: true, steps, attempts, etc.)
2. Any unlocked combinator is added to the engine
3. The engine state is persisted
4. The inventory display updates

To reset all progress, users can click "erase progress" or call `page.demolish()`.

## Loading Custom Quests via URL

Your quest page can load custom quest files via query parameter:

```
my-page.html?index=https://example.com/custom-quests/index.json
```

The `baseUrl` is automatically calculated from the `index` URL path. This allows users to share custom quest sets without modifying your HTML.

## Advanced: Custom Engine Configuration

For specialized quest sets, you can provide a pre-configured engine:

```javascript
const customEngine = new SKI({
    annotate: true,
    allow: 'BCKW'  // Restrict to these combinators initially
});

const page = new QuestPage({
    engine: customEngine,
    // ...
});
```

See `src/parser.js` for SKI constructor options.

## Common Patterns

### Multi-Step Problem Series

Create multiple quests where each one unlocks a new combinator needed for the next:

```json
{
    "id": "q1",
    "name": "First Step",
    "intro": "Build X using S and K",
    "allow": "SK",
    "solution": "SKK",
    "unlock": "I",
    "input": "phi",
    "cases": [["phi x", "x"]]
}
```

Then the next quest can use `I` in the `allow` field.

### Higher-Order Functions

Use the `env` field to pass functions as parameters:

```json
{
    "name": "Compose Functions",
    "env": ["f", "g"],
    "input": "compose",
    "cases": [
        ["compose f g x", "f (g x)"]
    ],
    "allow": "SK"
}
```

### Capability-Based Validation

Ensure solutions have specific properties:

```json
{
    "name": "Linear Combinator",
    "input": "phi",
    "cases": [
        [{
            "caps": {"linear": true},
            "max": 100
        }, "phi x", "..."]
    ]
}
```

## Troubleshooting

### Quests Not Loading
- Check browser console for fetch errors
- Verify JSON files are valid JSON
- Ensure `baseUrl` points to the correct directory
- Check CORS if loading from different origin

### Solutions Not Passing
- Verify test cases use correct syntax (see `intro.html`)
- Check if required combinators are in `allow` field
- Test solution manually in the playground (`index.html`)
- Ensure free variables in cases don't clash with input names

### Progress Not Saving
- Check if localStorage is enabled in browser
- Verify no other code is clearing localStorage
- Confirm `storePrefix` is unique across different quest sets

### Styling Issues
- Ensure `css/main.css` and `css/quest.css` are loaded
- Check for conflicting CSS rules
- Use inspector to identify which class is being applied

## Complete Example Files

See the example files included with this guide:
- `example-quest.html` - Complete working HTML page
- `example-quests.json` - Sample quests with detailed comments

These files can serve as templates for your own quest sets.

## Resources

- **SKI Interpreter Playground**: `index.html` - Test expressions and explore combinators
- **Introduction**: `intro.html` - Tutorial on SKI combinator syntax and evaluation
- **Default Quests**: `docs/quest-data/` - Complete example quest sets
- **Wikipedia**: [Combinatory Logic](https://en.wikipedia.org/wiki/Combinatory_logic)
- **Book**: "To Mock a Mockingbird" by Raymond Smulyan

## API Reference

### QuestPage Methods

- `loadFromIndex(indexUrl, linkedTo?, onLoad?)` - Load quests from index file
- `loadChapters(list)` - Load chapters from list
- `onUnlock(term)` - Handle unlocked combinator
- `showKnown()` - Update inventory display
- `demolish()` - Clear all progress

### QuestBox Methods

- `check()` - Validate solution against test cases
- `load()` - Load progress from storage
- `save()` - Save progress to storage
- `draw(element)` - Render quest UI

### QuestChapter Methods

- `fetch()` - Load chapter data from URL
- `draw()` - Render chapter UI
- `getProgress()` - Get solved/total stats
- `addLink(element)` - Add chapter to index

## License

The SKI Interpreter and quest system are open source. See the LICENSE file in the repository.
