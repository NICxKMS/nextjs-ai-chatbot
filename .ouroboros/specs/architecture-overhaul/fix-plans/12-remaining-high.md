# Remaining HIGH Priority Issues - Fix Plan

**Created**: 2025-12-22
**Total Issues**: 10 active + 5 duplicates
**Estimated Effort**: 4-5 hours
**Phase**: 12

---

## Executive Summary

These are the final HIGH severity issues not yet covered by existing fix plans (01-11). After completing Phases 1-11, these issues represent the remaining HIGH-priority technical debt.

---

## Issue Registry

### Active HIGH Issues (10)

| #    | Issue                                       | Category       | File                                   | Effort |
| ---- | ------------------------------------------- | -------------- | -------------------------------------- | ------ |
| #65  | Missing /api/settings route                 | Architecture   | shared/hooks/use-settings.ts           | 30m    |
| #76  | Missing API route for suggestions           | Architecture   | TBD                                    | 30m    |
| #125 | No visual regression tests                  | Testing        | tests/                                 | DEFER  |
| #165 | React import order issue                    | UI Components  | features/artifacts/editors/text-editor | 15m    |
| #190 | Missing error handling for model resolution | Infrastructure | lib/ai/providers.ts                    | 30m    |
| #196 | Missing handler error corrupts stream       | Infrastructure | lib/ai/tools/create-document.ts        | 45m    |
| #250 | Suggestion FK missing onDelete cascade      | Database       | lib/db/schema.ts                       | 20m    |
| #276 | DATABASE_URL non-null assertion             | Configuration  | drizzle.config.ts                      | 15m    |
| #292 | No optimistic update revert                 | Server Actions | features/chat/actions/chat.ts          | 30m    |
| #318 | Missing suggestions-extension               | Hooks/Editors  | features/artifacts/editors/text-editor | 45m    |

### Duplicate Issues (5) - CLOSE AS DUPLICATE

| #    | Issue                               | Duplicate Of | Action       |
| ---- | ----------------------------------- | ------------ | ------------ |
| #118 | Non-null assertion on DATABASE_URL  | #276, #215   | CLOSE → #276 |
| #119 | Supabase client non-null assertions | #215, #216   | CLOSE → #215 |
| #137 | Hardcoded sample data (weather)     | #194         | CLOSE → #194 |
| #286 | updateVisibility TODO stub          | #10          | CLOSE → #10  |
| #287 | deleteMessages TODO stub            | #10          | CLOSE → #10  |

---

## Fix Plans

### #65: Missing /api/settings Route

**Problem**: `use-settings.ts` hook expects API endpoint that doesn't exist.

**Fix**:

```typescript
// Create: app/api/settings/route.ts
import { auth } from "@/lib/auth";
import { getUserSettings, updateUserSettings } from "@/lib/data/settings";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const settings = await getUserSettings(session.user.id);
  return Response.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  await updateUserSettings(session.user.id, body);
  return Response.json({ success: true });
}
```

**Effort**: 30 minutes

---

### #76: Missing API Route for Suggestions

**Problem**: Suggestions feature lacks dedicated API endpoint.

**Fix**:

```typescript
// Create: app/api/suggestions/route.ts
import { auth } from "@/lib/auth";
import { getSuggestionsForDocument } from "@/lib/data/suggestions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get("documentId");

  if (!documentId) {
    return Response.json({ error: "documentId required" }, { status: 400 });
  }

  const session = await auth();
  const suggestions = await getSuggestionsForDocument(
    documentId,
    session?.user?.id
  );
  return Response.json(suggestions);
}
```

**Effort**: 30 minutes

---

### #125: No Visual Regression Tests

**Problem**: No visual snapshot testing for UI components.

**Action**: **DEFER to Phase 13+**

This requires:

- Percy or Chromatic integration
- CI/CD pipeline updates
- Budget allocation for SaaS service

**Effort**: Deferred (8-16 hours when implemented)

---

### #165: React Import Order Issue

**Problem**: React import inside component body in text-editor.tsx.

**Fix**:

```typescript
// Move to top of file (before any other imports)
import React from "react";
import { useEffect, useMemo } from "react";
// ...rest of imports
```

**Effort**: 15 minutes

---

### #190: Missing Error Handling for Model Resolution

**Problem**: `providerRegistry.languageModel()` throws without try-catch.

**Fix**:

```typescript
// lib/ai/providers.ts
export function getLanguageModel(modelId: string) {
  const resolvedId = resolveModelId(modelId);

  try {
    const model = providerRegistry.languageModel(
      resolvedId as `${string}:${string}`
    );
    return model;
  } catch (error) {
    throw new AppError({
      code: "MODEL_NOT_FOUND",
      message: `Model '${resolvedId}' is not available`,
      cause: error,
      statusCode: 400,
    });
  }
}
```

**Effort**: 30 minutes

---

### #196: Missing Handler Error Corrupts Stream

**Problem**: `onCreateDocument` callback in create-document.ts has no error handling - stream left inconsistent on failure.

**Fix**:

```typescript
// lib/ai/tools/create-document.ts
try {
  await onCreateDocument({
    id: documentId,
    title: title,
    kind: kind,
    content: "",
  });

  // Signal document creation to stream
  dataStream.writeData({ type: "document-created", documentId });
} catch (error) {
  // Notify client of failure
  dataStream.writeData({
    type: "document-error",
    error: "Failed to create document",
  });

  console.error("[create-document] Handler error:", error);
  throw error;
}
```

**Effort**: 45 minutes

---

### #250: Suggestion FK Missing onDelete Cascade

**Problem**: Orphan suggestions when documents deleted.

**Fix**:

```typescript
// lib/db/schema.ts - Suggestion table
export const suggestion = pgTable("suggestion", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .references(() => document.id, { onDelete: "cascade" }) // ← Add cascade
    .notNull(),
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" }) // ← Add cascade
    .notNull(),
  // ...
});
```

**Migration**:

```sql
-- Migration: add_cascade_to_suggestion
ALTER TABLE suggestion
  DROP CONSTRAINT suggestion_document_id_fkey,
  ADD CONSTRAINT suggestion_document_id_fkey
    FOREIGN KEY (document_id)
    REFERENCES document(id)
    ON DELETE CASCADE;
```

**Effort**: 20 minutes

---

### #276: DATABASE_URL Non-null Assertion

**Problem**: `drizzle.config.ts` crashes if DATABASE_URL not set.

**Fix**:

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for database migrations. " +
      "Set it in your .env file or environment variables."
  );
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
```

**Effort**: 15 minutes

---

### #292: No Optimistic Update Revert

**Problem**: Server action failures don't roll back optimistic UI updates.

**Fix**:

```typescript
// features/chat/actions/chat.ts
export async function deleteChat(chatId: string) {
  // Store for rollback
  const previousState = getChatFromCache(chatId);

  // Optimistic update
  removeChatFromCache(chatId);

  try {
    await deleteChatFromDb(chatId);
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    // Rollback on failure
    if (previousState) {
      restoreChatToCache(previousState);
    }
    return {
      success: false,
      error: "Failed to delete chat",
    };
  }
}
```

**Effort**: 30 minutes

---

### #318: Missing suggestions-extension

**Problem**: text-editor.tsx imports non-existent `suggestions-extension.ts`.

**Fix**: Port from oldapp:

```typescript
// Create: features/artifacts/editors/extensions/suggestions-extension.ts
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface SuggestionsOptions {
  onSuggestionSelect?: (suggestion: string) => void;
}

export const SuggestionsExtension = Extension.create<SuggestionsOptions>({
  name: "suggestions",

  addOptions() {
    return {
      onSuggestionSelect: undefined,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("suggestions"),
        // Port logic from oldapp/artifacts/text/extensions/suggestions.ts
      }),
    ];
  },
});
```

**Effort**: 45 minutes (includes testing)

---

## Duplicate Resolution

### #118, #119 → Already covered by #215, #216, #276

These are all variations of "non-null assertion on environment variables". Close as duplicates.

### #137 → Already covered by #194

Weather sample data issue is part of "No response validation from external API". Close as duplicate.

### #286, #287 → Already covered by #10

Server action TODO stubs are part of "Server Actions not persisting". Close as duplicates.

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│  Priority 1: Infrastructure (60 min)                        │
├─────────────────────────────────────────────────────────────┤
│  #276 (15m) → #190 (30m) → #196 (45m)                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Priority 2: Database (20 min)                              │
├─────────────────────────────────────────────────────────────┤
│  #250 (20m) - FK cascade migration                          │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Priority 3: API Routes (60 min)                            │
├─────────────────────────────────────────────────────────────┤
│  #65 (30m) → #76 (30m)                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  Priority 4: UI/Server Actions (90 min)                     │
├─────────────────────────────────────────────────────────────┤
│  #165 (15m) → #318 (45m) → #292 (30m)                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Effort Summary

| Category       | Issues | Active | Duplicate | Effort    |
| -------------- | ------ | ------ | --------- | --------- |
| Infrastructure | 3      | 3      | 0         | 90m       |
| Database       | 1      | 1      | 0         | 20m       |
| API Routes     | 2      | 2      | 0         | 60m       |
| UI/Actions     | 3      | 3      | 0         | 90m       |
| Testing        | 1      | 0      | 0         | DEFER     |
| Duplicates     | 5      | 0      | 5         | 0m        |
| **TOTAL**      | **15** | **9**  | **5**     | **~4-5h** |

---

## Success Criteria

- [ ] All 9 active issues resolved
- [ ] 5 duplicate issues closed with references
- [ ] No HIGH severity issues remaining
- [ ] All fixes have corresponding tests
- [ ] Database migration applied successfully

---

## File: 12-remaining-high.md

**Location**: `.ouroboros/specs/architecture-overhaul/fix-plans/`
**Status**: READY FOR IMPLEMENTATION
