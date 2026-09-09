import * as vscode from 'vscode';

export async function computeRenameEdit(
  document: vscode.TextDocument,
  position: vscode.Position,
  newName: string,
): Promise<vscode.WorkspaceEdit | undefined> {
  return vscode.commands.executeCommand<vscode.WorkspaceEdit>(
    'vscode.executeDocumentRenameProvider',
    document.uri,
    position,
    newName,
  );
}

export async function applyRename(
  document: vscode.TextDocument,
  position: vscode.Position,
  newName: string,
  fallbackPositions: readonly vscode.Position[] = [],
): Promise<boolean> {
  const primary = await computeRenameEdit(document, position, newName);
  if (primary !== undefined && primary.size > 0) {
    return applyEdit(primary);
  }
  for (const candidate of fallbackPositions) {
    const edit = await computeRenameEdit(document, candidate, newName);
    if (edit !== undefined && edit.size > 0) {
      return applyEdit(edit);
    }
  }
  return false;
}

async function applyEdit(edit: vscode.WorkspaceEdit): Promise<boolean> {
  return vscode.workspace.applyEdit(edit, {
    isRefactoring: true,
  });
}