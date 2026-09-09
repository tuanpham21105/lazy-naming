import * as vscode from 'vscode';
import { loadConfig } from '../config/configLoader';
import { getDocumentContext } from '../core/contextReader';
import { isDocstringText } from '../core/docstringInserter';
import { requestDocstring } from '../core/lmClient';
import { applyDocstrings } from '../core/renameApplier';
import {
  pickFileTargets,
  requestOptionalHint,
  resolveTarget,
  surfaceLmError,
} from './targets';

export async function generateDescription(uri?: vscode.Uri): Promise<void> {
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
    : await pickFileTargets(document, 'describe');

  if (targets.length === 0) {
    return;
  }

  const hint = await requestOptionalHint('What do these symbols do? Press Enter to skip');
  if (hint === undefined) {
    return;
  }

  const pending: { range: vscode.Range; docstring: string }[] = [];
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Lazy Naming',
    },
    async (progress) => {
      let index = 1;
      for (const target of targets) {
        progress.report({
          message: `(${index}/${targets.length}) Writing a docstring for "${target.name}"…`,
        });
        index += 1;

        const context = getDocumentContext(document, target.range, target.name);

        let docstring: string;
        try {
          docstring = await requestDocstring(context, config, hint);
        } catch (error) {
          surfaceLmError(error);
          return;
        }

        if (!isDocstringText(docstring, document.languageId)) {
          vscode.window.showWarningMessage(
            `Lazy Naming: no valid docstring returned for "${target.name}".`,
          );
          continue;
        }

        pending.push({ range: target.range, docstring });
      }
    },
  );

  if (pending.length === 0) {
    return;
  }

  const applied = await applyDocstrings(document, pending);
  if (!applied) {
    vscode.window.showWarningMessage(
      'Lazy Naming: could not insert the generated docstrings.',
    );
  }
}