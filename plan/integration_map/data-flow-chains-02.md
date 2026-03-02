> **Updated per redesign audit (2026-03-01)**

# Data Flow Chains — Part 02

> Continuation of data flow chains. See [data-flow-chains-01.md](data-flow-chains-01.md) for Chains 1–7.
> Updated to reflect: Server Actions for mutations, useOptimistic for votes/visibility,
> useSyncExternalStore for settings, artifact naming, single-channel title sync,
> ChatStreamProvider/StreamBridge, VoteResolver, proxy.ts.

---

## Chain 8: File Upload

### Trigger
User clicks attachment button in MultimodalInput.

### Flow

```
1. USER ACTION
   MultimodalInput → file input triggered → file(s) selected

2. CLIENT: Upload
   a. For each file: FormData.append('file', file)
   b. POST /api/files/upload (multipart/form-data)
      - Auth: cookie-based
      - Rate limit: upload (10/hour)
   c. Server: Vercel Blob put(filename, file)
   d. Response: { url, pathname, contentType }
   e. Attachment added to ChatSessionContext: { name, url, contentType }

3. CLIENT: Preview
   PreviewAttachment: 64x64 thumbnail, remove button, upload spinner

4. CLIENT: On Submit
   a. Attachments converted to message parts:
      { type: "file", data: url, mimeType, name }
   b. Sent with sendMessage({ message, experimental_attachments })
   c. Attachments cleared after send

5. ABORT
   AbortController cancels active uploads on component unmount
```

---

## Chain 9: Vote on Message

### Trigger
User clicks thumbs up/down on assistant message.

### Flow

```
1. USER ACTION
   VoteButtons component → handleVote('up' | 'down')

2. CLIENT: Optimistic Update
   a. useOptimistic(type) → immediate UI update (button highlighted)
   b. startTransition() wraps server call

3. CLIENT: Server Action
   a. voteOnMessage({ chatId, messageId, type }) — Server Action
      - getAppSession() → session
      - Require non-guest: guests cannot vote
      - Zod validate: { chatId, messageId, type }
      - DB: INSERT INTO votes ... ON CONFLICT DO UPDATE SET isUpvoted = ?
      - updateTag('votes:{chatId}')
      - Return: ActionResult<{ messageId }>

4. CLIENT: Post-Vote
   a. Success: optimistic state persists, server confirms
   b. Failure: useOptimistic rolls back, toast.error(result.error.message)

5. RENDER
   Vote button shows filled/highlighted icon for active vote
```

> **Replaced:** SWR `PATCH /api/vote` with optimistic mutate → Server Action + `useOptimistic`.

---

## Chain 10: Suggestions

### Trigger
AI calls `requestSuggestions` tool.

### Flow

```
1. SERVER: Tool Call Execution
   a. requestSuggestions({ artifactId })
   b. getArtifactById(artifactId) → latest version content
   c. streamObject({
        model: ARTIFACT_MODEL,
        schema: z.object({ suggestions: z.array(z.object({
          originalText, suggestedText, description
        })).max(5) }),
        prompt: latestVersion.content
      })
   d. For each suggestion:
      ChatStream.writeData({ type: 'artifact-suggestion', content: suggestion })
   e. Auth users: saveSuggestions() → DB
   f. Guest users: in-session only (not persisted)

2. CLIENT: StreamBridge processes artifact-suggestion parts
   a. Suggestions accumulated in state
   b. Text editor integrates suggestions via SuggestionsExtension

3. RENDER (Text artifact only)
   a. TipTap SuggestionsExtension creates decorations for originalText
   b. Inline popup: suggestedText + description
   c. Accept → replace text in editor
   d. Dismiss → mark resolved (remove decoration)
```

---

## Chain 11: Model Selection

### Trigger
User picks model from dropdown.

### Flow

```
1. USER ACTION
   ModelSelector (in MultimodalInput toolbar) → onModelChange(newModelId)

2. CLIENT: State Update
   a. Cookie: document.cookie = "chat-model={modelId}" (server-readable)
   b. localStorage.setItem('chat-model', modelId)

3. NEXT CHAT REQUEST
   a. prepareSendMessagesRequest includes selectedChatModel = newModelId
   b. Server: validate modelId against registry
   c. Server: myProvider.languageModel(modelId) resolves model instance
   d. Server: getEnabledTools(modelId) → tool set based on capabilities

4. CAPABILITY EFFECTS
   a. supportsToolCalling: true → createArtifact, updateArtifact, requestSuggestions, getWeather
   b. supportsToolCalling: false → no tools (reasoning-only models, gemma)
   c. supportsReasoning: true → extractReasoningMiddleware applied
   d. Per-provider options: google thinkingConfig, openai reasoningEffort, etc.
```

### Server-Side Model Discovery
```
getAvailableModels() — 'use cache' + cacheTag('models') + cacheLife('hours')
  → STATIC_MODELS (hardcoded) + discoverModels() (OpenRouter API)
  → Deduplicate + sort by name
  → Auto-refreshes hourly; manual: revalidateTag('models', 'max')
```

---

## Chain 12: Visibility Toggle

### Trigger
User selects Private/Public in VisibilitySelector.

### Flow

```
1. USER ACTION
   VisibilitySelector (in ChatHeader) → handleVisibilityChange('public' | 'private')

2. CLIENT: Optimistic Update
   a. useOptimistic(newVisibility) → immediate UI (icon changes: lock ↔ globe)

3. CLIENT: Server Action
   a. updateChatVisibility({ chatId, visibility }) — Server Action
      - getAppSession() → session
      - Ownership verification (chat.userId === session.user.id)
      - DB: UPDATE chats SET visibility = ? WHERE id = ?
      - updateTag('chat:{chatId}')
      - updateTag('chats:{userId}')
      - Return: ActionResult

4. CLIENT: Post-Toggle
   a. Success: optimistic state persists
   b. Failure: useOptimistic rolls back, toast.error()
```

> **Replaced:** SWR optimistic + server action → pure `useOptimistic` + Server Action with `updateTag`.

---

## Chain 13: Title Generation (Single Channel)

### Trigger
New chat's first message completes streaming.

### Flow

```
1. SERVER: Inside onFinish callback (POST /api/chat route handler)
   a. generateTitle(userMessage.content):
      - generateText({ model: TITLE_MODEL, prompt: content.slice(0, 500) })
      - Fallback: content.slice(0, 80) on error
   b. Title generation runs in parallel with main AI streaming
   c. Title is AWAITED before stream close — guaranteed delivery:
      const title = await titlePromise
      ChatStream.writeData({ type: 'chat-title', content: title })

2. SERVER: Post-stream persistence
   a. updateChatTitle(chatId, title) → DB
   b. revalidateTag('chats:{userId}', 'max') → sidebar cache refresh

3. CLIENT: useChat.onData receives { type: 'chat-title', content: title }
   a. PendingChats.updateTitle(chatId, title)
   b. SidebarHistoryClient re-renders with real title (was showing first 50 chars)

4. NEXT NAVIGATION
   - SidebarShell (SERVER) fetches fresh data via 'use cache' + cacheTag
   - Server-confirmed title now in DB, served in sidebar
   - PendingChats.markConfirmed(chatId)
```

> **Removed:** `pollForTitle()` 5×500ms polling, `window.dispatchEvent('chat-title-updated')`.
> Single channel: server awaits title → `chat-title` stream part → PendingChats.updateTitle.

---

## Chain 14: Auth Login

### Trigger
User submits login form at `/login`.

### Flow

```
1. USER ACTION
   AuthForm → form submit (useActionState)

2. CLIENT: Supabase Auth
   a. supabase.auth.signInWithPassword({ email, password })
   b. On success: returns session with access_token

3. CLIENT → SERVER: Login Server Action
   a. AuthForm submits to `login` Server Action (`useActionState`)
      - Validate credentials
      - Supabase signInWithPassword
      - Set cookie: sb_token (httpOnly, secure, sameSite=lax, 7d maxAge)
      - Return ActionResult / redirect

4. CLIENT: Post-Login
   a. SessionProvider detects auth state change (Supabase listener)
   b. router.push('/') + router.refresh()
   c. Router Cache invalidated (cookie mutation)

5. SERVER: Root Layout re-renders
   a. getAppSession() reads sb_token → authenticated session
   b. SessionProvider receives initialSession
   c. SidebarShell (SERVER) fetches auth user's chat history
   d. Full auth capabilities available
```

---

## Chain 15: Auth Guest Bootstrap

### Trigger
First visit with no auth cookies.

### Flow

```
1. DETECTION
   Request enters edge `proxy.ts`
   If no valid auth cookies, proxy mints/rotates guest token before app render

2. EDGE: proxy.ts Guest Bootstrap
   a. On request with no valid auth cookies, proxy mints guest identity
   b. guestId = "guest:{crypto.randomUUID()}"
   c. Sign JWT: { sub: guestId, iat, exp: +1h }, HS256, GUEST_JWT_SECRET
   d. Set cookie: guest_token (httpOnly, secure, sameSite=lax, 7d maxAge)
   e. getAppSession() resolves guest session for server components/actions

3. GUEST TOKEN ROTATION (on every request)
   a. proxy.ts reads guest_token cookie
   b. Decode JWT, check exp claim
   c. If exp - now < 30min:
      - Sign new JWT: same sub (guest:{uuid}), fresh 1h exp
      - Set-Cookie: guest_token with fresh 7d maxAge
   d. Pass through to Next.js

4. GUEST LIMITATIONS
   - Chat: functional (messages stored in DB, artifacts in DB)
   - Voting: disabled (guests cannot vote)
   - Suggestion persistence: disabled (in-session only)
   - Abuse-prevention limits: configured per-surface rate limits
```

> **Clarification:** Guests have full DB persistence. There is no cache-only mode for guests. The old plan's cache-only approach was superseded by the redesign which gives guests full DB access with rate-limited usage.

---

## Chain 16: Sidebar History Load (Server-Rendered + Pagination)

### Trigger
Chat layout mounts or user paginates sidebar.

### Flow

```
1. SERVER: Chat Layout (first render / navigation)
   a. SidebarShell (SERVER, async) component
   b. getCachedChats(userId):
      - 'use cache' + cacheTag('chats:{userId}') + cacheLife('seconds')
      - getChatsByUserId(userId, { limit: 21 })
   c. hasMore = chats.length > 20
   d. Pass: initialChats=chats.slice(0, 20), initialHasMore=hasMore
   e. → SidebarHistoryClient(initialChats, initialHasMore)

2. CLIENT: SidebarHistoryClient Hydration
   a. useSWRInfinite(key, fetcher, { fallbackData: [{ chats: initialChats, hasMore }] })
      - key: index => index === 0
          ? `/api/history?limit=20`
          : `/api/history?limit=20&cursor=${previousPageData?.nextCursor}`
      - Uses server data as initial fallback (no client fetch on first render)
   b. usePendingChats() → merge optimistic entries on top of server data

3. CLIENT: Pagination (infinite scroll)
   a. Scroll sentinel triggers setSize(size + 1)
   b. GET /api/history?limit=20&cursor={nextCursor}
      - Server: auth, rate limit, cursor pagination
      - Response: { chats, nextCursor?, hasMore }
   c. SWR appends page data

4. RENDER
   a. Date-grouped lists: Today, Yesterday, Last 7 days, Last 30 days, Older
   b. PendingChats optimistic entries shown at top (italic/grey until confirmed)
   c. Active chat highlighted via pathname match
   d. SidebarHistoryItem: link + dropdown (share, rename, delete)
```

### Revalidation
- On chat mutation: `updateTag('chats:{userId}')` (Server Actions) or `revalidateTag('chats:{userId}', 'max')` (Route Handler onFinish)
- SWR: `revalidateFirstPage: true` — first page re-fetched on focus/mutation
- Server-rendered initial data avoids waterfall (~300ms vs ~1000ms client-only)
