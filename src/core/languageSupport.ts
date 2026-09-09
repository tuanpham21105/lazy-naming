const BUILT_IN_PROVIDER_LANGUAGE_IDS = new Set([
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
]);

const LANGUAGE_EXTENSION_HINTS: Record<string, string> = {
  python: 'ms-python.python',
  go: 'golang.go',
  rust: 'rust-lang.rust-analyzer',
  c: 'ms-vscode.cpptools',
  cpp: 'ms-vscode.cpptools',
  csharp: 'ms-dotnettools.csharp',
  php: 'bmewburn.vscode-intelephense-client',
  ruby: 'Shopify.ruby-lsp',
  java: 'redhat.java',
};

export function hasBuiltInSymbolProvider(languageId: string): boolean {
  return BUILT_IN_PROVIDER_LANGUAGE_IDS.has(languageId);
}

export function recommendedSymbolExtension(languageId: string): string | undefined {
  return LANGUAGE_EXTENSION_HINTS[languageId];
}