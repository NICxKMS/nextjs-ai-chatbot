# Simplification Opportunities: Authentication & Security

## Overview

This document identifies opportunities to simplify the authentication and security layer, including redundant patterns, over-engineered code, and consolidation possibilities.

---

## 1. Redundant Guard Patterns

### 1.1 Duplicate Session Fetching

**Problem**: Multiple guard functions call `getSession()` or `getUserId()` independently, causing redundant session lookups.

**Current Code**:

```typescript
// lib/auth/guards.ts:78-94
export async function requireAuth(options?: GuardOptions) {
  const session = await getSession();  // Session fetch #1
  if (!session?.user.id) { ... }
  return { session, userId: session.user.id };
}

// lib/auth/guards.ts:116-124
export async function requireAuthAction() {
  const userId = await getUserId();  // Calls getSession() internally - Session fetch #2
  if (!userId) { ... }
  return userId;
}

// lib/auth/guards.ts:140-148
export async function requireAuthenticatedUser() {
  const session = await getSession();  // Session fetch #3
  if (!session || session.user.type === "guest") { ... }
  return session.user.id;
}

// lib/auth/guards.ts:199-212
export async function requireOwnership(resourceOwnerId: string, userId?: string) {
  const currentUserId = userId ?? (await getUserId());  // Session fetch #4
  if (!currentUserId) { ... }
  if (currentUserId !== resourceOwnerId) { ... }
}
```

**Impact**: When multiple guards are used in sequence (e.g., auth + ownership), the session is fetched multiple times.

**Recommendation**: Create a guard context that caches the session:

```typescript
// PROPOSED: Guard context with cached session
interface GuardContext {
  session: AppSession | null;
  userId: string | null;
  isAuthenticated: boolean;
}

async function getGuardContext(): Promise<GuardContext> {
  const session = await getSession();
  return {
    session,
    userId: session?.user.id ?? null,
    isAuthenticated: session?.user.type === "regular",
  };
}

// Guards accept optional context to avoid re-fetching
export async function requireAuthAction(ctx?: GuardContext): Promise<string> {
  const context = ctx ?? await getGuardContext();
  if (!context.userId) throw new UnauthorizedError("Authentication required");
  return context.userId;
}
```

**Priority**: Medium | **Effort**: Medium | **Impact**: Performance optimization

---

### 1.2 Deprecated Guard Function

**Problem**: [`requireAuthWithSession()`](lib/auth/guards.ts:673) is marked as deprecated but still exists.

**Current Code**:

```typescript
// lib/auth/guards.ts:673-678
/**
 * @deprecated Use `requireAuth()` instead - it now returns the same type.
 * This function is kept for backward compatibility.
 */
export async function requireAuthWithSession(): Promise<{
  session: AppSession;
  userId: string;
}> {
  return requireAuth();
}
```

**Recommendation**: Remove deprecated function in next major version. Add migration guide to changelog.

**Priority**: Low | **Effort**: Trivial | **Impact**: Code cleanliness

---

### 1.3 Redundant Auth Check Patterns

**Problem**: `requireAuthenticatedUser()` and `requireAuthenticatedSession()` perform identical checks.

**Current Code**:

```typescript
// lib/auth/guards.ts:140-148
export async function requireAuthenticatedUser(): Promise<string> {
  const session = await getSession();
  if (!session || session.user.type === "guest") {
    throw new UnauthorizedError("Authentication required");
  }
  return session.user.id;
}

// lib/auth/session.ts:459-467
export async function requireAuthenticatedSession(): Promise<AppSession> {
  const session = await getSession();
  if (!session || session.user.type === "guest") {
    throw new UnauthorizedError("Authentication required");
  }
  return session;
}
```

**Recommendation**: Consolidate into a single function with configurable return type:

```typescript
// PROPOSED: Unified authenticated session guard
export async function requireAuthenticated(options?: { 
  returnSession?: boolean 
}): Promise<AppSession | string> {
  const session = await getSession();
  if (!session || session.user.type === "guest") {
    throw new UnauthorizedError("Authentication required");
  }
  return options?.returnSession ? session : session.user.id;
}

// Convenience wrappers
export const requireAuthenticatedUser = () => requireAuthenticated({ returnSession: false });
export const requireAuthenticatedSession = () => requireAuthenticated({ returnSession: true });
```

**Priority**: Low | **Effort**: Low | **Impact**: DRY improvement

---

## 2. Over-Engineered Validation

### 2.1 Duplicate Validation Logic

**Problem**: Both `lib/auth/guards.ts` and `lib/api/validation.ts` contain validation-related functions.

**Current Code**:

```typescript
// lib/auth/guards.ts:592-603
export function parseTimestamp(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError("Invalid timestamp format", { ... });
  }
  return date;
}

// lib/auth/guards.ts:621-631
export function requireQueryParam(url: URL, name: string): string {
  const value = url.searchParams.get(name);
  if (!value || value.trim() === "") {
    throw new ValidationError(`Missing required query parameter: ${name}`, { ... });
  }
  return value;
}

// lib/api/validation.ts:139-172
export function validateQuery<T>(searchParams: URLSearchParams | Request, schema: ZodSchema<T>): T {
  // ... similar validation logic
}
```

**Recommendation**: Move all validation to `lib/api/validation.ts`. Guards should only contain authorization logic.

```typescript
// PROPOSED: lib/api/validation.ts additions
export const timestampSchema = z.string().datetime();
export const parseTimestamp = (value: string) => timestampSchema.parse(value);

// lib/auth/guards.ts - REMOVE parseTimestamp, requireQueryParam, getQueryParam
// Use validateQuery with Zod schemas instead
```

**Priority**: Medium | **Effort**: Low | **Impact**: Better separation of concerns

---

### 2.2 Safe vs Throwing Validation Variants

**Problem**: Every validation function has both a throwing and non-throwing variant, doubling the API surface.

**Current Code**:

```typescript
// lib/api/validation.ts:49-71
export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  // ... throws ValidationError
}

// lib/api/validation.ts:91-114
export async function validateBodySafe<T>(request: Request, schema: ZodSchema<T>): Promise<ValidationResult<T>> {
  // ... returns result object
}

// Same pattern for validateQuery/validateQuerySafe, validateParams/validateParamsSafe
```

**Recommendation**: Standardize on the "safe" pattern and provide a helper for throwing:

```typescript
// PROPOSED: Single validation function with explicit handling
export async function validateBody<T>(
  request: Request, 
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  // Always returns result object
}

// Helper for throwing pattern
export function throwValidationResult<T>(result: ValidationResult<T>): T {
  if (!result.success) throw new ValidationError(formatZodErrors(result.error));
  return result.data;
}

// Usage
const result = await validateBody(request, schema);
if (!result.success) return validationError(result.error);
const body = result.data;

// Or throwing pattern
const body = throwValidationResult(await validateBody(request, schema));
```

**Priority**: Low | **Effort**: Medium | **Impact**: Reduced API surface, explicit error handling

---

### 2.3 Schema Factory Redundancy

**Problem**: Schema factory functions create nearly identical schemas.

**Current Code**:

```typescript
// lib/api/validation.ts:338-343
export function createUUIDSchema(fieldName: string) {
  return z.string().min(1, `${fieldName} is required`).uuid(`${fieldName} must be a valid UUID`);
}

// lib/api/validation.ts:352-364
export function createRequiredStringSchema(fieldName: string, maxLength?: number) {
  let schema = z.string().min(1, `${fieldName} is required`);
  if (maxLength !== undefined) {
    schema = schema.max(maxLength, `${fieldName} must be at most ${maxLength} characters`);
  }
  return schema;
}
```

**Recommendation**: Use Zod's built-in methods and template:

```typescript
// PROPOSED: Schema builder with fluent API
export const schemaFor = {
  uuid: (field: string) => z.string().uuid().describe(`${field} UUID`),
  requiredString: (field: string, opts?: { max?: number; min?: number }) => 
    z.string({ required_error: `${field} is required` })
      .min(opts?.min ?? 1)
      .max(opts?.max ?? Infinity),
  // ... other builders
};
```

**Priority**: Low | **Effort**: Low | **Impact**: Cleaner schema definitions

---

## 3. Context Duplication

### 3.1 AsyncLocalStorage Context Building

**Problem**: `runWithRequestContext()` and `runWithRequestContextAsync()` are nearly identical.

**Current Code**:

```typescript
// lib/api/context.ts:195-225
export function runWithRequestContext<T>(
  fn: () => T,
  initialContext?: Partial<RequestContext>,
): T {
  const context: RequestContext = {
    requestId: initialContext?.requestId ?? generateRequestId(),
    startTime: initialContext?.startTime ?? Date.now(),
  };
  // ... 6 if statements to copy optional properties
  return requestContextStorage.run(context, fn);
}

// lib/api/context.ts:236-266
export async function runWithRequestContextAsync<T>(
  fn: () => Promise<T>,
  initialContext?: Partial<RequestContext>,
): Promise<T> {
  const context: RequestContext = {
    requestId: initialContext?.requestId ?? generateRequestId(),
    startTime: initialContext?.startTime ?? Date.now(),
  };
  // ... same 6 if statements
  return requestContextStorage.run(context, fn);
}
```

**Recommendation**: Extract context creation and use single function:

```typescript
// PROPOSED: Unified context runner
function buildRequestContext(initial?: Partial<RequestContext>): RequestContext {
  return {
    requestId: initial?.requestId ?? generateRequestId(),
    startTime: initial?.startTime ?? Date.now(),
    ...(initial?.userId !== undefined && { userId: initial.userId }),
    ...(initial?.isGuest !== undefined && { isGuest: initial.isGuest }),
    ...(initial?.method !== undefined && { method: initial.method }),
    ...(initial?.path !== undefined && { path: initial.path }),
    ...(initial?.clientIp !== undefined && { clientIp: initial.clientIp }),
    ...(initial?.userAgent !== undefined && { userAgent: initial.userAgent }),
  };
}

export function runWithRequestContext<T>(
  fn: () => T | Promise<T>,
  initialContext?: Partial<RequestContext>,
): T | Promise<T> {
  return requestContextStorage.run(buildRequestContext(initialContext), fn);
}
```

**Priority**: Medium | **Effort**: Low | **Impact**: DRY improvement

---

### 3.2 Context Update Verbosity

**Problem**: `updateRequestContext()` uses verbose if-statements for each property.

**Current Code**:

```typescript
// lib/api/context.ts:284-312
export function updateRequestContext(
  updates: Partial<Omit<RequestContext, "requestId" | "startTime">>,
): void {
  const current = requestContextStorage.getStore();
  if (!current) { console.warn(...); return; }
  
  if (updates.userId !== undefined) { current.userId = updates.userId; }
  if (updates.isGuest !== undefined) { current.isGuest = updates.isGuest; }
  if (updates.method !== undefined) { current.method = updates.method; }
  if (updates.path !== undefined) { current.path = updates.path; }
  if (updates.clientIp !== undefined) { current.clientIp = updates.clientIp; }
  if (updates.userAgent !== undefined) { current.userAgent = updates.userAgent; }
}
```

**Recommendation**: Use Object.assign with filtering:

```typescript
// PROPOSED: Simplified context update
export function updateRequestContext(
  updates: Partial<Omit<RequestContext, "requestId" | "startTime">>,
): void {
  const current = requestContextStorage.getStore();
  if (!current) {
    console.warn("updateRequestContext called outside of request scope");
    return;
  }
  
  // Filter out undefined values and assign
  const definedUpdates = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  );
  Object.assign(current, definedUpdates);
}
```

**Priority**: Low | **Effort**: Trivial | **Impact**: Code cleanliness

---

## 4. Response Builder Redundancy

### 4.1 Error Response Pattern

**Problem**: Each error response builder follows the same pattern with slight variations.

**Current Code**:

```typescript
// lib/api/response.ts:299-321
export function unauthorized(message = "Authentication required", options?: { requestId?: string }): Response {
  const apiError: ApiError = { code: "UNAUTHORIZED", message, statusCode: 401 };
  const response: ApiResponse<never> = { success: false, error: apiError };
  return new Response(JSON.stringify(response), { status: 401, headers: createHeaders(options?.requestId) });
}

// lib/api/response.ts:337-359
export function forbidden(message = "Access denied", options?: { requestId?: string }): Response {
  const apiError: ApiError = { code: "FORBIDDEN", message, statusCode: 403 };
  const response: ApiResponse<never> = { success: false, error: apiError };
  return new Response(JSON.stringify(response), { status: 403, headers: createHeaders(options?.requestId) });
}

// lib/api/response.ts:375-406
export function rateLimit(retryAfter?: number, options?: { requestId?: string }): Response {
  const apiError: ApiError = { code: "RATE_LIMIT_EXCEEDED", message: "...", statusCode: 429, ... };
  const response: ApiResponse<never> = { success: false, error: apiError };
  // ... special header handling
}
```

**Recommendation**: Create a factory for error responses:

```typescript
// PROPOSED: Error response factory
function createErrorResponse(
  code: ApiError["code"],
  statusCode: number,
  message: string,
  options?: { requestId?: string; details?: Record<string, unknown> },
): Response {
  const apiError: ApiError = { code, message, statusCode, details: options?.details };
  return new Response(JSON.stringify({ success: false, error: apiError }), {
    status: statusCode,
    headers: createHeaders(options?.requestId),
  });
}

// Simplified builders
export const unauthorized = (msg = "Authentication required", opts?) => 
  createErrorResponse("UNAUTHORIZED", 401, msg, opts);
export const forbidden = (msg = "Access denied", opts?) => 
  createErrorResponse("FORBIDDEN", 403, msg, opts);
export const notFound = (resource: string, id?: string, opts?) => 
  createErrorResponse("NOT_FOUND", 404, `${resource} not found${id ? `: ${id}` : ""}`, { ...opts, details: { resource, id } });
```

**Priority**: Medium | **Effort**: Low | **Impact**: DRY improvement, easier maintenance

---

### 4.2 Streaming Response Complexity

**Problem**: The [`stream()`](lib/api/response.ts:475) function handles both direct streams and stream creator functions with complex logic.

**Current Code**:

```typescript
// lib/api/response.ts:475-533
export function stream(
  stream: ReadableStream<Uint8Array> | (() => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>),
  options?: { contentType?: string; requestId?: string },
): Response {
  // ... header setup ...
  
  // Handle stream creator function
  if (typeof stream === "function") {
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            const streamInstance = await stream();
            const reader = streamInstance.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) { controller.close(); break; }
                controller.enqueue(value);
              }
            } finally { reader.releaseLock(); }
          } catch (error) { controller.error(error); }
        },
      }),
      { headers },
    );
  }
  
  // Return response with direct stream
  return new Response(stream, { headers });
}
```

**Recommendation**: Split into two functions:

```typescript
// PROPOSED: Separate stream handlers
export function streamDirect(
  stream: ReadableStream<Uint8Array>,
  options?: StreamOptions,
): Response {
  return new Response(stream, { headers: buildStreamHeaders(options) });
}

export function streamLazy(
  createStream: () => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>,
  options?: StreamOptions,
): Response {
  return new Response(
    new ReadableStream({
      async start(controller) {
        try {
          const stream = await createStream();
          const reader = stream.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.close(); break; }
              controller.enqueue(value);
            }
          } finally { reader.releaseLock(); }
        } catch (e) { controller.error(e); }
      },
    }),
    { headers: buildStreamHeaders(options) },
  );
}

// Backward-compatible stream() that delegates
export function stream(source, options?) {
  return typeof source === "function" 
    ? streamLazy(source, options) 
    : streamDirect(source, options);
}
```

**Priority**: Low | **Effort**: Low | **Impact**: Clarity, testability

---

## 5. Guest Session Complexity

### 5.1 Token Rotation in Get vs Create

**Problem**: Token rotation logic is embedded in [`getGuestSession()`](lib/auth/session.ts:318), making it harder to test and reason about.

**Current Code**:

```typescript
// lib/auth/session.ts:351-364 (inside getGuestSession)
if (shouldRotateGuestToken(payload.exp)) {
  try {
    const rotatedToken = await signGuestToken(payload.sub, secret);
    cookieStore.set(GUEST_COOKIE_NAME, rotatedToken, { ... });
  } catch {
    // Cookies may not be writable in all contexts
  }
}
```

**Recommendation**: Extract token rotation to a separate function:

```typescript
// PROPOSED: Extracted token rotation
async function rotateGuestTokenIfNeeded(
  payload: { sub: string; exp?: unknown },
  secret: Uint8Array,
): Promise<void> {
  if (!shouldRotateGuestToken(payload.exp)) return;
  
  try {
    const rotatedToken = await signGuestToken(payload.sub, secret);
    const cookieStore = await cookies();
    cookieStore.set(GUEST_COOKIE_NAME, rotatedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CACHE_TTL.guest,
      path: "/",
    });
  } catch {
    // Cookies may not be writable in all contexts
  }
}
```

**Priority**: Low | **Effort**: Low | **Impact**: Testability, SRP

---

### 5.2 Guest Session Validation Chain

**Problem**: Guest session validation has multiple early returns, making the happy path unclear.

**Current Code**:

```typescript
// lib/auth/session.ts:318-377
async function getGuestSession(): Promise<AppSession | null> {
  try {
    const secret = getGuestJwtSecret();
    if (!secret) return null;  // Early return #1
    
    const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;
    if (!token) return null;  // Early return #2
    
    const { payload } = await jwtVerify(token, secret);
    
    if (!payload.sub || typeof payload.sub !== "string") return null;  // Early return #3
    if (!payload.sub.startsWith(GUEST_ID_PREFIX)) return null;  // Early return #4
    if (payload.type !== "guest") return null;  // Early return #5
    
    // ... token rotation ...
    
    return { user: { id: payload.sub, type: "guest" } };
  } catch {
    return null;  // Early return #6
  }
}
```

**Recommendation**: Use guard pattern with single return:

```typescript
// PROPOSED: Guard pattern validation
function validateGuestPayload(payload: unknown): payload is { sub: string; type: "guest"; exp?: number } | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  
  if (typeof p.sub !== "string") return null;
  if (!p.sub.startsWith(GUEST_ID_PREFIX)) return null;
  if (p.type !== "guest") return null;
  
  return { sub: p.sub, type: "guest", exp: typeof p.exp === "number" ? p.exp : undefined };
}

async function getGuestSession(): Promise<AppSession | null> {
  const secret = getGuestJwtSecret();
  if (!secret) return null;
  
  const token = (await cookies()).get(GUEST_COOKIE_NAME)?.value;
  if (!token) return null;
  
  try {
    const { payload } = await jwtVerify(token, secret);
    const validated = validateGuestPayload(payload);
    if (!validated) return null;
    
    await rotateGuestTokenIfNeeded(validated, secret);
    
    return { user: { id: validated.sub, type: "guest" } };
  } catch {
    return null;
  }
}
```

**Priority**: Low | **Effort**: Low | **Impact**: Readability

---

## 6. Summary Table

| Issue | Location | Priority | Effort | Impact |
|-------|----------|----------|--------|--------|
| Duplicate session fetching | guards.ts | Medium | Medium | Performance |
| Deprecated guard function | guards.ts:673 | Low | Trivial | Cleanliness |
| Redundant auth checks | guards.ts, session.ts | Low | Low | DRY |
| Validation in guards | guards.ts:592-651 | Medium | Low | Separation |
| Safe/throwing validation variants | validation.ts | Low | Medium | API surface |
| Schema factory redundancy | validation.ts:338-364 | Low | Low | Cleanliness |
| Context runner duplication | context.ts:195-266 | Medium | Low | DRY |
| Context update verbosity | context.ts:284-312 | Low | Trivial | Cleanliness |
| Error response pattern | response.ts | Medium | Low | DRY |
| Streaming complexity | response.ts:475-533 | Low | Low | Clarity |
| Token rotation embedding | session.ts:351-364 | Low | Low | Testability |
| Guest validation chain | session.ts:318-377 | Low | Low | Readability |

---

## 7. Recommended Implementation Order

1. **High Impact, Low Effort**:
   - Remove deprecated `requireAuthWithSession()`
   - Simplify `updateRequestContext()` with Object.assign
   - Create error response factory

2. **Medium Impact, Medium Effort**:
   - Consolidate session fetching with guard context
   - Move validation functions from guards to validation module
   - Unify context runners

3. **Lower Priority**:
   - Standardize validation API (safe vs throwing)
   - Split streaming function
   - Extract guest token rotation