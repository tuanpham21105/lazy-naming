import * as assert from 'node:assert';
import * as path from 'node:path';
import * as vscode from 'vscode';

interface FileSymbolLike {
  name: string;
  range: vscode.Range;
  children?: FileSymbolLike[];
}

const documentSymbols = require('../../core/documentSymbols') as {
  getDocumentSymbols: (document: vscode.TextDocument) => Promise<FileSymbolLike[]>;
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

  test('returns an array for files without an active language service', async () => {
    const pyResults = await documentSymbols.getDocumentSymbols(samplePy);
    const javaResults = await documentSymbols.getDocumentSymbols(sampleJava);
    assert.ok(Array.isArray(pyResults));
    assert.ok(Array.isArray(javaResults));
  });
});