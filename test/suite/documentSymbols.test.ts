import * as assert from 'node:assert';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface FileSymbolLike {
  name: string;
  kind: 'class' | 'method' | 'variable';
  range: vscode.Range;
  children?: FileSymbolLike[];
}

const documentSymbols = require('../../core/documentSymbols') as {
  getDocumentSymbols: (document: vscode.TextDocument) => Promise<FileSymbolLike[]>;
  resolveSelectionKind: (
    document: vscode.TextDocument,
    selection: vscode.Range,
  ) => Promise<FileSymbolLike['kind']>;
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

let sampleTs: vscode.TextDocument;
let samplePy: vscode.TextDocument;
let sampleJava: vscode.TextDocument;

suite('documentSymbols', () => {
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
  });

  teardown(() => {
    void vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('enumerates the expected names for a TypeScript file', async () => {
    const symbols = await documentSymbols.getDocumentSymbols(sampleTs);
    const names = symbols.map((symbol) => symbol.name);
    const expected = [
      'OrderItem',
      'TAX_RATE',
      'calculateTotal',
      'calculateTotalsForGroup',
      'formatReceipt',
      'summarize',
      'Cart',
      'add',
      '(get) total',
      '(get) itemCount',
    ];
    for (const name of expected) {
      assert.ok(names.includes(name), `Expected "${name}" in ${names.join(', ')}`);
    }
  });

  test('selection ranges point at the symbol name', async () => {
    const symbols = await documentSymbols.getDocumentSymbols(sampleTs);
    const found = symbols.find((symbol) => symbol.name === 'calculateTotal');
    assert.ok(found !== undefined);
    assert.strictEqual(sampleTs.getText(found!.range), 'calculateTotal');
  });

  test('reports the kind of each symbol', async () => {
    const symbols = await documentSymbols.getDocumentSymbols(sampleTs);
    const byName = Object.fromEntries(symbols.map((symbol) => [symbol.name, symbol.kind]));
    assert.strictEqual(byName['OrderItem'], 'class');
    assert.strictEqual(byName['Cart'], 'class');
    assert.strictEqual(byName['calculateTotal'], 'method');
    assert.strictEqual(byName['add'], 'method');
    assert.strictEqual(byName['TAX_RATE'], 'variable');
  });

  test('matches the numeric SymbolKind values used by the pure mapping', () => {
    assert.strictEqual(vscode.SymbolKind.Package, 3);
    assert.strictEqual(vscode.SymbolKind.File, 0);
    assert.strictEqual(vscode.SymbolKind.Class, 4);
    assert.strictEqual(vscode.SymbolKind.Method, 5);
    assert.strictEqual(vscode.SymbolKind.Function, 11);
    assert.strictEqual(vscode.SymbolKind.Variable, 12);
  });

  test('resolves the kind of a symbol from a selection inside it', async () => {
    const symbols = await documentSymbols.getDocumentSymbols(sampleTs);
    const calculateTotal = symbols.find((symbol) => symbol.name === 'calculateTotal');
    const cart = symbols.find((symbol) => symbol.name === 'Cart');
    assert.ok(calculateTotal !== undefined);
    assert.ok(cart !== undefined);
    assert.strictEqual(
      await documentSymbols.resolveSelectionKind(sampleTs, calculateTotal!.range),
      'method',
    );
    assert.strictEqual(
      await documentSymbols.resolveSelectionKind(sampleTs, cart!.range),
      'class',
    );
  });

  test('falls back to variable for selections outside any known symbol', async () => {
    const fallback = new vscode.Range(0, 0, 0, 1);
    assert.strictEqual(await documentSymbols.resolveSelectionKind(sampleTs, fallback), 'variable');
  });

  test('returns an array for files without an active language service', async () => {
    const pyResults = await documentSymbols.getDocumentSymbols(samplePy);
    const javaResults = await documentSymbols.getDocumentSymbols(sampleJava);
    assert.ok(Array.isArray(pyResults));
    assert.ok(Array.isArray(javaResults));
  });
});