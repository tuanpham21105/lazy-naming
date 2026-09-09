import * as vscode from 'vscode';
import { loadConfig } from './config/configLoader';
import { getDocumentContext } from './core/contextReader';
import { LmRequestError, requestDocstring, requestNameSuggestions } from './core/lmClient';

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (outputChannel === undefined) {
    outputChannel = vscode.window.createOutputChannel('Lazy Naming');
  }
  return outputChannel;
}

function describeTarget(uri?: vscode.Uri): string {
  if (uri !== undefined) {
    return `file: ${vscode.workspace.asRelativePath(uri)} (from Explorer)`;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    return 'no active editor';
  }

  const fileName = vscode.workspace.asRelativePath(editor.document.uri);
  const selection = editor.selection;
  if (!selection.isEmpty) {
    const symbol = editor.document.getText(selection).trim();
    return `symbol "${symbol}" in ${fileName}`;
  }

  return `file: ${fileName}`;
}

async function runDebugLm(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined) {
    vscode.window.showWarningMessage('Lazy Naming: open a file and select a symbol first.');
    return;
  }

  if (editor.selection.isEmpty) {
    vscode.window.showWarningMessage('Lazy Naming: select a symbol first.');
    return;
  }

  const document = editor.document;
  const symbolName = document.getText(editor.selection).trim();

  const hint = await vscode.window.showInputBox({
    prompt: 'Optional context (max 200 characters)',
    placeHolder: 'What does this symbol do?',
    validateInput: (text) =>
      text.length > 200 ? 'Keep it under 200 characters.' : undefined,
  });
  if (hint === undefined) {
    return;
  }

  const output = getOutputChannel();
  output.clear();

  try {
    const context = getDocumentContext(document, editor.selection, symbolName);
    const workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? document.uri.fsPath;
    const config = await loadConfig(workspaceRoot);

    const names = await requestNameSuggestions(context, config, hint);
    const docstring = await requestDocstring(context, config, hint);

    output.appendLine(`Symbol: ${symbolName}`);
    output.appendLine(`Language: ${context.languageId}`);
    output.appendLine('Name suggestions:');
    names.forEach((name, index) => output.appendLine(`  ${index + 1}. ${name}`));
    output.appendLine('Generated docstring:');
    output.appendLine(docstring);
    output.show(true);
  } catch (error) {
    const message =
      error instanceof LmRequestError ? error.userMessage : (error as Error).message ?? String(error);
    vscode.window.showErrorMessage(`Lazy Naming: ${message}`);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('lazyNaming.suggestRename', (uri?: vscode.Uri) => {
      vscode.window.showInformationMessage(
        `Lazy Naming: "Suggest Rename" received for ${describeTarget(uri)} (not implemented yet).`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'lazyNaming.generateDescription',
      (uri?: vscode.Uri) => {
        vscode.window.showInformationMessage(
          `Lazy Naming: "Generate Description" received for ${describeTarget(
            uri,
          )} (not implemented yet).`,
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lazyNaming.debugLm', () => void runDebugLm()),
  );
}

export function deactivate(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}