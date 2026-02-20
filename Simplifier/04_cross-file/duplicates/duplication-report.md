# Duplication Report

**Generated:** 2026-02-19
**Scope:** Full codebase analysis

---

## Type Duplications

### PaginationParams

| Location | Definition | Differences |
|----------|------------|-------------|
| `lib/data/types.ts:84` | `interface PaginationParams { limit: number; startingAfter?: string \| null; endingBefore?: string \| null; }` | Base definition |
| `lib/data/repositories/chat.repository.ts:58` | `interface PaginationParams { limit: number; startingAfter?: string \| null; endingBefore?: string \| null; searchQuery?: string \| null; fromDate?: Date \| null; toDate?: Date \| null; }` | Extended with searchQuery, fromDate, toDate |
| `archive/oldapp/lib/data/base.ts:64` | `type PaginationParams = { limit: number; startingAfter?: string \| null; endingBefore?: string \| null; }` | Archive - uses `type` vs `interface` |

**Recommendation:** Keep single source of truth in `lib/data/types.ts`. Chat repository should extend it: `interface ChatPaginationParams extends PaginationParams { searchQuery?: string | null; fromDate?: Date | null; toDate?: Date | null; }`

---

### PaginatedResult

| Location | Definition | Differences |
|----------|------------|-------------|
| `lib/data/types.ts:96` | `interface PaginatedResult<T> { items: T[]; hasMore: boolean; }` | Base definition |
| `lib/data/repositories/chat.repository.ts:76` | `interface PaginatedResult<T> { items: T[]; hasMore: boolean; }` | Identical |
| `archive/oldapp/lib/data/base.ts:73` | `type PaginatedResult<T> = { items: T[]; hasMore: boolean; }` | Archive - uses `type` vs `interface` |

**Recommendation:** Single source of truth in `lib/data/types.ts`. Remove from repository file.

---

### RepositoryContext

| Location | Definition | Differences |
|----------|------------|-------------|
| `lib/data/types.ts:59` | `interface RepositoryContext { userId: string; isGuest: boolean; }` | Base definition |
| `lib/data/repositories/base.repository.ts:56` | `interface RepositoryContext { userId: string; isGuest: boolean; }` | Identical |

**Recommendation:** Single source of truth in `lib/data/types.ts`. Repository should import from types.

---

### ChatWithMessages

| Location | Definition | Differences |
|----------|------------|-------------|
| `lib/data/repositories/chat.repository.ts:86` | `interface ChatWithMessages { chat: Chat; messages: Message[]; }` | Repository definition |
| `lib/data/services/chat.service.ts:42` | `interface ChatWithMessages { chat: Chat; messages: Message[]; }` | Identical |
| `lib/data/queries/chat.queries.ts:42` | `interface ChatWithMessagesAndArtifacts { ... }` | Similar but extended |

**Recommendation:** Single source of truth in `lib/data/types.ts`. Both repository and service should import.

---

### VisibilityType

| Location | Definition | Differences |
|----------|------------|-------------|
| `features/chat/actions/update-visibility.action.ts:26` | `type VisibilityType = "private" \| "public"` | Action definition |
| `features/chat/components/chat.tsx:77` | `type VisibilityType = "public" \| "private"` | Order differs |
| `features/chat/components/visibility-selector.tsx:28` | `type VisibilityType = "private" \| "public"` | Same as action |

**Recommendation:** Single source in `features/chat/types.ts`. Export from feature index.

---

### ArtifactKind

| Location | Definition | Differences |
|----------|------------|-------------|
| `features/artifact/types.ts:14` | `type ArtifactKind = "text" \| "code" \| "image" \| "sheet"` | Artifact feature |
| `features/chat/types.ts:139` | `type ArtifactKind = "text" \| "code" \| "image" \| "sheet"` | Chat feature |
| `features/chat/components/toolbar.tsx:330` | `type ArtifactKind = "text" \| "code" \| "image" \| "sheet"` | Inline in toolbar |
| `features/artifact/schemas/artifact.schema.ts:252` | `type ArtifactKind = z.infer<typeof ArtifactKindSchema>` | Schema-derived |
| `lib/ai/prompts.ts:206` | `type ArtifactKindForPrompt = "text" \| "code" \| "image" \| "sheet"` | Prompt-specific |

**Recommendation:** Single source in `features/artifact/types.ts`. All other locations should import. Rename `ArtifactKindForPrompt` to just import `ArtifactKind`.

---

### MessageVote

| Location | Definition | Differences |
|----------|------------|-------------|
| `components/ai/chat/message.tsx:29` | `interface MessageVote { isUpvoted?: boolean; isDownvoted?: boolean; }` | Message component |
| `components/ai/chat/conversation.tsx:29` | `interface MessageVote { isUpvoted?: boolean; isDownvoted?: boolean; }` | Identical |

**Recommendation:** Single source in `components/ai/chat/types.ts` or import from message.tsx.

---

### ErrorUserType

| Location | Definition | Differences |
|----------|------------|-------------|
| `lib/errors.ts:298` | `type ErrorUserType = "guest" \| "regular" \| "unknown"` | Errors module |
| `lib/errors/messages.ts:43` | `type ErrorUserType = "guest" \| "regular" \| "unknown"` | Identical |

**Recommendation:** Single source in `lib/errors.ts`. messages.ts should import.

---

## Function Duplications

### isValidUUID / isValidUuid

| Location | Implementation | Similarity |
|----------|----------------|------------|
| `lib/constants.ts:268` | `UUID_REGEX.test(value)` | 100% (regex-based) |
| `lib/api/validation.ts:452` | `uuidSchema.safeParse(value).success` | 95% (Zod-based) |
| `lib/utils/validation.ts:80` | `UUID_REGEX.test(uuid.trim())` | 100% (regex with trim) |

**Recommendation:** Consolidate to `lib/utils/validation.ts:isValidUuid()` (canonical). Export alias `isValidUUID` for compatibility. Remove from constants.ts and api/validation.ts.

---

### isValidEmail

| Location | Implementation | Similarity |
|----------|----------------|------------|
| `lib/utils/validation.ts:33` | `EMAIL_REGEX.test(email.trim())` | 100% (custom regex) |
| `lib/api/validation.ts:462` | `z.string().email().safeParse(value).success` | 90% (Zod-based) |

**Recommendation:** Use `lib/utils/validation.ts` as canonical. Zod version has different validation rules.

---

### isValidUrl

| Location | Implementation | Similarity |
|----------|----------------|------------|
| `lib/utils/validation.ts:54` | `new URL(url)` + protocol check | 100% (URL constructor) |
| `lib/api/validation.ts:472` | `z.string().url().safeParse(value).success` | 90% (Zod-based) |

**Recommendation:** Use `lib/utils/validation.ts` as canonical - includes protocol whitelist.

---

### getMessageByErrorCode

| Location | Implementation | Similarity |
|----------|----------------|------------|
| `lib/errors.ts:432` | Inline switch statement with guest overrides | 85% |
| `lib/errors/messages.ts:338` | Calls `getContextualErrorMessageSet()` | 100% (delegates) |

**Recommendation:** Keep only `lib/errors/messages.ts:getMessageByErrorCode()` as canonical. The version in `lib/errors.ts` duplicates logic.

---

### generateUUID

| Location | Implementation | Similarity |
|----------|----------------|------------|
| `lib/utils/uuid.ts:20` | `crypto.randomUUID()` | 100% (canonical) |
| `app/api/chat/route.ts:99` | `function generateUUID(): string { return crypto.randomUUID() }` | 100% (inline redefinition) |
| `features/chat/components/chat.tsx:86` | `function generateUUID(): string { return crypto.randomUUID() }` | 100% (inline redefinition) |

**Recommendation:** Remove inline redefinitions. Import from `lib/utils/uuid.ts`.

---

### useSettings

| Location | Implementation | Similarity |
|----------|----------------|------------|
| `features/settings/hooks/use-settings.ts:39` | Standalone hook with useState + server actions | Different (no context) |
| `features/settings/components/settings-provider.tsx:252` | Context-based hook using useContext | Different (requires provider) |

**Recommendation:** **CRITICAL CONFLICT** - Two hooks with same name but different behavior:
- `use-settings.ts:useSettings()` - standalone, uses server actions
- `settings-provider.tsx:useSettings()` - requires SettingsProvider context

Rename one to avoid confusion. Suggestion: `useAppPreferences()` for the standalone version.

---

## Component Duplications

### SettingsButton

| Location | LOC | Purpose |
|----------|-----|---------|
| `components/settings/settings-sheet.tsx` | 69 | Placeholder with "coming soon" |
| `features/settings/components/settings-sheet.tsx` | 336 | Full implementation with settings |

**Recommendation:** Remove `components/settings/settings-sheet.tsx`. Update imports to use `features/settings/components/settings-sheet.tsx`.

---

### SidebarToggle

| Location | LOC | Purpose |
|----------|-----|---------|
| `components/sidebar-toggle.tsx` | 45 | Uses `SidebarLeftIcon` from custom icons |
| `features/sidebar/components/sidebar-toggle.tsx` | 50 | Uses `PanelLeft` from lucide-react |

**Recommendation:** Consolidate to `components/sidebar-toggle.tsx` (uses custom icon). Remove `features/sidebar/components/sidebar-toggle.tsx`.

---

### useScrollToBottom

| Location | LOC | Similarity |
|----------|-----|------------|
| `hooks/use-scroll-to-bottom.tsx` | 179 | 100% identical |
| `features/chat/hooks/use-scroll-to-bottom.ts` | 185 | 100% identical |

**Recommendation:** Keep only `hooks/use-scroll-to-bottom.tsx`. Export from `features/chat/hooks/index.ts` as re-export.

---

## Pattern Duplications

### Rate Limit Response Pattern

Files affected:
- `app/api/files/upload/route.ts:40-43, 110-111`
- `app/api/chat/route.ts:587-590`
- `app/api/history/route.ts` (uses rateLimit helper)
- `app/api/artifacts/route.ts` (uses rateLimit helper)

Occurrences: 4+

Pattern:
```typescript
const rateLimitResult = await checkLimit(userId)
if (!rateLimitResult.success) {
  const retryAfter = getRetryAfter(rateLimitResult.reset)
  return rateLimit(retryAfter) // or throw RateLimitError
}
```

**Recommendation:** Create `lib/rate-limit/response-helpers.ts` with:
```typescript
export async function enforceRateLimit(
  limiter: RateLimiterName,
  identifier: string
): Promise<{ headers: Headers; error?: Response }> { ... }
```

---

### Auth Check Pattern

Files affected:
- `lib/auth/guards.ts` - multiple functions
- All API routes using `requireAuthAction()`, `optionalAuth()`, `requireNonGuest()`

Occurrences: 15+

Pattern:
```typescript
const session = await getSession()
const userId = await getUserId()
if (!userId) throw new UnauthorizedError(...)
```

**Recommendation:** Already centralized in `lib/auth/guards.ts`. Good pattern.

---

### Error Response Pattern

Files affected:
- `lib/api/response.ts` - centralized
- All API routes

Occurrences: 50+

Pattern:
```typescript
return error(err)
return success(data)
return notFound("Resource")
return rateLimit(retryAfter)
```

**Recommendation:** Already centralized in `lib/api/response.ts`. Good pattern.

---

## Summary Statistics

| Category | Count | LOC Savings |
|----------|-------|-------------|
| Type Duplications | 8 | ~80 LOC |
| Function Duplications | 6 | ~60 LOC |
| Component Duplications | 3 | ~230 LOC |
| Pattern Duplications | 3 | N/A (architectural) |

**Total duplications found:** 20
**Estimated LOC savings if consolidated:** ~370 LOC

---

## Priority Order for Consolidation

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| 1 | `useSettings` naming conflict | HIGH - Runtime confusion | Low |
| 2 | `SettingsButton` placeholder removal | HIGH - UI consistency | Low |
| 3 | `isValidUUID` consolidation | MEDIUM - Import confusion | Low |
| 4 | `ArtifactKind` consolidation | MEDIUM - Type safety | Medium |
| 5 | `PaginationParams` extension | MEDIUM - API clarity | Low |
| 6 | `SidebarToggle` consolidation | LOW - Icon consistency | Low |
| 7 | `useScrollToBottom` consolidation | LOW - Dead code | Low |
| 8 | `generateUUID` inline removals | LOW - Performance | Low |

---

## Detailed Findings

### Critical: useSettings Naming Conflict

Two completely different implementations share the same name:

**`features/settings/hooks/use-settings.ts:39`**
```typescript
export function useSettings(): SettingsContextValue {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  // Uses server actions, no context required
}
```

**`features/settings/components/settings-provider.tsx:252`**
```typescript
export function useSettings(): SettingsStore {
  const context = useContext(SettingsContext)
  if (!context) throw new ValidationError("useSettings must be used within a SettingsProvider")
  return context
}
```

**Impact:** Consumers may import the wrong hook. Both are exported from `features/settings/index.ts`.

**Solution:** Rename `hooks/use-settings.ts:useSettings()` to `useUserPreferences()` or `useAppPreferences()`.

---

### Critical: SettingsButton Placeholder

`components/settings/settings-sheet.tsx` is a non-functional placeholder:
```tsx
<div className="flex flex-1 items-center justify-center text-muted-foreground">
  <p className="text-sm">Settings configuration coming soon...</p>
</div>
```

`features/settings/components/settings-sheet.tsx` has full implementation with temperature, topP, maxOutputTokens, systemPrompt, toggles.

**Solution:** Delete placeholder, update imports in `features/chat/components/chat-header.tsx:15`.

---

### High: Validation Function Spread

Three locations export `isValidUUID`:
- `lib/constants.ts` - used by archive
- `lib/api/validation.ts` - uses Zod
- `lib/utils/validation.ts` - uses regex

`lib/api/index.ts:72` re-exports from validation.ts, making it the primary export.

**Solution:**
1. Remove `isValidUUID` from `lib/constants.ts`
2. Remove `isValidUUID`, `isValidEmail`, `isValidUrl` from `lib/api/validation.ts`
3. Use `lib/utils/validation.ts` as single source
4. Re-export from `lib/api/index.ts` for backward compatibility
