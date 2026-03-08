# 🏛️ Codebase Flow Analysis — `ai-assistant`

**Scribe:** Thoth · **Date:** 2026-03-07 · **Confidence:** HIGH

> *Every flow traced from trigger to final state, with exact file paths and function names.*

---

## Table of Contents

1. [First Paint Flow — New User Visits `/`](#1-first-paint-flow--new-user-visits-)
2. [Chat Message Flow — User Sends a Message](#2-chat-message-flow--user-sends-a-message)
3. [Artifact Creation Flow — AI Creates an Artifact](#3-artifact-creation-flow--ai-creates-an-artifact)
4. [Artifact Update Flow — AI Updates an Artifact](#4-artifact-update-flow--ai-updates-an-artifact)
5. [Auth Flow — Login](#5-auth-flow--login)
6. [Auth Flow — Guest Token Lifecycle](#6-auth-flow--guest-token-lifecycle)
7. [Session Resolution Flow](#7-session-resolution-flow)
8. [Sidebar History Flow](#8-sidebar-history-flow)
9. [Voting Flow](#9-voting-flow)
10. [Cache Invalidation Flow](#10-cache-invalidation-flow)
11. [State Management Architecture](#11-state-management-architecture)
12. [Error Handling Flow](#12-error-handling-flow)
13. [Rate Limiting Flow](#13-rate-limiting-flow)
14. [Registration Flow](#14-registration-flow)
15. [Logout Flow](#15-logout-flow)
16. [Delete Chat Flow](#16-delete-chat-flow)
17. [Delete Trailing Messages (Edit Message) Flow](#17-delete-trailing-messages-edit-message-flow)
18. [Rename Chat Flow](#18-rename-chat-flow)
19. [Update Chat Visibility Flow](#19-update-chat-visibility-flow)
20. [File Upload Flow](#20-file-upload-flow)
21. [Artifact Save Flow (Manual Edit)](#21-artifact-save-flow-manual-edit)
22. [Artifact Restore (Version History) Flow](#22-artifact-restore-version-history-flow)
23. [Artifact Version History Fetch Flow](#23-artifact-version-history-fetch-flow)
24. [Suggestions Flow (AI Tool → Client)](#24-suggestions-flow-ai-tool--client)
25. [Title Generation Flow](#25-title-generation-flow)
26. [Model Resolution & Reasoning Middleware Flow](#26-model-resolution--reasoning-middleware-flow)
27. [Model Catalog & OpenRouter Discovery Flow](#27-model-catalog--openrouter-discovery-flow)
28. [Settings Persistence & Cross-Tab Sync Flow](#28-settings-persistence--cross-tab-sync-flow)
29. [Votes Provider & Optimistic Voting Flow (Detailed)](#29-votes-provider--optimistic-voting-flow-detailed)
30. [Health Check Flow](#30-health-check-flow)
31. [CSRF Protection Flow](#31-csrf-protection-flow)
32. [Existing Chat Page Load Flow (Detailed)](#32-existing-chat-page-load-flow-detailed)
33. [Artifact Handler Registry Flow](#33-artifact-handler-registry-flow)
34. [Internal Model Resolution](#34-internal-model-resolution)
35. [Deferred Artifact Clear Writer](#35-deferred-artifact-clear-writer-update-specific-pattern)
36. [Persistence Retry Flow](#36-persistence-retry-flow)

---

## 1. First Paint Flow — New User Visits `/`

> What happens from the moment a new user types the URL to the first rendered pixel.

### Step-by-Step

```
BROWSER: GET /
    │
    ▼
PROXY (proxy.ts:165)
    │ classifyRoute("/") → "guest-eligible"
    │ hasSupabaseToken? → NO
    │ guestToken cookie? → NO
    │ → mintGuestTokenResponse()
    │   ├── crypto.randomUUID() → guestId
    │   ├── mintGuestToken(guestId) → JWT (1h TTL, HS256)
    │   │   [lib/auth/guest.ts:48 → SignJWT]
    │   ├── Set-Cookie: guest_token=<jwt>; HttpOnly; SameSite=Lax; Max-Age=604800
    │   └── Forward request with cookie in headers
    │
    ▼
NEXT.JS ROUTER: app/(chat)/page.tsx (Server Component)
    │
    ▼
LAYOUT CHAIN (outermost → innermost):
    │
    ├── app/layout.tsx (Root)
    │   ├── Fonts: GeistSans, GeistMono (CSS variables)
    │   ├── ThemeProvider (next-themes, system default)
    │   ├── TooltipProvider (delayDuration=0)
    │   └── Toaster (sonner)
    │
    └── app/(chat)/layout.tsx (Chat)
        │
        │ 1. const sessionPromise = getAppSession()
        │    [lib/auth/session.ts:132 → React.cache()]
        │    Pipeline: resolveSupabaseSession() → null
        │              resolveGuestSession() → reads cookie → verifyGuestToken()
        │              → { user: { id: guestId, type: "guest" } }
        │
        │ 2. <NoticeHandler /> in Suspense
        │ 3. <SessionProvider session={sessionPromise}>
        │      → SessionProvider receives a PROMISE (not resolved session)
        │      → Sets isLoading=true, session=null initially
        │      → Promise resolves → session={...}, isLoading=false
        │ 4. <PendingChatsProvider>
        │      → Empty entries=[] initially
        │ 5. <Suspense fallback={<ChatLayoutFallback>}>
        │      └── <ChatLayoutShell>
        │          │ await getSidebarDefaultOpen()
        │          │   → reads "sidebar_state" cookie → defaults true
        │          │
        │          ├── <SidebarProvider defaultOpen={true}>
        │          │   └── <SidebarShell /> (Suspense boundary, server component)
        │          │       │ await getAppSession() → reuses React.cache → same session
        │          │       │ await getCachedChats(userId)
        │          │       │   'use cache' + cacheTag("chats:<userId>") + cacheLife("seconds")
        │          │       │   → getChatsByUserId(userId, {limit: 20})
        │          │       │   → Returns initial 20 chats (or empty for new user)
        │          │       │
        │          │       └── <SidebarHistoryClient initialChats={[]} initialHasMore={false} />
        │          │           → useSWRInfinite with fallbackData
        │          │           → No initial fetch (revalidateOnMount=false when fallback exists)
        │          │
        │          └── <SidebarInset>{children}</SidebarInset>
        │              └── page.tsx content renders here
        │
    ▼
PAGE: app/(chat)/page.tsx
    │
    │ 1. const availableModelsPromise = getAvailableModels()
    │    [features/models/lib/models.ts → 'use cache' + cacheTag("models") + cacheLife("hours")]
    │    → Static model catalog + conditional OpenRouter discovery
    │
    │ 2. await Promise.all([searchParams, availableModels, getDefaultModel(null, promise)])
    │    → getDefaultModel: reads "chat-model" cookie → falls back to DEFAULT_CHAT_MODEL
    │
    │ 3. const id = generateUUID() → crypto.randomUUID()
    │
    │ 4. Renders:
    │    <ChatStreamProvider>         ← page-scoped SSE data part accumulator
    │      <ChatShell                 ← main orchestrator
    │        id={uuid}
    │        initialMessages={[]}
    │        initialChatModel="google:gemma-3-4b-it"
    │        isReadonly={false}
    │        initialVisibility="private"
    │        availableModels={[...]}
    │      />
    │    </ChatStreamProvider>
    │
    ▼
CLIENT HYDRATION:
    │
    ├── ChatStreamProvider mounts
    │   → useState<DataPart[]>([]) — empty stream buffer
    │   → RAF batching via requestAnimationFrame
    │
    └── ChatShell mounts
        │
        ├── useChatSession({...})
        │   ├── useState for: input, chatModel, visibility, usage
        │   ├── useSettingsSelector(s => s) → reads from settingsStore (useSyncExternalStore)
        │   │   [features/settings/hooks/use-settings.ts → module-level store → localStorage]
        │   ├── useChatStreamDispatch() → gets setChatStream from DispatchCtx
        │   ├── useMemo(() => getAdaptiveThrottle()) → 50–150ms based on network
        │   ├── useMemo(() => new DefaultChatTransport({api: "/api/chat", ...}))
        │   └── useChat({id, messages, transport, onData, onFinish, onError})
        │       [@ai-sdk/react — core streaming hook]
        │
        ├── useChatSideEffects({id, messages, stop, onChatChange})
        │   → Resets artifact store on chat change
        │
        └── Renders:
            <ChatSessionContext.Provider value={session}>
              <ChatHeader />        ← model selector, settings, visibility toggle
              <Messages />          ← message list with scroll-to-bottom
              <MultimodalInput />   ← text input + file upload (sticky bottom)
              <StreamBridge />      ← null renderer, processes stream → artifact store
              <ArtifactPanel />     ← lazy-loaded via dynamic(), SSR=false
            </ChatSessionContext.Provider>
```

### First Paint Summary

| Step | Location | Blocking? | What Happens |
|------|----------|-----------|--------------|
| DNS + TCP | Browser | Yes | Network connection |
| Proxy | `proxy.ts` | Yes | Classify route, mint guest JWT, set cookie |
| Root Layout | `app/layout.tsx` | Yes (RSC) | Static shell: fonts, theme, tooltip, toaster |
| Chat Layout | `app/(chat)/layout.tsx` | Partial | Session promise started, sidebar in Suspense |
| Session | `lib/auth/session.ts` | Yes (awaited) | Supabase → Guest JWT → AppSession |
| Models | `features/models/lib/models.ts` | Yes (awaited) | Cached model catalog (hours TTL) |
| Sidebar | `sidebar-shell.tsx` | Suspense | Cached initial 20 chats |
| Page | `app/(chat)/page.tsx` | No (streams) | ChatStreamProvider → ChatShell → hydrate |

---

## 2. Chat Message Flow — User Sends a Message

> From keystroke to persisted response, through every layer.

### Phase 1: Client-Side Dispatch

```
USER: Types "Hello" → presses Enter
    │
    ▼
MultimodalInput (features/chat/components/multimodal-input.tsx)
    │ onSubmit → calls sendMessage(input) from ChatSessionContext
    │
    ▼
useChatSession.sendMessage (features/chat/hooks/use-chat-session.ts:160)
    │
    │ 1. text = input.trim() → "Hello"
    │ 2. isReadonly? → NO
    │ 3. messages.length === 0? → YES (new chat)
    │    → callbacksRef.current.onNewChat({
    │        id: chatId,
    │        title: "Hello",            ← first 50 chars
    │        visibility: "private",
    │        createdAt: new Date()
    │      })
    │    → PendingChatsProvider.add() — optimistic sidebar entry
    │
    │ 4. sdkSendMessage({ text: "Hello" })
    │    → AI SDK's useChat.sendMessage
    │ 5. setInput("") — clear input field
    │ 6. setUsage(undefined) — reset token counter
```

### Phase 2: Network — Client → Server

```
AI SDK DefaultChatTransport
    │ prepareSendMessagesRequest() merges:
    │   body: {
    │     id: chatId,
    │     message: { id: msgId, role: "user", parts: [{ type: "text", text: "Hello" }] },
    │     selectedChatModel: "google:gemma-3-4b-it",
    │     selectedVisibilityType: "private",
    │     settings: { temperature: 1, topP: 1, maxOutputTokens: 16384, ... }
    │   }
    │
    ▼
HTTP: POST /api/chat (Content-Type: application/json)
    │ Headers: Cookie: guest_token=<jwt>, Origin: https://...
```

### Phase 3: Server-Side Processing

```
app/api/chat/route.ts:POST
    │
    │ STEP 1: CSRF Check
    │ validateOrigin(request) [lib/utils/validate-origin.ts]
    │   → Compare Origin header vs NEXTAUTH_URL/Vercel URL
    │   → Fail → 403 AppError("forbidden:api:csrf_failed")
    │
    │ STEP 2: Authentication
    │ requireChatSession() [features/chat/lib/chat-route.ts:108]
    │   → getAppSession() [lib/auth/session.ts:132]
    │     → resolveSupabaseSession() → reads Supabase cookies → getUser()
    │     → OR resolveGuestSession() → reads guest_token cookie → verifyGuestToken()
    │   → Fail → 401 AppError("unauthorized:chat:auth_required")
    │
    │ STEP 3: Rate Limiting
    │ enforceChatRateLimit(userId) [features/chat/lib/chat-route.ts:116]
    │   → checkRateLimit("rate-limit-chat:<userId>", 20, 60) [lib/cache/rate-limit.ts:12]
    │     → Redis INCR + EXPIRE
    │     → Redis unavailable? → Allow (graceful degradation)
    │   → Over limit → 429 AppError("rate_limit:chat:too_many_requests")
    │
    │ STEP 4: Parse & Validate Request
    │ readChatRequest(request) [features/chat/lib/chat-route.ts:125]
    │   → request.json() → chatRequestSchema.safeParse(body)
    │   → Fail → 400 AppError("bad_request:api:invalid_request_body")
    │
    │ STEP 5: Resolve Context
    │ resolveChatRouteContext({session, requestData}) [features/chat/lib/chat-route.ts:139]
    │   ├── Promise.all([getAvailableModels(), getChatById(chatId)])
    │   ├── Validate model exists in available models
    │   │   → Fail → 400 AppError("bad_request:chat:invalid_model_id")
    │   ├── If existing chat: verify ownership
    │   │   → Fail → 403 AppError("forbidden:chat:owner_mismatch")
    │   ├── If new chat:
    │   │   ├── ensureGuestUser(userId) [lib/data/user.ts] (if guest)
    │   │   └── createChatWithInitialMessage({id, userId, title, model, visibility, message})
    │   │       [lib/data/chat.ts → DB transaction: INSERT chat + INSERT message]
    │   ├── If existing chat: saveMessages([userMessage])
    │   ├── Fetch existing messages: getMessagesForChatRender(chatId)
    │   ├── Determine tools: getEnabledTools(modelMetadata) → ["getWeather", "createArtifact", ...]
    │   └── Return ChatRouteContext { chatId, allMessages, hasTools, isNewChat, ... }
    │
    ▼
STREAMING PHASE:
    │
    │ STEP 6: Create UI Message Stream
    │ createUIMessageStream({ execute, generateId, onError })
    │
    │ Inside execute({ writer }):
    │   ├── If isNewChat: fire-and-forget generateTitle(messageText)
    │   │   [lib/ai/title.ts → streamText → first 50 chars with 5s timeout]
    │   │   → On success: writer.write({ type: "data-chat-title", data: title })
    │   │
    │   ├── Compose system prompt:
    │   │   composeSystemPrompt({settings, hasTools}) [lib/ai/prompts.ts:100]
    │   │     → BASE_PROMPT + dateContext + userCustomPrompt(wrapped) + ARTIFACTS_PROMPT(if tools)
    │   │
    │   ├── Build provider options:
    │   │   getProviderOptions(selectedChatModel, settings) [lib/ai/provider-options.ts:52]
    │   │     → { temperature, topP, maxOutputTokens, providerOptions(reasoning) }
    │   │
    │   ├── Build tools:
    │   │   buildChatTools({hasTools, chatId, chatStream, session}) [chat-route.ts:223]
    │   │     → { getWeather, createArtifact, updateArtifact, requestSuggestions }
    │   │     → Each tool is a factory that closes over session + chatStream
    │   │
    │   ├── Resolve model:
    │   │   myProvider.languageModel(selectedChatModel) [lib/ai/provider.ts:53]
    │   │     → registry.languageModel("google:gemma-3-4b-it")
    │   │     → Check reasoningTag → wrap with extractReasoningMiddleware if present
    │   │
    │   ├── STREAM TEXT:
    │   │   streamText({
    │   │     model, system, messages, tools,
    │   │     ...providerOpts,
    │   │     experimental_transform: smoothStream(),
    │   │     stopWhen: stepCountIs(5),        ← max 5 tool calls per turn
    │   │     abortSignal: request.signal      ← client disconnect → abort
    │   │   })
    │   │
    │   ├── MERGE STREAM:
    │   │   writer.merge(result.toUIMessageStream({
    │   │     sendReasoning: true,
    │   │     generateMessageId: generateUUID,
    │   │     onFinish: async ({ messages }) => {
    │   │       // PERSIST RESPONSE
    │   │       persistChatResponse({chatId, userId, responseMessages, isNewChat, generatedTitle})
    │   │         → toAssistantDbMessages() → saveMessagesAndTouchChat()
    │   │         → runWithPersistenceRetries() (3 attempts: 0ms, 150ms, 400ms)
    │   │         → refreshChat(chatId) + refreshChatList(userId) [revalidateTag]
    │   │
    │   │       // ON FAILURE → recoverChatPersistenceFailure()
    │   │         → Saves a recovery message + emits "data-error" signal to client
    │   │     }
    │   │   }))
    │   │
    │   ├── Emit generated title (if ready):
    │   │   writer.write({ type: "data-chat-title", data: generatedTitle })
    │   │
    │   └── Emit usage stats:
    │       writer.write({ type: "data-usage", data: JSON.stringify(usage) })
    │
    ▼
RESPONSE: SSE stream (JsonToSseTransformStream)
    │ Cache-Control: no-store
    │ Content-Type: text/event-stream
```

### Phase 4: Client-Side Stream Processing

```
AI SDK useChat (internal SSE reader)
    │ Parses SSE events → updates messages state
    │ experimental_throttle: 50–150ms (adaptive)
    │
    │ For each data part:
    │   useChat.onData(dataPart) [use-chat-session.ts:121]
    │     │
    │     ├── type: "data-artifact-*"
    │     │   → Strip "data-" prefix → setChatStream([{type, content}])
    │     │   → ChatStreamProvider receives DataPart[]
    │     │   → RAF batches into single state update (~60 fps)
    │     │
    │     ├── type: "data-chat-title"
    │     │   → callbacksRef.current.onTitleUpdate(id, data)
    │     │   → PendingChatsProvider.patch(chatId, {title})
    │     │
    │     ├── type: "data-usage"
    │     │   → setUsage(JSON.parse(data))
    │     │
    │     └── type: "data-error"
    │         → toast.error(data)
    │
    ▼
StreamBridge (features/chat/components/stream-bridge.tsx)
    │ useEffect watches chatStream from ChatStreamProvider
    │ Processes unprocessed deltas since lastProcessedRef
    │
    │ For each DataPart:
    │   processStreamDelta(delta, currentArtifact) [process-stream-deltas.ts:45]
    │     → Pure function: applies delta to UIArtifact state
    │     → Returns new UIArtifact object
    │
    │ onArtifactDelta(artifact) → ChatShell callback
    │   → artifactStore.setState(() => artifact)
    │     [features/artifacts/lib/artifact-store.ts:54]
    │     → Module-level singleton → emitChange() → all subscribers re-render
    │
    ▼
UI UPDATES:
    │
    ├── Messages component: re-renders with new message parts
    ├── ArtifactPanel (if visible): re-renders with new content
    └── ChatHeader: may update with new model/title info
```

### Phase 5: Stream Completion

```
AI SDK useChat.onFinish [use-chat-session.ts:141]
    │ setChatStream(() => []) — clear stream buffer (function updater = bypass RAF)
    │
    ▼
SERVER-SIDE (inside onFinish callback of toUIMessageStream):
    │ persistChatResponse()
    │   → saveMessagesAndTouchChat() with retries
    │   → refreshChat(chatId) + refreshChatList(userId)
    │
    ▼
CLIENT-SIDE (SWR polling on next revalidateOnFocus):
    │ SidebarHistoryClient picks up new/updated chat via SWR
    │ PendingChatsProvider.markConfirmed(chatId) — once server copy appears
```

---

## 3. Artifact Creation Flow — AI Creates an Artifact

> Triggered when the AI model decides to call the `createArtifact` tool.

```
AI MODEL: Calls createArtifact({ title: "Hello World", kind: "code" })
    │
    ▼
TOOL EXECUTION (features/chat/lib/tools/create-artifact.ts)
    │
    │ 1. const id = generateUUID()
    │
    │ 2. writeArtifactCreatePrelude(chatStream, {id, title, kind})
    │    [artifact-tool-utils.ts:87]
    │      → chatStream.writeData({ type: "artifact-kind", content: "code" })
    │      → chatStream.writeData({ type: "artifact-id", content: id })
    │      → chatStream.writeData({ type: "artifact-title", content: "Hello World" })
    │      → writeArtifactClear(chatStream)
    │        → chatStream.writeData({ type: "artifact-clear", content: "" })
    │
    │    Each writeData call:
    │      chatRoute's chatStream.writeData({type, content})
    │        → writer.write({ type: `data-${type}`, data: content })
    │          → SSE event → client
    │
    │ 3. const handler = getArtifactHandler("code")
    │    [lib/ai/artifact-handlers.ts:43 → handlers Map lookup]
    │    → Returns codeHandler (registered via side-effect import)
    │
    │ 4. const content = await handler.create({id, title, kind, chatId, session, chatStream})
    │    [features/artifacts/handlers/code-handler.ts]
    │      → streamText({
    │          model: getInternalLanguageModel("artifact"),
    │          system: CODE_PROMPT,
    │          prompt: title,
    │          experimental_transform: smoothStream()
    │        })
    │      → collectTextStreamDeltas({fullStream, chatStream, eventType: "artifact-codeDelta"})
    │        [stream-artifact-deltas.ts:16]
    │          → For each text-delta part:
    │            content += part.text
    │            chatStream.writeData({ type: "artifact-codeDelta", content: part.text })
    │              → SSE → client → processStreamDelta → artifactStore
    │
    │ 5. ensureArtifactContent(content, "create")
    │    → Throws if empty: AppError("ai_error:artifact:empty_output")
    │
    │ 6. await saveArtifactVersion({id, title, content, kind, userId, chatId})
    │    [lib/data/artifact.ts → INSERT into Artifact table]
    │    Composite PK: (id, createdAt) — each save = new version
    │
    │ 7. writeArtifactFinish(chatStream)
    │      → chatStream.writeData({ type: "artifact-finish", content: "" })
    │        → SSE → client → processStreamDelta → artifact.status = "idle"
    │
    │ 8. Return { id, title, kind, content: 'Created artifact: "Hello World"' }
    │    → AI model sees this as tool result
    │    → May produce a text response referencing the artifact
```

### Client-Side Artifact Rendering

```
processStreamDelta receives sequence:
    │
    │ artifact-kind "code"     → { ...current, kind: "code" }
    │ artifact-id "uuid"       → { ...current, artifactId: "uuid", status: "streaming", isVisible: true }
    │ artifact-title "Hello.." → { ...current, title: "Hello World" }
    │ artifact-clear ""        → { ...current, content: "", suggestions: [] }
    │ artifact-codeDelta "..."  → { ...current, content: "..." } (REPLACE semantics)
    │ artifact-codeDelta "..."  → { ...current, content: "..." } (each delta replaces fully)
    │ artifact-finish ""       → { ...current, status: "idle" }
    │
    ▼
artifactStore.setState(updater)
    │ listeners.forEach(l => l()) — notifies all useSyncExternalStore subscribers
    │
    ▼
ArtifactPanel (dynamic import, SSR=false)
    │ useArtifact() / useArtifactSelector() → reads from artifactStore
    │ isVisible: true → panel slides in
    │ status: "streaming" → shows loading indicator
    │ kind: "code" → renders CodeEditor (CodeMirror-based)
    │ status: "idle" → enables editing, save, copy actions
```

---

## 4. Artifact Update Flow — AI Updates an Artifact

```
AI MODEL: Calls updateArtifact({ id: "uuid", description: "Add error handling" })
    │
    ▼
TOOL EXECUTION (features/chat/lib/tools/update-artifact.ts)
    │
    │ 1. const artifact = await getArtifactById(id)
    │    [lib/data/artifact.ts → SELECT latest version by id]
    │
    │ 2. Ownership check: artifact.userId !== session.userId → 403
    │
    │ 3. const updateStream = createDeferredArtifactClearWriter(chatStream)
    │    [artifact-tool-utils.ts:39]
    │    → Wraps chatStream to defer the "artifact-clear" signal
    │    → First usable content delta triggers clear (avoids flash-of-empty)
    │    → Buffers leading whitespace for text deltas
    │
    │ 4. handler = getArtifactHandler(artifact.kind)
    │    handler.update({currentContent, description, chatStream: updateStream, ...})
    │    → Uses getUpdateArtifactPrompt(currentContent, kind)
    │    → Streams deltas through deferred clear writer → SSE → client
    │
    │ 5. saveArtifactVersion({...}) → new version row (composite PK)
    │    → Previous versions remain (version history)
    │
    │ 6. writeArtifactFinish(chatStream)
```

**Key difference from create:** The deferred clear writer prevents the artifact panel from showing empty content during the update. It waits until the first meaningful content delta arrives before clearing.

---

## 5. Auth Flow — Login

```
USER: Fills email + password → clicks "Sign In"
    │
    ▼
AuthForm (features/auth/components/auth-form.tsx)
    │ Client-side Zod validation: loginSchema.safeParse({email, password})
    │ → Fail → show inline error (no network request)
    │ → Pass → submit via useActionState
    │
    ▼
SERVER ACTION: login(_prevState, formData) [features/auth/actions/login.ts]
    │
    │ STEP 1: Server-side validation
    │ loginSchema.safeParse({email, password})
    │   → Fail → ActionResult { success: false, error: {code: "bad_request:validation:*"} }
    │
    │ STEP 2: Rate limit (5/min per IP)
    │ enforceAuthRateLimit({createKey: rateLimitKeys.rateLimitLogin, limit: 5, window: 60})
    │   → Redis INCR "rate-limit-login:<ip>"
    │   → Redis down? → Skip (graceful degradation)
    │   → Over limit → ActionResult { success: false, error: {code: "rate_limit:auth:*"} }
    │
    │ STEP 3: Create Supabase action client
    │ createSupabaseActionClient() [features/auth/lib/supabase-action.ts]
    │   → Uses cookies() with read+write access (Server Action context)
    │   → Falls back to null if env vars missing
    │
    │ STEP 4: Supabase sign-in
    │ supabase.auth.signInWithPassword({ email, password })
    │   → Sets Supabase auth cookies via setAll callback
    │   → Fail → ActionResult { code: "unauthorized:auth:no_session" }
    │
    │ STEP 5: Reconcile partial registration (D012 edge case)
    │ getUserById(data.user.id) → if null → createUser({id, email})
    │   → Handles: Supabase signUp succeeded but createUser failed during registration
    │
    │ STEP 6: Migrate guest data
    │ migrateGuestChatsAndClearToken(userId, "login")
    │   → Reads guest_token cookie → verifyGuestToken() → get guestId
    │   → UPDATE chats SET userId = authUserId WHERE userId = guestId
    │   → DELETE guest_token cookie
    │
    │ STEP 7: Redirect
    │ redirect("/") — throws NEXT_REDIRECT (must be outside try/catch)
    │
    ▼
CLIENT: SessionProvider detects auth change
    │ Supabase onAuthStateChange fires "SIGNED_IN"
    │ → router.refresh() — revalidates all server components
    │ → Session context updates: isGuest=false, email=user.email
```

---

## 6. Auth Flow — Guest Token Lifecycle

```
PROXY.TS handles ALL guest token operations at the edge:

┌─────────────────────────────────────────────────────────────────┐
│ ROUTE: guest-eligible, NO Supabase token, NO guest token        │
│ ACTION: Mint new token                                          │
│                                                                 │
│ crypto.randomUUID() → guestId                                   │
│ mintGuestToken(guestId) → JWT { sub: guestId, type: "guest" }   │
│   HS256, exp: now + 3600s (1 hour)                              │
│                                                                 │
│ DUAL-WRITE PATTERN:                                             │
│  1. Forward cookie in request headers (for downstream reads)    │
│  2. Set-Cookie on response (for browser persistence)            │
│  Cookie: guest_token; HttpOnly; Secure(prod); SameSite=Lax      │
│  Max-Age: 604800 (7 days — browser keeps it beyond JWT expiry)  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ROUTE: guest-eligible, NO Supabase token, HAS guest token       │
│ ACTION: Verify and maybe rotate                                 │
│                                                                 │
│ verifyGuestToken(token)                                         │
│  → jwtVerify(token, secret, { algorithms: ["HS256"] })          │
│  → Extracts: { userId: sub, iat, exp }                          │
│                                                                 │
│ IF VALID:                                                       │
│   rotateGuestToken(token)                                       │
│     → Check: (now - iat) > ROTATION_THRESHOLD (30 min)?         │
│     → YES: mint new token with SAME userId, fresh iat/exp       │
│     → NO: return original token (no rotation needed)            │
│   IF rotated ≠ original:                                        │
│     → Dual-write new token (request headers + Set-Cookie)       │
│   ELSE:                                                         │
│     → Forward without cookie changes                            │
│                                                                 │
│ IF INVALID/EXPIRED:                                             │
│   → Mint fresh token with NEW userId (old session is lost)      │
│   → Dual-write new token                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ROUTE: auth-required, NO Supabase token, guest token UNVERIFIED │
│ ACTION: Verify or redirect                                      │
│                                                                 │
│ IF has valid guest token: forward (guest can access auth routes)│
│ IF no valid token: redirect → /login                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ROUTE: any, HAS Supabase token                                  │
│ ACTION: Skip guest handling entirely                            │
│                                                                 │
│ Supabase token takes priority — guest token is ignored          │
│ Forward request normally                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Session Resolution Flow

```
getAppSession() [lib/auth/session.ts:132]
    │ Wrapped in React.cache() — memoized per-request
    │
    │ STEP 1: Try Supabase
    │ resolveSupabaseSession()
    │   ├── createSupabaseServerClient() — reads cookies via next/headers
    │   ├── supabase.auth.getUser() — verifies token server-side
    │   └── Returns: AppSession { user: { id, type: "authenticated", email } }
    │       or null
    │
    │ STEP 2: Try Guest (only if Supabase returned null)
    │ resolveGuestSession()
    │   ├── cookies().get("guest_token")
    │   ├── verifyGuestToken(token) → { userId }
    │   └── Returns: AppSession { user: { id: userId, type: "guest" } }
    │       or null
    │
    │ STEP 3: Return null (no valid session of any type)
    │
    ▼
RESULT: AppSession | null

CONSUMERS: Every server action, API route, layout, and page that needs auth.
CACHING: React.cache() ensures ONE session resolution per HTTP request.
NEVER THROWS: Returns null on any error — graceful degradation.
```

---

## 8. Sidebar History Flow

### Initial Load (Server-Side)

```
SidebarShell (features/sidebar/components/sidebar-shell.tsx)
    │ async Server Component
    │
    │ 1. await getAppSession() → session
    │ 2. await getCachedChats(userId)
    │      'use cache'
    │      cacheLife("seconds")
    │      cacheTag("chats:<userId>")
    │      → getChatsByUserId(userId, { limit: 20 })
    │          [lib/data/chat.ts:44 → SELECT ... ORDER BY updatedAt DESC LIMIT 21]
    │          → Returns { chats: first 20, hasMore: rows > 20 }
    │
    │ 3. <SidebarHistoryClient initialChats={chats} initialHasMore={hasMore} />
```

### Client-Side Pagination

```
SidebarHistoryClient (features/sidebar/components/sidebar-history-client.tsx)
    │
    │ useSidebarHistory({ initialData: { chats, hasMore } })
    │   [features/sidebar/hooks/use-sidebar-history.ts]
    │
    │ useSWRInfinite(getKey, historyFetcher, {
    │   fallbackData: [{ chats, hasMore, nextCursor }],  ← from server
    │   revalidateOnMount: false,                         ← skip redundant fetch
    │   revalidateFirstPage: false,
    │   revalidateOnFocus: true,
    │   revalidateOnReconnect: true,
    │ })
    │
    │ KEY GENERATOR:
    │   page 0: "/api/history?limit=20"
    │   page N: "/api/history?limit=20&cursor=<lastId>"
    │   null: when previousPage.hasMore === false (stop fetching)
    │
    │ LOAD MORE:
    │   loadMore() → setSize(prev => prev + 1)
    │   → SWR loads next page key → GET /api/history?limit=20&cursor=<id>
    │
    ▼
GET /api/history (app/api/history/route.ts)
    │ 1. getAppSession() → auth check
    │ 2. historyQuerySchema.safeParse(searchParams) → { limit, cursor }
    │ 3. getChatsByUserId(userId, { limit, cursor })
    │    → SELECT ... WHERE userId = ? AND id < cursor ORDER BY updatedAt DESC LIMIT limit+1
    │ 4. Return JSON { chats, hasMore, nextCursor }
```

### Optimistic Updates (New Chat)

```
USER sends first message
    │
    ▼
useChatSession.sendMessage [messages.length === 0]
    │ onNewChat({ id, title, visibility, createdAt })
    │
    ▼
PendingChatsProvider.add(chat)
    │ reservedIds.add(id) — prevents duplicates
    │ entries = [{ ...chat, isOptimistic: true }, ...entries]
    │
    ▼
SidebarHistoryClient renders:
    │ pendingEntries (isOptimistic=true) at top of list
    │ + serverChats from SWR below
    │
    ▼
LATER: Stream delivers "data-chat-title"
    │ PendingChatsProvider.patch(chatId, { title: generatedTitle })
    │ → Entry updates with AI-generated title
    │
    ▼
LATER: SWR revalidates (focus, or server-triggered revalidateTag)
    │ Server copy now includes the chat
    │ PendingChatsProvider.markConfirmed(chatId)
    │ → Entry stays as overlay until server title matches
```

---

## 9. Voting Flow

```
USER: Clicks 👍 on assistant message
    │
    ▼
VoteButtons (features/voting/components/vote-buttons.tsx)
    │ 1. Optimistic update: local state → isUpvoted = true
    │ 2. Call Server Action: voteOnMessage({ chatId, messageId, type: "up" })
    │
    ▼
SERVER ACTION: voteOnMessage(input) [features/voting/actions/vote.ts]
    │
    │ 1. getAppSession() → session
    │    → null → ActionResult { error: "unauthorized:chat:auth_required" }
    │
    │ 2. session.user.type === "guest"?
    │    → YES → ActionResult { error: "forbidden:auth:guest_restricted" }
    │
    │ 3. voteSchema.safeParse(input) → { chatId, messageId, type }
    │    → Fail → ActionResult { error: "bad_request:validation:invalid_input" }
    │
    │ 4. getChatById(chatId) → chat
    │    → null → ActionResult { error: "not_found:chat:chat_not_found" }
    │    → chat.userId !== session.user.id → ActionResult { error: "forbidden:chat:owner_mismatch" }
    │
    │ 5. getMessageById(messageId) → message
    │    → null OR message.chatId !== chatId → ActionResult { error: "not_found:*" }
    │    (IDOR protection: prevents voting on messages from other chats)
    │
    │ 6. checkRateLimit("rate-limit-vote:<userId>", 20, 60)
    │    → Over limit → ActionResult { error: "rate_limit:*" }
    │
    │ 7. upsertVote({ chatId, messageId, isUpvoted: type === "up" })
    │    [lib/data/vote.ts → INSERT ... ON CONFLICT UPDATE]
    │
    │ 8. invalidateVotes(chatId)
    │    [lib/cache/revalidate.ts → updateTag("votes:<chatId>")]
    │    → Next request to cached votes sees fresh data
    │
    │ 9. Return ActionResult { success: true, data: { messageId, type } }
    │
    ▼
CLIENT: Reconcile optimistic state with server result
    │ On success: keep optimistic state (it matches)
    │ On failure: revert to previous vote state + toast.error
```

---

## 10. Cache Invalidation Flow

### Two Mechanisms

```
┌─────────────────────────────────────────────────────────────────┐
│ Server Actions: updateTag() — IMMEDIATE CONSISTENCY             │
│                                                                  │
│ updateTag("chat:<id>") → next read WAITS for fresh data         │
│                                                                  │
│ Used in: deleteChat, deleteAllChats, renameChat,                │
│          updateChatVisibility, voteOnMessage                    │
│                                                                  │
│ Why: User expects to see their change immediately after action  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Route Handlers: revalidateTag() — STALE-WHILE-REVALIDATE        │
│                                                                  │
│ revalidateTag("chat:<id>", "max") → serves stale, refreshes bg │
│                                                                  │
│ Used in: persistChatResponse (after stream finishes)            │
│                                                                  │
│ Why: User is already seeing streamed content; no urgency for    │
│      the server-side cache to be perfectly fresh                │
└─────────────────────────────────────────────────────────────────┘
```

### Cache Tags in Use

| Tag Pattern | Set By | Invalidated By |
|-------------|--------|----------------|
| `chat:<chatId>` | `getCachedChat()` in chat/[id]/page.tsx | deleteChat, renameChat, persistChatResponse |
| `chats:<userId>` | `getCachedChats()` in sidebar-shell.tsx | deleteChat, deleteAllChats, persistChatResponse |
| `votes:<chatId>` | `getCachedVotes()` in chat/[id]/page.tsx | voteOnMessage |
| `models` | `getAvailableModels()` in models.ts | Never (hourly cacheLife) |

---

## 11. State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STATE LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SERVER LAYER (no client JS)                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 'use cache' + cacheTag + cacheLife                   │        │
│  │                                                      │        │
│  │ getCachedChat()     → cacheTag("chat:<id>")          │        │
│  │ getCachedVotes()    → cacheTag("votes:<id>")         │        │
│  │ getCachedChats()    → cacheTag("chats:<userId>")     │        │
│  │ getAvailableModels()→ cacheTag("models")             │        │
│  │                                                      │        │
│  │ Invalidation: updateTag (immediate) / revalidateTag  │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  STREAMING LAYER (server → client)                              │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ ChatStreamProvider (split State/Dispatch contexts)   │        │
│  │                                                      │        │
│  │ Writer: useChatSession.onData → setChatStream        │        │
│  │ Reader: StreamBridge → useChatStream → processDeltas │        │
│  │                                                      │        │
│  │ RAF batching: ~200 SSE events/sec → ~60 updates/sec  │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  CLIENT STORES (no provider)                                    │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ artifactStore (useSyncExternalStore)                  │        │
│  │   → Global singleton, module-level                    │        │
│  │   → Write: StreamBridge, ArtifactPanel save           │        │
│  │   → Read: useArtifact(), useArtifactSelector()        │        │
│  │                                                      │        │
│  │ settingsStore (useSyncExternalStore + localStorage)   │        │
│  │   → Global singleton, module-level                    │        │
│  │   → Cross-tab sync via StorageEvent                   │        │
│  │   → Read: useSettings(), useSettingsSelector()        │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  CONTEXT PROVIDERS                                              │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ SessionProvider (React Context)                       │        │
│  │   → Wraps: Chat layout                                │        │
│  │   → Supabase onAuthStateChange → router.refresh()     │        │
│  │                                                      │        │
│  │ PendingChatsProvider (React Context)                  │        │
│  │   → Wraps: Chat layout                                │        │
│  │   → Optimistic sidebar entries                        │        │
│  │                                                      │        │
│  │ ChatSessionContext (React Context)                    │        │
│  │   → Wraps: ChatShell (single chat scope)              │        │
│  │   → Contains: all useChat return values               │        │
│  │                                                      │        │
│  │ VotesProvider (React Context)                         │        │
│  │   → Wraps: Existing chat page only                    │        │
│  │   → Vote state for current chat                       │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  SWR (client-side fetch cache)                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ useSWRInfinite (sidebar history)                      │        │
│  │   → Cursor-based pagination                           │        │
│  │   → Server-hydrated fallbackData                      │        │
│  │   → revalidateOnFocus + revalidateOnReconnect         │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 12. Error Handling Flow

### API Routes

```
ANY ERROR in Route Handler
    │
    ├── AppError instance?
    │   → error.toResponse()
    │     → Response with { code, message } JSON body
    │     → HTTP status from ErrorCode→status map (lib/errors/codes.ts)
    │
    ├── Unknown error?
    │   → AppError.internal("internal:api:unexpected_error").toResponse()
    │   → HTTP 500
    │
    └── createUIMessageStream.onError?
        → Returns generic "An error occurred..." string
        → Client sees toast notification
```

### Server Actions

```
ANY ERROR in Server Action
    │
    ├── Validation error?
    │   → ActionResult { success: false, error: { code: "bad_request:*", message } }
    │
    ├── Auth error?
    │   → ActionResult { success: false, error: { code: "unauthorized:*", message } }
    │
    ├── Business logic error?
    │   → ActionResult { success: false, error: { code: "forbidden:*"|"not_found:*", message } }
    │
    ├── Rate limit?
    │   → ActionResult { success: false, error: { code: "rate_limit:*", message } }
    │
    └── DB error?
        → throwDatabaseError("context", error) [lib/data/database-error.ts]
          → throw AppError.internal("internal:database:query_failed", message)
        → ActionResult { success: false, error: { code: "internal:*", message } }

NEVER THROWS from Server Actions — always returns ActionResult<T>
EXCEPTION: redirect() throws NEXT_REDIRECT (intentional, caught by Next.js)
```

### ErrorCode Convention

```
type:surface:detail

type    = unauthorized | forbidden | not_found | bad_request | rate_limit | internal | ai_error
surface = auth | chat | api | artifact | validation | database
detail  = specific_description

Examples:
  "unauthorized:chat:auth_required"
  "forbidden:auth:guest_restricted"
  "rate_limit:auth:login_too_many"
  "internal:database:query_failed"
  "ai_error:artifact:empty_output"
```

---

## 13. Rate Limiting Flow

```
ALL rate limiting goes through:
  checkRateLimit(key, limit, windowSeconds) [lib/cache/rate-limit.ts]
    │
    │ Redis INCR <key>
    │   → count === null (Redis down)? → return true (allow — graceful degradation)
    │   → count === 1? → Redis EXPIRE <key> <windowSeconds>
    │   → return count <= limit
    │
LIMITS:
  ┌─────────────────────────────────────────────────────────────┐
  │ Endpoint        │ Key Pattern              │ Limit │ Window │
  │─────────────────│──────────────────────────│───────│────────│
  │ POST /api/chat  │ rate-limit-chat:<userId> │  20   │  60s   │
  │ POST /api/files │ rate-limit-upload:<uId>  │  10   │ 3600s  │
  │ voteOnMessage   │ rate-limit-vote:<userId> │  20   │  60s   │
  │ login           │ rate-limit-login:<ip>    │   5   │  60s   │
  │ register        │ rate-limit-register:<ip> │   3   │  60s   │
  └─────────────────────────────────────────────────────────────┘

GRACEFUL DEGRADATION:
  If Redis (Upstash) is unavailable:
  - incr() returns null
  - checkRateLimit returns true (allow request)
  - System continues without rate limiting
  - NO data is lost (Redis stores ONLY rate limit counters)
```

---

---

## 14. Registration Flow

```
USER: Fills email + password → clicks "Register"
    │
    ▼
AuthForm → useActionState → register Server Action
    │ [features/auth/actions/register.ts]
    │
    │ 1. registerSchema.safeParse({email, password})
    │    → Fail → ActionResult { error: "bad_request:validation:*" }
    │
    │ 2. enforceAuthRateLimit(3/min per IP)
    │    → rateLimitKeys.rateLimitRegister(ip)
    │    → Over limit → ActionResult { error: "rate_limit:auth:register_too_many" }
    │
    │ 3. createSupabaseActionClient()
    │    → null (missing env) → authServiceUnavailableResult()
    │
    │ 4. supabase.auth.signUp({email, password})
    │    → Sets auth cookies via setAll callback
    │    → Error → ActionResult { error: "bad_request:validation:*" }
    │
    │ 5. createUser({id, email})  [lib/data/user.ts]
    │    → INSERT INTO users
    │    → Failure → ActionResult { error: "internal_error:database:*" }
    │    → Message: "Account created but profile setup failed. Please try logging in."
    │    NOTE: Supabase user EXISTS, DB user FAILED → login reconciliation handles this
    │
    │ 6. Email confirmation required? (!data.session)
    │    → YES → ActionResult { success: true, data: { confirmationRequired: true } }
    │    → Client shows "Check your email" message
    │
    │ 7. Immediate session available (no email confirmation):
    │    → migrateGuestChatsAndClearToken(userId, "register")
    │    → redirect("/") → NEXT_REDIRECT
    │
    ▼
KEY DIFFERENCE FROM LOGIN:
  - Registration creates both Supabase user and local DB user
  - Handles email confirmation flow (config-dependent)
  - D012 reconciliation NOT needed (we just created both records)
  - Same guest migration logic as login
```

---

## 15. Logout Flow

```
USER: Clicks "Sign Out"
    │
    ▼
SERVER ACTION: logout() [features/auth/actions/logout.ts]
    │
    │ 1. createSupabaseActionClient()
    │    → supabase.auth.signOut() (best effort — clears auth cookies)
    │
    │ 2. cookies().delete("guest_token")
    │    → Removes guest token entirely
    │    → Does NOT mint new guest token
    │    → proxy.ts will mint a fresh one on next request
    │
    │ 3. redirect("/login") → NEXT_REDIRECT
    │
    ▼
CLIENT: Browser navigates to /login
    │ proxy.ts classifies /login as "public"
    │ No auth tokens → proxy mints fresh guest token
    │ User is now a brand-new anonymous guest
```

---

## 16. Delete Chat Flow

```
USER: Right-click chat → "Delete"
    │
    ▼
SERVER ACTION: deleteChat({ chatId }) [features/chat/actions/delete-chat.ts]
    │
    │ 1. deleteChatSchema.safeParse({chatId: uuid})
    │
    │ 2. Promise.all([getAppSession(), getChatById(chatId)])
    │    → Parallel: auth + data fetch
    │
    │ 3. Ownership check: chat.userId !== session.user.id → forbidden
    │
    │ 4. deleteChatData(chatId) [lib/data/chat.ts]
    │    → DELETE FROM chats WHERE id = chatId
    │    → FK CASCADE deletes: messages_v2, votes_v2, artifacts, suggestions
    │
    │ 5. invalidateChatList(userId)
    │    → updateTag("chats:<userId>") — immediate consistency
    │
    ▼
DELETE ALL CHATS (features/chat/actions/delete-all-chats.ts):
    │ Simpler — no specific chat lookup needed
    │ deleteAllChatsData(userId) → DELETE FROM chats WHERE userId = ?
    │ → Same FK cascade
    │ → invalidateChatList(userId)
```

---

## 17. Delete Trailing Messages (Edit Message) Flow

```
USER: Clicks "Edit" on a previous message → modifies text → submits
    │
    ▼
useChatSession.editMessage(messageId, newContent)
    │ [features/chat/hooks/use-chat-session.ts:199]
    │
    │ PHASE 1: Server-side deletion
    │ ├── deleteTrailingMessages({ chatId: id, messageId })
    │ │   [features/chat/actions/delete-trailing-messages.ts]
    │ │   → auth + ownership check (parallel)
    │ │   → deleteMessagesByIdAfter(chatId, messageId)
    │ │     [lib/data/message.ts]
    │ │     → DELETE FROM messages_v2
    │ │       WHERE chatId = ? AND createdAt >= (SELECT createdAt FROM ... WHERE id = messageId)
    │ │   → invalidateChat(chatId) [updateTag]
    │ │
    │ │ If server deletion fails → throw Error → stop (don't re-submit)
    │
    │ PHASE 2: Client-side trim + re-submit
    │ ├── setMessages(prev => prev.slice(0, idx))
    │ │   → Remove target message + everything after it from local state
    │ ├── setUsage(undefined) — reset token counter
    │ └── sdkSendMessage({ text: newContent })
    │     → Starts new streaming response from edited point
    │
    ▼
EFFECT: User's edited message replaces original
        AI generates a fresh response from that point
        All subsequent messages are gone (both client + server)
```

---

## 18. Rename Chat Flow

```
USER: Double-clicks chat title in sidebar → types new title → confirms
    │
    ▼
SERVER ACTION: renameChat({ chatId, title })
    │ [features/sidebar/actions/rename-chat.ts]
    │
    │ 1. renameChatSchema: { chatId: uuid, title: string 1..200 chars }
    │ 2. getAppSession() → auth check
    │ 3. getChatById(chatId) → existence + ownership check
    │ 4. updateChatTitle(chatId, title) [lib/data/chat.ts]
    │    → UPDATE chats SET title = ?, updatedAt = now() WHERE id = ?
    │ 5. invalidateChat(chatId) + invalidateChatList(userId)
    │    → Both use updateTag (immediate consistency for Server Actions)
```

---

## 19. Update Chat Visibility Flow

```
USER: Clicks visibility toggle → "public" or "private"
    │
    ▼
SERVER ACTION: updateChatVisibility({ chatId, visibility })
    │ [features/visibility/actions/update-visibility.ts]
    │
    │ 1. updateVisibilitySchema.safeParse({chatId, visibility: "public"|"private"})
    │ 2. getAppSession() → auth check
    │ 3. getChatById(chatId) → existence + ownership check
    │ 4. updateVisibilityInDb(chatId, visibility) [lib/data/chat.ts]
    │    → UPDATE chats SET visibility = ? WHERE id = ?
    │ 5. invalidateChat(chatId) + invalidateChatList(userId)
    │
    ▼
VISIBILITY IMPLICATIONS:
  - "private": only owner can view
  - "public": anyone can view (read-only for non-owners)
  - Access control enforced in chat/[id]/page.tsx:
    getVisibleChat() → if private && not owner → null → notFound()
```

---

## 20. File Upload Flow

```
USER: Attaches image in MultimodalInput
    │
    ▼
CLIENT: Extracts File from input, creates FormData
    │ POST /api/files/upload
    │
    ▼
ROUTE: app/api/files/upload/route.ts
    │
    │ 1. validateOrigin(request) → CSRF check
    │    → 403 if invalid origin
    │
    │ 2. getAppSession() → auth check
    │    → 401 if no session
    │
    │ 3. checkUploadRateLimit(userId) → 10/hour per user
    │    → Uses "rate-limit-upload:<userId>" Redis key
    │    → 429 if exceeded
    │
    │ 4. request.formData() → extract file Blob
    │    → 400 if no file / invalid FormData
    │
    │ 5. File validation:
    │    ├── file.size === 0 → 400 "File is empty"
    │    ├── file.size > 5MB → 400 "File too large"
    │    └── !file.type.startsWith("image/") → 400 "Only images accepted"
    │
    │ 6. sanitizeFilename(file.name)
    │    → Remove path separators, null bytes
    │    → Replace special chars with underscore
    │    → Limit to 100 chars
    │
    │ 7. put(filename, file, { access: "public", contentType })
    │    → Vercel Blob Storage upload
    │    → 503 if upload service unavailable
    │
    │ 8. Response: { url: blob.url, pathname, contentType }
    │    → Cache-Control: no-store
    │
    ▼
CLIENT: Receives URL → creates FileUIPart → includes in sendMessage
    │ FileUIPart: { type: "file", url: blob.url, mimeType: contentType }
    │ Sent as part of user message to /api/chat
```

---

## 21. Artifact Save Flow (Manual Edit)

```
USER: Edits artifact content in panel → clicks "Save"
    │
    ▼
CLIENT: POST /api/artifact (mode: "save")
    │ body: { mode: "save", id, title, content, kind, chatId }
    │
    ▼
ROUTE: app/api/artifact/route.ts → POST → handleSave()
    │
    │ 1. validateOrigin → CSRF
    │ 2. getAppSession() → auth
    │ 3. artifactPostBodySchema.safeParse(body)
    │    → discriminated union: mode "save" | "restore"
    │
    │ 4. handleSave(data, userId):
    │    ├── getArtifactById(data.id)
    │    │   → If exists: verify ownership (userId match)
    │    │   → If not exists: new artifact (first manual save)
    │    │
    │    └── saveArtifactVersion({id, title, content, kind, userId, chatId})
    │        [lib/data/artifact.ts]
    │        → INSERT INTO artifacts (id, title, content, kind, userId, chatId, createdAt)
    │        → Composite PK: (id, createdAt) → each save = new version row
    │
    │ 5. Response: { artifact } (Cache-Control: no-store)
```

---

## 22. Artifact Restore (Version History) Flow

```
USER: Opens version history → clicks "Restore" on an earlier version
    │
    ▼
CLIENT: POST /api/artifact (mode: "restore")
    │ body: { mode: "restore", id, timestamp }
    │
    ▼
ROUTE: app/api/artifact/route.ts → POST → handleRestore()
    │
    │ 1. getArtifactById(data.id) → existence + ownership
    │
    │ 2. restorePoint = new Date(data.timestamp)
    │    afterRestore = new Date(restorePoint.getTime() + 1)
    │
    │ 3. deleteArtifactVersionsAfter(data.id, afterRestore)
    │    [lib/data/artifact.ts]
    │    → DELETE FROM artifacts WHERE id = ? AND createdAt > afterRestore
    │    → All versions AFTER restore point are deleted
    │    → Restore point becomes the latest version
    │
    │ 4. Response: { success: true }
    │
    ▼
EFFECT: Artifact rolls back to the selected version
        All subsequent versions are permanently deleted
        Client refreshes artifact content from server
```

---

## 23. Artifact Version History Fetch Flow

```
CLIENT: Opens version panel
    │ GET /api/artifact?id=<uuid>&view=versions
    │
    ▼
ROUTE: app/api/artifact/route.ts → GET
    │
    │ 1. getAppSession() → auth
    │ 2. getArtifactSchema.safeParse({id, view})
    │    → view: "versions" (default) | "latest"
    │
    │ 3. If view === "latest":
    │    → getArtifactById(id) → single latest version
    │    → Ownership check
    │    → Response: [latestVersion]
    │
    │ 4. If view === "versions":
    │    → getArtifactVersions(id) → all versions ordered by createdAt DESC
    │    → Ownership check on first version
    │    → Response: [version1, version2, ...] (newest first)
    │
    │ 5. Headers: Cache-Control: private, max-age=10
```

---

## 24. Suggestions Flow (AI Tool → Client)

```
AI MODEL: Calls requestSuggestions({ artifactId })
    │
    ▼ 
TOOL: features/chat/lib/tools/request-suggestions.ts
    │
    │ 1. getArtifactById(artifactId)
    │    → null / no content → return { error: "not found" }
    │
    │ 2. Ownership check: artifact.userId !== session.userId → 403
    │
    │ 3. streamObject({
    │      model: getInternalLanguageModel("artifact"),
    │      system: "You are a writing assistant. Analyze the text...",
    │      prompt: artifact.content,
    │      output: "array",
    │      schema: suggestionElementSchema
    │    })
    │    → Schema: { originalText, suggestedText, description, occurrenceIndex? }
    │
    │ 4. For each element in elementStream:
    │    ├── resolveSuggestionPosition(content, originalText, occurrenceIndex)
    │    │   → findTextPositions() → locate originalText in artifact content
    │    │   → Returns: { occurrenceIndex, selectionStart, selectionEnd }
    │    │   → Handles: multiple occurrences, explicit index, unique match, no match
    │    │
    │    ├── chatStream.writeData({ type: "artifact-suggestion", content: suggestion })
    │    │   → SSE → client → processStreamDelta → APPEND to artifact.suggestions
    │    │
    │    └── suggestions.push(suggestion)
    │
    │ 5. Persist (authenticated users only, NOT guests):
    │    → saveSuggestions([...]) with: id, artifactId, artifactCreatedAt, ...
    │
    │ 6. Return: { id, title, kind, message: "Suggestions generated." }
    │
    ▼
CLIENT: processStreamDelta receives "artifact-suggestion"
    │ → { ...current, suggestions: [...current.suggestions, delta.content] }
    │ → ArtifactPanel renders inline suggestion chips/diffs
```

### Suggestions Fetch Flow (API)

```
CLIENT: Opens artifact → fetches persisted suggestions
    │ GET /api/suggestions?artifactId=<uuid>&artifactCreatedAt=<datetime>
    │
    ▼
ROUTE: app/api/suggestions/route.ts
    │ 1. Auth check → guest → return empty { suggestions: [] }
    │ 2. querySchema.safeParse → { artifactId: uuid, artifactCreatedAt?: datetime }
    │ 3. IDOR check: getArtifact → verify userId ownership
    │ 4. getSuggestionsByArtifactVersion(id, createdAt)
    │ 5. Response: { suggestions: [...] } (Cache-Control: private, max-age=30)
```

---

## 25. Title Generation Flow

```
TRIGGERED: Inside POST /api/chat (fire-and-forget async)
    │ Only on NEW chats (isNewChat === true)
    │
    ▼
generateTitle(messageText) [lib/ai/title.ts]
    │
    │ model: getInternalLanguageModel("title")
    │   → Google TITLE_MODEL (not the user's selected model)
    │   → Uses myProvider → registry → possibly reasoning middleware
    │
    │ generateText({
    │   model,
    │   system: "generate a short title... ≤80 chars... no quotes/colons",
    │   prompt: messageText,
    │   abortSignal: AbortSignal.timeout(5000)  ← 5-second hard timeout
    │ })
    │
    │ SUCCESS: title.slice(0, 80).trim()
    │   → Emitted via writer.write({ type: "data-chat-title", data: title })
    │   → SSE → client → onData → callbacksRef.onTitleUpdate
    │   → PendingChatsProvider.patch(chatId, {title})
    │   → Title also saved in persistChatResponse
    │
    │ FAILURE: fallbackTitle(message)
    │   → message.trim().slice(0, 80) || "New Chat"
    │   → Used as generatedTitle in persistence
    │
    ▼
NOTES:
  - Title generation runs in PARALLEL with the main AI response stream
  - Uses separate small/fast model to keep latency low
  - The user sees title update asynchronously in sidebar
  - Timeout prevents blocking response close
```

---

## 26. Model Resolution & Reasoning Middleware Flow

```
myProvider.languageModel("google:gemini-2.5-flash")
    │ [lib/ai/provider.ts → customProvider → fallbackProvider]
    │
    ▼
reasoningProvider.languageModel("google:gemini-2.5-flash")
    │
    │ 1. base = registry.languageModel("google:gemini-2.5-flash")
    │    [lib/ai/registry.ts → buildRegistry()]
    │    → Looks up "google" provider → createGoogleGenerativeAI()
    │    → Returns Google SDK language model instance
    │
    │ 2. getModelCapabilities("google:gemini-2.5-flash")
    │    [lib/ai/model-capabilities.ts]
    │    → getModelById() → lookup in STATIC_MODEL_LOOKUP → ModelMetadata
    │    → getReasoningTag("google:gemini-2.5-flash")
    │      [lib/ai/model-capability-inference.ts]
    │      → prefix "google:gemini-2.5" matches → { tagName: "thinking" }
    │    → Returns: {
    │        metadata: { supportsToolCalling: true, supportsReasoning: true, ... },
    │        supportsToolCalling: true,
    │        supportsReasoning: true,
    │        reasoningTag: { tagName: "thinking" }
    │      }
    │
    │ 3. reasoningTag is non-null → wrap model:
    │    wrapLanguageModel({
    │      model: base,
    │      middleware: extractReasoningMiddleware({ tagName: "thinking" })
    │    })
    │    → Middleware intercepts model output
    │    → Extracts content between <thinking>...</thinking> tags
    │    → Routes to reasoning channel (displayed differently in UI)
    │
    ▼
RESULT: Wrapped language model with reasoning extraction

REASONING TAG RULES:
  google:gemini-2.5*     → { tagName: "thinking" }
  openai:o*              → { tagName: "thinking" }
  openrouter:deepseek/r1 → { tagName: "think" }
  all others             → null (no wrapping)
```

### Provider Options Resolution

```
getProviderOptions("google:gemini-2.5-flash", settings)
    │ [lib/ai/provider-options.ts]
    │
    │ 1. Base options (from user settings):
    │    temperature: settings.temperature  (default 1)
    │    topP: settings.topP                (default 1)
    │    maxOutputTokens: settings.maxOutputTokens  (default 16384)
    │
    │ 2. Detect provider: extractProvider("google:gemini-2.5-flash") → "google"
    │
    │ 3. Check reasoning support: getModelCapabilities(modelId).supportsReasoning → true
    │
    │ 4. Per-provider reasoning config:
    │    GOOGLE:
    │      providerOptions: { google: { thinkingConfig: { thinkingBudget: -1 } } }
    │      → thinkingBudget: -1 = unlimited thinking tokens
    │
    │    OPENAI:
    │      providerOptions: { openai: { reasoningEffort: "medium" } }
    │
    │    OPENROUTER:
    │      providerOptions: { openrouter: { reasoning: { max_tokens: 8000 } } }
    │
    │ 5. Return merged: { temperature, topP, maxOutputTokens, providerOptions }
```

---

## 27. Model Catalog & OpenRouter Discovery Flow

```
getAvailableModels() [features/models/lib/models.ts]
    │ 'use cache' + cacheTag("models") + cacheLife("hours")
    │
    │ 1. getAvailableProviderIds()
    │    [lib/ai/registry.ts]
    │    → Checks env vars:
    │      GEMINI_API_KEY → always registered (registerWithoutEnv: true)
    │      OPENAI_API_KEY → registered only if env exists
    │      OPENROUTER_API_KEY → registered only if env exists
    │    → Returns Set<"google"|"openai"|"openrouter">
    │
    │ 2. discoverModels()
    │    [lib/ai/models.ts:220]
    │    → No OPENROUTER_API_KEY? → return []
    │    → fetch("https://openrouter.ai/api/v1/models", {
    │        headers: { Authorization: Bearer, HTTP-Referer: app URL },
    │        signal: AbortSignal timeout 5s
    │      })
    │    → Map each OpenRouterModel → ModelMetadata:
    │      {
    │        id: "openrouter:<model.id>",
    │        provider: "openrouter",
    │        supportsToolCalling: false,  ← conservative default
    │        supportsReasoning: getReasoningTag(modelId) !== null,
    │        source: "dynamic"
    │      }
    │    → Failure (timeout/network/parse) → return [] silently
    │
    │ 3. mergeAvailableModels(discoveredModels, availableProviders)
    │    → Filter out already-in-STATIC_MODELS duplicates
    │    → Concat: [...STATIC_MODELS, ...uniqueDiscovered]
    │    → Filter: only models whose provider is in available set
    │    → Result: deterministic order, statics first
    │
    ▼
STATIC_MODELS (9 models, 3 providers):
  google: gemma-3-4b-it, gemini-2.5-flash-lite, gemini-2.5-flash, gemini-2.5-pro
  openai: gpt-4o, gpt-4.1
  openrouter: claude-3.7-sonnet, claude-3.5-sonnet, deepseek-r1:free, deepseek-chat:free

DYNAMIC_MODELS: All OpenRouter models (hundreds)
  → source: "dynamic", supportsToolCalling: false
```

---

## 28. Settings Persistence & Cross-Tab Sync Flow

```
┌──────────────────────────────────────────────────────────────┐
│ SETTINGS STORE ARCHITECTURE                                   │
│ [features/settings/hooks/use-settings.ts]                    │
│                                                              │
│ Module-level singleton (no React provider):                  │
│                                                              │
│ let state: SettingsState = DEFAULT_SETTINGS                  │
│ const listeners = new Set<() => void>()                      │
│                                                              │
│ INITIALIZATION (runs once at module import, client only):    │
│   if (typeof window !== "undefined")                         │
│     const stored = localStorage.getItem("chat-settings")     │
│     state = parseStoredSettings(stored) ?? DEFAULT_SETTINGS  │
│                                                              │
│ WRITE FLOW:                                                  │
│   updateSettings({ temperature: 0.7 })                       │
│     → partialSettingsSchema.safeParse(partial) — Zod validate│
│     → Fail → return false (invalid input rejected)           │
│     → Pass → nextState = { ...state, ...result.data }        │
│     → localStorage.setItem("chat-settings", JSON.stringify)  │
│     → setState(nextState) → emitChange()                     │
│       → listeners.forEach(l => l())                          │
│       → All useSyncExternalStore subscribers re-render        │
│                                                              │
│ READ FLOW:                                                   │
│   useSettings() → useSettingsSelector(s => s)                │
│   useSettingsSelector(s => s.temperature)                    │
│   useSyncExternalStore(subscribe, getSnapshot, getServerSnap)│
│     → getSnapshot: returns module-level `state`              │
│     → getServerSnapshot: returns DEFAULT_SETTINGS (SSR safe) │
│                                                              │
│ CROSS-TAB SYNC:                                              │
│   window.addEventListener("storage", handleStorageEvent)     │
│     → event.key !== "chat-settings" → ignore                 │
│     → syncStoredSettings(event.newValue)                     │
│       → parseStoredSettings → setState(nextState)            │
│       → All subscribers re-render in ALL open tabs           │
│                                                              │
│   Listener lifecycle:                                        │
│     → Added on first subscriber (ensureStorageListener)      │
│     → Removed on last unsubscribe (cleanupStorageListener)   │
│                                                              │
│ RESET:                                                       │
│   resetSettings()                                            │
│     → localStorage.removeItem("chat-settings")               │
│     → setState(DEFAULT_SETTINGS) → emitChange()              │
│                                                              │
│ WRITE-ONLY HOOK (no subscription):                           │
│   useSettingsSetter()                                        │
│     → Returns stable { updateSettings, resetSettings } object│
│     → Component using this NEVER re-renders on state changes │
└──────────────────────────────────────────────────────────────┘
```

---

## 29. Votes Provider & Optimistic Voting Flow (Detailed)

```
┌──────────────────────────────────────────────────────────────┐
│ VOTE STATE ARCHITECTURE                                       │
│ [features/voting/components/vote-resolver.tsx]                 │
│ [features/voting/hooks/use-votes.ts]                          │
│                                                              │
│ INITIALIZATION (Existing Chat Page):                         │
│                                                              │
│ chat/[id]/page.tsx:                                          │
│   votesPromise = getCachedVotes(chatId, userId)              │
│     'use cache' + cacheTag("votes:<chatId>")                 │
│     → getVotesByChatId(chatId, userId)                       │
│                                                              │
│   <VotesProvider chatId={chatId}>                            │
│     <ChatShell ... />                                        │
│     <Suspense fallback={null}>                               │
│       <VoteResolver votesPromise={votesPromise} />           │
│     </Suspense>                                              │
│   </VotesProvider>                                           │
│                                                              │
│ VotesProvider mounts:                                        │
│   [serverVotes, setServerVotes] = useState([])               │
│   → Empty initially → chat renders with no votes             │
│   → useVotes(chatId, serverVotes)                            │
│     → [optimisticVotes, addOptimisticVote] = useOptimistic() │
│   → votesStore = createVotesStore() (ref, created once)      │
│                                                              │
│ VoteResolver resolves (in Suspense):                         │
│   resolvedVotes = use(votesPromise)  ← React 19 use()       │
│   → useEffect → setServerVotes(resolvedVotes)               │
│   → VotesProvider re-renders → useVotes gets new base state  │
│   → store.setVotes(votes) → listeners notified              │
│   → VoteButtons re-render with actual vote state             │
│                                                              │
│ VOTE FLOW:                                                   │
│   1. useVoteForMessage(messageId) in VoteButtons component   │
│      → useSyncExternalStore(store.subscribe, () => getVote)  │
│      → Only re-renders when THIS message's vote changes      │
│                                                              │
│   2. submitVote(messageId, "up")                             │
│      → startTransition(async () => {                         │
│          addOptimisticVote({messageId, type: "up"})          │
│          → Instant UI update: button highlights              │
│                                                              │
│          result = await voteOnMessage({chatId, messageId})   │
│          → Server: 7-step validation pipeline                │
│          → upsertVote → invalidateVotes(chatId) [updateTag]  │
│                                                              │
│          if (!result.success)                                │
│            → useOptimistic auto-reverts when transition ends │
│            → toast.error(result.error.message)               │
│        })                                                    │
│                                                              │
│ NEW CHAT PAGE:                                               │
│   No VotesProvider wrapping ChatShell                         │
│   → useVoteForMessage returns safe defaults:                 │
│     vote: undefined, submitVote: no-op                       │
│   → VoteButtons disabled/hidden                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 30. Health Check Flow

```
GET /api/health [app/api/health/route.ts]
    │
    │ Promise.all([checkDatabase(), checkCache()])
    │
    │ checkDatabase():
    │   → db.execute(sql`SELECT 1`)  [Drizzle → PostgreSQL]
    │   → Measures latency in ms
    │   → > 1000ms → { status: "degraded", latency, error: "High database latency" }
    │   → ≤ 1000ms → { status: "healthy", latency }
    │   → Exception → { status: "unhealthy", error: "Database check failed" }
    │
    │ checkCache():
    │   → ping()  [lib/cache/client.ts → Upstash Redis]
    │   → null (not configured) → { status: "degraded", error: "Cache not configured" }
    │   → > 1000ms → { status: "degraded", latency, error: "High cache latency" }
    │   → ≤ 1000ms → { status: "healthy", latency }
    │   → Exception → { status: "unhealthy", error: "Cache check failed" }
    │
    │ deriveOverallStatus():
    │   → Any "unhealthy" → "unhealthy" (HTTP 503)
    │   → Any "degraded" → "degraded" (HTTP 200)
    │   → All "healthy" → "healthy" (HTTP 200)
    │
    ▼
RESPONSE:
  {
    status: "healthy|degraded|unhealthy",
    timestamp: "ISO 8601",
    checks: { database: {...}, cache: {...} }
  }
  Cache-Control: public, max-age=60, s-maxage=60
```

---

## 31. CSRF Protection Flow

```
validateOrigin(request) [lib/utils/validate-origin.ts]
    │
    │ APPLIED TO: All POST route handlers (/api/chat, /api/files, /api/artifact)
    │ NOT NEEDED FOR: Server Actions (Next.js has built-in CSRF protection)
    │
    │ 1. getRequestOrigin(request):
    │    ├── Try: request.headers.get("origin")
    │    │   → If present, use directly
    │    └── Fallback: request.headers.get("referer")
    │        → Parse URL → extract origin
    │        → null if neither header present
    │
    │ 2. getAllowedOrigins(requestUrl):
    │    Set containing:
    │    ├── requestUrl.origin (self)
    │    ├── "https://<VERCEL_URL>" (if set)
    │    ├── NEXT_PUBLIC_APP_URL (if set)
    │    └── localhost:3000, 127.0.0.1:3000 (dev only)
    │
    │ 3. Return: allowedOrigins.has(requestOrigin)
    │
    ▼
RESULT: true → proceed, false → 403 Forbidden
```

---

## 32. Existing Chat Page Load Flow (Detailed)

```
BROWSER: GET /chat/<uuid>
    │
    ▼
PROXY: classifyRoute → "auth-required"
    │ Has Supabase/guest token? → forward
    │ No tokens? → redirect to /login
    │
    ▼
PAGE: app/(chat)/chat/[id]/page.tsx (Server Component)
    │
    │ PHASE 1: Parallel data fetch
    │ ├── getChatPageState(chatId)  ← React.cache() memoized
    │ │   → Promise.all([getAppSession(), getCachedChat(chatId)])
    │ │     getCachedChat: 'use cache' + cacheTag("chat:<id>") + cacheLife("seconds")
    │ │       → getChatById(chatId) [lib/data/chat.ts]
    │ │         → SELECT * FROM chats WHERE id = ? LIMIT 1
    │ │
    │ └── getAvailableModels() (parallel with above)
    │     → 'use cache' + cacheTag("models") + cacheLife("hours")
    │
    │ PHASE 2: Access control
    │ ├── chat is null → notFound() → 404 page
    │ ├── chat.visibility === "private" && user.id !== chat.userId → notFound()
    │ └── chat accessible → proceed
    │
    │ PHASE 3: Secondary data (after access control passes)
    │ ├── getMessagesForChatRender(chatId)
    │ │   [lib/data/message.ts]
    │ │   → SELECT id, role, parts FROM messages_v2
    │ │     WHERE chatId = ? ORDER BY createdAt ASC
    │ │
    │ ├── getVotesPromise(chatId, session)
    │ │   → Guest? → Promise.resolve([])
    │ │   → Auth? → getCachedVotes(chatId, userId)
    │ │     'use cache' + cacheTag("votes:<chatId>")
    │ │     → getVotesByChatId(chatId, userId)
    │ │       → SELECT * FROM votes_v2 WHERE chatId = ?
    │ │
    │ └── convertToUIMessages(dbMessages)
    │     [features/chat/lib/message-utils.ts]
    │     → Map: { id, role: cast, parts: cast }
    │
    │ PHASE 4: Determine read-only state
    │ isReadonly = !session?.user || session.user.id !== chat.userId
    │   → true for: non-owner viewing public chat, no session
    │   → false for: chat owner
    │
    │ PHASE 5: Render
    │ <ChatStreamProvider>
    │   <VotesProvider chatId={chat.id}>
    │     <ChatShell
    │       id={chat.id}
    │       initialMessages={uiMessages}
    │       initialChatModel={chat.model ?? DEFAULT_CHAT_MODEL}
    │       isReadonly={isReadonly}
    │       initialVisibility={chat.visibility}
    │       availableModels={availableModels}
    │     />
    │     <Suspense fallback={null}>
    │       <VoteResolver votesPromise={votesPromise} />
    │     </Suspense>
    │   </VotesProvider>
    │ </ChatStreamProvider>
    │
    ▼
KEY DIFFERENCES FROM NEW CHAT PAGE:
  - VotesProvider wraps ChatShell (new chat page has no votes)
  - VoteResolver in Suspense → async vote hydration via use()
  - initialMessages populated from DB (new chat has [])
  - generateMetadata → page title uses chat.title
  - getChatPageState uses React.cache for dedup across page + metadata
```

---

## 33. Artifact Handler Registry Flow

```
INITIALIZATION: app/api/chat/route.ts imports side-effect module
    │ import "@/features/artifacts/handlers"
    │   [features/artifacts/handlers/index.ts]
    │
    │ import { registerArtifactHandler } from "@/lib/ai/artifact-handlers"
    │ import { textHandler } from "./text-handler"
    │ import { codeHandler } from "./code-handler"
    │ import { sheetHandler } from "./sheet-handler"
    │ import { imageHandler } from "./image-handler"
    │
    │ registerArtifactHandler("text", textHandler)   → Map entry
    │ registerArtifactHandler("code", codeHandler)   → Map entry
    │ registerArtifactHandler("sheet", sheetHandler)  → Map entry
    │ registerArtifactHandler("image", imageHandler)  → Map entry
    │
    │ IF duplicate kind → throw AppError (prevents silent replacement)
    │
    ▼
HANDLER MAP (lib/ai/artifact-handlers.ts):
    │ Map<ArtifactKind, ArtifactHandler>
    │   "text"  → textHandler  (streamText, APPEND deltas, smoothStream)
    │   "code"  → codeHandler  (streamObject, REPLACE deltas)
    │   "sheet" → sheetHandler (streamObject, REPLACE deltas, CSV format)
    │   "image" → imageHandler (no-op, images from code execution, not AI)
    │
    ▼
USAGE: getArtifactHandler(kind)
    │ → Map.get(kind)
    │ → null → throw AppError("ai_error:artifact:no_handler")
    │
    ▼
HANDLER CONTRACT (ArtifactHandler interface):
    create(params): Promise<string>  → Returns final content
    update(params): Promise<string>  → Returns final content
    │
    │ create params: { id, title, kind, chatId, session, chatStream }
    │ update params: { id, title, kind, chatId, currentContent, description, session, chatStream }
    │
    │ The handler ONLY produces content deltas.
    │ Lifecycle (prelude, persistence, finish) is owned by the calling tool.
```

### Handler Streaming Semantics

```
TEXT HANDLER (textHandler):
    │ Uses: streamText() + smoothStream({ chunking: "word" })
    │ Collector: collectTextStreamDeltas()
    │ Delta type: "artifact-textDelta"
    │ Semantics: APPEND — each delta is a chunk of text to append
    │ Client: content = content + delta.content
    │
CODE HANDLER (codeHandler):
    │ Uses: streamObject() with z.object({ code: z.string() })
    │ Collector: collectReplacingObjectStream({ pickContent: o => o?.code })
    │ Delta type: "artifact-codeDelta"
    │ Semantics: REPLACE — each delta is the full code so far
    │ Client: content = delta.content (complete replacement)
    │
SHEET HANDLER (sheetHandler):
    │ Uses: streamObject() with z.object({ csv: z.string() })
    │ Collector: collectReplacingObjectStream({ pickContent: o => o?.csv })
    │ Delta type: "artifact-sheetDelta"
    │ Semantics: REPLACE — each delta is the full CSV so far
    │ Client: content = delta.content (complete replacement)
    │
IMAGE HANDLER (imageHandler):
    │ No AI streaming
    │ create → returns ""  (images written by code execution: Pyodide)
    │ update → returns currentContent unchanged
```

---

## 34. Internal Model Resolution

```
getInternalLanguageModel("artifact"|"title")
    │ [lib/ai/internal-models.ts]
    │
    │ internalLanguageModels = {
    │   artifact: { providerId: "google", modelId: ARTIFACT_MODEL },
    │   title:    { providerId: "google", modelId: TITLE_MODEL }
    │ }
    │
    │ 1. isProviderConfigured("google") → check GEMINI_API_KEY
    │    → false → throw AppError("ai_error:provider:failed")
    │    → true → proceed
    │
    │ 2. myProvider.languageModel(modelId)
    │    → Goes through same reasoningProvider wrapping as user models
    │    → If reasoning tag matches → wrapped with extractReasoningMiddleware
    │
    ▼
USAGE:
  Artifact handler (text/code/sheet) → getInternalLanguageModel("artifact")
  Title generation                   → getInternalLanguageModel("title")
  Suggestions AI                     → getInternalLanguageModel("artifact")

NOTE: Internal models always use Google, regardless of user's selected provider.
      This keeps artifact/title generation fast and costs predictable.
```

---

## 35. Deferred Artifact Clear Writer (Update-specific Pattern)

```
createDeferredArtifactClearWriter(chatStream)
    │ [features/chat/lib/tools/artifact-tool-utils.ts:39]
    │
    │ PURPOSE: During artifact UPDATE, prevent flash-of-empty-content
    │          by delaying the "clear" signal until real content arrives
    │
    │ PROBLEM WITHOUT DEFER:
    │   1. Tool writes "artifact-clear" → content = ""
    │   2. Model takes 500ms to emit first delta
    │   3. User sees empty artifact panel for 500ms (bad UX)
    │
    │ SOLUTION WITH DEFER:
    │   1. Wraps chatStream with writeData interceptor
    │   2. First content delta arrives:
    │      a. Check if it's only whitespace → buffer it
    │      b. First non-whitespace → flush "artifact-clear" then all buffered + current
    │   3. Subsequent deltas → pass through directly
    │
    │ STATE MACHINE:
    │   PENDING → (first non-whitespace delta) → CLEARED → all subsequent passthrough
    │
    ▼
USED BY: updateArtifact tool only (create always clears immediately)
```

---

## 36. Persistence Retry Flow

```
persistChatResponse() [features/chat/lib/chat-route.ts]
    │
    │ CALLED: Inside createUIMessageStream → onFinish callback
    │   → Runs AFTER the AI response stream completes
    │   → Runs WHILE the SSE connection is still open
    │
    │ 1. toAssistantDbMessages(responseMessages)
    │    → Convert AI SDK UIMessage[] → DB Message format
    │    → Only NEW messages (not in existing DB)
    │
    │ 2. saveMessagesAndTouchChat(chatId, dbMessages)
    │    → Transaction: INSERT messages + UPDATE chat.updatedAt
    │
    │ 3. runWithPersistenceRetries(saveFn):
    │    Attempt 1: immediate
    │      → Success → proceed
    │      → Failure → wait 150ms
    │    Attempt 2: after 150ms
    │      → Success → proceed
    │      → Failure → wait 400ms
    │    Attempt 3: after 400ms
    │      → Success → proceed
    │      → FINAL FAILURE → recoverChatPersistenceFailure()
    │
    │ 4. recoverChatPersistenceFailure():
    │    → saveMessages([recoveryMessage])
    │      → Recovery message: role "assistant", text: "response generated but save failed"
    │    → writer.write({ type: "data-error", data: "..." })
    │      → SSE → client → toast.error()
    │
    │ 5. On success (any attempt):
    │    → refreshChat(chatId) → revalidateTag("chat:<id>")
    │    → refreshChatList(userId) → revalidateTag("chats:<userId>")
    │    → Uses revalidateTag (stale-while-revalidate) NOT updateTag
    │      Because: user already sees streamed content; no urgency
    │
    ▼
RETRY DELAYS: [0ms, 150ms, 400ms]
MAX ATTEMPTS: 3
TOTAL MAX WAIT: 550ms
```

---

## Confidence

**HIGH** — Every flow traced by reading actual source code with exact file paths and function names. No flow is based on assumption or memory. All 36 flows verified against current source.

## Sources

All code references from workspace at `/home/nicx/projects/nextjs-ai-chatbot/`. Files read:

**Core Routes:**
- `proxy.ts`, `app/api/chat/route.ts`, `app/api/artifact/route.ts`
- `app/api/files/upload/route.ts`, `app/api/suggestions/route.ts`
- `app/api/health/route.ts`, `app/api/history/route.ts`

**Pages:**
- `app/layout.tsx`, `app/(chat)/layout.tsx`, `app/(chat)/page.tsx`
- `app/(chat)/chat/[id]/page.tsx`

**Chat System:**
- `features/chat/hooks/use-chat-session.ts`
- `features/chat/components/chat-stream-provider.tsx`
- `features/chat/components/stream-bridge.tsx`
- `features/chat/components/chat-shell.tsx`
- `features/chat/lib/chat-route.ts`
- `features/chat/lib/process-stream-deltas.ts`
- `features/chat/lib/message-utils.ts`

**Actions:**
- `features/chat/actions/delete-chat.ts`
- `features/chat/actions/delete-all-chats.ts`
- `features/chat/actions/delete-trailing-messages.ts`
- `features/sidebar/actions/rename-chat.ts`
- `features/visibility/actions/update-visibility.ts`
- `features/auth/actions/login.ts`, `register.ts`, `logout.ts`
- `features/voting/actions/vote.ts`

**AI System:**
- `lib/ai/provider.ts`, `lib/ai/registry.ts`, `lib/ai/provider-options.ts`
- `lib/ai/models.ts`, `lib/ai/model-capabilities.ts`, `lib/ai/model-capability-inference.ts`
- `lib/ai/internal-models.ts`, `lib/ai/prompts.ts`, `lib/ai/title.ts`
- `lib/ai/artifact-handlers.ts`

**Artifact Handlers:**
- `features/artifacts/handlers/index.ts`, `text-handler.ts`, `code-handler.ts`
- `features/artifacts/handlers/sheet-handler.ts`, `image-handler.ts`
- `features/artifacts/handlers/stream-artifact-deltas.ts`
- `features/chat/lib/tools/create-artifact.ts`, `update-artifact.ts`
- `features/chat/lib/tools/request-suggestions.ts`
- `features/chat/lib/tools/artifact-tool-utils.ts`

**State & Providers:**
- `features/artifacts/lib/artifact-store.ts`
- `features/settings/hooks/use-settings.ts`
- `features/voting/components/vote-resolver.tsx`, `features/voting/hooks/use-votes.ts`
- `lib/providers/pending-chats-provider.tsx`
- `features/sidebar/hooks/use-sidebar-history.ts`
- `features/auth/components/session-provider.tsx`
- `features/auth/lib/action-utils.ts`

**Auth & Cache:**
- `lib/auth/session.ts`, `lib/auth/guest.ts`
- `lib/cache/revalidate.ts`, `lib/cache/rate-limit.ts`, `lib/cache/keys.ts`, `lib/cache/with-cache.ts`
- `lib/utils/validate-origin.ts`
