# Phase 02 Issues - Architecture & Structure

## Summary

| ID     | Issue                              | Priority | Est.  |
| ------ | ---------------------------------- | -------- | ----- |
| P2-001 | Duplicate SidebarToggle Components | P1       | 0.5h  |
| P2-002 | Circular Import Chat↔Sidebar       | P1       | 2h    |
| P2-003 | Missing Index in Artifacts Utils   | P3       | 0.25h |
| P2-004 | Legacy oldapp/ Directory           | P2       | 1h    |

---

## ISSUE-P2-001: Duplicate SidebarToggle Components

**Priority:** P1 - Critical  
**Effort:** 0.5h  
**Category:** Code Duplication

### Description

Two SidebarToggle components exist with similar functionality.

### Locations

- `components/ui/sidebar-toggle.tsx`
- `features/sidebar/components/sidebar-toggle.tsx`

### Fix

1. Keep feature-based version in `features/sidebar/`
2. Update all imports to use single source
3. Delete duplicate in `components/ui/`

```typescript
// Update imports from
import { SidebarToggle } from "@/components/ui/sidebar-toggle";
// To
import { SidebarToggle } from "@/features/sidebar/components/sidebar-toggle";
```

---

## ISSUE-P2-002: Circular Import Chat↔Sidebar

**Priority:** P1 - Critical  
**Effort:** 2h  
**Category:** Architecture

### Description

Circular dependency between chat and sidebar features causing potential runtime issues.

### Import Chain

```
features/chat/index.ts
  → features/sidebar/components/...
    → features/chat/hooks/...
      → features/chat/index.ts (CIRCULAR)
```

### Fix

1. Extract shared types to `lib/types/`
2. Create interface layer between features
3. Use dependency injection pattern

```typescript
// lib/types/chat-sidebar-shared.ts
export interface ChatSidebarBridge {
  onChatSelect: (chatId: string) => void;
  currentChatId: string | null;
}

// Pass via context, not direct import
```

---

## ISSUE-P2-003: Missing Index in Artifacts Utils

**Priority:** P3 - Medium  
**Effort:** 0.25h  
**Category:** Code Organization

### Description

Artifacts utils folder lacks barrel export file.

### Location

- `features/artifacts/utils/` (no index.ts)

### Fix

Create `features/artifacts/utils/index.ts`:

```typescript
export * from "./artifact-helpers";
export * from "./artifact-validators";
// ... other utils
```

---

## ISSUE-P2-004: Legacy oldapp/ Directory

**Priority:** P2 - High  
**Effort:** 1h  
**Category:** Technical Debt

### Description

Legacy `oldapp/` directory contains deprecated code that should be archived or removed.

### Location

- `oldapp/` (entire directory)

### Contents

- Old instrumentation files
- Deprecated components
- Legacy hooks and libs

### Fix

1. Verify no active imports from `oldapp/`
2. Extract any needed utilities
3. Archive to separate branch or delete

```bash
# Check for imports
grep -r "from.*oldapp" --include="*.ts" --include="*.tsx"

# If clean, remove
rm -rf oldapp/
```
