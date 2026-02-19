# Pattern Consistency: Hooks & Utilities

This document analyzes naming conventions, code patterns, and structural consistency across hooks, utilities, types, errors, and cache modules.

## Executive Summary

| Category | Consistency Score | Issues Found | Status |
|----------|-------------------|--------------|--------|
| **Hooks** | 9/10 | Minor naming variations | ✅ Good |
| **Utilities** | 8/10 | Some inconsistent exports | ⚠️ Needs Work |
| **Types** | 7/10 | Mixed type definition styles | ⚠️ Needs Work |
| **Errors** | 9/10 | Well-structured hierarchy | ✅ Good |
| **Cache** | 8/10 | Some naming inconsistencies | ⚠️ Needs Work |

---

## Hooks Pattern Analysis

### Naming Convention Analysis

| Pattern | Convention | Examples | Compliance |
|---------|------------|----------|------------|
| Hook names | `use[Feature]` | `useDebounce`, `useLocalStorage`, `useMediaQuery` | ✅ 100% |
| Return types | Named interface | `UseScrollToBottomReturn`, `UseWindowSizeReturn` | ⚠️ 60% |
| Options types | `Use[Hook]Options` | `UseDebounceOptions`, `UseLocalStorageOptions` | ✅ 100% |
| Boolean hooks | `useIs[Condition]` | `useIsMobile`, `useIsSm`, `useIsMd` | ✅ 100% |

### Return Type Consistency

**Issue:** Inconsistent return type naming:

```typescript
// Good: Named return type
export type UseScrollToBottomReturn = {
    containerRef: React.RefObject<HTMLDivElement | null>;
    endRef: React.RefObject<HTMLDivElement | null>;
    isAtBottom: boolean;
    scrollToBottom: (behavior?: ScrollBehavior) => void;
    onViewportEnter: () => void;
    onViewportLeave: () => void;
};

// Missing: Anonymous return type
export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    options: UseLocalStorageOptions<T> = {},
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // Returns tuple instead of named object
}
```

**Recommendation:** Use named return types for complex returns:

```typescript
// Preferred
export interface UseLocalStorageReturn<T> {
    value: T;
    setValue: (value: T | ((prev: T) => T)) => void;
    removeValue: () => void;
}

export function useLocalStorage<T>(
    key: string,
    initialValue: T,
    options?: UseLocalStorageOptions<T>,
): UseLocalStorageReturn<T>;
```

### Hook File Structure Pattern

**Current Structure (Consistent):**
```
hooks/
├── index.ts              # Barrel export
├── use-debounce.ts       # useDebounce + useDebouncedCallback
├── use-local-storage.ts  # useLocalStorage
├── use-media-query.ts    # useMediaQuery + 10 breakpoint hooks
├── use-mobile.ts         # useIsMobile + useDeviceType
├── use-scroll-to-bottom.tsx  # useScrollToBottom
├── use-chat-visibility.ts    # useChatVisibility
└── use-window-size.ts    # useWindowSize + useWindowWidth + useWindowHeight
```

**Pattern Compliance:**
- ✅ One primary hook per file
- ✅ Related hooks grouped (e.g., breakpoint hooks in use-media-query.ts)
- ✅ Barrel export in index.ts
- ⚠️ `.tsx` extension for `use-scroll-to-bottom.tsx` (contains JSX), but others are `.ts`

### Hook Implementation Patterns

#### Pattern 1: SSR-Safe Initialization

```typescript
// Consistent pattern across hooks
const isBrowser = typeof window !== "undefined";

const [state, setState] = useState<T>(() => {
    if (initializeWithValue) {
        return getStoredValue();
    }
    return initialValue;
});
```

**Compliance:** Used in `useLocalStorage`, `useMediaQuery`, `useWindowSize` ✅

#### Pattern 2: Event Listener Cleanup

```typescript
// Consistent cleanup pattern
useEffect(() => {
    const handler = () => { /* ... */ };
    window.addEventListener("event", handler);
    return () => window.removeEventListener("event", handler);
}, [dependencies]);
```

**Compliance:** Used consistently across all event-based hooks ✅

#### Pattern 3: Ref for Mutable Values

```typescript
// Consistent ref pattern for timers, controllers
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const cancel = useCallback(() => {
    if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
    }
}, []);
```

**Compliance:** Used in `useDebounce`, `useDebouncedCallback`, `useScrollToBottom` ✅

---

## Utilities Pattern Analysis

### File Naming Convention

| Pattern | Convention | Examples | Status |
|---------|------------|----------|--------|
| Utility files | `kebab-case.ts` | `file-validation.ts`, `date.ts` | ✅ |
| Test files | `*.test.ts` | `cn.test.ts`, `format.test.ts` | ✅ |
| React utilities | `*.tsx` | `lazy.tsx` | ✅ |

### Function Naming Patterns

| Pattern | Convention | Examples | Compliance |
|---------|------------|----------|------------|
| Boolean validators | `is[Condition]` | `isToday`, `isValidEmail`, `isPrivateIP` | ✅ 100% |
| Getters | `get[Thing]` | `getDocumentTimestampByIndex`, `getSafeRedirectUrl` | ✅ 100% |
| Validators | `validate[Thing]` | `validateFile`, `validateFileType`, `validateFileSize` | ✅ 100% |
| Formatters | `format[Thing]` | `formatDate`, `formatFileSize`, `formatDuration` | ✅ 100% |
| Sanitizers | `sanitize[Thing]` | `sanitizeFilename`, `sanitizeHtml`, `sanitizeText` | ✅ 100% |
| Creators | `create[Thing]` | `createPreloader`, `createLogger` | ✅ 100% |

### Export Pattern Analysis

**Issue:** Inconsistent export styles across utility files:

```typescript
// Style 1: Named exports (most common)
export function cn(...inputs: ClassValue[]): string { /* ... */ }

// Style 2: Const + export
export const logger = new Logger();

// Style 3: Factory function
export function createLogger(options?: LoggerOptions): Logger { /* ... */ }
```

**Recommendation:** Standardize on named function exports:

```typescript
// Preferred for utilities
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string { /* ... */ }

// For singletons, use const
export const logger: Logger = new Logger();

// For factories, use function
export function createLogger(options?: LoggerOptions): Logger { /* ... */ }
```

### JSDoc Pattern Consistency

**Good Example:**
```typescript
/**
 * Validates if a string is a valid email address.
 * Uses a practical regex pattern that covers most common email formats.
 *
 * @param email - The email string to validate
 * @returns True if the email is valid, false otherwise
 *
 * @example
 * ```ts
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 * ```
 */
export function isValidEmail(email: string): boolean { /* ... */ }
```

**Compliance:** Most utilities have JSDoc, but quality varies ⚠️

---

## Types Pattern Analysis

### Type Definition Styles

**Issue:** Mixed type definition approaches:

```typescript
// Style 1: Interface (used for entities)
export interface UserEntity extends DatabaseEntity {
    email: string;
    passwordHash: string | null;
    lastLogin: Date | null;
}

// Style 2: Type alias (used for unions, utilities)
export type Maybe<T> = T | null | undefined;

// Style 3: Zod inference (used for message parts)
export type TextPart = z.infer<typeof textPartSchema>;

// Style 4: const assertion (used for error codes)
export const ErrorCodes = {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    // ...
} as const;
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

**Recommendation:** Document when to use each style:

| Style | Use Case | Example |
|-------|----------|---------|
| `interface` | Object shapes, entities | `UserEntity`, `ApiResponse<T>` |
| `type` | Unions, utilities, mappings | `Maybe<T>`, `AsyncResult<T, E>` |
| `z.infer` | Runtime-validated types | `TextPart`, `MessagePart` |
| `as const` | String literal unions | `ErrorCode`, `PostgresErrorCode` |

### Type Export Organization

**Current Structure:**
```typescript
// lib/types/index.ts
export interface ApiResponse<T> { /* ... */ }
export interface PaginatedResponse<T> extends ApiResponse<T[]> { /* ... */ }
export interface ApiError { /* ... */ }
// ... many more interfaces

// lib/types/message-parts.ts
export const textPartSchema = z.object({ /* ... */ });
export type TextPart = z.infer<typeof textPartSchema>;
// ... 16 more schemas and types
```

**Issue:** Large files with mixed concerns.

**Recommendation:** Organize by domain:

```typescript
// lib/types/
// ├── api.ts          (ApiResponse, PaginatedResponse, ApiError)
// ├── entities.ts     (UserEntity, ChatEntity, MessageEntity)
// ├── environment.ts  (EnvConfig, RequiredEnvVars)
// ├── utilities.ts    (Maybe, AsyncResult, DeepPartial)
// └── index.ts        (barrel export)
```

### Type Guard Pattern

**Consistent Pattern:**
```typescript
export function isTextPart(part: MessagePart): part is TextPart {
    return part.type === "text";
}
```

**Issue:** Repetitive - 16 nearly identical type guards.

**Recommendation:** Generic type guard:

```typescript
export function isPartOfType<T extends MessagePart['type']>(
    part: MessagePart,
    type: T,
): part is Extract<MessagePart, { type: T }> {
    return part.type === type;
}

// Usage
if (isPartOfType(part, 'text')) {
    // part is TextPart
}
```

---

## Errors Pattern Analysis

### Error Class Hierarchy

**Consistent Pattern:**
```typescript
// Base class
export class AppError extends Error {
    constructor(
        public readonly code: ErrorCode,
        message: string,
        public readonly statusCode: number = 400,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "AppError";
    }
}

// Derived classes
export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(ErrorCodes.VALIDATION_ERROR, message, 400, details);
        this.name = "ValidationError";
    }
}
```

**Compliance:** All error classes follow this pattern ✅

### Error Code Naming Convention

| Category | Pattern | Examples |
|----------|---------|----------|
| Validation | `SCREAMING_SNAKE_CASE` | `VALIDATION_ERROR`, `INVALID_INPUT` |
| Auth | `SCREAMING_SNAKE_CASE` | `UNAUTHORIZED`, `SESSION_EXPIRED` |
| Not Found | `ENTITY_NOT_FOUND` | `CHAT_NOT_FOUND`, `USER_NOT_FOUND` |
| Server | `SCREAMING_SNAKE_CASE` | `INTERNAL_ERROR`, `DATABASE_ERROR` |

**Compliance:** Consistent across all error codes ✅

### Error Message Structure

**Consistent Pattern:**
```typescript
export interface ErrorMessageSet {
    title: string;      // Short, user-friendly
    message: string;    // Detailed description
    action: string | null;  // Suggested action
}

// Example
[ErrorCodes.SESSION_EXPIRED]: {
    title: "Session Expired",
    message: "Your session has expired. Please sign in again.",
    action: "Sign in again to continue.",
},
```

**Compliance:** All error messages follow this structure ✅

---

## Cache Pattern Analysis

### Function Naming Patterns

| Pattern | Convention | Examples | Compliance |
|---------|------------|----------|------------|
| Getters | `get[Thing]` | `getRedisClient`, `getOrSet` | ✅ |
| Checkers | `is[Condition]` | `isRedisAvailable`, `isCircuitOpen` | ✅ |
| Actions | `[verb][Noun]` | `recordCacheSuccess`, `resetCircuitBreaker` | ✅ |
| Invalidators | `invalidate[Entity]` | `invalidateChat`, `invalidateUser` | ✅ |

### Key Generator Pattern

**Current Pattern:**
```typescript
export function chatKey(chatId: string, userId: string): string {
    return `${CACHE_KEY_PREFIX}chat:${chatId}:${userId}`;
}

export function chatMetaKey(chatId: string, userId: string): string {
    return `${CACHE_KEY_PREFIX}chat:${chatId}:${userId}:meta`;
}
```

**Issue:** Inconsistent naming - `chatKey` vs `chatMetaKey` vs `chatMessagesKey`.

**Recommendation:** Use object-based key generators:

```typescript
export const CacheKeys = {
    chat: {
        base: (chatId: string, userId: string) => `chat:${chatId}:${userId}`,
        meta: (chatId: string, userId: string) => `chat:${chatId}:${userId}:meta`,
        messages: (chatId: string, userId: string) => `chat:${chatId}:${userId}:msgs`,
    },
    user: {
        chats: (userId: string) => `user:${userId}:chats`,
        base: (userId: string) => `user:${userId}`,
    },
};
```

### Cache Strategy Pattern

**Consistent Return Type:**
```typescript
export interface CacheResult<T> {
    value: T;
    fromCache: boolean;
    cacheAvailable: boolean;
}

export interface TieredCacheResult<T> {
    value: T | undefined;
    source: "l1" | "l2" | "miss";
    found: boolean;
}
```

**Issue:** Two different result types for similar operations.

**Recommendation:** Unify result types:

```typescript
export interface CacheResult<T> {
    value: T | undefined;
    source: "l1" | "l2" | "miss" | "source";
    found: boolean;
    cacheAvailable: boolean;
}
```

---

## Cross-Module Pattern Consistency

### Import Patterns

**Issue:** Inconsistent import styles:

```typescript
// Style 1: Direct import
import { AppError } from "@/lib/errors";

// Style 2: Barrel import
import { cn, formatDate } from "@/lib/utils";

// Style 3: Type-only import
import type { MessagePart } from "@/lib/types/message-parts";
```

**Recommendation:** Standardize:

```typescript
// Use barrel imports for commonly used items
import { cn, formatDate, isValidEmail } from "@/lib/utils";

// Use type-only imports for types
import type { ApiResponse, ChatEntity } from "@/lib/types";

// Use direct imports for single items
import { AppError } from "@/lib/errors";
```

### Error Handling Pattern

**Consistent Pattern:**
```typescript
try {
    // Operation
} catch (error: unknown) {
    if (isAppError(error)) {
        throw error;  // Re-throw AppError
    }
    throw new InternalServerError("Operation failed");
}
```

**Compliance:** Used consistently across modules ✅

### Async Function Pattern

**Issue:** Mixed async return styles:

```typescript
// Style 1: Promise<T>
export async function fetcher<T>(url: string): Promise<T> { /* ... */ }

// Style 2: AsyncResult<T>
export type AsyncResult<T, E = ApiError> =
    | { success: true; data: T }
    | { success: false; error: E };
```

**Recommendation:** Use `AsyncResult` for business logic, `Promise<T>` for simple operations:

```typescript
// Simple operations: Promise<T>
export async function getRedisClient(): Promise<Redis | null> { /* ... */ }

// Business logic: AsyncResult<T>
export async function createChat(data: CreateChatInput): Promise<AsyncResult<ChatEntity>> {
    try {
        const chat = await db.insert(chats).values(data).returning();
        return { success: true, data: chat[0] };
    } catch (error) {
        return { success: false, error: fromUnknownError(error) };
    }
}
```

---

## Pattern Violations Summary

### Critical Issues

| Issue | Location | Impact | Fix Priority |
|-------|----------|--------|--------------|
| Mixed return types | `useLocalStorage` | API confusion | High |
| Duplicate type guards | `message-parts.ts` | Maintenance burden | Medium |
| Inconsistent key generators | `cache/keys.ts` | Discoverability | Medium |

### Minor Issues

| Issue | Location | Impact | Fix Priority |
|-------|----------|--------|--------------|
| Missing named return types | Several hooks | Documentation | Low |
| Mixed import styles | All modules | Consistency | Low |
| Large type files | `types/index.ts` | Organization | Low |

---

## Recommended Standards

### Hook Standards

```typescript
// 1. File naming: use-[feature].ts
// 2. Export naming: use[Feature]
// 3. Options type: Use[Feature]Options
// 4. Return type: Use[Feature]Return (for objects)
// 5. Always include JSDoc with @example

/**
 * Hook description.
 *
 * @param param - Parameter description
 * @returns Return value description
 *
 * @example
 * ```tsx
 * const result = useFeature();
 * ```
 */
export function useFeature(
    param: string,
    options?: UseFeatureOptions,
): UseFeatureReturn {
    // Implementation
}
```

### Utility Standards

```typescript
// 1. File naming: kebab-case.ts
// 2. Function naming: verbNoun or isCondition
// 3. Export: Named function exports
// 4. JSDoc with @param, @returns, @example

/**
 * Function description.
 *
 * @param input - Input description
 * @returns Output description
 *
 * @example
 * ```ts
 * const result = doSomething('input');
 * ```
 */
export function doSomething(input: string): string {
    // Implementation
}
```

### Type Standards

```typescript
// 1. Use interface for object shapes
// 2. Use type for unions, utilities
// 3. Use z.infer for validated types
// 4. Use as const for literal unions

// Entity: interface
export interface UserEntity {
    id: string;
    email: string;
}

// Utility: type
export type Maybe<T> = T | null | undefined;

// Validated: z.infer
export type TextPart = z.infer<typeof textPartSchema>;

// Literals: as const
export const Status = {
    Active: 'active',
    Inactive: 'inactive',
} as const;
export type Status = typeof Status[keyof typeof Status];
```

### Error Standards

```typescript
// 1. Extend AppError
// 2. Set name property
// 3. Use ErrorCodes constant
// 4. Include user-friendly message

export class CustomError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(ErrorCodes.CUSTOM_ERROR, message, 400, details);
        this.name = "CustomError";
    }
}
```

### Cache Standards

```typescript
// 1. Use CacheResult<T> for return types
// 2. Use invalidate[Entity] for invalidation
// 3. Use is[Condition] for checks
// 4. Use get[Thing] for getters

export async function getFromCache<T>(key: string): Promise<CacheResult<T>> {
    // Implementation
}

export async function invalidateChat(chatId: string): Promise<InvalidationResult> {
    // Implementation
}