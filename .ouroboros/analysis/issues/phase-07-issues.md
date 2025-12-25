# Phase 7: Architecture Layer Violations

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 2            | 0   | 2   | 0   | 0   | 3h    |

---

### ISSUE-P7-001: Direct DB Access in Presentation Layer

**File**: `app/(chat)/chat/[id]/page.tsx#L39-L44`
**Severity**: P2 (High)
**Category**: Architecture Violation
**Hours**: 2h

**Problem**: Page component directly imports and uses database layer, bypassing service layer abstraction.

**Code**:

```tsx
// Current violation (lines 20, 39-44)
import { getDb, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;
    try {
        const db = getDb();  // ❌ VIOLATION: Direct DB in presentation
        const [result] = await db
            .select({ title: schema.chat.title })
            .from(schema.chat)
            .where(eq(schema.chat.id, id))
            .limit(1);
```

**Fix**:

```tsx
// Use ChatService instead
import { ChatService } from "@/lib/services/chat-service";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const result = await ChatService.getChatTitle(id);
    return { title: result?.title ?? "Chat" };
  } catch {
    return { title: "Chat" };
  }
}
```

**Impact**: Violates Clean Architecture principles, makes testing difficult, couples presentation to data layer.

---

### ISSUE-P7-002: Schema Import in Presentation Layer

**File**: `app/(chat)/chat/[id]/page.tsx#L20`
**Severity**: P2 (High)
**Category**: Architecture Violation
**Hours**: 1h (included with P7-001)

**Problem**: Direct import of `schema` from database layer in page component.

**Code**:

```tsx
// line 20
import { getDb, schema } from "@/lib/db";
```

**Fix**: Remove schema import, use service layer with domain types instead of DB schema types.

---

## Architecture Layer Rules

1. Presentation Layer (app/) → ONLY calls Service Layer
2. Service Layer (lib/services/) → Orchestrates business logic
3. Data Layer (lib/db/) → Handles persistence

## Validation Checklist

- [ ] No direct DB imports in app/ folder
- [ ] All data access via service layer
- [ ] Domain types separate from DB schema types
