# Data Flow Chains — Part 01 (Flows 1–8)

> Complete end-to-end data flow for core operations. Each chain traces from
> user trigger through handler, data layer, state management, to final render.
> See [data-flow-chains-02.md](data-flow-chains-02.md) for Flows 9–15.

---

## Flow 1: Chat Send Message

**Trigger:** User presses Enter in `MultimodalInput` or clicks submit button

```
USER ACTION
  │
  ├── MultimodalInput.handleSubmit()
  │     ├── history.replaceState('/chat/{chatId}')  ← URL update (no reload)
  │     ├── addOptimisticChat({ id, title: input.slice(0,50) })  ← sidebar
  │     ├── sendMessage({ message, experimental_attachments })
  │     └── clear: attachments=[], input='', localStorage entry
  │
  ├── useChat (AI SDK) — DefaultChatTransport
  │     ├── prepareSendMessagesRequest() injects:
  │     │     selectedChatModel, selectedVisibilityType, settings
  │     ├── POST /api/chat with JSON body
  │     └── Opens SSE connection for response
  │
  ├── SERVER: POST /api/chat
  │     ├── parseJsonBodyForRoute(body, postRequestBodySchema)
  │     ├── isValidModelId(selectedChatModel)
  │     ├── getAppSession() → session
  │     ├── RateLimiters.chat(userId) → rate limit check
  │     ├── createContext(session) → DataContext
  │     ├── isGuest + !isRedisAvailable → error
  │     ├── Promise.all([getUserMessageCount, chatData.getWithMessages])
  │     ├── entitlements check (20/day guest, 100/day auth)
  │     ├── ownership check (if existing chat)
  │     ├── createUIMessageStream():
  │     │     ├── Title generation (parallel, non-blocking)
  │     │     ├── executeChatCompletion():
  │     │     │     ├── myProvider.languageModel(model)
  │     │     │     ├── systemPrompt(regular + user + geo + artifacts)
  │     │     │     ├── Tools: getWeather, createDocument, updateDocument, requestSuggestions
  │     │     │     ├── streamText() → SSE tokens
  │     │     │     └── smoothStream({ delayInMs: 2, chunking: "word" })
  │     │     └── SSE stream piped via JsonToSseTransformStream
  │     └── onFinish:
  │           ├── saveChat() → DB + cache
  │           ├── incrementQuota() → Redis
  │           └── updateChatTitle() → DB + cache (async)
  │
  └── CLIENT RECEIVES SSE
        ├── useChat processes text-delta tokens → messages state
        ├── onData: data-chatTitle → updateOptimisticChat(id, {title})
        ├── onData: data-usage → setUsage(usage)
        ├── onFinish: poll /api/chat?id= for title (5 attempts, 500ms)
        ├── Messages re-renders with new assistant message
        └── Virtuoso auto-scrolls if at bottom
```

---

## Flow 2: Chat Stream/Receive

**Trigger:** SSE response arrives from `/api/chat`

```
SSE RESPONSE ARRIVES
  │
  ├── useChat hook (AI SDK) processes stream
  │     ├── text-delta → append to messages[last].parts[text]
  │     ├── reasoning → append to messages[last].parts[reasoning]
  │     ├── tool-call → add tool invocation part
  │     ├── tool-result → add tool result part
  │     └── finish-message → status changes to "ready"
  │
  ├── useChat.onData callback processes custom parts
  │     ├── data-chatTitle → updateOptimisticChat(chatId, {title})
  │     ├── data-usage → setUsage(mergedUsage)
  │     └── data-appendMessage → setMessages(prev => [...prev, msg])
  │
  ├── DataStreamProvider receives dataStream updates
  │     └── setDataStream(newDeltas) → state context updates
  │
  ├── DataStreamHandler (sibling to Chat) processes deltas
  │     ├── data-id → setArtifact({documentId: id, status: "streaming"})
  │     ├── data-title → setArtifact({title})
  │     ├── data-kind → setArtifact({kind})
  │     ├── data-clear → setArtifact({content: ""})
  │     ├── data-*Delta → artifactDefinition.onStreamPart()
  │     │     ├── data-textDelta: append to content
  │     │     ├── data-codeDelta: replace content
  │     │     └── data-sheetDelta: replace content
  │     └── data-finish → setArtifact({status: "idle"})
  │
  └── RENDER
        ├── Messages component (Virtuoso)
        │     ├── PreviewMessage per message
        │     │     ├── MessageContent (markdown, syntax, math)
        │     │     ├── MessageReasoning (collapsible thinking)
        │     │     └── Tool-specific renderers (Weather, DocumentPreview)
        │     ├── ThinkingMessage (animated dots during streaming)
        │     └── Auto-scroll follows output
        │
        └── Artifact panel (if artifact streaming)
              ├── AnimatePresence slide-in animation
              ├── Editor (text/code/sheet/image) renders content
              └── Status indicator shows "streaming"
```

---

## Flow 3: Chat History Load

**Trigger:** Sidebar mount / SWR revalidation / infinite scroll

```
SIDEBAR MOUNTS
  │
  ├── SidebarHistory component
  │     └── useSWRInfinite(getChatHistoryPaginationKey, fetcher)
  │           key: /api/history?limit=20&offset={page*20}
  │           fetcher: fetch(url).then(res => res.json())
  │
  ├── CLIENT → GET /api/history?limit=20
  │
  ├── SERVER
  │     ├── getAppSession() → session
  │     ├── createContext(session) → ctx
  │     ├── Guest path:
  │     │     ├── getUserChatsFromCache(userId, limit, offset)
  │     │     ├── ZREVRANGE user:{userId}:chats
  │     │     ├── Batch MGET for chat:{id}:{userId}:meta
  │     │     └── Return { chats, hasMore }
  │     └── Auth path:
  │           ├── DB SELECT chats WHERE userId ORDER BY createdAt DESC
  │           ├── Cursor-based pagination (starting_after/ending_before)
  │           ├── Fetch limit+1 to detect hasMore
  │           └── Return { chats: chats.slice(0, limit), hasMore }
  │
  ├── Response: Cache-Control: private, max-age=0, s-maxage=10, stale-while-revalidate=30
  │
  └── RENDER
        ├── GroupedVirtuoso groups chats by date
        │     ├── __optimistic__ group (from OptimisticChatsProvider)
        │     ├── Today, Yesterday, Last 7 days, Last 30 days, Older
        │     └── Each: SidebarHistoryItem (ChatItem link + dropdown)
        ├── Infinite scroll sentinel triggers next page
        └── Active chat highlighted via pathname match
```

---

## Flow 4: Artifact Create

**Trigger:** AI decides to call `createDocument` tool during chat streaming

```
AI STREAMING (server-side)
  │
  ├── streamText tool call detected: createDocument({ title, kind })
  │
  ├── create-document.ts tool execute():
  │     ├── id = generateUUID()
  │     ├── dataStream.write({ type: "data-kind", data: kind })
  │     ├── dataStream.write({ type: "data-id", data: id })
  │     ├── dataStream.write({ type: "data-title", data: title })
  │     ├── dataStream.write({ type: "data-clear", data: null })
  │     ├── documentHandler = documentHandlersByArtifactKind.find(kind)
  │     ├── handler.onCreateDocument({ id, title, dataStream, session, chatId }):
  │     │     │
  │     │     ├── TEXT: streamText() → data-textDelta parts (append)
  │     │     ├── CODE: streamObject({ z.object({ code }) }) → data-codeDelta (replace)
  │     │     ├── SHEET: streamObject({ z.object({ csv }) }) → data-sheetDelta (replace)
  │     │     └── IMAGE: (no handler — created via Pyodide execution)
  │     │
  │     ├── documentData.save({ id, title, kind, content, userId, chatId })
  │     │     ├── Guest: appendDocumentVersionToCache (Redis only)
  │     │     └── Auth: DB INSERT + appendDocumentVersionToCache
  │     └── dataStream.write({ type: "data-finish", data: null })
  │
  ├── CLIENT: DataStreamHandler processes deltas
  │     ├── data-kind → artifact.kind = kind
  │     ├── data-id → artifact.documentId = id
  │     ├── data-title → artifact.title = title
  │     ├── data-clear → artifact.content = ""
  │     ├── artifactDefinition.onStreamPart handles content deltas
  │     └── data-finish → artifact.status = "idle", isVisible = true
  │
  └── RENDER
        ├── Artifact panel opens (AnimatePresence spring animation)
        ├── Editor renders based on kind:
        │     ├── text → TipTap editor with streaming content
        │     ├── code → CodeMirror editor with Python syntax
        │     ├── sheet → react-data-grid with CSV parsed rows
        │     └── image → Base64 <img> display
        ├── VersionFooter shows "Version 1 of 1"
        └── Toolbar appears (per-kind actions)
```

---

## Flow 5: Artifact Update/Version

**Trigger:** AI calls `updateDocument` tool or user edits content directly

### AI-Initiated Update

```
AI STREAMING
  │
  ├── updateDocument tool execute({ id, description })
  │     ├── documentData.get(id, ctx) → existing document + versions
  │     ├── latestVersion = document.versions.at(-1)
  │     ├── dataStream.write({ type: "data-clear", data: null })
  │     ├── handler.onUpdateDocument({ document: latestVersion, description, dataStream })
  │     │     ├── Same streaming pattern as create (per-kind)
  │     │     └── Uses existing content + description as context
  │     ├── documentData.save() → new version row (same id, new createdAt)
  │     └── dataStream.write({ type: "data-finish", data: null })
  │
  └── CLIENT: same DataStreamHandler → Artifact re-render pipeline
```

### User-Initiated Edit (Direct)

```
USER EDITS IN EDITOR
  │
  ├── Editor onChange → debounced (2s) → saveContent()
  │     └── POST /api/document?id={id} { title, content, kind }
  │           ├── Auth check, rate limit
  │           ├── documentData.save() → new version row
  │           └── Cache updated (version appended)
  │
  └── RENDER: currentVersionIndex updated, VersionFooter shows version count
```

---

## Flow 6: Auth Login

**Trigger:** User submits login form at `/login`

```
USER SUBMITS LOGIN FORM
  │
  ├── AuthForm.action() — form action handler
  │     ├── Client: supabase.auth.signInWithPassword({ email, password })
  │     ├── Supabase returns session with access_token
  │     │
  │     ├── POST /api/auth/exchange { accessToken }
  │     │     ├── jwtVerify(token, SUPABASE_JWT_SECRET)
  │     │     │     audience: "authenticated"
  │     │     │     issuer: "{SUPABASE_URL}/auth/v1"
  │     │     ├── Extract: sub (userId), email from payload
  │     │     ├── Set cookie: sb_token (httpOnly, secure, sameSite=lax, 7d maxAge)
  │     │     └── Return { user: { id, email } }
  │     │
  │     ├── On success: router.push('/') + router.refresh()
  │     └── On error: toast.error(message)
  │
  └── AFTER REDIRECT
        ├── Root layout: getAppSession() reads sb_token cookie → authenticated session
        ├── AuthProvider receives initialSession
        ├── SidebarHistory fetches history (auth path: DB query)
        └── Chat page renders with full auth capabilities
```

---

## Flow 7: Auth Guest

**Trigger:** First visit with no auth cookies

```
FIRST VISIT (no sb_token, no guest_token)
  │
  ├── AuthProvider detects no initialSession
  │     └── POST /api/auth/guest
  │           ├── guestId = guest:{crypto.randomUUID()}
  │           ├── Sign JWT: { sub: guestId, iat, exp: +1h }, HS256, GUEST_JWT_SECRET
  │           ├── Set cookie: guest_token (httpOnly, secure, sameSite=lax, 7d maxAge)
  │           └── Return { user: { id: guestId, type: "guest" } }
  │
  ├── AuthProvider.setSession(guestSession)
  │     └── isNewSession = true (skips initial SWR history fetch)
  │
  ├── SUBSEQUENT REQUESTS
  │     ├── proxy.ts checks guest_token on every request
  │     ├── If JWT.exp < 30min → rotate: new JWT, same guest:{uuid}, fresh 1h exp
  │     └── Cookie refreshed with new 7d maxAge
  │
  └── GUEST LIMITATIONS
        ├── Chat: cache-only (no DB fallback)
        ├── History: cache ZSET only, no cursor pagination
        ├── Voting: disabled (requires DB)
        ├── Suggestions persistence: disabled
        ├── Daily limit: 20 messages
        └── Redis required (guest_requires_cache error if unavailable)
```

---

## Flow 8: Sidebar History

**Trigger:** Layout mount, SWR revalidation, or infinite scroll

```
SIDEBAR RENDERS
  │
  ├── SidebarHistory component
  │     ├── useAuth() → session (skip fetch if isNewSession)
  │     └── useSWRInfinite(key, fetcher)
  │           ├── key: index => `/api/history?limit=20&offset=${index*20}`
  │           ├── fetcher: fetch(url).json()
  │           └── revalidation: on mutation (after delete, title update)
  │
  ├── OPTIMISTIC LAYER
  │     ├── OptimisticChatsProvider prepends optimistic entries
  │     ├── addOptimisticChat() → unconfirmed entries at list head
  │     ├── updateOptimisticChat() → title updates from stream
  │     ├── removeOptimisticChat() → on delete
  │     └── Auto-cleanup: entries > 2min old are removed
  │
  ├── TITLE SYNC
  │     ├── Stream: data-chatTitle → updateOptimisticChat(id, {title})
  │     ├── Polling: onFinish → poll /api/chat?id= for title (5×500ms)
  │     ├── Event: window 'chat-title-updated' → sidebar listens
  │     └── SWR revalidation on next page load
  │
  └── RENDER
        ├── GroupedVirtuoso with date groups
        ├── SidebarHistoryItem per chat (link + dropdown)
        │     ├── Click → navigate to /chat/{id}
        │     ├── Share submenu: Private/Public visibility toggle
        │     └── Delete: confirm → DELETE /api/history/{id} → optimistic removal
        └── Delete All: DELETE /api/history → redirect / + SWR mutate
```
