
# 3-Day Fresher Engineering Automation Challenge

## Objective
Identify and implement a small project that helps automate, optimize, or improve your own workflow as an Engineer. The project should target something that reduces manual work, simplifies repetitive tasks, or uses AI/MCP to enhance your daily efficiency.

## Duration
3 Days

## Expectations

- Pick a problem area from your current workflow that causes friction or consumes time.
- Propose a small automation, tool, or AI-based solution to address that problem.
- Build a working prototype or script that demonstrates the solution.
- Prepare a short demo or walkthrough of what you built.
- If you are unsure or stuck on ideas, you may pick from the default challenge ideas below.

## Default Challenge Ideas (Optional)

- Email to Task Converter - Turn flagged emails into tasks automatically.
- Meeting Summary Extractor - Auto-generate action items from MS Teams or Zoom meeting transcripts.
- Daily Standup Generator - Draft your daily standup update using data from Git, Jira, or MS Teams.
- Code Review Reminder Bot - Get reminders for pending pull request reviews.
- Code Snippet Organizer with Search - Save and search your personal code snippets.
- User Story Auto-Breaker - Break large user stories into tasks based on rules.
- MS Teams to Knowledge Base Bridge - Suggest good discussions from MS Teams for the knowledge base.
- Personal Notes MCP - Manage and search personal notes using MCP.
- AI PR Reviewer - AI reviews pull requests based on your custom rules.
- Team Alerts Summarizer (MS Teams) - Summarize noisy alerts and send clean updates via MS Teams.

## Deliverable

- Working prototype (script, bot, integration, etc.)
- Short demo (video, live walkthrough, or documentation)
- Reflection on how this project helps your workflow

## Goal

Learn to take initiative, solve practical problems, and build useful workflow tools with automation and AI.

## Deadline
3 days from project start.

---

# Lazy Naming — Extension Development

This repository also contains `lazy-naming`, a VSCode extension that uses AI to suggest meaningful names and generate descriptive docstrings for functions, variables, and classes.

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
3. In the new window, both commands work at two scopes:
   - **Selected symbol** — select a function/variable/class, right-click, and both commands appear (the commands are shown when text is selected).
   - **Whole file** — right-click a file in the Explorer and choose either command, or run them from the Command Palette with no selection (they act on the active document).

- **Suggest Rename** is fully implemented for both scopes. **Generate Description** still shows a placeholder message and is planned for the next phase.

## Tests

Unit tests (no VSCode host needed, pure logic only):

```bash
npm test
```

Integration tests (launch a real VSCode instance via `@vscode/test-electron`):

```bash
npm run test:integration
```

## Manual verification — AI integration (Phase 3)

The debug command exercises `lmClient` against live Copilot before the real UI is wired up.

1. Make sure GitHub Copilot is installed and you are signed in.
2. Press `F5` to open the Extension Development Host. **If the window was open before the latest changes, close it fully and press F5 again** so the extension manifest is reloaded.
3. Open `test/fixtures/sample.ts` and select the word `calculateTotal`.
4. Run **Lazy Naming: Debug LM (dev only)** — either right-click the selection and pick it from the context menu, or run it from the Command Palette.
5. Optionally enter up to 200 characters of context and press Enter.
6. Open the **Lazy Naming** output channel (View → Output).

Expected: a list of at least 3 name suggestions and a JSDoc block for `calculateTotal`. If Copilot is missing, an error dialog explains that GitHub Copilot is required. This command is dev-only and will be removed before release.

## Manual verification — Suggest Rename (Phase 4)

### TypeScript (selected symbol)

1. Press `F5`, open `test/fixtures/sample.ts`, and select the word `calculateTotal` (double-click it).
2. Right-click → **Lazy Naming: Suggest Rename**.
3. Optionally enter up to 200 characters of context and press Enter (or press Enter to skip).
4. A Quick Pick shows 3–6 candidate names. Pick one.
5. A **Refactor Preview** opens (side-by-side) listing the planned renames — `calculateTotal` is defined at line 9 and referenced at lines 15, 19, 30, 42.
6. Click **Apply** in the preview. Verify the symbol was renamed everywhere.

### Python (selected symbol)

1. Open `test/fixtures/sample.py` and select `compute_discount`.
2. Right-click → **Lazy Naming: Suggest Rename**, choose a candidate, apply the preview.
3. Verify `compute_discount_for` and `apply_discount` now call the new name (definitions at lines 1, 6, 10).

### Whole file (Explorer)

1. Right-click `test/fixtures/sample.ts` in the Explorer → **Lazy Naming: Suggest Rename**.
2. A checkbox list shows the file's symbols. Pre-check the ones to rename and press Enter.
3. Enter optional context once, then confirm each suggested name with the Refactor Preview.

Escape at any Quick Pick aborts the remaining symbols; already-applied renames stay.

## Project Docs

- `docs/project_description.md` — product overview
- `docs/project_structure.md` — architecture and responsibilities
- `docs/development_plan.md` — phased development plan and testing guide
