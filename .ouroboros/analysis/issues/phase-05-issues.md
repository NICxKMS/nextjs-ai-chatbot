# Phase 05 Issues - Deprecation & Unused Code

## Summary

| ID     | Issue                             | Priority | Est.  |
| ------ | --------------------------------- | -------- | ----- |
| P5-001 | Deprecated toUnixTimestamp        | P3       | 0.5h  |
| P5-002 | Deprecated useInvalidationHandler | P3       | 0.5h  |
| P5-003 | Deprecated Feature Flag Methods   | P3       | 1h    |
| P5-004 | Unused Barrel Exports ~33 items   | P4       | 2h    |
| P5-005 | Commented Out Code sidebar.tsx    | P4       | 0.25h |
| P5-006 | Unused Database Types             | P3       | 0.5h  |

---

## ISSUE-P5-001: Deprecated toUnixTimestamp

**Priority:** P3 - Medium  
**Effort:** 0.5h  
**Category:** Deprecation

### Description

`toUnixTimestamp` utility is deprecated but still exported.

### Location

- `lib/utils/date.ts`

### Current Code

```typescript
/**
 * @deprecated Use Date.now() / 1000 instead
 */
export function toUnixTimestamp(date: Date): number {
  return Math.floor(date.getTime() / 1000);
}
```

### Fix

1. Find all usages: `grep -r "toUnixTimestamp" --include="*.ts"`
2. Replace with native: `Math.floor(Date.now() / 1000)`
3. Remove deprecated function

---

## ISSUE-P5-002: Deprecated useInvalidationHandler

**Priority:** P3 - Medium  
**Effort:** 0.5h  
**Category:** Deprecation

### Description

Hook `useInvalidationHandler` is deprecated, replaced by React Query mutations.

### Location

- `shared/hooks/use-invalidation-handler.ts`

### Current Code

```typescript
/**
 * @deprecated Use useMutation with onSuccess invalidation
 */
export function useInvalidationHandler() { ... }
```

### Fix

Migrate to React Query pattern:

```typescript
// Before
const { invalidate } = useInvalidationHandler();
await saveData(data);
invalidate(["chat", chatId]);

// After
const mutation = useMutation({
  mutationFn: saveData,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
  },
});
```

---

## ISSUE-P5-003: Deprecated Feature Flag Methods

**Priority:** P3 - Medium  
**Effort:** 1h  
**Category:** Deprecation

### Description

Old feature flag methods are deprecated but still in codebase.

### Location

- `lib/config/feature-flags.ts`

### Deprecated Methods

```typescript
/** @deprecated Use isFeatureEnabled() instead */
export function checkFeature(name: string): boolean { ... }

/** @deprecated Use getFeatureConfig() instead */
export function getFlag(name: string): FeatureFlag { ... }
```

### Fix

1. Update all call sites to new API
2. Remove deprecated methods
3. Update tests

---

## ISSUE-P5-004: Unused Barrel Exports ~33 items

**Priority:** P4 - Low  
**Effort:** 2h  
**Category:** Dead Code

### Description

Approximately 33 exports in barrel files are never imported elsewhere.

### Locations

```typescript
// lib/index.ts - unused exports
export { unusedHelper1 } from "./utils/helpers";
export { unusedHelper2 } from "./utils/helpers";

// features/chat/index.ts - unused exports
export { InternalChatUtil } from "./utils/internal";

// components/ui/index.ts - unused exports
export { DeprecatedButton } from "./deprecated-button";
```

### Fix

1. Run: `npx knip` to identify unused exports
2. Remove from barrel files
3. Delete source files if completely unused

---

## ISSUE-P5-005: Commented Out Code sidebar.tsx

**Priority:** P4 - Low  
**Effort:** 0.25h  
**Category:** Code Cleanliness

### Description

Large block of commented-out code in sidebar component.

### Location

- `features/sidebar/components/sidebar.tsx`

### Current Code

```typescript
// TODO: Re-enable when feature is ready
// const handleDragStart = (e: DragEvent) => {
//   e.dataTransfer.setData('text/plain', chatId);
//   setIsDragging(true);
// };
//
// const handleDragEnd = () => {
//   setIsDragging(false);
// };
//
// ... 30+ more lines commented
```

### Fix

1. If needed later, create a feature branch
2. Remove commented code from main
3. Add issue/ticket reference if preserving for future

---

## ISSUE-P5-006: Unused Database Types

**Priority:** P3 - Medium  
**Effort:** 0.5h  
**Category:** Dead Code

### Description

Database type definitions exist but are never used in queries.

### Location

- `lib/db/types.ts`

### Unused Types

```typescript
// Never imported anywhere
export interface LegacyUser { ... }
export interface OldChatFormat { ... }
export type DeprecatedMessageType = { ... }
```

### Fix

1. Verify no usages: `grep -r "LegacyUser\|OldChatFormat\|DeprecatedMessageType"`
2. Remove unused type definitions
3. Update barrel exports
