# Fix Plan: MEDIUM Error Handling Issues

**Issues**: #130, #151, #158, #174, #178, #195, #200, #212, #226
**Priority**: 🟡 MEDIUM
**Total Effort**: ~80 minutes
**Created**: 2025-12-22

---

## Summary

| #    | Issue                                         | File                                              | Effort | Status |
| ---- | --------------------------------------------- | ------------------------------------------------- | ------ | ------ |
| #130 | Missing `role="alert"` on error fallback      | features/chat/components/chat.tsx                 | 5m     | OPEN   |
| #151 | `normalizeMessagePart` silently drops unknown | features/chat/components/message/parts.tsx        | 10m    | OPEN   |
| #158 | Generic error toast                           | features/artifacts/components/actions.tsx         | 10m    | OPEN   |
| #174 | Generic fetch error                           | features/documents/components/document-viewer.tsx | 10m    | OPEN   |
| #178 | Errors silently swallowed                     | features/auth/components/guest-bootstrap.tsx      | 10m    | OPEN   |
| #195 | Fire-and-forget DB write                      | lib/ai/tools/request-suggestions.ts               | 15m    | OPEN   |
| #200 | Empty catch without logging                   | app/(auth)/login/page.tsx                         | 5m     | OPEN   |
| #212 | Error message exposed to users                | app/(chat)/error.tsx                              | 10m    | OPEN   |
| #226 | Generic 500 no request ID                     | app/api/chat/route.ts                             | 5m     | OPEN   |

---

## Issue #130: Missing `role="alert"` on Error Fallback

**File**: `features/chat/components/chat.tsx`
**Effort**: 5 minutes

### Problem

Error fallback components lack ARIA role, screen readers won't announce errors.

### Fix

```tsx
// Before
<div className="error-message">{error.message}</div>

// After
<div role="alert" aria-live="assertive" className="error-message">
  {error.message}
</div>
```

---

## Issue #151: `normalizeMessagePart` Silently Drops Unknown

**File**: `features/chat/components/message/parts.tsx`
**Effort**: 10 minutes

### Problem

Unknown message part types are silently dropped without logging.

### Fix

```typescript
function normalizeMessagePart(part: unknown): MessagePart | null {
  if (!isValidMessagePart(part)) {
    console.warn(
      "[normalizeMessagePart] Unknown part type:",
      typeof part,
      part
    );
    return null;
  }
  return part;
}
```

---

## Issue #158: Generic Error Toast

**File**: `features/artifacts/components/actions.tsx`
**Effort**: 10 minutes

### Problem

All artifact errors show same generic toast message.

### Fix

```typescript
// Before
toast.error("Something went wrong");

// After
toast.error(getArtifactErrorMessage(error, action));

function getArtifactErrorMessage(error: unknown, action: string): string {
  if (error instanceof NetworkError) return `Network error while ${action}`;
  if (error instanceof AuthError) return "Please sign in to continue";
  return `Failed to ${action}. Please try again.`;
}
```

---

## Issue #174: Generic Fetch Error

**File**: `features/documents/components/document-viewer.tsx`
**Effort**: 10 minutes

### Problem

Document fetch errors lose context and status codes.

### Fix

```typescript
// Before
catch (error) {
  setError("Failed to load document");
}

// After
catch (error) {
  const message = error instanceof Response
    ? `Failed to load: ${error.status}`
    : "Failed to load document";
  console.error("[DocumentViewer] Fetch error:", error);
  setError(message);
}
```

---

## Issue #178: Errors Silently Swallowed

**File**: `features/auth/components/guest-bootstrap.tsx`
**Effort**: 10 minutes

### Problem

Guest bootstrap errors are caught but not reported to user or logged.

### Fix

```typescript
// Before
catch (error) {
  // Silent fail
}

// After
catch (error) {
  console.error("[GuestBootstrap] Failed to create session:", error);
  toast.error("Unable to start guest session. Please refresh the page.");
}
```

---

## Issue #195: Fire-and-Forget DB Write

**File**: `lib/ai/tools/request-suggestions.ts`
**Effort**: 15 minutes

### Problem

Database writes in AI tools are not awaited, failures go unnoticed.

### Fix

```typescript
// Before
saveSuggestion(data); // Fire and forget

// After
try {
  await saveSuggestion(data);
} catch (error) {
  console.error("[requestSuggestions] DB write failed:", error);
  // Continue - suggestions are non-critical
}
```

---

## Issue #200: Empty Catch Without Logging

**File**: `app/(auth)/login/page.tsx`
**Effort**: 5 minutes

### Problem

Empty catch blocks hide authentication errors.

### Fix

```typescript
// Before
catch {}

// After
catch (error) {
  console.error("[Login] Auth error:", error);
}
```

---

## Issue #212: Error Message Exposed to Users

**File**: `app/(chat)/error.tsx`
**Effort**: 10 minutes

### Problem

Raw error.message shown to users may leak internal details.

### Fix

```tsx
// Before
<p>{error.message}</p>

// After
<p>{getPublicErrorMessage(error)}</p>

function getPublicErrorMessage(error: Error): string {
  // Only show safe messages
  if (error.name === "AuthError") return "Authentication failed";
  if (error.name === "NetworkError") return "Network connection issue";
  return "An unexpected error occurred";
}
```

---

## Issue #226: Generic 500 No Request ID

**File**: `app/api/chat/route.ts`
**Effort**: 5 minutes

### Problem

500 errors don't include request IDs for debugging.

### Fix

```typescript
// Before
return NextResponse.json({ error: "Internal error" }, { status: 500 });

// After
const requestId = crypto.randomUUID();
console.error(`[Chat API] Error [${requestId}]:`, error);
return NextResponse.json(
  { error: "Internal error", requestId },
  { status: 500 }
);
```

---

## Implementation Order

1. **Quick Wins (15m)**: #130, #200, #226 - Single line changes
2. **Logging Fixes (35m)**: #151, #178, #195 - Add proper logging
3. **Error Messages (30m)**: #158, #174, #212 - User-facing improvements

---

## Common Pattern

All fixes follow this pattern:

```typescript
try {
  await operation();
} catch (error) {
  // 1. Log for debugging
  console.error(`[${Component}] ${action} failed:`, error);

  // 2. User-facing message (sanitized)
  showError(getSafeErrorMessage(error));

  // 3. Optional: Track in observability
  trackError(error, { component, action });
}
```
