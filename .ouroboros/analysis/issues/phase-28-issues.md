# Phase 28: Technical Debt Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 4            | 0   | 2   | 1   | 1   | 12h   |

---

### ISSUE-P28-001: Active TODO/FIXME Comments

**File**: Multiple files
**Severity**: P3 (Medium)
**Category**: Technical Debt
**Hours**: 4h

**Problem**: 5 active TODO comments in production code.

| Location                                    | TODO                   | Priority | Hours |
| ------------------------------------------- | ---------------------- | -------- | ----- |
| `lib/ai/models.ts`                          | Runtime validation     | Medium   | 1h    |
| `lib/services/error-logger.ts#L263`         | External error service | High     | 4h    |
| `components/ai-elements/confirmation.tsx`   | onReject callback      | Low      | 0.5h  |
| `lib/config/env.ts`                         | Zod schema validation  | Low      | 0.5h  |
| `features/chat/components/prompt-input.tsx` | Rate limit config      | Medium   | 1h    |

**Fix**: Prioritize by impact:

1. External error service (covered in P26-003)
2. Runtime validation
3. Rate limit config
4. Lower priority items

---

### ISSUE-P28-002: Deprecated Code Still Active

**File**: `lib/utils/feature-flags.tsx#L96`
**Severity**: P3 (Medium)
**Category**: Technical Debt - Dead Code
**Hours**: 2h

**Problem**: Deprecated module-level state still in codebase.

**Code**:

```typescript
/**
 * @deprecated Module-level userId is not SSR-safe.
 * Pass userId to isEnabled() instead.
 */
let _deprecatedUserId: string | undefined;

export function setUserId(userId: string): void {
  _deprecatedUserId = userId;
}
```

**Fix**:

1. Search for all usages of `setUserId`
2. Migrate to context-based solution
3. Remove deprecated code

---

### ISSUE-P28-003: Direct DB Access in Page Component

**File**: `app/(chat)/chat/[id]/page.tsx#L39`
**Severity**: P2 (High)
**Category**: Architecture Violation
**Hours**: 2h

**Problem**: Page component directly queries database, bypassing service/data layers.

**Code**:

```typescript
const db = getDb();
const [result] = await db
  .select({ title: schema.chat.title })
  .from(schema.chat)
  .where(eq(schema.chat.id, id))
  .limit(1);
```

**Fix**:

```typescript
// lib/data/chat.ts
export async function getChatTitle(chatId: string): Promise<string | null> {
  const db = getDb();
  const [result] = await db
    .select({ title: schema.chat.title })
    .from(schema.chat)
    .where(eq(schema.chat.id, chatId))
    .limit(1);
  return result?.title ?? null;
}

// app/(chat)/chat/[id]/page.tsx
import { getChatTitle } from "@/lib/data/chat";
const title = await getChatTitle(id);
```

---

### ISSUE-P28-004: Large API Route File

**File**: `app/api/chat/route.ts`
**Severity**: P2 (High)
**Category**: Code Organization
**Hours**: 4h
**LOC**: 545 lines

**Problem**: Route file exceeds 500 LOC, handling multiple responsibilities:

- Request validation
- Authentication
- Streaming setup
- Title generation
- Message persistence
- Error handling

**Fix**: Extract to focused modules:

```
app/api/chat/
├── route.ts                    # Entry point (50 lines)
└── _lib/
    ├── validate-request.ts     # Validation
    ├── handle-stream.ts        # Streaming logic
    ├── generate-title.ts       # Title generation
    └── save-messages.ts        # Persistence
```

---

## Technical Debt Metrics

| Metric                   | Current  | Target |
| ------------------------ | -------- | ------ |
| TODO Count               | 5        | 0      |
| Deprecated Code          | 1 module | 0      |
| Files >500 LOC           | 4        | 0      |
| Direct DB Access in app/ | 1        | 0      |

## Remediation Priority

1. **P28-003**: Direct DB access (architectural violation)
2. **P28-004**: Large route file (maintainability)
3. **P28-001**: Active TODOs (incomplete features)
4. **P28-002**: Deprecated code (dead code)

## Validation Checklist

- [ ] All TODOs addressed or tracked
- [ ] Deprecated code removed
- [ ] Service layer used consistently
- [ ] Files under 500 LOC
