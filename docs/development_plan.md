# Lazy Naming — Development Plan and Testing Guide

---

## Part 1: Development Phases

---

### Phase 1: Project Scaffolding and Core Infrastructure

**Goal:** Establish the project foundation with a working extension shell, build pipeline, and core module stubs.

**Scope:**

Set up the VSCode extension project using the official Yeoman generator (`yo code`) with TypeScript. Configure `tsconfig.json` for strict type checking and `package.json` with the correct activation events, command contributions, and the GitHub Copilot extension dependency declaration.

Implement `extension.ts` as the entry point. At this stage, it only needs to register both commands (`lazyNaming.suggestRename` and `lazyNaming.generateDescription`) and connect them to placeholder handlers that show an information message confirming the command was received.

Implement `configLoader.ts` with full logic: read `.vscode/lazy-naming.json` if present, validate its fields, and return a merged configuration object with defaults. This module has no external dependencies and can be completed and tested in isolation.

**Deliverables:**
- Working extension that activates without error in the Extension Development Host
- Both commands visible in the right-click context menu when text is selected
- `configLoader.ts` fully implemented with unit tests
- README with setup instructions for contributors

**Exit criteria:** Running the extension in the development host and right-clicking a selected symbol shows both commands. Selecting either command displays a placeholder message with no error.

---

### Phase 2: Context Reading

**Goal:** Implement `contextReader.ts` so the extension can extract meaningful code context from the active editor.

**Scope:**

Implement `contextReader.ts` with three responsibilities:

1. Extract approximately 20–30 lines of code surrounding the cursor position, ensuring the selected symbol itself is always included regardless of its position within the file.
2. Identify the programming language of the active document using `vscode.TextDocument.languageId`.
3. Locate other occurrences of the selected symbol within the current file, so the AI receives usage context beyond the immediate definition.

The output of this module is a plain data object that will be passed to `lmClient.ts` in the next phase. No AI calls are made here.

**Deliverables:**
- `contextReader.ts` fully implemented
- Unit tests covering edge cases: symbol at the top of a file, symbol at the bottom, very short files (fewer than 30 lines), and files with no additional usages of the symbol

**Exit criteria:** Given an open TypeScript file with a selected function, `contextReader` returns the surrounding lines, the correct language identifier, and any other locations where the function name appears.

---

### Phase 3: AI Integration

**Goal:** Implement `lmClient.ts` to connect to GitHub Copilot via the VSCode Language Model API and return usable responses.

**Scope:**

Implement the model selection logic using `vscode.lm.selectChatModels`. Handle the case where no Copilot model is available and surface a clear, actionable error message to the user.

Implement two distinct prompt-building functions — one for rename suggestions, one for docstring generation — each incorporating the context object from `contextReader`, the configuration from `configLoader`, and the optional user-provided hint.

For rename suggestions, the prompt must instruct the model to return a structured list of candidate names. For docstring generation, the prompt must instruct the model to return a single comment block in the correct format for the detected language (JSDoc, Python docstring, or Javadoc), including `@param` and `@return` annotations where applicable.

Implement streamed response handling and parse the final output into typed return values for each command to consume.

**Deliverables:**
- `lmClient.ts` fully implemented with error handling for missing Copilot, model selection failure, and malformed responses
- Manual test cases documented for both request types
- Prompt templates reviewed for consistency across supported languages

**Exit criteria:** With GitHub Copilot active in the development host, calling `lmClient` for a simple TypeScript function returns a non-empty list of name suggestions and a valid JSDoc block.

---

### Phase 4: Rename Command — End to End

**Goal:** Implement `suggestRename.ts` and the rename path of `renameApplier.ts` so the full Suggest Rename flow works from user interaction to applied change.

**Scope:**

Implement `suggestRename.ts` to orchestrate the full flow: read the selected symbol, call `contextReader`, call `configLoader`, show the optional context input box (with a 200-character limit), call `lmClient`, display the suggestions in a Quick Pick panel, then pass the chosen name to `renameApplier`.

Implement the rename portion of `renameApplier.ts` using `vscode.commands.executeCommand('vscode.executeDocumentRenameProvider', ...)` to produce a `WorkspaceEdit`, then pass it to the Refactor Preview API so the user can review all affected files before confirming.

**Deliverables:**
- `suggestRename.ts` fully implemented
- Rename path of `renameApplier.ts` fully implemented
- End-to-end manual test documented for a TypeScript and a Python file

**Exit criteria:** Selecting a function name in a TypeScript file, right-clicking, choosing "Suggest Rename", providing optional context, selecting a suggestion, and confirming in Refactor Preview correctly renames the symbol across all files in the workspace.

---

### Phase 5: Generate Description Command — End to End

**Goal:** Implement `generateDescription.ts` and the comment-insertion path of `renameApplier.ts` so the full Generate Description flow works end to end.

**Scope:**

Implement `generateDescription.ts` following the same orchestration pattern as `suggestRename.ts`: read the symbol, gather context and config, show the optional context input box, call `lmClient`, and pass the resulting docstring to `renameApplier`.

Implement the comment-insertion portion of `renameApplier.ts`. This requires determining the exact line above the symbol declaration, constructing a `WorkspaceEdit` that inserts the comment block at that position with correct indentation, and sending it to Refactor Preview.

Handle the case where a docstring already exists above the symbol — either warn the user or replace it, but do not insert a duplicate.

**Deliverables:**
- `generateDescription.ts` fully implemented
- Comment-insertion path of `renameApplier.ts` fully implemented
- Manual test cases for TypeScript (JSDoc), Python (docstring), and Java (Javadoc)

**Exit criteria:** Selecting a function in a Python file, choosing "Generate Description", and confirming in Refactor Preview inserts a correctly formatted docstring immediately above the function definition with no duplication.

---

### Phase 6: Configuration and Polish

**Goal:** Validate that `configLoader.ts` integration works across all commands, and handle remaining edge cases and UX details.

**Scope:**

Verify that naming style preferences (`camelCase`, `snake_case`, `PascalCase`) are incorporated into the rename prompt and that the AI respects them. Verify that `commentLanguage` is incorporated into the docstring prompt. Verify that `prefixRules` and `customRules` are passed correctly.

Address remaining edge cases: no text selected when a command is triggered, the active file has an unsupported language, the user cancels at any input step, and network or Copilot errors mid-request.

Review all user-facing messages (error dialogs, status bar updates, input box placeholders) for clarity and consistency.

**Deliverables:**
- All configuration fields integrated and verified
- All error and cancellation paths handled gracefully
- User-facing strings reviewed and finalized

**Exit criteria:** Using a `.vscode/lazy-naming.json` that specifies `snake_case` and `commentLanguage: "vi"`, the rename suggestions follow snake_case conventions and the generated docstring is written in Vietnamese.

---

### Phase 7: Release Preparation

**Goal:** Prepare the extension for publication to the VSCode Marketplace.

**Scope:**

Write the final `README.md` with installation instructions, feature descriptions, configuration reference, and a short usage walkthrough. Add a `CHANGELOG.md`. Review `package.json` metadata: display name, description, categories, keywords, icon, and publisher.

Package the extension with `vsce package` and perform a final validation pass by installing the `.vsix` file in a clean VSCode instance without the Extension Development Host.

**Deliverables:**
- Final `README.md` and `CHANGELOG.md`
- Packaged `.vsix` file verified in a clean environment
- Extension submitted to the Marketplace

---

## Part 2: Testing Guide

---

### Testing Strategy Overview

Testing for this extension is divided into three layers. Unit tests cover pure logic modules that have no dependency on the VSCode API. Integration tests cover modules that interact with the VSCode API using the `@vscode/test-electron` runner, which launches a real VSCode instance. Manual tests cover end-to-end flows that require a live Copilot connection and cannot be meaningfully automated.

All automated tests are written with Mocha and the `assert` module from Node.js standard library, following the default setup generated by `yo code`.

---

### Unit Tests

Unit tests target modules that can be exercised without a running VSCode instance.

**`configLoader.ts`**

- When `.vscode/lazy-naming.json` does not exist, returns the default configuration object with all expected fields present.
- When the file exists with a partial configuration, merges it with defaults so all fields are always defined.
- When the file contains an unrecognized field, ignores it without throwing.
- When the file is malformed JSON, catches the parse error and returns defaults, logging a warning.

**`lmClient.ts` — prompt construction (pure functions only)**

Extract and test the prompt-building functions in isolation, separate from the actual API call:

- For a rename request, the prompt includes the symbol name, the surrounding code, the detected language, the naming style, any custom rules, and the optional user hint.
- For a description request, the prompt specifies the correct comment format for the given language identifier (TypeScript → JSDoc, Python → docstring, Java → Javadoc).
- When no user hint is provided, the prompt does not include a placeholder or empty hint field.

Run unit tests with:

```
npm test
```

The test runner is configured in `package.json` under the `test` script.

---

### Integration Tests

Integration tests run inside a VSCode instance with a real workspace. They use the VSCode API but do not require GitHub Copilot.

**`contextReader.ts`**

Prepare a set of fixture files in the `test/fixtures/` directory — one TypeScript file, one Python file, one Java file, and one very short file (fewer than 10 lines).

Tests to write:

- Given a cursor position on a function definition in the middle of a file, returns exactly the expected number of surrounding lines.
- Given a cursor position near the top of a file (fewer available lines above than the target window), does not attempt to access negative line numbers and returns from line 0 instead.
- Given a cursor position near the bottom of a file, does not exceed the last line of the document.
- Returns the correct `languageId` for each fixture file.
- Returns the correct positions of additional usages of the selected symbol within the file.

**`renameApplier.ts` — comment insertion**

Using a fixture TypeScript file:

- Inserting a JSDoc block above a function at the top of a file places the comment at line 0 with no leading blank line.
- Inserting a JSDoc block above a function preceded by a blank line preserves the blank line above the comment.
- The indentation of the inserted comment matches the indentation of the target symbol.

Run integration tests with:

```
npm run test:integration
```

This script should be defined to launch `@vscode/test-electron` pointing at the `test/suite/index.ts` entry point.

---

### Manual Tests

The following flows must be verified manually in a VSCode window with GitHub Copilot active. Perform these tests on a workspace containing at least one TypeScript file, one Python file, and one Java file.

**Suggest Rename — happy path**

1. Open a TypeScript file containing a function with a short, ambiguous name (for example, `doStuff`).
2. Select the function name.
3. Right-click and choose "Suggest Rename".
4. When the input box appears, enter a brief description of what the function does and press Enter.
5. Verify that a Quick Pick panel appears with multiple name suggestions.
6. Select one suggestion.
7. Verify that the Refactor Preview panel opens, showing all files in the workspace where the rename will be applied.
8. Click Apply.
9. Verify that the function is renamed consistently in all affected files.

**Suggest Rename — user cancels at Quick Pick**

Complete steps 1–5 above, then press Escape instead of selecting a suggestion. Verify that no changes are made to any file.

**Suggest Rename — naming style respected**

Add a `.vscode/lazy-naming.json` file with `"namingStyle": "snake_case"`. Repeat the happy path test. Verify that all suggestions follow `snake_case` conventions.

**Suggest Rename — multi-symbol order**

When renaming a class together with its methods or variables in one file (e.g. a Java file), verify that methods and variables are renamed first and the class last. Renaming the class of its file changes the file name, so it must be the final step or later renames lose track of the file. Package and file declarations never appear in the symbol list.

**Generate Description — TypeScript (JSDoc)**

1. Open a TypeScript file containing a function with parameters and a return value.
2. Select the function name.
3. Right-click and choose "Generate Description".
4. Optionally enter additional context and press Enter.
5. Verify that the Refactor Preview shows a JSDoc block inserted immediately above the function, including `@param` entries for each parameter and a `@returns` entry.
6. Click Apply and verify the comment is present in the file with correct indentation.

**Generate Description — Python**

Repeat the above test using a Python function. Verify the generated comment follows the Python docstring format (triple-quoted string as the first statement in the function body, or immediately above it depending on implementation choice — verify consistency with the behavior described in `generateDescription.ts`).

**Generate Description — existing docstring**

Open a TypeScript file where a function already has a JSDoc comment. Select the function name and run "Generate Description". Verify that the extension either replaces the existing comment or warns the user, and does not insert a duplicate.

**Error handling — Copilot not available**

Disable the GitHub Copilot extension in VSCode. Trigger either command. Verify that the user sees a clear error message explaining that GitHub Copilot is required, with no unhandled exception or empty error dialog.

**Error handling — no selection**

Without selecting any text, open the Command Palette and run `Lazy Naming: Suggest Rename`. The command acts on the **whole file**: a checkbox Quick Pick lists the file's symbols to rename. Selecting a symbol (or .ts/.js file symbols) is required for whole-file mode to find targets; for files in languages without a language service, no symbols are listed and a warning explains that a language extension is required. With no editor open at all, a clear message asks the user to open a file and select a symbol first.

---

### Regression Checklist

Before each release, verify the following manually:

- Both commands appear in the context menu only when text is selected (controlled by `when` clauses in `package.json`).
- The extension activates without error in a workspace with no `.vscode/lazy-naming.json` file.
- The extension activates without error in a workspace with a fully populated `.vscode/lazy-naming.json` file.
- No changes are written to disk at any point without first going through Refactor Preview.
- Cancelling at any input step (context input box, Quick Pick, Refactor Preview) leaves all files unchanged.
- The extension produces no console errors or unhandled promise rejections during normal operation.
