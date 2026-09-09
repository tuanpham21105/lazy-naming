import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const CONFIG_FILE_NAME = 'lazy-naming.json';

export const NAMING_STYLES = ['camelCase', 'snake_case', 'PascalCase'] as const;
export type NamingStyle = (typeof NAMING_STYLES)[number];

export interface LazyNamingConfig {
  namingStyle: NamingStyle;
  commentLanguage: string;
  prefixRules: Record<string, string[]>;
  customRules: string;
}

export const DEFAULT_CONFIG: LazyNamingConfig = {
  namingStyle: 'camelCase',
  commentLanguage: 'en',
  prefixRules: {},
  customRules: '',
};

function cloneDefault(): LazyNamingConfig {
  return {
    ...DEFAULT_CONFIG,
    prefixRules: { ...DEFAULT_CONFIG.prefixRules },
  };
}

function isNamingStyle(value: unknown): value is NamingStyle {
  return (
    typeof value === 'string' && (NAMING_STYLES as readonly string[]).includes(value)
  );
}

function sanitizePrefixRules(value: unknown): Record<string, string[]> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, string[]> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(entry) && entry.every((item) => typeof item === 'string')) {
      result[key] = entry;
    }
  }
  return result;
}

export async function loadConfig(workspaceRoot: string): Promise<LazyNamingConfig> {
  const configPath = path.join(workspaceRoot, '.vscode', CONFIG_FILE_NAME);

  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return cloneDefault();
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(
      `[lazy-naming] Ignoring malformed config at ${configPath}: falling back to defaults.`,
    );
    return cloneDefault();
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    console.warn(
      `[lazy-naming] Config at ${configPath} is not an object: falling back to defaults.`,
    );
    return cloneDefault();
  }

  const file = parsed as Record<string, unknown>;
  const config = cloneDefault();

  if (file.namingStyle !== undefined) {
    if (isNamingStyle(file.namingStyle)) {
      config.namingStyle = file.namingStyle;
    } else {
      console.warn(
        `[lazy-naming] Unknown namingStyle ${JSON.stringify(
          file.namingStyle,
        )}; using "${config.namingStyle}".`,
      );
    }
  }

  if (file.commentLanguage !== undefined) {
    if (
      typeof file.commentLanguage === 'string' &&
      file.commentLanguage.trim() !== ''
    ) {
      config.commentLanguage = file.commentLanguage.trim();
    } else {
      console.warn(
        `[lazy-naming] Invalid commentLanguage ${JSON.stringify(
          file.commentLanguage,
        )}; using "${config.commentLanguage}".`,
      );
    }
  }

  if (file.prefixRules !== undefined) {
    const prefixRules = sanitizePrefixRules(file.prefixRules);
    if (prefixRules !== null) {
      config.prefixRules = prefixRules;
    } else {
      console.warn(
        '[lazy-naming] Invalid prefixRules; expected an object of string arrays. Ignoring it.',
      );
    }
  }

  if (file.customRules !== undefined) {
    if (typeof file.customRules === 'string') {
      config.customRules = file.customRules;
    } else {
      console.warn(
        '[lazy-naming] Invalid customRules; expected a string. Ignoring it.',
      );
    }
  }

  return config;
}