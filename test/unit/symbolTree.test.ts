import * as assert from 'node:assert';
import { flattenSymbols, type SymbolNode } from '../../src/core/symbolTree';

function node(
  name: string,
  kind: SymbolNode<unknown>['kind'],
  children?: SymbolNode<unknown>[],
): SymbolNode<unknown> {
  return children === undefined
    ? { name, kind, range: {} }
    : { name, kind, range: {}, children };
}

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