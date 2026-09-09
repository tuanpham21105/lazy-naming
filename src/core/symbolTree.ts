export interface SymbolNode<R> {
  name: string;
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