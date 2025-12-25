# Phase 9: Separation of Concerns Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 5            | 0   | 2   | 3   | 0   | 6h    |

---

### ISSUE-P9-001: Data Fetching in UI Component

**File**: `features/artifacts/components/artifact.tsx#L93-99`
**Severity**: P2 (High)
**Category**: Separation of Concerns
**Hours**: 2h

**Problem**: useSWR data fetching logic embedded directly in UI component.

**Code**:

```tsx
// lines 93-99 - Data fetching mixed with UI
const { data: documents, isLoading: isDocumentsFetching } = useSWR<Document[]>(
  artifact.documentId !== "init" && artifact.status !== "streaming"
    ? `/api/document?id=${artifact.documentId}&chatId=${chatId}`
    : null,
  fetcher
);
```

**Fix**:

```tsx
// Extract to custom hook
// features/artifacts/hooks/use-artifact-documents.ts
export function useArtifactDocuments(
  documentId: string,
  chatId: string,
  status: string
) {
  return useSWR<Document[]>(
    documentId !== "init" && status !== "streaming"
      ? `/api/document?id=${documentId}&chatId=${chatId}`
      : null,
    fetcher
  );
}

// Usage in component
const { data: documents, isLoading } = useArtifactDocuments(
  artifact.documentId,
  chatId,
  artifact.status
);
```

---

### ISSUE-P9-002: API Call in Component Callback

**File**: `features/artifacts/components/artifact.tsx#L165-174`
**Severity**: P2 (High)
**Category**: Separation of Concerns
**Hours**: 1h

**Problem**: Direct fetch() call inside component callback handler.

**Code**:

```tsx
// line 165-174
const response = await fetch(`/api/document?id=${artifact.documentId}`, {
  method: "POST",
  body: JSON.stringify({
    title: artifact.title,
    content: artifact.content,
    kind: artifact.kind,
  }),
  signal: abortController.signal,
});
```

**Fix**:

```tsx
// lib/api/document-api.ts
export const documentApi = {
  save: async (id: string, data: DocumentSaveData, signal?: AbortSignal) => {
    return httpClient.post(`/api/document?id=${id}`, data, { signal });
  },
};

// Usage
const response = await documentApi.save(
  artifact.documentId,
  {
    title: artifact.title,
    content: artifact.content,
    kind: artifact.kind,
  },
  abortController.signal
);
```

---

### ISSUE-P9-003: File Upload Fetch in Component

**File**: `features/chat/components/prompt-input.tsx#L205`
**Severity**: P3 (Medium)
**Category**: Separation of Concerns
**Hours**: 1h

**Problem**: File upload logic with fetch() embedded in chat input component.

**Code**:

```tsx
// line 205
const response = await fetch("/api/files/upload", {
  method: "POST",
  body: formData,
});
```

**Fix**:

```tsx
// Option 1: API client
import { fileApi } from "@/lib/api";
const result = await fileApi.upload(formData);

// Option 2: Custom hook
const { upload } = useFileUpload();
const result = await upload(file);
```

---

### ISSUE-P9-004: Auth Bootstrapping in Component

**File**: `features/auth/components/auth-provider.tsx#L42`
**Severity**: P3 (Medium)
**Category**: Separation of Concerns
**Hours**: 1h

**Problem**: Guest auth fetch() call directly in provider component.

**Code**:

```tsx
// line 42
const response = await fetch("/api/auth/guest", {
  method: "POST",
  credentials: "include",
});
```

**Fix**:

```tsx
// lib/api/auth-api.ts
export const authApi = {
  createGuestSession: async () => {
    return httpClient.post<Session>(
      "/api/auth/guest",
      {},
      {
        credentials: "include",
      }
    );
  },
};

// Usage
const session = await authApi.createGuestSession();
```

---

### ISSUE-P9-005: Inline Fetcher Functions

**File**: `features/documents/components/document-preview.tsx`
**Severity**: P3 (Medium)
**Category**: Separation of Concerns
**Hours**: 1h

**Problem**: Multiple components define inline fetcher functions instead of using shared utilities.

**Code**:

```tsx
// Inline fetcher pattern found in multiple files
const fetcher = (url: string) => fetch(url).then((r) => r.json());
```

**Fix**:

```tsx
// lib/api/fetcher.ts (shared)
export const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
};

// Usage
import { fetcher } from "@/lib/api/fetcher";
const { data } = useSWR(url, fetcher);
```

---

## Separation of Concerns Layers

1. **UI Components**: Render props, handle user interactions
2. **Hooks**: Encapsulate stateful logic and side effects
3. **API Layer**: HTTP communication abstraction
4. **Services**: Business logic orchestration

## Validation Checklist

- [ ] No fetch() calls in UI components
- [ ] Data fetching extracted to hooks
- [ ] Shared fetcher utility used
- [ ] API calls via dedicated client
