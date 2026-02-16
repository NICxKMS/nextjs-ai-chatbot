# Phase 7: State Management & Context Providers Comparison

**Comparison Date:** 2026-02-15
**Phase:** 7 - State Management and Context Providers
**Status:** Completed

## Files Compared

### Context Providers
| Component | OLD File | NEW File | Status |
|-----------|----------|----------|--------|
| Auth Provider | `archive/oldapp/components/auth-provider.tsx` | `features/auth/components/auth-provider.tsx` | Compared |
| Theme Provider | `archive/oldapp/components/theme-provider.tsx` | `components/theme-provider.tsx` | Compared |
| Data Stream Provider | `archive/oldapp/components/data-stream-provider.tsx` | `features/chat/hooks/use-data-stream.tsx` | Compared |

### Data Stream Handler
| Component | OLD File | NEW File | Status |
|-----------|----------|----------|--------|
| Data Stream Handler | `archive/oldapp/components/data-stream-handler.tsx` | `features/chat/components/data-stream-handler.tsx` | Compared |

### Request Context
| Component | OLD File | NEW File | Status |
|-----------|----------|----------|--------|
| Request Context | `archive/oldapp/lib/request-context.ts` | `lib/api/context.ts` | Compared |

---

## Issues Identified

## [P7-FNC-001] Missing Supabase Auth State Change Listener

**Severity:** High
**Status:** Open
**OLD File:** `archive/oldapp/components/auth-provider.tsx`
**NEW File:** `features/auth/components/auth-provider.tsx`
**Line Ref:** L102-L133

**Description:**
The OLD auth provider uses Supabase's `onAuthStateChange` listener for real-time authentication state synchronization across browser tabs. The NEW auth provider replaced this with a window focus event that fetches session from `/api/auth/session`.

OLD implementation:
```typescript
useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, supabaseSession: Session | null) => {
            if (event === "SIGNED_OUT" || !supabaseSession) {
                setSession(null);
                return;
            }
            // ... updates session from Supabase
        }
    );
    return () => subscription.unsubscribe();
}, []);
```

NEW implementation:
```typescript
useEffect(() => {
    const handleFocus = () => {
        fetch("/api/auth/session", { method: "GET", credentials: "include" })
            .then((res) => res.json())
            .then((data) => { if (data.session) setSession(data.session); })
            .catch(() => {});
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
}, []);
```

**Impact:**
- Real-time auth state changes won't be detected immediately
- Multi-tab sync only happens on window focus, not on auth events
- Sign out events from other tabs won't be detected until user focuses this tab
- Users may experience stale auth state when switching between tabs

**Suggested Fix:**
If using NextAuth, consider implementing a polling mechanism or WebSocket-based session sync for real-time auth state updates. Alternatively, document this as intentional behavior change from Supabase Auth to NextAuth.

---

## [P7-FNC-002] Missing Artifact Auto-Visibility Logic During Streaming

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/artifacts/text/client.tsx`
**NEW File:** `features/chat/components/data-stream-handler.tsx`
**Line Ref:** L61-L71

**Description:**
The OLD text artifact's `onStreamPart` handler includes logic to automatically show the artifact panel when streaming content reaches a certain length (400-450 characters). The NEW implementation is missing this visibility toggle logic.

OLD implementation (in `textArtifact.onStreamPart`):
```typescript
if (streamPart.type === "data-textDelta") {
    setArtifact((draftArtifact) => {
        return {
            ...draftArtifact,
            content: draftArtifact.content + streamPart.data,
            isVisible:
                draftArtifact.status === "streaming" &&
                draftArtifact.content.length > 400 &&
                draftArtifact.content.length < 450
                    ? true
                    : draftArtifact.isVisible,
            status: "streaming",
        };
    });
}
```

NEW implementation:
```typescript
{
    kind: "text",
    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-textDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: draft.content + streamPart.data,
            }));
        }
    },
}
```

**Impact:**
- Artifact panel may not automatically open when AI starts generating content
- Users may need to manually open the artifact panel during streaming
- Degraded user experience during text artifact generation

**Suggested Fix:**
Add the visibility toggle logic to the NEW text artifact stream handler:
```typescript
{
    kind: "text",
    onStreamPart: ({ streamPart, setArtifact }) => {
        if (streamPart.type === "data-textDelta") {
            setArtifact((draft) => ({
                ...draft,
                content: draft.content + streamPart.data,
                isVisible:
                    draft.status === "streaming" &&
                    draft.content.length > 400 &&
                    draft.content.length < 450
                        ? true
                        : draft.isVisible,
            }));
        }
    },
}
```

---

## [P7-FNC-003] Missing Suggestion Metadata Accumulation in Text Artifact

**Severity:** Medium
**Status:** Open
**OLD File:** `archive/oldapp/artifacts/text/client.tsx`
**NEW File:** `features/chat/components/data-stream-handler.tsx`
**Line Ref:** L61-L64

**Description:**
The OLD text artifact's `onStreamPart` handler properly accumulates suggestions into the metadata array. The NEW implementation replaces the entire metadata instead of appending.

OLD implementation:
```typescript
if (streamPart.type === "data-suggestion") {
    setMetadata((metadata) => {
        return {
            suggestions: [
                ...(metadata?.suggestions ?? []),
                streamPart.data,
            ],
        };
    });
}
```

NEW implementation:
```typescript
if (streamPart.type === "data-suggestion") {
    setMetadata(streamPart.data);
}
```

**Impact:**
- Multiple suggestions during streaming will overwrite each other
- Only the last suggestion will be preserved
- AI suggestion feature may not work correctly during artifact generation

**Suggested Fix:**
Update the NEW handler to accumulate suggestions:
```typescript
if (streamPart.type === "data-suggestion") {
    setMetadata((prev) => ({
        suggestions: [...(prev?.suggestions ?? []), streamPart.data],
    }));
}
```

---

## [P7-FNC-004] Missing Status Update in Text Delta Handler

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/artifacts/text/client.tsx`
**NEW File:** `features/chat/components/data-stream-handler.tsx`
**Line Ref:** L65-L70

**Description:**
The OLD text artifact handler explicitly sets `status: "streaming"` during text delta processing. The NEW implementation doesn't update the status field.

OLD implementation:
```typescript
setArtifact((draftArtifact) => {
    return {
        ...draftArtifact,
        content: draftArtifact.content + streamPart.data,
        isVisible: /* visibility logic */,
        status: "streaming",  // Explicit status
    };
});
```

NEW implementation:
```typescript
setArtifact((draft) => ({
    ...draft,
    content: draft.content + streamPart.data,
    // Missing status: "streaming"
}));
```

**Impact:**
- Artifact status may not correctly reflect "streaming" state during text generation
- UI components that depend on streaming status may not update correctly
- Minimal impact as the base handler in DataStreamHandler sets status for other events

**Suggested Fix:**
Add explicit status update to ensure consistency:
```typescript
setArtifact((draft) => ({
    ...draft,
    content: draft.content + streamPart.data,
    status: "streaming",
}));
```

---

## [P7-IMP-001] Missing Supabase Browser Client

**Severity:** Low
**Status:** Open
**OLD File:** `archive/oldapp/lib/auth/client.ts`
**NEW File:** N/A (Not migrated)
**Line Ref:** L1-L23

**Description:**
The OLD app has a Supabase browser client (`getSupabaseBrowserClient`) that provides singleton access to the Supabase client for browser-side operations. This file was not migrated to the NEW app.

**Impact:**
- No impact if NextAuth completely replaces Supabase Auth
- If Supabase is still used for other features (realtime, storage), those features won't work
- Architectural decision - may be intentional migration away from Supabase

**Suggested Fix:**
If Supabase is still needed for other features, migrate the browser client. Otherwise, document this as an intentional architectural change.

---

## Files with No Issues

### Theme Provider: No issues found - functionally equivalent
The NEW theme provider at `components/theme-provider.tsx` is functionally equivalent to the OLD implementation. Both are simple wrappers around `next-themes` ThemeProvider.

### Data Stream Provider: No issues found - functionally equivalent
The NEW data stream provider at `features/chat/hooks/use-data-stream.tsx` maintains the same split-context pattern for performance optimization. Error handling changed from `ChatSDKError` to `AppError`, which is consistent with the new architecture.

### Request Context: No issues found - improved implementation
The NEW request context at `lib/api/context.ts` is an enhanced version of the OLD implementation with additional features:
- Extended `RequestContext` interface with `isGuest`, `clientIp`, `userAgent` fields
- Additional helper functions: `getApiContext`, `getClientIp`, `getSearchParams`, `validateOrigin`, `withRequestContext`
- Better type safety and documentation

---

## Summary

| Category | Count |
|----------|-------|
| Critical | 0 |
| High | 1 |
| Medium | 2 |
| Low | 2 |
| **Total** | **5** |

### Priority Order for Fixes
1. **P7-FNC-001** - Auth state sync mechanism (affects multi-tab UX)
2. **P7-FNC-002** - Artifact auto-visibility (affects streaming UX)
3. **P7-FNC-003** - Suggestion accumulation (affects AI suggestion feature)
4. **P7-FNC-004** - Status update (minor UI consistency)
5. **P7-IMP-001** - Supabase client (architectural decision)
