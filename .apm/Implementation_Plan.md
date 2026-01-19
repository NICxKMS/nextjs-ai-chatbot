# nextjs-ai-chatbot v6 Migration – APM Implementation Plan

**Memory Strategy:** Dynamic-MD
**Last Modification:** Plan creation by the Setup Agent.
**Project Overview:** Complete architecture overhaul migrating from archive/oldapp to v6 architecture with Repository Pattern, Feature Modules, and Slim Routes. UI functionality must remain visually identical. ~274 target files across 6 phases, 68 tasks.

**Source Code Reference:** For detailed implementation patterns, component logic, and functionality preservation, agents MUST reference the original codebase at `archive/oldapp/`. Key source directories:
- `archive/oldapp/components/` — UI components to migrate
- `archive/oldapp/components/elements/` — 31 AI element primitives (copy to components/ai-elements/)
- `archive/oldapp/lib/` — Infrastructure modules to refactor
- `archive/oldapp/hooks/` — Hooks to migrate
- `archive/oldapp/artifacts/` — Artifact renderers to migrate

**Architecture Specs:** Detailed v6 architecture specifications are in `.ouroboros/specs/refactor-migration/`:
- `architecture-v6-final.md` — Canonical architecture (29 sections)
- `functional-structure-v6.md` — File-by-file specs (~274 files)
- `implementation-plan-v6.md` — Original task breakdown with detailed acceptance criteria
- `directory-structure-v6.md` — Target directory structure

---

## Phase 0: Prerequisites
*Goal: Ensure root configuration files are in place*
*Tasks: 1 | Est. Duration: 1 hour*

### Task 0.1 – Root Configuration Setup - Agent_Infrastructure
**Objective:** Verify and configure root config files required by all phases.
**Output:** `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `drizzle.config.ts`.
**Guidance:** No dependencies. Prerequisite for all Phase 1 tasks.

1. Verify/create `next.config.ts` with image domains, experimental features if needed
2. Verify/create `tailwind.config.ts` with project theme and plugins
3. Verify/create `tsconfig.json` with strict TypeScript settings
4. Verify/create `drizzle.config.ts` with database connection config
5. Create `.env.example` with all required environment variable templates
6. Verify `package.json` has all required dependencies from archive/oldapp/package.json; update scripts section for v6 build/dev/test commands

---

## Phase 1: Infrastructure Foundation
*Goal: Establish foundational lib/ modules that all other layers depend on*
*Tasks: 12 | Est. Duration: 10-14 hours*

### Task 1.1 – Create Base Types - Agent_Infrastructure
**Objective:** Create core TypeScript type definitions used across lib/ layer.
**Output:** `lib/types/index.ts` with API, database, and environment types.
**Guidance:** No external dependencies. Follow strict typing with no `any` types.

- Create `lib/types/index.ts` with `ApiResponse<T>` and `PaginatedResponse<T>` interfaces
- Add `DatabaseEntity` base interface with `id`, `createdAt`, `updatedAt` fields
- Export `EnvConfig` type matching all environment variables used in project

### Task 1.2 – Create Error System - Agent_Infrastructure
**Objective:** Implement unified error handling with typed error classes.
**Output:** `lib/errors.ts` with AppError and subclasses.
**Guidance:** **Depends on: Task 1.1 Output**

- Create `AppError` base class with `code`, `message`, `statusCode` properties
- Implement subclasses: `ValidationError`, `NotFoundError`, `UnauthorizedError`, `RateLimitError`
- Add `isAppError()` type guard and `toApiResponse()` converter
- Include unit tests for each error class
- Create `lib/log.ts` with structured logging utility (debug, info, warn, error levels)

### Task 1.3 – Create Constants Module - Agent_Infrastructure
**Objective:** Define application-wide constants for cache TTLs, rate limits, pagination.
**Output:** `lib/constants.ts` with typed const objects.
**Guidance:** No dependencies. All values as `const` (no mutation possible).

- Create `CACHE_TTL` object with entity-specific TTLs (chat: 3600, message: 1800, user: 7200, list: 300)
- Add `RATE_LIMITS` object with endpoint-specific limits matching middleware config
- Include `PAGINATION` defaults and export types for each constant object
- Add `FEATURE_FLAGS` object for feature toggles (e.g., enableVoiceInput, enableSuggestions)

### Task 1.4 – Create Utility Functions - Agent_Infrastructure
**Objective:** Build core utility functions for classnames, formatting, validation.
**Output:** `lib/utils/` directory with cn, format, date, string, validation modules.
**Guidance:** No dependencies. Each utility must have unit tests.

1. Create `lib/utils/cn.ts` with `cn()` function using clsx + tailwind-merge
2. Create `lib/utils/format.ts` with date, file size, duration, number formatters
3. Create `lib/utils/date.ts` with isToday, isYesterday, startOfDay, addDays helpers
4. Create `lib/utils/string.ts` with truncate, slugify, capitalize, sanitizeHtml
5. Create `lib/utils/validation.ts` with isValidEmail, isValidUrl, isValidUuid validators
6. Create `lib/utils/index.ts` barrel re-exporting all utilities

### Task 1.5 – Create Database Client & Schema - Agent_Infrastructure
**Objective:** Set up Drizzle ORM client with connection pooling and schema definitions.
**Output:** `lib/db/` with client.ts, schema.ts, index.ts.
**Guidance:** **Depends on: Task 1.1, 1.2 Output**. Verify existing database schema compatibility.

1. Create `lib/db/client.ts` with Drizzle client using connection pooling
2. Create `lib/db/schema.ts` with tables: users, chats, messages, artifacts, votes, suggestions
3. Define relations (one-to-many, foreign keys) and indexes on frequently queried columns
4. Create `lib/db/index.ts` barrel exporting db client, schema, and inferred types

### Task 1.6 – Create Redis Cache Client & Keys - Agent_Infrastructure
**Objective:** Initialize Upstash Redis client with centralized cache key generators.
**Output:** `lib/cache/client.ts`, `lib/cache/keys.ts`.
**Guidance:** **Depends on: Task 1.2 Output**. Use environment variables for config.

- Create `lib/cache/client.ts` with Upstash Redis client from environment variables
- Create `lib/cache/keys.ts` with type-safe cache key generators (chat, chatList, message, user, artifact)
- Verify connection and add unit tests for key format

### Task 1.7a – Create Cache Strategies & Invalidation - Agent_Infrastructure
**Objective:** Implement caching patterns: read-through, write-through, invalidation.
**Output:** `lib/cache/cache-strategies.ts`, `lib/cache/cache-invalidation.ts`.
**Guidance:** **Depends on: Task 1.6, 1.3 Output**. Follow architecture-v6-final.md §8.

- Create `cache-strategies.ts` with cacheThrough, cacheAside, writeThrough, invalidate functions
- Create `cache-invalidation.ts` with smart cascade invalidation helpers (invalidateChat, invalidateMessage, etc.)
- Create `lib/cache/quota.ts` with usage tracking utilities (usage.ts functionality)

### Task 1.7b – Create Memory Cache (LRU) - Agent_Infrastructure
**Objective:** Implement in-memory LRU cache for ultra-hot data (L1 cache layer).
**Output:** `lib/cache/memory-cache.ts`.
**Guidance:** **Depends on: Task 1.3 Output**.

- Implement LRU eviction policy with configurable max size (default 1000 items)
- Add TTL support per item
- Implement get, set, delete, clear, has methods
- Include unit tests for eviction behavior

### Task 1.7c – Create Tiered Cache & Index - Agent_Infrastructure
**Objective:** Two-tier cache (Memory → Redis) with automatic fallthrough and promotion.
**Output:** `lib/cache/tiered-cache.ts`, `lib/cache/index.ts`.
**Guidance:** **Depends on: Task 1.6, 1.7a, 1.7b Output**.

- Create tiered cache with L1 (memory) → L2 (Redis) fallthrough
- Implement L1 promotion on L2 hit
- Create `lib/cache/index.ts` barrel exporting tiered cache as default

### Task 1.8 – Create Auth Configuration - Agent_Infrastructure
**Objective:** Set up NextAuth.js with credentials provider and JWT session.
**Output:** `lib/auth/config.ts`.
**Guidance:** **Depends on: Task 1.5 Output**. Use DrizzleAdapter pattern.

- Create `lib/auth/config.ts` with NextAuth configuration
- Configure credentials provider with email/password authentication
- Add JWT session strategy with custom callbacks (userId in session)
- Configure custom pages (signin, error) and debug mode in development

### Task 1.9 – Create Session Utilities & Guards - Agent_Infrastructure
**Objective:** Build session helpers and authorization guards.
**Output:** `lib/auth/session.ts`, `lib/auth/guards.ts`, `lib/auth/index.ts`.
**Guidance:** **Depends on: Task 1.8, 1.2 Output**. Support guest sessions.

1. Create `lib/auth/session.ts` with getSession, requireSession, isAuthenticated, getSessionUser, guest support
2. Create `lib/auth/guards.ts` with requireAuth, requireOwnership, canAccessChat, canModifyChat, isGuest
3. Create `lib/auth/index.ts` barrel exporting all auth utilities and types

### Task 1.10 – Create API Response & Validation Helpers - Agent_Infrastructure
**Objective:** Standardize API response builders and request validation.
**Output:** `lib/api/response.ts`, `lib/api/validation.ts`, `lib/api/index.ts`.
**Guidance:** **Depends on: Task 1.1, 1.2 Output**. Use Zod for validation.

1. Create `lib/api/response.ts` with success(), error(), paginated(), stream() response builders
2. Create `lib/api/validation.ts` with validateBody(), validateQuery(), validateParams() using Zod
3. Create `lib/api/index.ts` barrel exporting all API utilities
4. Create `lib/api/context.ts` with API context and request context utilities

---

## Phase 2: Data Layer
*Goal: Implement Repository Pattern and Services per architecture spec*
*Tasks: 16 | Est. Duration: 14-18 hours*

### Task 2.1 – Create Base Repository - Agent_Data
**Objective:** Abstract base class defining repository pattern with generic CRUD and caching.
**Output:** `lib/data/repositories/base.repository.ts`.
**Guidance:** **Depends on: Task 1.6, 1.7c, 1.2 Output by Agent_Infrastructure**. ~180 LOC per v6 spec.

1. Define `IReadRepository<T>` interface with findById, findMany, exists, count
2. Define `IWriteRepository<T, TCreate, TUpdate>` interface with create, createMany, update, delete
3. Implement `BaseRepository` abstract class with cache-through reads and write-through operations
4. Add abstract methods for cacheKey, cacheListKey, ttl, listTtl, and DB operations
5. Include RepositoryContext type with userId, isGuest

### Task 2.2a – Create Chat Repository - Agent_Data
**Objective:** Chat entity repository with user-scoped queries, visibility controls, pagination.
**Output:** `lib/data/repositories/chat.repository.ts`.
**Guidance:** **Depends on: Task 2.1 Output**. ~350 LOC. See functional-structure-v6.md §1.1.2.

- Extend BaseRepository<Chat, NewChat, UpdateChat>
- Implement findByUserId, findWithMessages, updateTitle, updateVisibility, updateContext, deleteAllForUser
- Add user ownership and visibility checks on all operations

### Task 2.2b – Create Message Repository - Agent_Data
**Objective:** Message entity repository with chat-scoped queries, bulk operations.
**Output:** `lib/data/repositories/message.repository.ts`.
**Guidance:** **Depends on: Task 2.1, 2.2a Output**. ~320 LOC.

- Extend BaseRepository<Message, NewMessage, UpdateMessage>
- Implement findByChatId, findByChatIdPaginated, saveMany, saveWithContext, deleteAfterTimestamp
- Support bulk insert for message saving

### Task 2.2c – Create User Repository - Agent_Data
**Objective:** User entity repository with auth-related queries.
**Output:** `lib/data/repositories/user.repository.ts`.
**Guidance:** **Depends on: Task 2.1 Output**. ~150 LOC.

- Extend BaseRepository<User, NewUser, UpdateUser>
- Implement findByEmail, findByEmailWithPassword, updateLastLogin, existsByEmail
- Exclude password field from cached User type

### Task 2.2d – Create Artifact Repository - Agent_Data
**Objective:** Artifact entity repository with versioning support, suggestion queries.
**Output:** `lib/data/repositories/artifact.repository.ts`.
**Guidance:** **Depends on: Task 2.1, 2.2a Output**. ~280 LOC.

- Extend BaseRepository<Artifact, NewArtifact, UpdateArtifact>
- Implement findAllVersions, findLatestVersion, findByChatId, saveVersion, deleteVersionsAfterTimestamp
- Support rollback functionality

### Task 2.2e – Create Vote Repository - Agent_Data
**Objective:** Vote entity repository for message voting with upsert support.
**Output:** `lib/data/repositories/vote.repository.ts`.
**Guidance:** **Depends on: Task 2.1, 2.2b Output**. ~120 LOC.

- Use composite key: chatId + messageId
- Implement findByIds, upsert, findByChatId, deleteByChatId, deleteByMessageId

### Task 2.2f – Create Suggestion Repository - Agent_Data
**Objective:** Suggestion entity repository for AI-generated artifact suggestions.
**Output:** `lib/data/repositories/suggestion.repository.ts`.
**Guidance:** **Depends on: Task 2.1, 2.2d Output**. ~100 LOC.

- Implement findByDocumentId, createMany, deleteByDocumentId, deleteAfterTimestamp

### Task 2.3 – Create Repository Index - Agent_Data
**Objective:** Barrel export for all repositories with singleton instances.
**Output:** `lib/data/repositories/index.ts`.
**Guidance:** **Depends on: Task 2.2a-2.2f Output**. Export classes and instances.

- Export BaseRepository class for extension
- Export all interface types (IReadRepository, IWriteRepository)
- Export singleton instances: chatRepository, messageRepository, userRepository, artifactRepository, voteRepository, suggestionRepository

### Task 2.4a – Create Chat Service - Agent_Data
**Objective:** Orchestration service for chat operations spanning multiple repositories.
**Output:** `lib/data/services/chat.service.ts`.
**Guidance:** **Depends on: Task 2.2a, 2.2b, 2.2e Output**. ~180 LOC.

- Implement getWithMessages, getHistory, saveChat, deleteChat (cascade), deleteAllChats, updateTitle
- Handle transactions for multi-repo operations

### Task 2.4b – Create Artifact Service - Agent_Data
**Objective:** Orchestration service for artifact operations with version management.
**Output:** `lib/data/services/artifact.service.ts`.
**Guidance:** **Depends on: Task 2.2d, 2.2f Output**. ~120 LOC.

- Implement getWithSuggestions, getVersionHistory, createVersion, rollbackToTimestamp, getForChat

### Task 2.4c – Create Auth Service & Services Index - Agent_Data
**Objective:** Auth-related data operations and services barrel export.
**Output:** `lib/data/services/auth.service.ts`, `lib/data/services/index.ts`.
**Guidance:** **Depends on: Task 2.2c, 1.8 Output by Agent_Infrastructure**. ~90 LOC.

- Implement verifyCredentials, registerUser (with password hashing), getUserFromSession, createContext, isGuest
- Create services/index.ts barrel exporting all services

### Task 2.5 – Create Query Modules - Agent_Data
**Objective:** Complex typed queries including joins and aggregations.
**Output:** `lib/data/queries/` with chat.queries, message.queries, index.
**Guidance:** **Depends on: Task 1.5 Output by Agent_Infrastructure**. Use Drizzle SQL functions.

1. Create `chat.queries.ts` with withMessageCount, withLatestMessage, searchByContent, withinDateRange, aggregateByPeriod
2. Create `message.queries.ts` with withVotes, paginated, byRole, searchAcrossChats, countByRole
3. Create `lib/data/queries/index.ts` barrel exporting all queries and types

### Task 2.6 – Create Data Layer Types & Index - Agent_Data
**Objective:** Shared type definitions and main barrel export.
**Output:** `lib/data/types.ts`, `lib/data/index.ts`.
**Guidance:** **Depends on: Task 2.3, 2.4c, 2.5 Output**.

- Create `types.ts` with DataContext, PaginationParams, PaginatedResult, OperationResult
- Create `lib/data/index.ts` re-exporting repositories, services, queries, types

### Task 2.7 – Create Rate Limiter - Agent_Data
**Objective:** Rate limiter using @upstash/ratelimit with per-route strategies.
**Output:** `lib/rate-limit/` with limiter.ts, strategies.ts, index.ts.
**Guidance:** **Depends on: Task 1.6, 1.3 Output by Agent_Infrastructure**. Follow architecture-v6-final.md §6.

1. Create `limiter.ts` with checkLimit function using Ratelimit sliding window
2. Create `strategies.ts` with chatRateLimit (10/min), authRateLimit (5/min), apiRateLimit (60/min), uploadRateLimit (3/min)
3. Create `lib/rate-limit/index.ts` barrel exporting all rate limiting utilities

### Task 2.8 – Create Middleware Utilities - Agent_Data
**Objective:** Middleware helpers for rate limiting and deduplication.
**Output:** `lib/middleware/` with rate-limit.ts, deduplication.ts, config.ts, index.ts.
**Guidance:** **Depends on: Task 2.7 Output**. Used by edge middleware.

1. Create middleware rate limiting utilities that integrate with strategies
2. Create request deduplication helpers for concurrent identical requests
3. Create `lib/middleware/index.ts` barrel

---

## Phase 3: Features
*Goal: Implement feature modules following vertical slice architecture*
*Tasks: 17 | Est. Duration: 16-22 hours*

### Task 3.1 – Create Chat Feature Actions - Agent_Features
**Objective:** Server actions for chat CRUD and streaming.
**Output:** `features/chat/actions/` with stream-chat.action, save-message.action, etc.
**Guidance:** **Depends on: Task 2.4a Output by Agent_Data**. Use 'use server' directive.

1. Create `stream-chat.action.ts` with streamChat integrating AI SDK streamText
2. Create `save-message.action.ts` with message persistence via chat.service
3. Create CRUD actions: createChat, deleteChat, updateChatTitle, getChatHistory

### Task 3.2a – Create Core Chat Components - Agent_Features
**Objective:** Main chat UI components: container, messages list, single message.
**Output:** `features/chat/components/` with chat.tsx, messages.tsx, message.tsx.
**Guidance:** **Depends on: Task 3.1 Output**. Migrate from archive/oldapp/components.

- Create `chat.tsx` main container orchestrating messages, input, streaming state
- Create `messages.tsx` with virtualization support and auto-scroll
- Create `message.tsx` with role-based styling and markdown rendering

### Task 3.2b – Create Message Support Components - Agent_Features
**Objective:** Message editing and actions components.
**Output:** `features/chat/components/` with message-editor.tsx, message-actions.tsx, message-reasoning.tsx.
**Guidance:** **Depends on: Task 3.2a Output**. Migrate from archive/oldapp.

- Create `message-editor.tsx` for inline editing of user messages
- Create `message-actions.tsx` with copy, edit, delete actions
- Create `message-reasoning.tsx` for AI reasoning display

### Task 3.2c – Create Chat UI Components - Agent_Features
**Objective:** Chat header, greeting, and toolbar components.
**Output:** `features/chat/components/` with chat-header.tsx, greeting.tsx, toolbar.tsx, visibility-selector.tsx.
**Guidance:** **Depends on: Task 3.2a Output**. Migrate from archive/oldapp.

- Create `chat-header.tsx` with model selector integration
- Create `greeting.tsx` welcome/onboarding message
- Create `toolbar.tsx` and `visibility-selector.tsx`

### Task 3.3 – Create Chat Feature Hooks & Schemas - Agent_Features
**Objective:** Chat hooks wrapping AI SDK and validation schemas.
**Output:** `features/chat/hooks/`, `features/chat/schemas/`, `features/chat/index.ts`.
**Guidance:** **Depends on: Task 3.1, 3.2a-c Output**. Export clean public API.

1. Create `use-chat.ts` extending AI SDK useChat with custom state management
2. Create `use-messages.ts` for message list state and scroll behavior
3. Create `use-data-stream.ts` for SSE stream context access
4. Create `chat.schema.ts` with Zod validation schemas
5. Create `features/chat/index.ts` barrel export

### Task 3.4 – Create Artifact Feature Actions - Agent_Features
**Objective:** Server actions for artifact CRUD with versioning.
**Output:** `features/artifact/actions/` with create, update, versions, suggestions actions.
**Guidance:** **Depends on: Task 2.4b Output by Agent_Data**. Use 'use server' directive.

1. Create `create-artifact.action.ts` for artifact creation
2. Create `update-artifact.action.ts` with version management
3. Create `versions.ts` with getVersionHistory, rollbackToVersion
4. Create `suggestions.ts` with generateSuggestions, applySuggestion

### Task 3.5a – Create Artifact Panel & Supporting Components - Agent_Features
**Objective:** Main artifact panel container and supporting UI.
**Output:** `features/artifact/components/` with artifact-panel.tsx, artifact-actions.tsx, artifact-close.tsx, artifact-error-boundary.tsx.
**Guidance:** **Depends on: Task 3.4 Output**. Migrate from archive/oldapp/components.

- Create `artifact-panel.tsx` main container with type-based editor selection
- Create `artifact-actions.tsx` toolbar, `artifact-close.tsx`, `artifact-error-boundary.tsx`

### Task 3.5b – Create Text Editor - Agent_Features
**Objective:** TipTap-based rich text editor for text artifacts.
**Output:** `features/artifact/components/editors/text-editor.tsx`.
**Guidance:** **Depends on: Task 3.5a Output**. Migrate from archive/oldapp/components/text-editor.tsx. ~200+ LOC.

- Integrate TipTap with required extensions
- Support markdown rendering and editing
- Implement onChange callback with debounce

### Task 3.5c – Create Code Editor - Agent_Features
**Objective:** CodeMirror-based code editor for code artifacts.
**Output:** `features/artifact/components/editors/code-editor.tsx`.
**Guidance:** **Depends on: Task 3.5a Output**. Migrate from archive/oldapp/components/code-editor.tsx. ~250+ LOC.

- Integrate CodeMirror with syntax highlighting
- Support multiple languages, line numbers, theme
- Implement onChange callback
- Create `features/artifact/components/console.tsx` with Console component for code execution output display (ConsoleOutput, ConsoleOutputContent types)

### Task 3.5d – Create Image & Sheet Editors - Agent_Features
**Objective:** Image manipulation and spreadsheet editors.
**Output:** `features/artifact/components/editors/image-editor.tsx`, `features/artifact/components/editors/sheet-editor.tsx`.
**Guidance:** **Depends on: Task 3.5a Output**. Sheet uses react-data-grid.

- Create `image-editor.tsx` for image manipulation
- Create `sheet-editor.tsx` using react-data-grid for spreadsheet functionality

### Task 3.6a – Create Artifact Handlers - Agent_Features
**Objective:** AI stream handlers for different artifact types.
**Output:** `features/artifact/handlers/` with base.handler.ts, text.handler.ts, code.handler.ts, image.handler.ts, sheet.handler.ts.
**Guidance:** **Depends on: Task 3.4 Output**.

- Create base.handler.ts abstract handler class
- Create type-specific handlers (text, code, image, sheet) extending base

### Task 3.6b – Create Artifact Hooks, Types & Index - Agent_Features
**Objective:** Artifact state hooks, types, and barrel export.
**Output:** `features/artifact/hooks/`, `features/artifact/types.ts`, `features/artifact/schemas/artifact.schema.ts`, `features/artifact/index.ts`.
**Guidance:** **Depends on: Task 3.4, 3.5a-d, 3.6a Output**.

1. Create `use-artifact.ts` managing artifact state, versions, persistence
2. Create `use-artifact-selector.ts` for specific artifact state selection
3. Create types.ts with ArtifactKind, UIArtifact types
4. Create artifact.schema.ts with Zod schemas
5. Create `features/artifact/index.ts` barrel export

### Task 3.7 – Create Auth Feature - Agent_Features
**Objective:** Authentication forms, hooks, and actions.
**Output:** `features/auth/` with actions, components, hooks, index.
**Guidance:** **Depends on: Task 2.4c Output by Agent_Data**. Consolidated AuthForm pattern.

1. Create `login.action.ts`, `register.action.ts`, `logout.action.ts`, `reset-password.action.ts` server actions
2. Create `LoginForm.tsx`, `RegisterForm.tsx` components (or consolidated AuthForm)
3. Create `AuthProvider.tsx` session context for client components
4. Create `use-auth.ts` hook with user, isLoading, login, logout, register
5. Create `ForgotPasswordForm.tsx` for password reset request flow
6. Create types.ts, auth.schema.ts, and barrel export

### Task 3.8 – Create Sidebar Feature - Agent_Features
**Objective:** Sidebar with chat history, search, and preferences.
**Output:** `features/sidebar/` with actions, components, hooks, index.
**Guidance:** **Depends on: Task 2.4a Output by Agent_Data**. Migrate from archive/oldapp.

1. Create `get-history.action.ts`, `delete-chat.action.ts` server actions
2. Create `Sidebar.tsx`, `SidebarHistory.tsx`, `SidebarItem.tsx` components
3. Create `use-sidebar.ts` hook with isOpen, toggle, history, isLoading
4. Create types.ts and barrel export

### Task 3.9 – Create Settings Feature - Agent_Features
**Objective:** User settings panel and preferences management.
**Output:** `features/settings/` with actions, components, index.
**Guidance:** **Depends on: Task 2.4a Output by Agent_Data**.

1. Create `update-settings.action.ts` server action
2. Create `SettingsPanel.tsx` tabbed container
3. Create `SettingsForm.tsx` with theme, model defaults, notifications
4. Create settings.schema.ts and barrel export

### Task 3.10 – Create Input Feature - Agent_Features
**Objective:** Multimodal input with text, file upload, attachments.
**Output:** `features/input/` with components, types, index.
**Guidance:** Migrate from archive/oldapp/components/multimodal-input.tsx.

1. Create `MultimodalInput.tsx` with text input, auto-resize, file attachment
2. Create `AttachmentPreview.tsx` for image/file preview with remove
3. Create `FileUpload.tsx` dropzone with validation
4. Create types.ts and barrel export
5. Create `lib/files.ts` with file handling utilities (upload, validation, mime types)

### Task 3.11 – Create Chat Tools - Agent_Features
**Objective:** AI tools for chat feature (weather, document creation/update, suggestions).
**Output:** `features/chat/lib/tools/` with tool files.
**Guidance:** **Depends on: Task 3.4 Output**. Migrate from archive/oldapp/lib/ai/tools.

1. Create `weather.tool.ts` for weather fetching
2. Create `create-document.tool.ts` for document creation via artifacts
3. Create `update-document.tool.ts` for document updates
4. Create `suggestions.tool.ts` for AI suggestions
5. Create `features/chat/lib/tools/index.ts` barrel

### Task 3.12 – Create Data Stream Provider - Agent_Features
**Objective:** SSE data stream provider and handler for chat streaming.
**Output:** `features/chat/components/data-stream-provider.tsx`, `data-stream-handler.tsx`.
**Guidance:** **Depends on: Task 3.1 Output**. Migrate from archive/oldapp.

1. Create `DataStreamProvider.tsx` managing SSE connection lifecycle and context
2. Create `DataStreamHandler.tsx` consuming SSE events and updating state
3. Create hooks: useDataStream, useStreamStatus

---

## Phase 4: Components
*Goal: Build component layers from AI primitives through layout composition*
*Tasks: 10 | Est. Duration: 12-16 hours*

### Task 4.1 – Copy AI Elements (Read-Only Primitives) - Agent_Components
**Objective:** Copy 31 AI element primitives from archive to components/ai-elements/.
**Output:** `components/ai-elements/` with all 31 primitive files.
**Guidance:** COPY-THEN-MODIFY from archive/oldapp/components/elements/. READ-ONLY in target.

1. Create `components/ai-elements/` directory
2. Copy all 31 files from archive/oldapp/components/elements/
3. Create `components/ai-elements/index.ts` barrel export
4. Verify all imports and fix any path issues

### Task 4.2a – Create Core Chat AI Wrappers - Agent_Components
**Objective:** AI wrappers for chat, reasoning, and tool components.
**Output:** `components/ai/` with chat/, reasoning/, tools/ subdirectories.
**Guidance:** **Depends on: Task 4.1 Output**. See architecture-v6-final.md §11.1.

- Create chat wrappers: AIMessage, AIChatInput, AIConversation
- Create reasoning wrappers: AIThinking, AIReasoning with streaming support
- Create tool wrappers: AIToolCall, AIConfirmation with registry

### Task 4.2b – Create Content AI Wrappers - Agent_Components
**Objective:** AI wrappers for content display (code, image, web preview).
**Output:** `components/ai/content/` with code, image, web-preview wrappers.
**Guidance:** **Depends on: Task 4.1 Output**.

- Create AICodeBlock wrapper with copy toast, run action
- Create AIImage wrapper with download, fullscreen
- Create AIWebPreview wrapper with sandbox, reload

### Task 4.2c – Create Workflow & Utility AI Wrappers - Agent_Components
**Objective:** AI wrappers for workflow and utilities.
**Output:** `components/ai/workflow/`, `components/ai/utilities/`.
**Guidance:** **Depends on: Task 4.1 Output**.

- Create workflow wrappers: AIPlan, AITask, AIQueue, AICheckpoint
- Create utility wrappers: AILoader, AIShimmer, AISuggestion

### Task 4.3 – Create UI Components - Agent_Components
**Objective:** shadcn/ui components for the project.
**Output:** `components/ui/` with ~20 component files.
**Guidance:** Copy from archive/oldapp/components/ui/ or regenerate with shadcn CLI.

1. Copy/regenerate button, input, textarea, dialog components
2. Copy/regenerate dropdown-menu, scroll-area, separator components
3. Copy/regenerate skeleton, tooltip, avatar, badge, card components
4. Copy/regenerate sheet, sidebar, collapsible, hover-card components
5. Create `components/ui/index.ts` barrel export

### Task 4.4 – Create Layout Components - Agent_Components
**Objective:** Root shared components for layout and navigation.
**Output:** `components/` root with auth-form, sidebar, theme-provider, etc.
**Guidance:** **Depends on: Task 4.3 Output**. Migrate from archive/oldapp.

1. Create `auth-form.tsx` consolidated login/register form with mode prop
2. Create `app-sidebar.tsx` main sidebar component
3. Create `sidebar-toggle.tsx`, `sidebar-user-nav.tsx` navigation components
4. Create `theme-provider.tsx` theme context
5. Create `toast.tsx`, `icons.tsx`, `version-footer.tsx` utility components

### Task 4.5 – Create Hooks Module - Agent_Components
**Objective:** Shared hooks for debounce, localStorage, media query, etc.
**Output:** `hooks/` with shared hook files.
**Guidance:** Migrate from archive/oldapp/hooks/.

1. Create `use-debounce.ts` debounced value hook
2. Create `use-local-storage.ts` localStorage persistence
3. Create `use-media-query.ts` CSS media query hook
4. Create `use-mobile.ts` mobile viewport detection
5. Create `use-scroll-to-bottom.ts` auto-scroll behavior
6. Create `hooks/index.ts` barrel export

### Task 4.6 – Create Settings & UI Modules - Agent_Components
**Objective:** Settings types/defaults and UI state atoms.
**Output:** `lib/settings/`, `lib/ui/`.
**Guidance:** **Depends on: Task 1.1 Output by Agent_Infrastructure**.

1. Create `lib/settings/types.ts` with SamplingSettings, SystemPromptSettings, ModelSettings
2. Create `lib/settings/defaults.ts` with DEFAULT_SETTINGS
3. Create `lib/ui/constants.ts` with breakpoints, animation, sizing, z-index
4. Create `lib/ui/state.ts` with Jotai atoms (settingsAtom, sidebarOpenAtom, themeAtom)
5. Create `lib/ui/settings-context.tsx` with SettingsProvider and useSettings
6. Create `lib/motion.tsx` with Framer Motion animation utilities and presets

### Task 4.7 – Create AI Module - Agent_Components
**Objective:** AI provider configurations and prompts.
**Output:** `lib/ai/` with registry, providers, prompts.
**Guidance:** Migrate from archive/oldapp/lib/ai/.

1. Create `lib/ai/registry.ts` with model registration and lookup
2. Create `lib/ai/providers.ts` with provider configurations
3. Create `lib/ai/prompts.ts` with system prompts
4. Create `lib/ai/index.ts` barrel export

### Task 4.8 – Create Component Barrel Exports - Agent_Components
**Objective:** Final barrel exports for all component directories.
**Output:** `components/index.ts` and subdirectory index files.
**Guidance:** **Depends on: Task 4.1-4.7 Output**. Clean public API surface.

- Create/update all index.ts barrel files
- Verify no circular dependencies
- Test all exports resolve correctly

---

## Phase 5: App Router
*Goal: Implement page routes and API routes following slim route pattern*
*Tasks: 6 | Est. Duration: 6-10 hours*

### Task 5.1 – Create Root Layout & Providers - Agent_AppRouter
**Objective:** Root layout with all necessary providers.
**Output:** `app/layout.tsx`, `app/globals.css`, `app/not-found.tsx`, `app/error.tsx`.
**Guidance:** **Depends on: Task 4.4 Output by Agent_Components**.

1. Create `app/layout.tsx` with ThemeProvider, AuthProvider, SettingsProvider
2. Create `app/globals.css` with Tailwind directives
3. Create `app/not-found.tsx` 404 page
4. Create `app/error.tsx` error boundary

### Task 5.2 – Create Auth Routes - Agent_AppRouter
**Objective:** Auth route group with login and register pages.
**Output:** `app/(auth)/` with layout, login/page.tsx, register/page.tsx.
**Guidance:** **Depends on: Task 3.7 Output by Agent_Features**.

1. Create `app/(auth)/layout.tsx` centered card layout
2. Create `app/(auth)/login/page.tsx` with AuthForm mode="login"
3. Create `app/(auth)/register/page.tsx` with AuthForm mode="register"

### Task 5.3 – Create Chat Routes - Agent_AppRouter
**Objective:** Chat route group with main page and dynamic chat routes.
**Output:** `app/(chat)/` with layout, page.tsx, [id]/page.tsx.
**Guidance:** **Depends on: Task 3.1, 3.2a Output by Agent_Features**.

1. Create `app/(chat)/layout.tsx` with sidebar integration
2. Create `app/(chat)/page.tsx` new chat page
3. Create `app/(chat)/[id]/page.tsx` existing chat by ID

### Task 5.4 – Create Auth API Routes - Agent_AppRouter
**Objective:** Slim API routes for authentication.
**Output:** `app/api/auth/` with callback, guest, logout, [...nextauth] routes.
**Guidance:** **Depends on: Task 1.8, 1.9 Output by Agent_Infrastructure**. <20 LOC per route.

1. Create `app/api/auth/callback/route.ts` OAuth token exchange (GET)
2. Create `app/api/auth/guest/route.ts` guest JWT creation (POST)
3. Create `app/api/auth/logout/route.ts` session termination (POST)
4. Create `app/api/auth/[...nextauth]/route.ts` NextAuth handlers

### Task 5.5 – Create Chat API Routes - Agent_AppRouter
**Objective:** Slim API routes for chat streaming and messages.
**Output:** `app/api/chat/` with route.ts, [id]/messages, [id]/reconnect.
**Guidance:** **Depends on: Task 3.1 Output by Agent_Features**. Slim routes delegate to actions.

1. Create `app/api/chat/route.ts` main chat streaming (POST)
2. Create `app/api/chat/[id]/messages/route.ts` paginated message fetch (GET)
3. Create `app/api/chat/[id]/reconnect/route.ts` SSE reconnection (GET)

### Task 5.6 – Create Remaining API Routes - Agent_AppRouter
**Objective:** Slim API routes for artifacts, files, history, suggestions, vote.
**Output:** `app/api/` with artifact, files/upload, health, history, suggestions, vote routes.
**Guidance:** **Depends on: Task 3.4-3.9 Output by Agent_Features**. Slim routes only.

1. Create `app/api/artifact/route.ts` artifact CRUD
2. Create `app/api/files/upload/route.ts` file uploads (POST)
3. Create `app/api/health/route.ts` health check (GET)
4. Create `app/api/history/route.ts` chat history listing (GET)
5. Create `app/api/suggestions/route.ts` AI suggestions (GET)
6. Create `app/api/vote/route.ts` message voting (POST/PATCH)

---

## Phase 6: Integration & Testing
*Goal: Full test coverage, deployment verification, final integration*
*Tasks: 7 | Est. Duration: 8-12 hours*

### Task 6.1 – Create Edge Middleware - Agent_Testing
**Objective:** Edge middleware with rate limiting and auth checks.
**Output:** `middleware.ts`.
**Guidance:** **Depends on: Task 2.7, 2.8 Output by Agent_Data**.

1. Create `middleware.ts` with Upstash rate limiting
2. Implement route-specific rate limits from config
3. Add bypass for health endpoints and IP whitelist
4. Include proper rate limit headers in responses

### Task 6.1b – Create Instrumentation - Agent_Testing
**Objective:** Next.js instrumentation for server-side initialization and monitoring.
**Output:** `instrumentation.ts` at project root.
**Guidance:** **Depends on: Task 6.1 Output**. Optional OpenTelemetry setup.

- Create `instrumentation.ts` with `register` function export
- Initialize logging on server start
- Add OpenTelemetry setup if monitoring required

### Task 6.2 – Create Test Utilities - Agent_Testing
**Objective:** Test setup, mocks, and fixtures.
**Output:** `src/test/` with setup, mocks, fixtures.
**Guidance:** Use Vitest for unit/integration, Playwright for E2E.

1. Create `src/test/setup.ts` Vitest global setup
2. Create `src/test/mocks/db.ts` database mocks
3. Create `src/test/mocks/cache.ts` cache mocks
4. Create `src/test/mocks/ai.ts` AI SDK mocks
5. Create `src/test/fixtures/` test data

### Task 6.3a – Create Unit Tests for lib/ - Agent_Testing
**Objective:** Unit tests for lib/ modules.
**Output:** `*.test.ts` files colocated with lib/ source.
**Guidance:** **Depends on: All Phase 1-2 Output**.

1. Create unit tests for lib/types, lib/errors, lib/utils
2. Create unit tests for lib/cache modules
3. Create unit tests for lib/auth, lib/api modules
4. Create unit tests for lib/data repositories and services

### Task 6.3b – Create Unit Tests for features/ - Agent_Testing
**Objective:** Unit tests for feature actions and hooks.
**Output:** `*.test.ts` files colocated with features/ source.
**Guidance:** **Depends on: All Phase 3 Output**.

1. Create unit tests for chat feature actions
2. Create unit tests for artifact feature actions
3. Create unit tests for auth, sidebar, settings feature actions
4. Create unit tests for feature hooks

### Task 6.4 – Create Integration Tests - Agent_Testing
**Objective:** Integration tests for cross-module workflows.
**Output:** `tests/integration/` test files.
**Guidance:** **Depends on: Task 6.2, 6.3a, 6.3b Output**.

1. Create chat flow integration tests
2. Create artifact workflow integration tests
3. Create auth flow integration tests
4. Test cache-through behavior with test database

### Task 6.5 – Create E2E Tests - Agent_Testing
**Objective:** End-to-end tests with Playwright.
**Output:** `tests/e2e/` spec files.
**Guidance:** **Depends on: All Phase 1-5 Output**. Use existing playwright.config.

1. Create login/register E2E tests
2. Create chat creation and messaging E2E tests
3. Create artifact creation and editing E2E tests
4. Create sidebar navigation E2E tests

### Task 6.6 – Final Verification & Deployment Prep - Agent_Testing
**Objective:** Final quality checks and deployment preparation.
**Output:** Verified build, clean lint, all tests passing.
**Guidance:** **Depends on: Task 6.1-6.5 Output**. Run all quality gates.

1. Run `tsc --noEmit` and fix any type errors
2. Run `pnpm lint` (Biome + Ultracite) and fix issues
3. Run full test suite and verify all pass
4. Verify build succeeds with `pnpm build`
5. Smoke test core functionality manually
6. Document any known issues or follow-up items

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Total Phases** | 7 |
| **Total Tasks** | 70 | <!-- Full 70 tasks covers all functionality including console.tsx -->
| **Single-step Tasks** | 28 |
| **Multi-step Tasks** | 41 |
| **Cross-Agent Dependencies** | 22 |

| Agent | Task Count |
|-------|------------|
| Agent_Infrastructure | 13 |
| Agent_Data | 16 |
| Agent_Features | 17 |
| Agent_Components | 10 |
| Agent_AppRouter | 6 |
| Agent_Testing | 8 |

---

## Pre-Migration Checklist

- [ ] Create new git branch for migration (e.g., `refactor/v6-migration`)
- [ ] Backup current environment variables to secure location
- [ ] Ensure test database is separate from production
- [ ] Verify access to archive/oldapp/ source files
- [ ] Review .ouroboros/specs/refactor-migration/*.md for detailed specs
- [ ] Confirm all team members aware of migration timeline

---

## Quality Gates (Per Task)

Every task must pass these gates before marking complete:

1. **Type Check**: `pnpm tsc --noEmit` - zero errors
2. **Lint**: `pnpm lint` (Biome + Ultracite) - zero errors
3. **Unit Tests**: Relevant tests pass
4. **Smoke Test**: Manual verification of functionality
5. **Incremental Commit**: Changes committed with descriptive message

---

## Rollback Plan

### Immediate Rollback (< 1 hour)
If critical issues discovered within 1 hour of deployment:
1. Revert Vercel deployment to previous version via dashboard
2. No code changes needed - Vercel keeps previous deployments
3. Notify team of rollback and issue

### Git Rollback
```bash
git revert --no-commit HEAD~N..HEAD
git commit -m "Rollback: Migration issues - [description]"
```

### Rollback Triggers
Initiate rollback if:
- Authentication completely broken
- Chat streaming non-functional
- Data loss detected
- Performance degradation > 50%
- Security vulnerability discovered

---

## Success Criteria

### Functional Criteria
| Criteria | Target | Measurement |
|----------|--------|-------------|
| Auth works | 100% | All auth tests pass |
| Chat works | 100% | Chat integration tests pass |
| Artifacts work | 100% | Artifact tests pass |
| API routes respond | 100% | API tests pass |
| UI identical | 100% | Visual regression check |

### Performance Criteria
| Metric | Target | Tool |
|--------|--------|------|
| First Load JS | < 100kB | `next build` output |
| LCP | < 2.5s | Lighthouse |
| TTFB | < 600ms | WebPageTest |

### Code Quality Criteria
| Criteria | Target | Measurement |
|----------|--------|-------------|
| TypeScript errors | 0 | `tsc --noEmit` |
| Lint errors | 0 | `pnpm lint` |
| Circular dependencies | 0 | `madge --circular` |

---

## Reference Documents

For detailed implementation guidance, agents MUST reference:

| Document | Purpose |
|----------|---------|
| `.ouroboros/specs/refactor-migration/architecture-v6-final.md` | Canonical architecture (29 sections) |
| `.ouroboros/specs/refactor-migration/functional-structure-v6.md` | File-by-file specs with code examples (~274 files) |
| `.ouroboros/specs/refactor-migration/implementation-plan-v6.md` | Original task breakdown with detailed acceptance criteria |
| `.ouroboros/specs/refactor-migration/directory-structure-v6.md` | Target directory structure |
| `.ouroboros/specs/refactor-migration/architecture-v6-decisions.md` | Architecture Decision Records (ADR 001-020) |

---

## Migration Complete Checklist

When all phases complete:
- [ ] All 68 tasks marked complete
- [ ] All quality gates passed
- [ ] All tests passing (unit, integration, E2E)
- [ ] Production build succeeds (`pnpm build`)
- [ ] Vercel preview deployment verified
- [ ] UI visually identical to original
- [ ] Performance benchmarks met
- [ ] Merge migration branch to main
- [ ] Deploy to production
- [ ] Monitor for 24-48 hours
- [ ] Archive this plan to `.ouroboros/archive/`
