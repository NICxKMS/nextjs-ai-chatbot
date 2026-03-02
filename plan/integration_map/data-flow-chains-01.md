> **Updated per redesign audit (2026-03-01)**

# Data Flow Chains (Part 1)

> End-to-end data flow chains for every major user interaction.
> Traces data from user action through client, server, and database layers.
> Updated to reflect: ChatStreamProvider (not DataStreamProvider), StreamBridge (not DataStreamHandler),
> artifactStore via useSyncExternalStore, revalidateTag after mutations, artifact-* stream parts,
> PendingChatsProvider (not OptimisticChatsProvider), Server Actions for mutations.

---

## Chain 1: New Chat — First Message Send

### Trigger
User types message in MultimodalInput on home page and clicks send.

### Flow

```
1. USER ACTION
   MultimodalInput → useChatSessionContext().sendMessage()

2. CLIENT: useChatSession (ChatShell)
   a. Validate: input not empty, status === 'idle'
   b. PendingChats.add({ id: chatId, title: input.slice(0,50), createdAt: now, visibility: 'private' })
      → PendingChatsProvider context update
      → SidebarHistoryClient re-renders with optimistic entry
   c. history.replaceState({}, '', `/chat/${chatId}`)
   d. handleSubmit() → DefaultChatTransport

3. CLIENT: DefaultChatTransport
   a. prepareSendMessagesRequest():
      - body.id = chatId
      - body.selectedChatModel = cookie/localStorage model ID
      - body.selectedVisibilityType = 'private'
      - body.settings = { temperature, topP, maxOutputTokens, systemPrompt, enableReasoning }
      - body.messages = [latest message only]
   b. POST /api/chat (SSE stream)

4. SERVER: POST /api/chat route handler
   a. Zod validate request body
   b. getAppSession() → session
   c. Rate limit check (if auth user)
   d. getChatWithMessages(chatId) → null (new chat)
   e. createChat({ id: chatId, userId, title: 'New Chat', visibility: 'private' })
   f. createUIMessageStream():
      - Merge streamText result into UIMessageStream
      - Configure tools: getEnabledTools(modelId)
      - System prompt: composeSystemPrompt({ model, systemPrompt? })
      - Apply settings: temperature, topP, maxOutputTokens, providerOptions

5. SERVER: streamText execution
   a. myProvider.languageModel(modelId) → model instance
   b. Model generates tokens → text-delta parts
   c. smoothStream transform (optional)
   d. Reasoning tokens → reasoning parts (if enabled)
   e. Tool calls → tool-call part + execute → tool-result part
   f. If createArtifact/updateArtifact tool: see Chain 5/6

6. SERVER: onFinish callback
   a. saveMessages(chatId, messages) → DB
   b. Generate title: generateText({ model: TITLE_MODEL, messages })
   c. updateChatTitle(chatId, title)
   d. ChatStream.writeData({ type: 'chat-title', content: title })
   e. revalidateTag('chat:{chatId}', 'max')
   f. revalidateTag('chats:{userId}', 'max')

7. CLIENT: useChat receives SSE
   a. text-delta → append to assistant message (automatic)
   b. onData callback for custom parts:
      - { type: 'chat-title' } → PendingChats.updateTitle(chatId, title)
      - { type: 'artifact-*' } → ChatStreamProvider dispatch
   c. Status transitions: idle → submitted → streaming → idle

8. CLIENT: ChatStreamProvider → StreamBridge (if artifact parts)
   a. ChatStreamProvider StateCtx update (RAF batched)
   b. StreamBridge useEffect reads new parts
   c. processStreamDelta(part) → artifactStore.setState()
   d. ArtifactPanel re-renders via useArtifact() subscription
```

### Revalidation
- Server: `revalidateTag('chat:{chatId}', 'max')` + `revalidateTag('chats:{userId}', 'max')`
- Client sidebar: PendingChats optimistic entry already visible; next navigation picks up server-confirmed data

---

## Chain 2: Load Existing Chat

### Trigger
User navigates to `/chat/[id]` via sidebar link or direct URL.

### Flow

```
1. NAVIGATION
   SidebarHistoryItem <Link href="/chat/{id}"> or direct URL

2. SERVER: app/(chat)/chat/[id]/page.tsx (async)
   a. getAppSession() → session
   b. Parallel fetch:
      - getChatWithMessages(chatId) → chat + messages
        - 'use cache' + cacheTag('chat:{chatId}')
      - getVotesByChatId(chatId) → votesPromise (NOT awaited)
      - getAvailableModels() → models
        - 'use cache' + cacheTag('models')
   c. Access control:
      - if (!chat) → redirect('/?notice=chat_not_found')
      - if (chat.userId !== session.user.id && chat.visibility === 'private') → notFound()
   d. isReadonly = (chat.userId !== session.user.id)

3. SERVER RENDER
   a. ChatStreamProvider (client)
   b. ChatShell(id, initialMessages, initialChatModel=chat.model, isReadonly, availableModels)
   c. StreamBridge(id)
   d. Suspense → VoteResolver(chatId, votesPromise)

4. CLIENT HYDRATION
   a. ChatShell creates ChatSessionContext via useChatSession()
      - Messages pre-populated from initialMessages
      - Model set from chat.model
      - Status: idle
   b. VoteResolver resolves votesPromise via React 19 use()
      - Renders vote buttons after hydration (non-blocking)
   c. ChatSessionContext.Provider wraps children
   d. ChatHeader, Messages, MultimodalInput consume context

5. CLIENT: User sees full chat
   - Messages rendered with tool results and artifact previews
   - If isReadonly: MultimodalInput hidden, vote buttons hidden
   - Model locked to chat.model (not switchable)
```

### Cache Behavior
- `'use cache'` + `cacheTag('chat:{chatId}')` — served from cache on repeat visits
- `revalidateTag('chat:{chatId}', 'max')` invalidates after mutations
- Next navigation after mutation hits fresh data
- Vote promise NOT awaited (Suspense defers hydration)

---

## Chain 3: Chat Deletion

### Trigger
User clicks delete in SidebarHistoryItem dropdown.

### Flow

```
1. USER ACTION
   SidebarHistoryItem → delete button click

2. CLIENT: Optimistic removal
   a. PendingChats.remove(chatId)
   b. SidebarHistoryClient re-renders without this chat

3. CLIENT: Server Action call
   a. deleteChat({ chatId }) — Server Action
      - getAppSession() → session
      - Ownership verification (chat.userId === session.user.id)
      - DB: delete chat (cascade: messages, votes, artifacts)
      - updateTag('chats:{userId}')
      - Return: ActionResult

4. CLIENT: Post-deletion
   a. If deleting active chat (chatId === current URL):
      - router.push('/') → navigate to home
   b. Success: optimistic state already applied
   c. Failure: toast.error(), PendingChats potentially re-add (dedup handles)

5. SERVER: Cache invalidation
   - updateTag('chats:{userId}') → sidebar cache stale
   - Next navigation will fetch fresh sidebar data
```

### Error Recovery
- If server action fails: toast notification, but optimistic removal already happened
- On next full history refresh cycle, list reconciles with server state

---

## Chain 4: Message Edit + Regenerate

### Trigger
User clicks edit on a previous user message.

### Flow

```
1. USER ACTION
   Message → edit button → MessageEditor opens

2. CLIENT: MessageEditor
   a. User edits message content
   b. User clicks "Send" in editor

3. CLIENT: Server Action + Regeneration
   a. deleteTrailingMessages({ id: messageId, chatId }) — Server Action
      - getAppSession() → session
      - DB: delete all messages with createdAt > this message's createdAt
      - updateTag('chat:{chatId}')
      - Return: ActionResult
   b. useChatSessionContext().editMessage(messageId, newContent)
      - Internally: truncate local messages array at messageId
      - Replace message content with newContent
      - Trigger handleSubmit() → new API call with edited content

4. SERVER: POST /api/chat (re-invocation)
   a. Same flow as Chain 1.4-1.6
   b. Server loads remaining messages from DB (trailing already deleted)
   c. Generates new response from edited context

5. CLIENT: New response streams in
   a. Same flow as Chain 1.7
   b. Previous assistant messages after edit point are gone
   c. New assistant response takes their place
```

### Data Consistency
- Server Action deletes trailing messages atomically
- `updateTag('chat:{chatId}')` invalidates cache
- Client local state truncated independently
- Re-submission generates fresh response

---

## Chain 5: Artifact Creation (createArtifact Tool)

### Trigger
AI model decides to use `createArtifact` tool during response generation.

### Flow

```
1. SERVER: Tool Call Execution
   a. AI model emits tool-call: createArtifact({ title, kind })
   b. Tool execute function runs:
      - Generate artifactId = generateUUID()
      - ChatStream.writeData({ type: 'artifact-id', content: artifactId })
      - ChatStream.writeData({ type: 'artifact-title', content: title })
      - ChatStream.writeData({ type: 'artifact-kind', content: kind })
      - ChatStream.writeData({ type: 'artifact-clear', content: '' })
      - getArtifactHandler(kind) → handler
      - content = await handler.create({ id: artifactId, title, kind, ChatStream, session, chatId })
      - ChatStream.writeData({ type: 'artifact-finish', content: '' })
      - saveArtifactVersion({ id: artifactId, title, content, kind, userId, chatId })

2. SERVER: Handler Execution (e.g., text handler)
   a. streamText({ model: ARTIFACT_MODEL, prompt: title })
   b. For each token: ChatStream.writeData({ type: 'artifact-textDelta', content: token })
   c. Return accumulated content string

3. CLIENT: SSE → ChatStreamProvider → StreamBridge
   a. useChat.onData receives artifact-* parts
   b. Dispatched to ChatStreamProvider (DispatchCtx)
   c. ChatStreamProvider batches via RAF → StateCtx update
   d. StreamBridge reads StateCtx changes

4. CLIENT: StreamBridge → artifactStore
   a. processStreamDelta(part) for each buffered part:
      - artifact-id → setState({ artifactId })
      - artifact-title → setState({ title })
      - artifact-kind → setState({ kind })
      - artifact-clear → setState({ content: '', status: 'streaming' })
      - artifact-textDelta → setState(prev => ({ content: prev.content + delta }))
      - artifact-finish → setState({ status: 'idle' })
   b. artifactStore.setState() → useSyncExternalStore subscribers notified

5. CLIENT: ArtifactPanel renders
   a. useArtifact() reads full artifact state
   b. isVisible: true → panel slides in (animation)
   c. Routes to TextEditor/CodeEditor/SheetEditor/ImageEditor by kind
   d. Content streams in character-by-character (text) or as partial JSON (code/sheet)
   e. On artifact-finish: editor switches to interactive mode
```

### Handler Accumulation Modes
| Kind | Delta Type | Accumulation | Rendering |
|------|-----------|-------------|-----------|
| text | `artifact-textDelta` | **Append** (`content += delta`) | TipTap incremental update |
| code | `artifact-codeDelta` | **Replace** (`content = delta`) — partial JSON object | CodeMirror full re-render |
| sheet | `artifact-sheetDelta` | **Replace** (`content = delta`) — partial JSON object | react-data-grid full re-render |
| image | `artifact-imageDelta` | **Replace** (`content = delta`) — base64 | img src update |

---

## Chain 6: Artifact Update (updateArtifact Tool)

### Trigger
AI model decides to use `updateArtifact` tool to modify existing artifact.

### Flow

```
1. SERVER: Tool Call Execution
   a. AI model emits tool-call: updateArtifact({ id: artifactId, description })
   b. Tool execute function runs:
      - getArtifactById(artifactId) → existing artifact (latest version)
      - ChatStream.writeData({ type: 'artifact-clear', content: '' })
      - getArtifactHandler(kind) → handler
      - content = await handler.update({ id, description, currentContent, kind, title, ChatStream, session })
      - ChatStream.writeData({ type: 'artifact-finish', content: '' })
      - saveArtifactVersion({ id: artifactId, title, content, kind, userId, chatId })

2. CLIENT: Same flow as Chain 5.3-5.5
   - artifact-clear resets content and sets status: streaming
   - Delta parts stream new content
   - artifact-finish sets status: idle
   - New version saved, VersionFooter can show version history
```

---

## Chain 7: Settings Change → Chat Behavior

### Trigger
User opens settings panel and changes a value.

### Flow

```
1. USER ACTION
   SettingsPanel → change temperature / topP / maxOutputTokens / systemPrompt / enableReasoning

2. CLIENT: useSyncExternalStore (module store)
   a. settingsStore.setState({ ...state, [key]: value })
   b. localStorage.setItem('settings', JSON.stringify(newState))
   c. useSyncExternalStore subscribers re-render
   d. Cross-tab sync: other tabs receive StorageEvent → update their store

3. CLIENT: Next message send
   a. useChatSession reads useSettings()
   b. prepareSendMessagesRequest includes settings in body
   c. POST /api/chat with settings payload

4. SERVER: Route handler reads settings
   a. Extract: temperature, topP, maxOutputTokens, systemPrompt, enableReasoning
   b. composeSystemPrompt({ model, systemPrompt? }) — custom system prompt support
   c. streamText({ temperature, topP, maxTokens: maxOutputTokens, ... })
   d. providerOptions: enableReasoning → per-provider reasoning config

5. EFFECT
   AI response reflects new settings
   - Higher temperature = more creative
   - Custom system prompt = different persona
   - Reasoning enabled = extended thinking visible
```

### Persistence
- Client-only (localStorage) — no server-side persistence needed
- Scoped to browser/device, not user account
- Default values if no localStorage entry exists
- No SettingsProvider needed (useSyncExternalStore reads/writes directly)
