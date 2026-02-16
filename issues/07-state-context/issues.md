# Phase 7: State Management & Context Providers Comparison

**Comparison Date:** 2026-02-15
**Phase:** 7 - State Management and Context Providers
**Status:** Completed

## VERIFICATION SUMMARY

| Issue | Status | Timestamp |
|-------|--------|----------|
| P7-FNC-001 | Verified (Improvement) | 2026-02-16T23:50:00Z |
| P7-FNC-002 | Verified (Defect) | 2026-02-16T23:50:00Z |
| P7-FNC-003 | Verified (Defect) | 2026-02-16T23:50:00Z |
| P7-FNC-004 | Verified (Defect) | 2026-02-16T23:50:00Z |
| P7-IMP-001 | Verified (Improvement) | 2026-02-16T23:50:00Z |

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
**Status:** Verified (Improvement)
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

**Verification:**
| Field | Value |
|-------|-------|
| **Verified By** | ouroboros-qa |
| **Timestamp** | 2026-02-16T23:50:00Z |
| **Status** | Verified (Improvement) |

**Findings:** This is an intentional architectural change from Supabase Auth to NextAuth, not a missing feature. Verified both implementations:

**OLD** (`archive/oldapp/components/auth-provider.tsx:102-133`): Uses `getSupabaseBrowserClient()` from `archive/oldapp/lib/auth/client.ts` to create a singleton Supabase browser client, then calls `supabase.auth.onAuthStateChange()` — a Supabase-specific real-time listener that fires on `SIGNED_OUT`, token refresh, and other auth events. This provides instant cross-tab sync through Supabase's internal BroadcastChannel/localStorage mechanism.

**NEW** (`features/auth/components/auth-provider.tsx:123-139`): Replaces the Supabase listener with `window.addEventListener("focus", handleFocus)` that fetches `GET /api/auth/session` (handled by NextAuth's `[...nextauth]` catch-all route). This is the standard NextAuth pattern — NextAuth v5 does NOT provide a built-in `onAuthStateChange` equivalent or real-time event system.

Key findings:
1. **No Supabase client in NEW**: `lib/auth/client.ts` only exists in `archive/oldapp/` — confirmed by `file_search` (zero results in non-archive paths). Zero imports of `@supabase/ssr` or `getSupabaseBrowserClient` in new code.
2. **NextAuth limitation**: NextAuth v5 provides `useSession()` with `SessionProvider` for client-side session access, but the NEW code uses a custom `AuthProvider` with manual fetch. The `window.focus` approach IS the common workaround for cross-tab sync with NextAuth.
3. **Trade-off**: OLD had instant (~50ms) cross-tab auth sync via Supabase's real-time channel. NEW has delayed sync (~0-30s depending on when user focuses tab). However, this is an inherent limitation of migrating from Supabase Auth to NextAuth — not a bug.
4. **Improvement options**: Could enhance with `BroadcastChannel` API for same-origin cross-tab signaling, or use `visibilitychange` event for faster detection, or adopt NextAuth's built-in `SessionProvider` with `refetchInterval`.

Reclassified as **Improvement**: The functionality change is an expected consequence of the auth provider migration. The focus-based approach is functional but provides degraded UX compared to the real-time listener.

---

## [P7-FNC-002] Missing Artifact Auto-Visibility Logic During Streaming

**Severity:** Medium
**Status:** Verified (Defect)
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
**Status:** Verified (Defect)
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

**Verification:**
| Field | Value |
|-------|-------|
| **Verified By** | ouroboros-qa |
| **Timestamp** | 2026-02-16T23:50:00Z |
| **Status** | Verified (Defect) |

**Findings:** Confirmed defect. Critical semantic difference between OLD accumulation and NEW replacement:

**OLD** (`archive/oldapp/artifacts/text/client.tsx:54-60`): `setMetadata((metadata) => ({ suggestions: [...(metadata?.suggestions ?? []), streamPart.data] }))` — uses a **callback** form of `setMetadata` that receives current metadata, spreads existing `suggestions` array, and appends the new `streamPart.data`. This properly accumulates multiple suggestion stream parts into a growing array: `[s1] → [s1, s2] → [s1, s2, s3]`.

**NEW** (`features/chat/components/data-stream-handler.tsx:68-69`): `setMetadata(streamPart.data)` — calls `setMetadata` with a **raw value**, not a callback. This completely replaces the metadata with the new suggestion data. Multiple suggestions overwrite each other: `s1 → s2 → s3` (only `s3` survives).

Verified the `setMetadata` API in `features/artifact/hooks/use-artifact.ts` — `setMetadata` accepts both `(value)` and `(prevState => newState)` forms (standard React state setter pattern). The callback form IS available but the NEW code doesn't use it.

Impact: During text artifact streaming, if the AI generates multiple inline suggestions, all but the last one are silently discarded. The `Editor` component receives only the latest suggestion instead of the full array. The OLD `TextArtifactMetadata` type explicitly defines `suggestions: SuggestionLike[]` (array), confirming multiple suggestions are expected.

---

## [P7-FNC-004] Missing Status Update in Text Delta Handler

**Severity:** Low
**Status:** Verified (Defect)
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

**Verification:**
| Field | Value |
|-------|-------|
| **Verified By** | ouroboros-qa |
| **Timestamp** | 2026-02-16T23:50:00Z |
| **Status** | Verified (Defect) |

**Findings:** Confirmed defect, though impact is nuanced. Traced the status management in detail:

**OLD** (`archive/oldapp/artifacts/text/client.tsx:68`): Every `data-textDelta` event sets `status: "streaming"` alongside content update. This ensures the artifact status stays in `"streaming"` state throughout the entire text generation process.

**NEW** (`features/chat/components/data-stream-handler.tsx:70-73`): The `data-textDelta` handler in the text stream definition only updates `content` — no `status` field. The status IS set in the base `DataStreamHandler` component for other event types: `data-id` sets `status: "streaming"` (L211), `data-title` sets `status: "streaming"` (L218), `data-kind` sets `status: "streaming"` (L225), `data-clear` sets `status: "streaming"` (L231), and `data-finish` sets `status: "idle"` (L237).

However, there's a race condition issue: the base handler's `setArtifact()` call (L202-243) and the artifact-specific `onStreamPart()` call (L248-252) are separate state updates. The base handler applies status updates for metadata events, but the text-specific handler's `setArtifact()` spread operator (`...draft`) will PRESERVE whatever status was already set. So if `data-id` or `data-kind` previously set `status: "streaming"`, it's preserved across subsequent `data-textDelta` events.

The real gap: if the FIRST event is a `data-textDelta` (before any `data-id`/`data-kind`), the status would remain at its initial value (likely `"idle"` from `initialArtifactData`). This would cause UI components that conditionally render based on `status === "streaming"` to not show streaming indicators until a metadata event arrives. In practice, `data-id` typically precedes `data-textDelta`, so the impact is timing-dependent but real.

Classified as **Defect** because the explicit status guarantee in OLD is lost. The fix is trivial: add `status: "streaming"` to the text delta handler.

---

## [P7-IMP-001] Missing Supabase Browser Client

**Severity:** Low
**Status:** Verified (Improvement)
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

**Verification:**
| Field | Value |
|-------|-------|
| **Verified By** | ouroboros-qa |
| **Timestamp** | 2026-02-16T23:50:00Z |
| **Status** | Verified (Improvement) |

**Findings:** Confirmed as intentional architectural change. The `getSupabaseBrowserClient()` singleton in `archive/oldapp/lib/auth/client.ts:7-22` uses `createBrowserClient` from `@supabase/ssr` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars. This client was used by the OLD auth provider for `supabase.auth.onAuthStateChange()` (the only consumer in `archive/oldapp/components/auth-provider.tsx:102`).

Verified via `file_search` and `grep_search`:
1. **No `lib/auth/client.ts` in NEW**: `file_search("**/lib/auth/client*")` returns only `archive/oldapp/lib/auth/client.ts`.
2. **No Supabase browser references in NEW**: `grep_search("getSupabaseBrowserClient|createBrowserClient|supabase.*browser")` across `lib/**` and `features/**` returns zero matches (only archive matches).
3. **No `onAuthStateChange` in NEW**: `grep_search("onAuthStateChange|supabase\\.auth")` across `lib/**` and `features/**` returns zero matches.
4. **NEW auth uses NextAuth**: `lib/auth/config.ts` uses `NextAuth` with `CredentialsProvider`, JWT strategy, and bcrypt password verification. No Supabase auth dependency.
5. **Supabase IS still used for database**: `lib/db/client.ts` uses `@supabase/supabase-js` for database connections (Supabase as Postgres host), but this is server-side only and doesn't need a browser client.

The Supabase browser client was exclusively used for auth state listening. Since NextAuth replaces Supabase Auth entirely, the browser client has zero consumers in the new architecture. No other Supabase features (realtime subscriptions, storage buckets, edge functions) are used in the new codebase. This is a correct, intentional omission — not a missing migration.

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
