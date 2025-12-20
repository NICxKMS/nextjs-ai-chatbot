import type { UIMessage, UseChatHelpers, CreateUIMessage } from '@ai-sdk/react';

// =============================================================================
// Core Message Types
// =============================================================================

/** Metadata attached to each message */
export interface MessageMetadata {
  createdAt: string;
}

/** Custom UI data stream types */
export type CustomUIDataTypes = {
  'data-chatTitle': DataChatTitlePart;
  'data-appendMessage': DataAppendMessagePart;
  'data-usage': DataUsagePart;
};

/** Full chat message type */
export type ChatMessage = UIMessage<MessageMetadata, CustomUIDataTypes>;

/** Re-export UseChatHelpers with our message type */
export type ChatHelpers = UseChatHelpers<ChatMessage>;

// =============================================================================
// Data Stream Parts
// =============================================================================

export interface DataChatTitlePart {
  type: 'data-chatTitle';
  data: string;
}

export interface DataAppendMessagePart {
  type: 'data-appendMessage';
  data: {
    role: 'user' | 'assistant';
    content: string;
  };
}

export interface DataUsagePart {
  type: 'data-usage';
  data: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// Type guards
export function isDataChatTitlePart(part: unknown): part is DataChatTitlePart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as DataChatTitlePart).type === 'data-chatTitle'
  );
}

export function isDataAppendMessagePart(part: unknown): part is DataAppendMessagePart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as DataAppendMessagePart).type === 'data-appendMessage'
  );
}

export function isDataUsagePart(part: unknown): part is DataUsagePart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    (part as DataUsagePart).type === 'data-usage'
  );
}

// =============================================================================
// Context State Types
// =============================================================================

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error';

export interface ChatState {
  chatId: string;
  messages: ChatMessage[];
  status: ChatStatus;
  error: Error | null;
  isReadonly: boolean;
  isGuest: boolean;
  title: string | null;
}

export interface ChatActions {
  sendMessage: ChatHelpers['sendMessage'];
  setMessages: ChatHelpers['setMessages'];
  regenerate: ChatHelpers['regenerate'];
  stop: () => void;
  clearError: () => void;
}

export interface ModelState {
  currentModelId: string;
  availableModels: ModelMetadata[];
  setModelId: (id: string) => void;
}

export interface ModelMetadata {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

// =============================================================================
// UI Types
// =============================================================================

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}

export interface UserVote {
  chatId: string;
  messageId: string;
  isUpvoted: boolean;
}

export type VisibilityType = 'private' | 'public';

// =============================================================================
// Optimistic Types
// =============================================================================

export interface OptimisticChat {
  id: string;
  title: string;
  createdAt: Date;
  visibility: VisibilityType;
}

// =============================================================================
// Server Action Input Types
// =============================================================================

export interface SendMessageInput {
  chatId: string;
  message: CreateUIMessage<ChatMessage>;
  modelId: string;
  visibility: VisibilityType;
}

export interface UpdateVisibilityInput {
  chatId: string;
  visibility: VisibilityType;
}

export interface DeleteMessagesInput {
  chatId: string;
  messageId: string;
}
