import * as assert from 'node:assert';
import {
  hasBuiltInSymbolProvider,
  recommendedSymbolExtension,
} from '../../src/core/languageSupport';

describe('hasBuiltInSymbolProvider', () => {
  it('covers languages VSCode serves out of the box', () => {
    for (const languageId of [
      'typescript',
      'typescriptreact',
      'javascript',
      'javascriptreact',
      'css',
      'scss',
      'less',
      'html',
      'json',
      'jsonc',
      'markdown',
    ]) {
      assert.strictEqual(hasBuiltInSymbolProvider(languageId), true, languageId);
    }
  });

  it('rejects languages that need an installed extension', () => {
    for (const languageId of ['python', 'go', 'rust', 'cpp', 'java', 'php']) {
      assert.strictEqual(hasBuiltInSymbolProvider(languageId), false, languageId);
    }
  });
});

describe('recommendedSymbolExtension', () => {
  it('maps known languages to their language-service extension', () => {
    assert.strictEqual(recommendedSymbolExtension('python'), 'ms-python.python');
    assert.strictEqual(recommendedSymbolExtension('go'), 'golang.go');
    assert.strictEqual(recommendedSymbolExtension('cpp'), 'ms-vscode.cpptools');
    assert.strictEqual(recommendedSymbolExtension('c'), 'ms-vscode.cpptools');
    assert.strictEqual(recommendedSymbolExtension('rust'), 'rust-lang.rust-analyzer');
  });

  it('returns undefined for built-in and unknown languages', () => {
    assert.strictEqual(recommendedSymbolExtension('typescript'), undefined);
    assert.strictEqual(recommendedSymbolExtension('not-a-language'), undefined);
  });
});