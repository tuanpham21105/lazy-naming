import * as vscode from 'vscode';
import { loadConfig } from '../config/configLoader';
import { getDocumentContext } from '../core/contextReader';
import { resolveSelectionKind } from '../core/documentSymbols';
import { requestNameSuggestions } from '../core/lmClient';
import { applyRename } from '../core/renameApplier';
import { orderSymbolsForRename } from '../core/symbolTree';
import {
  pickFileTargets,
  requestOptionalHint,
  resolveTarget,
  surfaceLmError,
} from './targets';

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
    ? [
        {
          name: document.getText(selection).trim(),
          kind: await resolveSelectionKind(document, selection),
          range: selection,
        },
      ]
    : await pickFileTargets(document, 'rename');

  if (targets.length === 0) {
    return;
  }

  const ordered = orderSymbolsForRename(targets);
  const hint = await requestOptionalHint('What do these symbols do? Press Enter to skip');
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
      for (const target of ordered) {
        progress.report({
          message: `(${index}/${targets.length}) Suggesting a name for "${target.name}"…`,
        });
        index += 1;

        const context = getDocumentContext(document, target.range, target.name, target.kind);

        let suggestions: string[];
        try {
          suggestions = await requestNameSuggestions(context, config, hint);
        } catch (error) {
          surfaceLmError(error);
          return;
        }

        const chosen = await vscode.window.showQuickPick(
          suggestions.map((name) => ({
            label: name,
            description: `Replace "${target.name}"`,
          })),
          {
            title: `Lazy Naming: Pick a new name for "${target.name}"`,
            placeHolder: 'Pick a name to apply',
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
            `Lazy Naming: could not compute a rename for "${target.name}". ` +
              `A language service may be required — installing one for ${document.languageId} may fix this.`,
          );
        }
      }
    },
  );
}