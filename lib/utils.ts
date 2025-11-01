import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import { ChatSDKError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';

const BYTE_TO_HEX = Array.from({ length: 256 }, (_, index) =>
  index.toString(16).padStart(2, '0'),
);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause, message } = await parseErrorResponse(response);
    throw new ChatSDKError(
      (code as ErrorCode) ?? "bad_request:api",
      cause ?? message ?? response.statusText
    );
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause, message } = await parseErrorResponse(response);
      throw new ChatSDKError(
        (code as ErrorCode) ?? "bad_request:api",
        cause ?? message ?? response.statusText
      );
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

async function parseErrorResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch (error) {
      console.warn('Failed to parse JSON error response', error);
    }
  }

  try {
    const text = await response.text();
    if (text) {
      return { message: text };
    }
  } catch (error) {
    console.warn('Failed to read error response body', error);
  }

  return {} as { code?: string; cause?: string; message?: string };
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  const cryptoObj =
    typeof globalThis.crypto !== 'undefined'
      ? globalThis.crypto
      : undefined;

  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);

    // Per RFC4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    return (
      BYTE_TO_HEX[bytes[0]] +
      BYTE_TO_HEX[bytes[1]] +
      BYTE_TO_HEX[bytes[2]] +
      BYTE_TO_HEX[bytes[3]] +
      '-' +
      BYTE_TO_HEX[bytes[4]] +
      BYTE_TO_HEX[bytes[5]] +
      '-' +
      BYTE_TO_HEX[bytes[6]] +
      BYTE_TO_HEX[bytes[7]] +
      '-' +
      BYTE_TO_HEX[bytes[8]] +
      BYTE_TO_HEX[bytes[9]] +
      '-' +
      BYTE_TO_HEX[bytes[10]] +
      BYTE_TO_HEX[bytes[11]] +
      BYTE_TO_HEX[bytes[12]] +
      BYTE_TO_HEX[bytes[13]] +
      BYTE_TO_HEX[bytes[14]] +
      BYTE_TO_HEX[bytes[15]]
    );
  }

  // Fallback to non-cryptographic generation if no secure RNG is available.
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
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
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

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}
