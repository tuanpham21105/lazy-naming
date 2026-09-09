import * as assert from 'node:assert';
import * as path from 'node:path';
import * as vscode from 'vscode';

const renameApplier = require('../../core/renameApplier') as {
  computeRenameEdit: (
    document: vscode.TextDocument,
    position: vscode.Position,
    newName: string,
  ) => Promise<vscode.WorkspaceEdit | undefined>;
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

suite('renameApplier', () => {
  suiteSetup(async () => {
    sampleTs = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fixturePath('sample.ts')),
    );
    await vscode.window.showTextDocument(sampleTs, { preview: true });
  });

  teardown(() => {
    void vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function firstNonEmptyRename(
  positions: vscode.Position[],
): Promise<vscode.WorkspaceEdit> {
  for (let attempt = 0; attempt < 20; attempt++) {
    for (const position of positions) {
      const edit = await renameApplier.computeRenameEdit(
        sampleTs,
        position,
        'computeOrderTotal',
      );
      if (edit !== undefined && edit.size > 0) {
        return edit;
      }
    }
    await delay(250);
  }
  throw new Error('Rename provider returned no edits after retries.');
}

test('computes rename edits from a usage reference of a TypeScript symbol', async () => {
    const text = sampleTs.getText();
    const declOffset = text.indexOf('calculateTotal');
    assert.ok(declOffset >= 0, 'Symbol "calculateTotal" not found in fixture.');
    const useOffset = text.indexOf('calculateTotal', declOffset + 1);
    assert.ok(useOffset >= 0, 'Usage of "calculateTotal" not found in fixture.');

    const edit = await firstNonEmptyRename([
      sampleTs.positionAt(useOffset),
    ]);
    assert.ok(edit.size > 0);
  });
});