import * as assert from 'node:assert';
import type { LazyNamingConfig } from '../../src/config/configLoader';
import type { SymbolContext } from '../../src/core/contextReader';
import {
  buildDescriptionPrompt,
  buildRenamePrompt,
  filterNamesByStyle,
  getCommentFormat,
  parseDocstring,
  parseNameSuggestions,
  prefixRulesPrompt,
} from '../../src/core/promptBuilder';

const config: LazyNamingConfig = {
  namingStyle: { class: 'PascalCase', method: 'snake_case', variable: 'camelCase' },
  commentLanguage: 'vi',
  prefixRules: {},
  customRules: 'Use DDD terms such as Order and Customer.',
};

const context: SymbolContext = {
  languageId: 'typescript',
  symbolName: 'doStuff',
  symbolKind: 'method',
  surroundingCode:
    'export function doStuff(a: number): number {\n  return a + 1;\n}',
  surroundingStartLine: 0,
  surroundingEndLine: 2,
  usageLocations: [{ line: 5 }, { line: 9 }] as unknown as SymbolContext['usageLocations'],
};

const variableContext: SymbolContext = {
  ...context,
  symbolName: 'res',
  symbolKind: 'variable',
};

const classContext: SymbolContext = {
  ...context,
  symbolName: 'orderModel',
  symbolKind: 'class',
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

  it('uses the naming style configured for the symbol kind', () => {
    assert.ok(buildRenamePrompt(context, config).includes('snake_case'));
    assert.ok(buildRenamePrompt(variableContext, config).includes('camelCase'));
    assert.ok(buildRenamePrompt(classContext, config).includes('PascalCase'));
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

  it('adds the prefix rules when configured', () => {
    const withRules = buildRenamePrompt(context, {
      ...config,
      prefixRules: { boolean: ['is', 'has'], handler: ['on'] },
    });
    assert.ok(withRules.includes('boolean: is, has'));
    assert.ok(withRules.includes('handler: on'));
    assert.ok(withRules.includes("Apply the matching prefix rule for the symbol's role"));
  });

  it('omits the prefix rules section when no rules are configured', () => {
    const prompt = buildRenamePrompt(context, config);
    assert.ok(!prompt.includes("Apply the matching prefix rule for the symbol's role"));
    assert.ok(!prompt.includes('boolean: is, has'));
  });
});

describe('prefixRulesPrompt', () => {
  it('renders one row per role with the matching prefixes', () => {
    assert.strictEqual(
      prefixRulesPrompt({ boolean: ['is', 'has', 'can'], handler: ['on'] }),
      `Apply the matching prefix rule for the symbol's role:\n` +
        '- boolean: is, has, can\n' +
        '- handler: on',
    );
  });

  it('returns undefined for an empty rule set', () => {
    assert.strictEqual(prefixRulesPrompt({}), undefined);
  });
});

describe('filterNamesByStyle', () => {
  it('drops uppercase names when snake_case is requested', () => {
    assert.deepStrictEqual(
      filterNamesByStyle(['total_price', 'totalPrice', 'TOTAL_PRICE'], 'snake_case'),
      ['total_price'],
    );
  });

  it('drops names with underscores or spaces when camelCase is requested', () => {
    assert.deepStrictEqual(
      filterNamesByStyle(['doubleValue', 'double_value', 'double value'], 'camelCase'),
      ['doubleValue'],
    );
  });

  it('drops names with underscores when PascalCase is requested', () => {
    assert.deepStrictEqual(
      filterNamesByStyle(['DoubleValue', 'Double_Value'], 'PascalCase'),
      ['DoubleValue'],
    );
  });

  it('keeps single-word names regardless of capitalization between camel and pascal', () => {
    assert.deepStrictEqual(filterNamesByStyle(['value', 'Value'], 'camelCase'), ['value', 'Value']);
    assert.deepStrictEqual(filterNamesByStyle(['value', 'Value'], 'PascalCase'), ['value', 'Value']);
  });

  it('drops empty and whitespace-only entries', () => {
    assert.deepStrictEqual(filterNamesByStyle(['  ', 'doStuff'], 'camelCase'), ['doStuff']);
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