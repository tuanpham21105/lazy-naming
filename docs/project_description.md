# 🦥 Lazy Naming

> *Because naming things is hard, and you have better things to do.*

Lazy Naming is a VSCode extension that uses AI to help you name and document your code — based on what it actually does, not what you think you'll remember later.

---

## 💡 Why This Exists

Naming is one of the most mentally exhausting parts of writing code. You know what the function does, but finding a name that clearly communicates that to the next person (or future you) takes more brainpower than it should. And writing documentation? That's a whole separate battle.

Lazy Naming handles both. Select the symbol, optionally describe what you had in mind, and let AI do the work.

---

## 🎯 What It Does

### Suggest Rename
Select a function, variable, or class — AI reads the surrounding code and suggests names that reflect what the symbol actually does. You pick from a list, preview every file that will change, then apply.

### Generate Description
Select a function, variable, or class — AI writes a docstring comment in the format appropriate for the language: JSDoc for TypeScript/JavaScript, docstring for Python, Javadoc for Java, and so on — including `@param` and `@return` where applicable. Preview the change, then apply.

Both features let you add up to **200 characters of plain-language context** before running — useful when the code alone doesn't tell the full story.

---

## ⚙️ Configuration

Works out of the box with sensible defaults. Can be customized per project via a `.vscode/lazy-naming.json` file — including naming style (`camelCase`, `snake_case`, `PascalCase`), comment language, and free-text rules specific to your codebase or team conventions.

---

## 🤖 Powered By

Uses the **VSCode Language Model API** — if you have GitHub Copilot installed, Lazy Naming will request permission to use it on first run. No extra setup or API key required.

---

## 🪪 License

MIT
