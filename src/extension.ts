import * as vscode from 'vscode';

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
}

export function deactivate(): void {}