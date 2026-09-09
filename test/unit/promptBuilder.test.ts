import * as assert from 'node:assert';
import type { LazyNamingConfig } from '../../src/config/configLoader';
import type { SymbolContext } from '../../src/core/contextReader';
import {
  buildDescriptionPrompt,
  buildRenamePrompt,
  getCommentFormat,
  parseDocstring,
  parseNameSuggestions,
} from '../../src/core/promptBuilder';

const config: LazyNamingConfig = {
  namingStyle: 'snake_case',
  commentLanguage: 'vi',
  prefixRules: {},
  customRules: 'Use DDD terms such as Order and Customer.',
};

const context: SymbolContext = {
  languageId: 'typescript',
  symbolName: 'doStuff',
  surroundingCode:
    'export function doStuff(a: number): number {\n  return a + 1;\n}',
  surroundingStartLine: 0,
  surroundingEndLine: 2,
  usageLocations: [{ line: 5 }, { line: 9 }] as unknown as SymbolContext['usageLocations'],
};

const pythonContext: SymbolContext = {
  ...context,
  languageId: 'python',
  symbolName: 'do_stuff',
};

const javaContext: SymbolContext = {
  ...context,
  languageId: 'java',
  symbolName: 'doStuff',
};

describe('getCommentFormat', () => {
  it('maps each supported language to its comment format', () => {
    assert.strictEqual(getCommentFormat('typescript'), 'JSDoc');
    assert.strictEqual(getCommentFormat('typescriptreact'), 'JSDoc');
    assert.strictEqual(getCommentFormat('javascript'), 'JSDoc');
    assert.strictEqual(getCommentFormat('python'), 'Python docstring (triple-quoted string)');
    assert.strictEqual(getCommentFormat('java'), 'Javadoc');
  });

  it('falls back to a generic format for unknown languages', () => {
    assert.strictEqual(getCommentFormat('rust'), 'a standard doc comment');
  });
});

describe('buildRenamePrompt', () => {
  it('includes the symbol, surrounding code, language, naming style, and custom rules', () => {
    const prompt = buildRenamePrompt(context, config, 'it doubles a value');
    assert.ok(prompt.includes('doStuff'));
    assert.ok(prompt.includes('return a + 1'));
    assert.ok(prompt.includes('typescript'));
    assert.ok(prompt.includes('snake_case'));
    assert.ok(prompt.includes('Order and Customer'));
  });

  it('requests a JSON array of candidate names', () => {
    const prompt = buildRenamePrompt(context, config);
    assert.ok(prompt.includes('JSON array'));
  });

  it('includes the optional user hint when provided', () => {
    const prompt = buildRenamePrompt(context, config, 'it doubles a value');
    assert.ok(prompt.includes('it doubles a value'));
  });

  it('omits the hint section when no hint is provided', () => {
    const prompt = buildRenamePrompt(context, config);
    assert.ok(!prompt.includes('Additional context from the user'));
  });

  it('omits the hint section when the hint is blank', () => {
    const prompt = buildRenamePrompt(context, config, '   ');
    assert.ok(!prompt.includes('Additional context'));
  });

  it('includes the reference line numbers of other usages', () => {
    const prompt = buildRenamePrompt(context, config);
    assert.ok(prompt.includes('lines: 6, 10'));
  });
});

describe('buildDescriptionPrompt', () => {
  it('names the correct comment format for the language', () => {
    assert.ok(buildDescriptionPrompt(context, config).includes('JSDoc'));
    assert.ok(buildDescriptionPrompt(pythonContext, config).includes('Python docstring'));
    assert.ok(buildDescriptionPrompt(javaContext, config).includes('Javadoc'));
  });

  it('includes the symbol, surrounding code, comment language, and custom rules', () => {
    const prompt = buildDescriptionPrompt(context, config);
    assert.ok(prompt.includes('doStuff'));
    assert.ok(prompt.includes('return a + 1'));
    assert.ok(prompt.includes('vi'));
    assert.ok(prompt.includes('Order and Customer'));
  });

  it('includes the optional user hint when provided', () => {
    const prompt = buildDescriptionPrompt(context, config, 'it doubles a value');
    assert.ok(prompt.includes('it doubles a value'));
  });

  it('omits the hint section when no hint is provided', () => {
    const prompt = buildDescriptionPrompt(context, config);
    assert.ok(!prompt.includes('Additional context from the user'));
  });
});

describe('parseNameSuggestions', () => {
  it('parses a plain JSON array', () => {
    assert.deepStrictEqual(
      parseNameSuggestions('["doubleValue", "applyTwice", "repeatAdd"]'),
      ['doubleValue', 'applyTwice', 'repeatAdd'],
    );
  });

  it('parses a JSON array inside a fenced code block', () => {
    assert.deepStrictEqual(
      parseNameSuggestions('```json\n["doubleValue", "applyTwice"]\n```'),
      ['doubleValue', 'applyTwice'],
    );
  });

  it('parses a bulleted list as a fallback', () => {
    assert.deepStrictEqual(parseNameSuggestions('- doubleValue\n- applyTwice'), [
      'doubleValue',
      'applyTwice',
    ]);
  });

  it('parses a numbered list as a fallback', () => {
    assert.deepStrictEqual(parseNameSuggestions('1. doubleValue\n2. applyTwice'), [
      'doubleValue',
      'applyTwice',
    ]);
  });

  it('returns an empty list for non-array JSON', () => {
    assert.deepStrictEqual(parseNameSuggestions('{"name": "doubleValue"}'), []);
  });

  it('returns an empty array for empty or whitespace-only input', () => {
    assert.deepStrictEqual(parseNameSuggestions(''), []);
    assert.deepStrictEqual(parseNameSuggestions('   \n  '), []);
  });

  it('keeps a single plain-name line as a fallback candidate', () => {
    assert.deepStrictEqual(parseNameSuggestions('doubleValue'), ['doubleValue']);
  });
});

describe('parseDocstring', () => {
  it('extracts the content of a fenced block', () => {
    assert.deepStrictEqual(
      parseDocstring('```ts\n/** Doubles a value. */\n```'),
      '/** Doubles a value. */',
    );
  });

  it('returns a plain comment block unchanged', () => {
    assert.deepStrictEqual(parseDocstring('/** Doubles a value. */'), '/** Doubles a value. */');
  });

  it('returns an empty string for empty or whitespace-only input', () => {
    assert.strictEqual(parseDocstring(''), '');
    assert.strictEqual(parseDocstring('   \n  '), '');
  });
});