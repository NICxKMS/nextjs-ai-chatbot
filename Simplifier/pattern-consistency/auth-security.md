# Pattern Consistency: Authentication & Security

## Overview

This document analyzes the consistency of patterns used across the authentication and security layer, including error handling, guard patterns, session access, and API conventions.

---

## 1. Error Handling Patterns

### 1.1 Throw-Based vs Return-Based Guards

**Finding**: The codebase consistently uses **throw-based guards** as specified in AGENTS.md.

**Consistent Pattern**:

```typescript
// lib/auth/guards.ts - All guards throw on failure
export async function requireAuthAction(): Promise<string> {
  const userId = await getUserId();
  if (!userId) {
    throw new UnauthorizedError("Authentication required");  // THROW
  }
  return userId;
}

export async function requireOwnership(resourceOwnerId: string, userId?: string): Promise<void> {
  const currentUserId = userId ?? (await getUserId());
  if (!currentUserId) {
    throw new UnauthorizedError("Authentication required");  // THROW
  }
  if (currentUserId !== resourceOwnerId) {
    throw new ForbiddenError("You do not have access to this resource");  // THROW
  }
}
```

**Exception**: Boolean check functions return values instead of throwing:

```typescript
// lib/auth/guards.ts:233-251 - Returns boolean
export async function canAccessChat(chat: ChatResource, userId?: string): Promise<boolean> {
  const currentUserId = userId ?? (await getUserId());
  if (!currentUserId) return chat.visibility === "public";  // RETURN
  if (currentUserId === chat.userId) return true;           // RETURN
  return chat.visibility === "public";                       // RETURN
}
```

**Verdict**: **CONSISTENT** - Guards that *require* something throw; predicates that *check* something return boolean.

---

### 1.2 Error Type Hierarchy

**Finding**: All errors extend `AppError` base class with consistent structure.

**Pattern**:

```typescript
// lib/errors/index.ts (referenced but not shown)
class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) { ... }
  
  toResponse(): Response { ... }
}

// Specific error types
class UnauthorizedError extends AppError { statusCode = 401; code = "UNAUTHORIZED"; }
class ForbiddenError extends AppError { statusCode = 403; code = "FORBIDDEN"; }
class NotFoundError extends AppError { statusCode = 404; code = "NOT_FOUND"; }
class ValidationError extends AppError { statusCode = 400; code = "VALIDATION_ERROR"; }
class RateLimitError extends AppError { statusCode = 429; code = "RATE_LIMIT_EXCEEDED"; }
```

**Usage Consistency**:

| Error Type | Used In | Message Pattern |
|------------|---------|-----------------|
| `UnauthorizedError` | `requireAuth`, `requireAuthAction`, `requireOwnership`, `requireSession` | "Authentication required" |
| `ForbiddenError` | `requireOwnership`, `requireChatAccess`, `requireChatModification` | "You do not have access/permission..." |
| `NotFoundError` | `requireResource`, `requireResourceWithId` | "{resourceType} not found" |
| `ValidationError` | `validateBody`, `parseTimestamp`, `requireQueryParam` | Specific to validation failure |
| `RateLimitError` | `requireRateLimit` | "Rate limit exceeded. Please try again in X seconds." |

**Verdict**: **CONSISTENT** - Error hierarchy is well-structured and consistently applied.

---

### 1.3 Error Response Integration

**Finding**: API response builders handle `AppError` instances automatically.

**Pattern**:

```typescript
// lib/api/response.ts:136-185
export function error(error: unknown, options?: { status?: number; requestId?: string }): Response {
  // Handle AppError instances - uses their toResponse() method
  if (isAppError(error)) {
    return error.toResponse();
  }
  
  // Handle generic Error instances
  if (error instanceof Error) {
    const apiError: ApiError = {
      code: "INTERNAL_ERROR",
      message: error.message,
      statusCode: options?.status ?? 500,
    };
    return new Response(JSON.stringify({ success: false, error: apiError }), { ... });
  }
  
  // Handle unknown error types
  return new Response(JSON.stringify({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }
  }), { status: 500, ... });
}
```

**Verdict**: **CONSISTENT** - Error handling flows from guards (throw) to API routes (catch) to response builders.

---

## 2. Guard Patterns

### 2.1 Guard Function Naming Convention

**Finding**: Clear naming convention distinguishes guard types.

| Prefix | Purpose | Returns | Throws |
|--------|---------|---------|--------|
| `require*` | Must have, throws on failure | Value or throw | Yes |
| `can*` | Check capability | `boolean` | No |
| `is*` | Check state | `boolean` | No |
| `get*` | Retrieve value | Value or `null` | No |
| `optional*` | Optional retrieval | Object with status | No |

**Examples**:

```typescript
// require* - Throws on failure
requireAuth()           // Returns { session, userId }
requireAuthAction()     // Returns userId
requireOwnership()      // Returns void
requireChatAccess()     // Returns void

// can* - Returns boolean
canAccessChat()         // Returns boolean
canModifyChat()         // Returns boolean

// is* - Returns boolean
isAuthenticated()       // Returns boolean
isGuest()               // Returns boolean
isGuestSession()        // Returns boolean
isGuestId()             // Returns boolean

// get* - Returns value or null
getSession()            // Returns AppSession | null
getUserId()             // Returns string | null
getGuestId()            // Returns string | null

// optional* - Returns object with status
optionalAuth()          // Returns { userId, isAuthenticated }
```

**Verdict**: **CONSISTENT** - Naming clearly indicates behavior.

---

### 2.2 Guard Options Pattern

**Finding**: Guards accept optional configuration objects.

**Pattern**:

```typescript
// lib/auth/guards.ts:34-37
export interface GuardOptions {
  redirectTo?: string;  // URL to redirect to if not authenticated
}

// Usage
export async function requireAuth(options: GuardOptions = {}): Promise<{ session: AppSession; userId: string }> {
  const session = await getSession();
  if (!session?.user.id) {
    if (options.redirectTo) {
      redirect(options.redirectTo);  // Next.js redirect
    }
    throw new UnauthorizedError("Authentication required");
  }
  return { session, userId: session.user.id };
}
```

**Verdict**: **CONSISTENT** - Options pattern used for configurable behavior.

---

### 2.3 Higher-Order Guard Pattern

**Finding**: HOF pattern for wrapping server actions is implemented.

**Pattern**:

```typescript
// lib/auth/guards.ts:389-396
export function withAuth<TArgs extends unknown[], TResult>(
  action: (userId: string, ...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const userId = await requireAuthAction();
    return action(userId, ...args);
  };
}

// lib/auth/guards.ts:415-427
export function withOwnership<TArgs extends unknown[], TResult>(
  getResourceOwnerId: (...args: TArgs) => Promise<string>,
  action: (...args: [...TArgs, string]) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const userId = await requireAuthAction();
    const ownerId = await getResourceOwnerId(...args);
    await requireOwnership(ownerId, userId);
    return action(...args, userId);
  };
}
```

**Verdict**: **CONSISTENT** - HOF pattern properly wraps actions with auth/ownership checks.

---

## 3. Session Access Patterns

### 3.1 Session Resolution Priority

**Finding**: Consistent priority order for session resolution.

**Pattern**:

```typescript
// lib/auth/session.ts:136-154
export async function getSession(): Promise<AppSession | null> {
  // Priority 1: Authenticated session (NextAuth)
  const authSession = await auth();
  if (authSession?.user?.id) {
    return {
      user: {
        id: authSession.user.id,
        type: "regular",
        email: authSession.user.email ?? null,
        name: authSession.user.name ?? null,
        image: authSession.user.image ?? null,
      },
      expires: authSession.expires,
    };
  }
  
  // Priority 2: Guest session (fallback)
  return getGuestSession();
}
```

**Verdict**: **CONSISTENT** - Authenticated sessions take priority over guest sessions.

---

### 3.2 Session Type Discrimination

**Finding**: `AppUserType` discriminates between user types.

**Pattern**:

```typescript
// lib/auth/session.ts:31
export type AppUserType = "guest" | "regular";

// lib/auth/session.ts:36-47
export interface AppSessionUser {
  id: string;
  type: AppUserType;  // Discriminator
  email?: string | null;     // Only for regular
  name?: string | null;      // Only for regular
  image?: string | null;     // Only for regular
}

// Type guard usage
export function isGuest(session: AppSession | null): boolean {
  return session?.user.type === "guest";
}
```

**Verdict**: **CONSISTENT** - Discriminated union pattern for session types.

---

### 3.3 Session Accessor Hierarchy

**Finding**: Clear hierarchy of session accessors.

```
getSession()           // Base: Returns session or null
    getUserId()        // Derived: Returns ID or null
        isAuthenticated()  // Derived: Returns boolean
        isGuest()         // Derived: Returns boolean
    getSessionUser()   // Derived: Returns user or null
```

**Pattern**:

```typescript
// All derived from getSession()
export async function getUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.user.type === "regular";
}

export function isGuest(session: AppSession | null): boolean {
  return session?.user.type === "guest";
}
```

**Verdict**: **CONSISTENT** - Clear derivation hierarchy.

---

## 4. API Request/Response Patterns

### 4.1 Request Context Pattern

**Finding**: AsyncLocalStorage pattern for request-scoped context.

**Pattern**:

```typescript
// lib/api/context.ts:75
const requestContextStorage = new AsyncLocalStorage<RequestContext>();

// Access pattern
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

// Execution pattern
export function withRequestContext(handler: RouteHandler): RouteHandler {
  return (request, routeContext) => {
    const initialContext = createRequestContext(request);
    return runWithRequestContext(() => handler(request, routeContext), initialContext);
  };
}
```

**Verdict**: **CONSISTENT** - AsyncLocalStorage pattern properly implemented.

---

### 4.2 Response Builder Pattern

**Finding**: Consistent response structure across all builders.

**Pattern**:

```typescript
// Success response structure
interface ApiResponse<T> {
  success: true;
  data: T;
}

// Error response structure
interface ApiResponse<never> {
  success: false;
  error: ApiError;
}

// Paginated response structure
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMetadata;
}
```

**All builders follow this pattern**:

```typescript
// Success
export function success<T>(data: T, options?: { status?: number; requestId?: string }): Response {
  const response: ApiResponse<T> = { success: true, data };
  return new Response(JSON.stringify(response), { status: options?.status ?? 200, headers: createHeaders(options?.requestId) });
}

// Error
export function error(error: unknown, options?: { status?: number; requestId?: string }): Response {
  // ... builds { success: false, error: ApiError }
}

// Paginated
export function paginated<T>(data: T[], pagination: PaginationMetadata, options?: { requestId?: string }): Response {
  const response: PaginatedResponse<T> = { success: true, data, pagination };
  // ...
}
```

**Verdict**: **CONSISTENT** - All responses follow `{ success, data/error }` pattern.

---

### 4.3 Request ID Propagation

**Finding**: Request IDs are consistently propagated through headers.

**Pattern**:

```typescript
// Generation
export function generateRequestId(): string {
  return randomUUID();
}

// Extraction
export function getOrCreateRequestId(headers: Headers): string {
  const existingId = headers.get("x-request-id");
  if (existingId && isValidRequestId(existingId)) return existingId;
  return generateRequestId();
}

// Response header
function createHeaders(requestId?: string): Headers {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (requestId) headers.set("X-Request-ID", requestId);
  return headers;
}
```

**Verdict**: **CONSISTENT** - Request ID flows from request to response.

---

### 4.4 Validation Pattern

**Finding**: Zod-based validation with consistent error formatting.

**Pattern**:

```typescript
// All validation functions follow this pattern
export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON", { type: "invalid_json" });
  }
  
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ValidationError(formatZodErrors(result.error), {
      errors: result.error.flatten().fieldErrors,
    });
  }
  return result.data;
}
```

**Error formatting**:

```typescript
// lib/api/validation.ts:415-440
function formatZodErrors(error: ZodError): string {
  const issues = error.issues;
  if (issues.length === 0) return "Validation failed";
  if (issues.length === 1) {
    const issue = issues[0];
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  }
  // Multiple errors - summarize
  const messages = issues.slice(0, 3).map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
  const remaining = issues.length - 3;
  if (remaining > 0) messages.push(`...and ${remaining} more errors`);
  return messages.join("; ");
}
```

**Verdict**: **CONSISTENT** - Zod validation with standardized error formatting.

---

## 5. Security Patterns

### 5.1 Client IP Extraction

**Finding**: Secure IP extraction with proxy chain handling.

**Pattern**:

```typescript
// lib/api/context.ts:421-468
export function getClientIp(request: Request, options?: { trustedProxyCount?: number }): string {
  const trustedCount = options?.trustedProxyCount ?? DEFAULT_TRUSTED_PROXY_COUNT;
  
  // 1. Cloudflare (most reliable)
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP.trim();
  
  // 2. Vercel with chain handling
  const vercelForwarded = request.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const ips = vercelForwarded.split(",").map((ip) => ip.trim());
    const clientIndex = Math.max(0, ips.length - 1 - trustedCount);
    const clientIP = ips[clientIndex];
    if (clientIP) return clientIP;
  }
  
  // 3. Standard X-Forwarded-For
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) { /* similar chain handling */ }
  
  // 4. Fallback
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  
  return "unknown";
}
```

**Verdict**: **CONSISTENT** - Secure IP extraction with proper proxy handling.

---

### 5.2 CSRF Protection

**Finding**: Origin validation for state-changing requests.

**Pattern**:

```typescript
// lib/api/context.ts:488-532
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const requestUrl = new URL(request.url);
  
  const allowedOrigins = new Set<string>();
  allowedOrigins.add(requestUrl.origin);
  
  if (process.env.VERCEL_URL) {
    allowedOrigins.add(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    allowedOrigins.add(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.NODE_ENV === "development") {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
  }
  
  if (origin) return allowedOrigins.has(origin);
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return allowedOrigins.has(refererUrl.origin);
    } catch { return false; }
  }
  
  return false;  // Reject requests without Origin/Referer
}
```

**Verdict**: **CONSISTENT** - CSRF protection via origin validation.

---

### 5.3 Guest Token Security

**Finding**: JWT-signed guest tokens with rotation.

**Pattern**:

```typescript
// Signing
async function signGuestToken(guestId: string, secret: Uint8Array): Promise<string> {
  return new SignJWT({ sub: guestId, type: "guest" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + GUEST_TOKEN_TTL.jwtExpiration)
    .sign(secret);
}

// Verification
const { payload } = await jwtVerify(token, secret);

// Rotation
function shouldRotateGuestToken(exp: unknown): boolean {
  if (typeof exp !== "number") return true;
  const timeRemaining = exp - Math.floor(Date.now() / 1000);
  return timeRemaining < GUEST_TOKEN_TTL.rotationThreshold;
}
```

**Verdict**: **CONSISTENT** - Secure guest session handling with JWT and rotation.

---

## 6. Documentation Patterns

### 6.1 JSDoc Comments

**Finding**: Comprehensive JSDoc with examples.

**Pattern**:

```typescript
/**
 * Guard for server actions - throws if not authenticated
 *
 * Use in server actions that require authentication.
 * Returns the user ID for use in the action.
 *
 * @returns The authenticated user ID
 * @throws UnauthorizedError if not authenticated
 *
 * @example
 * ```typescript
 * 'use server'
 * import { requireAuthAction } from '@/lib/auth/guards';
 *
 * export async function deleteChat(chatId: string) {
 *   const userId = await requireAuthAction();
 *   // ...perform action with userId
 * }
 * ```
 */
export async function requireAuthAction(): Promise<string> { ... }
```

**Verdict**: **CONSISTENT** - All public functions have JSDoc with purpose, params, returns, throws, and examples.

---

### 6.2 Module Headers

**Finding**: Each file has module-level documentation.

**Pattern**:

```typescript
/**
 * Authorization Guards
 *
 * Provides authorization guard functions for protecting server actions,
 * API routes, and page components.
 *
 * @module lib/auth/guards
 */
```

**Verdict**: **CONSISTENT** - Module headers explain purpose.

---

## 7. Pattern Consistency Summary

| Category | Pattern | Consistency | Notes |
|----------|---------|-------------|-------|
| Guard Style | Throw-based | **CONSISTENT** | `require*` throws, `can*`/`is*` returns |
| Error Hierarchy | AppError subclasses | **CONSISTENT** | All errors extend base class |
| Error Messages | Descriptive, user-friendly | **CONSISTENT** | Clear messages with context |
| Naming Convention | Prefix-based | **CONSISTENT** | `require`, `can`, `is`, `get`, `optional` |
| Session Resolution | Priority-based | **CONSISTENT** | Auth > Guest > null |
| Session Types | Discriminated union | **CONSISTENT** | `type: "guest" | "regular"` |
| Response Structure | `{ success, data/error }` | **CONSISTENT** | All responses follow pattern |
| Request ID | Header propagation | **CONSISTENT** | X-Request-ID throughout |
| Validation | Zod + ValidationError | **CONSISTENT** | Safe parse + throw pattern |
| IP Extraction | Proxy-aware | **CONSISTENT** | Chain handling with trusted count |
| CSRF | Origin validation | **CONSISTENT** | Allowed origins set |
| Guest Tokens | JWT + rotation | **CONSISTENT** | HS256 with sliding expiration |
| Documentation | JSDoc + examples | **CONSISTENT** | All public APIs documented |

---

## 8. Recommendations

### 8.1 Minor Inconsistencies to Address

1. **Optional `redirectTo` in `requireAuth`**: Only `requireAuth` supports redirect; other guards could benefit from similar options for server components.

2. **Safe vs Throwing Validation**: Having both `validateBody` and `validateBodySafe` creates API surface bloat. Consider standardizing on one pattern.

3. **Error Message Consistency**: Some errors include identifiers in messages, others don't:
   ```typescript
   // Inconsistent
   throw new NotFoundError(resourceType, identifier);  // "Chat not found: uuid"
   throw new ForbiddenError("You do not have access to this resource");  // No identifier
   ```

### 8.2 Pattern Enforcement

The codebase demonstrates strong pattern consistency. To maintain this:

1. **Add ESLint rules** to enforce naming conventions (`require*` throws, `can*` returns boolean)
2. **Document patterns** in a style guide for contributors
3. **Use code generation** for repetitive patterns (error responses, validation functions)

---

## 9. Conclusion

The authentication and security layer demonstrates **excellent pattern consistency**:

- **Throw-based guards** are used throughout for authorization
- **Error hierarchy** provides clear, typed errors
- **Naming conventions** clearly indicate function behavior
- **Response structure** is uniform across all endpoints
- **Security patterns** (IP extraction, CSRF, JWT) follow best practices
- **Documentation** is comprehensive and consistent

The only areas for improvement are minor API surface reductions (safe vs throwing variants) and optional feature parity across guard functions.