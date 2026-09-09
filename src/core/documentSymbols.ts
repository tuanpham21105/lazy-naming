import * as vscode from 'vscode';
import { flattenSymbols, type SymbolCategory, type SymbolNode } from './symbolTree';

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
    kind: categoryOfKind(symbol.kind),
    range: symbol.selectionRange,
    children: (symbol.children ?? []).map(toNode),
  });

  return flattenSymbols(symbols.map(toNode));
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

function categoryOfKind(kind: vscode.SymbolKind): SymbolCategory {
  switch (kind) {
    case vscode.SymbolKind.Function:
    case vscode.SymbolKind.Method:
    case vscode.SymbolKind.Constructor:
      return 'method';
    case vscode.SymbolKind.Class:
    case vscode.SymbolKind.Interface:
    case vscode.SymbolKind.Struct:
    case vscode.SymbolKind.Enum:
    case vscode.SymbolKind.Module:
    case vscode.SymbolKind.Namespace:
    case vscode.SymbolKind.Object:
    case vscode.SymbolKind.TypeParameter:
    case vscode.SymbolKind.Array:
      return 'class';
    default:
      return 'variable';
  }
}