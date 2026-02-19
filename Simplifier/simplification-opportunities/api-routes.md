# API Routes Simplification Opportunities

## Overview

This document identifies simplification opportunities in the API routes, including duplicate patterns, over-engineered routes, consolidation possibilities, and unused code.

---

## 1. Duplicate Validation Patterns

### 1.1 UUID Validation - Three Different Approaches

**Problem**: UUID validation is implemented in three different ways across routes.

#### Current Implementation A: Zod Schema (Artifacts)

```typescript
// app/api/artifacts/route.ts:157-163
const uuidValidation = ArtifactUUIDSchema.safeParse(id)
if (!uuidValidation.success) {
    return error(
        new ValidationError("Invalid id format: must be a valid UUID", {
            field: "id",
        }),
    )
}
```

#### Current Implementation B: Helper Function (Artifacts GET)

```typescript
// app/api/artifacts/route.ts:61-63
if (!isValidUUID(id)) {
    return error("Invalid id format: must be a valid UUID")
}
```

#### Current Implementation C: Regex (Chat DELETE)

```typescript
// app/api/chat/route.ts:570-574
const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(chatId)) {
    throw new ValidationError("Invalid chat ID format")
}
```

**Recommendation**: Standardize on `isValidUUID()` helper from `lib/api`:

```typescript
// Simplified approach
import { isValidUUID } from "@/lib/api"

if (!isValidUUID(id)) {
    return error("Invalid id format: must be a valid UUID")
}
```

**Impact**: 
- Reduces code duplication
- Ensures consistent validation behavior
- Easier to maintain (single source of truth)

---

### 1.2 Rate Limit Header Application - Repeated Pattern

**Problem**: Rate limit header application is duplicated across multiple routes.

#### Current Implementation (Repeated in 6+ routes):

```typescript
// app/api/artifacts/route.ts:73-78
const headers = createRateLimitHeaders(rateLimitResult)
headers.forEach((value, key) => {
    response.headers.set(key, value)
})
return response
```

**Recommendation**: Create a helper function:

```typescript
// lib/api/response.ts
export function withRateLimitHeaders(
    response: Response,
    rateLimitResult: RateLimitResult
): Response {
    const headers = createRateLimitHeaders(rateLimitResult)
    headers.forEach((value, key) => {
        response.headers.set(key, value)
    })
    return response
}
```

**Usage**:

```typescript
// Simplified
return withRateLimitHeaders(success(data), rateLimitResult)
```

---

### 1.3 Query Parameter Extraction Pattern

**Problem**: Query parameter extraction and validation is repetitive.

#### Current Implementation:

```typescript
// app/api/artifacts/route.ts:56-58
const { searchParams } = new URL(request.url)
const id = searchParams.get("id")
if (!id) return error("Missing id parameter")

// app/api/votes/route.ts:56-58
const { searchParams } = new URL(request.url)
const chatId = searchParams.get("chatId")
if (!chatId) return error("Missing chatId parameter")

// app/api/suggestions/route.ts:62-67
const { searchParams } = new URL(request.url)
const artifactId = searchParams.get("artifactId")
if (!artifactId) {
    return error("Missing artifactId parameter")
}
```

**Recommendation**: Use `validateQuery` helper from `lib/api`:

```typescript
// Simplified approach
import { validateQuery, uuidSchema } from "@/lib/api"

const { id } = await validateQuery(request, z.object({
    id: uuidSchema,
}))
```

---

## 2. Over-Engineered Routes

### 2.1 Chat Route Error Handling - Manual vs Centralized

**Problem**: The chat route (`app/api/chat/route.ts`) has 140+ lines of manual error handling instead of using the centralized `error()` helper.

#### Current Implementation (POST - lines 492-536):

```typescript
} catch (error) {
    logError("Chat request failed", error as Error, {
        modelId: selectedModelId,
    })

    if (error instanceof ValidationError) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        })
    }

    if (error instanceof UnauthorizedError) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        })
    }

    if (error instanceof ForbiddenError) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
        })
    }

    if (error instanceof RateLimitError) {
        const retryAfter = error.details?.retryAfter ?? 60
        return new Response(JSON.stringify({ error: error.message }), {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(retryAfter),
            },
        })
    }

    return new Response(
        JSON.stringify({ error: "An unexpected error occurred" }),
        {
            status: 500,
            headers: { "Content-Type": "application/json" },
        },
    )
}
```

#### Same pattern repeated in DELETE handler (lines 612-660)

**Recommendation**: Use the centralized `error()` helper:

```typescript
} catch (error) {
    logError("Chat request failed", error as Error, {
        modelId: selectedModelId,
    })
    return error(error)
}
```

**Impact**:
- Reduces code by ~100 lines
- Ensures consistent error responses
- Easier to maintain

**Caveat**: The streaming response for POST may need special handling. Consider:

```typescript
// For streaming endpoints, wrap in try-catch that writes to stream
} catch (error) {
    logError("Chat request failed", error as Error)
    // For pre-stream errors, use standard error response
    return error(error)
}
```

---

### 2.2 Guest Route Response Builders

**Problem**: Multiple response builder functions in guest route that could be consolidated.

#### Current Implementation:

```typescript
// app/api/auth/guest/route.ts:29-42
function createResponseWithRateHeaders(
    data: unknown,
    status: number,
    rateLimitResult: { limit: number; remaining: number; reset: number },
): NextResponse { /* ... */ }

// app/api/auth/guest/route.ts:47-71
function createRateLimitResponse(
    retryAfter: number,
    limit: number,
    remaining: number,
): NextResponse { /* ... */ }

// app/api/auth/guest/route.ts:73-85
function createCsrfForbiddenResponse(): NextResponse { /* ... */ }

// app/api/auth/guest/route.ts:87-99
function createGuestUnavailableResponse(): NextResponse { /* ... */ }
```

**Recommendation**: Use `lib/api` helpers:

```typescript
// Simplified approach
import { success, error, rateLimit, forbidden } from "@/lib/api"

// Success with rate headers
return withRateLimitHeaders(success({ user, isNewSession }), rateLimitResult)

// Rate limit exceeded
return rateLimit(retryAfter)

// CSRF failure
return forbidden("Invalid request origin")

// Config error
return error("Guest authentication is not configured", { status: 503 })
```

---

### 2.3 Reconnect Route - Empty Stream Creation

**Problem**: Empty stream creation is duplicated in reconnect route.

#### Current Implementation:

```typescript
// app/api/chat/[id]/reconnect/route.ts:209-230
const createEmptyResponse = (): Response => {
    const emptyStream = createUIMessageStream<UIMessage>({
        execute: () => {
            // Intentionally empty - returns empty SSE stream
        },
    })

    const headers = new Headers()
    headers.set("Content-Type", "text/event-stream; charset=utf-8")
    headers.set("Cache-Control", "no-cache")
    headers.set("Connection", "keep-alive")
    headers.set("Retry-After", String(backoffDelay))
    headers.set("X-Reconnect-Window", String(RECONNECT_WINDOW_SECONDS))

    return new Response(
        emptyStream.pipeThrough(new JsonToSseTransformStream()),
        { status: 200, headers },
    )
}

// Duplicated at lines 266-286 with additional X-Message-Age header
```

**Recommendation**: Extract to a single function:

```typescript
function createEmptyStreamResponse(options: {
    backoffDelay: number
    messageAge?: number
}): Response {
    const emptyStream = createUIMessageStream<UIMessage>({
        execute: () => {},
    })

    const headers = new Headers({
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Retry-After": String(options.backoffDelay),
        "X-Reconnect-Window": String(RECONNECT_WINDOW_SECONDS),
    })

    if (options.messageAge !== undefined) {
        headers.set("X-Message-Age", String(options.messageAge))
    }

    return new Response(
        emptyStream.pipeThrough(new JsonToSseTransformStream()),
        { status: 200, headers },
    )
}
```

---

## 3. Route Consolidation Opportunities

### 3.1 Auth Callback Routes

**Problem**: Two separate routes for NextAuth handling.

#### Current Structure:

```
app/api/auth/[...nextauth]/route.ts  (12 lines)
app/api/auth/callback/route.ts       (16 lines)
```

**Analysis**: The callback route is redundant - `[...nextauth]` already handles all auth routes including callbacks.

**Recommendation**: Remove `app/api/auth/callback/route.ts` and rely on the catch-all route.

**Impact**:
- Reduces file count
- Simplifies auth route structure
- No functional change (NextAuth handles both)

---

### 3.2 Chat Messages Route - Consider Server Action

**Problem**: The messages route is a thin wrapper around a server action.

#### Current Implementation:

```typescript
// app/api/chat/[id]/messages/route.ts (35 lines total)
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        await requireAuthAction()
        const { id: chatId } = await params

        const result = await getChatAction(chatId)

        if (!result.success) {
            return error(result.error ?? "Chat not found")
        }

        return success({ messages: result.messages ?? [] })
    } catch (err) {
        return error(err)
    }
}
```

**Analysis**: This route exists for client-side fetching but could be replaced with direct server action calls.

**Recommendation**: 
- Keep for now (provides REST API for external consumers)
- Consider adding pagination support if kept
- Document the decision in code comments

---

### 3.3 History Route Cursor Codec

**Problem**: Cursor codec is defined inline in history route but could be reusable.

#### Current Implementation:

```typescript
// app/api/history/route.ts:72-100
const CursorCodec = {
    encode(timestamp: Date): string { /* ... */ },
    decode(cursor: string): Date { /* ... */ },
}
```

**Recommendation**: Move to `lib/db/pagination.ts` for reuse:

```typescript
// lib/db/pagination.ts
export const CursorCodec = {
    encode(timestamp: Date): string {
        return Buffer.from(timestamp.toISOString()).toString("base64url")
    },
    decode(cursor: string): Date {
        try {
            const iso = Buffer.from(cursor, "base64url").toString("utf-8")
            const date = new Date(iso)
            if (Number.isNaN(date.getTime())) {
                throw new Error("Invalid date")
            }
            return date
        } catch {
            throw new ValidationError("Invalid cursor format", { cursor })
        }
    },
}
```

---

## 4. Unused or Redundant Code

### 4.1 Unused Imports

**Problem**: Some routes may have unused imports after refactoring.

**Recommendation**: Run `pnpm lint` to identify and remove unused imports.

---

### 4.2 Redundant Type Definitions

**Problem**: Some types are defined inline but exist elsewhere.

#### Example - Chat Route:

```typescript
// app/api/chat/route.ts:47-58
interface ChatPostBody {
    id: string
    message: UIMessage
    selectedChatModel: string
    selectedVisibilityType: "public" | "private"
    settings?: ChatSettings
}
```

**Recommendation**: Move to `features/chat/schemas/` for reuse:

```typescript
// features/chat/schemas/chat.schema.ts
export const chatPostBodySchema = z.object({
    id: uuidSchema,
    message: uiMessageSchema,
    selectedChatModel: z.string(),
    selectedVisibilityType: z.enum(["public", "private"]),
    settings: chatSettingsSchema.optional(),
})

export type ChatPostBody = z.infer<typeof chatPostBodySchema>
```

---

### 4.3 Duplicate Ownership Checks

**Problem**: Some routes have redundant ownership checks.

#### Example - Votes Route:

```typescript
// app/api/votes/route.ts:134-141
const chat = await chatRepository.findById(chatId)
if (!chat) {
    throw new NotFoundError("Chat", chatId)
}
if (chat.userId !== userId) {
    throw new ForbiddenError("You do not have access to this chat")
}

// Then later:
const chatWithMessages = await chatRepository.findWithMessages(chatId, ctx)
```

**Recommendation**: Use a single query with ownership check:

```typescript
// Simplified - service handles ownership
const result = await chatService.getChatWithMessages(chatId, ctx)
// Service throws ForbiddenError if not owner
```

---

## 5. Pattern Inconsistencies to Fix

### 5.1 Error Response Format

**Problem**: Inconsistent error response formats across routes.

#### Format A (Most routes):

```json
{ "success": false, "error": "Message" }
```

#### Format B (Guest route):

```json
{
    "success": false,
    "error": {
        "code": "RATE_LIMIT_EXCEEDED",
        "message": "Too many requests",
        "statusCode": 429
    }
}
```

**Recommendation**: Standardize on Format A with optional details:

```typescript
// lib/api/response.ts
export function error(
    err: unknown,
    options?: { status?: number }
): Response {
    // Standardize error format
    const message = err instanceof Error ? err.message : String(err)
    const status = options?.status ?? getErrorStatus(err)
    
    return Response.json(
        { success: false, error: message },
        { status }
    )
}
```

---

### 5.2 Rate Limit Check Pattern

**Problem**: Two different patterns for rate limit checking.

#### Pattern A (Check and Return):

```typescript
const rateLimitResult = await checkApiLimit(userId)
if (!rateLimitResult.success) {
    const retryAfterSeconds = getRetryAfter(rateLimitResult.reset)
    return rateLimit(retryAfterSeconds)
}
```

#### Pattern B (Throw on Exceeded):

```typescript
await requireRateLimit("api", userId)
// Throws RateLimitError if exceeded
```

**Recommendation**: Standardize on Pattern B (throw-based) for consistency:

```typescript
// Preferred approach
try {
    await requireRateLimit("api", userId)
    // ... continue with request
} catch (err) {
    return error(err)  // Handles RateLimitError with proper headers
}
```

---

## 6. Summary of Recommendations

### High Priority (Significant Impact)

| Issue | Recommendation | Lines Saved |
|-------|---------------|-------------|
| Chat route error handling | Use `error()` helper | ~100 lines |
| UUID validation | Standardize on `isValidUUID()` | ~20 lines |
| Rate limit headers | Create `withRateLimitHeaders()` | ~30 lines |

### Medium Priority (Moderate Impact)

| Issue | Recommendation | Benefit |
|-------|---------------|---------|
| Query param extraction | Use `validateQuery()` | Consistency |
| Guest response builders | Use `lib/api` helpers | Simplicity |
| Cursor codec | Move to `lib/db/pagination.ts` | Reusability |

### Low Priority (Minor Impact)

| Issue | Recommendation | Benefit |
|-------|---------------|---------|
| Auth callback route | Remove redundant route | Cleaner structure |
| Inline types | Move to schemas | Reusability |
| Empty stream creation | Extract to function | DRY |

---

## 7. Implementation Priority

### Phase 1: Quick Wins

1. Standardize UUID validation on `isValidUUID()`
2. Create `withRateLimitHeaders()` helper
3. Use `validateQuery()` for query parameter extraction

### Phase 2: Moderate Refactoring

1. Refactor chat route error handling to use `error()` helper
2. Simplify guest route response builders
3. Move cursor codec to shared location

### Phase 3: Structural Changes

1. Consider removing auth callback route
2. Consolidate type definitions into schemas
3. Review and remove any unused code

---

## 8. Estimated Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total API route lines | ~1,800 | ~1,600 | ~11% reduction |
| Duplicate patterns | 8 | 2 | 75% reduction |
| Error handling consistency | 60% | 95% | 35% improvement |
| Validation consistency | 50% | 90% | 40% improvement |

---

## 9. Risks and Considerations

### Breaking Changes

- Error response format changes could break client code
- Rate limit header changes could affect monitoring

### Mitigation

1. **Incremental rollout**: Apply changes to one route at a time
2. **Test coverage**: Ensure tests pass after each change
3. **Client compatibility**: Document any response format changes
4. **Feature flags**: Consider feature flags for significant changes

### Testing Strategy

1. Run existing tests after each change
2. Add integration tests for error responses
3. Test rate limiting behavior
4. Verify streaming endpoints still work correctly
