import * as assert from 'node:assert';
import {
  buildDocstringInsertion,
  findDocstringBlock,
  indentLines,
  isDocstringText,
  planDocstringEdits,
} from '../../src/core/docstringInserter';

describe('indentLines', () => {
  it('prefixes each non-empty line with the indentation', () => {
    assert.strictEqual(
      indentLines('/**\n * sums\n */', '  '),
      '  /**\n   * sums\n   */',
    );
  });

  it('leaves blank lines empty', () => {
    assert.strictEqual(indentLines('* a\n\n* b', '  '), '  * a\n\n  * b');
  });

  it('does nothing when indentation is empty', () => {
    assert.strictEqual(indentLines('/** plain */', ''), '/** plain */');
  });

  it('normalizes Windows line endings', () => {
    assert.strictEqual(indentLines('/**\r\n * x\r\n */', ''), '/**\n * x\n */');
  });
});

describe('isDocstringText', () => {
  it('accepts comment markers for TypeScript-like languages', () => {
    assert.strictEqual(isDocstringText('/** Sums. */', 'java'), true);
    assert.strictEqual(isDocstringText('/* Sums. */', 'typescript'), true);
    assert.strictEqual(isDocstringText('// Sums.', 'javascript'), true);
  });

  it('accepts Python docstring markers', () => {
    assert.strictEqual(isDocstringText('"""Computes."""', 'python'), true);
    assert.strictEqual(isDocstringText("'''Computes.'''", 'python'), true);
    assert.strictEqual(isDocstringText('# Computes.', 'python'), true);
  });

  it('rejects plain text and empty responses', () => {
    assert.strictEqual(isDocstringText('Doubles a value.', 'typescript'), false);
    assert.strictEqual(isDocstringText('  ', 'java'), false);
    assert.strictEqual(isDocstringText('', 'python'), false);
  });
});

describe('planDocstringEdits', () => {
  it('plans inserts for multiple symbols without interleaving', () => {
    const lines = [
      'public class sample {',
      '',
      '  public double calculateTotal(double[] prices) {',
      '    return 0;',
      '  }',
      '',
      '  public double applyToAll(double[] prices) {',
      '    return 0;',
      '  }',
      '}',
    ];
    const insertions = planDocstringEdits(lines, [
      { line: 0, docstring: '/** class doc */' },
      { line: 2, docstring: '/**\n * calc doc\n */' },
      { line: 6, docstring: '/**\n * apply doc\n */' },
    ], 'java');

    assert.strictEqual(insertions.length, 3);
    for (let i = 1; i < insertions.length; i++) {
      assert.ok(
        insertions[i - 1].startLine >= insertions[i].endLine,
        'Insertions must not overlap.',
      );
    }

    const classInsert = insertions.find((item) => item.startLine === 0);
    const methodInsert = insertions.find((item) => item.startLine === 2);
    assert.ok(classInsert !== undefined);
    assert.ok(methodInsert !== undefined);
    for (const line of methodInsert!.text.split('\n').slice(0, -1)) {
      assert.ok(line.startsWith('  '), `Expected 2-space indent, got "${line}"`);
    }
  });

  it('drops duplicates on the same declaration line', () => {
    const insertions = planDocstringEdits(
      ['const a = 1, b = 2;'],
      [
        { line: 0, docstring: '/** A doc. */' },
        { line: 0, docstring: '/** B doc. */' },
      ],
      'typescript',
    );
    assert.strictEqual(insertions.length, 1);
  });

  it('skips targets whose docstring is blank', () => {
    const insertions = planDocstringEdits(
      ['export function add() {}', 'export function sub() {}'],
      [
        { line: 0, docstring: '/** Add. */' },
        { line: 1, docstring: '   ' },
      ],
      'typescript',
    );
    assert.strictEqual(insertions.length, 1);
    assert.strictEqual(insertions[0].startLine, 0);
  });
});

describe('findDocstringBlock', () => {
  it('finds a contiguous JSDoc block directly above the declaration', () => {
    const lines = ['/**', ' * Sums two numbers.', ' */', 'export function add() {}'];
    assert.deepStrictEqual(findDocstringBlock(lines, 3, 'typescript'), {
      startLine: 0,
      endLine: 2,
    });
  });

  it('returns undefined when a blank line separates the comment', () => {
    const lines = ['/**', ' */', '', 'export function add() {}'];
    assert.strictEqual(findDocstringBlock(lines, 3, 'typescript'), undefined);
  });

  it('returns undefined when the declaration is at line 0', () => {
    assert.strictEqual(findDocstringBlock(['export function add() {}'], 0, 'typescript'), undefined);
  });

  it('finds contiguous Python triple-quoted docstrings', () => {
    const lines = ['"""Computes the discount."""', 'def compute_discount(price):', '    ...'];
    assert.deepStrictEqual(findDocstringBlock(lines, 1, 'python'), {
      startLine: 0,
      endLine: 0,
    });
  });

  it('detects Python hash comments as a block', () => {
    const lines = ['# Computes the discount.', 'def compute_discount(price):', '    ...'];
    assert.deepStrictEqual(findDocstringBlock(lines, 1, 'python'), {
      startLine: 0,
      endLine: 0,
    });
  });

  it('stops at a non-comment line above the block', () => {
    const lines = ['const X = 1;', '/**', ' */', 'export function add() {}'];
    assert.deepStrictEqual(findDocstringBlock(lines, 3, 'typescript'), {
      startLine: 1,
      endLine: 2,
    });
  });
});

describe('buildDocstringInsertion', () => {
  it('builds an insert at the declaration line when no docstring exists', () => {
    const lines = ['export function add() {}'];
    const insertion = buildDocstringInsertion(lines, 0, '/** Sums. */', 'typescript');
    assert.ok(insertion !== undefined);
    assert.strictEqual(insertion!.kind, 'insert');
    assert.strictEqual(insertion!.startLine, 0);
    assert.strictEqual(insertion!.endLine, 0);
    assert.strictEqual(insertion!.text, '/** Sums. */\n');
  });

  it('builds a replace spanning the existing block up to the declaration', () => {
    const lines = ['/** Old docs. */', 'export function add() {}'];
    const insertion = buildDocstringInsertion(lines, 1, '/** New docs. */', 'typescript');
    assert.ok(insertion !== undefined);
    assert.strictEqual(insertion!.kind, 'replace');
    assert.strictEqual(insertion!.startLine, 0);
    assert.strictEqual(insertion!.endLine, 1);
    assert.ok(insertion!.text.startsWith('/** New docs. */'));
  });

  it('prefixes every line with the declaration indentation', () => {
    const lines = ['class Cart {', '  /** Old */', '  addItem() {}'] as const;
    const insertion = buildDocstringInsertion(
      lines as string[],
      2,
      '/** Adds an item. */',
      'typescript',
    );
    assert.ok(insertion !== undefined);
    assert.strictEqual(insertion!.kind, 'replace');
    for (const line of insertion!.text.split('\n').slice(0, -1)) {
      assert.ok(line.startsWith('  '), `Expected indented line, got "${line}"`);
    }
  });

  it('returns undefined for an empty or blank docstring', () => {
    assert.strictEqual(
      buildDocstringInsertion(['export function add() {}'], 0, '   ', 'typescript'),
      undefined,
    );
  });

  it('strips surrounding whitespace from the docstring', () => {
    const insertion = buildDocstringInsertion(
      ['export function add() {}'],
      0,
      '  \n/** Sums. *//n  '.replace('/n', '\n'),
      'typescript',
    );
    assert.ok(insertion !== undefined);
    assert.strictEqual(insertion!.text, '/** Sums. */\n');
  });
});