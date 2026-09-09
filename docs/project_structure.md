# Lazy Naming — Project Structure

## Overview

Lazy Naming is a VSCode Extension written in TypeScript. The structure is kept flat and minimal — each file has a clear responsibility, with no unnecessary abstractions.

---

## Directory Structure

```
lazy-naming/
│
├── src/
│   ├── extension.ts
│   ├── commands/
│   │   ├── suggestRename.ts
│   │   └── generateDescription.ts
│   ├── core/
│   │   ├── lmClient.ts
│   │   ├── contextReader.ts
│   │   └── renameApplier.ts
│   └── config/
│       └── configLoader.ts
│
├── .vscode/
│   └── lazy-naming.json        ← per-project config (user-created)
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## Component Breakdown

### `src/extension.ts`

**The entry point of the entire extension.**

This is the first file VSCode calls when the extension is activated. Its only responsibility is to register commands with VSCode and connect them to the corresponding logic. It contains no business logic.

```
activate()
  └── register command: lazyNaming.suggestRename       → suggestRename.ts
  └── register command: lazyNaming.generateDescription → generateDescription.ts
```

---

### `src/commands/suggestRename.ts`

**Handles the flow when the user selects a symbol and chooses "Suggest Rename".**

It orchestrates the entire flow from start to finish:

1. Read the selected symbol
2. Call `contextReader` to retrieve surrounding code
3. Ask the user whether they want to provide additional context (input box, up to 200 characters)
4. Call `lmClient` to get a list of AI-generated name suggestions
5. Display the suggestions through Quick Pick for the user to choose from
6. Call `renameApplier` to apply the rename across the entire workspace

---

### `src/commands/generateDescription.ts`

**Handles the flow when the user selects a symbol and chooses "Generate Description".**

It orchestrates the entire flow from start to finish:

1. Read the selected symbol
2. Call `contextReader` to retrieve surrounding code
3. Ask the user whether they want to provide additional context (input box, up to 200 characters)
4. Call `lmClient` to have the AI generate a docstring describing the functionality
5. Call `renameApplier` to insert the comment at the correct location in the file

The docstring follows the standard format for each programming language — JSDoc for TypeScript/JavaScript, docstring for Python, and Javadoc for Java — including `@param` and `@return` when appropriate.

---

### `src/core/lmClient.ts`

**The bridge between the extension and GitHub Copilot through the VSCode Language Model API.**

This is the only place in the project that makes AI calls. It contains:

* Logic for selecting a model from Copilot (`vscode.lm.selectChatModels`)
* Prompt construction tailored to each type of request (rename or generate description)
* Sending requests and reading streamed responses
* Parsing the response into structured data for each command to use

If the AI provider needs to be changed in the future, only this file needs to be modified.

---

### `src/core/contextReader.ts`

**Reads the "context" of the selected symbol.**

The AI needs to understand how the symbol is being used, not just what its name is. This file is responsible for:

* Retrieving approximately 20–30 lines of code around the selected position
* Identifying the programming language of the currently open file
* Finding other places in the file where the symbol is used

This information is included in the prompt so the AI has enough context to produce better results.

---

### `src/core/renameApplier.ts`

**Applies changes to the file after the user confirms them.**

It handles two different types of changes:

* **Rename:** Uses the VSCode Rename Provider (the same API used by the F2 key) to rename the symbol consistently across the entire workspace, including other files that import or use the symbol.
* **Generate Description:** Inserts a comment block directly above the symbol in the current file.

Both changes are sent to Refactor Preview so the user can review all changes and confirm them before applying.

---

### `src/config/configLoader.ts`

**Reads the project configuration file.**

It looks for and reads `.vscode/lazy-naming.json` in the current workspace. If the file does not exist, it returns the default values. It provides configuration to other parts of the extension when needed — including naming style, comment language, prefix rules, and custom rules.

---

### `.vscode/lazy-naming.json`

**A per-project configuration file (user-created, optional).**

It allows each project to define its own rules without modifying the extension. For example, one project may use `snake_case`, another may use `camelCase`, or require docstrings to be written in Vietnamese.

```json
{
  "namingStyle": "camelCase",
  "commentLanguage": "en",
  "prefixRules": {
    "boolean": ["is", "has", "can"],
    "handler": ["on", "handle"]
  },
  "customRules": "This project follows DDD conventions and uses domain terms such as Order and Customer."
}
```

---

### `package.json`

**The extension manifest — VSCode reads this file to understand what the extension does.**

It declares the commands that appear in the right-click menu, the conditions under which each command is displayed (for example, only showing the command when text is selected), and the requirement that GitHub Copilot must be installed beforehand.

---

## Data Flow

### Suggest Rename

```
User selects a symbol → right-click → "Suggest Rename"
        │
        ▼
suggestRename.ts
        │
        ├──► contextReader.ts     ← reads surrounding code + identifies language
        ├──► configLoader.ts      ← reads naming style, custom rules
        ├──► [Input box]          ← user provides additional context (optional)
        │
        ├──► lmClient.ts          ← calls Copilot, receives a list of name suggestions
        │
        ├──► [Quick Pick]         ← user selects a preferred name
        │
        └──► renameApplier.ts     ← renames consistently across the entire workspace
                    │
                    ▼
             Refactor Preview     ← user reviews, then clicks Apply or Discard
```

### Generate Description

```
User selects a symbol → right-click → "Generate Description"
        │
        ▼
generateDescription.ts
        │
        ├──► contextReader.ts     ← reads surrounding code + identifies language
        ├──► configLoader.ts      ← reads comment language, custom rules
        ├──► [Input box]          ← user provides additional context (optional)
        │
        ├──► lmClient.ts          ← calls Copilot, receives a language-standard docstring
        │
        └──► renameApplier.ts     ← inserts the comment at the correct location in the file
                    │
                    ▼
             Refactor Preview     ← user reviews, then clicks Apply or Discard
```

---

## Design Principles

**One responsibility per file.** No file should both call the AI, handle UI, and read configuration.

**Commands are orchestrators, not executors.** The actual logic lives in `core/`; commands only connect the pieces together in the correct order.

**No global state.** Every time the user triggers a command, it runs as an independent flow from start to finish.
