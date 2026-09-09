import * as assert from 'node:assert';
import {
  computeWindowBounds,
  findSymbolMatches,
  WINDOW_LINES,
} from '../../src/core/contextReader';

describe('computeWindowBounds', () => {
  it('creates a window centered on the anchor for a mid-file position', () => {
    assert.deepStrictEqual(computeWindowBounds(40, 100, 30), {
      startLine: 26,
      endLine: 55,
    });
  });

  it('uses a balanced window for odd window sizes', () => {
    assert.deepStrictEqual(computeWindowBounds(50, 100, 31), {
      startLine: 35,
      endLine: 65,
    });
  });

  it('clamps to line 0 for symbols near the top with no negative lines', () => {
    assert.deepStrictEqual(computeWindowBounds(0, 100, 20), {
      startLine: 0,
      endLine: 19,
    });
    assert.deepStrictEqual(computeWindowBounds(3, 100, 20), {
      startLine: 0,
      endLine: 19,
    });
  });

  it('never exceeds the last line for symbols near the bottom', () => {
    const bounds = computeWindowBounds(99, 100, 30);
    assert.strictEqual(bounds.startLine, 70);
    assert.strictEqual(bounds.endLine, 99);
  });

  it('keeps the window full-sized when the anchor is near the bottom', () => {
    const bounds = computeWindowBounds(95, 100, 30);
    assert.strictEqual(bounds.endLine - bounds.startLine + 1, 30);
    assert.strictEqual(bounds.endLine, 99);
    assert.ok(bounds.startLine <= 95 && bounds.endLine >= 95);
  });

  it('returns the whole file for files shorter than the window', () => {
    assert.deepStrictEqual(computeWindowBounds(3, 5, WINDOW_LINES), {
      startLine: 0,
      endLine: 4,
    });
    assert.deepStrictEqual(computeWindowBounds(0, 1, WINDOW_LINES), {
      startLine: 0,
      endLine: 0,
    });
  });

  it('always includes the anchor line', () => {
    const bounds = computeWindowBounds(7, 10, 5);
    assert.ok(bounds.startLine <= 7 && bounds.endLine >= 7);
  });

  it('guards against a degenerate line count', () => {
    assert.deepStrictEqual(computeWindowBounds(0, 0, 30), {
      startLine: 0,
      endLine: -1,
    });
  });
});

describe('findSymbolMatches', () => {
  it('returns all occurrences of the symbol', () => {
    const text = 'a(b); then b(a); and a(c);';
    assert.deepStrictEqual(findSymbolMatches(text, 'a'), [0, 13, 21]);
  });

  it('returns an empty array when there are no matches', () => {
    assert.deepStrictEqual(findSymbolMatches('foo bar baz', 'qux'), []);
  });

  it('does not match inside a longer identifier', () => {
    const text = 'doStuff(); doStuffing();';
    assert.deepStrictEqual(findSymbolMatches(text, 'doStuff'), [0]);
  });

  it('does not match a symbol that is a prefix of another identifier', () => {
    const text = 'calculateTotal(x); calculateTotals(y);';
    assert.deepStrictEqual(findSymbolMatches(text, 'calculateTotal'), [0]);
  });

  it('respects word boundaries at the start and end of the text', () => {
    assert.deepStrictEqual(findSymbolMatches('target x target', 'target'), [0, 9]);
    assert.deepStrictEqual(findSymbolMatches('target x', 'x'), [7]);
  });

  it('escapes regex-special characters in the symbol name', () => {
    assert.deepStrictEqual(findSymbolMatches('a $total b $total', '$total'), [2, 11]);
  });

  it('respects the maxMatches cap', () => {
    assert.deepStrictEqual(findSymbolMatches('a a a a a', 'a', 2), [0, 2]);
  });

  it('returns an empty array for an empty symbol name', () => {
    assert.deepStrictEqual(findSymbolMatches('abc', ''), []);
  });
});