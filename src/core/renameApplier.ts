import * as vscode from 'vscode';
import { buildDocstringInsertion, planDocstringEdits } from './docstringInserter';

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

export interface DocstringTarget {
  range: vscode.Range;
  docstring: string;
}

export async function computeDocstringEdit(
  document: vscode.TextDocument,
  symbolRange: vscode.Range,
  docstring: string,
): Promise<vscode.WorkspaceEdit | undefined> {
  const insertion = buildDocstringInsertion(
    documentLines(document),
    symbolRange.start.line,
    docstring,
    document.languageId,
  );
  if (insertion === undefined) {
    return undefined;
  }

  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(insertion.startLine, 0, insertion.endLine, 0),
    insertion.text,
  );
  return edit;
}

export async function computeDocstringsEdit(
  document: vscode.TextDocument,
  targets: readonly DocstringTarget[],
): Promise<vscode.WorkspaceEdit | undefined> {
  const insertions = planDocstringEdits(
    documentLines(document),
    targets.map((target) => ({
      line: target.range.start.line,
      docstring: target.docstring,
    })),
    document.languageId,
  );
  if (insertions.length === 0) {
    return undefined;
  }

  const edit = new vscode.WorkspaceEdit();
  for (const insertion of insertions) {
    edit.replace(
      document.uri,
      new vscode.Range(insertion.startLine, 0, insertion.endLine, 0),
      insertion.text,
    );
  }
  return edit;
}

export async function applyDocstrings(
  document: vscode.TextDocument,
  targets: readonly DocstringTarget[],
): Promise<boolean> {
  const edit = await computeDocstringsEdit(document, targets);
  if (edit === undefined) {
    return false;
  }
  return applyEdit(edit);
}

function documentLines(document: vscode.TextDocument): string[] {
  const lines: string[] = [];
  for (let line = 0; line < document.lineCount; line++) {
    lines.push(document.lineAt(line).text);
  }
  return lines;
}

async function applyEdit(edit: vscode.WorkspaceEdit): Promise<boolean> {
  return vscode.workspace.applyEdit(edit, {
    isRefactoring: true,
  });
}