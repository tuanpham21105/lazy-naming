
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

Currently both commands show a placeholder message describing the resolved target. Full implementation is planned for later phases.

## Tests

Unit tests (no VSCode host needed, pure logic only):

```bash
npm test
```

Integration tests (launch a real VSCode instance via `@vscode/test-electron`):

```bash
npm run test:integration
```

## Project Docs

- `docs/project_description.md` — product overview
- `docs/project_structure.md` — architecture and responsibilities
- `docs/development_plan.md` — phased development plan and testing guide
