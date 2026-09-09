import * as vscode from 'vscode';
import { getDocumentSymbols } from '../core/documentSymbols';
import { hasBuiltInSymbolProvider, recommendedSymbolExtension } from '../core/languageSupport';
import { LmRequestError } from '../core/lmClient';

export const MAX_HINT_LENGTH = 200;

export interface SymbolTarget {
  name: string;
  range: vscode.Range;
}

export interface TargetResolution {
  document: vscode.TextDocument;
  selection: vscode.Range | undefined;
}

export async function resolveTarget(
  uri?: vscode.Uri,
): Promise<TargetResolution | undefined> {
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

export async function pickFileTargets(
  document: vscode.TextDocument,
  actionLabel: 'rename' | 'describe',
): Promise<SymbolTarget[]> {
  const symbols = await getDocumentSymbols(document);
  if (symbols.length === 0) {
    const extension = recommendedSymbolExtension(document.languageId);
    if (hasBuiltInSymbolProvider(document.languageId) || extension === undefined) {
      vscode.window.showWarningMessage('Lazy Naming: no symbols found in this file.');
      return [];
    }
    vscode.window.showWarningMessage(
      `Lazy Naming: no symbols found — whole-file mode needs a language extension. ` +
        `Install "${extension}" and reload. Selecting a symbol still works.`,
    );
    return [];
  }

  const title =
    actionLabel === 'rename' ? 'Pick symbols to rename' : 'Pick symbols to describe';
  const chosen = await vscode.window.showQuickPick(
    symbols.map((symbol, index) => ({
      label: symbol.name,
      index,
      picked: true,
    })),
    {
      title: `Lazy Naming: ${title}`,
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

export async function requestOptionalHint(
  placeHolder: string,
): Promise<string | undefined> {
  return vscode.window.showInputBox({
    prompt: `Optional context (max ${MAX_HINT_LENGTH} characters)`,
    placeHolder,
    validateInput: (text) =>
      text.length > MAX_HINT_LENGTH ? `Keep it under ${MAX_HINT_LENGTH} characters.` : undefined,
  });
}

export function surfaceLmError(error: unknown): void {
  const message =
    error instanceof LmRequestError ? error.userMessage : (error as Error).message ?? String(error);
  vscode.window.showErrorMessage(`Lazy Naming: ${message}`);
}