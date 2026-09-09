import * as assert from 'node:assert';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface SymbolContextLike {
  languageId: string;
  symbolName: string;
  surroundingCode: string;
  surroundingStartLine: number;
  surroundingEndLine: number;
  usageLocations: vscode.Position[];
}

const contextReader = require('../../core/contextReader') as {
  WINDOW_LINES: number;
  computeWindowBounds: (
    anchorLine: number,
    lineCount: number,
    windowLines?: number,
  ) => { startLine: number; endLine: number };
  getDocumentContext: (
    document: vscode.TextDocument,
    symbolRange: vscode.Range,
    symbolName: string,
    options?: { windowLines?: number; maxUsages?: number },
  ) => SymbolContextLike;
};

function repoRoot(): string {
  const extension = vscode.extensions.getExtension('tuanpham21105.lazy-naming');
  if (extension !== undefined) {
    return extension.extensionPath;
  }
  return path.resolve(__dirname, '../../..');
}

function fixturePath(name: string): string {
  return path.join(repoRoot(), 'test', 'fixtures', name);
}

function firstRange(doc: vscode.TextDocument, symbol: string): vscode.Range {
  const offset = doc.getText().indexOf(symbol);
  assert.ok(offset >= 0, `Symbol "${symbol}" not found in fixture.`);
  const start = doc.positionAt(offset);
  const end = doc.positionAt(offset + symbol.length);
  return new vscode.Range(start, end);
}

function usageLines(symbol: SymbolContextLike): number[] {
  return symbol.usageLocations.map((pos) => pos.line);
}

let sampleTs: vscode.TextDocument;
let samplePy: vscode.TextDocument;
let sampleJava: vscode.TextDocument;
let shortTs: vscode.TextDocument;

suite('contextReader', () => {
  suiteSetup(async () => {
    sampleTs = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fixturePath('sample.ts')),
    );
    samplePy = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fixturePath('sample.py')),
    );
    sampleJava = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fixturePath('sample.java')),
    );
    shortTs = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fixturePath('short.ts')),
    );
  });

  teardown(() => {
    void vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('returns the correct languageId for each fixture', () => {
    assert.strictEqual(
      contextReader.getDocumentContext(sampleTs, firstRange(sampleTs, 'OrderItem'), 'OrderItem').languageId,
      'typescript',
    );
    assert.strictEqual(
      contextReader.getDocumentContext(samplePy, firstRange(samplePy, 'compute_discount'), 'compute_discount').languageId,
      'python',
    );
    assert.strictEqual(
      contextReader.getDocumentContext(sampleJava, firstRange(sampleJava, 'calculateTotal'), 'calculateTotal').languageId,
      'java',
    );
    assert.strictEqual(
      contextReader.getDocumentContext(shortTs, firstRange(shortTs, 'add'), 'add').languageId,
      'typescript',
    );
  });

  test('returns a centered window of the expected size for a mid-file symbol', () => {
    const symbol = contextReader.getDocumentContext(
      sampleTs,
      firstRange(sampleTs, 'summarize'),
      'summarize',
    );
    assert.strictEqual(symbol.surroundingStartLine, 8);
    assert.strictEqual(symbol.surroundingEndLine, 37);
    assert.strictEqual(
      symbol.surroundingEndLine - symbol.surroundingStartLine + 1,
      contextReader.WINDOW_LINES,
    );
    assert.ok(symbol.surroundingCode.includes('export function summarize('));
  });

  test('clamps to line 0 for a symbol at the top of the file', () => {
    const symbol = contextReader.getDocumentContext(
      sampleTs,
      firstRange(sampleTs, 'OrderItem'),
      'OrderItem',
    );
    assert.strictEqual(symbol.surroundingStartLine, 0);
    assert.ok(symbol.surroundingStartLine >= 0);
  });

  test('does not exceed the last line for a symbol near the bottom', () => {
    const symbol = contextReader.getDocumentContext(
      sampleTs,
      firstRange(sampleTs, 'itemCount'),
      'itemCount',
    );
    assert.strictEqual(symbol.surroundingEndLine, sampleTs.lineCount - 1);
  });

  test('returns the whole file for a file shorter than the window', () => {
    const symbol = contextReader.getDocumentContext(
      shortTs,
      firstRange(shortTs, 'add'),
      'add',
    );
    assert.strictEqual(symbol.surroundingStartLine, 0);
    assert.strictEqual(symbol.surroundingEndLine, shortTs.lineCount - 1);
  });

  test('finds additional usages of the symbol and never matches a longer identifier', () => {
    const symbol = contextReader.getDocumentContext(
      sampleTs,
      firstRange(sampleTs, 'calculateTotal'),
      'calculateTotal',
    );
    assert.deepStrictEqual(usageLines(symbol), [14, 18, 29, 42]);
  });

  test('excludes the anchor position itself from usages', () => {
    const symbol = contextReader.getDocumentContext(
      samplePy,
      firstRange(samplePy, 'compute_discount'),
      'compute_discount',
    );
    assert.deepStrictEqual(usageLines(symbol), [6, 10]);
  });

  test('returns an empty usage list when the symbol appears only once', () => {
    const symbol = contextReader.getDocumentContext(
      shortTs,
      firstRange(shortTs, 'result'),
      'result',
    );
    assert.deepStrictEqual(usageLines(symbol), []);
  });
});