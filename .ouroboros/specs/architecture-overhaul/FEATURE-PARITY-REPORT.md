# Feature Parity Report: OldApp vs NewApp

**Generated**: 2025-12-22
**Analyst**: ouroboros-analyst
**Overall Parity**: ~82%

---

## Executive Summary

NewApp has **strong parity** with OldApp on core features (authentication, chat, documents, API routes). Key gaps exist in **advanced hooks** (use-artifact, use-optimistic-chats), **branch UI**, and **rate limiting guards**. Database schema is **100% identical**.

---

## 1. Authentication (85% Parity)

| Aspect            | OldApp                 | NewApp                                   | Parity        |
| ----------------- | ---------------------- | ---------------------------------------- | ------------- |
| Login/Register UI | `oldapp/app/(auth)/`   | `app/(auth)/`                            | ✅            |
| Session Manager   | `auth.ts` (270 lines)  | `lib/auth/session.ts` (197 lines)        | ✅            |
| Guest Mode        | `getGuestSession`      | `lib/auth/guest.ts`                      | ✅            |
| Auth Form         | `auth-form.tsx`        | `features/auth/components/auth-form.tsx` | ✅            |
| Auth Provider     | `session-provider.tsx` | `lib/auth/session-provider.tsx`          | ✅            |
| JWT Handling      | Inline in `auth.ts`    | Extracted to `lib/auth/jwt.ts`           | ✅ (improved) |
| Route Guards      | `middleware.ts`        | `lib/middleware/auth.ts`                 | ⚠️            |
| Rate Limit Guards | `rate-limit.ts`        | **MISSING**                              | ❌            |

### Missing:

- [ ] `rate-limit.ts` function with limiter types (standard, strict, upload)
- [ ] `withRateLimit` guard function

### Extra in NewApp:

- [+] Separate `lib/auth/cookies.ts` for cookie management
- [+] Constants file `lib/auth/constants.ts`

---

## 2. Chat Features (75% Parity)

| Aspect            | OldApp                          | NewApp                                         | Parity |
| ----------------- | ------------------------------- | ---------------------------------------------- | ------ |
| Create Chat       | `createChat` in `queries.ts`    | `createChat` in `lib/data/chats/write.ts`      | ✅     |
| List Chats        | `getChats` with pagination      | `getChats` via `getChatsByUser`                | ✅     |
| Delete Chat       | `deleteChatById`                | `deleteChat`                                   | ✅     |
| Delete All Chats  | `deleteAllChatsByUser`          | `deleteAllChats` in `lib/data/chats/update.ts` | ✅     |
| Update Title      | `updateChatTitle`               | `updateChatTitle`                              | ✅     |
| Update Visibility | `updateChatVisibility`          | `updateChatVisibility`                         | ✅     |
| Fork/Branch Chat  | `branch-actions.ts` (232 lines) | **MISSING**                                    | ❌     |
| Chat Component    | `chat.tsx` (524 lines)          | `chat.tsx` (113 lines)                         | ⚠️     |
| Chat Header       | `chat-header.tsx`               | `chat-header.tsx`                              | ✅     |

### Missing:

- [ ] **Branch/Fork UI** - `branch.tsx`, `branch-actions.tsx`, `BranchProvider`
- [ ] `use-optimistic-chats.tsx` hook for optimistic updates
- [ ] AlertDialog for chat deletion confirmation
- [ ] Network quality detection (`navigator.connection` API)

### Extra in NewApp:

- [+] `chat-input.tsx` component
- [+] `chat-context.tsx` for context management
- [+] `chat-layout.tsx` layout component

---

## 3. Message Features (90% Parity)

| Aspect          | OldApp                                      | NewApp                              | Parity |
| --------------- | ------------------------------------------- | ----------------------------------- | ------ |
| Send Message    | via `useChat` hook                          | via context/providers               | ✅     |
| Stream Response | `streamText`                                | `streamText` in `lib/ai/stream.ts`  | ✅     |
| Message Roles   | `user`, `assistant`, `system` (schema enum) | Same enum                           | ✅     |
| Message Parts   | `parts` JSONB field                         | Same structure                      | ✅     |
| Message Actions | `message-actions.tsx` (207 lines)           | `message-actions.tsx` (203 lines)   | ✅     |
| Edit Message    | `reload` + `setMessages`                    | `reload` callback in MessageActions | ⚠️     |
| Regenerate      | `reload` from `useChat`                     | Not explicit in component props     | ⚠️     |
| Message Editor  | `message-editor.tsx`                        | `message-editor.tsx`                | ✅     |

### Missing:

- [ ] Explicit `reload` prop threading through components
- [ ] `use-messages.ts` hook wrapper

---

## 4. AI/Model Features (90% Parity)

| Aspect             | OldApp                       | NewApp                                            | Parity |
| ------------------ | ---------------------------- | ------------------------------------------------- | ------ |
| Model Registry     | `models.ts` + `registry.ts`  | `lib/ai/models.ts` (527 lines, 33+ models)        | ✅     |
| Model Selector     | `model-selector.tsx`         | `model-selector.tsx` (390 lines)                  | ✅     |
| Provider Selection | Dynamic via `createProvider` | `lib/ai/provider.ts` with provider field          | ✅     |
| Reasoning Support  | `reasoning.ts`               | `lib/ai/reasoning.ts` (292 lines) with middleware | ✅     |
| Chain-of-thought   | `reasoningFormat`            | Same + `ReasoningUXMode` enum                     | ✅     |
| Tool Calls         | `tools/` (4 tools)           | `lib/ai/tools/` (5 tools with index)              | ✅     |
| Streaming          | `streamText`                 | `streamText` in `lib/ai/stream.ts`                | ✅     |
| Title Generation   | `generateTitle`              | `generateTitle` function                          | ✅     |
| Model Catalog      | Dynamic fetch with cache     | **MISSING**                                       | ⚠️     |

### Missing:

- [ ] `catalog.ts` - Dynamic model fetching from tokenlens
- [ ] `entitlements.ts` - User entitlements/quotas system
- [ ] `use-model-catalog.ts` - Dynamic model discovery

---

## 5. Document/Artifact Features (80% Parity)

| Aspect              | OldApp                           | NewApp                      | Parity |
| ------------------- | -------------------------------- | --------------------------- | ------ |
| Create Document     | `createDocument`                 | `createDocument`            | ✅     |
| Update Document     | `updateDocument`                 | `updateDocument`            | ✅     |
| Document Versioning | `getAllVersions`                 | `getDocumentVersions`       | ✅     |
| Document Kinds      | `text`, `code`, `image`, `sheet` | Same enum                   | ✅     |
| Suggestions         | `/api/suggestions/route.ts`      | `/api/suggestions/route.ts` | ✅     |
| Artifact Component  | `artifact.tsx`                   | `artifact.tsx`              | ✅     |
| Code Editor         | `code-editor.tsx`                | `code-editor.tsx`           | ✅     |
| Text Editor         | `text-editor.tsx`                | `text-editor.tsx`           | ✅     |
| Sheet Editor        | `sheet-editor.tsx`               | `sheet-editor.tsx`          | ✅     |
| Image Editor        | `image-editor.tsx`               | `image-editor.tsx`          | ✅     |
| use-artifact Hook   | `use-artifact.ts`                | **MISSING**                 | ❌     |
| Artifact Actions    | `artifact-actions.tsx`           | `artifact-actions.tsx`      | ✅     |

### Missing:

- [ ] **`use-artifact.ts` hook** - CRITICAL (state management for artifacts)
- [ ] `use-artifact-selector.ts` hook

---

## 6. UI Components - AI Elements

| Component       | OldApp                | NewApp                                   | Parity |
| --------------- | --------------------- | ---------------------------------------- | ------ |
| Conversation    | `conversation.tsx`    | `conversation.tsx`                       | ✅     |
| Message         | `message.tsx`         | `message.tsx`                            | ✅     |
| Response        | `response.tsx`        | Not found (may be merged)                | ⚠️     |
| Reasoning       | `reasoning.tsx`       | `reasoning.tsx` + `chain-of-thought.tsx` | ✅     |
| Tool            | `tool.tsx`            | `tool.tsx`                               | ✅     |
| Actions         | `actions.tsx`         | Not found explicitly                     | ⚠️     |
| Branch          | `branch.tsx`          | **MISSING**                              | ❌     |
| Loader          | `loader.tsx`          | `loader.tsx`                             | ✅     |
| Source          | `source.tsx`          | `source.tsx`                             | ✅     |
| Suggestion      | `suggestion.tsx`      | `suggestion.tsx`                         | ✅     |
| Prompt Input    | `prompt-input.tsx`    | `prompt-input.tsx`                       | ✅     |
| Web Preview     | `web-preview.tsx`     | `web-preview.tsx`                        | ✅     |
| Image           | `image.tsx`           | `image.tsx`                              | ✅     |
| Inline Citation | `inline-citation.tsx` | `inline-citation.tsx`                    | ✅     |
| Task            | `task.tsx`            | `task.tsx`                               | ✅     |
| Context         | `context.tsx`         | `context.tsx`                            | ✅     |

### Extra in NewApp (13 components):

- [+] `chain-of-thought.tsx` - Additional reasoning display
- [+] `checkpoint.tsx` - Conversation checkpoints
- [+] `canvas.tsx` - Canvas-based artifacts
- [+] `code.tsx` - Code display
- [+] `confirmation.tsx` - Confirmation dialogs
- [+] `graph.tsx`, `edge.tsx`, `node.tsx` - Graph UI
- [+] `controls.tsx` - Artifact controls
- [+] `markdown.tsx` - In ai-elements
- [+] `copy.tsx` - Artifact action
- [+] `panel.tsx` - Panel component
- [+] `plan.tsx` - Planning display
- [+] `queue.tsx` - Queue management
- [+] `shimmer.tsx` - Loading shimmer
- [+] `toolbar.tsx` - Toolbar component

---

## 7. API Routes (75% Parity)

| Route                       | OldApp    | NewApp      | Parity |
| --------------------------- | --------- | ----------- | ------ |
| `/api/chat`                 | 467 lines | 351 lines   | ✅     |
| `/api/history`              | 101 lines | 69 lines    | ⚠️     |
| `/api/vote`                 | ✅        | ✅          | ✅     |
| `/api/document`             | ✅        | ✅          | ✅     |
| `/api/files/upload`         | ✅        | ✅          | ✅     |
| `/api/suggestions`          | ✅        | ✅          | ✅     |
| `/api/health`               | ✅        | ✅          | ✅     |
| `/api/chat/[id]/visibility` | ✅        | ✅          | ✅     |
| `/api/chat/[id]/title`      | ✅        | ✅          | ✅     |
| `/api/auth/*`               | ✅        | ✅          | ✅     |
| `/api/chat/[id]/messages`   | ✅        | **MISSING** | ❌     |
| `/api/chat/[id]/stream`     | ✅        | **MISSING** | ❌     |

### Missing:

- [ ] `/api/chat/[id]/messages` - Get messages for a chat
- [ ] `/api/chat/[id]/stream` - Stream endpoint for specific chat
- [ ] Pagination params (`limit`, `starting_after`, `ending_before`) in history route
- [ ] Rate limiting in all routes

---

## 8. Database/Cache (95% Parity)

| Aspect              | OldApp                           | NewApp                         | Parity        |
| ------------------- | -------------------------------- | ------------------------------ | ------------- |
| **Schema**          |                                  |                                |               |
| User table          | ✅                               | ✅                             | ✅            |
| Chat table          | ✅                               | ✅                             | ✅            |
| Message table       | `Message_v2`                     | `Message_v2`                   | ✅            |
| Vote table          | `Vote_v2`                        | `Vote_v2`                      | ✅            |
| Document table      | ✅                               | ✅                             | ✅            |
| Suggestion table    | ✅                               | ✅                             | ✅            |
| **Enums**           |                                  |                                |               |
| visibility          | `public`, `private`              | Same                           | ✅            |
| role                | `user`, `assistant`, `system`    | Same                           | ✅            |
| document_kind       | `text`, `code`, `image`, `sheet` | Same                           | ✅            |
| **Data Layer**      |                                  |                                |               |
| Chat operations     | `queries.ts`                     | Split into read/write/update   | ✅ (improved) |
| Document operations | `documents.ts`                   | `lib/data/documents/`          | ✅            |
| **Cache Layer**     |                                  |                                |               |
| Redis client        | `redis.ts`                       | `lib/cache/client.ts`          | ✅            |
| Cache operations    | `cache.ts` (1000+ lines)         | Split by domain                | ✅ (improved) |
| Circuit breaker     | In `redis.ts`                    | `lib/cache/circuit-breaker.ts` | ✅            |
| Batch operations    | `batch-operations.ts`            | Not found explicitly           | ⚠️            |
| Quota tracking      | `quota.ts`                       | **MISSING**                    | ❌            |

### Missing:

- [ ] `quota.ts` - User quota/rate limit tracking
- [ ] `batch-operations.ts` - Batch cache operations
- [ ] `withRateLimit` - Rate limiting helper

---

## 9. Hooks Comparison (60% Parity)

| Hook                 | OldApp                     | NewApp                    | Parity |
| -------------------- | -------------------------- | ------------------------- | ------ |
| use-artifact         | `use-artifact.ts`          | **MISSING**               | ❌     |
| use-chat-visibility  | `use-chat-visibility.ts`   | ✅                        | ✅     |
| use-messages         | `use-messages.ts`          | `use-messages.ts`         | ✅     |
| use-scroll-to-bottom | `use-scroll-to-bottom.tsx` | ✅                        | ✅     |
| use-optimistic-chats | `use-optimistic-chats.tsx` | **MISSING**               | ❌     |
| use-mobile           | `use-mobile.tsx`           | Likely in `shared/hooks/` | ⚠️     |
| use-window-size      | `use-window-size.ts`       | Not found                 | ⚠️     |

---

## 10. Sidebar Features (100% Parity)

| Aspect               | OldApp                 | NewApp                 | Parity |
| -------------------- | ---------------------- | ---------------------- | ------ |
| App Sidebar          | `app-sidebar.tsx`      | `app-sidebar.tsx`      | ✅     |
| Sidebar History      | `sidebar-history.tsx`  | `sidebar-history.tsx`  | ✅     |
| Sidebar History Item | `sidebar-item.tsx`     | `sidebar-item.tsx`     | ✅     |
| Sidebar User Nav     | `sidebar-user-nav.tsx` | `sidebar-user-nav.tsx` | ✅     |
| Sidebar Toggle       | `sidebar-toggle.tsx`   | `sidebar-toggle.tsx`   | ✅     |

---

## Priority Matrix

### 🔴 HIGH PRIORITY (Blocking)

| #   | Item                       | Location                         | Impact                                        |
| --- | -------------------------- | -------------------------------- | --------------------------------------------- |
| 1   | `use-artifact.ts` hook     | `hooks/`                         | Artifact state management breaks without this |
| 2   | Branch/Fork UI             | `components/elements/branch.tsx` | Conversation branching unavailable            |
| 3   | `use-optimistic-chats.tsx` | `hooks/`                         | Slow perceived UI for chat operations         |
| 4   | Rate limiting guards       | `lib/middleware/rate-limit.ts`   | Security/abuse prevention                     |
| 5   | `/api/chat/[id]/messages`  | `app/api/chat/[id]/messages/`    | Cannot fetch messages independently           |
| 6   | `/api/chat/[id]/stream`    | `app/api/chat/[id]/stream/`      | Cannot stream to specific chat                |

### 🟡 MEDIUM PRIORITY

| #   | Item                           | Location                   | Impact                          |
| --- | ------------------------------ | -------------------------- | ------------------------------- |
| 7   | Pagination in `/api/history`   | `app/api/history/route.ts` | Large history lists problematic |
| 8   | `quota.ts`                     | `lib/cache/`               | Rate limit tracking             |
| 9   | `entitlements.ts`              | `lib/auth/`                | User quotas                     |
| 10  | `response.tsx` + `actions.tsx` | `components/ai-elements/`  | Missing AI elements             |
| 11  | `reload` prop threading        | Multiple components        | Edit/regenerate broken          |

### 🟢 LOW PRIORITY

| #   | Item                      | Location            | Impact                   |
| --- | ------------------------- | ------------------- | ------------------------ |
| 12  | `use-window-size.ts`      | `shared/hooks/`     | Nice to have             |
| 13  | Network quality detection | `lib/utils/`        | Progressive enhancement  |
| 14  | TokenLens catalog         | `lib/ai/catalog.ts` | Dynamic model discovery  |
| 15  | Batch cache operations    | `lib/cache-ops/`    | Performance optimization |

---

## Recommended Implementation Order

1. **Phase 1 - Core Hooks** (Day 1-2)

   - `use-artifact.ts`
   - `use-optimistic-chats.tsx`

2. **Phase 2 - API Gaps** (Day 2-3)

   - `/api/chat/[id]/messages`
   - `/api/chat/[id]/stream`
   - History pagination

3. **Phase 3 - UI Components** (Day 3-4)

   - `branch.tsx` + provider
   - `response.tsx`, `actions.tsx`

4. **Phase 4 - Security** (Day 4-5)

   - Rate limiting middleware
   - Quota tracking

5. **Phase 5 - Polish** (Day 5+)
   - Remaining hooks
   - TokenLens integration
   - Batch operations

---

## Appendix: Files Analyzed

### OldApp (oldapp/)

- `lib/db/schema.ts` - Database schema
- `lib/auth/auth.ts` - Session management
- `lib/db/queries.ts` - Chat operations
- `lib/ai/models.ts` - Model registry
- `components/chat.tsx` - Main chat component
- `components/elements/*` - AI elements (16 files)
- `hooks/*` - Custom hooks (7 files)
- `app/(chat)/api/*` - API routes (9 endpoints)

### NewApp

- `lib/db/schema.ts` - Database schema
- `lib/auth/*` - Auth module (8 files)
- `lib/data/*` - Data layer (organized by domain)
- `lib/ai/*` - AI module (7 files)
- `features/chat/*` - Chat feature (modular)
- `features/artifacts/*` - Artifacts feature
- `features/sidebar/*` - Sidebar feature
- `components/ai-elements/*` - AI elements (28 files)
- `app/api/*` - API routes (10 endpoints)
