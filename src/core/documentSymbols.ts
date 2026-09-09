import * as vscode from 'vscode';
import { flattenSymbols, type SymbolNode } from './symbolTree';

export type FileSymbol = SymbolNode<vscode.Range>;

export async function getDocumentSymbols(
  document: vscode.TextDocument,
): Promise<FileSymbol[]> {
  const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
    'vscode.executeDocumentSymbolProvider',
    document.uri,
  );
  if (symbols === undefined || symbols.length === 0) {
    return [];
  }

  const toNode = (symbol: vscode.DocumentSymbol): FileSymbol => ({
    name: symbol.name,
    range: symbol.selectionRange,
    children: (symbol.children ?? []).map(toNode),
  });

  return flattenSymbols(symbols.map(toNode));
}