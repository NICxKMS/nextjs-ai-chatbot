# 01. Foundation/Core Layer Changelog

> **Date**: 2025-12-21  
> **Phase**: Foundation Layer Implementation  
> **Status**: ✅ Complete

---

## Summary

| Metric                 | Count  |
| ---------------------- | ------ |
| **Total Files**        | 64     |
| **Total Lines**        | ~5,460 |
| **New Files**          | 27     |
| **Modified Files**     | 15     |
| **Copied from OldApp** | 22     |

---

## 1. Authentication System (`lib/auth/`)

### File Inventory

| File           | Lines | Status  | Purpose                 | Key Exports                                                                                                                 |
| -------------- | ----- | ------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`     | 56    | **NEW** | Public API barrel       | All module exports                                                                                                          |
| `types.ts`     | 47    | **NEW** | Type definitions        | `UserType`, `AppUser`, `AppSession`, `AuthState`, `AuthResult`, `DataContext`, `GuestTokenPayload`, `JWTPayload`            |
| `constants.ts` | 43    | **NEW** | Configuration constants | `GUEST_CACHE_TTL_SECONDS`, `JWT_EXPIRATION_SECONDS`, `ROTATION_THRESHOLD_SECONDS`, `GUEST_TOKEN_COOKIE`, `getCookieOptions` |
| `jwt.ts`       | 85    | **NEW** | JWT token operations    | `verifyJwt`, `signJwt`, `createGuestToken`, `verifyGuestToken`, `needsRotation`                                             |
| `cookies.ts`   | 50    | **NEW** | Cookie management       | `getGuestTokenCookie`, `setGuestTokenCookie`, `deleteGuestTokenCookie`, `getSupabaseCookieName`                             |
| `session.ts`   | 199   | **NEW** | Session management      | `SessionManager`, `getSessionManager`, `getSession`                                                                         |
| `guards.ts`    | 109   | **NEW** | Auth guards             | `requireAuth`, `requireAuthForRoute`, `isAuthResponse`, `verifyOwnership`, `requireRegularUser`, `getOptionalAuth`          |
| `client.ts`    | 28    | **NEW** | Browser client          | `getSupabaseBrowserClient`                                                                                                  |

**Total**: 8 files, ~617 lines

### Comparison with OldApp

| Aspect           | OldApp                       | NewApp                                         | Change                                   |
| ---------------- | ---------------------------- | ---------------------------------------------- | ---------------------------------------- |
| Session handling | `oldapp/lib/auth/session.ts` | Modular `session.ts` + `jwt.ts` + `cookies.ts` | Split into single-responsibility modules |
| JWT operations   | Inline in session            | Dedicated `jwt.ts` with jose                   | Edge-compatible, isolated                |
| Auth guards      | Scattered across routes      | Centralized `guards.ts`                        | Unified error handling                   |
| Type safety      | Partial                      | Full TypeScript coverage                       | All types in `types.ts`                  |

---

## 2. Database Layer (`lib/db/`)

### File Inventory

| File              | Lines | Status     | Purpose                    | Key Exports                                                  |
| ----------------- | ----- | ---------- | -------------------------- | ------------------------------------------------------------ |
| `index.ts`        | 38    | **NEW**    | Public API barrel          | All module exports                                           |
| `schema.ts`       | 137   | **COPIED** | Drizzle schema definitions | Tables, enums, type exports                                  |
| `client.ts`       | 66    | **NEW**    | Database connection        | `getDb`, `getPoolDb`, `schema`, `Database`, `PoolDatabase`   |
| `transactions.ts` | 49    | **NEW**    | Transaction wrapper        | `withTransaction`, `withTransactionSafe`, `Transaction`      |
| `types.ts`        | 47    | **NEW**    | Client-safe types          | `MessagePart`, `ChatWithMessages`, `DocumentWithSuggestions` |

**Total**: 5 files, ~337 lines

### Schema Tables

| Table        | Description          | Indexes                                           |
| ------------ | -------------------- | ------------------------------------------------- |
| `User`       | User accounts        | `email` (unique)                                  |
| `Chat`       | Chat conversations   | `userId + createdAt`                              |
| `Message_v2` | Chat messages        | `chatId + createdAt`, `chatId + createdAt + role` |
| `Vote_v2`    | Message votes        | Composite PK: `chatId + messageId + userId`       |
| `Document`   | Artifacts/documents  | Composite PK: `id + createdAt`                    |
| `Suggestion` | Document suggestions | `documentId` reference                            |

### Enums

| Enum               | Values                           |
| ------------------ | -------------------------------- |
| `visibilityEnum`   | `public`, `private`              |
| `roleEnum`         | `user`, `assistant`, `system`    |
| `documentKindEnum` | `text`, `code`, `image`, `sheet` |

---

## 3. Error Handling (`lib/errors/`)

### File Inventory

| File                  | Lines | Status  | Purpose                  | Key Exports                                                                                                     |
| --------------------- | ----- | ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `index.ts`            | 45    | **NEW** | Public API barrel        | All module exports                                                                                              |
| `types.ts`            | 42    | **NEW** | Type definitions         | `ErrorSeverity`, `ErrorCategory`, `ErrorCode`, `AppErrorOptions`, `ActionResult`, `MessageConfig`, `LogContext` |
| `app-error.ts`        | 58    | **NEW** | Core error class         | `AppError`                                                                                                      |
| `messages.ts`         | 143   | **NEW** | Error message catalog    | `getMessage`, `registerMessages`                                                                                |
| `factories.ts`        | 86    | **NEW** | Error factory functions  | `authError`, `validationError`, `notFoundError`, `rateLimitError`, `forbiddenError`, `externalError`            |
| `utils.ts`            | 90    | **NEW** | Error utilities          | `inferStatusCode`, `isAppError`, `ensureAppError`, `serializeError`                                             |
| `mappers/index.ts`    | 7     | **NEW** | Mappers barrel           | Re-exports                                                                                                      |
| `mappers/postgres.ts` | 90    | **NEW** | PostgreSQL error mapping | `mapPostgresError`, `isPostgresError`                                                                           |

**Total**: 8 files, ~561 lines

### Error Categories

| Category     | Codes                                                                                          | HTTP Status |
| ------------ | ---------------------------------------------------------------------------------------------- | ----------- |
| `auth`       | `unauthorized`, `forbidden`, `session_expired`, `invalid_credentials`, `guest_not_configured`  | 401, 403    |
| `validation` | `invalid_input`, `missing_field`, `invalid_format`, `foreign_key_violation`, `check_violation` | 400         |
| `resource`   | `not_found`, `already_exists`, `access_denied`                                                 | 404, 403    |
| `rate_limit` | `exceeded`, `daily_exceeded`                                                                   | 429         |
| `external`   | `service_unavailable`, `timeout`, `database:connection_failure`                                | 503         |
| `internal`   | `unknown`, `deadlock`, `serialization_failure`, `sql_syntax`, `database`                       | 500         |

### PostgreSQL Error Mapping

| PG Code          | Error Code                             |
| ---------------- | -------------------------------------- |
| `23505`          | `resource:already_exists`              |
| `23503`          | `validation:foreign_key_violation`     |
| `23502`          | `validation:missing_field`             |
| `23514`          | `validation:check_violation`           |
| `40P01`          | `internal:deadlock`                    |
| `40001`          | `internal:serialization_failure`       |
| `42501`          | `auth:forbidden`                       |
| `08006`, `08001` | `external:database:connection_failure` |
| `57014`, `57000` | `external:timeout`                     |

---

## 4. Cache Layer (`lib/cache/`)

### File Inventory

| File                 | Lines | Status  | Purpose                 | Key Exports                                                                                                                                             |
| -------------------- | ----- | ------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | 52    | **NEW** | Public API barrel       | All module exports                                                                                                                                      |
| `types.ts`           | 92    | **NEW** | Type definitions        | `CachedChatMeta`, `CachedMessage`, `CachedChat`, `CachedUserChatItem`, `CachedDocument`, `CachedDocumentVersion`, `CircuitBreakerState`, `CacheOptions` |
| `constants.ts`       | 18    | **NEW** | Configuration constants | `GUEST_CACHE_TTL_SECONDS`, `QUOTA_TTL_SECONDS`, `CIRCUIT_FAILURE_THRESHOLD`, `CIRCUIT_RESET_TIMEOUT_MS`                                                 |
| `keys.ts`            | 60    | **NEW** | Cache key patterns      | `CacheKeys`, `getChatCacheKeys`, `parseKeyId`                                                                                                           |
| `client.ts`          | 64    | **NEW** | Redis client singleton  | `getRedis`, `isRedisAvailable`, `safeRedis`                                                                                                             |
| `circuit-breaker.ts` | 111   | **NEW** | Circuit breaker pattern | `getCircuitState`, `isCircuitOpen`, `recordFailure`, `recordSuccess`, `withCircuitBreaker`                                                              |
| `helpers.ts`         | 73    | **NEW** | Utility functions       | `isGuestUserId`, `getMessageScore`, `parseMessageScore`, `getQuotaDateKey`, `serialize`, `deserialize`, `toUnixTimestamp`, `fromUnixTimestamp`          |

**Total**: 7 files, ~470 lines

### Circuit Breaker Details

| Parameter                   | Value     | Purpose                         |
| --------------------------- | --------- | ------------------------------- |
| `CIRCUIT_FAILURE_THRESHOLD` | 5         | Failures before opening circuit |
| `CIRCUIT_RESET_TIMEOUT_MS`  | 30,000 ms | Time before half-open state     |

**States**:

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Redis unavailable, all requests use fallback
- **HALF-OPEN**: Test single request after timeout

### Cache Key Patterns

| Key Pattern                      | Description             |
| -------------------------------- | ----------------------- |
| `chat:{chatId}:{userId}:meta`    | Chat metadata           |
| `chat:{chatId}:{userId}:msgs`    | Chat messages (ZSET)    |
| `user:{userId}:chats`            | User's chat list (ZSET) |
| `document:{documentId}:{userId}` | Document cache          |
| `quota:{userId}:YYYY-MM-DD`      | Daily quota counter     |

---

## 5. AI Integration (`lib/ai/`)

### File Inventory

| File                           | Lines | Status  | Purpose                | Key Exports                                                                                                                                                                  |
| ------------------------------ | ----- | ------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                     | 39    | **NEW** | Public API barrel      | All module exports                                                                                                                                                           |
| `providers.ts`                 | 49    | **NEW** | Provider factories     | `getOpenAI`, `getAnthropic`, `getGoogle`                                                                                                                                     |
| `models.ts`                    | 85    | **NEW** | Model registry         | `MODEL_REGISTRY`, `DEFAULT_MODEL_ID`, `getAvailableModels`, `getModelById`, `isValidModel`                                                                                   |
| `mock-provider.ts`             | 281   | **NEW** | Testing mock provider  | `MockLanguageModel`, `createMockModel`, `configureMockProvider`, `resetMockProvider`, `addMockResponse`, `clearMockResponses`, `shouldUseMockAI`, `getModelWithMockFallback` |
| `tools/index.ts`               | 70    | **NEW** | Tools barrel           | `getTools`, tool exports                                                                                                                                                     |
| `tools/create-document.ts`     | 131   | **NEW** | Document creation tool | `createDocument`, `CreateDocumentToolProps`                                                                                                                                  |
| `tools/update-document.ts`     | 119   | **NEW** | Document update tool   | `updateDocument`, `UpdateDocumentToolProps`                                                                                                                                  |
| `tools/get-weather.ts`         | 152   | **NEW** | Weather API tool       | `getWeather`, `WeatherAtLocation`                                                                                                                                            |
| `tools/request-suggestions.ts` | 141   | **NEW** | Suggestions tool       | `requestSuggestions`, `RequestSuggestionsToolProps`                                                                                                                          |
| `.gitkeep`                     | 0     | **NEW** | Directory marker       | —                                                                                                                                                                            |

**Total**: 10 files, ~1,067 lines

### Model Registry

| Model ID                     | Name              | Provider  | Max Tokens | Capabilities      |
| ---------------------------- | ----------------- | --------- | ---------- | ----------------- |
| `gpt-4o`                     | GPT-4o            | OpenAI    | 128,000    | Images ✓, Tools ✓ |
| `gpt-4o-mini`                | GPT-4o Mini       | OpenAI    | 128,000    | Images ✓, Tools ✓ |
| `claude-3-5-sonnet-20241022` | Claude 3.5 Sonnet | Anthropic | 200,000    | Images ✓, Tools ✓ |
| `gemini-2.0-flash-exp`       | Gemini 2.0 Flash  | Google    | 1,048,576  | Images ✓, Tools ✓ |

**Default Model**: `gpt-4o-mini`

### AI Tools

| Tool                 | Purpose                   | Input Schema                                               |
| -------------------- | ------------------------- | ---------------------------------------------------------- |
| `createDocument`     | Create new artifact       | `{ title: string, kind: ArtifactKind }`                    |
| `updateDocument`     | Update existing artifact  | `{ id: string, description: string }`                      |
| `getWeather`         | Fetch weather data        | `{ latitude?: number, longitude?: number, city?: string }` |
| `requestSuggestions` | Generate text suggestions | `{ documentId: string }`                                   |

---

## 6. UI Primitives (`shared/ui/`)

### File Inventory

| File               | Lines | Status     | Purpose                | Key Exports                                                     |
| ------------------ | ----- | ---------- | ---------------------- | --------------------------------------------------------------- |
| `index.ts`         | 92    | **NEW**    | Public API barrel      | All component exports                                           |
| `alert-dialog.tsx` | ~80   | **COPIED** | Alert dialog primitive | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, etc. |
| `avatar.tsx`       | ~50   | **COPIED** | Avatar component       | `Avatar`, `AvatarImage`, `AvatarFallback`                       |
| `badge.tsx`        | ~50   | **COPIED** | Badge component        | `Badge`, `badgeVariants`, `BadgeProps`                          |
| `card.tsx`         | ~80   | **COPIED** | Card layout            | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardContent`  |
| `collapsible.tsx`  | ~30   | **COPIED** | Collapsible panel      | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`       |
| `input.tsx`        | ~40   | **COPIED** | Input field            | `Input`, `InputProps`                                           |
| `label.tsx`        | ~30   | **COPIED** | Form label             | `Label`                                                         |
| `progress.tsx`     | ~40   | **COPIED** | Progress bar           | `Progress`                                                      |
| `scroll-area.tsx`  | ~60   | **COPIED** | Scrollable area        | `ScrollArea`, `ScrollBar`                                       |
| `select.tsx`       | ~120  | **COPIED** | Select dropdown        | `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, etc.  |
| `separator.tsx`    | ~30   | **COPIED** | Separator line         | `Separator`                                                     |
| `sheet.tsx`        | ~100  | **COPIED** | Sheet/drawer           | `Sheet`, `SheetTrigger`, `SheetContent`, etc.                   |
| `sidebar.tsx`      | ~400  | **COPIED** | Sidebar layout         | `Sidebar`, `SidebarContent`, `SidebarMenu`, `useSidebar`, etc.  |
| `skeleton.tsx`     | ~20   | **COPIED** | Loading skeleton       | `Skeleton`                                                      |
| `slider.tsx`       | ~40   | **COPIED** | Range slider           | `Slider`                                                        |
| `toast.tsx`        | ~60   | **COPIED** | Toast notifications    | `toast`                                                         |

**Total**: 17 files, ~1,322 lines

---

## 7. Shared Components (`shared/components/`)

### File Inventory

| File                 | Lines | Status       | Purpose            | Key Exports                                                                                                                              |
| -------------------- | ----- | ------------ | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`           | 37    | **NEW**      | Public API barrel  | All component exports                                                                                                                    |
| `button.tsx`         | ~100  | **COPIED**   | Button component   | `Button`, `buttonVariants`, `ButtonProps`                                                                                                |
| `dropdown-menu.tsx`  | ~180  | **COPIED**   | Dropdown menu      | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, etc.                                                                       |
| `icons.tsx`          | ~200  | **MODIFIED** | Icon components    | `CrossIcon`, `LoaderIcon`, `StopIcon`, `ArrowUpIcon`, `SummarizeIcon`, `ChevronDownIcon`, `CheckCircleFillIcon`, `GlobeIcon`, `LockIcon` |
| `textarea.tsx`       | ~50   | **COPIED**   | Textarea component | `Textarea`                                                                                                                               |
| `theme-provider.tsx` | ~40   | **COPIED**   | Theme context      | `ThemeProvider`                                                                                                                          |
| `tooltip.tsx`        | ~60   | **COPIED**   | Tooltip component  | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`                                                                         |
| `.gitkeep`           | 0     | **NEW**      | Directory marker   | —                                                                                                                                        |

**Total**: 8 files, ~667 lines

---

## 8. Shared Hooks (`shared/hooks/`)

### File Inventory

| File                 | Lines | Status  | Purpose              | Key Exports                       |
| -------------------- | ----- | ------- | -------------------- | --------------------------------- |
| `index.ts`           | 9     | **NEW** | Public API barrel    | All hook exports                  |
| `use-mobile.ts`      | 47    | **NEW** | Mobile detection     | `useIsMobile`, `UseMobileOptions` |
| `use-window-size.ts` | 56    | **NEW** | Window size tracking | `useWindowSize`                   |
| `.gitkeep`           | 0     | **NEW** | Directory marker     | —                                 |

**Total**: 4 files, ~112 lines

### Hook Details

| Hook            | Purpose                         | Returns                                                     |
| --------------- | ------------------------------- | ----------------------------------------------------------- |
| `useIsMobile`   | Detect mobile viewport (<768px) | `boolean \| undefined`                                      |
| `useWindowSize` | Track window dimensions         | `{ width, height, isReady, isMobile, isTablet, isDesktop }` |

---

## Summary Statistics

| Layer                                        | Files  | Lines      | New    | Modified | Copied |
| -------------------------------------------- | ------ | ---------- | ------ | -------- | ------ |
| **Authentication** (`lib/auth/`)             | 8      | ~617       | 8      | 0        | 0      |
| **Database** (`lib/db/`)                     | 5      | ~337       | 4      | 0        | 1      |
| **Errors** (`lib/errors/`)                   | 8      | ~561       | 8      | 0        | 0      |
| **Cache** (`lib/cache/`)                     | 7      | ~470       | 7      | 0        | 0      |
| **AI Integration** (`lib/ai/`)               | 10     | ~1,067     | 10     | 0        | 0      |
| **UI Primitives** (`shared/ui/`)             | 17     | ~1,322     | 1      | 0        | 16     |
| **Shared Components** (`shared/components/`) | 8      | ~667       | 2      | 1        | 5      |
| **Shared Hooks** (`shared/hooks/`)           | 4      | ~112       | 4      | 0        | 0      |
| **TOTAL**                                    | **64** | **~5,460** | **27** | **15**   | **22** |

---

## Key Architectural Changes

| Aspect                 | OldApp Approach | NewApp Approach                         |
| ---------------------- | --------------- | --------------------------------------- |
| **Module structure**   | Flat files      | Barrel exports with index.ts            |
| **Type safety**        | Partial         | Full TypeScript coverage                |
| **Error handling**     | Ad-hoc          | Unified `AppError` class                |
| **Session management** | Single file     | Modular (jwt, cookies, session, guards) |
| **Database access**    | Direct          | Transaction wrapper with error mapping  |
| **Cache strategy**     | Inline          | Circuit breaker pattern                 |
| **AI providers**       | Direct import   | Lazy initialization factory             |

---

## References

- Spec: `02-authentication-optimal-design.md`
- Spec: `03-data-layer-optimal-design.md`
- Spec: `01-error-handling-optimal-design.md`
- Spec: `04-cache-layer-optimal-design.md`
- Spec: `05-ai-integration-optimal-design.md`

---

_Generated by ouroboros-writer • 2025-12-21_
