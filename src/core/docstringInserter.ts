export interface DocBlock {
  startLine: number;
  endLine: number;
}

export interface DocstringInsertion {
  kind: 'insert' | 'replace';
  startLine: number;
  endLine: number;
  text: string;
}

export interface DocstringTarget {
  line: number;
  docstring: string;
}

export function isDocstringText(text: string, languageId: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (languageId === 'python') {
    return (
      trimmed.startsWith('"""') ||
      trimmed.startsWith("'''") ||
      trimmed.startsWith('#')
    );
  }
  return (
    trimmed.startsWith('/**') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('//')
  );
}

export function planDocstringEdits(
  lines: readonly string[],
  targets: readonly DocstringTarget[],
  languageId: string,
): DocstringInsertion[] {
  const sorted = [...targets].sort((a, b) => b.line - a.line);
  const handledLines = new Set<number>();
  const insertions: DocstringInsertion[] = [];

  for (const target of sorted) {
    if (handledLines.has(target.line)) {
      continue;
    }
    handledLines.add(target.line);

    const insertion = buildDocstringInsertion(
      lines,
      target.line,
      target.docstring,
      languageId,
    );
    if (insertion !== undefined) {
      insertions.push(insertion);
    }
  }

  return insertions;
}

export function findDocstringBlock(
  lines: readonly string[],
  declarationLine: number,
  languageId: string,
): DocBlock | undefined {
  const endLine = declarationLine - 1;
  if (endLine < 0) {
    return undefined;
  }

  const isDocLine = docLinePredicate(languageId);
  let startLine = endLine;
  while (startLine >= 0) {
    const trimmed = lines[startLine].trim();
    if (trimmed.length === 0 || !isDocLine(trimmed)) {
      break;
    }
    startLine -= 1;
  }
  startLine += 1;

  if (startLine <= endLine) {
    return { startLine, endLine };
  }
  return undefined;
}

export function buildDocstringInsertion(
  lines: readonly string[],
  declarationLine: number,
  docstring: string,
  languageId: string,
): DocstringInsertion | undefined {
  const cleaned = docstring.trim();
  if (cleaned.length === 0) {
    return undefined;
  }

  const indentation = declarationIndentation(lines, declarationLine);
  const block = `${indentLines(cleaned, indentation)}\n`;

  const existing = findDocstringBlock(lines, declarationLine, languageId);
  if (existing !== undefined) {
    return {
      kind: 'replace',
      startLine: existing.startLine,
      endLine: declarationLine,
      text: block,
    };
  }

  return {
    kind: 'insert',
    startLine: declarationLine,
    endLine: declarationLine,
    text: block,
  };
}

export function indentLines(text: string, indentation: string): string {
  if (indentation.length === 0) {
    return text.replace(/\r\n/g, '\n');
  }
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => (line.length === 0 ? line : indentation + line))
    .join('\n');
}

function declarationIndentation(
  lines: readonly string[],
  declarationLine: number,
): string {
  const match = (lines[declarationLine] ?? '').match(/^[ \t]*/);
  return match !== null ? match[0] : '';
}

function docLinePredicate(languageId: string): (trimmed: string) => boolean {
  if (languageId === 'python') {
    return (line) =>
      line.startsWith('"""') || line.startsWith("'''") || line.startsWith('#');
  }
  return (line) =>
    line.startsWith('/**') ||
    line.startsWith('/*') ||
    line.startsWith('//') ||
    line.startsWith('*');
}