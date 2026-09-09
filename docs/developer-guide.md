# Lazy Naming — Developer Guide

Everything a contributor needs beyond the user-facing instructions in the README: running the extension during development, automated tests, and the manual verification checklist.

## Prerequisites

- Node.js 20+
- npm
- VSCode
- [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) extension (required at runtime, not for development)

## Setup

```bash
npm install
```

## Run in the Extension Development Host

1. Open this repository in VSCode.
2. Press `F5` (or run the **Run Extension** launch configuration).
3. The launch config uses `--extensionDevelopmentPath=${workspaceFolder}` and loads your installed extensions, so the TypeScript workspace and any language extensions you have (e.g. `redhat.java`) work as in a normal window.

Both commands work at two scopes:

- **Selected symbol** — select a function/variable/class, right-click, and both commands appear (the commands are shown when text is selected).
- **Whole file** — right-click a file in the Explorer and choose either command, or run them from the Command Palette with no selection (they act on the active document) and pick symbols from the checkbox list.

Debugging: the pre-release `lazyNaming.debugLm` command was removed for the 0.0.1 release. Use the real commands now; LM errors surface in notification dialogs.

## Automated tests

Unit tests (no VSCode host needed, pure logic only):

```bash
npm run compile
npm test
```

Integration tests (launch a real VSCode instance via `@vscode/test-electron`, no Copilot needed):

```bash
npm run compile-tests
npm run test:integration
```

## Manual verification

Perform these flows in the Extension Development Host with GitHub Copilot active and signed in. Use a workspace with at least one TypeScript, Python, and Java file. The `test/fixtures/` directory provides `sample.ts`, `sample.py`, and `sample.java`.

### Suggest Rename — happy path

1. Open `test/fixtures/sample.ts` and select the word `calculateTotal` (double-click it).
2. Right-click → **Lazy Naming: Suggest Rename**.
3. Optionally enter up to 200 characters of context and press Enter (or press Enter to skip).
4. A Quick Pick shows 3–6 candidate names (filtered to the configured naming style). Pick one.
5. A **Refactor Preview** opens (side-by-side) listing the planned renames — `calculateTotal` is defined at line 9 and referenced at lines 15, 19, 30, 42.
6. Click **Apply** in the preview. Verify the symbol was renamed everywhere.

### Suggest Rename — user cancels at Quick Pick

Complete the happy path through the Quick Pick, then press Escape instead of selecting a suggestion. Verify that no changes are made to any file.

### Suggest Rename — naming style respected

Add a `.vscode/lazy-naming.json` file with `"namingStyle": { "class": "PascalCase", "method": "camelCase", "variable": "snake_case" }`. Repeat the happy path. Verify the suggestions for a method are camelCase, for a variable snake_case, and for a class PascalCase.

### Suggest Rename — multi-symbol order (class last)

When renaming a class together with its methods or variables in one file (e.g. a Java file), verify that methods and variables are renamed first and the class last. Renaming a class in Java renames the file itself, so it must be the final step or later renames lose track of the file. Package and file declarations never appear in the symbol list.

### Suggest Rename — Python (selected symbol)

Open `test/fixtures/sample.py` and select `compute_discount`. Run **Suggest Rename**, choose a candidate, apply the preview. Verify `compute_discount_for` and `apply_discount` now call the new name. Note: whole-file Python needs the `ms-python.python` extension installed.

### Suggest Rename / Generate Description — whole file

Right-click `test/fixtures/sample.ts` in the Explorer → either command. A checkbox list shows the file's symbols (excluding package/file declarations), pre-checked. Press Enter, optionally provide context, then confirm in the Refactor Preview. For Suggest Rename, methods/variables are renamed before classes.

### Generate Description — TypeScript (JSDoc)

1. Open `test/fixtures/sample.ts` and select `calculateTotal`.
2. Right-click → **Lazy Naming: Generate Description**, optionally add context.
3. The **Refactor Preview** shows a JSDoc block inserted immediately above `calculateTotal`, with `@param` and `@returns` entries at column 0.
4. Click **Apply** and verify the comment.

### Generate Description — Python and Java

- Python: select `compute_discount` in `test/fixtures/sample.py` → verify a triple-quoted docstring is inserted directly above `def compute_discount` at column 0.
- Java: select `calculateTotal` in `test/fixtures/sample.java` → verify a Javadoc block above the method, indented 2 spaces to match.

### Generate Description — existing docstring is replaced, not duplicated

Add a JSDoc comment above `calculateTotal` in `sample.ts` and save. Run **Generate Description** again. The preview replaces the old comment — no duplicate block.

### Whole-file docstrings — single combined preview

Right-click `test/fixtures/sample.java` → **Generate Description**, check the class and both methods. All selected docstrings appear in **one** Refactor Preview, each correctly indented, no interleaving.

### Error handling

- **Copilot not available**: disable GitHub Copilot, trigger either command. You see a clear error explaining GitHub Copilot is required, no unhandled exception or empty dialog.
- **No selection**: running a command from the palette with no selection starts whole-file mode (symbol checkbox list). With no editor open, a message asks you to open a file and select a symbol first.
- **No language service**: whole-file on a `.py` file without the Python extension warns and suggests installing it. Languages with a built-in service (TypeScript/JavaScript, CSS, HTML, JSON, Markdown) never get this hint.

## Regression checklist

Before each release, verify:

- Both commands appear in the context menu only when text is selected (editor context) and on every non-folder file (Explorer context).
- The extension activates without error with no `.vscode/lazy-naming.json` and with a fully populated one.
- No changes are written to disk at any point without first going through Refactor Preview.
- Cancelling at any input step (context input box, Quick Pick, Refactor Preview) leaves all files unchanged.
- The extension produces no console errors or unhandled promise rejections during normal operation.
- The packaged `.vsix` contains no `debugLm` command, no `src/`, `test/`, or `docs/` files, and no `.map` files.

## Release process

```bash
npx @vscode/vsce ls          # inspect the package contents
npx @vscode/vsce package     # builds via vscode:prepublish and produces .vsix
code --install-extension lazy-naming-0.0.1.vsix   # local validation in normal VSCode
npx @vscode/vsce login tuanpham21105   # once, with your Azure DevOps PAT
npx @vscode/vsce publish     # submit to the Marketplace
```