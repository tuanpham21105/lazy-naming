import * as vscode from 'vscode';

export const WINDOW_LINES = 30;
export const MAX_USAGE_MATCHES = 100;

export interface WindowBounds {
  startLine: number;
  endLine: number;
}

export interface ContextOptions {
  windowLines?: number;
  maxUsages?: number;
}

export interface SymbolContext {
  languageId: string;
  symbolName: string;
  surroundingCode: string;
  surroundingStartLine: number;
  surroundingEndLine: number;
  usageLocations: vscode.Position[];
}

export function computeWindowBounds(
  anchorLine: number,
  lineCount: number,
  windowLines: number = WINDOW_LINES,
): WindowBounds {
  const lastLine = lineCount - 1;
  if (lineCount <= 0 || windowLines <= 0) {
    return { startLine: 0, endLine: lastLine };
  }

  const halfAbove = Math.floor((windowLines - 1) / 2);
  const halfBelow = windowLines - 1 - halfAbove;

  let startLine = Math.max(0, Math.min(anchorLine - halfAbove, lastLine));
  let endLine = Math.max(0, Math.min(startLine + windowLines - 1, lastLine));

  if (endLine - startLine + 1 < windowLines && startLine > 0) {
    startLine = Math.max(0, endLine - windowLines + 1);
  }

  return { startLine, endLine };
}

export function findSymbolMatches(
  text: string,
  symbolName: string,
  maxMatches: number = MAX_USAGE_MATCHES,
): number[] {
  if (symbolName.length === 0 || maxMatches <= 0) {
    return [];
  }

  const escaped = symbolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`,
    'g',
  );
  const offsets: number[] = [];

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    offsets.push(match.index);
    if (offsets.length >= maxMatches) {
      break;
    }
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
    }
  }

  return offsets;
}

export function getDocumentContext(
  document: vscode.TextDocument,
  symbolRange: vscode.Range,
  symbolName: string,
  options: ContextOptions = {},
): SymbolContext {
  const windowLines = options.windowLines ?? WINDOW_LINES;
  const maxUsages = options.maxUsages ?? MAX_USAGE_MATCHES;

  const bounds = computeWindowBounds(
    symbolRange.start.line,
    document.lineCount,
    windowLines,
  );

  const lines: string[] = [];
  for (let line = bounds.startLine; line <= bounds.endLine; line++) {
    lines.push(document.lineAt(line).text);
  }

  const anchorStart = document.offsetAt(symbolRange.start);
  const anchorEnd = document.offsetAt(symbolRange.end);

  const usageLocations = findSymbolMatches(
    document.getText(),
    symbolName,
    maxUsages,
  )
    .filter((offset) => {
      const matchEnd = offset + symbolName.length;
      return matchEnd <= anchorStart || offset >= anchorEnd;
    })
    .map((offset) => document.positionAt(offset));

  return {
    languageId: document.languageId,
    symbolName,
    surroundingCode: lines.join('\n'),
    surroundingStartLine: bounds.startLine,
    surroundingEndLine: bounds.endLine,
    usageLocations,
  };
}