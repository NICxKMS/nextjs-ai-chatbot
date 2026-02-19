# Simplification Opportunities: Hooks & Utilities

This document identifies opportunities to simplify hooks, utilities, types, errors, and cache code through consolidation, deduplication, and removal of over-engineering.

## Summary of Findings

| Category | Opportunities | Impact | Priority |
|----------|---------------|--------|----------|
| **Hooks** | 4 | Medium | High |
| **Utilities** | 5 | Medium | Medium |
| **Types** | 3 | Low | Low |
| **Errors** | 2 | Low | Low |
| **Cache** | 4 | High | High |

---

## Hooks Simplification

### 1. Duplicate Responsive Hook Patterns

**Issue:** Three hooks provide overlapping responsive functionality:
- [`useIsMobile()`](../../hooks/use-mobile.ts) - Returns `boolean | undefined`
- [`useDeviceType()`](../../hooks/use-mobile.ts) - Returns `{ isMobile, isTablet, isDesktop, isReady }`
- [`useWindowSize()`](../../hooks/use-window-size.ts) - Returns `{ width, height, isMobile, isTablet, isDesktop, isReady }`

**Current Usage Pattern:**
```typescript
// Different components use different hooks for same purpose
const isMobile = useIsMobile();           // Component A
const { isMobile } = useDeviceType();    // Component B
const { isMobile } = useWindowSize();    // Component C
```

**Recommendation:** Consolidate into single `useViewport()` hook:

```typescript
// Proposed: hooks/use-viewport.ts
export function useViewport() {
  const { width, height, isReady } = useWindowSize();
  
  return {
    width,
    height,
    isReady,
    isMobile: isReady && width < 768,
    isTablet: isReady && width >= 768 && width < 1024,
    isDesktop: isReady && width >= 1024,
  };
}

// Deprecate:
// - useIsMobile (use useViewport().isMobile)
// - useDeviceType (use useViewport())
```

**Impact:** Reduces 3 hooks to 1, eliminates ~100 lines of duplicate code.

---

### 2. Media Query Hook Redundancy

**Issue:** [`useMediaQuery`](../../hooks/use-media-query.ts) exports 10 breakpoint hooks, but many are unused.

**Analysis:**
```typescript
// All breakpoint hooks
useIsXs()    // < 640px - RARELY USED
useIsSm()    // ≥ 640px - USED
useIsMd()    // ≥ 768px - USED
useIsLg()    // ≥ 1024px - USED
useIsXl()    // ≥ 1280px - RARELY USED
useIs2Xl()   // ≥ 1536px - RARELY USED
```

**Recommendation:** Keep core breakpoints, document usage:

```typescript
// Keep: useIsSm, useIsMd, useIsLg (aligned with Tailwind)
// Deprecate: useIsXs, useIsXl, useIs2Xl (can use useMediaQuery directly)
// Keep: usePrefersReducedMotion, usePrefersDarkMode (accessibility)
// Keep: useHasHover, useIsPortrait (feature detection)
```

---

### 3. useScrollToBottom Complexity

**Issue:** [`useScrollToBottom`](../../hooks/use-scroll-to-bottom.tsx) uses SWR for scroll behavior state, which is over-engineered.

**Current Implementation:**
```typescript
const { data: scrollBehavior = false, mutate: setScrollBehavior } =
    useSWR<ScrollFlag>("messages:should-scroll", null, {
        fallbackData: false,
    });
```

**Problem:** SWR is designed for server state synchronization, not local UI state.

**Recommendation:** Use simple useState:

```typescript
// Simplified
const [scrollBehavior, setScrollBehavior] = useState<ScrollBehavior | false>(false);

const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (containerRef.current) {
        containerRef.current.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior,
        });
    }
}, []);
```

**Impact:** Removes unnecessary SWR dependency, simplifies mental model.

---

### 4. useWindowWidth/useWindowHeight Duplication

**Issue:** [`useWindowWidth`](../../hooks/use-window-size.ts:110) and [`useWindowHeight`](../../hooks/use-window-size.ts:140) duplicate logic from [`useWindowSize`](../../hooks/use-window-size.ts:64).

**Current Code:**
```typescript
// useWindowWidth - 20 lines
export function useWindowWidth(): { width: number; isReady: boolean } {
    const [width, setWidth] = useState(0);
    const [isReady, setIsReady] = useState(false);
    useEffect(() => { /* resize handler */ }, []);
    return { width, isReady };
}

// useWindowHeight - 20 lines (nearly identical)
export function useWindowHeight(): { height: number; isReady: boolean } {
    const [height, setHeight] = useState(0);
    const [isReady, setIsReady] = useState(false);
    useEffect(() => { /* resize handler */ }, []);
    return { height, isReady };
}
```

**Recommendation:** Derive from useWindowSize:

```typescript
export function useWindowWidth() {
    const { width, isReady } = useWindowSize();
    return { width, isReady };
}

export function useWindowHeight() {
    const { height, isReady } = useWindowSize();
    return { height, isReady };
}
```

**Impact:** Reduces code by ~30 lines, single source of truth.

---

## Utilities Simplification

### 1. File Validation Over-Engineering

**Issue:** [`file-validation.ts`](../../lib/utils/file-validation.ts) is 500+ lines with extensive magic byte validation that may never be used.

**Analysis:**
```typescript
// Current: 500+ lines including:
// - 15+ MIME type constants
// - Magic byte validation for each type
// - Image dimension validation
// - Filename sanitization
// - Multiple validation result types
```

**Recommendation:** Split into focused modules:

```typescript
// lib/utils/file-validation/
// ├── constants.ts      (MIME types, limits)
// ├── mime-check.ts     (simple MIME validation)
// ├── sanitize.ts       (filename sanitization)
// └── index.ts          (barrel export)

// Move image dimension validation to separate utility:
// lib/utils/image.ts - validateImageDimensions()
```

**Impact:** Better tree-shaking, easier testing, clearer purpose.

---

### 2. Network Utility Complexity

**Issue:** [`network.ts`](../../lib/utils/network.ts) has 400 lines for IP extraction with extensive proxy handling.

**Current Complexity:**
```typescript
// Handles 5 different headers:
// - CF-Connecting-IP (Cloudflare)
// - X-Vercel-Forwarded-For
// - X-Forwarded-For
// - X-Real-IP
// - Fallback

// Plus:
// - IPv4/IPv6 validation
// - Loopback detection
// - Private IP detection
// - Proxy chain parsing
```

**Recommendation:** Simplify for actual deployment target:

```typescript
// If only deploying on Vercel:
export function getClientIp(request: Request): string {
    // Vercel provides this reliably
    return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
        ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        ?? "unknown";
}

// Keep full version for self-hosted deployments
// as getSecureClientIp()
```

---

### 3. Logger Over-Abstraction

**Issue:** [`logger.ts`](../../lib/utils/logger.ts) creates a Logger class with child loggers, but simple functions would suffice.

**Current:**
```typescript
class Logger {
    private context: LogContext
    private prefix: string
    
    child(options: LoggerOptions = {}): Logger { /* ... */ }
    debug(message: string, context?: LogContext): void { /* ... */ }
    info(message: string, context?: LogContext): void { /* ... */ }
    warn(message: string, context?: LogContext): void { /* ... */ }
    error(message: string, error?: Error, context?: LogContext): void { /* ... */ }
}

export const logger = new Logger();
export function createLogger(options?: LoggerOptions): Logger { /* ... */ }
```

**Recommendation:** Simplify to functional approach:

```typescript
// Simpler functional logger
function log(level: LogLevel, message: string, context?: LogContext) {
    if (level === 'debug' && process.env.NODE_ENV !== 'development') return;
    
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    console[level](`[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`);
}

export const logger = {
    debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
    info: (msg: string, ctx?: LogContext) => log('info', msg, ctx),
    warn: (msg: string, ctx?: LogContext) => log('warn', msg, ctx),
    error: (msg: string, err?: Error, ctx?: LogContext) => 
        log('error', msg, { ...ctx, error: err?.message, stack: err?.stack }),
};
```

---

### 4. Duplicate Date Utilities

**Issue:** [`date.ts`](../../lib/utils/date.ts) reimplements common date operations.

**Current:**
```typescript
export function isToday(date: Date): boolean { /* custom impl */ }
export function isYesterday(date: Date): boolean { /* custom impl */ }
export function startOfDay(date: Date): Date { /* custom impl */ }
export function endOfDay(date: Date): Date { /* custom impl */ }
export function addDays(date: Date, days: number): Date { /* custom impl */ }
export function differenceInDays(dateA: Date, dateB: Date): number { /* custom impl */ }
```

**Recommendation:** Consider using `date-fns` or keep minimal:

```typescript
// If keeping custom (current approach is fine for 6 functions)
// Add JSDoc references to date-fns equivalents for future migration

// If using date-fns:
export { isToday, isYesterday, startOfDay, endOfDay, addDays, differenceInDays } from 'date-fns';
```

**Note:** Current implementation is acceptable - only ~125 lines total.

---

### 5. Validation Function Consolidation

**Issue:** [`validation.ts`](../../lib/utils/validation.ts) has separate functions for URL validation that could be consolidated.

**Current:**
```typescript
export function isValidUrl(url: string): boolean { /* ... */ }
export function isValidRedirectUrl(redirectUrl: string, allowedOrigin?: string): boolean {
    return getSafeRedirectUrl(redirectUrl, allowedOrigin) !== "/";
}
export function getSafeRedirectUrl(redirectUrl: string, allowedOrigin?: string): string { /* ... */ }
```

**Recommendation:** Consolidate:

```typescript
export function getSafeRedirectUrl(url: string, allowedOrigin?: string): string {
    // Returns "/" for invalid, otherwise returns safe URL
}

// Derive boolean check:
export function isValidRedirectUrl(url: string, allowedOrigin?: string): boolean {
    return getSafeRedirectUrl(url, allowedOrigin) !== "/";
}
```

This is already the pattern - no change needed.

---

## Types Simplification

### 1. Message Parts Type Explosion

**Issue:** [`message-parts.ts`](../../lib/types/message-parts.ts) has 16 different part types with 16 type guards.

**Current:**
```typescript
// 16 schemas, 16 types, 16 type guards = 48 exports
export const textPartSchema = z.object({ /* ... */ });
export type TextPart = z.infer<typeof textPartSchema>;
export function isTextPart(part: MessagePart): part is TextPart { /* ... */ }
// ... repeated 16 times
```

**Recommendation:** Generate type guards from schema:

```typescript
// Use zod's built-in type narrowing
export function isPartType<T extends MessagePart['type']>(
    part: MessagePart, 
    type: T
): part is Extract<MessagePart, { type: T }> {
    return part.type === type;
}

// Usage:
if (isPartType(part, 'text')) {
    // part is TextPart
}
```

**Impact:** Reduces from 16 type guard functions to 1 generic function.

---

### 2. Entity Type Duplication

**Issue:** [`lib/types/index.ts`](../../lib/types/index.ts) defines entity types that duplicate Drizzle schema types.

**Current:**
```typescript
// lib/types/index.ts
export interface ChatEntity extends DatabaseEntity {
    title: string;
    userId: string;
    visibility: "public" | "private";
    lastContext: unknown | null;
}

// lib/db/schema.ts
export const chats = pgTable("chats", {
    // ... same fields
});
```

**Recommendation:** Derive types from schema:

```typescript
// lib/types/index.ts
import type { chats, users, messages, artifacts } from "@/lib/db/schema";

export type ChatEntity = typeof chats.$inferSelect;
export type UserEntity = typeof users.$inferSelect;
export type MessageEntity = typeof messages.$inferSelect;
export type ArtifactEntity = typeof artifacts.$inferSelect;
```

**Impact:** Single source of truth, automatic type updates.

---

### 3. Utility Type Redundancy

**Issue:** Custom utility types that exist in TypeScript.

**Current:**
```typescript
export type Maybe<T> = T | null | undefined;  // NonNullable<T> inverse
export type DeepPartial<T> = ...;              // Common utility
export type PartialBy<T, K> = Omit<T, K> & Partial<Pick<T, K>>;  // Common
export type RequiredBy<T, K> = Omit<T, K> & Required<Pick<T, K>>;  // Common
```

**Recommendation:** Use TypeScript 4.7+ built-in utilities or library:

```typescript
// Use Partial<T> for optional properties
// Use Required<T> for required properties
// For DeepPartial, consider ts-toolbelt or type-fest

// Keep only truly custom types:
export type AsyncResult<T, E = ApiError> =
    | { success: true; data: T }
    | { success: false; error: E };
```

---

## Errors Simplification

### 1. Legacy Error Code Mapping Complexity

**Issue:** [`chat-sdk-compat.ts`](../../lib/errors/chat-sdk-compat.ts) maintains bidirectional mapping between old and new error codes.

**Current:**
```typescript
// ~200 lines of mapping tables
export const LegacyToNewCodeMap: Record<string, string> = { /* 100+ entries */ };
export const NewToLegacyCodeMap: Record<string, LegacyErrorCode> = { /* reverse */ };
```

**Recommendation:** Generate reverse mapping:

```typescript
// Keep only forward mapping
export const LegacyToNewCodeMap = { /* ... */ } as const;

// Generate reverse at build time or with type inference
type NewCode = typeof LegacyToNewCodeMap[keyof typeof LegacyToNewCodeMap];
```

**Note:** This is a compatibility layer - consider deprecation timeline.

---

### 2. Error Message Redundancy

**Issue:** [`messages.ts`](../../lib/errors/messages.ts) has i18n structure but only English is implemented.

**Current:**
```typescript
export const errorMessages: Record<SupportedLocale, LocaleMessages> = {
    en: { /* messages */ },
    // No other locales
};
```

**Recommendation:** Simplify until i18n is needed:

```typescript
// Current structure is fine for future expansion
// Add comment documenting i18n intent
// Consider lazy-loading locale messages when implemented
```

---

## Cache Simplification

### 1. Multiple Cache Strategy Functions

**Issue:** [`strategies.ts`](../../lib/cache/strategies.ts) implements 5 caching patterns, but most are unused.

**Current:**
```typescript
export async function cacheAside<T>(/* ... */): Promise<CacheResult<T>> { /* ... */ }
export async function cacheThrough<T>(/* ... */): Promise<CacheResult<T>> { /* ... */ }
export async function writeThrough<T>(/* ... */): Promise<T> { /* ... */ }
export async function writeBehind<T>(/* ... */): Promise<T> { /* ... */ }
export async function getOrSet<T>(/* ... */): Promise<CacheResult<T>> { /* ... */ }
```

**Analysis:**
- `getOrSet` - Most commonly used (cache-aside pattern)
- `cacheAside` - Same as getOrSet with different signature
- `cacheThrough`, `writeThrough`, `writeBehind` - Rarely used

**Recommendation:** Consolidate to primary patterns:

```typescript
// Keep: getOrSet (read-through/cache-aside)
// Keep: invalidate (invalidation)
// Deprecate: cacheAside (use getOrSet)
// Keep: writeThrough (if used for writes)
// Remove: writeBehind (complexity without clear benefit)
```

---

### 2. Tiered Cache Complexity

**Issue:** [`tiered-cache.ts`](../../lib/cache/tiered-cache.ts) implements full L1+L2 caching but may be overkill for the use case.

**Current:**
```typescript
export class TieredCache<T = unknown> {
    private readonly l1: LRUCache<T>;
    private readonly l1Ttl: number;
    private readonly l2Ttl: number;
    // ~200 lines of logic
}
```

**Recommendation:** Evaluate actual usage:

```typescript
// If L1 hit rate is low (< 20%), consider removing L1 entirely
// If L2 is rarely available, simplify to memory-only cache

// Add metrics to track:
interface TieredCacheStats {
    l1Hits: number;
    l2Hits: number;
    misses: number;
    l1HitRate: number;  // Track this
}
```

---

### 3. ZSET Operations Over-Exposure

**Issue:** [`zset.ts`](../../lib/cache/zset.ts) exposes low-level Redis ZSET operations that could be encapsulated.

**Current Exports:**
```typescript
export { zadd, zaddOne, zcard, zgetNewest, zgetOldest, zrange, 
         zrem, zremrangebyscore, zrevrange, zrevrangeWithScores, zscore };
```

**Recommendation:** Encapsulate behind domain operations:

```typescript
// Keep high-level operations:
export { addToChatList, getChatList, removeFromChatList };

// Move low-level to internal:
// zadd, zrange, zrem, etc. become internal implementation details
```

---

### 4. Cache Key Generator Verbosity

**Issue:** [`keys.ts`](../../lib/cache/keys.ts) has many key generators with similar patterns.

**Current:**
```typescript
export function chatKey(chatId: string, userId: string): string { /* ... */ }
export function chatMetaKey(chatId: string, userId: string): string { /* ... */ }
export function chatMessagesKey(chatId: string, userId: string): string { /* ... */ }
export function chatListKey(userId: string): string { /* ... */ }
export function userChatsKey(userId: string): string { /* ... */ }  // Same as chatListKey?
```

**Recommendation:** Consolidate:

```typescript
export const CacheKeys = {
    chat: (chatId: string, userId: string) => `chat:${chatId}:${userId}`,
    chatMeta: (chatId: string, userId: string) => `chat:${chatId}:${userId}:meta`,
    chatMessages: (chatId: string, userId: string) => `chat:${chatId}:${userId}:msgs`,
    userChats: (userId: string) => `user:${userId}:chats`,
    // Remove duplicates
};
```

---

## Prioritized Action Items

### High Priority (Do First)

1. **Consolidate responsive hooks** - Single `useViewport` hook
2. **Simplify useScrollToBottom** - Remove SWR for local state
3. **Split file-validation.ts** - Better organization
4. **Consolidate cache strategies** - Keep only used patterns

### Medium Priority

5. **Derive entity types from schema** - Single source of truth
6. **Generate type guards** - Reduce boilerplate
7. **Simplify logger** - Functional approach
8. **Encapsulate ZSET operations** - Domain-focused API

### Low Priority (Nice to Have)

9. **Deprecate unused breakpoint hooks** - Document usage
10. **Simplify network utilities** - Target deployment platform
11. **Consider date-fns** - If more date operations needed
12. **Plan legacy error code deprecation** - Timeline for removal

---

## Metrics for Success

| Metric | Current | Target |
|--------|---------|--------|
| Hook files | 7 | 5 |
| Total hook lines | ~800 | ~600 |
| file-validation.ts lines | 500+ | 200 (split) |
| Cache strategy functions | 5 | 2-3 |
| Type guard functions | 16 | 1 generic |
| Entity type definitions | 6 manual | 6 derived |