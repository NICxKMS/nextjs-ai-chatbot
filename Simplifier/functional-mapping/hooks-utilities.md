# Functional Mapping: Hooks & Utilities

This document maps each hook, utility function, type definition, error class, and cache component to its functionality.

## Hooks (`hooks/`)

### Hook Overview Table

| Hook | Purpose | Dependencies | Returns |
|------|---------|--------------|---------|
| [`useDebounce`](../../hooks/use-debounce.ts) | Debounce values over time | React state, refs | Debounced value |
| [`useDebouncedCallback`](../../hooks/use-debounce.ts) | Debounce callback execution | React refs | Debounced function |
| [`useLocalStorage`](../../hooks/use-local-storage.ts) | Persist state in localStorage | React state, effects | [value, setValue, removeValue] |
| [`useMediaQuery`](../../hooks/use-media-query.ts) | Track CSS media query state | React state, effects | boolean match state |
| [`useIsMobile`](../../hooks/use-mobile.ts) | Detect mobile viewport | React state, effects | boolean \| undefined |
| [`useDeviceType`](../../hooks/use-mobile.ts) | Detailed device type info | React state, effects | { isMobile, isTablet, isDesktop, isReady } |
| [`useScrollToBottom`](../../hooks/use-scroll-to-bottom.tsx) | Manage scroll-to-bottom | React refs, SWR, observers | { containerRef, endRef, isAtBottom, scrollToBottom } |
| [`useWindowSize`](../../hooks/use-window-size.ts) | Track window dimensions | React state, effects | { width, height, isReady, isMobile, isTablet, isDesktop } |
| [`useWindowWidth`](../../hooks/use-window-size.ts) | Track window width only | React state, effects | { width, isReady } |
| [`useWindowHeight`](../../hooks/use-window-size.ts) | Track window height only | React state, effects | { height, isReady } |
| [`useChatVisibility`](../../hooks/use-chat-visibility.ts) | Manage chat visibility state | SWR, server actions | { visibilityType, setVisibilityType } |

### Breakpoint Hooks (from `useMediaQuery`)

| Hook | Breakpoint | Media Query |
|------|------------|-------------|
| [`useIsXs()`](../../hooks/use-media-query.ts:99) | < 640px | `(max-width: 639px)` |
| [`useIsSm()`](../../hooks/use-media-query.ts:106) | ≥ 640px | `(min-width: 640px)` |
| [`useIsMd()`](../../hooks/use-media-query.ts:113) | ≥ 768px | `(min-width: 768px)` |
| [`useIsLg()`](hooks/use-media-query.ts:120) | ≥ 1024px | `(min-width: 1024px)` |
| [`useIsXl()`](../../hooks/use-media-query.ts:127) | ≥ 1280px | `(min-width: 1280px)` |
| [`useIs2Xl()`](../../hooks/use-media-query.ts:134) | ≥ 1536px | `(min-width: 1536px)` |
| [`usePrefersReducedMotion()`](../../hooks/use-media-query.ts:141) | Accessibility | `(prefers-reduced-motion: reduce)` |
| [`usePrefersDarkMode()`](../../hooks/use-media-query.ts:148) | Theme | `(prefers-color-scheme: dark)` |
| [`useHasHover()`](../../hooks/use-media-query.ts:155) | Input | `(hover: hover)` |
| [`useIsPortrait()`](../../hooks/use-media-query.ts:162) | Orientation | `(orientation: portrait)` |

---

## Utilities (`lib/utils/`)

### Utility Modules Table

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| [`cn.ts`](../../lib/utils/cn.ts) | Class name merging | `cn()` |
| [`date.ts`](../../lib/utils/date.ts) | Date operations | `isToday`, `isYesterday`, `startOfDay`, `endOfDay`, `addDays`, `differenceInDays` |
| [`document.ts`](../../lib/utils/document.ts) | Document utilities | `getDocumentTimestampByIndex()` |
| [`fetcher.ts`](../../lib/utils/fetcher.ts) | SWR fetcher | `fetcher<T>()`, `fetchWithErrorHandlers()` |
| [`file-validation.ts`](../../lib/utils/file-validation.ts) | File upload validation | `validateFile`, `validateFileType`, `validateFileSize`, `sanitizeFilename`, `validateImageDimensions` |
| [`format.ts`](../../lib/utils/format.ts) | Formatting utilities | `formatDate`, `formatRelativeTime`, `formatFileSize`, `formatDuration`, `formatNumber` |
| [`logger.ts`](../../lib/utils/logger.ts) | Structured logging | `logger`, `createLogger()` |
| [`message.ts`](../../lib/utils/message.ts) | Message utilities | `getMostRecentUserMessage()`, `getTrailingMessageId()` |
| [`network.ts`](../../lib/utils/network.ts) | Network/IP utilities | `getSecureClientIp()`, `isValidIPv4`, `isValidIPv6`, `isPrivateIP`, `isLoopbackIP` |
| [`string.ts`](../../lib/utils/string.ts) | String utilities | `truncate`, `slugify`, `capitalize`, `sanitizeHtml`, `sanitizeText` |
| [`uuid.ts`](../../lib/utils/uuid.ts) | UUID generation | `generateUUID()` |
| [`validation.ts`](../../lib/utils/validation.ts) | Input validation | `isValidEmail`, `isValidUrl`, `isValidUuid`, `getSafeRedirectUrl`, `isValidRedirectUrl` |
| [`lazy.tsx`](../../lib/utils/lazy.tsx) | Lazy loading | `EditorSkeleton`, `LoadingSkeleton`, `createPreloader`, `preloadModule` |

### File Validation Constants

```typescript
// From lib/utils/file-validation.ts
DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024     // 10MB
ATTACHMENT_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
MAX_IMAGE_DIMENSION = 4096                  // pixels
```

### Allowed MIME Types

```typescript
// Images
'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'

// Documents
'application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json'

// Office
'application/msword', 'application/vnd.openxmlformats-officedocument.*'
```

---

## Types (`lib/types/`)

### Type Categories

| Category | File | Key Types |
|----------|------|-----------|
| **API Response** | [`index.ts`](../../lib/types/index.ts) | `ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`, `ResponseMetadata`, `PaginationMetadata` |
| **Database Entity** | [`index.ts`](../../lib/types/index.ts) | `DatabaseEntity`, `UserEntity`, `ChatEntity`, `MessageEntity`, `ArtifactEntity`, `VoteEntity`, `SuggestionEntity` |
| **Environment** | [`index.ts`](../../lib/types/index.ts) | `EnvConfig`, `RequiredEnvVars`, `OptionalEnvVars` |
| **Utility** | [`index.ts`](../../lib/types/index.ts) | `Maybe<T>`, `AsyncResult<T, E>`, `DeepPartial<T>`, `PartialBy<T, K>`, `RequiredBy<T, K>` |
| **AI SDK** | [`ai-sdk.ts`](../../lib/types/ai-sdk.ts) | `ExtendedToolState` |
| **Message Parts** | [`message-parts.ts`](../../lib/types/message-parts.ts) | 16 message part types with Zod schemas |

### Message Part Types

| Type | Schema | Purpose |
|------|--------|---------|
| `TextPart` | `textPartSchema` | Text content |
| `FilePart` | `filePartSchema` | File attachments |
| `ReasoningPart` | `reasoningPartSchema` | Chain of thought |
| `ModelPart` | `modelPartSchema` | Model reference |
| `ToolCallPart` | `toolCallPartSchema` | Tool invocation |
| `ToolResultPart` | `toolResultPartSchema` | Tool result |
| `SourcePart` | `sourcePartSchema` | Citations |
| `CodePart` | `codePartSchema` | Code blocks |
| `ArtifactPart` | `artifactPartSchema` | Artifact references |
| `ImagePart` | `imagePartSchema` | Generated images |
| `ErrorPart` | `errorPartSchema` | Error content |
| `SystemPart` | `systemPartSchema` | System messages |
| `AudioPart` | `audioPartSchema` | Audio content |
| `VideoPart` | `videoPartSchema` | Video content |
| `EmbedPart` | `embedPartSchema` | Embeddable content |
| `StepPart` | `stepPartSchema` | Multi-step reasoning |

---

## Errors (`lib/errors/`)

### Error Class Hierarchy

```
AppError (base)
├── ValidationError (400)
├── UnauthorizedError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── RateLimitError (429)
├── InternalServerError (500)
├── DatabaseError (500)
├── ServiceUnavailableError (503)
└── ChatSDKError (compatibility layer)
```

### Error Code Categories

| Category | Codes | HTTP Status |
|----------|-------|-------------|
| **Validation** | `VALIDATION_ERROR`, `INVALID_INPUT`, `MISSING_PARAMETER`, `INVALID_FORMAT` | 400 |
| **Authentication** | `UNAUTHORIZED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` | 401 |
| **Authorization** | `FORBIDDEN`, `INSUFFICIENT_PERMISSIONS`, `OWNER_MISMATCH` | 403 |
| **Not Found** | `NOT_FOUND`, `CHAT_NOT_FOUND`, `USER_NOT_FOUND`, `MESSAGE_NOT_FOUND`, `ARTIFACT_NOT_FOUND` | 404 |
| **Rate Limiting** | `RATE_LIMIT_EXCEEDED`, `DAILY_LIMIT_EXCEEDED` | 429 |
| **Server** | `INTERNAL_ERROR`, `DATABASE_ERROR`, `CONFIGURATION_ERROR` | 500 |
| **Service** | `SERVICE_UNAVAILABLE`, `OFFLINE` | 503 |

### Error Utilities

| Function | Purpose |
|----------|---------|
| `isAppError(error)` | Type guard for AppError |
| `hasErrorCode(error, code)` | Check error code |
| `getErrorMessage(error)` | Extract message safely |
| `fromUnknownError(error)` | Convert unknown to AppError |
| `createEntityNotFoundError(entity, id)` | Factory for NotFoundError |

### Database Error Handling

| Function | Purpose |
|----------|---------|
| `isPostgresError(error)` | Type guard for Postgres errors |
| `isUniqueViolation(error)` | Check for duplicate key |
| `isForeignKeyViolation(error)` | Check for FK constraint |
| `isDeadlockError(error)` | Check for deadlock |
| `isConnectionError(error)` | Check for connection issues |
| `mapPostgresCodeToError(code)` | Map Postgres code to AppError |

---

## Cache (`lib/cache/`)

### Cache Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TieredCache                            │
│  ┌─────────────────┐    ┌─────────────────────────────┐    │
│  │   L1: Memory    │───▶│      L2: Redis              │    │
│  │   (LRU Cache)   │    │   (Upstash HTTP REST)       │    │
│  │   ~500 items    │    │   Unlimited                 │    │
│  │   ~60s TTL      │    │   ~3600s TTL                │    │
│  └─────────────────┘    └─────────────────────────────┘    │
│         ▲                          ▲                        │
│         │                          │                        │
│    Fast access              Shared across processes         │
│    Process-local            Survives restarts               │
└─────────────────────────────────────────────────────────────┘
```

### Cache Components

| Component | File | Purpose |
|-----------|------|---------|
| **Client** | [`client.ts`](../../lib/cache/client.ts) | Redis singleton, health checks |
| **Circuit Breaker** | [`circuit-breaker.ts`](../../lib/cache/circuit-breaker.ts) | Failure protection |
| **Keys** | [`keys.ts`](../../lib/cache/keys.ts) | Key generators |
| **Strategies** | [`strategies.ts`](../../lib/cache/strategies.ts) | Cache patterns |
| **Invalidation** | [`invalidation.ts`](../../lib/cache/invalidation.ts) | Cache invalidation |
| **Quota** | [`quota.ts`](../../lib/cache/quota.ts) | Rate limit quotas |
| **Memory Cache** | [`memory-cache.ts`](../../lib/cache/memory-cache.ts) | LRU implementation |
| **Tiered Cache** | [`tiered-cache.ts`](../../lib/cache/tiered-cache.ts) | L1+L2 combined |
| **ZSET** | [`zset.ts`](../../lib/cache/zset.ts) | Sorted set operations |
| **Cast** | [`cast.ts`](../../lib/cache/cast.ts) | Type-safe casting |

### Cache Key Patterns

| Pattern | Key Format | Purpose |
|---------|------------|---------|
| Chat | `chat:{chatId}:{userId}` | Full chat data |
| Chat Meta | `chat:{chatId}:{userId}:meta` | Chat metadata |
| Chat Messages | `chat:{chatId}:{userId}:msgs` | Message ZSET |
| User Chats | `user:{userId}:chats` | User's chat list |
| Artifact | `artifact:{artifactId}:{userId}` | Artifact data |
| Message | `message:{messageId}:{userId}` | Single message |

### Cache Strategies

| Strategy | Function | Pattern |
|----------|----------|---------|
| Cache-Aside | `cacheAside()` | Check cache → fetch on miss → populate cache |
| Read-Through | `getOrSet()` | Automatic fetch and cache |
| Write-Through | `writeThrough()` | Write cache + source atomically |
| Write-Behind | `writeBehind()` | Write cache, async persist |
| Refresh | `refresh()` | Background refresh |

### Cache Entity Types

| Type | Purpose |
|------|---------|
| `CachedChatMeta` | Chat metadata (no messages) |
| `CachedChat` | Full chat with messages |
| `CachedMessage` | Single message |
| `CachedDocument` | Document with versions |
| `UserChatListItem` | Chat list entry |
| `DocumentVersion` | Document snapshot |

---

## Cross-Module Dependencies

```mermaid
graph TD
    subgraph Hooks
        H1[useChatVisibility]
        H2[useScrollToBottom]
        H3[useLocalStorage]
        H4[useMediaQuery]
        H5[useMobile]
        H6[useWindowSize]
    end

    subgraph Utils
        U1[fetcher]
        U2[file-validation]
        U3[validation]
        U4[network]
        U5[format]
        U6[logger]
    end

    subgraph Types
        T1[message-parts]
        T2[index]
    end

    subgraph Errors
        E1[AppError]
        E2[DatabaseError]
        E3[chat-sdk-compat]
    end

    subgraph Cache
        C1[TieredCache]
        C2[strategies]
        C3[types]
    end

    H1 --> U1
    H1 --> E1
    H2 --> C1
    U1 --> E1
    U2 --> T1
    C3 --> T1
    C2 --> E2
    E3 --> E1
