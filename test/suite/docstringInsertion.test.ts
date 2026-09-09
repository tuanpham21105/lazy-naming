import * as assert from 'node:assert';
import * as vscode from 'vscode';

const renameApplier = require('../../core/renameApplier') as {
  computeDocstringEdit: (
    document: vscode.TextDocument,
    symbolRange: vscode.Range,
    docstring: string,
  ) => Promise<vscode.WorkspaceEdit | undefined>;
  computeDocstringsEdit: (
    document: vscode.TextDocument,
    targets: { range: vscode.Range; docstring: string }[],
  ) => Promise<vscode.WorkspaceEdit | undefined>;
};

async function inMemoryDoc(content: string): Promise<vscode.TextDocument> {
  return vscode.workspace.openTextDocument({ language: 'typescript', content });
}

function symbolRange(doc: vscode.TextDocument, name: string): vscode.Range {
  const offset = doc.getText().indexOf(name);
  assert.ok(offset >= 0, `Symbol "${name}" not found in content.`);
  return new vscode.Range(doc.positionAt(offset), doc.positionAt(offset + name.length));
}

function singleTextEdit(
  edit: vscode.WorkspaceEdit,
): { range: vscode.Range; newText: string } {
  for (const [, textEdits] of edit.entries()) {
    assert.ok(textEdits.length > 0, 'Expected at least one text edit.');
    return { range: textEdits[0].range, newText: textEdits[0].newText };
  }
  throw new Error('Edit had no entries.');
}

function simulatedApply(
  original: string,
  range: vscode.Range,
  newText: string,
  doc: vscode.TextDocument,
): string {
  const start = doc.offsetAt(range.start);
  const end = doc.offsetAt(range.end);
  return original.slice(0, start) + newText + original.slice(end);
}

function simulateMultiApply(
  content: string,
  edit: vscode.WorkspaceEdit,
  doc: vscode.TextDocument,
): string {
  const edits: { start: number; end: number; text: string }[] = [];
  for (const [, textEdits] of edit.entries()) {
    for (const textEdit of textEdits) {
      edits.push({
        start: doc.offsetAt(textEdit.range.start),
        end: doc.offsetAt(textEdit.range.end),
        text: textEdit.newText,
      });
    }
  }
  edits.sort((a, b) => b.start - a.start);
  let result = content;
  for (const entry of edits) {
    result = result.slice(0, entry.start) + entry.text + result.slice(entry.end);
  }
  return result;
}

suite('docstring insertion', () => {
  teardown(() => {
    void vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('inserts a JSDoc block at line 0 with no leading blank line', async () => {
    const doc = await inMemoryDoc('export function top(): void {}');
    const edit = await renameApplier.computeDocstringEdit(
      doc,
      symbolRange(doc, 'top'),
      '/** Top-level function. */',
    );
    assert.ok(edit !== undefined);
    const { range, newText } = singleTextEdit(edit!);
    assert.strictEqual(range.start.line, 0);
    assert.strictEqual(range.start.character, 0);
    assert.ok(newText.startsWith('/**'));
    assert.ok(!newText.startsWith('\n'));
  });

  test('preserves a blank line above the comment', async () => {
    const doc = await inMemoryDoc('\n\nexport function f(): void {}');
    const edit = await renameApplier.computeDocstringEdit(
      doc,
      symbolRange(doc, 'f'),
      '/** Describes f. */',
    );
    assert.ok(edit !== undefined);
    const { range, newText } = singleTextEdit(edit!);
    assert.strictEqual(range.start.line, 2);
    assert.strictEqual(range.start.character, 0);
    assert.ok(newText.startsWith('/** Describes f. */'));
  });

  test('matches the indentation of the target symbol', async () => {
    const content = 'class Cart {\n  addItem() {}\n}';
    const doc = await inMemoryDoc(content);
    const edit = await renameApplier.computeDocstringEdit(
      doc,
      symbolRange(doc, 'addItem'),
      '/** Adds an item. */',
    );
    assert.ok(edit !== undefined);
    const { newText } = singleTextEdit(edit!);
    const lines = newText.split('\n').slice(0, -1);
    for (const line of lines) {
      assert.ok(line.startsWith('  '), `Expected indented line, got "${line}"`);
    }
  });

  test('replaces an existing docstring without duplicating it', async () => {
    const content = '/** Old docs. */\nexport function f(): void {}';
    const doc = await inMemoryDoc(content);
    const edit = await renameApplier.computeDocstringEdit(
      doc,
      symbolRange(doc, 'f'),
      '/** New docs. */',
    );
    assert.ok(edit !== undefined);
    const { range, newText } = singleTextEdit(edit!);
    assert.strictEqual(range.start.line, 0);
    assert.strictEqual(range.end.line, 1);
    assert.strictEqual(range.end.character, 0);

    const applied = simulatedApply(content, range, newText, doc);
    assert.ok(applied.startsWith('/** New docs. */\n'));
    assert.ok(!applied.includes('/** Old docs. */'));
    assert.strictEqual(applied.match(/\/\*\*/g)?.length ?? 0, 1);
  });

  test('plans combined edits for multiple symbols without interleaving', async () => {
    const content = [
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
    ].join('\n');
    const doc = await inMemoryDoc(content);
    const edit = await renameApplier.computeDocstringsEdit(doc, [
      { range: symbolRange(doc, 'sample'), docstring: '/** Class-level docs. */' },
      {
        range: symbolRange(doc, 'calculateTotal'),
        docstring: '/**\n * Calculates the total.\n */',
      },
      {
        range: symbolRange(doc, 'applyToAll'),
        docstring: '/**\n * Applies to all.\n */',
      },
    ]);
    assert.ok(edit !== undefined, 'Expected a combined edit.');

    const applied = simulateMultiApply(content, edit!, doc);
    assert.ok(applied.startsWith('/** Class-level docs. */\n'), applied.slice(0, 60));

    const classIdx = applied.indexOf('public class sample');
    const calcIdx = applied.indexOf('public double calculateTotal');
    const applyIdx = applied.indexOf('public double applyToAll');
    assert.ok(classIdx < calcIdx, 'Class block must sit above the class.');
    assert.ok(calcIdx < applyIdx, 'Method blocks must sit above their own methods.');

    assert.strictEqual(applied.match(/\/\*\*/g)?.length ?? 0, 3);
    assert.ok(
      applied.includes(
        '  /**\n   * Calculates the total.\n   */\n  public double calculateTotal',
      ),
      'Method docstring must be 2-space indented and adjacent.',
    );
  });

  test('returns an undefined edit for an empty docstring', async () => {
    const doc = await inMemoryDoc('export function f(): void {}');
    const edit = await renameApplier.computeDocstringEdit(
      doc,
      symbolRange(doc, 'f'),
      '   ',
    );
    assert.strictEqual(edit, undefined);
  });
});