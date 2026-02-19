# Archive/OldApp Functional Mapping Comparison

> Analysis of functional mapping between v5 (archive/oldapp) and v6 codebases.

## Executive Summary

The v5 to v6 migration represents a significant architectural evolution from a monolithic structure to a feature-based architecture. This document maps the functional relocations, merges, splits, and deletions across the codebase.

---

## 1. Library Structure Mapping (`lib/`)

### 1.1 Error Handling

| v5 Location | v6 Location | Status | Notes |
|-------------|-------------|--------|-------|
| `lib/errors.ts` (ChatSDKError) | `lib/errors.ts` (AppError hierarchy) | **Improved** | Replaced single error class with typed hierarchy |
| `lib/errors.ts:getMessageByErrorCode` | `lib/errors.ts:getMessageByErrorCode` | **Migrated** | Enhanced with legacy code normalization |

**Key Improvement**: v6 introduces specialized error classes:
- [`ValidationError`](lib/errors.ts:169) - HTTP 400
- [`NotFoundError`](lib/errors.ts:185) - HTTP 404
- [`UnauthorizedError`](lib/errors.ts:212) - HTTP 401
- [`ForbiddenError`](lib/errors.ts:231) - HTTP 403
- [`RateLimitError`](lib/errors.ts:247) - HTTP 429
- [`InternalServerError`](lib/errors.ts:266) - HTTP 500
- [`ServiceUnavailableError`](lib/errors.ts:285) - HTTP 503

v5 used a single [`ChatSDKError`](archive/oldapp/lib/errors.ts:47) class with string-based error codes like `"bad_request:api:invalid_model_id"`.

### 1.2 Data Access Layer

| v5 Location | v6 Location | Status | Notes |
|-------------|-------------|--------|-------|
| `lib/data/chat.ts` | `lib/data/repositories/chat.repository.ts` | **Refactored** | Monolithic data file split into repository pattern |
| `lib/data/document.ts` | `lib/data/repositories/artifact.repository.ts` | **Renamed** | Document renamed to Artifact |
| `lib/data/base.ts` | `lib/data/repositories/base.repository.ts` | **Improved** | Enhanced base repository with generics |
| `lib/data/chat-operations.ts` | `lib/data/services/chat.service.ts` | **Migrated** | Operations moved to service layer |

**Architecture Change**: v5 had direct data access in `lib/data/chat.ts` (~45KB). v6 implements:
- **Repository Pattern**: [`BaseRepository`](lib/data/repositories/base.repository.ts) with typed CRUD operations
- **Service Layer**: [`ChatService`](lib/data/services/chat.service.ts) for business logic
- **Query Layer**: [`chat.queries.ts`](lib/data/queries/chat.queries.ts) for specialized queries

### 1.3 AI/Model System

| v5 Location | v6 Location | Status | Notes |
|-------------|-------------|--------|-------|
| `lib/ai/models.ts` | `lib/ai/registry.ts` | **Replaced** | Simple exports replaced by full registry |
| `lib/ai/model-registry.ts` | `lib/ai/registry.ts` | **Merged** | Merged into unified registry |
| `lib/ai/curated-models.ts` | `lib/ai/registry.ts` | **Merged** | Curated models integrated into registry |
| `lib/ai/chat-completion.ts` | `lib/ai/chat-completion.ts` | **Migrated** | Enhanced with better typing |
| `lib/ai/providers.ts` | `lib/ai/providers.ts` | **Improved** | Enhanced provider registry |

**Key Improvement**: v6 [`registry.ts`](lib/ai/registry.ts) provides:
- [`getModel(id)`](lib/ai/registry.ts) function for model lookup
- [`ModelDefinition`](lib/ai/registry.ts:57) interface with rich metadata
- Capability-based model selection
- Reasoning model middleware support

v5 required importing from multiple files:
```typescript
// v5 approach
import { getDefaultChatModel, getModelById } from "./model-registry";
import { listChatModels } from "./model-registry";
```

v6 uses unified registry:
```typescript
// v6 approach
import { getModel } from "@/lib/ai/registry";
const model = getModel("google:gemini-2.5-flash");
```

### 1.4 Authentication & Guards

| v5 Location | v6 Location | Status | Notes |
|-------------|-------------|--------|-------|
| `lib/api/guards.ts` | `lib/auth/guards.ts` | **Relocated** | Moved from api/ to auth/ |
| `lib/auth/session.ts` | `lib/auth/session.ts` | **Enhanced** | Improved session handling |
| `lib/auth/client.ts` | `features/auth/hooks/use-auth.ts` | **Migrated** | Client auth moved to feature module |

**Key Improvement**: v6 guards use throw-based pattern:
```typescript
// v5 - return-based guards
export async function requireAuthForRoute(surface: Surface): Promise<AuthResult | Response> {
  try {
    return await requireAuth(surface);
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    // ...
  }
}

// v6 - throw-based guards
export async function requireAuth(options: GuardOptions = {}): Promise<{ session: AppSession; userId: string }> {
  const session = await getSession();
  if (!session?.user.id) {
    if (options.redirectTo) {
      redirect(options.redirectTo);
    }
    throw new UnauthorizedError("Authentication required");
  }
  return { session, userId: session.user.id };
}
```

### 1.5 Cache System

| v5 Location | v6 Location | Status | Notes |
|-------------|-------------|--------|-------|
| `lib/cache/operations.ts` | `lib/cache/tiered-cache.ts` | **Refactored** | Operations replaced by TieredCache class |
| `lib/cache/batch-operations.ts` | `lib/cache/cast.ts` | **Replaced** | Batch ops replaced by cast functions |
| `lib/cache/helpers.ts` | `lib/cache/strategies.ts` | **Replaced** | Helpers replaced by strategy pattern |
| `lib/cache/redis.ts` | `lib/cache/client.ts` | **Migrated** | Redis client refactored |
| `lib/cache/quota.ts` | `lib/cache/quota.ts` | **Enhanced** | Improved quota management |

**Key Improvement**: v6 introduces [`TieredCache`](lib/cache/tiered-cache.ts) with:
- Memory + Redis tiered caching
- Circuit breaker pattern
- Invalidation strategies
- Type-safe cache keys

### 1.6 New Modules in v6

| v6 Location | Purpose | Notes |
|-------------|---------|-------|
| `lib/a11y/` | Accessibility utilities | **New** - Focus management, keyboard navigation |
| `lib/api/context.ts` | API request context | **New** - Centralized request handling |
| `lib/api/response.ts` | API response builders | **New** - Standardized response format |
| `lib/utils/` | Utility functions | **New** - Organized utility directory |

---

## 2. Component Structure Mapping

### 2.1 Feature Module Migration

v5 components were flat in `components/`. v6 organizes into feature modules:

| v5 Component | v6 Location | Feature Module |
|--------------|-------------|----------------|
| `components/chat.tsx` | `features/chat/components/chat.tsx` | chat |
| `components/messages.tsx` | `features/chat/components/messages.tsx` | chat |
| `components/message.tsx` | `features/chat/components/message.tsx` | chat |
| `components/multimodal-input.tsx` | `features/input/components/multimodal-input.tsx` | input |
| `components/artifact.tsx` | `features/artifact/components/artifact-panel.tsx` | artifact |
| `components/model-selector.tsx` | `features/settings/components/model-selector.tsx` | settings |
| `components/sidebar-history.tsx` | `features/sidebar/components/sidebar-history.tsx` | sidebar |
| `components/auth-form.tsx` | `features/auth/components/auth-form.tsx` | auth |
| `components/visibility-selector.tsx` | `features/chat/components/visibility-selector.tsx` | chat |

### 2.2 Shared Components

| v5 Component | v6 Location | Status |
|--------------|-------------|--------|
| `components/ui/*` | `components/ui/*` | **Preserved** |
| `components/icons.tsx` | `components/icons.tsx` | **Preserved** (reduced from 61KB to 29KB) |
| `components/theme-provider.tsx` | `components/theme-provider.tsx` | **Preserved** |
| `components/toast.tsx` | `components/toast.tsx` | **Preserved** |

### 2.3 Deleted/Removed Components

| v5 Component | Status | Reason |
|--------------|--------|--------|
| `components/weather.tsx` | **Removed** | Moved to tool implementation |
| `components/document.tsx` | **Renamed** | Became artifact components |
| `components/document-preview.tsx` | **Merged** | Integrated into artifact panel |
| `components/elements/*` | **Removed** | Experimental elements not migrated |

---

## 3. Hooks Mapping

### 3.1 Hook Migration

| v5 Hook | v6 Location | Status |
|---------|-------------|--------|
| `hooks/use-artifact.ts` | `features/artifact/hooks/use-artifact.ts` | **Migrated** |
| `hooks/use-chat-visibility.ts` | `features/chat/hooks/use-chat.ts` | **Merged** |
| `hooks/use-messages.tsx` | `features/chat/hooks/use-messages.ts` | **Migrated** |
| `hooks/use-mobile.ts` | `hooks/use-mobile.ts` | **Preserved** |
| `hooks/use-optimistic-chats.tsx` | `features/sidebar/hooks/use-optimistic-chats.tsx` | **Migrated** |
| `hooks/use-scroll-to-bottom.tsx` | `features/chat/hooks/use-scroll-to-bottom.ts` | **Migrated** |
| `hooks/use-window-size.ts` | **Removed** | Not needed in v6 |

### 3.2 Hook Improvements

**v5 [`use-artifact.ts`](archive/oldapp/hooks/use-artifact.ts:64)**:
```typescript
type ArtifactMetadata = any; // Using 'any' for flexibility
```

**v6 [`use-artifact.ts`](features/artifact/hooks/use-artifact.ts:13)**:
```typescript
import type { ArtifactMetadata, UIArtifact } from "../types"
// Proper typing through imported types
```

---

## 4. API Routes Mapping

### 4.1 Route Migration

| v5 Route | v6 Route | Status |
|----------|----------|--------|
| `app/(chat)/api/chat/route.ts` | `app/api/chat/route.ts` | **Reorganized** |
| `app/(chat)/api/document/route.ts` | `app/api/artifact/route.ts` | **Renamed** |
| `app/api/auth/exchange/route.ts` | `app/api/auth/exchange/route.ts` | **Preserved** |
| `app/api/auth/guest/route.ts` | `app/api/auth/guest/route.ts` | **Preserved** |
| `app/api/auth/logout/route.ts` | `app/api/auth/logout/route.ts` | **Preserved** |

### 4.2 Route Handler Improvements

**v5 Route Pattern**:
```typescript
// archive/oldapp/app/(chat)/api/chat/route.ts
import { requireAuthForRoute, requireRateLimitForRoute } from "@/lib/api/guards";
import { parseJsonBodyForRoute } from "@/lib/api/validators";

export async function POST(request: Request) {
  const bodyResult = await parseJsonBodyForRoute(request, schema, "chat");
  if (bodyResult instanceof Response) return bodyResult;
  
  const authResult = await requireAuthForRoute("chat");
  if (authResult instanceof Response) return authResult;
  // ...
}
```

**v6 Route Pattern**:
```typescript
// app/api/chat/route.ts
import { ChatRouteRequestSchema } from "@/features/chat/schemas";
import { chatService } from "@/lib/data/services/chat.service";
import { getSession } from "@/lib/auth/session";
import { ValidationError, UnauthorizedError } from "@/lib/errors";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user.id) {
    throw new UnauthorizedError("Authentication required");
  }
  // Service handles business logic
  return chatService.streamChat(...);
}
```

---

## 5. Server Actions Mapping

### 5.1 Actions Migration (New in v6)

v5 had actions scattered in route files. v6 introduces co-located server actions:

| v5 Location | v6 Location | Feature |
|-------------|-------------|---------|
| `app/(chat)/actions.ts` | `features/chat/actions/*.action.ts` | Chat actions |
| `artifacts/actions.ts` | `features/artifact/actions/*.action.ts` | Artifact actions |
| N/A | `features/auth/actions/*.action.ts` | Auth actions (new) |
| N/A | `features/sidebar/actions/*.action.ts` | Sidebar actions (new) |

### 5.2 Action Organization

v6 organizes actions by feature with consistent naming:
- `create-chat.action.ts`
- `delete-chat.action.ts`
- `update-title.action.ts`
- `stream-chat.action.ts`

---

## 6. Schema/Validation Mapping

### 6.1 Schema Migration

| v5 Location | v6 Location | Status |
|-------------|-------------|--------|
| `app/(chat)/api/chat/schema.ts` | `features/chat/schemas/chat.schema.ts` | **Migrated** |
| `app/(chat)/api/document/schema.ts` | `features/artifact/schemas/artifact.schema.ts` | **Renamed** |
| `app/api/auth/exchange/schema.ts` | `features/auth/schemas/auth.schema.ts` | **Migrated** |
| `lib/api/schemas.ts` | `features/*/schemas/*.schema.ts` | **Distributed** |

---

## 7. Summary Statistics

### Module Count Comparison

| Category | v5 Count | v6 Count | Change |
|----------|----------|----------|--------|
| lib/ files | 62 | 78 | +16 (new utilities) |
| components/ | 48 | 12 + features | Reorganized |
| hooks/ | 7 | 3 + features | Distributed |
| API routes | 6 | 5 | Consolidated |

### File Size Changes

| Metric | v5 | v6 | Improvement |
|--------|----|----|-------------|
| Largest lib file | 45KB (chat.ts) | 20KB (chat.repository.ts) | 55% reduction |
| icons.tsx | 61KB | 29KB | 52% reduction |
| Error handling | 18KB single file | 14KB + tests | Better organized |

---

## 8. Recommendations

### 8.1 Completed Migrations
- Error hierarchy fully migrated with improvements
- Repository pattern successfully implemented
- Feature module organization complete
- Server actions co-located with features

### 8.2 Areas for Further Improvement
1. **Cache Layer**: Some v5 cache operations still have v6 equivalents that could be further consolidated
2. **Type Exports**: Consider centralizing type exports in feature `index.ts` files
3. **Test Coverage**: v6 has more test files but coverage could be expanded

---

*Generated: 2026-02-18*
*Analyzer: Code Simplifier*