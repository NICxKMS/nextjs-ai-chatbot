# Functional Mapping: Authentication & Security

## Overview

This document maps the authentication and security layer functions in `lib/auth/` and `lib/api/`, documenting their responsibilities, inputs, outputs, and relationships.

---

## Module Structure

```
lib/auth/
├── config.ts      # NextAuth.js v5 configuration
├── guards.ts      # Authorization guard functions
├── session.ts     # Session management utilities
└── index.ts       # Barrel exports

lib/api/
├── context.ts     # Request context with AsyncLocalStorage
├── response.ts    # API response builders
├── validation.ts  # Zod schema validation helpers
└── index.ts       # Barrel exports
```

---

## Authentication Module (`lib/auth/`)

### 1. Configuration (`config.ts`)

#### Functions

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| [`getAuthSecret()`](lib/auth/config.ts:25) | Retrieves NextAuth secret from environment | None | `string` (throws if missing) |

#### Configuration Objects

| Export | Type | Purpose |
|--------|------|---------|
| [`authConfig`](lib/auth/config.ts:122) | `NextAuthConfig` | Complete NextAuth.js v5 configuration |
| [`credentialsProvider`](lib/auth/config.ts:55) | `CredentialsProvider` | Email/password authentication provider |

#### Credentials Provider Flow

```typescript
// From config.ts lines 55-111
Credentials({
  name: "credentials",
  credentials: { email, password },
  async authorize(credentials) {
    // 1. Validate credentials format with Zod
    // 2. Find user by email in database
    // 3. Verify password with bcrypt
    // 4. Return user object for JWT storage
  }
})
```

#### NextAuth Callbacks

| Callback | Purpose | Location |
|----------|---------|----------|
| [`authorized`](lib/auth/config.ts:145) | Route protection in middleware | Controls access to protected routes |
| [`jwt`](lib/auth/config.ts:177) | Token customization | Adds user ID to JWT on sign-in |
| [`session`](lib/auth/config.ts:189) | Session customization | Exposes user ID from token to session |

---

### 2. Session Management (`session.ts`)

#### Types

| Type | Purpose | Structure |
|------|---------|-----------|
| [`AppUserType`](lib/auth/session.ts:31) | User type discriminator | `"guest" \| "regular"` |
| [`AppSessionUser`](lib/auth/session.ts:36) | Session user with type info | `{ id, type, email?, name?, image? }` |
| [`AppSession`](lib/auth/session.ts:52) | Application session type | `{ user: AppSessionUser, expires? }` |

#### Core Session Functions

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`getSession()`](lib/auth/session.ts:136) | Get current session (auth or guest) | `Promise<AppSession \| null>` | No |
| [`requireSession()`](lib/auth/session.ts:172) | Get session or throw | `Promise<AppSession>` | `UnauthorizedError` |
| [`requireAuthenticatedSession()`](lib/auth/session.ts:459) | Get non-guest session | `Promise<AppSession>` | `UnauthorizedError` |
| [`isAuthenticated()`](lib/auth/session.ts:194) | Check if logged in (not guest) | `Promise<boolean>` | No |
| [`getSessionUser()`](lib/auth/session.ts:212) | Get current user object | `Promise<AppSessionUser \| null>` | No |
| [`getUserId()`](lib/auth/session.ts:230) | Get current user ID | `Promise<string \| null>` | No |

#### Guest Session Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| [`isGuest(session)`](lib/auth/session.ts:253) | Check if session is guest | `boolean` |
| [`isGuestId(userId)`](lib/auth/session.ts:263) | Check if ID is guest ID | `boolean` |
| [`getGuestId()`](lib/auth/session.ts:272) | Get guest ID from session | `Promise<string \| null>` |
| [`getOrCreateGuestSession()`](lib/auth/session.ts:295) | Get or create guest session | `Promise<AppSession>` |
| [`createSessionContext()`](lib/auth/session.ts:436) | Create repo context from session | `Promise<{ userId, isGuest }>` |

#### Guest Session Implementation

```typescript
// Guest sessions use JWT-signed tokens
// Cookie: guest_id (httpOnly, 7-day TTL)
// JWT: HS256 signed with GUEST_JWT_SECRET (1-hour expiration)
// Automatic token rotation when near expiration
```

---

### 3. Authorization Guards (`guards.ts`)

#### Types

| Type | Purpose | Structure |
|------|---------|-----------|
| [`GuardOptions`](lib/auth/guards.ts:34) | Guard configuration | `{ redirectTo?: string }` |
| [`OwnedResource`](lib/auth/guards.ts:42) | Resource with owner | `{ userId: string }` |
| [`ChatResource`](lib/auth/guards.ts:50) | Chat with visibility | `{ userId: string, visibility?: "public" \| "private" }` |

#### Authentication Guards

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`requireAuth(options)`](lib/auth/guards.ts:78) | Server component auth | `Promise<{ session, userId }>` | `redirect` or `UnauthorizedError` |
| [`requireAuthAction()`](lib/auth/guards.ts:116) | Server action auth | `Promise<string>` (userId) | `UnauthorizedError` |
| [`requireAuthenticatedUser()`](lib/auth/guards.ts:140) | Non-guest auth | `Promise<string>` (userId) | `UnauthorizedError` |
| [`optionalAuth()`](lib/auth/guards.ts:165) | Optional auth info | `Promise<{ userId, isAuthenticated }>` | No |

#### Authorization Guards

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`requireOwnership(ownerId, userId?)`](lib/auth/guards.ts:199) | Verify resource ownership | `Promise<void>` | `UnauthorizedError`, `ForbiddenError` |
| [`canAccessChat(chat, userId?)`](lib/auth/guards.ts:233) | Check read access | `Promise<boolean>` | No |
| [`canModifyChat(chat, userId?)`](lib/auth/guards.ts:270) | Check write access | `Promise<boolean>` | No |
| [`requireChatAccess(chat)`](lib/auth/guards.ts:298) | Require read access | `Promise<void>` | `ForbiddenError` |
| [`requireChatModification(chat)`](lib/auth/guards.ts:319) | Require write access | `Promise<void>` | `ForbiddenError` |

#### Guest Guards

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`isGuestSession()`](lib/auth/guards.ts:347) | Check if guest | `Promise<boolean>` | No |
| [`requireNonGuest()`](lib/auth/guards.ts:363) | Require non-guest | `Promise<void>` | `UnauthorizedError` |

#### Higher-Order Guards

| Function | Purpose | Signature |
|----------|---------|-----------|
| [`withAuth(action)`](lib/auth/guards.ts:389) | Wrap action with auth | `(userId, ...args) => Promise<TResult>` |
| [`withOwnership(getOwnerId, action)`](lib/auth/guards.ts:415) | Wrap with ownership check | `(...args, userId) => Promise<TResult>` |

#### Rate Limiting Guards

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`requireRateLimit(limiter, id)`](lib/auth/guards.ts:448) | Apply rate limit | `Promise<RateLimitResult>` | `RateLimitError` |
| [`requireCustomRateLimit(config, id)`](lib/auth/guards.ts:488) | Custom rate limit | `Promise<RateLimitResult>` | `RateLimitError` |

#### Resource Guards

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`requireResource(resource, type)`](lib/auth/guards.ts:533) | Require non-null | `T` | `NotFoundError` |
| [`requireResourceWithId(resource, type, id)`](lib/auth/guards.ts:563) | Require with ID | `T` | `NotFoundError` |

#### Request Validation Guards

| Function | Purpose | Returns | Throws |
|----------|---------|---------|--------|
| [`parseTimestamp(value)`](lib/auth/guards.ts:592) | Parse ISO timestamp | `Date` | `ValidationError` |
| [`requireQueryParam(url, name)`](lib/auth/guards.ts:621) | Get required param | `string` | `ValidationError` |
| [`getQueryParam(url, name)`](lib/auth/guards.ts:648) | Get optional param | `string \| null` | No |

---

## API Module (`lib/api/`)

### 1. Request Context (`context.ts`)

#### Types

| Type | Purpose | Structure |
|------|---------|-----------|
| [`RequestContext`](lib/api/context.ts:21) | Request-scoped data | `{ requestId, userId?, isGuest?, startTime, method?, path?, clientIp?, userAgent? }` |
| [`ContextOptions`](lib/api/context.ts:43) | Context creation options | `{ requireAuth?, requestId?, userId?, isGuest? }` |
| [`ApiContext`](lib/api/context.ts:58) | Context with helpers | `RequestContext & { getDuration(), isAuthenticated(), isGuestUser() }` |

#### Context Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| [`generateRequestId()`](lib/api/context.ts:86) | Generate UUID | `string` |
| [`getOrCreateRequestId(headers)`](lib/api/context.ts:97) | Extract or generate ID | `string` |
| [`getRequestContext()`](lib/api/context.ts:138) | Get current context | `RequestContext \| undefined` |
| [`getRequestId()`](lib/api/context.ts:148) | Get current request ID | `string \| undefined` |
| [`getCurrentUserId()`](lib/api/context.ts:158) | Get user from context | `string \| undefined` |
| [`getRequestDuration()`](lib/api/context.ts:168) | Get elapsed time | `number \| undefined` |

#### Context Execution

| Function | Purpose | Signature |
|----------|---------|-----------|
| [`runWithRequestContext(fn, ctx)`](lib/api/context.ts:195) | Run sync fn in context | `<T>(fn, initialContext?) => T` |
| [`runWithRequestContextAsync(fn, ctx)`](lib/api/context.ts:236) | Run async fn in context | `<T>(fn, initialContext?) => Promise<T>` |
| [`updateRequestContext(updates)`](lib/api/context.ts:284) | Update current context | `void` |
| [`setRequestUser(userId, isGuest)`](lib/api/context.ts:321) | Set user in context | `void` |

#### Context Creation

| Function | Purpose | Returns |
|----------|---------|---------|
| [`createRequestContext(request, options)`](lib/api/context.ts:345) | Create from Request | `RequestContext` |
| [`getApiContext(request, options)`](lib/api/context.ts:381) | Create with helpers | `ApiContext` |

#### Request Utilities

| Function | Purpose | Returns |
|----------|---------|---------|
| [`getClientIp(request, options)`](lib/api/context.ts:421) | Extract client IP securely | `string` |
| [`getSearchParams(request)`](lib/api/context.ts:476) | Get URL search params | `URLSearchParams` |
| [`validateOrigin(request)`](lib/api/context.ts:488) | CSRF origin validation | `boolean` |
| [`formatRequestContext(ctx)`](lib/api/context.ts:544) | Format for logging | `string` |
| [`withRequestContext(handler)`](lib/api/context.ts:597) | Route wrapper | `RouteHandler` |

---

### 2. Response Builders (`response.ts`)

#### Success Responses

| Function | Purpose | Status |
|----------|---------|--------|
| [`success(data, options)`](lib/api/response.ts:64) | Success with data | 200 |
| [`successNoContent(options)`](lib/api/response.ts:99) | No content response | 204 |
| [`paginated(data, pagination, options)`](lib/api/response.ts:432) | Paginated data | 200 |

#### Error Responses

| Function | Purpose | Status |
|----------|---------|--------|
| [`error(error, options)`](lib/api/response.ts:136) | Generic error | 500 (or from error) |
| [`validationError(message, fields, options)`](lib/api/response.ts:202) | Validation error | 400 |
| [`notFound(resource, id?, options)`](lib/api/response.ts:254) | Not found error | 404 |
| [`unauthorized(message?, options)`](lib/api/response.ts:299) | Auth required | 401 |
| [`forbidden(message?, options)`](lib/api/response.ts:337) | Access denied | 403 |
| [`rateLimit(retryAfter?, options)`](lib/api/response.ts:375) | Rate limited | 429 |

#### Streaming & Utilities

| Function | Purpose | Returns |
|----------|---------|---------|
| [`stream(stream, options)`](lib/api/response.ts:475) | Streaming response | `Response` |
| [`json(data, options)`](lib/api/response.ts:552) | Custom JSON response | `Response` |
| [`redirect(url, status)`](lib/api/response.ts:579) | Redirect response | `Response` |
| [`withRequestId(response, id)`](lib/api/response.ts:590) | Add request ID header | `Response` |

---

### 3. Validation Helpers (`validation.ts`)

#### Types

| Type | Purpose | Structure |
|------|---------|-----------|
| [`ValidationResult<T>`](lib/api/validation.ts:22) | Safe parse result | `{ success: true, data: T } \| { success: false, error: ZodError }` |

#### Body Validation

| Function | Purpose | Throws |
|----------|---------|--------|
| [`validateBody(request, schema)`](lib/api/validation.ts:49) | Parse & validate JSON body | `ValidationError` |
| [`validateBodySafe(request, schema)`](lib/api/validation.ts:91) | Safe parse body | No |

#### Query Validation

| Function | Purpose | Throws |
|----------|---------|--------|
| [`validateQuery(params, schema)`](lib/api/validation.ts:139) | Parse & validate query | `ValidationError` |
| [`validateQuerySafe(params, schema)`](lib/api/validation.ts:183) | Safe parse query | No |

#### Params Validation

| Function | Purpose | Throws |
|----------|---------|--------|
| [`validateParams(params, schema)`](lib/api/validation.ts:227) | Parse & validate params | `ValidationError` |
| [`validateParamsSafe(params, schema)`](lib/api/validation.ts:250) | Safe parse params | No |

#### Form Data Validation

| Function | Purpose | Throws |
|----------|---------|--------|
| [`validateFormData(request, schema)`](lib/api/validation.ts:280) | Parse & validate form | `ValidationError` |

#### Common Schemas

| Schema | Purpose | Definition |
|--------|---------|------------|
| [`uuidSchema`](lib/api/validation.ts:330) | UUID validation | `z.string().uuid()` |
| [`paginationSchema`](lib/api/validation.ts:369) | Pagination params | `{ page: 1, limit: 20 }` |
| [`visibilitySchema`](lib/api/validation.ts:377) | Chat visibility | `"public" \| "private"` |
| [`voteTypeSchema`](lib/api/validation.ts:382) | Vote type | `"up" \| "down"` |
| [`artifactKindSchema`](lib/api/validation.ts:389) | Artifact type | `"text" \| "code" \| "image" \| "sheet"` |
| [`idParamSchema`](lib/api/validation.ts:394) | ID route param | `{ id: uuid }` |
| [`chatIdParamSchema`](lib/api/validation.ts:401) | Chat ID param | `{ chatId: uuid }` |

#### Schema Factories

| Function | Purpose | Returns |
|----------|---------|---------|
| [`createUUIDSchema(fieldName)`](lib/api/validation.ts:338) | UUID with custom message | `ZodString` |
| [`createRequiredStringSchema(name, max?)`](lib/api/validation.ts:352) | Required string | `ZodString` |

#### Utility Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| [`isValidUUID(value)`](lib/api/validation.ts:452) | Check if valid UUID | `boolean` |
| [`isValidEmail(value)`](lib/api/validation.ts:462) | Check if valid email | `boolean` |
| [`isValidUrl(value)`](lib/api/validation.ts:472) | Check if valid URL | `boolean` |

---

## Cross-Module Relationships

### Auth → API Context Integration

```typescript
// Session context feeds into API context
const session = await getSession();
setRequestUser(session.user.id, session.user.type === 'guest');
```

### Guards → Response Integration

```typescript
// Guards throw AppError subclasses
// API response builders handle them
try {
  await requireAuthAction();
} catch (error) {
  return error(error); // Converts to appropriate Response
}
```

### Validation → Guards Integration

```typescript
// Guards use validation helpers
const timestamp = parseTimestamp(value);  // From guards.ts
const body = await validateBody(request, schema);  // From validation.ts
```

---

## Summary Statistics

| Module | Functions | Types | Schemas |
|--------|-----------|-------|---------|
| `lib/auth/config.ts` | 1 | 1 | 1 |
| `lib/auth/session.ts` | 12 | 3 | 0 |
| `lib/auth/guards.ts` | 18 | 3 | 0 |
| `lib/api/context.ts` | 15 | 3 | 0 |
| `lib/api/response.ts` | 12 | 0 | 0 |
| `lib/api/validation.ts` | 14 | 1 | 9 |
| **Total** | **72** | **11** | **10** |
