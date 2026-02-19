# API Routes Pattern Consistency

## Overview

This document analyzes pattern consistency across API routes, identifying variations in route handlers, error responses, authentication, validation, and other cross-cutting concerns.

---

## 1. Route Handler Patterns

### 1.1 Handler Structure Analysis

#### Pattern A: Standard Try-Catch with Auth Guard

**Used by**: artifacts, history, votes, suggestions, files/upload

```typescript
export async function GET(request: Request) {
    try {
        const userId = await requireAuthAction()
        
        // Rate limit check
        const rateLimitResult = await checkApiLimit(userId)
        if (!rateLimitResult.success) {
            return rateLimit(getRetryAfter(rateLimitResult.reset))
        }
        
        // ... business logic ...
        
        return success(data)
    } catch (err) {
        return error(err)
    }
}
```

**Consistency Score**: ✅ High - Used by 5 of 10 routes

---

#### Pattern B: Manual Error Handling

**Used by**: chat (POST, DELETE)

```typescript
export async function POST(request: Request) {
    try {
        // ... logic ...
    } catch (error) {
        if (error instanceof ValidationError) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            })
        }
        // ... more error types ...
        return new Response(/* ... */, { status: 500 })
    }
}
```

**Consistency Score**: ❌ Low - Deviates from standard pattern

---

#### Pattern C: Middleware-Wrapped Handler

**Used by**: health

```typescript
export const GET = publicMiddleware(healthHandler)
```

**Consistency Score**: ✅ Good - Appropriate for public endpoints

---

#### Pattern D: Direct Handler Export

**Used by**: auth/[...nextauth], auth/callback

```typescript
export const { GET, POST } = handlers
```

**Consistency Score**: ✅ Good - Appropriate for NextAuth delegation

---

#### Pattern E: Multi-Method with Custom Responses

**Used by**: auth/guest

```typescript
export async function POST(request: Request) {
    // Custom response builders
    return createResponseWithRateHeaders(/* ... */)
}

export async function GET(request: Request) {
    // Redirect-based flow
    return NextResponse.redirect(/* ... */)
}
```

**Consistency Score**: ⚠️ Medium - Custom patterns for specific needs

---

### 1.2 Handler Pattern Consistency Table

| Route | Pattern | Auth Guard | Error Helper | Rate Limit |
|-------|---------|------------|--------------|------------|
| chat POST | B | ✅ | ❌ | ✅ |
| chat DELETE | B | ✅ | ❌ | ✅ |
| chat/[id]/messages | A | ✅ | ✅ | ❌ |
| chat/[id]/reconnect | A+ | ✅ | ✅ | ✅ |
| artifacts GET | A | ✅ | ✅ | ✅ |
| artifacts POST | A | ✅ | ✅ | ✅ |
| artifacts PATCH | A | ✅ | ✅ | ✅ |
| artifacts DELETE | A | ✅ | ✅ | ✅ |
| history GET | A | ✅ | ✅ | ✅ |
| history DELETE | A | ✅ | ✅ | ✅ |
| suggestions GET | A | ✅ | ✅ | ✅ |
| votes GET | A | ✅ | ✅ | ✅ |
| votes PATCH | A | ✅ | ✅ | ✅ |
| files/upload POST | A | ✅ | ✅ | ✅ |
| auth/guest POST | E | ❌ | ❌ | ✅ |
| auth/guest GET | E | ❌ | ❌ | ✅ |
| auth/logout POST | A- | ❌ | ✅ | ❌ |
| auth/session GET | A- | ❌ | ✅ | ❌ |
| health GET | C | ❌ | ❌ | ✅ |

**Legend**:
- ✅ = Uses pattern correctly
- ❌ = Does not use pattern
- A+ = Pattern A with enhancements
- A- = Pattern A with omissions

---

## 2. Error Response Patterns

### 2.1 Error Response Format Analysis

#### Format A: Simple Error String

**Used by**: Most routes using `error()` helper

```json
{
    "success": false,
    "error": "Error message here"
}
```

---

#### Format B: Structured Error Object

**Used by**: auth/guest, reconnect

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

---

#### Format C: Manual Response

**Used by**: chat

```json
{
    "error": "Error message here"
}
```

Note: Missing `success: false` wrapper

---

### 2.2 Error Response Consistency Issues

| Issue | Routes Affected | Severity |
|-------|-----------------|----------|
| Missing `success: false` | chat | High |
| Different error structure | auth/guest, reconnect | Medium |
| Inconsistent status codes | chat (manual) | Low |

---

### 2.3 Recommended Standard Error Format

```typescript
interface ErrorResponse {
    success: false;
    error: string;
    code?: string;      // Optional error code
    details?: unknown;  // Optional additional details
}
```

**Implementation**:

```typescript
// lib/api/response.ts
export function error(
    err: unknown,
    options?: { status?: number }
): Response {
    if (err instanceof AppError) {
        return Response.json(
            {
                success: false,
                error: err.message,
                code: err.code,
                details: err.details,
            },
            { status: err.statusCode }
        )
    }
    
    return Response.json(
        {
            success: false,
            error: err instanceof Error ? err.message : "An unexpected error occurred",
        },
        { status: options?.status ?? 500 }
    )
}
```

---

## 3. Authentication Patterns

### 3.1 Auth Guard Usage

| Pattern | Function | Returns | Throws |
|---------|----------|---------|--------|
| Standard | `requireAuthAction()` | `userId` | `UnauthorizedError` |
| With Session | `getSession()` | `session \| null` | No |
| Non-Guest | `requireNonGuest()` | `void` | `UnauthorizedError` |
| Optional | `optionalAuth()` | `{ userId, isAuthenticated }` | No |
| Server Component | `requireAuth()` | `{ session, userId }` | Redirects |

---

### 3.2 Auth Pattern Consistency

| Route | Auth Pattern | Correct Usage |
|-------|-------------|---------------|
| chat POST | `getSession()` | ⚠️ Could use `requireAuthAction()` |
| chat DELETE | `getSession()` | ⚠️ Could use `requireAuthAction()` |
| chat/[id]/messages | `requireAuthAction()` | ✅ |
| chat/[id]/reconnect | `requireAuthAction()` | ✅ |
| artifacts | `requireAuthAction()` | ✅ |
| history | `requireAuthAction()` | ✅ |
| suggestions | `requireAuthAction()` | ✅ |
| votes GET | `requireAuthAction()` | ✅ |
| votes PATCH | `requireAuthAction()` + `requireNonGuest()` | ✅ |
| files/upload | `requireAuthAction()` | ✅ |
| auth/guest | None (public) | ✅ |
| auth/logout | None (clears session) | ✅ |
| auth/session | `getSession()` | ✅ |
| health | None (public) | ✅ |

---

### 3.3 Auth Pattern Recommendations

**For chat routes**: Consider refactoring to use `requireAuthAction()`:

```typescript
// Current
const session = await getSession()
if (!session?.user?.id) {
    throw new UnauthorizedError("Authentication required")
}

// Recommended
const userId = await requireAuthAction()
const session = await getSession() // If session object needed
```

---

## 4. Validation Patterns

### 4.1 Validation Approach Analysis

| Approach | Routes Using | Consistency |
|----------|-------------|-------------|
| Zod schema + `validateBody()` | artifacts | ✅ Good |
| Zod schema + `safeParse()` | votes, suggestions, history | ✅ Good |
| Helper function `isValidUUID()` | artifacts GET | ✅ Good |
| Inline regex | chat DELETE | ❌ Poor |
| Manual validation | chat POST | ❌ Poor |

---

### 4.2 Validation Pattern Examples

#### Good Pattern: Zod + validateBody

```typescript
// artifacts POST
const body = await validateBody(request, CreateArtifactSchema)
```

#### Good Pattern: Zod + safeParse

```typescript
// votes GET
const parsed = voteQuerySchema.safeParse({ chatId })
if (!parsed.success) {
    return error("Invalid chatId format")
}
```

#### Poor Pattern: Inline Regex

```typescript
// chat DELETE
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if (!uuidRegex.test(chatId)) {
    throw new ValidationError("Invalid chat ID format")
}
```

---

### 4.3 Recommended Validation Pattern

```typescript
// 1. Define schema in feature module
// features/chat/schemas/chat.schema.ts
export const chatIdParamSchema = z.object({
    id: uuidSchema,
})

// 2. Use in route
// app/api/chat/[id]/messages/route.ts
import { validateParams, chatIdParamSchema } from "@/lib/api"

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await validateParams(params, chatIdParamSchema)
    // ...
}
```

---

## 5. Rate Limiting Patterns

### 5.1 Rate Limit Check Patterns

#### Pattern A: Check and Return

```typescript
const rateLimitResult = await checkApiLimit(userId)
if (!rateLimitResult.success) {
    return rateLimit(getRetryAfter(rateLimitResult.reset))
}
```

**Used by**: artifacts, history, files/upload

---

#### Pattern B: Throw on Exceeded

```typescript
await requireRateLimit("api", userId)
```

**Used by**: reconnect, suggestions, votes

---

#### Pattern C: Manual Check with Custom Response

```typescript
const rateLimitResult = await checkChatLimit(session.user.id)
if (!rateLimitResult.success) {
    const retryAfter = getRetryAfter(rateLimitResult.reset)
    throw new RateLimitError("Too many requests", { retryAfter })
}
```

**Used by**: chat

---

### 5.2 Rate Limit Pattern Consistency

| Route | Pattern | Limiter | Consistency |
|-------|---------|---------|-------------|
| chat POST | C | chat | ⚠️ Custom |
| chat DELETE | C | chat | ⚠️ Custom |
| chat/[id]/reconnect | B | api | ✅ |
| artifacts GET | A | api | ✅ |
| artifacts POST | A | api | ✅ |
| artifacts PATCH | A | api | ✅ |
| artifacts DELETE | A | strict | ✅ |
| history GET | A | api | ✅ |
| history DELETE | A | strict | ✅ |
| suggestions GET | B | api | ✅ |
| votes GET | B | api | ✅ |
| votes PATCH | B | strict | ✅ |
| files/upload POST | A | upload | ✅ |
| auth/guest POST | A | guest | ✅ |
| health GET | Middleware | public | ✅ |

---

### 5.3 Recommended Rate Limit Pattern

Standardize on Pattern B (throw-based) for consistency:

```typescript
// Recommended approach
try {
    await requireRateLimit("api", userId)
    // ... business logic
} catch (err) {
    return error(err)  // Handles RateLimitError with proper headers
}
```

**Benefits**:
- Less boilerplate
- Consistent error handling
- Automatic header generation

---

## 6. Response Building Patterns

### 6.1 Success Response Patterns

#### Pattern A: `success()` Helper

```typescript
return success({ data })
```

**Used by**: Most routes

---

#### Pattern B: `Response.json()` Direct

```typescript
return Response.json(data, { status: 200 })
```

**Used by**: suggestions, votes PATCH

---

#### Pattern C: `NextResponse.json()`

```typescript
return NextResponse.json({ success: true, data }, { status: 200 })
```

**Used by**: auth/guest

---

### 6.2 Response Header Patterns

| Header Type | Routes Adding | Consistency |
|-------------|---------------|-------------|
| Rate limit headers | artifacts, history, files/upload | ✅ |
| Cache-Control | artifacts, history, suggestions | ⚠️ Varying values |
| Content-Type | All routes | ✅ |
| Retry-After | Rate limit responses | ✅ |

---

### 6.3 Cache-Control Header Values

| Route | Cache-Control | Rationale |
|-------|---------------|-----------|
| artifacts GET | `private, max-age=60` | User-specific, short cache |
| history GET | `private, max-age=30, stale-while-revalidate=60` | User-specific, revalidation |
| suggestions GET | `private, max-age=300` | User-specific, longer cache |
| health GET | `public, max-age=0` | No caching |

**Recommendation**: Document cache strategy in route comments.

---

## 7. Logging Patterns

### 7.1 Logging Usage

| Route | Log Level | Events Logged |
|-------|-----------|---------------|
| chat POST | Info, Warn, Error | Start, completion, errors, title generation |
| chat DELETE | Info, Error | Deletion, errors |
| chat/[id]/reconnect | Debug, Error | Reconnect attempts, errors |
| auth/guest | Info, Warn | Session creation, rate limits |
| votes PATCH | Info, Error | Vote recorded, errors |
| files/upload | (none) | ❌ Missing |
| health | (none) | ✅ Appropriate |

---

### 7.2 Logging Pattern Consistency

**Good Pattern** (chat):

```typescript
logInfo("Starting chat completion", { chatId, modelId, isNewChat, userId })
logInfo("Chat saved successfully", { chatId, isNewChat, messageCount, saveTime })
logError("Chat request failed", error, { modelId })
```

**Missing Logging** (files/upload):

```typescript
// No logging for upload success/failure
```

**Recommendation**: Add logging to files/upload:

```typescript
logInfo("File uploaded", { userId, filename, contentType, size })
logError("File upload failed", error, { userId })
```

---

## 8. Documentation Patterns

### 8.1 JSDoc Coverage

| Route | Module JSDoc | Handler JSDoc | Quality |
|-------|-------------|---------------|---------|
| chat | ✅ | ✅ | High |
| chat/[id]/messages | ✅ | ✅ | High |
| chat/[id]/reconnect | ✅ | ✅ | High |
| auth/[...nextauth] | ✅ | ❌ | Medium |
| auth/callback | ✅ | ✅ | High |
| auth/guest | ✅ | ✅ | High |
| auth/logout | ✅ | ✅ | High |
| auth/session | ✅ | ✅ | High |
| artifacts | ✅ | ✅ | High |
| history | ✅ | ✅ | High |
| suggestions | ✅ | ✅ | High |
| votes | ✅ | ✅ | High |
| files/upload | ✅ | ✅ | High |
| health | ✅ | ✅ | High |

---

### 8.2 Documentation Pattern

**Standard Pattern**:

```typescript
/**
 * Route Name API Route
 *
 * Brief description of what the route does.
 *
 * @module app/api/route-name
 */

/**
 * GET /api/route-name
 * Description of the endpoint.
 *
 * Query Parameters:
 * - param1: Description (required/optional)
 *
 * Response:
 * - 200: { ... }
 * - 400: { error: string }
 */
export async function GET(request: Request) { /* ... */ }
```

---

## 9. Pattern Consistency Scorecard

### Overall Scores

| Category | Score | Status |
|----------|-------|--------|
| Handler Structure | 75% | ⚠️ Needs improvement |
| Error Responses | 65% | ⚠️ Needs improvement |
| Authentication | 90% | ✅ Good |
| Validation | 70% | ⚠️ Needs improvement |
| Rate Limiting | 85% | ✅ Good |
| Response Building | 80% | ✅ Good |
| Logging | 70% | ⚠️ Needs improvement |
| Documentation | 95% | ✅ Excellent |

**Overall Consistency Score: 78.75%**

---

## 10. Recommendations Summary

### High Priority

1. **Standardize error handling**: Use `error()` helper in all routes
2. **Standardize UUID validation**: Use `isValidUUID()` or Zod schema
3. **Standardize rate limit pattern**: Use `requireRateLimit()` throw pattern

### Medium Priority

4. **Add logging to files/upload**: Track upload success/failure
5. **Standardize auth pattern**: Use `requireAuthAction()` consistently
6. **Document cache strategy**: Add comments explaining cache values

### Low Priority

7. **Consider removing auth/callback route**: Redundant with [...nextauth]
8. **Standardize response format**: Ensure all responses have `success` field

---

## 11. Ideal Route Template

```typescript
/**
 * [Resource] API Route
 *
 * [Description of what this route handles]
 *
 * @module app/api/[resource]
 */

import { error, success, validateBody, validateQuery, withRateLimitHeaders } from "@/lib/api"
import { requireAuthAction, requireRateLimit } from "@/lib/auth/guards"
import { [resource]Schema } from "@/features/[resource]/schemas"

/**
 * GET /api/[resource]?id=uuid
 * [Description]
 *
 * Query Parameters:
 * - id: Resource UUID (required)
 *
 * Response:
 * - 200: { success: true, data: Resource }
 * - 400: { success: false, error: string }
 * - 401: { success: false, error: string }
 * - 404: { success: false, error: string }
 */
export async function GET(request: Request) {
    try {
        // 1. Authentication
        const userId = await requireAuthAction()
        
        // 2. Rate limiting
        const rateLimitResult = await requireRateLimit("api", userId)
        
        // 3. Validation
        const { id } = await validateQuery(request, querySchema)
        
        // 4. Business logic (delegate to service/action)
        const data = await getResource(id, userId)
        
        // 5. Response
        return withRateLimitHeaders(success(data), rateLimitResult)
    } catch (err) {
        return error(err)
    }
}
```

---

## 12. Migration Path

### Phase 1: Error Handling (Week 1)

1. Update chat route to use `error()` helper
2. Verify all error responses include `success: false`
3. Run tests to ensure compatibility

### Phase 2: Validation (Week 2)

1. Replace inline regex with `isValidUUID()`
2. Move schemas to feature modules
3. Use `validateBody()` and `validateQuery()` consistently

### Phase 3: Rate Limiting (Week 3)

1. Standardize on `requireRateLimit()` pattern
2. Update rate limit header handling
3. Add `withRateLimitHeaders()` helper

### Phase 4: Logging (Week 4)

1. Add logging to files/upload
2. Standardize log message format
3. Add correlation IDs for request tracing
