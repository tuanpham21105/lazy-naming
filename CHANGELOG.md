# Changelog

All notable changes to the Lazy Naming extension are documented in this file.

## [0.0.1] — 2026-09-09

Initial release.

### Added

- Project scaffolding and core infrastructure (`configLoader.ts`, strict TypeScript build pipeline).
- Context reading: ~30-line window around the selected symbol plus additional usage locations.
- AI integration via the VSCode Language Model API with typed prompting and streamed responses.
- **Suggest Rename** command — Copilot suggests 3–6 candidate names, shown in a Quick Pick and applied through the Refactor Preview, across the workspace.
- **Generate Description** command — Copilot writes JSDoc / Python docstring / Javadoc blocks, inserted above the declaration with matching indentation; existing docstrings are replaced, not duplicated.
- Two scopes: selected symbol or whole file (multi-symbol selection).
- Configuration via `.vscode/lazy-naming.json`: per-kind naming styles (`class` / `method` / `variable`), `commentLanguage`, role-based `prefixRules`, and `customRules`.
- Automated tests: unit tests for pure logic modules and integration tests in a real VSCode instance.

### Fixed

- Whole-file docstring generation applied from a single document snapshot so multi-symbol docstrings never interleave or land on wrong declarations.
- Mid-request AI errors abort a whole-file run instead of applying a partial set of docstrings.
- Renaming a Java class together with other symbols in one file: methods/variables are renamed first and class renames — which rename the file itself — run last, so the loop never loses track of the file.
- Package and file declarations are excluded from symbol target lists.
- Clearer warnings when a language has no symbol provider (suggests installing the matching extension).
- Naming-style compliance enforced on Copilot's suggestions.

### Removed

- `lazyNaming.debugLm` dev-only command before release.