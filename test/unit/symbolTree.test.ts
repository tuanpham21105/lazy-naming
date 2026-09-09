import * as assert from 'node:assert';
import {
  categoryOfSymbolKind,
  flattenSymbols,
  orderSymbolsForRename,
  type SymbolNode,
} from '../../src/core/symbolTree';

function node(
  name: string,
  kind: SymbolNode<unknown>['kind'],
  children?: SymbolNode<unknown>[],
): SymbolNode<unknown> {
  return children === undefined
    ? { name, kind, range: {} }
    : { name, kind, range: {}, children };
}

describe('categoryOfSymbolKind', () => {
  it('maps structural symbols to null so they are never naming targets', () => {
    assert.strictEqual(categoryOfSymbolKind(3), null); // Package
    assert.strictEqual(categoryOfSymbolKind(0), null); // File
  });

  it('maps functions, methods, and constructors to method', () => {
    assert.strictEqual(categoryOfSymbolKind(11), 'method'); // Function
    assert.strictEqual(categoryOfSymbolKind(5), 'method'); // Method
    assert.strictEqual(categoryOfSymbolKind(8), 'method'); // Constructor
  });

  it('maps container kinds to class', () => {
    for (const kind of [4, 10, 22, 9, 1, 2, 18, 17, 25]) {
      assert.strictEqual(categoryOfSymbolKind(kind), 'class', String(kind));
    }
  });

  it('maps everything else to variable', () => {
    for (const kind of [6, 7, 12, 13, 21, 24]) {
      assert.strictEqual(categoryOfSymbolKind(kind), 'variable', String(kind));
    }
  });
});

describe('orderSymbolsForRename', () => {
  it('places class targets last while keeping relative order', () => {
    const targets = [
      { kind: 'method' as const, name: 'm1' },
      { kind: 'class' as const, name: 'c1' },
      { kind: 'variable' as const, name: 'v1' },
      { kind: 'class' as const, name: 'c2' },
      { kind: 'method' as const, name: 'm2' },
    ];
    assert.deepStrictEqual(
      orderSymbolsForRename(targets).map((target) => target.name),
      ['m1', 'v1', 'm2', 'c1', 'c2'],
    );
  });

  it('keeps all-class and all-non-class lists unchanged in order', () => {
    const classes = [
      { kind: 'class' as const, name: 'a' },
      { kind: 'class' as const, name: 'b' },
    ];
    assert.deepStrictEqual(orderSymbolsForRename(classes), classes);

    const nonClasses = [
      { kind: 'method' as const, name: 'm' },
      { kind: 'variable' as const, name: 'v' },
    ];
    assert.deepStrictEqual(orderSymbolsForRename(nonClasses), nonClasses);
  });

  it('returns an empty array for an empty input', () => {
    assert.deepStrictEqual(orderSymbolsForRename([]), []);
  });
});

describe('flattenSymbols', () => {
  it('flattens a nested tree in depth-first order', () => {
    const tree = [
      node('a', 'class', [node('a1', 'method', [node('a1x', 'variable')]), node('a2', 'method')]),
      node('b', 'class'),
    ];
    assert.deepStrictEqual(
      flattenSymbols(tree).map((symbol) => symbol.name),
      ['a', 'a1', 'a1x', 'a2', 'b'],
    );
  });

  it('keeps the kind and range of every node intact', () => {
    const rootRange = { fake: 'root' };
    const childRange = { fake: 'child' };
    const grandchildRange = { fake: 'grandchild' };
    const tree = [
      {
        name: 'a',
        kind: 'class' as const,
        range: rootRange,
        children: [
          {
            name: 'b',
            kind: 'method' as const,
            range: childRange,
            children: [
              { name: 'c', kind: 'variable' as const, range: grandchildRange },
            ],
          },
        ],
      },
    ];
    const flat = flattenSymbols(tree);
    assert.strictEqual(flat[0].range, rootRange);
    assert.strictEqual(flat[0].kind, 'class');
    assert.strictEqual(flat[1].range, childRange);
    assert.strictEqual(flat[1].kind, 'method');
    assert.strictEqual(flat[2].range, grandchildRange);
    assert.strictEqual(flat[2].kind, 'variable');
  });

  it('returns an empty array for an empty input', () => {
    assert.deepStrictEqual(flattenSymbols([]), []);
  });
});