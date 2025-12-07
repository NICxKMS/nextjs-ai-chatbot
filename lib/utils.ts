import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Document, MessageRow } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    let code: ErrorCode = 'bad_request:api';
    let cause: string | undefined;

    try {
      const errorData = await response.json();
      code = errorData.code as ErrorCode;
      cause = errorData.cause;
    } catch {
      // Response wasn't valid JSON, use defaults
    }

    const err = new ChatSDKError(code, cause);
    if (typeof window !== 'undefined') {
      if (typeof code === 'string' && code.startsWith('not_found:chat')) {
        window.location.replace('/?notice=chat_not_found');
      }
    }
    throw err;
  }

  return response.json();
};

const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...init,
      signal: init?.signal ?? controller.signal,
    });

    if (!response.ok) {
      let code: ErrorCode = 'bad_request:api';
      let cause: string | undefined;

      try {
        const errorData = await response.json();
        code = errorData.code as ErrorCode;
        cause = errorData.cause;
      } catch {
        // Response wasn't valid JSON, use defaults
      }

      const err = new ChatSDKError(code, cause);
      if (typeof window !== 'undefined') {
        if (typeof code === 'string' && code.startsWith('not_found:chat')) {
          window.location.replace('/?notice=chat_not_found');
        }
      }
      throw err;
    }

    return response;
  } catch (error: unknown) {
    // Handle timeout errors
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ChatSDKError('offline:chat', 'Request timed out');
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  // Use native crypto API (Node 16+, all modern browsers)
  // 2-5x faster and cryptographically secure
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for legacy environments (unlikely to be needed)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index < 0 || index >= documents.length) { return new Date(); }

  const document = documents[index];
  return document ? document.createdAt : new Date();
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) { return null; }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: MessageRow[]): ChatMessage[] {
  return messages.map((message) => {
    if (!message.id) {
      throw new ChatSDKError('bad_request:database', 'Message is missing id');
    }

    return {
      id: message.id,
      role: message.role as 'user' | 'assistant' | 'system',
      parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    } satisfies ChatMessage;
  });
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
