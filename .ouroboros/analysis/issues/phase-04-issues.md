# Phase 04 Issues - Patterns & Duplication

## Summary

| ID     | Issue                                | Priority | Est. |
| ------ | ------------------------------------ | -------- | ---- |
| P4-001 | Duplicate Error Handling Pattern     | P2       | 2h   |
| P4-002 | Duplicate Skeleton Components        | P3       | 1h   |
| P4-003 | Duplicate AI Components              | P3       | 1.5h |
| P4-004 | 15 Direct fetch() Need Service Layer | P1       | 3h   |

---

## ISSUE-P4-001: Duplicate Error Handling Pattern

**Priority:** P2 - High  
**Effort:** 2h  
**Category:** Code Duplication

### Description

Error handling logic is duplicated across multiple API routes and components.

### Locations

```typescript
// Pattern repeated in:
app / api / chat / route.ts;
app / api / document / route.ts;
app / api / history / route.ts;
features / chat / hooks / use - chat.ts;
features / documents / hooks / use - document.ts;
```

### Current Pattern (Duplicated)

```typescript
try {
  // operation
} catch (error) {
  console.error("Operation failed:", error);
  if (error instanceof CustomError) {
    return NextResponse.json({ error: error.message }, { status: error.code });
  }
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
```

### Fix

Create centralized error handler:

```typescript
// lib/api/error-handler.ts
export function handleApiError(error: unknown): NextResponse {
  const appError = AppError.from(error);
  logError(appError);
  return NextResponse.json(
    { error: appError.message, code: appError.code },
    { status: appError.httpStatus }
  );
}

// Usage
catch (error) {
  return handleApiError(error);
}
```

---

## ISSUE-P4-002: Duplicate Skeleton Components

**Priority:** P3 - Medium  
**Effort:** 1h  
**Category:** Code Duplication

### Description

Multiple skeleton loading components with similar implementations.

### Locations

- `components/ui/skeleton.tsx`
- `features/chat/components/chat-skeleton.tsx`
- `features/sidebar/components/sidebar-skeleton.tsx`

### Fix

Create composable skeleton system:

```typescript
// components/ui/skeleton.tsx
export const Skeleton = ({ className, ...props }) => (
  <div className={cn("animate-pulse bg-muted", className)} {...props} />
);

// Compose for specific use cases
export const ChatSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-12 w-3/4" />
    <Skeleton className="h-8 w-1/2" />
  </div>
);
```

---

## ISSUE-P4-003: Duplicate AI Components

**Priority:** P3 - Medium  
**Effort:** 1.5h  
**Category:** Code Duplication

### Description

AI-related components have duplicated rendering logic.

### Locations

```
components/ai-elements/code-block.tsx
components/ai-elements/artifact.tsx
features/artifacts/components/artifact-renderer.tsx
```

### Duplicated Logic

- Syntax highlighting setup
- Copy button implementation
- Container styling

### Fix

Extract shared utilities:

```typescript
// lib/ai/rendering-utils.ts
export function useCodeHighlighting(language: string) { ... }
export function useCopyToClipboard() { ... }

// components/ai-elements/shared/code-container.tsx
export function CodeContainer({ children, language, copyable }) { ... }
```

---

## ISSUE-P4-004: 15 Direct fetch() Need Service Layer

**Priority:** P1 - Critical  
**Effort:** 3h  
**Category:** Architecture

### Description

15 instances of direct `fetch()` calls bypassing the service layer, causing:

- Inconsistent error handling
- No request/response interceptors
- Difficult to test
- No centralized caching

### Locations

```typescript
// Direct fetch found in:
features / chat / hooks / use - chat.ts;
features / documents / hooks / use - document.ts;
features / sidebar / hooks / use - history.ts;
features / auth / hooks / use - session.ts;
app / chat / page.tsx;
// ... 10 more locations
```

### Current Anti-Pattern

```typescript
// Scattered throughout codebase
const response = await fetch("/api/chat", {
  method: "POST",
  body: JSON.stringify(data),
});
```

### Fix

Route all API calls through service layer:

```typescript
// lib/services/api-client.ts
class ApiClient {
  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }
}

// lib/services/chat-service.ts
export const chatService = {
  sendMessage: (message: string) => apiClient.post("/api/chat", { message }),
};

// Usage
const response = await chatService.sendMessage(message);
```
