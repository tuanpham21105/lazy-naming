import * as vscode from 'vscode';
import { namingStyleFor, type LazyNamingConfig } from '../config/configLoader';
import type { SymbolContext } from './contextReader';
import {
  buildDescriptionPrompt,
  buildRenamePrompt,
  filterNamesByStyle,
  parseDocstring,
  parseNameSuggestions,
} from './promptBuilder';

const LM_VENDOR_COPILOT = 'copilot';
const REQUEST_JUSTIFICATION =
  'Lazy Naming uses GitHub Copilot to suggest better symbol names and write docstrings.';

export type LmErrorCode =
  | 'COPIOT_MODEL_NOT_FOUND'
  | 'COPIOT_PERMISSION_DENIED'
  | 'COPIOT_REQUEST_FAILED'
  | 'MALFORMED_RESPONSE';

export class LmRequestError extends Error {
  readonly code: LmErrorCode;
  readonly userMessage: string;

  constructor(code: LmErrorCode, userMessage: string) {
    super(userMessage);
    this.name = 'LmRequestError';
    this.code = code;
    this.userMessage = userMessage;
  }
}

export async function selectCopilotModel(): Promise<vscode.LanguageModelChat> {
  try {
    const models = await vscode.lm.selectChatModels({ vendor: LM_VENDOR_COPILOT });
    if (models.length === 0) {
      throw new LmRequestError(
        'COPIOT_MODEL_NOT_FOUND',
        'GitHub Copilot is required for Lazy Naming. Please install it and sign in, then try again.',
      );
    }
    return models[0];
  } catch (error) {
    if (error instanceof LmRequestError) {
      throw error;
    }
    throw new LmRequestError(
      'COPIOT_REQUEST_FAILED',
      `Could not access GitHub Copilot models: ${(error as Error).message ?? String(error)}`,
    );
  }
}

export async function requestNameSuggestions(
  context: SymbolContext,
  config: LazyNamingConfig,
  hint?: string,
): Promise<string[]> {
  const model = await selectCopilotModel();
  const raw = await sendRequest(model, buildRenamePrompt(context, config, hint));
  const style = namingStyleFor(config.namingStyle, context.symbolKind);
  const suggestions = filterNamesByStyle(parseNameSuggestions(raw), style);

  if (suggestions.length === 0) {
    throw new LmRequestError(
      'MALFORMED_RESPONSE',
      `None of Copilot's suggestions matched the configured naming style (${style}). Please try again.`,
    );
  }

  return suggestions;
}

export async function requestDocstring(
  context: SymbolContext,
  config: LazyNamingConfig,
  hint?: string,
): Promise<string> {
  const model = await selectCopilotModel();
  const raw = await sendRequest(model, buildDescriptionPrompt(context, config, hint));
  const docstring = parseDocstring(raw);

  if (docstring.length === 0) {
    throw new LmRequestError(
      'MALFORMED_RESPONSE',
      'Copilot returned an unexpected response. Please try again.',
    );
  }

  return docstring;
}

async function sendRequest(
  model: vscode.LanguageModelChat,
  prompt: string,
): Promise<string> {
  let response: vscode.LanguageModelChatResponse;
  try {
    response = await model.sendRequest(
      [vscode.LanguageModelChatMessage.User(prompt)],
      { justification: REQUEST_JUSTIFICATION },
    );
  } catch (error) {
    throw mapRequestError(error);
  }

  let result = '';
  try {
    for await (const chunk of response.text) {
      result += chunk;
    }
  } catch (error) {
    throw mapRequestError(error);
  }

  return result;
}

function mapRequestError(error: unknown): LmRequestError {
  if (error instanceof LmRequestError) {
    return error;
  }

  const code = (error as { code?: unknown }).code;
  const message = (error as Error).message ?? String(error);

  if (code === vscode.LanguageModelError.NoPermissions) {
    return new LmRequestError(
      'COPIOT_PERMISSION_DENIED',
      'Lazy Naming was not granted access to GitHub Copilot. Approve the permission request and try again.',
    );
  }

  return new LmRequestError('COPIOT_REQUEST_FAILED', `The AI request failed: ${message}`);
}