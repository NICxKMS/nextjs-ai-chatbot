# Scout Report - Shard 13: lib/utils

**Shard ID:** 13  
**Scope:** `lib/utils/**` (all utility files)  
**Scout Agent:** 13  
**Analysis Date:** 2026-02-19

---

## Metrics Summary

| Files in shard          | 16 |
| Total LOC               | 2,657 |
| Exports catalogued      | 56 |
| Cross-shard edges found | 114 |
| Issues flagged          | 8 |
| Critical complexity (>10)| 0 |

---

## File Inventory

### 1. lib/utils/index.ts
- **Size:** 97 LOC
- **Classification:** Entry point (barrel export)
- **Cyclomatic Complexity:** 1
- **Public Exports:** 
  - `cn` (from cn.ts)
  - `addDays`, `differenceInDays`, `endOfDay`, `isToday`, `isYesterday`, `startOfDay` (from date.ts)
  - `getDocumentTimestampByIndex` (from document.ts)
  - `fetcher`, `fetchWithErrorHandlers` (from fetcher.ts)
  - `ALLOWED_ATTACHMENT_TYPES`, `ALLOWED_MIME_TYPE_PREFIXES`, `ALLOWED_MIME_TYPES`, `ALLOWED_MIME_TYPES_SET`, `ATTACHMENT_MAX_FILE_SIZE`, `DEFAULT_MAX_FILE_SIZE`, `MAX_ATTACHMENT_SIZE`, `MAX_IMAGE_DIMENSION`, `validateAttachment`, `validateFile`, `validateFileSize`, `validateFileType`, `validateImageDimensions`, `validateMagicBytes`, `isValidMimeType`, `sanitizeFilename`, `getFileExtension` + types (from file-validation.ts)
  - `formatDate`, `formatDuration`, `formatFileSize`, `formatNumber`, `formatRelativeTime` (from format.ts)
  - `getMostRecentUserMessage`, `getTrailingMessageId` (from message.ts)
  - `getClientIpForRateLimit`, `getSecureClientIp`, `isLocalRequest`, `isLoopbackIP`, `isPrivateIP`, `isValidIP`, `isValidIPv4`, `isValidIPv6`, `normalizeIP` + types (from network.ts)
  - `capitalize`, `sanitizeHtml`, `sanitizeText`, `slugify`, `truncate` (from string.ts)
  - `generateUUID` (from uuid.ts)
  - `getSafeRedirectUrl`, `isValidEmail`, `isValidRedirectUrl`, `isValidUrl`, `isValidUuid` (from validation.ts)

### 2. lib/utils/cn.ts
- **Size:** 23 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 1
- **Imports:**
  - External: `clsx` (clsx), `twMerge` (tailwind-merge)
- **Public Exports:** `cn`
- **Cross-shard consumers:** 80+ files (most widely used utility)

### 3. lib/utils/date.ts
- **Size:** 126 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 2 (per function)
- **Imports:** None
- **Public Exports:** `isToday`, `isYesterday`, `startOfDay`, `endOfDay`, `addDays`, `differenceInDays`

### 4. lib/utils/document.ts
- **Size:** 32 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 3
- **Imports:**
  - Cross-shard: `Artifact` type from `@/lib/db/schema`
- **Public Exports:** `getDocumentTimestampByIndex`
- **Cross-shard consumers:** `components/version-footer.tsx`

### 5. lib/utils/fetcher.ts
- **Size:** 250 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 6
- **Imports:**
  - Cross-shard: `AppError`, `ErrorCode`, `ErrorCodes`, `isAppError`, `NotFoundError`, `ServiceUnavailableError` from `@/lib/errors`
- **Public Exports:** `fetcher`, `fetchWithErrorHandlers`
- **Cross-shard consumers:** `features/chat/components/chat.tsx`

### 6. lib/utils/file-validation.ts
- **Size:** 674 LOC
- **Classification:** Utility (domain: file uploads)
- **Cyclomatic Complexity:** 8 (highest in shard, but under threshold)
- **Imports:** None
- **Public Exports:**
  - Constants: `ALLOWED_ATTACHMENT_TYPES`, `ALLOWED_MIME_TYPE_PREFIXES`, `ALLOWED_MIME_TYPES`, `ALLOWED_MIME_TYPES_SET`, `ATTACHMENT_MAX_FILE_SIZE`, `DEFAULT_MAX_FILE_SIZE`, `MAX_ATTACHMENT_SIZE`, `MAX_IMAGE_DIMENSION`
  - Functions: `getFileExtension`, `isValidMimeType`, `validateFileType`, `validateFileSize`, `validateImageDimensions`, `sanitizeFilename`, `validateFile`, `validateMagicBytes`, `validateAttachment`
  - Types: `AllowedMimeType`, `AllowedMimeTypePrefix`, `AttachmentValidationParams`, `AttachmentValidationResult`, `FileSizeValidationResult`, `FileTypeValidationResult`, `FileValidationOptions`, `FileValidationResult`, `ImageDimensionValidationResult`, `MagicByteValidationResult`
- **Cross-shard consumers:** `app/api/files/upload/route.ts`, `features/chat/schemas/chat.schema.ts`, `lib/types/message-parts.ts`

### 7. lib/utils/format.ts
- **Size:** 173 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 7 (`formatRelativeTime` is most complex)
- **Imports:** None
- **Public Exports:** `formatDate`, `formatRelativeTime`, `formatFileSize`, `formatDuration`, `formatNumber`
- **Local constant:** `FILE_SIZE_UNITS`

### 8. lib/utils/lazy.tsx
- **Size:** 78 LOC
- **Classification:** Utility (React component)
- **Cyclomatic Complexity:** 2
- **Imports:**
  - External: `JSX` type from `react`
- **Public Exports:** `EditorSkeleton`, `LoadingSkeleton`, `createPreloader`, `preloadModule`
- **Cross-shard consumers:** `components/ai-elements/lazy.tsx`

### 9. lib/utils/logger.ts
- **Size:** 132 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 4
- **Imports:** None
- **Public Exports:** `logger` (instance), `createLogger`
- **Local types:** `LogLevel`, `LogContext`, `LoggerOptions`
- **Cross-shard consumers:** `components/ai-elements/prompt-input.tsx`
- **Note:** Not exported through barrel (index.ts)

### 10. lib/utils/message.ts
- **Size:** 64 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 2
- **Imports:**
  - External: `UIMessage` type from `ai`
- **Public Exports:** `getMostRecentUserMessage`, `getTrailingMessageId`

### 11. lib/utils/network.ts
- **Size:** 397 LOC
- **Classification:** Utility (domain: network security)
- **Cyclomatic Complexity:** 7
- **Imports:** None
- **Public Exports:**
  - Types: `GetClientIpOptions`, `IpExtractionResult`
  - Functions: `isValidIPv4`, `isValidIPv6`, `isValidIP`, `normalizeIP`, `isLoopbackIP`, `isPrivateIP`, `getSecureClientIp`, `getClientIpForRateLimit`, `isLocalRequest`
- **Local constants:** `IPV4_LOOPBACK`, `IPV6_LOOPBACK`, `IPV6_MAPPED_LOOPBACK`, `UNKNOWN_IP`, `VERCEL_FORWARDED_FOR`, `X_FORWARDED_FOR`, `X_REAL_IP`, `CF_CONNECTING_IP`

### 12. lib/utils/string.ts
- **Size:** 111 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 2
- **Imports:** None
- **Public Exports:** `truncate`, `slugify`, `capitalize`, `sanitizeHtml`, `sanitizeText`

### 13. lib/utils/uuid.ts
- **Size:** 46 LOC
- **Classification:** Utility
- **Cyclomatic Complexity:** 3
- **Imports:** None
- **Public Exports:** `generateUUID`
- **Cross-shard consumers:** archive files only (no active usage found)

### 14. lib/utils/validation.ts
- **Size:** 224 LOC
- **Classification:** Utility (domain: security validation)
- **Cyclomatic Complexity:** 6
- **Imports:** None
- **Public Exports:** `isValidEmail`, `isValidUrl`, `isValidUuid`, `getSafeRedirectUrl`, `isValidRedirectUrl`
- **Local constants:** `EMAIL_REGEX`, `UUID_REGEX`, `PATH_TRAVERSAL_REGEX`, `DANGEROUS_SCHEMES`
- **Cross-shard consumers:** `features/auth/actions/login.action.ts`, `app/(auth)/login/page.tsx`, `app/api/auth/guest/route.ts`

### 15. lib/utils/format.test.ts
- **Size:** 401 LOC
- **Classification:** Test
- **Cyclomatic Complexity:** N/A
- **Imports:**
  - External: vitest (`afterEach`, `beforeEach`, `describe`, `expect`, `it`, `vi`)
  - Internal: format functions from `./format`
- **Public Exports:** None

### 16. lib/utils/cn.test.ts
- **Size:** 197 LOC
- **Classification:** Test
- **Cyclomatic Complexity:** N/A
- **Imports:**
  - External: vitest (`describe`, `expect`, `it`)
  - Internal: `cn` from `./cn`
- **Public Exports:** None

---

## Cross-Shard Dependency Edges

### Outbound Dependencies (lib/utils imports from other shards)

| Source File | Target Module | Import |
|-------------|---------------|--------|
| lib/utils/fetcher.ts | @/lib/errors | AppError, ErrorCode, ErrorCodes, isAppError, NotFoundError, ServiceUnavailableError |
| lib/utils/document.ts | @/lib/db/schema | Artifact (type) |
| lib/utils/message.ts | ai | UIMessage (type) |

### Inbound Dependencies (other shards import from lib/utils)

| Consumer File | Import | Usage |
|---------------|--------|-------|
| 80+ component files | `cn` | Classname merging (highest usage) |
| components/ai-elements/lazy.tsx | EditorSkeleton, LoadingSkeleton | Lazy loading skeletons |
| components/ai-elements/prompt-input.tsx | logger | Debug logging |
| components/version-footer.tsx | getDocumentTimestampByIndex | Document timestamps |
| features/chat/components/chat.tsx | fetchWithErrorHandlers | API fetching |
| features/chat/components/message.tsx | sanitizeText | Text sanitization |
| features/auth/actions/login.action.ts | getSafeRedirectUrl | Redirect security |
| app/(auth)/login/page.tsx | getSafeRedirectUrl | Redirect security |
| app/api/auth/guest/route.ts | getSafeRedirectUrl | Redirect security |
| app/api/files/upload/route.ts | file-validation exports | File upload validation |
| features/chat/schemas/chat.schema.ts | file-validation exports | Schema validation |
| lib/types/message-parts.ts | isValidMimeType | MIME type validation |

---

## Pattern Flags

### 1. DUPLICATE: Validation Functions Triplicated

**Severity:** HIGH  
**Files:** 
- `lib/utils/validation.ts:33-83` (isValidEmail, isValidUrl, isValidUuid)
- `lib/api/validation.ts:452-473` (isValidUUID, isValidEmail, isValidUrl)
- `lib/constants.ts:268-270` (isValidUUID)

**Details:** Three separate implementations exist for the same validation functions:
- `lib/utils/validation.ts` uses custom regex patterns
- `lib/api/validation.ts` uses Zod schemas
- `lib/constants.ts` uses `UUID_REGEX` constant

The barrel export in `lib/index.ts` acknowledges this conflict at line 23 and 136.

**Recommendation:** Consolidate to single source of truth (prefer Zod-based in lib/api/validation.ts for consistency with API layer).

### 2. DUPLICATE: generateUUID in Multiple Locations

**Severity:** MEDIUM  
**Files:**
- `lib/utils/uuid.ts:20-45` (full implementation with fallbacks)
- `app/api/chat/route.ts:99-101` (inline implementation: `return crypto.randomUUID()`)

**Details:** `lib/utils/uuid.ts` has a robust implementation with crypto fallbacks, but `app/api/chat/route.ts` defines its own simpler version inline.

**Recommendation:** Import from `@/lib/utils/uuid` instead of redefining.

### 3. NAMING INCONSISTENCY: UUID casing

**Severity:** LOW  
**Files:**
- `lib/utils/validation.ts:80` - exports `isValidUuid` (lowercase 'u')
- `lib/api/validation.ts:452` - exports `isValidUUID` (uppercase 'U')
- `lib/constants.ts:268` - exports `isValidUUID` (uppercase 'U')

**Recommendation:** Standardize to `isValidUUID` (matches the acronym convention).

### 4. MISSING BARREL EXPORT: logger

**Severity:** LOW  
**File:** `lib/utils/logger.ts`

**Details:** The `logger` utility is not exported through `lib/utils/index.ts`, requiring direct imports like:
```typescript
import { logger } from "@/lib/utils/logger"
```

This is inconsistent with other utilities that are available via the barrel.

**Recommendation:** Add `logger` and `createLogger` to `lib/utils/index.ts` exports.

### 5. REDUNDANT CONSTANT: ALLOWED_ATTACHMENT_TYPES

**Severity:** LOW  
**File:** `lib/utils/file-validation.ts:60`

**Details:**
```typescript
export const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_MIME_TYPES] as const
```
This is a shallow copy of `ALLOWED_MIME_TYPES` with no functional difference. Both are `as const` tuples.

**Recommendation:** Use `ALLOWED_MIME_TYPES` directly or remove `ALLOWED_ATTACHMENT_TYPES` if it adds no semantic value.

### 6. DUPLICATE SIZE CONSTANTS

**Severity:** LOW  
**File:** `lib/utils/file-validation.ts:14-22`

**Details:**
```typescript
export const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_ATTACHMENT_SIZE = DEFAULT_MAX_FILE_SIZE  // Same value
export const ATTACHMENT_MAX_FILE_SIZE = 5 * 1024 * 1024   // Different value
```

Two constants have identical values (`DEFAULT_MAX_FILE_SIZE` and `MAX_ATTACHMENT_SIZE`), while `ATTACHMENT_MAX_FILE_SIZE` differs. Naming is confusing.

**Recommendation:** Consolidate to single constant or clarify naming (e.g., `MAX_FILE_SIZE_DEFAULT`, `MAX_FILE_SIZE_ATTACHMENT`).

### 7. UNUSED EXPORT: generateUUID (active codebase)

**Severity:** INFO  
**File:** `lib/utils/uuid.ts`

**Details:** The `generateUUID` function is only used in `archive/oldapp/` files. Active codebase uses inline implementations or `crypto.randomUUID()` directly.

**Recommendation:** Verify if this utility should be used more widely or marked as legacy.

### 8. LOGIC OVERLAP: formatRelativeTime future date handling

**Severity:** INFO  
**File:** `lib/utils/format.ts:75-76`

**Details:** In future date handling:
```typescript
if (futureDays < 30) return rtf.format(futureDays, "day")
```
This branch never handles weeks for future dates, unlike past dates which has explicit week handling at line 84.

**Recommendation:** Add week handling for future dates for consistency.

---

## Intra-Shard Analysis

### Module Cohesion
- **High cohesion:** Each utility file focuses on a single domain (date, string, network, file validation)
- **Low coupling:** Files have minimal internal dependencies (only fetcher.ts and document.ts import from other shards)
- **Clear separation:** No circular dependencies within shard

### Code Quality
- All functions have comprehensive JSDoc documentation
- Consistent use of TypeScript types
- Test coverage exists for `cn.ts` and `format.ts`
- No functions exceed cyclomatic complexity threshold of 10

### Potential Simplifications
1. Merge duplicate validation implementations
2. Consolidate size constants in file-validation.ts
3. Add missing barrel exports for logger
4. Remove or document `ALLOWED_ATTACHMENT_TYPES` alias

---

## Notes

### Archived Code References
Several imports from `archive/oldapp/` reference `lib/utils`. These are not counted as active consumers.

### External Dependencies
- `clsx` and `tailwind-merge` for `cn`
- `ai` package for `UIMessage` type
- `vitest` for testing

---

## ⚠️ ESCALATION Items

1. **Validation function triplication** - Requires architectural decision on which module owns validation functions. Affects `lib/utils`, `lib/api`, and `lib/constants`.

2. **generateUUID inline redefinition** - `app/api/chat/route.ts:99-101` redefines `generateUUID` instead of importing. This may be intentional (performance) or oversight.

---

## ⚠️ SCOPE EXTENSION Items

None identified. All analysis remained within `lib/utils/**` scope.

---

*End of Scout Report - Shard 13*
