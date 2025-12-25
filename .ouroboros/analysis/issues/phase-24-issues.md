# Phase 24: Modularity Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 4            | 0   | 0   | 2   | 2   | 4.5h  |

---

### ISSUE-P24-001: Incomplete Feature Barrel Exports

**File**: `features/*/index.ts`
**Severity**: P3 (Medium)
**Category**: Modularity
**Hours**: 1h

**Problem**: Some features may not export all public APIs through barrel files.

**Example Issue**:

```typescript
// features/chat/index.ts - may be missing some exports
export { Chat } from "./components";
export { useChat } from "./hooks";
// Missing: ChatProvider, ChatContext, types
```

**Fix**: Audit each feature's `index.ts` for completeness:

```typescript
// features/chat/index.ts - complete public API
// Components
export { Chat } from "./components/chat";
export { ChatProvider } from "./components/chat-provider";
export { ChatMessages } from "./components/chat-messages";

// Hooks
export { useChat } from "./hooks/use-chat";
export { useChatMessages } from "./hooks/use-chat-messages";

// Types (re-export as types)
export type { ChatProps, ChatMessage, ChatState } from "./types";

// Actions
export { sendMessage, deleteMessage } from "./actions";
```

---

### ISSUE-P24-002: Missing Features Root Barrel

**File**: `features/index.ts` (missing)
**Severity**: P4 (Low)
**Category**: Modularity
**Hours**: 0.5h

**Problem**: No unified entry point for all features.

**Fix**: Create `features/index.ts`:

```typescript
// features/index.ts
export * from "./artifacts";
export * from "./auth";
export * from "./chat";
export * from "./documents";
export * from "./settings";
export * from "./sidebar";
```

**Usage**:

```typescript
// Clean import from features root
import { Chat, useChat, Sidebar } from "@/features";
```

---

### ISSUE-P24-003: Cross-Feature Import Restrictions Missing

**File**: `biome.jsonc` or ESLint config
**Severity**: P3 (Medium)
**Category**: Modularity
**Hours**: 1h

**Problem**: Features can import from each other's internal modules instead of public APIs.

**Bad Pattern**:

```typescript
// features/chat/components/chat.tsx
import { SidebarHistoryItem } from "@/features/sidebar/components/sidebar-history-item";
// Should use: import { SidebarHistoryItem } from "@/features/sidebar";
```

**Fix**: Add ESLint rule or Biome configuration:

```json
{
  "linter": {
    "rules": {
      "custom": {
        "no-deep-feature-imports": {
          "pattern": "@/features/*/(?!index)",
          "message": "Import from feature root only"
        }
      }
    }
  }
}
```

---

### ISSUE-P24-004: Lib Module Too Large

**File**: `lib/index.ts`
**Severity**: P4 (Low)
**Category**: Modularity
**Hours**: 2h

**Problem**: Lib is a catch-all with 100 lines re-exporting 13 submodules.

**Current Structure**:

```
lib/
├── ai/          # Could stay
├── api/         # Could stay
├── auth/        # Move to features/auth?
├── cache/       # Could stay
├── config/      # Could stay
├── data/        # Could stay
├── db/          # Could stay
├── editor/      # Move to features/artifacts?
├── errors/      # Could stay
├── services/    # Evaluate each service
├── types/       # Could stay
├── utils/       # Could stay
└── providers/   # Could stay
```

**Fix Approach**:

1. Keep infrastructure (db, cache, config, errors) in lib/
2. Consider moving domain logic (auth, editor) to features/
3. Evaluate services individually

---

## Modularity Principles

1. **Feature Isolation**: Features only import from each other via barrel files
2. **Public API**: Each feature exposes clear public API through index.ts
3. **Lib = Infrastructure**: Keep lib/ for cross-cutting concerns
4. **Features = Domain**: Keep features/ for business logic

## Import Hierarchy

```
app/ → features/ → lib/ → shared/
          ↓           ↓
      (public API)  (any module)
```

## Validation Checklist

- [ ] All features have complete barrel exports
- [ ] features/index.ts exists
- [ ] Import boundaries enforced
- [ ] Lib contains only infrastructure
