export type SymbolCategory = 'class' | 'method' | 'variable';

const SYMBOL_KIND_FILE = 0;
const SYMBOL_KIND_MODULE = 1;
const SYMBOL_KIND_NAMESPACE = 2;
const SYMBOL_KIND_PACKAGE = 3;
const SYMBOL_KIND_CLASS = 4;
const SYMBOL_KIND_METHOD = 5;
const SYMBOL_KIND_CONSTRUCTOR = 8;
const SYMBOL_KIND_ENUM = 9;
const SYMBOL_KIND_INTERFACE = 10;
const SYMBOL_KIND_FUNCTION = 11;
const SYMBOL_KIND_ARRAY = 17;
const SYMBOL_KIND_OBJECT = 18;
const SYMBOL_KIND_STRUCT = 22;
const SYMBOL_KIND_TYPE_PARAMETER = 25;

export function categoryOfSymbolKind(kind: number): SymbolCategory | null {
  switch (kind) {
    case SYMBOL_KIND_PACKAGE:
    case SYMBOL_KIND_FILE:
      return null;
    case SYMBOL_KIND_FUNCTION:
    case SYMBOL_KIND_METHOD:
    case SYMBOL_KIND_CONSTRUCTOR:
      return 'method';
    case SYMBOL_KIND_CLASS:
    case SYMBOL_KIND_INTERFACE:
    case SYMBOL_KIND_STRUCT:
    case SYMBOL_KIND_ENUM:
    case SYMBOL_KIND_MODULE:
    case SYMBOL_KIND_NAMESPACE:
    case SYMBOL_KIND_OBJECT:
    case SYMBOL_KIND_TYPE_PARAMETER:
    case SYMBOL_KIND_ARRAY:
      return 'class';
    default:
      return 'variable';
  }
}

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

export function orderSymbolsForRename<T extends { kind: SymbolCategory }>(
  symbols: readonly T[],
): T[] {
  const nonClass = symbols.filter((symbol) => symbol.kind !== 'class');
  const classSymbols = symbols.filter((symbol) => symbol.kind === 'class');
  return [...nonClass, ...classSymbols];
}