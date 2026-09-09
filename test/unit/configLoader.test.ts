import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  DEFAULT_CONFIG,
  loadConfig,
  type LazyNamingConfig,
} from '../../src/config/configLoader';

function makeWorkspace(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lazy-naming-test-'));
}

function writeConfig(workspaceRoot: string, content: string): void {
  const dir = path.join(workspaceRoot, '.vscode');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'lazy-naming.json'), content, 'utf8');
}

function withConsoleWarnSpy(): string[] {
  const originalWarn = console.warn;
  const messages: string[] = [];
  console.warn = (message?: unknown, ...args: unknown[]) => {
    messages.push(String(message) + args.map(String).join(' '));
  };
  afterEach(() => {
    console.warn = originalWarn;
  });
  return messages;
}

let workspaceRoot: string;
let warnings: string[];

beforeEach(() => {
  workspaceRoot = makeWorkspace();
});

afterEach(() => {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
});

describe('configLoader', () => {
  describe('when .vscode/lazy-naming.json does not exist', () => {
    it('returns the default configuration with all fields present', async () => {
      const config = await loadConfig(workspaceRoot);
      assert.deepStrictEqual(config, DEFAULT_CONFIG);
      assert.ok('namingStyle' in config);
      assert.ok('commentLanguage' in config);
      assert.ok('prefixRules' in config);
      assert.ok('customRules' in config);
    });
  });

  describe('when the file has a partial configuration', () => {
    it('merges it with defaults so all fields are always defined', async () => {
      writeConfig(workspaceRoot, JSON.stringify({ namingStyle: 'snake_case' }));
      const config = await loadConfig(workspaceRoot);
      assert.strictEqual(config.namingStyle, 'snake_case');
      assert.strictEqual(config.commentLanguage, 'en');
      assert.deepStrictEqual(config.prefixRules, {});
      assert.strictEqual(config.customRules, '');
    });

    it('preserves every provided field', async () => {
      writeConfig(
        workspaceRoot,
        JSON.stringify({
          namingStyle: 'PascalCase',
          commentLanguage: 'vi',
          prefixRules: { boolean: ['is', 'has'], handler: ['on'] },
          customRules: 'Use DDD conventions.',
        }),
      );
      const config = await loadConfig(workspaceRoot);
      assert.deepStrictEqual(config, {
        namingStyle: 'PascalCase',
        commentLanguage: 'vi',
        prefixRules: { boolean: ['is', 'has'], handler: ['on'] },
        customRules: 'Use DDD conventions.',
      });
    });
  });

  describe('when the file contains an unrecognized field', () => {
    it('ignores it without throwing', async () => {
      writeConfig(
        workspaceRoot,
        JSON.stringify({ unknownField: 123, namingStyle: 'snake_case' }),
      );
      const config = await loadConfig(workspaceRoot);
      assert.strictEqual(config.namingStyle, 'snake_case');
      assert.strictEqual(config.commentLanguage, 'en');
    });
  });

  describe('when the file is malformed JSON', () => {
    it('catches the parse error, warns, and returns defaults', async () => {
      warnings = withConsoleWarnSpy();
      writeConfig(workspaceRoot, '{ not valid json');
      const config = await loadConfig(workspaceRoot);
      assert.deepStrictEqual(config, DEFAULT_CONFIG);
      assert.strictEqual(warnings.length, 1);
    });
  });

  describe('when the file is not a JSON object', () => {
    it('warns and returns defaults', async () => {
      warnings = withConsoleWarnSpy();
      writeConfig(workspaceRoot, '[1, 2, 3]');
      const config = await loadConfig(workspaceRoot);
      assert.deepStrictEqual(config, DEFAULT_CONFIG);
      assert.strictEqual(warnings.length, 1);
    });
  });

  describe('invalid field values', () => {
    it('falls back to the default naming style when invalid', async () => {
      warnings = withConsoleWarnSpy();
      writeConfig(workspaceRoot, JSON.stringify({ namingStyle: 'kebab-case' }));
      const config = await loadConfig(workspaceRoot);
      assert.strictEqual(config.namingStyle, 'camelCase');
      assert.strictEqual(warnings.length, 1);
    });

    it('falls back to the default comment language when invalid', async () => {
      warnings = withConsoleWarnSpy();
      writeConfig(workspaceRoot, JSON.stringify({ commentLanguage: 42 }));
      const config = await loadConfig(workspaceRoot);
      assert.strictEqual(config.commentLanguage, 'en');
      assert.strictEqual(warnings.length, 1);
    });

    it('ignores malformed prefixRules entries', async () => {
      writeConfig(
        workspaceRoot,
        JSON.stringify({
          prefixRules: { boolean: ['is', 42], handler: ['on'] },
        }),
      );
      const config = await loadConfig(workspaceRoot);
      assert.deepStrictEqual(config.prefixRules, { handler: ['on'] });
    });

    it('ignores a non-string customRules', async () => {
      warnings = withConsoleWarnSpy();
      writeConfig(workspaceRoot, JSON.stringify({ customRules: ['x'] }));
      const config = await loadConfig(workspaceRoot);
      assert.strictEqual(config.customRules, '');
      assert.strictEqual(warnings.length, 1);
    });
  });

  describe('returned object isolation', () => {
    it('does not share mutable state with the defaults', async () => {
      const config = await loadConfig(workspaceRoot);
      config.namingStyle = 'snake_case';
      config.prefixRules.extra = ['x'];
      assert.strictEqual(DEFAULT_CONFIG.namingStyle, 'camelCase');
      assert.ok(!('extra' in DEFAULT_CONFIG.prefixRules));

      const second = await loadConfig(workspaceRoot);
      assert.deepStrictEqual(second, DEFAULT_CONFIG);
    });
  });

  it('loads a fully-specified config unchanged', async () => {
    const expected: LazyNamingConfig = {
      namingStyle: 'snake_case',
      commentLanguage: 'vi',
      prefixRules: { boolean: ['is', 'has', 'can'], handler: ['on', 'handle'] },
      customRules: 'This project follows DDD conventions.',
    };
    writeConfig(workspaceRoot, JSON.stringify(expected));
    const config = await loadConfig(workspaceRoot);
    assert.deepStrictEqual(config, expected);
  });
});