# Scout Report: Shard 03 - features/chat/**

## Metrics Summary

```
| Files in shard          | 43 |
| Total LOC               | ~9,410 |
| Exports catalogued      | 152 |
| Cross-shard edges found | 47 |
| Issues flagged          | 12 |
| Critical complexity (>10)| 0 |
```

---

## File Inventory

### Actions (10 files)

| File | LOC | Classification | Exports | Complexity |
|------|-----|----------------|---------|------------|
| `actions/index.ts` | 72 | barrel export | 38 re-exports | 1 |
| `actions/stream-chat.action.ts` | 403 | entry point | `StreamChatInput`, `StreamChatResult`, `StreamMessage`, `MessagePart`, `StreamChatPreflightResult`, `CreateStreamChatMessageStreamParams`, `streamChatAction`, `validateStreamChatPreflight`, `prepareStreamContext`, `executeStreamChatCompletion`, `createStreamChatMessageStream` | 6 |
| `actions/delete-chat.action.ts` | 185 | entry point | `DeleteChatInput`, `DeleteChatActionResult`, `deleteChatAction`, `deleteAllChatsAction` | 4 |
| `actions/update-visibility.action.ts` | 173 | entry point | `VisibilityType`, `UpdateVisibilityInput`, `UpdateVisibilityResult`, `updateVisibilityAction`, `updateChatVisibility` | 4 |
| `actions/delete-trailing-messages.action.ts` | 155 | entry point | `DeleteTrailingMessagesInput`, `DeleteTrailingMessagesResult`, `deleteTrailingMessagesAction`, `deleteTrailingMessages` | 3 |
| `actions/get-history.action.ts` | 273 | entry point | `GetHistoryInput`, `ChatWithPreview`, `GetHistoryResult`, `GetChatResult`, `getHistoryAction`, `getChatAction`, `getChatByIdAction` | 5 |
| `actions/update-title.action.ts` | 203 | entry point | `UpdateTitleInput`, `UpdateTitleResult`, `updateTitleAction`, `generateTitleAction` | 5 |
| `actions/save-message.action.ts` | 193 | entry point | `MessagePart`, `MessageToSave`, `SaveMessageInput`, `SaveMessageResult`, `saveMessageAction`, `saveSingleMessage` | 3 |
| `actions/create-chat.action.ts` | 129 | entry point | `CreateChatInput`, `CreateChatResult`, `createChatAction`, `createChatWithId` | 2 |

### Schemas (2 files)

| File | LOC | Classification | Exports | Complexity |
|------|-----|----------------|---------|------------|
| `schemas/index.ts` | 46 | barrel export | 24 re-exports | 1 |
| `schemas/chat.schema.ts` | 367 | type definitions | 19 schemas + 17 types | 4 |

### Components (14 files)

| File | LOC | Classification | Exports | Complexity |
|------|-----|----------------|---------|------------|
| `components/index.ts` | 44 | barrel export | 24 re-exports | 1 |
| `components/chat.tsx` | 598 | entry point | `Chat`, `ChatProps`, `ModelMetadata`, `VisibilityType` | 8 |
| `components/messages.tsx` | 559 | domain logic | `Messages`, `MessagesProps`, `PureMessages` (internal) | 7 |
| `components/message.tsx` | 602 | domain logic | `Message`, `ThinkingMessage`, `MessageProps`, `ThinkingMessageProps` | 7 |
| `components/message-actions.tsx` | 413 | domain logic | `MessageActions`, `PureMessageActions`, `PureMessageActionsProps` | 4 |
| `components/message-editor.tsx` | 212 | domain logic | `MessageEditor`, `MessageEditorProps` | 3 |
| `components/message-reasoning.tsx` | 57 | domain logic | `MessageReasoning`, `MessageReasoningProps` | 1 |
| `components/data-stream-handler.tsx` | 324 | domain logic | `DataStreamHandler`, `DataStreamHandlerProps`, `StreamPartHandlerContext`, `ArtifactStreamDefinition`, `ArtifactStreamUpdate`, `artifactStreamDefinitions` | 5 |
| `components/toolbar.tsx` | 499 | domain logic | `Toolbar`, `Tools`, `ArtifactKind`, `ArtifactToolbarItem`, `artifactDefinitions` | 6 |
| `components/chat-header.tsx` | 73 | domain logic | `ChatHeader` | 2 |
| `components/visibility-selector.tsx` | 122 | domain logic | `VisibilitySelector`, `VisibilityType` | 2 |
| `components/greeting.tsx` | 53 | domain logic | `Greeting` | 1 |
| `components/notice-toast-handler.tsx` | 40 | domain logic | `NoticeToastHandler` | 1 |

### Hooks (8 files)

| File | LOC | Classification | Exports | Complexity |
|------|-----|----------------|---------|------------|
| `hooks/index.ts` | 39 | barrel export | 15 re-exports | 1 |
| `hooks/use-chat.ts` | 209 | domain logic | `useChat`, `UseChatOptions`, `UseChatReturn` | 4 |
| `hooks/use-messages.ts` | 114 | domain logic | `useMessages`, `UseMessagesOptions`, `UseMessagesReturn` | 2 |
| `hooks/use-data-stream.tsx` | 162 | domain logic | `DataStreamProvider`, `DataStreamProviderProps`, `useDataStream`, `useDataStreamState`, `useDataStreamDispatch` | 3 |
| `hooks/use-scroll-to-bottom.ts` | 185 | domain logic | `useScrollToBottom` | 4 |
| `hooks/use-stream-status.ts` | 173 | domain logic | `useStreamStatus`, `StreamStatus`, `StreamError`, `StreamStatusState`, `StreamStatusActions`, `UseStreamStatusReturn` | 3 |
| `hooks/use-notice-toast.ts` | 199 | domain logic | `useNoticeToast`, `parseNotice`, `displayNotice`, `NoticeType`, `ParsedNotice` | 4 |
| `hooks/use-chat.test.ts` | 427 | test | (test file) | N/A |

### Tools (6 files)

| File | LOC | Classification | Exports | Complexity |
|------|-----|----------------|---------|------------|
| `lib/tools/index.ts` | 154 | barrel export + factory | `createChatTools`, `DocumentToolsContext`, `ChatTools`, + 14 re-exports | 3 |
| `lib/tools/weather.tool.ts` | 281 | domain logic | `weatherTool`, `WEATHER_TOOL_NAME` | 4 |
| `lib/tools/create-document.tool.ts` | 192 | domain logic | `createCreateDocumentTool`, `CREATE_DOCUMENT_TOOL_NAME`, `CreateDocumentContext`, `createDocument` (deprecated) | 3 |
| `lib/tools/update-document.tool.ts` | 183 | domain logic | `createUpdateDocumentTool`, `UPDATE_DOCUMENT_TOOL_NAME`, `UpdateDocumentContext`, `updateDocument` (deprecated) | 3 |
| `lib/tools/suggestions.tool.ts` | 244 | domain logic | `createSuggestionsTool`, `SUGGESTIONS_TOOL_NAME`, `SuggestionsContext`, `requestSuggestions` (deprecated) | 4 |
| `lib/tools/errors.ts` | 187 | utility | `ToolExecutionError`, `ToolErrorCodes`, `ToolErrorCode`, `isToolExecutionError` | 2 |

### Types (2 files)

| File | LOC | Classification | Exports | Complexity |
|------|-----|----------------|---------|------------|
| `types.ts` | 273 | type definitions | 14 types + 3 type guards | 1 |
| `index.ts` | 173 | barrel export | 67 re-exports | 1 |

---

## Cross-Shard Dependency Edges

### Imports from lib/*

| Source File | Target Module | Import |
|-------------|---------------|--------|
| `actions/stream-chat.action.ts` | `lib/ai` | `executeChatCompletion` |
| `actions/stream-chat.action.ts` | `lib/ai/entitlements` | `getEntitlements` |
| `actions/stream-chat.action.ts` | `lib/ai/registry` | `isValidModelId`, `listChatModels` |
| `actions/stream-chat.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/stream-chat.action.ts` | `lib/auth/session` | `AppSession`, `getSession` |
| `actions/stream-chat.action.ts` | `lib/cache/quota` | `checkMessageQuota` |
| `actions/stream-chat.action.ts` | `lib/data/repositories` | `RepositoryContext` |
| `actions/stream-chat.action.ts` | `lib/data/services/chat.service` | `chatService`, `SaveChatParams` |
| `actions/stream-chat.action.ts` | `lib/db/schema` | `DBMessage` |
| `actions/stream-chat.action.ts` | `lib/errors` | `RateLimitError`, `UnauthorizedError`, `ValidationError` |
| `actions/stream-chat.action.ts` | `lib/rate-limit` | `checkChatLimit`, `getRetryAfter` |
| `actions/delete-chat.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/delete-chat.action.ts` | `lib/data/repositories` | `RepositoryContext` |
| `actions/delete-chat.action.ts` | `lib/data/services/chat.service` | `chatService`, `DeleteChatResult` |
| `actions/delete-chat.action.ts` | `lib/db/schema` | `Chat` |
| `actions/delete-chat.action.ts` | `lib/errors` | `RateLimitError` |
| `actions/delete-chat.action.ts` | `lib/rate-limit` | `checkApiLimit`, `getRetryAfter` |
| `actions/update-visibility.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/update-visibility.action.ts` | `lib/data/repositories` | `RepositoryContext`, `chatRepository` |
| `actions/update-visibility.action.ts` | `lib/errors` | `NotFoundError`, `RateLimitError`, `ValidationError` |
| `actions/update-visibility.action.ts` | `lib/rate-limit` | `checkApiLimit`, `getRetryAfter` |
| `actions/delete-trailing-messages.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/delete-trailing-messages.action.ts` | `lib/data/repositories` | `RepositoryContext` |
| `actions/delete-trailing-messages.action.ts` | `lib/data/services/chat.service` | `chatService` |
| `actions/delete-trailing-messages.action.ts` | `lib/errors` | `RateLimitError`, `ValidationError` |
| `actions/delete-trailing-messages.action.ts` | `lib/rate-limit` | `checkApiLimit`, `getRetryAfter` |
| `actions/get-history.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/get-history.action.ts` | `lib/data/repositories` | `PaginatedResult`, `PaginationParams`, `RepositoryContext` |
| `actions/get-history.action.ts` | `lib/data/services/chat.service` | `chatService` |
| `actions/get-history.action.ts` | `lib/db/schema` | `Chat`, `Message` |
| `actions/get-history.action.ts` | `lib/errors` | `RateLimitError` |
| `actions/get-history.action.ts` | `lib/rate-limit` | `checkApiLimit`, `getRetryAfter` |
| `actions/update-title.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/update-title.action.ts` | `lib/data/repositories` | `RepositoryContext` |
| `actions/update-title.action.ts` | `lib/data/services/chat.service` | `chatService` |
| `actions/update-title.action.ts` | `lib/errors` | `RateLimitError` |
| `actions/update-title.action.ts` | `lib/rate-limit` | `checkApiLimit`, `getRetryAfter` |
| `actions/save-message.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/save-message.action.ts` | `lib/data/repositories` | `RepositoryContext` |
| `actions/save-message.action.ts` | `lib/data/services/chat.service` | `chatService`, `SaveChatParams` |
| `actions/save-message.action.ts` | `lib/db/schema` | `DBMessage` |
| `actions/save-message.action.ts` | `lib/errors` | `RateLimitError` |
| `actions/save-message.action.ts` | `lib/rate-limit` | `checkChatLimit`, `getRetryAfter` |
| `actions/create-chat.action.ts` | `lib/auth/guards` | `requireAuthAction` |
| `actions/create-chat.action.ts` | `lib/data/repositories` | `RepositoryContext` |
| `actions/create-chat.action.ts` | `lib/data/services/chat.service` | `chatService` |
| `actions/create-chat.action.ts` | `lib/db/schema` | `Chat` |
| `actions/create-chat.action.ts` | `lib/errors` | `RateLimitError` |
| `actions/create-chat.action.ts` | `lib/rate-limit` | `checkApiLimit`, `getRetryAfter` |
| `schemas/chat.schema.ts` | `lib/utils/file-validation` | `ALLOWED_MIME_TYPES`, `ATTACHMENT_MAX_FILE_SIZE`, `isValidMimeType` |
| `components/chat.tsx` | `lib/motion` | `motion` |
| `components/chat.tsx` | `lib/utils` | `fetchWithErrorHandlers` |
| `components/message.tsx` | `lib/motion` | `motion` |
| `components/message.tsx` | `lib/utils` | `cn`, `sanitizeText` |
| `components/messages.tsx` | `lib/motion` | `AnimatePresence`, `motion` |
| `components/toolbar.tsx` | `lib/utils` | `cn` |
| `components/visibility-selector.tsx` | `lib/utils` | `cn` |
| `components/greeting.tsx` | `lib/motion` | `motion` |
| `hooks/use-data-stream.tsx` | `lib/errors` | `AppError`, `ErrorCodes` |
| `lib/tools/errors.ts` | `lib/errors` | `AppError` |
| `lib/tools/suggestions.tool.ts` | `lib/data/services/artifact.service` | `artifactService` |
| `lib/tools/update-document.tool.ts` | `lib/data/services/artifact.service` | `artifactService` |

### Imports from features/* (cross-feature)

| Source File | Target Module | Import |
|-------------|---------------|--------|
| `components/chat.tsx` | `features/artifact/hooks` | `initialArtifactData`, `useArtifact`, `useArtifactSelector` |
| `components/chat.tsx` | `features/auth` | `useAuth` |
| `components/chat.tsx` | `features/settings` | `useSettings` |
| `components/chat.tsx` | `features/sidebar/hooks` | `useOptimisticChats` |
| `components/data-stream-handler.tsx` | `features/artifact/hooks/use-artifact` | `initialArtifactData`, `useArtifact` |
| `components/data-stream-handler.tsx` | `features/artifact/types` | `ArtifactKind` |
| `components/messages.tsx` | `features/settings` | `useSettingsSnapshot` |
| `components/chat-header.tsx` | `features/chat/components/visibility-selector` | `VisibilitySelector`, `VisibilityType` |
| `lib/tools/create-document.tool.ts` | `features/artifact/handlers` | `getArtifactHandler` |
| `lib/tools/create-document.tool.ts` | `features/artifact/types` | `ArtifactKind` |
| `lib/tools/create-document.tool.ts` | `features/chat/types` | `ChatMessage` |
| `lib/tools/update-document.tool.ts` | `features/artifact/handlers` | `getArtifactHandler` |
| `lib/tools/update-document.tool.ts` | `features/artifact/types` | `ArtifactKind` |
| `lib/tools/update-document.tool.ts` | `features/chat/types` | `ChatMessage` |
| `lib/tools/suggestions.tool.ts` | `features/chat/types` | `ChatMessage`, `StreamingSuggestion` |

### Imports from components/ui/* (shared UI)

| Source File | Target Module | Import |
|-------------|---------------|--------|
| `components/toolbar.tsx` | `components/icons` | `ArrowUpIcon`, `SummarizeIcon` |
| `components/toolbar.tsx` | `components/ui/tooltip` | `Tooltip`, `TooltipContent`, `TooltipTrigger` |
| `components/chat-header.tsx` | `components/icons` | `PlusIcon` |
| `components/chat-header.tsx` | `components/settings/settings-sheet` | `SettingsButton` |
| `components/chat-header.tsx` | `components/sidebar-toggle` | `SidebarToggle` |
| `components/chat-header.tsx` | `components/ui/button` | `Button` |
| `components/chat-header.tsx` | `components/ui/sidebar` | `useSidebar` |
| `components/visibility-selector.tsx` | `components/icons` | `CheckCircleFillIcon`, `ChevronDownIcon`, `GlobeIcon`, `LockIcon` |
| `components/visibility-selector.tsx` | `components/ui/button` | `Button` |
| `components/visibility-selector.tsx` | `components/ui/dropdown-menu` | `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` |
| `components/message.tsx` | `components/ai/tools/call` | `AIToolCall` |
| `components/message.tsx` | `components/ai/tools/weather` | `Weather`, `WeatherProps` |
| `components/message.tsx` | `components/document/document` | `DocumentToolCall`, `DocumentToolCallProps`, `DocumentToolResult`, `DocumentToolResultProps` |

---

## Intra-Shard Pattern Flags

### 1. Duplicate Type Definition
**File:** `actions/stream-chat.action.ts:43-68`, `actions/save-message.action.ts:30-55`
**Issue:** `MessagePart` and `StreamMessage` interfaces are defined in both files with identical structure.
**Severity:** Low
**Recommendation:** Consolidate into `types.ts`

### 2. Duplicate Type Definition  
**File:** `components/chat.tsx:77`, `components/visibility-selector.tsx:28`, `actions/update-visibility.action.ts:26`
**Issue:** `VisibilityType` defined in three places.
**Severity:** Low
**Recommendation:** Single source of truth in `types.ts`

### 3. Duplicate Type Definition
**File:** `components/chat.tsx:63-72`, `components/greeting.tsx:12-16`
**Issue:** `ModelMetadata` defined in both `chat.tsx` and `greeting.tsx`.
**Severity:** Low
**Recommendation:** Move to `types.ts`

### 4. Duplicate Type Definition
**File:** `components/toolbar.tsx:330`, `types.ts:139`
**Issue:** `ArtifactKind` defined in both files.
**Severity:** Low
**Recommendation:** Import from `types.ts`

### 5. Redundant Alias Functions
**File:** `actions/update-visibility.action.ts:168-172`, `actions/delete-trailing-messages.action.ts:150-154`
**Issue:** Backward-compatible aliases `updateChatVisibility` and `deleteTrailingMessages` that just call the action.
**Severity:** Info
**Note:** Marked as legacy but still exported. Consider deprecation timeline.

### 6. Redundant Alias Functions (Tools)
**File:** `lib/tools/create-document.tool.ts:179-191`, `lib/tools/update-document.tool.ts:172-182`, `lib/tools/suggestions.tool.ts:231-243`
**Issue:** Deprecated legacy exports that wrap factory functions.
**Severity:** Info
**Note:** Marked `@deprecated`. Plan removal.

### 7. Duplicate Icon Components
**File:** `components/message.tsx:584-601`, `components/messages.tsx:541-558`
**Issue:** `SparklesIcon` defined identically in both files.
**Severity:** Low
**Recommendation:** Extract to shared location (could be `components/icons`)

### 8. Similar Auth/Rate-Limit Pattern
**File:** All action files (10 files)
**Issue:** Repetitive pattern: auth check -> rate limit -> context creation -> service call -> revalidate -> return.
**Severity:** Info
**Note:** Could be abstracted into a higher-order action wrapper, but current pattern is explicit and testable.

### 9. Similar Text Extraction Logic
**File:** `actions/update-title.action.ts:167-175`, `actions/stream-chat.action.ts:378-385`, `hooks/use-chat.test.ts:56-61`
**Issue:** Text extraction from parts logic appears in multiple locations.
**Severity:** Low
**Recommendation:** Create utility `extractTextFromParts(parts: MessagePart[]): string`

### 10. Unused Parameter
**File:** `actions/create-chat.action.ts:122`
**Issue:** `_chatId` parameter is unused in `createChatWithId`.
**Severity:** Info
**Note:** The comment says "For now, delegate to createChatAction" - incomplete implementation.

### 11. Placeholder Input Area
**File:** `components/chat.tsx:522-591`
**Issue:** Input area marked as "placeholder for Task 3.2c" with inline textarea and button.
**Severity:** Info
**Note:** Should integrate with `features/input/*` when ready.

### 12. Multiple VisibilityType Exports
**File:** `components/index.ts:42`, `index.ts:83`
**Issue:** `VisibilityType` exported with alias `ComponentArtifactKind` in barrel.
**Severity:** Info
**Note:** Aliased export may cause confusion.

---

## Additional Observations

### Architecture Compliance
- Actions follow thin pattern, delegating to services
- Tools use factory pattern for context injection
- Components use memoization appropriately
- Hooks separated by concern (stream, messages, scroll)

### Test Coverage
- Only `use-chat.test.ts` found in shard
- Other hooks and components lack tests

### Dead Code Candidates
- None identified - all exports appear to be used

---

## ⚠️ ESCALATION Items

None identified.

---

## ⚠️ SCOPE EXTENSION Items

None identified. All analysis contained within `features/chat/**` boundaries.
