import * as vscode from 'vscode';
import {
  categoryOfSymbolKind,
  flattenSymbols,
  type SymbolCategory,
  type SymbolNode,
} from './symbolTree';

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

  const toNode = (symbol: vscode.DocumentSymbol): FileSymbol | null => {
    const kind = categoryOfSymbolKind(symbol.kind);
    if (kind === null) {
      return null;
    }
    const children = (symbol.children ?? [])
      .map(toNode)
      .filter((child): child is FileSymbol => child !== null);
    return { name: symbol.name, kind, range: symbol.selectionRange, children };
  };

  return flattenSymbols(
    symbols.map(toNode).filter((node): node is FileSymbol => node !== null),
  );
}

export async function resolveSelectionKind(
  document: vscode.TextDocument,
  selection: vscode.Range,
): Promise<SymbolCategory> {
  const symbols = await getDocumentSymbols(document);
  let best: FileSymbol | undefined;
  for (const symbol of symbols) {
    if (
      symbol.range.contains(selection) &&
      (best === undefined ||
        symbol.range.start.line > best.range.start.line ||
        (symbol.range.start.line === best.range.start.line &&
          symbol.range.end.line > best.range.end.line))
    ) {
      best = symbol;
    }
  }
  return best?.kind ?? 'variable';
}