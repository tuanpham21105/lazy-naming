import * as assert from 'node:assert';
import { flattenSymbols, type SymbolNode } from '../../src/core/symbolTree';

function node(name: string, children?: SymbolNode<unknown>[]): SymbolNode<unknown> {
  return children === undefined ? { name, range: {} } : { name, range: {}, children };
}

describe('flattenSymbols', () => {
  it('flattens a nested tree in depth-first order', () => {
    const tree = [
      node('a', [node('a1', [node('a1x')]), node('a2')]),
      node('b'),
    ];
    assert.deepStrictEqual(
      flattenSymbols(tree).map((symbol) => symbol.name),
      ['a', 'a1', 'a1x', 'a2', 'b'],
    );
  });

  it('returns an empty array for an empty input', () => {
    assert.deepStrictEqual(flattenSymbols([]), []);
  });

  it('keeps the range of every node intact', () => {
    const rootRange = { fake: 'root' };
    const childRange = { fake: 'child' };
    const grandchildRange = { fake: 'grandchild' };
    const tree = [
      { name: 'a', range: rootRange, children: [
        { name: 'b', range: childRange, children: [
          { name: 'c', range: grandchildRange },
        ] },
      ] },
    ];
    const flat = flattenSymbols(tree);
    assert.strictEqual(flat[0].range, rootRange);
    assert.strictEqual(flat[1].range, childRange);
    assert.strictEqual(flat[2].range, grandchildRange);
  });
});