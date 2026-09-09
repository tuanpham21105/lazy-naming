import * as vscode from 'vscode';
import { generateDescription } from './commands/generateDescription';
import { suggestRename } from './commands/suggestRename';

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('lazyNaming.suggestRename', (uri?: vscode.Uri) =>
      void suggestRename(uri),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lazyNaming.generateDescription', (uri?: vscode.Uri) =>
      void generateDescription(uri),
    ),
  );
}