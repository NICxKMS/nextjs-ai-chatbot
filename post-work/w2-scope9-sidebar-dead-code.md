# Scope 9 — Sidebar Bug Fixes + Dead Code Removal

**Status:** ✅ Complete  
**Date:** 2026-03-07

---

## Summary

Fixed 3 sidebar bugs (date grouping, SWR cache invalidation, rename double-submit) and removed verified dead code from 3 files (1 cache function, 1 data function, 4 schema exports).

---

## Bug Fixes

### 1. Date Grouping — `features/sidebar/components/sidebar-history-client.tsx`

**Problem:** `groupChatsByDate()` used `chat.createdAt` to bucket chats into Today/Yesterday/etc., but the server sorts by `updatedAt`. A chat created 5 days ago but updated today appeared at the top of the list (sort order) but grouped under "Last 7 Days" (grouping) — wrong bucket.

**Fix:** Changed `new Date(chat.createdAt)` → `new Date(chat.updatedAt)` in the grouping function. Grouping now matches the server-side sort order.

**Lines changed:** 1

---

### 2. SWR Cache After deleteAllChats — `features/sidebar/components/sidebar-header-actions.tsx`

**Problem:** After `deleteAllChats()` succeeded, only server-side cache was invalidated. The client-side SWR cache in `useSidebarHistory` was never cleared. With `revalidateFirstPage: false`, stale chat entries remained visible until the user alt-tabbed.

**Fix:**
- Exported `HISTORY_KEY_PREFIX = "/api/history"` from `features/sidebar/hooks/use-sidebar-history.ts`
- Imported `useSWRConfig` from `swr` and `HISTORY_KEY_PREFIX` in sidebar-header-actions
- After successful deletion, calls `await mutate((key) => typeof key === "string" && key.includes(HISTORY_KEY_PREFIX))` to revalidate all history SWR cache entries

**Files changed:** 2 (`use-sidebar-history.ts` — export constant; `sidebar-header-actions.tsx` — add mutate call)

---

### 3. Rename Double-Submit — `features/sidebar/components/sidebar-history-item.tsx`

**Problem:** Both Enter key and blur events called `handleRenameSubmit()`. When Enter fires, `setIsRenaming(false)` unmounts the input, which fires `onBlur`, calling `handleRenameSubmit()` again — two parallel `renameChat()` server action calls.

**Fix:**
- Added `isSubmittingRef = useRef(false)` guard
- Check at start of `handleRenameSubmit` — if already submitting, return early
- Set `true` before the async operation, reset `false` in `finally` block
- Wrapped `handleRenameSubmit` in `useCallback` for stable reference

**Lines changed:** ~15 (structural refactor of the function)

---

## Dead Code Removal

### 4. `refreshVotes()` — `lib/cache/revalidate.ts`

**Verification:** Searched entire codebase — zero imports, zero calls outside the definition. Confirmed dead in `post-work/flows/cache-invalidation.md` and `post-work/w1-audit-lib-infra.md`.

**Removed:** Export function `refreshVotes(chatId: string): void` (3 lines). The `revalidateTag` import remains used by `refreshChat` and `refreshChatList`.

---

### 5. `getUserByEmail()` — `lib/data/user.ts`

**Verification:** Searched entire codebase — zero imports outside `oldapp/` and plan docs. Auth uses Supabase SDK for email lookup. Annotated `@unused` in the source.

**Removed:** Export function `getUserByEmail(email: string): Promise<User | null>` (14 lines including JSDoc). All other exports (`getUserById`, `createUser`, `updateUserLastLogin`, `ensureGuestUser`) preserved.

---

### 6. Four Dead Schema Exports — `features/chat/schemas/chat.schema.ts`

**Verification:** Searched for each name — zero imports:
- `messageSchema` — 0 imports
- `MessageInput` — 0 imports
- `editMessageSchema` — 0 imports  
- `EditMessageInput` — 0 imports

Confirmed dead in `post-work/w1-audit-chat-feature.md`.

**Removed:** Two Zod schema definitions + two type exports + two section comments (~20 lines). Remaining schemas preserved: `chatRequestSchema`, `ChatRequest`, `deleteMessagesSchema`, `DeleteMessagesInput`.

---

## Validation

| Check | Result |
|-------|--------|
| `pnpm format` | ✅ 228 files, no fixes needed |
| `pnpm lint` (modified files only) | ✅ 7 files, 0 errors |
| `pnpm lint` (full) | ✅ Only 2 pre-existing errors in `app/(chat)/chat/[id]/loading.tsx` (array index keys — unrelated) |
| `pnpm typecheck` | ✅ Only pre-existing `ai-elements/reasoning.tsx` error (read-only, not our code) |

## Files Modified

| File | Change |
|------|--------|
| `features/sidebar/components/sidebar-history-client.tsx` | `createdAt` → `updatedAt` in grouping |
| `features/sidebar/hooks/use-sidebar-history.ts` | Export `HISTORY_KEY_PREFIX` constant |
| `features/sidebar/components/sidebar-header-actions.tsx` | SWR `mutate` after deleteAllChats |
| `features/sidebar/components/sidebar-history-item.tsx` | `isSubmittingRef` guard + `useCallback` |
| `lib/cache/revalidate.ts` | Removed `refreshVotes` |
| `lib/data/user.ts` | Removed `getUserByEmail` |
| `features/chat/schemas/chat.schema.ts` | Removed 4 dead exports |
