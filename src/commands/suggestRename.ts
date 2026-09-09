import * as vscode from 'vscode';
import { loadConfig } from '../config/configLoader';
import { getDocumentContext } from '../core/contextReader';
import { getDocumentSymbols } from '../core/documentSymbols';
import { LmRequestError, requestNameSuggestions } from '../core/lmClient';
import { applyRename } from '../core/renameApplier';

const MAX_HINT_LENGTH = 200;

interface RenameTarget {
  name: string;
  range: vscode.Range;
}

export async function suggestRename(uri?: vscode.Uri): Promise<void> {
  const resolved = await resolveTarget(uri);
  if (resolved === undefined) {
    return;
  }
  const { document, selection } = resolved;

  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? document.uri.fsPath;
  const config = await loadConfig(workspaceRoot);

  const targets = selection !== undefined
    ? [{ name: document.getText(selection).trim(), range: selection }]
    : await pickFileTargets(document);

  if (targets.length === 0) {
    return;
  }

  const hint = await vscode.window.showInputBox({
    prompt: `Optional context (max ${MAX_HINT_LENGTH} characters)`,
    placeHolder: 'What do these symbols do? Press Enter to skip',
    validateInput: (text) =>
      text.length > MAX_HINT_LENGTH ? `Keep it under ${MAX_HINT_LENGTH} characters.` : undefined,
  });
  if (hint === undefined) {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Lazy Naming',
    },
    async (progress) => {
      let index = 1;
      for (const target of targets) {
        progress.report({
          message: `(${index}/${targets.length}) Suggesting a name for "${target.name}"…`,
        });
        index += 1;

        const context = getDocumentContext(document, target.range, target.name);

        let suggestions: string[];
        try {
          suggestions = await requestNameSuggestions(context, config, hint);
        } catch (error) {
          surfaceError(error);
          return;
        }

        const chosen = await vscode.window.showQuickPick(
          suggestions.map((name) => ({
            label: name,
            description: `Replace "${target.name}"`,
          })),
          {
            title: `Lazy Naming: Pick a new name for "${target.name}"`,
            placeHolder: 'Press Escape to stop',
            canPickMany: false,
            ignoreFocusOut: true,
          },
        );
        if (chosen === undefined) {
          return;
        }

        const applied = await applyRename(
          document,
          target.range.start,
          chosen.label,
          context.usageLocations,
        );
        if (!applied) {
          vscode.window.showWarningMessage(
            `Lazy Naming: could not compute a rename for "${target.name}".`,
          );
        }
      }
    },
  );
}

async function resolveTarget(
  uri?: vscode.Uri,
): Promise<{ document: vscode.TextDocument; selection: vscode.Range | undefined } | undefined> {
  if (uri !== undefined) {
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { preview: true });
    return { document, selection: undefined };
  }

  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    vscode.window.showWarningMessage('Lazy Naming: open a file and select a symbol first.');
    return undefined;
  }
  return {
    document: editor.document,
    selection: editor.selection.isEmpty ? undefined : editor.selection,
  };
}

async function pickFileTargets(document: vscode.TextDocument): Promise<RenameTarget[]> {
  const symbols = await getDocumentSymbols(document);
  if (symbols.length === 0) {
    vscode.window.showWarningMessage('Lazy Naming: no symbols found in this file.');
    return [];
  }

  const chosen = await vscode.window.showQuickPick(
    symbols.map((symbol, index) => ({
      label: symbol.name,
      index,
      picked: true,
    })),
    {
      title: 'Lazy Naming: Pick symbols to rename',
      placeHolder: 'Select symbols, then press Enter',
      canPickMany: true,
      ignoreFocusOut: true,
    },
  );
  if (chosen === undefined) {
    return [];
  }

  return chosen.map((item) => ({
    name: symbols[item.index].name,
    range: symbols[item.index].range,
  }));
}

function surfaceError(error: unknown): void {
  const message =
    error instanceof LmRequestError ? error.userMessage : (error as Error).message ?? String(error);
  vscode.window.showErrorMessage(`Lazy Naming: ${message}`);
}