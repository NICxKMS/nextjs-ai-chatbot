# W1 Static Audit: features/chat/

**Date:** 2026-03-07
**Scope:** All 30 files in `features/chat/` — actions, components, hooks, lib, schemas, types
**Flow References:** chat-send-message, chat-api-pipeline, chat-tool-execution, chat-persistence, chat-delete, chat-delete-trailing, state-chat-stream, state-artifact-store

---

## Executive Summary

The chat feature is well-architected with clean separation of concerns, proper TypeScript throughout (zero `any` types), and thoughtful patterns like RAF batching and split contexts. However, there are **23 findings** across 7 severity categories. The highest-impact items are the StreamBridge indirection (3-frame latency pipeline), per-delta artifact store emissions, full Chat entity fetches for ownership checks, unused schema exports, and a component that can be converted to a server component.

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 6 |
| MEDIUM | 9 |
| LOW | 6 |

---

## Findings

---

### F01 — StreamBridge Render-Null Indirection (T7)

```
FLOW: state-chat-stream | STEP: 7-8
SEVERITY: [CRITICAL]
FILE: features/chat/components/stream-bridge.tsx:1-42
FINDING: StreamBridge is a render-null component that exists solely to bridge ChatStreamProvider
  context to the module-level artifactStore. The pipeline is:
    SSE → onData → setChatStream (RAF batch, frame 1)
    → StateCtx update → StreamBridge useEffect (frame 2)
    → artifactStore.setState → UI (frame 3)
  This adds 2 extra frames (~32ms) of latency between SSE arrival and artifact UI update.
  The onData callback in useChatSession already has access to all data and could write to
  artifactStore directly, eliminating both ChatStreamProvider and StreamBridge entirely.
RECOMMENDATION: In useChatSession.onData, call processStreamDelta + artifactStore.setState
  directly for artifact-* data parts instead of going through setChatStream/ChatStreamProvider.
  This collapses 3 frames → 1 frame, removes StreamBridge component, and potentially allows
  ChatStreamProvider to be removed entirely (it exists only for this bridge pattern).
  ChatStreamProvider may still be needed if other consumers subscribe in the future, but
  currently StreamBridge is the ONLY consumer of useChatStream().
```

---

### F02 — Per-Delta Artifact Store Emissions (T5)

```
FLOW: state-artifact-store | STEP: 2-3
SEVERITY: [CRITICAL]
FILE: features/chat/components/stream-bridge.tsx:31-35
FINDING: StreamBridge processes deltas in a loop, calling onArtifactDelta(artifact) for EACH
  delta. Each call triggers artifactStore.setState → emitChange() → all useSyncExternalStore
  subscribers notified. For a batch of N deltas (after RAF coalescing), this produces N store
  updates and N listener notification rounds. Only the final state matters for rendering.
  The intermediate states are wasted work.
  
  Code:
    for (const delta of newDeltas) {
      const artifact = processStreamDelta(delta, artifactRef.current)
      artifactRef.current = artifact
      onArtifactDelta(artifact)  // ← N calls per batch
    }
    
RECOMMENDATION: Accumulate final artifact state in the loop, then call onArtifactDelta ONCE
  after the loop:
    let current = artifactRef.current
    for (const delta of newDeltas) {
      current = processStreamDelta(delta, current)
    }
    artifactRef.current = current
    onArtifactDelta(current)  // ← 1 call per batch
  
  This reduces N store updates to 1 per RAF batch. If F01 is implemented (eliminating 
  StreamBridge), the same batching logic should be applied in onData.
```

---

### F03 — Sequential API Pipeline Steps 3+4

```
FLOW: chat-api-pipeline | STEP: 3-4
SEVERITY: [HIGH]
FILE: app/api/chat/route.ts:58-68 (calls enforceChatRateLimit then readChatRequest)
FINDING: Rate limiting (step 3) and request body parsing (step 4) are strictly sequential
  in the route handler but are independent of each other. Rate limiting hits Redis I/O;
  body parsing is CPU-bound JSON.parse + Zod. Running them in parallel via Promise.all
  would save one sequential await (~5-15ms Redis RTT).
  
  Current:
    const rateLimitResponse = await enforceChatRateLimit(session.user.id)
    if (rateLimitResponse) return rateLimitResponse
    const requestData = await readChatRequest(request)
    
RECOMMENDATION: Parallelize:
    const [rateLimitResponse, requestData] = await Promise.all([
      enforceChatRateLimit(session.user.id),
      readChatRequest(request),
    ])
    if (rateLimitResponse) return rateLimitResponse
    if (requestData instanceof Response) return requestData
  
  Trade-off: If rate-limited, we still parse the body (wasted CPU). Acceptable since
  rate-limited requests are the minority case.
```

---

### F04 — Full Chat Entity Fetch for Ownership Checks

```
FLOW: chat-delete | STEP: 2
SEVERITY: [HIGH]
FILE: features/chat/actions/delete-chat.ts:33
FILE: features/chat/actions/delete-trailing-messages.ts:37
FINDING: Both deleteChat and deleteTrailingMessages call getChatById() which fetches the
  entire Chat object (id, userId, title, model, visibility, createdAt, updatedAt) just to
  check `chat.userId !== session.user.id`. Only the userId column is needed for ownership
  validation. This fetches unnecessary columns and transfers extra data from DB.
  
  getChatById → db.query.chats.findFirst({ where: eq(chats.id, chatId) })
  Returns full Chat including title, model, visibility, timestamps.
  
RECOMMENDATION: Create a lightweight `getChatOwnerId(chatId)` function:
    db.select({ userId: chats.userId }).from(chats).where(eq(chats.id, chatId)).limit(1)
  
  Or use a combined auth+ownership pattern:
    async function requireChatOwnership(chatId: string, userId: string): Promise<void | Response>
  
  This pattern is shared across 5 server actions (delete-chat, delete-trailing, rename-chat,
  update-visibility, vote) — extracting it would DRY up ~15 lines per action.
```

---

### F05 — Full Model Catalog Fetch for Single Model Validation

```
FLOW: chat-api-pipeline | STEP: 5a
SEVERITY: [HIGH]
FILE: features/chat/lib/chat-route.ts:163-168
FINDING: resolveChatRouteContext calls getAvailableModels() which returns the FULL model
  catalog (all providers, all metadata) just to validate that one model ID exists:
    
    const [availableModels, existingChat] = await Promise.all([
      getAvailableModels(),  // ← fetches ALL models
      getChatById(chatId),
    ])
    const modelMetadata = availableModels.find(m => m.id === selectedChatModel)
    
  The catalog is also used for: getEnabledTools(modelMetadata).length > 0 — needs only
  supportsToolCalling from the metadata.
  
RECOMMENDATION: Create a targeted lookup function:
    getModelById(modelId) → ModelMetadata | null
  
  This avoids loading the entire catalog for a single lookup. The catalog is likely
  cached via React.cache or module-level, so the actual cost depends on cache hit rate.
  If cached, this is LOW priority; if not cached, it's a full provider scan per request.
```

---

### F06 — Unused Schema Exports (Dead Code)

```
FLOW: N/A (static analysis)
SEVERITY: [HIGH]
FILE: features/chat/schemas/chat.schema.ts:44-65
FINDING: Three exports are never imported anywhere in the codebase:
  1. `messageSchema` (line 44) — zero imports found
  2. `MessageInput` type (line 53) — zero imports found  
  3. `editMessageSchema` (line 59) — zero imports found
  4. `EditMessageInput` type (line 65) — zero imports found
  
  Only `chatRequestSchema`, `deleteMessagesSchema`, `DeleteMessagesInput`, and `ChatRequest`
  are actively used. The unused schemas appear to be speculatively defined during P3-T05
  (task log confirms creation) but never consumed by any action or validator.
  
RECOMMENDATION: Remove unused exports (messageSchema, MessageInput, editMessageSchema,
  EditMessageInput). These add dead weight to the schema file and may mislead developers
  into thinking they're used. If needed in the future, they can be recreated.
```

---

### F07 — Greeting Component Missing "use client" (Server Component Candidate)

```
FLOW: chat-send-message | STEP: 8 (empty state)
SEVERITY: [HIGH]
FILE: features/chat/components/greeting.tsx:1-14
FINDING: The Greeting component is purely static HTML with inline styles. It has NO:
  - useState/useEffect/useRef
  - Event handlers
  - Browser API access
  - Context consumption
  - Dynamic data
  
  It does NOT have a "use client" directive and is imported by Messages (which IS "use client").
  In Next.js, a component imported by a client component becomes part of the client bundle
  regardless. However, this is conceptually a server component and keeping it without "use client"
  is correct — it will be rendered on the server and hydrated as part of the client tree.
  
  The real optimization opportunity: consider making Messages render Greeting as a server 
  component slot via children prop rather than directly importing it in the client component.
  This would allow Greeting's HTML to be sent as RSC payload and never hydrated.
  
RECOMMENDATION: LOW priority — current behavior is acceptable. To fully optimize, pass
  Greeting as a children slot from the server page component into Messages. This would
  require restructuring Messages to accept a children/emptyState prop.
```

---

### F08 — ChatStreamProvider Grows Unbounded During Streaming

```
FLOW: state-chat-stream | STEP: 6
SEVERITY: [MEDIUM]
FILE: features/chat/components/chat-stream-provider.tsx:56-60
FINDING: The chatStream state array grows linearly with every RAF batch during streaming:
    setRaw((prev) => [...prev, ...batch])
  
  For a long response with 500+ deltas, this means:
  - 500+ entries in the array
  - Each batch spreads the entire previous array + new items (O(n) per batch)
  - Array is only cleared on onFinish (setChatStream(() => []))
  
  The growing array also means StreamBridge's slice operation (chatStream.slice(lastProcessedRef + 1))
  allocates progressively larger sub-arrays.
  
RECOMMENDATION: If F01 is implemented (eliminating StreamBridge), this entire provider
  becomes unnecessary. If kept, consider using a ref-based ring buffer or clearing processed
  items after StreamBridge consumes them.
```

---

### F09 — MessageItem Memo Uses deep-equal on message.parts

```
FLOW: chat-send-message | STEP: 8
SEVERITY: [MEDIUM]
FILE: features/chat/components/messages.tsx:56-60
FINDING: MessageItem's memo comparator runs fast-deep-equal on message.parts for every
  message on every render cycle:
    if (!equal(prev.message.parts, next.message.parts)) return false
  
  During streaming, the Messages component re-renders on every status/messages change.
  The comparator correctly short-circuits for non-loading messages (returns false early
  if isLoading), but still runs the deep-equal for ALL messages when:
  - isLoading transitions from true→false on the last message
  - Any messages array reference changes
  
  For conversations with 50+ messages, this is 50+ deep-equal calls per render, though 
  most are fast (parts arrays are usually small).
  
RECOMMENDATION: Consider adding message index stability — if the message reference is
  identical (Object.is), skip the deep comparison entirely:
    if (prev.message === next.message && !prev.isLoading && !next.isLoading) return true
```

---

### F10 — MessageActions Also Uses deep-equal Redundantly

```
FLOW: chat-send-message | STEP: 8
SEVERITY: [MEDIUM]
FILE: features/chat/components/message-actions.tsx:91-95
FINDING: MessageActions memo comparator runs fast-deep-equal on message.parts:
    if (!equal(prev.message.parts, next.message.parts)) return false
  
  This is redundant with MessageItem's memo (which also checks message.parts).
  If MessageItem already prevented re-render due to unchanged parts, MessageActions
  will never receive changed parts either. The deep-equal here guards against the
  case where MessageItem re-renders (isLoading) and passes unchanged parts down.
  
RECOMMENDATION: Since MessageActions is always rendered inside MessageItem's render
  function, and MessageItem already memos on parts, the deep-equal in MessageActions
  is mostly redundant. Could simplify to just:
    if (prev.message === next.message && prev.setMode === next.setMode) return true
```

---

### F11 — Weather Tool's Module-Level Cache Has No Size Bound

```
FLOW: chat-tool-execution | N/A
SEVERITY: [MEDIUM]
FILE: features/chat/lib/tools/weather.ts:27
FINDING: cityWeatherCache is a module-level Map with no size limit:
    const cityWeatherCache = new Map<string, { expiresAt: number; value: Promise<WeatherToolResult> }>()
  
  While entries are deleted on error and have a 30s TTL, there's no eviction of
  expired entries unless they're looked up. If many different cities are queried,
  the map grows without bound. In a serverless environment (Vercel), this is limited
  by function lifecycle, but in a long-running server, it could accumulate.
  
RECOMMENDATION: Add a periodic or on-access cleanup that evicts expired entries.
  Or use a simple LRU with a max size (e.g., 100 entries). Low priority since
  Vercel functions are short-lived.
```

---

### F12 — ContextDisplay Makes 4 Separate Settings Selectors

```
FLOW: N/A (render path)
SEVERITY: [MEDIUM]
FILE: features/chat/components/context-display.tsx:29-33
FINDING: ContextDisplay calls useSettingsSelector 5 times:
    const isDetailed = useSettingsSelector(s => s.contextDisplayMode === "detailed")
    const temperature = useSettingsSelector(s => s.temperature)
    const topP = useSettingsSelector(s => s.topP)
    const maxOutputTokens = useSettingsSelector(s => s.maxOutputTokens)
    const enableReasoning = useSettingsSelector(s => s.enableReasoning)
  
  Each selector creates a separate subscription. When any setting changes, all 5
  subscriptions fire and each checks for changes. This is 5x overhead vs. a single
  selector that returns a derived object.
  
RECOMMENDATION: Use a single selector that returns a memoized object:
    const settings = useSettingsSelector(s => ({
      isDetailed: s.contextDisplayMode === "detailed",
      temperature: s.temperature,
      topP: s.topP,
      maxOutputTokens: s.maxOutputTokens,
      enableReasoning: s.enableReasoning,
    }))
  
  Note: This requires the selector hook to support shallow comparison for objects,
  otherwise each call returns a new object reference. Verify useSettingsSelector's
  comparison strategy before changing.
```

---

### F13 — Type Assertions in message.tsx Without Narrowing

```
FLOW: chat-send-message | STEP: 9
SEVERITY: [MEDIUM]
FILE: features/chat/components/message.tsx:107, 178
FINDING: Two locations use `as` assertions without full type narrowing:
  
  Line 107: (p.text as string)?.trim()
    The code checks p.type === "text" && "text" in p but then casts p.text as string.
    The "text" in p check confirms the property exists but doesn't narrow its type.
    
  Line 178: const text = part.text as string
    After checking part.type === "text" && "text" in part, casts without narrowing.
    
  These are safe in practice (text parts always have string text), but the `as` casts
  bypass TypeScript's type safety and could mask bugs if the AI SDK changes types.
  
RECOMMENDATION: Use a proper type guard:
    function isTextPart(part: unknown): part is { type: "text"; text: string } {
      return typeof part === "object" && part !== null && 
             "type" in part && part.type === "text" && 
             "text" in part && typeof part.text === "string"
    }
  
  Or extract text parts first with filter + type guard, then map.
```

---

### F14 — processStreamDelta Creates New Object on Every Delta

```
FLOW: state-chat-stream | STEP: 9
SEVERITY: [MEDIUM]
FILE: features/chat/lib/process-stream-deltas.ts:41-100
FINDING: Every processStreamDelta call creates a new UIArtifact object via spread:
    return { ...current, content: current.content + delta.content }
  
  For chatty streams with many deltas per batch, this creates GC pressure.
  Each new object copies all 7 fields even when only 1 changes.
  
  However, the spread is necessary for immutability (useSyncExternalStore requires
  new references to detect changes). The cost is ~7 property copies per delta.
  
RECOMMENDATION: LOW priority — the spread cost is minimal per-delta. If F02 is
  implemented (batch into 1 store update), the intermediate objects are only
  created in the loop and immediately garbage-collected. No change needed unless
  profiling shows GC pressure.
```

---

### F15 — E2E Fixture Files Imported in Production Route

```
FLOW: chat-api-pipeline | N/A
SEVERITY: [MEDIUM]
FILE: app/api/chat/route.ts:22-27
FINDING: The production route.ts unconditionally imports e2e fixture modules:
    import { buildArtifactFixtureTools, createArtifactFixtureModel, 
             toPersistedArtifactFixtureMessages } from "@/features/chat/lib/e2e-artifact-fixture"
    import { ARTIFACT_E2E_COOKIE_NAME } from "@/features/chat/lib/e2e-artifact-fixture-cookie"
  
  Even though the fixture code only executes when the e2e cookie is present, the
  import is static — the entire e2e-artifact-fixture module (280+ lines including
  MockLanguageModelV3, simulateReadableStream, etc.) is bundled into the production
  server bundle.
  
RECOMMENDATION: Use dynamic import behind the cookie check:
    if (useArtifactE2EFixture) {
      const { buildArtifactFixtureTools, createArtifactFixtureModel } = 
        await import("@/features/chat/lib/e2e-artifact-fixture")
      // ...
    }
  
  This removes ~280 lines + test utilities from the production bundle. The cookie
  constant can stay as a static import (it's 1 line).
```

---

### F16 — useChatSession Returns New Object Every Render

```
FLOW: state-chat-stream | STEP: 1
SEVERITY: [MEDIUM]
FILE: features/chat/hooks/use-chat-session.ts:229-248
FINDING: useChatSession returns a new ChatSessionValue object literal on every render:
    return {
      chatId: id, chatModel, setChatModel, isReadonly, messages, status,
      input, setInput, sendMessage, stop, appendMessage, editMessage,
      error, clearError, visibility, setVisibility, availableModels, usage,
    }
  
  This object is passed as the value to ChatSessionContext.Provider. Every time
  this hook re-renders (which happens on every keystroke, every status change,
  every message update), a new object is created and ALL context consumers re-render.
  
  The context consumers are: Messages, MultimodalInput, ChatHeader, MessageActions,
  MessageEditor, SuggestedActions, ContextDisplay (via useChatSessionContext).
  
RECOMMENDATION: Wrap the return value in useMemo:
    return useMemo(() => ({
      chatId: id, chatModel, setChatModel, ...
    }), [id, chatModel, setChatModel, ...all deps])
  
  This prevents context consumers from re-rendering when the object reference
  changes but all values are identical. However, note that during streaming,
  `messages` and `status` change frequently, so the memo would bust often anyway.
  The real benefit is for non-streaming state changes (input, chatModel, etc.).
```

---

### F17 — useSettingsSelector(s => s) Returns Full Store Snapshot

```
FLOW: state-chat-stream | STEP: 2
SEVERITY: [LOW]
FILE: features/chat/hooks/use-chat-session.ts:63
FINDING: useChatSession uses an identity selector for settings:
    const settings = useSettingsSelector((s) => s)
  
  This subscribes to the ENTIRE settings store — any setting change triggers a
  re-render of useChatSession, which cascades to all context consumers. Settings
  changes are infrequent (only when user opens settings panel and modifies values),
  so the practical impact is low. But conceptually, useChatSession only needs
  settings for the transport request body, not for rendering.
  
RECOMMENDATION: Store settings in a ref (already done via settingsRef) and use a
  stable empty selector or remove the hook call entirely. The settings are read
  from settingsRef.current inside the transport, which doesn't need React reactivity.
  
  Alternative: Create a useSettingsSnapshot() that reads once without subscribing.
```

---

### F18 — File Upload Blocks Message Send

```
FLOW: chat-send-message | STEP: 1
SEVERITY: [LOW]
FILE: features/chat/components/multimodal-input.tsx:86-91
FINDING: handleSubmit awaits uploadFiles() before calling sendMessage():
    const files = await uploadFiles(message.files)  // blocks
    sendMessage(message.text, files)
  
  If a user attaches a large file, the message send is blocked until the upload
  completes. The text part of the message could be sent immediately while file
  URLs resolve asynchronously.
  
RECOMMENDATION: LOW priority — parallelizing file upload with message send would
  require the API to accept pending file references and resolve them later, which
  is a significant architectural change. Current behavior is safe and expected UX.
```

---

### F19 — NoticeHandler Uses useSearchParams (Client-Side Only Pattern)

```
FLOW: N/A
SEVERITY: [LOW]
FILE: features/chat/components/notice-handler.tsx:1-30
FINDING: NoticeHandler is a render-null client component that uses useSearchParams()
  to detect notice query params and show toasts. It lives in the chat layout but
  conceptually handles app-wide notices.
  
  The component is minimal and well-implemented. The URL cleanup via
  window.history.replaceState is correct. No issues found.
  
  Minor note: useSearchParams() causes the component to re-render on any search
  param change, not just "notice" changes. In practice, search params rarely change
  in the chat flow, so this is negligible.
  
RECOMMENDATION: No change needed. If notice handling grows, consider moving to a
  standalone feature module rather than keeping it in features/chat/components/.
```

---

### F20 — Adaptive Throttle Computed Once, Never Re-evaluated

```
FLOW: state-chat-stream | STEP: 12
SEVERITY: [LOW]
FILE: features/chat/hooks/use-chat-session.ts:36-42, 86
FINDING: getAdaptiveThrottle() is computed once via useMemo(getAdaptiveThrottle, []):
    function getAdaptiveThrottle(): number {
      if (typeof navigator === "undefined") return 100
      const conn = (navigator as NetworkNavigator).connection
      if (conn?.effectiveType === "4g" || conn?.effectiveType === "5g") return 50
      if (conn?.effectiveType === "3g") return 150
      return 100
    }
  
  Network conditions can change during a session (e.g., WiFi → cellular).
  The computed throttle never updates.
  
RECOMMENDATION: LOW priority — the throttle range is 50-150ms, so the impact of
  a stale value is minor. If desired, re-evaluate on `navigator.connection.onchange`
  event. The useChat hook may not support dynamic throttle values anyway.
```

---

### F21 — e2e-artifact-fixture-cookie.ts is a Single-Line File

```
FLOW: N/A
SEVERITY: [LOW]
FILE: features/chat/lib/e2e-artifact-fixture-cookie.ts:1
FINDING: This file contains exactly one line:
    export const ARTIFACT_E2E_COOKIE_NAME = "e2e-artifact-fixture"
  
  It exists as a separate file to break the import chain — route.ts needs the cookie
  name without importing the full e2e fixture module. This is intentional and correct.
  
  However, if F15 is implemented (dynamic import for e2e fixtures), this constant
  could be inlined or moved to a shared constants file.
  
RECOMMENDATION: No change needed until F15 is addressed. If the dynamic import
  approach is adopted, this file can be deleted and the constant moved to the
  e2e fixture module itself (since it would only be accessed behind the cookie check).
```

---

### F22 — ChatHeader Re-renders on Every Context Change

```
FLOW: N/A (render path)
SEVERITY: [LOW]
FILE: features/chat/components/chat-header.tsx:17
FINDING: ChatHeader calls useChatSessionContext() and destructures:
    const { chatModel, setChatModel, availableModels } = useChatSessionContext()
  
  It only needs chatModel, setChatModel, and availableModels — but the context
  consumer re-renders whenever ANY value in the context changes (messages, status,
  input, usage, etc.). During streaming, this means ChatHeader re-renders ~60 times/sec
  even though none of its data changes.
  
  React should bail out via virtual DOM diffing (same JSX output), but the function
  body still executes, including ModelSelector and VisibilitySelector renders.
  
RECOMMENDATION: Wrap ChatHeader in React.memo if profiling shows it as a hot path.
  Alternatively, split the context into read-heavy (messages, status) and config-heavy
  (chatModel, availableModels, visibility) channels. This is a larger architectural
  change and may not be worth the complexity.
```

---

### F23 — Double Message Conversion (DB → UIMessage → ModelMessage)

```
FLOW: chat-api-pipeline | STEP: 5h → STEP: 11
SEVERITY: [LOW]
FILE: features/chat/lib/chat-route.ts:194-196 → app/api/chat/route.ts:163
FINDING: Messages undergo a double conversion:
  1. DB messages → UIMessages via convertToUIMessages() (chat-route.ts:194)
  2. UIMessages → ModelMessages via convertToModelMessages() (route.ts:163)
  
  The intermediate UIMessage format exists because allMessages is also used to build
  the client-visible message history. The DB format stores role/parts identically to
  UIMessage, so the first conversion is essentially a type assertion.
  
RECOMMENDATION: LOW priority — the conversion functions are lightweight (map + type
  assertion). The UIMessage intermediate is architecturally correct because it's the
  contract between server and client. Eliminating it would couple DB storage to the
  AI SDK's internal message format.
```

---

## Summary by Category

### Architecture (2 findings)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F01 | CRITICAL | stream-bridge.tsx | StreamBridge indirection adds 2 frames latency |
| F08 | MEDIUM | chat-stream-provider.tsx | chatStream array grows unbounded during streaming |

### Performance (6 findings)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F02 | CRITICAL | stream-bridge.tsx | N store emissions per RAF batch instead of 1 |
| F03 | HIGH | route.ts / chat-route.ts | Sequential rate-limit + parse could parallelize |
| F09 | MEDIUM | messages.tsx | MessageItem deep-equal on all messages per render |
| F10 | MEDIUM | message-actions.tsx | Redundant deep-equal in nested memo |
| F14 | MEDIUM | process-stream-deltas.ts | New object allocation per delta (acceptable) |
| F16 | MEDIUM | use-chat-session.ts | Context value object recreated every render |

### Data Efficiency (3 findings)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F04 | HIGH | delete-chat.ts, delete-trailing-messages.ts | Full Chat entity for userId-only check |
| F05 | HIGH | chat-route.ts | Full model catalog for single ID validation |
| F23 | LOW | chat-route.ts / route.ts | Double message format conversion |

### Dead Code (2 findings)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F06 | HIGH | chat.schema.ts | 4 unused schema/type exports |
| F15 | MEDIUM | route.ts / e2e-artifact-fixture.ts | E2E fixtures in production bundle |

### Re-render Analysis (3 findings)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F12 | MEDIUM | context-display.tsx | 5 separate settings selector subscriptions |
| F17 | LOW | use-chat-session.ts | Identity selector subscribes to full settings store |
| F22 | LOW | chat-header.tsx | Re-renders on every context change |

### Type Safety (1 finding)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F13 | MEDIUM | message.tsx | `as string` assertions without proper narrowing |

### Misc (6 findings)
| ID | Severity | File | Summary |
|----|----------|------|---------|
| F07 | HIGH | greeting.tsx | Pure static component (server component candidate) |
| F11 | MEDIUM | weather.ts | Module-level cache with no size bound |
| F18 | LOW | multimodal-input.tsx | File upload blocks message send |
| F19 | LOW | notice-handler.tsx | No issues (informational) |
| F20 | LOW | use-chat-session.ts | Adaptive throttle never re-evaluated |
| F21 | LOW | e2e-artifact-fixture-cookie.ts | Single-line file (intentional) |

---

## Clean Bill Items

The following areas were audited and found **no issues**:

| Area | Assessment |
|------|------------|
| TypeScript strictness | ✅ Zero `any` types across all 30 files |
| Zod validation | ✅ All API inputs validated; schemas correctly structured |
| Error handling | ✅ Server actions return ActionResult, tools throw AppError, persistence has 3-retry + recovery |
| useEffect cleanup | ✅ RAF cleanup in ChatStreamProvider, IntersectionObserver disconnect in useScrollToBottom |
| Memory leaks | ✅ All subscriptions properly cleaned up; no dangling event listeners |
| Server Action patterns | ✅ Consistent validate → auth → authorize → execute → invalidate pattern |
| ChatShell size | ✅ ~55 lines (spec requires ≤80) |
| Import boundaries | ✅ All imports respect feature → lib direction; no cross-feature imports |
| Naming conventions | ✅ Files kebab-case, components PascalCase, hooks camelCase with use prefix |

---

## Priority Ordering for Implementation

1. **F01 + F02** (CRITICAL) — Eliminate StreamBridge, batch artifact store updates. These are the highest-impact changes and address T5 + T7 from Wave 0.
2. **F06** (HIGH) — Remove dead schema exports. 5-minute change, zero risk.
3. **F04** (HIGH) — Lightweight ownership queries. Shared pattern across 5 actions.
4. **F15** (MEDIUM) — Dynamic import for e2e fixtures. Cleans up production bundle.
5. **F03** (HIGH) — Parallelize rate-limit + parse. Simple Promise.all refactor.
6. **F05** (HIGH) — Targeted model lookup. Depends on whether catalog is cached.
7. **F13** (MEDIUM) — Fix `as` assertions with proper type guards.
8. **F16** (MEDIUM) — Memoize context value.
9. **F09 + F10** (MEDIUM) — Optimize memo comparators.
10. **F12** (MEDIUM) — Consolidate settings selectors.
