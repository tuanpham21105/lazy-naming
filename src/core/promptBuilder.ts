import type { LazyNamingConfig } from '../config/configLoader';
import type { SymbolContext } from './contextReader';

const COMMENT_FORMATS: Record<string, string> = {
  typescript: 'JSDoc',
  typescriptreact: 'JSDoc',
  javascript: 'JSDoc',
  javascriptreact: 'JSDoc',
  python: 'Python docstring (triple-quoted string)',
  java: 'Javadoc',
};

const GENERIC_COMMENT_FORMAT = 'a standard doc comment';

export function getCommentFormat(languageId: string): string {
  return COMMENT_FORMATS[languageId] ?? GENERIC_COMMENT_FORMAT;
}

function referenceLineNumbers(context: SymbolContext): string {
  return context.usageLocations.map((position) => position.line + 1).join(', ');
}

export function buildRenamePrompt(
  context: SymbolContext,
  config: LazyNamingConfig,
  hint?: string,
): string {
  const sections: string[] = [];

  sections.push(
    `You are an expert software engineer. The symbol "${context.symbolName}" in a ${context.languageId} file needs a better name that reflects what it does.`,
  );
  sections.push(`Programming language: ${context.languageId}`);
  sections.push(`Required naming style: ${config.namingStyle}`);
  sections.push(
    `Surrounding code:\n\`\`\`${context.languageId}\n${context.surroundingCode}\n\`\`\``,
  );

  if (context.usageLocations.length > 0) {
    sections.push(
      `Other references to this symbol appear at lines: ${referenceLineNumbers(context)}.`,
    );
  }

  if (config.customRules.trim() !== '') {
    sections.push(`Project-specific rules: ${config.customRules}`);
  }

  if (hint !== undefined && hint.trim() !== '') {
    sections.push(`Additional context from the user: ${hint.trim()}`);
  }

  sections.push(
    'Respond with ONLY a JSON array of 3 to 6 candidate names (plain strings) that follow the required naming style, with no explanation and no code fences.',
  );

  return sections.join('\n\n');
}

export function buildDescriptionPrompt(
  context: SymbolContext,
  config: LazyNamingConfig,
  hint?: string,
): string {
  const format = getCommentFormat(context.languageId);
  const sections: string[] = [];

  sections.push(
    `You are an expert software engineer. Write a single ${format} comment block for the symbol "${context.symbolName}" in a ${context.languageId} file.`,
  );
  sections.push(`Comment format: ${format}`);
  sections.push(`Write the comment in: ${config.commentLanguage}`);
  sections.push(
    `Surrounding code:\n\`\`\`${context.languageId}\n${context.surroundingCode}\n\`\`\``,
  );

  if (config.customRules.trim() !== '') {
    sections.push(`Project-specific rules: ${config.customRules}`);
  }

  if (hint !== undefined && hint.trim() !== '') {
    sections.push(`Additional context from the user: ${hint.trim()}`);
  }

  sections.push(
    'If the symbol is a function or method, include entries for its parameters and a return entry where applicable. Respond with ONLY the comment block itself, with no extra explanation.',
  );

  return sections.join('\n\n');
}

export function parseNameSuggestions(text: string): string[] {
  const parsed = extractJsonArray(text);
  if (parsed !== null) {
    return parsed;
  }

  if (/^[\{\[]/.test(text.trim())) {
    return [];
  }

  return parseListLines(text);
}

export function parseDocstring(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return '';
  }

  const fenced = trimmed.match(/```(?:[A-Za-z0-9_+-]*)[^\n]*\n?([\s\S]*?)\s*```/);
  if (fenced !== null) {
    return fenced[1].trim();
  }

  return trimmed;
}

function extractJsonArray(text: string): string[] | null {
  const candidates: string[] = [];

  const trimmed = text.trim();
  candidates.push(trimmed);

  const fenced = trimmed.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
  if (fenced !== null) {
    candidates.push(fenced[1]);
  }

  const bracket = trimmed.match(/\[[\s\S]*?\]/);
  if (bracket !== null) {
    candidates.push(bracket[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (
        Array.isArray(parsed) &&
        parsed.every((item) => typeof item === 'string')
      ) {
        return parsed;
      }
    } catch {
      // try the next candidate
    }
  }

  return null;
}

function parseListLines(text: string): string[] {
  const names: string[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('```')) {
      continue;
    }

    let candidate = line
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+[.)]\s+/, '')
      .replace(/`/g, '')
      .trim();

    if (candidate.length > 0) {
      names.push(candidate);
    }
  }

  return names;
}