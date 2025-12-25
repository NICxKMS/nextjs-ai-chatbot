# Phase 10: Dependency Management Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 3            | 0   | 2   | 1   | 0   | 6h    |

---

### ISSUE-P10-001: Tight Coupling to DB Schema Types

**File**: `features/artifacts/components/artifact.tsx#L8`
**Severity**: P2 (High)
**Category**: Dependency Management
**Hours**: 1h

**Problem**: Feature component directly imports types from database schema layer.

**Code**:

```tsx
// line 8 - Feature imports directly from DB layer
import type { Document } from "@/lib/db/schema";
```

**Fix**:

```tsx
// Create feature-specific domain types
// features/artifacts/types/index.ts
export interface ArtifactDocument {
  id: string;
  title: string;
  content: string;
  kind: DocumentKind;
  createdAt: Date;
}

// Usage - decoupled from DB schema
import type { ArtifactDocument } from "../types";
```

**Impact**: Leaking DB implementation details to feature layer, makes schema changes risky.

---

### ISSUE-P10-002: Service Layer Bypass

**File**: `app/(chat)/chat/[id]/page.tsx`
**Severity**: P2 (High)
**Category**: Dependency Management
**Hours**: 2h

**Problem**: Page uses direct DB queries despite ChatService existing.

**Evidence**:

- Service exists at `lib/services/chat-service.ts`
- Page imports `getDb, schema` instead of ChatService
- Violates established service layer pattern

**Current**:

```tsx
// app/(chat)/chat/[id]/page.tsx
import { getDb, schema } from "@/lib/db";

const db = getDb();
const [result] = await db.select({...}).from(schema.chat).where(...);
```

**Fix**:

```tsx
// Add method to ChatService
// lib/services/chat-service.ts
export const ChatService = {
  // existing methods...

  getChatTitle: async (chatId: string): Promise<string | null> => {
    const db = getDb();
    const [result] = await db
      .select({ title: schema.chat.title })
      .from(schema.chat)
      .where(eq(schema.chat.id, chatId))
      .limit(1);
    return result?.title ?? null;
  },
};

// Usage in page
import { ChatService } from "@/lib/services/chat-service";
const title = await ChatService.getChatTitle(id);
```

---

### ISSUE-P10-003: Missing API Client Abstraction

**File**: Multiple components
**Severity**: P3 (Medium)
**Category**: Dependency Management
**Hours**: 3h

**Problem**: Direct fetch() calls scattered across components without centralized API client.

**Affected Files**:
| File | API Call |
|------|----------|
| `features/artifacts/components/artifact.tsx` | `/api/document` |
| `features/chat/components/prompt-input.tsx` | `/api/files/upload` |
| `features/auth/components/auth-provider.tsx` | `/api/auth/guest` |
| `features/documents/components/document-preview.tsx` | `/api/document` |

**Fix**:

```tsx
// lib/api/client/index.ts
import { createClient } from "./http-client";

export const api = {
  document: {
    get: (id: string) => client.get<Document[]>(`/api/document?id=${id}`),
    save: (id: string, data: DocumentData) =>
      client.post(`/api/document?id=${id}`, data),
  },
  files: {
    upload: (formData: FormData) =>
      client.post<UploadResult>("/api/files/upload", formData),
  },
  auth: {
    guest: () => client.post<Session>("/api/auth/guest"),
  },
};

// Usage (consistent across codebase)
import { api } from "@/lib/api/client";
const result = await api.document.get(id);
```

**Benefits**:

- Centralized error handling
- Type-safe responses
- Consistent request configuration
- Easy mocking for tests

---

## Dependency Rules

1. **Features → Services → Data**: One-way dependency flow
2. **No cross-feature imports**: Use shared/ for common code
3. **Abstract external dependencies**: Wrap third-party APIs
4. **Domain types over DB types**: Isolate persistence details

## Current Dependency Graph Issues

```
app/ ──(WRONG)──> lib/db/        # Should use lib/services/
features/ ──(WRONG)──> lib/db/schema  # Should use domain types
features/ ──(OK)──> lib/services/     # Correct pattern
```

## Validation Checklist

- [ ] No DB imports in app/ or features/
- [ ] All DB access via service layer
- [ ] API client abstraction implemented
- [ ] Domain types separate from DB schema
