# task-constructor

Standalone test/task builder prototype for NOKJ Academy. The real test builder
lives in `frontend/scripts/modules/tests.js`; this directory holds tooling and
a standalone page for building question sets offline.

## What it does

`index.html` is a self-contained page (inline HTML/CSS/JS, no external
libraries) for authoring questions and exporting them as a JSON array.

The JSON matches the app's question shape `{ id, type, question, options,
correct }` exactly, so a built question set can be pasted straight into the
SPA's tests store.

## Supported question types

- `multiple-choice` - four options with one correct answer
- `true-false` - True/False options and a correct answer
- `short-answer` - free-text question, optional expected answer

## Usage

1. Open `index.html` in a browser.
2. Add questions, edit, and delete as needed.
3. Export JSON and paste it into the app's tests store.
4. Import JSON to load an existing question set back in.