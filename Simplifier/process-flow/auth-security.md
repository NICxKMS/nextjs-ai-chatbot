# Process Flow: Authentication & Security

## Overview

This document details the execution flows for authentication, authorization, and API request handling in the auth/security layer.

---

## 1. Authentication Flows

### 1.1 Login Flow (Credentials Provider)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOGIN FLOW                                         │
└─────────────────────────────────────────────────────────────────────────────┘

User                Frontend              API Route            NextAuth         Database
  │                    │                     │                   │                │
  │  Submit Form       │                     │                   │                │
  │───────────────────>│                     │                   │                │
  │                    │  POST /api/auth/... │                   │                │
  │                    │────────────────────>│                   │                │
  │                    │                     │  signIn()         │                │
  │                    │                     │──────────────────>│                │
  │                    │                     │                   │  authorize()  │
  │                    │                     │                   │───────────────>│
  │                    │                     │                   │  Find user    │
  │                    │                     │                   │<───────────────│
  │                    │                     │                   │  Verify pwd   │
  │                    │                     │                   │───────────────>│
  │                    │                     │                   │<───────────────│
  │                    │                     │  Session + JWT    │                │
  │                    │                     │<──────────────────│                │
  │                    │  Set-Cookie         │                   │                │
  │                    │<────────────────────│                   │                │
  │  Redirect /chat    │                     │                   │                │
  │<───────────────────│                     │                   │                │
```

#### Code Path

```typescript
// 1. Form submission triggers NextAuth signIn
// app/(auth)/login/page.tsx → signIn('credentials', { email, password })

// 2. NextAuth invokes credentials provider
// lib/auth/config.ts:61-110
async authorize(credentials) {
  // 2a. Validate input format
  const parsed = credentialsSchema.safeParse(credentials);
  if (!parsed.success) return null;
  
  // 2b. Query database for user
  const [foundUser] = await db.select().from(user).where(eq(user.email, email));
  if (!foundUser) return null;
  
  // 2c. Verify password
  const isValid = await compare(password, foundUser.passwordHash);
  if (!isValid) return null;
  
  // 2d. Return user for JWT storage
  return { id: foundUser.id, email: foundUser.email };
}

// 3. JWT callback adds user ID to token
// lib/auth/config.ts:177-182
jwt({ token, user }) {
  if (user) token.id = user.id;
  return token;
}

// 4. Session callback exposes ID
// lib/auth/config.ts:189-194
session({ session, token }) {
  if (token && session.user) session.user.id = token.id;
  return session;
}
```

---

### 1.2 Guest Session Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GUEST SESSION FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

Request             Middleware           getOrCreateGuestSession()
  │                    │                         │
  │  No auth cookie    │                         │
  │───────────────────>│                         │
  │                    │  Check session         │
  │                    │────────────────────────>│
  │                    │                         │  getGuestSession()
  │                    │                         │  returns null
  │                    │                         │
  │                    │                         │  createGuestSession()
  │                    │                         │  ├─ Generate guest:UUID
  │                    │                         │  ├─ Sign JWT (HS256)
  │                    │                         │  └─ Set cookie (7 days)
  │                    │<────────────────────────│
  │  Set-Cookie        │                         │
  │<───────────────────│                         │
```

#### Code Path

```typescript
// 1. Check for existing guest session
// lib/auth/session.ts:318-377
async function getGuestSession(): Promise<AppSession | null> {
  const secret = getGuestJwtSecret();
  if (!secret) return null;
  
  const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  if (!token) return null;
  
  // Verify JWT signature
  const { payload } = await jwtVerify(token, secret);
  
  // Validate payload structure
  if (!payload.sub?.startsWith(GUEST_ID_PREFIX)) return null;
  if (payload.type !== "guest") return null;
  
  // Rotate token if near expiration
  if (shouldRotateGuestToken(payload.exp)) {
    // Re-sign and update cookie
  }
  
  return { user: { id: payload.sub, type: "guest" } };
}

// 2. Create new guest session
// lib/auth/session.ts:388-419
async function createGuestSession(): Promise<AppSession> {
  const guestId = `${GUEST_ID_PREFIX}${crypto.randomUUID()}`;
  const token = await signGuestToken(guestId, secret);
  
  cookieStore.set(GUEST_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: CACHE_TTL.guest, // 7 days
    path: "/",
  });
  
  return { user: { id: guestId, type: "guest" } };
}
```

---

### 1.3 Session Resolution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SESSION RESOLUTION                                       │
└─────────────────────────────────────────────────────────────────────────────┘

                    getSession()
                         │
                         ▼
              ┌─────────────────────┐
              │  Check NextAuth     │
              │  auth() session     │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │  auth()?.user?.id?  │
              └──────────┬──────────┘
                    │         │
              Yes   │         │  No
                    ▼         ▼
        ┌───────────────┐  ┌─────────────────┐
        │ Return        │  │ getGuestSession()│
        │ AppSession    │  │ (fallback)       │
        │ type: regular │  └────────┬────────┘
        └───────────────┘           │
                              ┌─────▼─────┐
                              │ Guest or  │
                              │ null      │
                              └───────────┘
```

#### Code Path

```typescript
// lib/auth/session.ts:136-154
export async function getSession(): Promise<AppSession | null> {
  // Priority 1: Authenticated session
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

---

## 2. Authorization Guard Flows

### 2.1 Route Protection (Middleware)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ROUTE PROTECTION FLOW                                    │
└─────────────────────────────────────────────────────────────────────────────┘

Request             authorized() callback           Response
  │                        │                            │
  │  Incoming request      │                            │
  │───────────────────────>│                            │
  │                        │                            │
  │                        │  Check auth?.user         │
  │                        │  isLoggedIn = !!auth?.user │
  │                        │                            │
  │                        │  ┌─────────────────────┐   │
  │                        │  │ isPublicRoute?      │   │
  │                        │  │ /, /api/auth/*,     │   │
  │                        │  │ /api/health         │   │
  │                        │  └──────────┬──────────┘   │
  │                        │             │              │
  │                        │     Yes     │     No       │
  │                        │     ▼       ▼              │
  │                        │  return   Continue        │
  │                        │  true                    │
  │                        │             │              │
  │                        │  ┌──────────▼──────────┐   │
  │                        │  │ isOnAuthPage?       │   │
  │                        │  │ /login, /register   │   │
  │                        │  └──────────┬──────────┘   │
  │                        │             │              │
  │                        │  isLoggedIn?│              │
  │                        │     │       │              │
  │                        │  Yes│       │No            │
  │                        │     ▼       ▼              │
  │                        │  redirect  return true    │
  │                        │  /chat                   │
  │                        │             │              │
  │                        │  ┌──────────▼──────────┐   │
  │                        │  │ Protected route?    │   │
  │                        │  │ return isLoggedIn   │   │
  │                        │  └─────────────────────┘   │
  │<───────────────────────│                            │
```

#### Code Path

```typescript
// lib/auth/config.ts:145-171
authorized({ auth, request: { nextUrl } }) {
  const isLoggedIn = !!auth?.user;
  const isOnAuthPage = nextUrl.pathname.startsWith("/login") || 
                       nextUrl.pathname.startsWith("/register");
  const isPublicRoute = nextUrl.pathname === "/" ||
                        nextUrl.pathname.startsWith("/api/auth") ||
                        nextUrl.pathname.startsWith("/api/health");
  
  if (isPublicRoute) return true;
  
  if (isOnAuthPage) {
    if (isLoggedIn) return Response.redirect(new URL("/chat", nextUrl));
    return true;
  }
  
  return isLoggedIn; // Protected routes require login
}
```

---

### 2.2 Server Component Guard Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  requireAuth() FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────┘

Server Component    requireAuth()         getSession()        Error/Redirect
       │                 │                    │                    │
       │  await requireAuth()                │                    │
       │────────────────>│                    │                    │
       │                 │  getSession()      │                    │
       │                 │───────────────────>│                    │
       │                 │                    │                    │
       │                 │  session?.user.id? │                    │
       │                 │<───────────────────│                    │
       │                 │         │          │                    │
       │                 │    null │   exists │                    │
       │                 │         ▼          ▼                    │
       │                 │  redirectTo?    Return {               │
       │                 │      │          session, userId        │
       │                 │   Yes│   No       }                    │
       │                 │      ▼    ▼                            │
       │                 │  redirect  throw                        │
       │                 │            UnauthorizedError            │
       │<────────────────│────────────────────────────────────────>│
```

#### Code Path

```typescript
// lib/auth/guards.ts:78-94
export async function requireAuth(
  options: GuardOptions = {},
): Promise<{ session: AppSession; userId: string }> {
  const session = await getSession();
  
  if (!session?.user.id) {
    if (options.redirectTo) {
      redirect(options.redirectTo); // Next.js redirect
    }
    throw new UnauthorizedError("Authentication required");
  }
  
  return { session, userId: session.user.id };
}
```

---

### 2.3 Server Action Guard Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 requireAuthAction() FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Server Action      requireAuthAction()    getUserId()        Error
       │                  │                   │               │
       │  await requireAuthAction()          │               │
       │─────────────────>│                   │               │
       │                  │  getUserId()      │               │
       │                  │──────────────────>│               │
       │                  │                   │               │
       │                  │  userId or null   │               │
       │                  │<──────────────────│               │
       │                  │         │                         │
       │                  │    null │   string                │
       │                  │         ▼                         │
       │                  │  throw UnauthorizedError          │
       │<─────────────────│───────────────────────────────────│
       │                  │         │                         │
       │                  │    return userId                  │
       │<─────────────────│                                   │
```

#### Code Path

```typescript
// lib/auth/guards.ts:116-124
export async function requireAuthAction(): Promise<string> {
  const userId = await getUserId();
  
  if (!userId) {
    throw new UnauthorizedError("Authentication required");
  }
  
  return userId;
}
```

---

### 2.4 Ownership Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  requireOwnership() FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────┘

Caller            requireOwnership()    getUserId()        Errors
  │                      │                   │               │
  │  await requireOwnership(               │               │
  │    resourceUserId                    │               │
  │  )                   │                   │               │
  │─────────────────────>│                   │               │
  │                      │  getUserId()      │               │
  │                      │──────────────────>│               │
  │                      │  currentUserId    │               │
  │                      │<──────────────────│               │
  │                      │         │                         │
  │                      │    null │   exists                │
  │                      │         ▼                         │
  │                      │  throw UnauthorizedError          │
  │                      │         │                         │
  │                      │  currentUserId === resourceUserId │
  │                      │         │                         │
  │                      │   match │   no match              │
  │                      │      ▼   ▼                         │
  │                      │  return  throw ForbiddenError     │
  │<─────────────────────│───────────────────────────────────│
```

#### Code Path

```typescript
// lib/auth/guards.ts:199-212
export async function requireOwnership(
  resourceOwnerId: string,
  userId?: string,
): Promise<void> {
  const currentUserId = userId ?? (await getUserId());
  
  if (!currentUserId) {
    throw new UnauthorizedError("Authentication required");
  }
  
  if (currentUserId !== resourceOwnerId) {
    throw new ForbiddenError("You do not have access to this resource");
  }
}
```

---

### 2.5 Chat Access Control Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CHAT ACCESS CONTROL                                       │
└─────────────────────────────────────────────────────────────────────────────┘

                    canAccessChat(chat, userId?)
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Get currentUserId  │
                 │  (from session if   │
                 │   not provided)     │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  currentUserId?     │
                 └──────────┬──────────┘
                      │           │
                 null │           │ exists
                      ▼           ▼
           ┌──────────────┐  ┌─────────────────┐
           │ Return:      │  │ Is user owner?  │
           │ visibility   │  │ userId === chat │
           │ === "public" │  │ .userId         │
           └──────────────┘  └────────┬────────┘
                                     │
                              Yes    │    No
                               ▼     ▼
                          return  return
                          true    visibility === "public"


                    canModifyChat(chat, userId?)
                            │
                            ▼
                 ┌─────────────────────┐
                 │  Get currentUserId  │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │  currentUserId?     │
                 └──────────┬──────────┘
                      │           │
                 null │           │ exists
                      ▼           ▼
              return false   return userId === chat.userId
```

#### Code Path

```typescript
// lib/auth/guards.ts:233-251
export async function canAccessChat(
  chat: ChatResource,
  userId?: string,
): Promise<boolean> {
  const currentUserId = userId ?? (await getUserId());
  
  // No session - can only access public chats
  if (!currentUserId) return chat.visibility === "public";
  
  // Owner can always access
  if (currentUserId === chat.userId) return true;
  
  // Non-owners can access public chats
  return chat.visibility === "public";
}

// lib/auth/guards.ts:270-283
export async function canModifyChat(
  chat: ChatResource,
  userId?: string,
): Promise<boolean> {
  const currentUserId = userId ?? (await getUserId());
  
  // Must be authenticated to modify
  if (!currentUserId) return false;
  
  // Only owner can modify
  return currentUserId === chat.userId;
}
```

---

## 3. API Request/Response Flow

### 3.1 Request Context Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    REQUEST CONTEXT FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

API Route         withRequestContext()    createRequestContext()    AsyncLocalStorage
    │                     │                        │                      │
    │  export const POST  │                        │                      │
    │  = withRequestContext(handler)              │                      │
    │                     │                        │                      │
    │  Request arrives    │                        │                      │
    │────────────────────>│                        │                      │
    │                     │  createRequestContext()│                      │
    │                     │───────────────────────>│                      │
    │                     │                        │                      │
    │                     │  Extract:              │                      │
    │                     │  - requestId           │                      │
    │                     │  - method, path        │                      │
    │                     │  - clientIp            │                      │
    │                     │  - userAgent           │                      │
    │                     │<───────────────────────│                      │
    │                     │                        │                      │
    │                     │  runWithRequestContext()                      │
    │                     │───────────────────────────────────────────────>│
    │                     │                        │                      │
    │                     │  handler() executes   │                      │
    │                     │  with context available│                      │
    │                     │                        │                      │
    │  Inside handler:    │                        │                      │
    │  getRequestContext()│                        │                      │
    │─────────────────────────────────────────────────────────────────────>│
    │  Returns context    │                        │                      │
    │<─────────────────────────────────────────────────────────────────────│
    │                     │                        │                      │
    │  Response returned  │                        │                      │
    │<────────────────────│                        │                      │
```

#### Code Path

```typescript
// lib/api/context.ts:597-606
export function withRequestContext(handler: RouteHandler): RouteHandler {
  return (request, routeContext) => {
    const initialContext = createRequestContext(request);
    return runWithRequestContext(
      () => handler(request, routeContext),
      initialContext,
    ) as Response | Promise<Response>;
  };
}

// Usage in API route
export const POST = withRequestContext(async (request) => {
  const ctx = getRequestContext();
  console.log(`Request ${ctx?.requestId} started`);
  // ... handler logic
  return success({ ok: true });
});
```

---

### 3.2 Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VALIDATION FLOW                                          │
└─────────────────────────────────────────────────────────────────────────────┘

API Route         validateBody()         Zod Schema         ValidationError
    │                   │                    │                    │
    │  const body =     │                    │                    │
    │  await validateBody(request, schema)  │                    │
    │──────────────────>│                    │                    │
    │                   │                    │                    │
    │                   │  request.json()    │                    │
    │                   │────────────────────>│                    │
    │                   │  parsed JSON       │                    │
    │                   │<────────────────────│                    │
    │                   │         │           │                    │
    │                   │  schema.safeParse()│                    │
    │                   │────────────────────>│                    │
    │                   │  result            │                    │
    │                   │<────────────────────│                    │
    │                   │         │           │                    │
    │                   │  success?           │                    │
    │                   │      │  │           │                    │
    │                   │   No │  │ Yes       │                    │
    │                   │      ▼  ▼           │                    │
    │                   │  throw    return    │                    │
    │                   │  ValidationError   │                    │
    │<──────────────────│─────────────────────────────────────────>│
    │                   │  data              │                    │
    │<──────────────────│                    │                    │
```

#### Code Path

```typescript
// lib/api/validation.ts:49-71
export async function validateBody<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<T> {
  let json: unknown;
  
  try {
    json = await request.json();
  } catch {
    throw new ValidationError("Request body must be valid JSON", {
      type: "invalid_json",
    });
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

---

### 3.3 Error Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ERROR RESPONSE FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

API Route              error()            isAppError()        AppError.toResponse()
    │                    │                     │                      │
    │  try {             │                     │                      │
    │    // ...          │                     │                      │
    │  } catch (err) {   │                     │                      │
    │    return error(err)                     │                      │
    │───────────────────>│                     │                      │
    │                    │                     │                      │
    │                    │  isAppError(err)?   │                      │
    │                    │────────────────────>│                      │
    │                    │  true/false         │                      │
    │                    │<────────────────────│                      │
    │                    │         │           │                      │
    │                    │   AppError│   Generic Error               │
    │                    │      │    │           │                      │
    │                    │      ▼    ▼           │                      │
    │                    │  err.toResponse()   Build ApiError        │
    │                    │─────────────────────────────────────────────>│
    │                    │  Response          │                      │
    │                    │<─────────────────────────────────────────────│
    │  Response          │                     │                      │
    │<───────────────────│                     │                      │
```

#### Code Path

```typescript
// lib/api/response.ts:136-185
export function error(
  error: unknown,
  options?: { status?: number; requestId?: string },
): Response {
  // Handle AppError instances (custom error types)
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
    return new Response(JSON.stringify({ success: false, error: apiError }), {
      status: options?.status ?? 500,
      headers: createHeaders(options?.requestId),
    });
  }
  
  // Handle unknown error types
  return new Response(JSON.stringify({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" }
  }), { status: 500, headers: createHeaders(options?.requestId) });
}
```

---

## 4. Complete Request Lifecycle

### Full Authenticated API Request Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 COMPLETE REQUEST LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

Client          Middleware        API Route         Guards          Services
  │                 │                 │                │                │
  │  Request        │                 │                │                │
  │────────────────>│                 │                │                │
  │                 │                 │                │                │
  │                 │  authorized()   │                │                │
  │                 │  callback       │                │                │
  │                 │  (route check)  │                │                │
  │                 │                 │                │                │
  │                 │  Session check  │                │                │
  │                 │  via NextAuth   │                │                │
  │                 │                 │                │                │
  │  Allowed?       │                 │                │                │
  │<────────────────│                 │                │                │
  │                 │                 │                │                │
  │  Request continues                 │                │                │
  │─────────────────────────────────>│                │                │
  │                 │                 │                │                │
  │                 │                 │  withRequestContext()           │
  │                 │                 │  creates context                │
  │                 │                 │                │                │
  │                 │                 │  requireAuthAction()            │
  │                 │                 │───────────────>│                │
  │                 │                 │                │                │
  │                 │                 │                │  getSession()  │
  │                 │                 │                │───────────────>│
  │                 │                 │                │  userId        │
  │                 │                 │                │<───────────────│
  │                 │                 │                │                │
  │                 │                 │  userId        │                │
  │                 │                 │<───────────────│                │
  │                 │                 │                │                │
  │                 │                 │  validateBody()│                │
  │                 │                 │───────────────>│                │
  │                 │                 │  validated data│                │
  │                 │                 │<───────────────│                │
  │                 │                 │                │                │
  │                 │                 │  Service call  │                │
  │                 │                 │────────────────────────────────>│
  │                 │                 │                │  result        │
  │                 │                 │<────────────────────────────────│
  │                 │                 │                │                │
  │                 │                 │  success(data) │                │
  │                 │                 │───────────────>│                │
  │                 │                 │  Response      │                │
  │                 │                 │<───────────────│                │
  │  Response       │                 │                │                │
  │<─────────────────────────────────│                │                │
```

---

## 5. Rate Limiting Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RATE LIMITING FLOW                                        │
└─────────────────────────────────────────────────────────────────────────────┘

API Route        requireRateLimit()     RateLimiter        RateLimitError
    │                   │                    │                   │
    │  await requireRateLimit(              │                   │
    │    'chat', userId                    │                   │
    │  )                 │                    │                   │
    │───────────────────>│                    │                   │
    │                   │                    │                   │
    │                   │  getRateLimiter()  │                   │
    │                   │───────────────────>│                   │
    │                   │  limiter           │                   │
    │                   │<───────────────────│                   │
    │                   │                    │                   │
    │                   │  consumeToken()    │                   │
    │                   │───────────────────>│                   │
    │                   │  result            │                   │
    │                   │<───────────────────│                   │
    │                   │         │          │                   │
    │                   │  success?          │                   │
    │                   │      │  │          │                   │
    │                   │   No │  │ Yes      │                   │
    │                   │      ▼  ▼          │                   │
    │                   │  throw   return    │                   │
    │                   │  RateLimitError   │                   │
    │<──────────────────────────────────────────────────────────>│
    │                   │  result           │                   │
    │<──────────────────│                    │                   │
```

#### Code Path

```typescript
// lib/auth/guards.ts:448-469
export async function requireRateLimit(
  limiterName: RateLimiterName,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = getRateLimiter(limiterName);
  const result = await limiter.consumeToken(identifier);
  
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);
    throw new RateLimitError(
      `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      { limit: result.limit, remaining: result.remaining, reset: result.reset, retryAfter }
    );
  }
  
  return result;
}
```

---

## Summary

| Flow | Entry Point | Key Functions | Exit Points |
|------|-------------|---------------|-------------|
| Login | `signIn()` | `authorize()`, `jwt()`, `session()` | Session cookie, redirect |
| Guest Session | `getOrCreateGuestSession()` | `getGuestSession()`, `createGuestSession()` | Guest cookie |
| Session Resolution | `getSession()` | `auth()`, `getGuestSession()` | `AppSession` or `null` |
| Route Protection | `authorized()` | Middleware callback | `true` or redirect |
| Server Auth | `requireAuth()` | `getSession()`, `redirect()` | `{ session, userId }` or throw |
| Action Auth | `requireAuthAction()` | `getUserId()` | `userId` or throw |
| Ownership | `requireOwnership()` | `getUserId()` | `void` or throw |
| Chat Access | `canAccessChat()` | `getUserId()` | `boolean` |
| Request Context | `withRequestContext()` | `createRequestContext()`, `runWithRequestContext()` | Response |
| Validation | `validateBody()` | `safeParse()` | Data or throw |
| Error Response | `error()` | `isAppError()` | Response |
| Rate Limit | `requireRateLimit()` | `consumeToken()` | Result or throw |
