# ADR-008: PPR-Compatible Session Handling

## Status

Accepted

## Date

2025-12-23

## Reference

ARCH-001, PPR-001

## Context

Next.js 16.1.0 introduced Partial Pre-Rendering (PPR), which creates an interesting challenge for session handling. During the **prerender phase**, the framework pre-generates static shells of pages, but certain APIs like `cookies()` and `headers()` are not available because there's no actual request context yet.

### The Problem

Our session handling code relied on `cookies()` to read session tokens:

```typescript
// lib/auth/session.ts (before)
export async function getSupabaseSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies(); // THROWS during PPR prerender!
  const accessToken = cookieStore.get("sb-access-token")?.value;
  // ...
}
```

During PPR prerender, this threw:

```
Error: `cookies()` cannot be called during the prerendering phase of a page
```

### Previous (Fragile) Fix

The initial approach used try-catch with string matching:

```typescript
try {
  const cookieStore = await cookies();
  // ...
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes("During prerendering")
  ) {
    return null; // Bail during prerender
  }
  throw error;
}
```

**Problems with this approach:**
1. **Fragile**: Relies on error message text that could change between Next.js versions
2. **Performance**: Exception throwing has overhead
3. **Obscure**: Hides the actual intent of the code
4. **Debugging**: Hard to distinguish PPR bailout from real errors

## Decision

Use `connection()` from `next/server` to explicitly defer execution until request time. This is the **official Next.js mechanism** for PPR-aware code.

### Implementation

```typescript
import { connection } from "next/server";

export async function getSupabaseSession(): Promise<AuthSession | null> {
  // PPR-001: Defer to request time (prevents prerender errors)
  await connection();

  const cookieStore = await cookies();
  // ... rest of session logic
}
```

### Files Changed

| File | Change |
|------|--------|
| `lib/auth/session.ts` | Added `connection()` to `getSupabaseSession()` & `getGuestSession()` |
| `lib/auth/index.ts` | Added `connection()` to `getAccessToken()`, `getRefreshToken()`, `getGuestCookie()` |
| `app/(chat)/layout.tsx` | Added `connection()` before `cookies()`/`headers()` |
| `app/(chat)/page.tsx` | Added `connection()` before redirect check |

### Pattern

```typescript
// ✅ CORRECT: PPR-compatible pattern
import { connection } from "next/server";
import { cookies } from "next/headers";

export async function anyFunctionUsingCookies() {
  await connection(); // Signal: "wait for request"
  const cookieStore = await cookies();
  // ...
}
```

## Consequences

### Positive

- **Official API**: Uses Next.js's recommended PPR escape hatch
- **Future-proof**: Won't break with error message changes
- **Zero overhead**: `connection()` is a no-op at runtime when there's a request
- **Clear intent**: Code explicitly declares "needs request context"
- **Debuggable**: No hidden exception paths

### Negative

- **Import required**: Need to add `next/server` import to files using this pattern
- **Slight verbosity**: One extra line per function

### Neutral

- **No behavior change at runtime**: Only affects prerender phase
- **PPR compatibility**: Static shell can render, dynamic parts defer

## Alternatives Considered

### 1. Keep Try-Catch Pattern

```typescript
try {
  const cookieStore = await cookies();
} catch (error) {
  if (error.message.includes("During prerendering")) return null;
  throw error;
}
```

**Rejected**: Fragile, relies on error message text.

### 2. Use `noStore()` from `next/cache`

```typescript
import { noStore } from "next/cache";
noStore(); // Forces dynamic rendering
```

**Rejected**: Completely disables caching for the route, too aggressive.

### 3. Use `dynamic = 'force-dynamic'` Route Segment Config

```typescript
export const dynamic = "force-dynamic";
```

**Rejected**: Also disables all static optimization for the route.

### 4. Check for `process.env.NEXT_PHASE`

```typescript
if (process.env.NEXT_PHASE === "phase-production-build") {
  return null;
}
```

**Rejected**: Not available in all contexts, unreliable.

## Related Files

- [lib/auth/session.ts](../../../lib/auth/session.ts) - Session retrieval functions
- [lib/auth/index.ts](../../../lib/auth/index.ts) - Cookie helper exports
- [app/(chat)/layout.tsx](../../../app/(chat)/layout.tsx) - Chat layout with auth
- [app/(chat)/page.tsx](../../../app/(chat)/page.tsx) - Chat page with redirect

## References

- [Next.js PPR Documentation](https://nextjs.org/docs/app/building-your-application/rendering/partial-prerendering)
- [Next.js connection() API](https://nextjs.org/docs/app/api-reference/functions/connection)
