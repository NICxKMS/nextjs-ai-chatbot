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
  try {
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
  } catch (error: unknown) {
    // Task 9.13: Handle network errors in SWR fetchers
    // Check if we're offline or if this is a network error
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:api', 'No network connection');
    }

    // Re-throw ChatSDKError instances as-is
    if (error instanceof ChatSDKError) {
      throw error;
    }

    // Wrap fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ChatSDKError('offline:api', 'Network request failed');
    }

    throw error;
  }
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
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

  // Task 7.7: Secure fallback using crypto.getRandomValues()
  // This ensures cryptographic randomness even in legacy environments
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set version (4) and variant (8, 9, A, or B) bits per RFC 4122
    // TypeScript needs non-null assertion since Uint8Array elements are always defined
    bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  // Final fallback: throw error instead of using insecure Math.random()
  throw new Error('Crypto API not available - cannot generate secure UUID');
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
      metadata: {
        createdAt: message.createdAt.toISOString(),
      },
    } satisfies ChatMessage;
  });
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
