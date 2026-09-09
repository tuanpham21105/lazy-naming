export type SymbolCategory = 'class' | 'method' | 'variable';

export interface SymbolNode<R> {
  name: string;
  kind: SymbolCategory;
  range: R;
  children?: SymbolNode<R>[];
}

export function flattenSymbols<R>(symbols: readonly SymbolNode<R>[]): SymbolNode<R>[] {
  const result: SymbolNode<R>[] = [];
  for (const symbol of symbols) {
    result.push(symbol);
    result.push(...flattenSymbols(symbol.children ?? []));
  }
  return result;
}