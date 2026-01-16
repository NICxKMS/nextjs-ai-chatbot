# Feature Specifications

> **Project**: nextjs-ai-chatbot  
> **Architecture**: v5-Optimal  
> **Created**: 2024-12-27  
> **Status**: 🟢 Active

---

## Table of Contents

1. [Feature: Auth](#feature-auth)
2. [Feature: Chat](#feature-chat)
3. [Feature: Documents](#feature-documents)
4. [Feature: Artifacts](#feature-artifacts)
5. [Feature: Sidebar](#feature-sidebar)
6. [Feature: Settings](#feature-settings)
7. [Export Summary](#export-summary)

---

## Feature: Auth

**Location**: `features/auth/`  
**Phase**: P1 (Foundation) in implementation plan  
**Dependencies**: `lib/auth`, `shared/types`

### Overview

Authentication and session management feature handling user login, registration, OAuth provider integration, and session state management. Implements guest session support for anonymous users and provides React context for auth state access throughout the application.

### Directory Structure

```
features/auth/
├── index.ts              # Public API
├── components/
│   ├── auth-bootstrap.tsx    # Session initialization wrapper
│   ├── auth-form.tsx         # Login/register form component
│   └── auth-provider.tsx     # React context provider + useAuth hook
├── services/
│   └── guest-session.ts      # Guest session creation service
├── types.ts              # Type definitions
└── .gitkeep
```

### Public API (Exports from index.ts)

```typescript
// Components
export { AuthBootstrap } from './components/auth-bootstrap';
export { AuthForm } from './components/auth-form';
export { AuthProvider, useAuth } from './components/auth-provider';

// Services
export { createGuestSession, type GuestSessionResponse } from './services';

// Types
export type {
  AuthState,
  AuthActions,
  AuthContextValue,
  AuthFormMode,
  AuthFormProps,
} from './types';

// Constants (Null Object Patterns)
export { EMPTY_AUTH_STATE, LOADING_AUTH_STATE } from './types';
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `AuthProvider` | `children: ReactNode` | Wraps app with auth context, manages session state |
| `AuthBootstrap` | `children: ReactNode` | Initializes session on app load |
| `AuthForm` | `AuthFormProps` | Unified login/register form with mode switching |

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useAuth` | `AuthContextValue` | Access auth state and session info |

### Types

```typescript
/** Current authentication state */
export type AuthState = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
};

/** Empty auth state for null object pattern */
export const EMPTY_AUTH_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: false,
};

/** Loading auth state for initialization */
export const LOADING_AUTH_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
};

/** Actions available for authentication */
export type AuthActions = {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

/** Combined context value for AuthProvider */
export interface AuthContextValue extends AuthState {
  session: AppSession | null;
  isNewSession: boolean;
  setSession: (session: AppSession | null) => void;
  clearNewSessionFlag: () => void;
}

/** Form mode for AuthForm component */
export type AuthFormMode = 'login' | 'register';

/** Props for AuthForm component */
export type AuthFormProps = {
  mode: AuthFormMode;
  onSubmit: (formData: FormData) => void | Promise<void>;
  defaultEmail?: string;
  isLoading?: boolean;
  isSuccessful?: boolean;
};

/** Guest session response from API */
export type GuestSessionResponse = {
  success: boolean;
  sessionId?: string;
};
```

### API Functions

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `createGuestSession` | `void` | `Promise<GuestSessionResponse>` | Creates anonymous guest session |

### Schemas (Planned)

```typescript
// features/auth/schemas/login.schema.ts
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// features/auth/schemas/register.schema.ts
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8).max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
```

### Constants (Planned)

```typescript
// features/auth/constants/auth.constants.ts
export const AUTH_CONSTANTS = {
  SESSION_COOKIE_NAME: 'session',
  SESSION_EXPIRY_DAYS: 30,
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
};

// features/auth/constants/providers.constants.ts
export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
  CREDENTIALS: 'credentials',
} as const;
```

### User Stories

- As a user, I can register with email and password
- As a user, I can log in with existing credentials
- As a user, I can log in with OAuth providers (Google, GitHub)
- As a guest, I can use the app without creating an account
- As a user, I can log out and end my session
- As a user, my session persists across browser refreshes

### Integration Points

- **Uses**: `lib/auth` (NextAuth config), `shared/types`
- **Used by**: `app/(auth)/*`, all protected routes, `features/sidebar`
- **API Routes**: `/api/auth/[...nextauth]`, `/api/auth/session`

---

## Feature: Chat

**Location**: `features/chat/`  
**Phase**: P2 (Core Functionality) in implementation plan  
**Dependencies**: `features/auth`, `features/artifacts`, `lib/ai`, `shared/components/ai`

### Overview

AI chat functionality providing real-time message streaming, conversation management, model selection, and tool integrations. Implements the Vercel AI SDK's `useChat` hook with enhanced state management and UI components.

### Directory Structure

```
features/chat/
├── index.ts                    # Public API
├── components/
│   ├── index.ts               # Component barrel
│   ├── chat.tsx               # Main chat orchestrator
│   ├── chat-container.tsx     # Layout wrapper
│   ├── chat-provider.tsx      # Chat context provider
│   ├── chat-header.tsx        # Chat header with title
│   ├── chat-input.tsx         # Message input component
│   ├── chat-messages.tsx      # Message list renderer
│   ├── chat-error-boundary.tsx # Error handling
│   ├── chat-greeting.tsx      # Welcome message
│   ├── chat-context.tsx       # Context definitions
│   ├── data-stream-handler.tsx # Stream processing
│   ├── data-stream-provider.tsx # Stream context
│   ├── model-selector.tsx     # AI model selector
│   ├── model-selector-compact.tsx # Compact model selector
│   ├── new-chat-button.tsx    # New chat action
│   ├── visibility-selector.tsx # Chat visibility toggle
│   ├── markdown-renderer.tsx  # Markdown content rendering
│   ├── message-editor.tsx     # Message editing
│   ├── suggested-actions.tsx  # Suggestion chips
│   ├── artifact-wrapper.tsx   # Artifact integration
│   ├── weather.tsx            # Weather tool UI
│   ├── input/                 # Input sub-components
│   └── message/               # Message sub-components
├── hooks/
│   ├── index.ts               # Hook barrel
│   ├── use-chat-visibility.ts # Visibility state
│   ├── use-message-retry.ts   # Retry logic
│   ├── use-messages.ts        # Message operations
│   ├── use-model-selection.ts # Model selection
│   ├── use-optimistic-chat-effect.ts # Optimistic updates
│   ├── use-request-abort.ts   # Request cancellation
│   ├── use-scroll-to-bottom.ts # Auto-scroll
│   └── use-stream-error-handler.ts # Error handling
├── actions/
│   └── chat.actions.ts        # Server actions
├── services/
│   └── chat.service.ts        # Chat operations
├── types/
│   ├── index.ts
│   └── chat.types.ts
├── types.ts                   # Legacy type definitions
└── .gitkeep
```

### Public API (Exports from index.ts)

```typescript
// Core Component
export { Chat } from './components';

// Container & Layout
export { ChatContainer, ChatProvider, ChatHeader } from './components';

// Data Streaming
export {
  DataStreamHandler,
  DataStreamProvider,
  useDataStream,
  useDataStreamHandler,
  isDataAppendMessagePart,
  isDataChatTitlePart,
  isDataUsagePart,
} from './components';

// UI Components
export { ModelSelector, NewChatButton, ChatErrorBoundary } from './components';

// Types
export type {
  ChatMessage,
  ChatStatus,
  ChatHelpers,
  Attachment,
  CreateMessage,
  UIMessage,
  ChatRequestOptions,
  // Message Parts
  TextPart,
  ToolCallPart,
  ToolResultPart,
  ReasoningPart,
  SourcePart,
  MessagePart,
  // Model Types
  ModelMetadata,
  ModelCapabilities,
  ModelState,
  // Visibility
  VisibilityType,
  // Vote Types
  VoteType,
  MessageVote,
} from './types';

// Component Props Types
export type {
  ChatProps,
  ChatContainerProps,
  ChatHeaderProps,
  ChatProviderProps,
  ChatInputProps,
  ChatMessagesProps,
  MessageItemProps,
  ModelSelectorProps,
  NewChatButtonProps,
  DataStreamHandlerProps,
  DataStreamProviderProps,
} from './components';

// Hooks
export {
  useChatVisibility,
  useMessageRetry,
  useMessages,
  useModelSelection,
  useRequestAbort,
  useScrollToBottom,
  useStreamErrorHandler,
} from './hooks';

export type {
  UseChatVisibilityOptions,
  UseChatVisibilityReturn,
  UseMessageRetryOptions,
  UseMessageRetryReturn,
  UseMessagesOptions,
  UseMessagesReturn,
  UseRequestAbortReturn,
  RetryState,
} from './hooks';
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Chat` | `ChatProps` | Main chat orchestrator with full functionality |
| `ChatContainer` | `ChatContainerProps` | Layout wrapper for chat area |
| `ChatProvider` | `ChatProviderProps` | React context for chat state |
| `ChatHeader` | `ChatHeaderProps` | Header with title and actions |
| `ChatMessages` | `ChatMessagesProps` | Renders message list |
| `ModelSelector` | `ModelSelectorProps` | AI model dropdown |
| `NewChatButton` | `NewChatButtonProps` | Creates new conversation |
| `DataStreamHandler` | `DataStreamHandlerProps` | Processes AI stream |
| `DataStreamProvider` | `DataStreamProviderProps` | Stream context provider |
| `ChatErrorBoundary` | `children, fallback` | Error boundary for chat |

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useDataStream` | `DataStreamContext` | Access stream state |
| `useDataStreamHandler` | `DataStreamHandlerReturn` | Process stream events |
| `useChatVisibility` | `UseChatVisibilityReturn` | Manage chat visibility |
| `useMessageRetry` | `UseMessageRetryReturn` | Retry failed messages |
| `useMessages` | `UseMessagesReturn` | Message CRUD operations |
| `useModelSelection` | `ModelSelectionReturn` | Model selection state |
| `useRequestAbort` | `UseRequestAbortReturn` | Cancel pending requests |
| `useScrollToBottom` | `ScrollReturn` | Auto-scroll behavior |
| `useStreamErrorHandler` | `ErrorHandlerReturn` | Handle stream errors |

### Types

```typescript
// Re-export from AI SDK
export type { ChatRequestOptions, UIMessage } from 'ai';

/** Chat message type - uses UIMessage directly */
export type ChatMessage = UIMessage;

/** Chat status - matches AI SDK's useChat status */
export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

/** UseChatHelpers type from AI SDK */
export type ChatHelpers = UseChatHelpers<ChatMessage>;

/** File attachment for chat messages */
export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};

/** Message creation type */
export type CreateMessage = {
  content: string;
  role?: 'user' | 'assistant' | 'system';
  attachments?: Attachment[];
};

/** Message part types for rendering */
export type MessagePart =
  | TextPart
  | ToolCallPart
  | ToolResultPart
  | ReasoningPart
  | SourcePart;

export type TextPart = { type: 'text'; text: string };
export type ToolCallPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
};
export type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
};
export type ReasoningPart = {
  type: 'reasoning';
  reasoning: string;
  details?: unknown[];
};
export type SourcePart = {
  type: 'source';
  source: {
    sourceType: 'url' | 'file';
    id: string;
    url?: string;
    title?: string;
    providerMetadata?: Record<string, unknown>;
  };
};

/** Model metadata */
export type ModelMetadata = {
  id: string;
  name: string;
  provider: string;
  capabilities: ModelCapabilities;
};

export type ModelCapabilities = {
  vision: boolean;
  functionCalling: boolean;
  streaming: boolean;
  maxTokens: number;
};

/** Chat visibility types */
export type VisibilityType = 'public' | 'private';

/** Vote types */
export type VoteType = 'up' | 'down';
export type MessageVote = {
  messageId: string;
  chatId: string;
  vote: VoteType;
};
```

### API Functions

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `generateTitle` | `GenerateTitleParams` | `Promise<string>` | Generate chat title from messages |
| `deleteMessages` | `DeleteMessagesParams` | `Promise<void>` | Delete messages from chat |
| `updateVisibility` | `UpdateVisibilityParams` | `Promise<void>` | Update chat visibility |
| `saveVote` | `MessageVote` | `Promise<void>` | Save message vote |

### Schemas (Planned)

```typescript
// features/chat/schemas/chat.schema.ts
export const createChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.enum(['gpt-4', 'gpt-4-turbo', 'claude-3']).default('gpt-4'),
  visibility: z.enum(['public', 'private']).default('private'),
});

// features/chat/schemas/message.schema.ts
export const sendMessageSchema = z.object({
  chatId: z.string().uuid('Invalid chat ID'),
  content: z.string().min(1, 'Message cannot be empty').max(32000, 'Message too long'),
  attachments: z.array(z.object({
    type: z.enum(['image', 'file']),
    url: z.string().url(),
    name: z.string(),
  })).optional(),
});
```

### Constants (Planned)

```typescript
// features/chat/constants/chat.constants.ts
export const CHAT_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 32000,
  MAX_ATTACHMENTS: 10,
  MAX_ATTACHMENT_SIZE_MB: 25,
  DEFAULT_MODEL: 'gpt-4-turbo',
  SCROLL_THRESHOLD_PX: 100,
};

// features/chat/constants/message.constants.ts
export const MESSAGE_CONSTANTS = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  STREAM_TIMEOUT_MS: 60000,
};
```

### User Stories

- As a user, I can send messages to an AI assistant
- As a user, I can see AI responses streaming in real-time
- As a user, I can attach files and images to messages
- As a user, I can select different AI models
- As a user, I can regenerate AI responses
- As a user, I can edit my sent messages
- As a user, I can branch conversations from any point
- As a user, I can vote on message quality
- As a user, I can cancel streaming responses
- As a user, I can set chat visibility (public/private)

### Integration Points

- **Uses**: `features/auth`, `features/artifacts`, `lib/ai`, `lib/services`, `shared/components/ai`
- **Used by**: `app/(chat)/*`, `features/sidebar`
- **API Routes**: `/api/chat`, `/api/vote`, `/api/history`

---

## Feature: Documents

**Location**: `features/documents/`  
**Phase**: P3 (Enhanced Features) in implementation plan  
**Dependencies**: `features/artifacts`, `lib/db`, `shared/types`

### Overview

Document management feature providing CRUD operations, version history, and document preview capabilities. Integrates with artifacts for code, text, image, and sheet document types.

### Directory Structure

```
features/documents/
├── index.ts                    # Public API
├── components/
│   ├── index.ts               # Component barrel
│   ├── document-preview.tsx   # Document preview component
│   ├── document-skeleton.tsx  # Loading skeleton
│   ├── document-tool.tsx      # Tool call/result components
│   └── renderers/             # Type-specific renderers
│       ├── index.ts
│       ├── text-preview.tsx
│       ├── code-preview.tsx
│       ├── image-preview.tsx
│       └── sheet-preview.tsx
├── services/
│   ├── index.ts
│   └── document.service.ts    # Document API operations
├── types.ts                   # Type definitions
└── .gitkeep
```

### Public API (Exports from index.ts)

```typescript
// Components
export {
  DocumentPreview,
  DocumentSkeleton,
  DocumentToolCall,
  DocumentToolResult,
  InlineDocumentSkeleton,
  // Renderers
  TextPreview,
  CodePreview,
  ImagePreview,
  SheetPreview,
} from './components';

export type {
  DocumentPreviewProps,
  DocumentSkeletonProps,
  DocumentToolCallProps,
  DocumentToolResultProps,
} from './components';

// Services
export {
  fetchDocument,
  fetchDocumentVersions,
  fetchSuggestions,
  saveDocument,
  restoreDocumentVersion,
} from './services';

export type {
  DocumentData,
  SaveDocumentRequest,
} from './services';

// Types
export type {
  Document,
  DocumentToolResult,
  DocumentToolArgs,
  DocumentOperationType,
  DocumentPreviewProps as DocumentPreviewPropsType,
  DocumentSkeletonProps as DocumentSkeletonPropsType,
  DocumentToolCallProps as DocumentToolCallPropsType,
  DocumentToolProps,
} from './types';
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `DocumentPreview` | `DocumentPreviewProps` | Renders document content by type |
| `DocumentSkeleton` | `DocumentSkeletonProps` | Loading placeholder |
| `InlineDocumentSkeleton` | `artifactKind` | Compact inline skeleton |
| `DocumentToolCall` | `DocumentToolCallProps` | Displays tool invocation |
| `DocumentToolResult` | `DocumentToolResultProps` | Displays tool result |
| `TextPreview` | `content, isLoading` | Text document renderer |
| `CodePreview` | `content, language, isLoading` | Code document renderer |
| `ImagePreview` | `src, alt, isLoading` | Image document renderer |
| `SheetPreview` | `data, isLoading` | Spreadsheet renderer |

### Types

```typescript
// Re-export from schema
export type { Document } from '@/lib/db/schema';

/** Tool invocation result for document operations */
export type DocumentToolResult = {
  id: string;
  title: string;
  kind: ArtifactKind;
};

/** Tool invocation arguments for document creation/update */
export type DocumentToolArgs = {
  title?: string;
  kind?: ArtifactKind;
  id?: string;
  description?: string;
  documentId?: string;
};

/** Document operation type */
export type DocumentOperationType = 'create' | 'update' | 'request-suggestions';

/** Component props */
export type DocumentPreviewProps = {
  documentId: string;
  isReadonly?: boolean;
};

export type DocumentToolProps = {
  type: DocumentOperationType;
  result: DocumentToolResult;
  isReadonly?: boolean;
};

export type DocumentToolCallProps = {
  type: DocumentOperationType;
  args: DocumentToolArgs;
  isReadonly?: boolean;
};

export type DocumentSkeletonProps = {
  artifactKind: ArtifactKind;
};
```

### API Functions

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `fetchDocument` | `documentId: string` | `Promise<DocumentData>` | Fetch document by ID |
| `fetchDocumentVersions` | `documentId: string` | `Promise<DocumentVersion[]>` | Get version history |
| `fetchSuggestions` | `documentId: string` | `Promise<Suggestion[]>` | Get AI suggestions |
| `saveDocument` | `SaveDocumentRequest` | `Promise<Document>` | Save document changes |
| `restoreDocumentVersion` | `documentId, versionId` | `Promise<Document>` | Restore to version |

### Schemas (Planned)

```typescript
// features/documents/schemas/document.schema.ts
export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  kind: z.enum(['text', 'code', 'image', 'sheet']),
  content: z.string().max(1_000_000),
  chatId: z.string().uuid().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(1_000_000).optional(),
});

// features/documents/schemas/share.schema.ts
export const shareDocumentSchema = z.object({
  documentId: z.string().uuid(),
  visibility: z.enum(['public', 'private', 'link']),
  expiresAt: z.date().optional(),
});
```

### Constants (Planned)

```typescript
// features/documents/constants/document.constants.ts
export const DOCUMENT_CONSTANTS = {
  MAX_CONTENT_LENGTH: 1_000_000,
  MAX_TITLE_LENGTH: 200,
  MAX_VERSIONS: 100,
  AUTO_SAVE_DELAY_MS: 2000,
};

// features/documents/constants/visibility.constants.ts
export const VISIBILITY_OPTIONS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  LINK: 'link',
} as const;
```

### User Stories

- As a user, I can create documents of different types (text, code, image, sheet)
- As a user, I can view and edit document content
- As a user, I can see version history of documents
- As a user, I can restore previous document versions
- As a user, I can get AI suggestions for document content
- As a user, I can share documents with others
- As a user, I can delete documents

### Integration Points

- **Uses**: `features/artifacts`, `lib/db`, `lib/services`, `shared/types`
- **Used by**: `app/(chat)/chat/*`, `features/chat`
- **API Routes**: `/api/document`

---

## Feature: Artifacts

**Location**: `features/artifacts/`  
**Phase**: P2 (Core Functionality) in implementation plan  
**Dependencies**: `lib/ai`, `lib/editor`, `shared/components/ai`, `components/ai-elements`

### Overview

Code and content artifacts feature providing specialized editors for text, code, images, and spreadsheets. Supports real-time streaming, version control, diff views, and AI-powered suggestions. Implements a plugin-based architecture for extensible artifact types.

### Directory Structure

```
features/artifacts/
├── index.ts                    # Public API
├── server.ts                   # Server-only exports
├── constants.ts                # Artifact constants
├── types.ts                    # Type definitions
├── components/
│   ├── index.ts               # Component barrel
│   ├── artifact.tsx           # Main artifact container
│   ├── artifact-actions.tsx   # Action buttons
│   ├── artifact-close.tsx     # Close button
│   ├── artifact-error.tsx     # Error boundary
│   ├── artifact-messages.tsx  # Message integration
│   ├── toolbar.tsx            # Bottom toolbar
│   ├── version-footer.tsx     # Version navigation
│   └── editors/               # Type-specific editors
│       ├── index.ts
│       ├── text-editor.tsx
│       ├── code-editor/
│       │   ├── index.ts
│       │   ├── code-editor.tsx
│       │   ├── console.tsx
│       │   └── diff-view.tsx
│       ├── image-editor.tsx
│       └── sheet-editor.tsx
├── definitions/               # Artifact type definitions
│   ├── index.ts
│   ├── base.ts               # Base artifact registry
│   ├── text.ts               # Text artifact definition
│   ├── code.ts               # Code artifact definition
│   ├── image.ts              # Image artifact definition
│   └── sheet.ts              # Sheet artifact definition
├── hooks/
│   ├── index.ts
│   ├── use-artifact.ts       # Main artifact hook
│   └── use-artifact-selector.ts # Selector hook
├── handlers/                  # Stream handlers (server)
│   ├── index.ts
│   └── artifact-handler.ts
├── actions/
│   └── suggestions.ts        # Server actions
├── services/
│   └── artifact.service.ts
└── utils/
    ├── index.ts
    └── stream-handler.tsx    # Client stream handler
```

### Public API (Exports from index.ts)

```typescript
// Constants
export {
  ARTIFACT_KINDS,
  ARTIFACT_KIND_LABELS,
  DEFAULT_ARTIFACT_CONTENT,
} from './constants';

// Definitions
export {
  artifactDefinitions,
  artifactKinds,
  artifactRegistry,
  isArtifactDefinition,
  getArtifactDefinition,
  codeArtifact,
  textArtifact,
  imageArtifact,
  sheetArtifact,
} from './definitions';

// Components
export {
  Artifact,
  ArtifactActions,
  ArtifactClose,
  ArtifactErrorBoundary,
  ArtifactMessages,
  Toolbar,
  Tools,
  VersionFooter,
  // Factory
  Artifact as ArtifactFactory,
} from './components';

// Editors
export {
  TextEditor,
  CodeEditor,
  ImageEditor,
  SheetEditor,
  Console,
  DiffView,
  DiffType,
} from './components';

export type {
  CodeEditorProps,
  ConsoleProps,
  ConsoleOutput,
  ConsoleOutputContent,
  ConsoleOutputStatus,
  DiffViewProps,
  DiffTypeValue,
  ImageEditorProps,
  SheetEditorProps,
} from './components';

// Hooks
export {
  useArtifact,
  useArtifactSelector,
  initialArtifactData,
} from './hooks';

export type { UseArtifactReturn } from './hooks';

// Utils
export {
  DataStreamHandler,
  type DataStreamHandlerProps,
} from './utils/stream-handler';

// Actions
export { getSuggestions } from './actions';

// Types
export type {
  ArtifactKind,
  ArtifactStatus,
  UIArtifact,
  ArtifactBoundingBox,
  ArtifactChatHelpers,
  ArtifactDefinition,
  ArtifactConfig,
  ArtifactAction,
  ArtifactActionContext,
  ArtifactToolbarItem,
  ArtifactToolbarContext,
  ArtifactContentProps,
  ArtifactInitializeParams,
  ArtifactStreamPart,
  ArtifactStreamPartType,
  ArtifactStreamPartArgs,
} from './types';
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Artifact` | `ArtifactProps` | Main artifact container with panels |
| `ArtifactActions` | `actions[], context` | Action button group |
| `ArtifactClose` | `onClick` | Close button with tooltip |
| `ArtifactErrorBoundary` | `children, fallback` | Error boundary |
| `ArtifactMessages` | `messages` | Message list in artifact |
| `Toolbar` | `items[], context` | Bottom toolbar |
| `VersionFooter` | `version, total, onChange` | Version navigation |
| `TextEditor` | `ArtifactContentProps` | Rich text editor |
| `CodeEditor` | `CodeEditorProps` | Code editor with syntax |
| `ImageEditor` | `ImageEditorProps` | Image editor/preview |
| `SheetEditor` | `SheetEditorProps` | Spreadsheet editor |
| `Console` | `ConsoleProps` | Code execution console |
| `DiffView` | `DiffViewProps` | Version diff viewer |

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useArtifact` | `UseArtifactReturn` | Main artifact state management |
| `useArtifactSelector` | `<T>(selector) => T` | Optimized state selection |

### Types

```typescript
/** Supported artifact types */
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';

/** Artifact lifecycle status */
export type ArtifactStatus = 'streaming' | 'idle';

/** Bounding box for positioning */
export type ArtifactBoundingBox = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/** Core UI artifact state */
export type UIArtifact = {
  documentId: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: ArtifactStatus;
  boundingBox: ArtifactBoundingBox;
};

/** Chat helpers for artifacts */
export type ArtifactChatHelpers = UseChatHelpers<UIMessage>;

/** Artifact definition config */
export type ArtifactConfig<TMetadata = unknown> = {
  kind: ArtifactKind;
  label: string;
  description: string;
  content: ComponentType<ArtifactContentProps<TMetadata>>;
  actions: ArtifactAction<TMetadata>[];
  toolbar: ArtifactToolbarItem[];
  initialize?: (params: ArtifactInitializeParams<TMetadata>) => void;
};

/** Action context */
export type ArtifactActionContext<TMetadata = unknown> = {
  content: string;
  handleVersionChange: (type: 'next' | 'prev' | 'toggle' | 'latest') => void;
  currentVersionIndex: number;
  isCurrentVersion: boolean;
  mode: 'edit' | 'diff';
  metadata: TMetadata;
  setMetadata: Dispatch<SetStateAction<TMetadata>>;
};

/** Action definition */
export type ArtifactAction<TMetadata = unknown> = {
  icon: ReactNode;
  label?: string;
  description: string;
  onClick: (context: ArtifactActionContext<TMetadata>) => Promise<void> | void;
  isDisabled?: (context: ArtifactActionContext<TMetadata>) => boolean;
};

/** Stream part types */
export type ArtifactStreamPartType =
  | 'data-id'
  | 'data-title'
  | 'data-kind'
  | 'data-clear'
  | 'data-finish'
  | 'data-textDelta'
  | 'data-codeDelta'
  | 'data-imageDelta'
  | 'data-sheetDelta';

export type ArtifactStreamPart = {
  type: ArtifactStreamPartType;
  content: string;
};
```

### API Functions

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `getSuggestions` | `documentId: string` | `Promise<Suggestion[]>` | Get AI suggestions |
| `handleArtifactStream` | `ReadableStream` | `AsyncIterable<StreamPart>` | Process artifact stream |

### Constants

```typescript
// features/artifacts/constants.ts
export const ARTIFACT_KINDS = ['text', 'code', 'image', 'sheet'] as const;

export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  text: 'Text Document',
  code: 'Code',
  image: 'Image',
  sheet: 'Spreadsheet',
};

export const DEFAULT_ARTIFACT_CONTENT: Record<ArtifactKind, string> = {
  text: '',
  code: '// Start coding here\n',
  image: '',
  sheet: JSON.stringify({ rows: [], columns: [] }),
};
```

### User Stories

- As a user, I can view and edit text documents
- As a user, I can write and run code with syntax highlighting
- As a user, I can view code execution output in console
- As a user, I can see diff between versions
- As a user, I can navigate between document versions
- As a user, I can view and edit images
- As a user, I can edit spreadsheet data
- As a user, I can see AI streaming content in real-time
- As a user, I can get AI suggestions for content

### Integration Points

- **Uses**: `lib/ai`, `lib/editor`, `shared/components/ai`, `components/ai-elements` (READ-ONLY SDK)
- **Used by**: `features/chat`, `features/documents`, `app/(chat)/*`
- **API Routes**: `/api/suggestions`

---

## Feature: Sidebar

**Location**: `features/sidebar/`  
**Phase**: P2 (Core Functionality) in implementation plan  
**Dependencies**: `features/auth`, `features/chat`, `lib/services`

### Overview

Navigation sidebar providing chat history list, user navigation, and new chat creation. Supports mobile responsive behavior, optimistic updates, and grouped chat history by date.

### Directory Structure

```
features/sidebar/
├── index.ts                    # Public API
├── components/
│   ├── index.ts               # Component barrel
│   ├── app-sidebar.tsx        # Main sidebar component
│   ├── sidebar-history.tsx    # Chat history list
│   ├── sidebar-history-item.tsx # Individual history item
│   ├── sidebar-toggle.tsx     # Toggle button
│   └── sidebar-user-nav.tsx   # User navigation menu
├── hooks/
│   ├── index.ts               # Hook barrel
│   ├── use-sidebar.tsx        # Sidebar state hook
│   ├── use-chat-history.ts    # Chat history fetching
│   └── use-optimistic-chats.tsx # Optimistic updates
├── services/
│   ├── index.ts
│   └── history.service.ts     # History API service
├── stores/
│   └── sidebar-store.ts       # Zustand store (if needed)
├── types.ts                   # Type definitions
├── utils/
│   └── group-chats.ts         # Chat grouping utility
└── .gitkeep
```

### Public API (Exports from index.ts)

```typescript
// Components
export {
  AppSidebar,
  SidebarHistory,
  SidebarHistoryItem,
  SidebarToggle,
  SidebarUserNav,
} from './components';

export type {
  AppSidebarProps,
  SidebarHistoryProps,
  SidebarHistoryItemProps,
  SidebarUserNavProps,
  UpdateVisibilityAction,
} from './components';

// Hooks
export {
  useSidebar,
  useChatHistory,
  useOptimisticChats,
  SidebarProvider,
  OptimisticChatsProvider,
} from './hooks';

export type { SidebarProviderProps } from './hooks';

// Services
export {
  fetchChatHistory,
  deleteChat,
  deleteAllChatHistory,
} from './services';

export type { HistoryResponse } from './services';

// Types
export type {
  ChatHistoryItem,
  ChatGroup,
  SidebarState,
  SidebarContext,
  VisibilityType,
} from './types';

// Utils
export { groupChatsByDate } from './utils';
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `AppSidebar` | `AppSidebarProps` | Main sidebar wrapper |
| `SidebarHistory` | `SidebarHistoryProps` | Chat history list |
| `SidebarHistoryItem` | `SidebarHistoryItemProps` | Single chat item |
| `SidebarToggle` | `onClick, isOpen` | Toggle button |
| `SidebarUserNav` | `SidebarUserNavProps` | User menu dropdown |
| `SidebarProvider` | `children` | Sidebar context provider |
| `OptimisticChatsProvider` | `children` | Optimistic update provider |

### Hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useSidebar` | `SidebarContext` | Sidebar open/close state |
| `useChatHistory` | `{ chats, isLoading, error }` | Fetch chat history |
| `useOptimisticChats` | `OptimisticChatsReturn` | Optimistic updates |

### Types

```typescript
/** Chat history item */
export type ChatHistoryItem = {
  id: string;
  title: string;
  createdAt: Date;
  visibility: 'public' | 'private';
  userId: string;
};

/** Grouped chats by date */
export type ChatGroup = {
  label: string;
  chats: ChatHistoryItem[];
};

/** Re-export visibility type */
export type { VisibilityType } from '@/shared/types';

/** Sidebar state */
export type SidebarState = {
  isOpen: boolean;
  isMobile: boolean;
};

/** Sidebar context */
export type SidebarContext = {
  state: SidebarState;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsMobile: (isMobile: boolean) => void;
};
```

### API Functions

| Function | Params | Returns | Description |
|----------|--------|---------|-------------|
| `fetchChatHistory` | `userId?: string` | `Promise<HistoryResponse>` | Get chat history |
| `deleteChat` | `chatId: string` | `Promise<void>` | Delete single chat |
| `deleteAllChatHistory` | `userId: string` | `Promise<void>` | Delete all user chats |

### Schemas (Planned)

```typescript
// features/sidebar/schemas/history.schema.ts
export const historyFilterSchema = z.object({
  search: z.string().optional(),
  visibility: z.enum(['all', 'public', 'private']).default('all'),
  dateRange: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
});

// features/sidebar/schemas/filter.schema.ts
export const sidebarFilterSchema = z.object({
  sortBy: z.enum(['date', 'title']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
```

### Constants (Planned)

```typescript
// features/sidebar/constants/sidebar.constants.ts
export const SIDEBAR_CONSTANTS = {
  DEFAULT_WIDTH: 280,
  COLLAPSED_WIDTH: 64,
  MOBILE_BREAKPOINT: 768,
  ANIMATION_DURATION_MS: 200,
};

// features/sidebar/constants/history.constants.ts
export const HISTORY_CONSTANTS = {
  MAX_DISPLAY_ITEMS: 50,
  GROUP_LABELS: {
    today: 'Today',
    yesterday: 'Yesterday',
    lastWeek: 'Last 7 Days',
    lastMonth: 'Last 30 Days',
    older: 'Older',
  },
};
```

### User Stories

- As a user, I can see my chat history in the sidebar
- As a user, I can click on a chat to open it
- As a user, I can create a new chat
- As a user, I can delete individual chats
- As a user, I can delete all chat history
- As a user, I can toggle sidebar visibility
- As a user, I can see chats grouped by date
- As a user, I can access my profile/settings from sidebar
- As a user, I can see the sidebar collapse on mobile

### Integration Points

- **Uses**: `features/auth`, `features/chat`, `lib/services`
- **Used by**: `app/(chat)/layout.tsx`, `app/(chat)/sidebar-container.tsx`
- **API Routes**: `/api/history`

---

## Feature: Settings

**Location**: `features/settings/`  
**Phase**: P3 (Enhanced Features) in implementation plan  
**Dependencies**: `features/auth`, `shared/hooks`

### Overview

User settings and preferences management including AI model selection, sampling parameters, theme selection, and system prompt customization. Uses Zustand for persistent state management with localStorage hydration.

### Directory Structure

```
features/settings/
├── index.ts                    # Public API
├── components/
│   ├── settings-sheet.tsx     # Settings panel/dialog
│   └── settings-hydration.tsx # Client hydration component
├── stores/
│   └── settings-store.ts      # Zustand settings store
└── types.ts                   # Type definitions (implicit in store)
```

### Public API (Exports from index.ts)

```typescript
// Components
export {
  SettingsSheet,
  SettingsButton,
  SettingsIconButton,
  SettingsHydration,
} from './components';

// Store & Hooks
export {
  useSettings,
  useSettingsSnapshot,
  useSettingsHydration,
  // Fine-grained selectors
  useSelectedModelId,
  useSamplingSettings,
  useSystemPromptSetting,
  useAutoScrollSetting,
  useEnableReasoningSetting,
  useStreamArtifactsSetting,
  useModelSelectorDisplayMode,
  // Constants
  DEFAULT_SETTINGS,
} from './stores/settings-store';

// Types
export type {
  AppSettings,
  SamplingSettings,
  SettingsStore,
  ModelSelectorDisplayMode,
} from './stores/settings-store';
```

### Components

| Component | Props | Description |
|-----------|-------|-------------|
| `SettingsSheet` | `open, onOpenChange` | Main settings panel |
| `SettingsButton` | `className` | Button to open settings |
| `SettingsIconButton` | `className` | Icon-only button |
| `SettingsHydration` | `none` | Hydrates store on client |

### Hooks (from Store)

| Hook | Returns | Description |
|------|---------|-------------|
| `useSettings` | `SettingsStore` | Full settings store |
| `useSettingsSnapshot` | `AppSettings` | Current settings snapshot |
| `useSelectedModelId` | `string` | Selected AI model |
| `useSamplingSettings` | `SamplingSettings` | Sampling parameters |
| `useSystemPromptSetting` | `string` | System prompt |
| `useAutoScrollSetting` | `boolean` | Auto-scroll preference |
| `useEnableReasoningSetting` | `boolean` | Reasoning display |
| `useStreamArtifactsSetting` | `boolean` | Artifact streaming |
| `useModelSelectorDisplayMode` | `ModelSelectorDisplayMode` | Selector display |
| `useSettingsHydration` | `boolean` | Hydration status |

### Types

```typescript
/** Sampling parameters for AI models */
export type SamplingSettings = {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
};

/** Model selector display mode */
export type ModelSelectorDisplayMode = 'full' | 'compact' | 'minimal';

/** Complete app settings */
export type AppSettings = {
  // Model Settings
  selectedModelId: string;
  modelSelectorDisplayMode: ModelSelectorDisplayMode;
  
  // Sampling
  samplingSettings: SamplingSettings;
  
  // Prompts
  systemPrompt: string;
  
  // UI Preferences
  autoScroll: boolean;
  enableReasoning: boolean;
  streamArtifacts: boolean;
  
  // Theme (if not using system)
  theme?: 'light' | 'dark' | 'system';
};

/** Settings store interface */
export type SettingsStore = {
  settings: AppSettings;
  isHydrated: boolean;
  
  // Actions
  updateSettings: (partial: Partial<AppSettings>) => void;
  updateSamplingSettings: (partial: Partial<SamplingSettings>) => void;
  resetToDefaults: () => void;
  hydrate: () => void;
};

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  selectedModelId: 'gpt-4-turbo',
  modelSelectorDisplayMode: 'full',
  samplingSettings: {
    temperature: 0.7,
    topP: 1,
    topK: 0,
    maxTokens: 4096,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
  systemPrompt: '',
  autoScroll: true,
  enableReasoning: false,
  streamArtifacts: true,
};
```

### Schemas (Planned)

```typescript
// features/settings/schemas/profile.schema.ts
export const profileSettingsSchema = z.object({
  displayName: z.string().min(2).max(50),
  email: z.string().email(),
  avatar: z.string().url().optional(),
});

// features/settings/schemas/appearance.schema.ts
export const appearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  fontSize: z.enum(['small', 'medium', 'large']),
  codeFont: z.string().optional(),
});
```

### Constants (Planned)

```typescript
// features/settings/constants/settings.constants.ts
export const SETTINGS_CONSTANTS = {
  STORAGE_KEY: 'app-settings',
  DEBOUNCE_SAVE_MS: 500,
};

// features/settings/constants/themes.constants.ts
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

export const SAMPLING_RANGES = {
  temperature: { min: 0, max: 2, step: 0.1 },
  topP: { min: 0, max: 1, step: 0.1 },
  topK: { min: 0, max: 100, step: 1 },
  maxTokens: { min: 100, max: 32000, step: 100 },
  frequencyPenalty: { min: -2, max: 2, step: 0.1 },
  presencePenalty: { min: -2, max: 2, step: 0.1 },
};
```

### User Stories

- As a user, I can select my preferred AI model
- As a user, I can adjust sampling parameters (temperature, etc.)
- As a user, I can set a custom system prompt
- As a user, I can toggle auto-scroll behavior
- As a user, I can enable/disable reasoning display
- As a user, I can toggle artifact streaming
- As a user, I can switch between themes
- As a user, my settings persist across sessions

### Integration Points

- **Uses**: `shared/hooks/use-local-storage`, Zustand
- **Used by**: `features/chat`, `app/(chat)/*`, `app/(settings)/*`
- **API Routes**: None (client-only with localStorage)

---

## Export Summary

### Features Main Barrel (`features/index.ts`)

```typescript
// =============================================================================
// ARTIFACTS
// =============================================================================
export type { /* ~35 types */ } from './artifacts';
export { /* ~40 exports */ } from './artifacts';

// =============================================================================
// AUTH
// =============================================================================
export type { /* ~6 types */ } from './auth';
export { /* ~8 exports */ } from './auth';

// =============================================================================
// CHAT
// =============================================================================
export type { /* ~30 types */ } from './chat';
export { /* ~25 exports */ } from './chat';

// =============================================================================
// DOCUMENTS
// =============================================================================
export type { /* ~10 types */ } from './documents';
export { /* ~15 exports */ } from './documents';

// =============================================================================
// SIDEBAR
// =============================================================================
export type { /* ~8 types */ } from './sidebar';
export { /* ~15 exports */ } from './sidebar';

// =============================================================================
// SETTINGS
// =============================================================================
export type { /* ~5 types */ } from './settings';
export { /* ~15 exports */ } from './settings';
```

### Per-Feature Export Counts

| Feature | Components | Hooks | Types | Constants | Services | Total |
|---------|------------|-------|-------|-----------|----------|-------|
| Auth | 3 | 1 | 6 | 2 | 1 | 13 |
| Chat | 15+ | 8 | 25+ | 4 | 5 | 57+ |
| Documents | 8 | 0 | 8 | 4 | 5 | 25 |
| Artifacts | 15+ | 2 | 20+ | 3 | 2 | 42+ |
| Sidebar | 7 | 3 | 5 | 4 | 3 | 22 |
| Settings | 4 | 10 | 4 | 4 | 0 | 22 |
| **TOTAL** | **52+** | **24** | **68+** | **21** | **16** | **181+** |

### Import Patterns

```typescript
// ❌ WRONG - Deep imports
import { Chat } from '@/features/chat/components/chat';

// ✅ CORRECT - Use feature barrel
import { Chat } from '@/features/chat';

// ✅ CORRECT - Use main barrel for common types
import { ChatMessage, UIArtifact, AuthState } from '@/features';

// ✅ CORRECT - Feature-specific detailed imports
import { 
  useArtifact, 
  ArtifactKind,
  ARTIFACT_KINDS 
} from '@/features/artifacts';
```

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-27 | Initial specification |
