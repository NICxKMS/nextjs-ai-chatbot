FLOW: Existing Chat Page Load
ENTRY: Browser navigates to `/chat/[id]` → Next.js resolves `app/(chat)/chat/[id]/page.tsx`

STEPS:
  1. `app/layout.tsx` (RootLayout, Server Component)
     → Same as first-paint: `<html>` shell → ThemeProvider → TooltipProvider → {children} + Toaster

  2. `app/(chat)/layout.tsx` (ChatLayout, Server Component)
     → `getAppSession()` promise started (NOT awaited)
     → Wraps: NoticeHandler(Suspense) → SessionProvider(promise) → PendingChatsProvider → Suspense(ChatLayoutShell/Fallback)
     → Immediate output: ChatLayoutFallback with SidebarSkeleton + children

  3. `app/(chat)/chat/[id]/loading.tsx` (Loading skeleton)
     → Shown while page.tsx awaits data
     → Renders: header skeleton + alternating user/assistant message skeletons (4 messages) + input skeleton
     → MESSAGE_SKELETONS: user(75%), assistant(90%,60%,45%), user(50%), assistant(85%,70%)
     → Staggered animation delays (index * 75ms)

  4. `generateMetadata` (async, runs in parallel with page render)
     → `const { id } = await params`
     → `getChatPageState(id)` — `React.cache`-wrapped function:
       - `Promise.all([getAppSession(), getCachedChat(chatId)])`
       - `getCachedChat`: `'use cache'` + `withCache(cacheKeys.chat(chatId), getChatById, 'seconds')`
     → Returns `{ title: chat?.title ?? "Chat" }`
     → NOTE: `getChatPageState` is `React.cache`-wrapped — shared between generateMetadata and page

  5. `app/(chat)/chat/[id]/page.tsx` (ExistingChatPage, async Server Component)
     → `const { id: chatId } = await params`
     → Starts parallel promises:
       a. `chatPageStatePromise = getChatPageState(chatId)` — cache-hit from generateMetadata
       b. `availableModelsPromise = getAvailableModels()` — cached hourly

     → `const { session, chat } = await chatPageStatePromise`
       - `getChatPageState` internally: `Promise.all([getAppSession(), getCachedChat(chatId)])`
       - `getVisibleChat(chat, session)` — access control:
         * null → notFound()
         * private + user mismatch → null → notFound()
         * Otherwise returns chat

     → `if (!chat) notFound()` — triggers Next.js 404 page

     → `votesPromise = getVotesPromise(chatId, session)`
       - If guest or no session → `Promise.resolve([])` (no votes for guests)
       - If authenticated → `getCachedVotes(chatId, userId)` with `.catch()` fallback to `[]`
       - `getCachedVotes`: `'use cache'` + `withCache(cacheKeys.votes(chatId), getVotesByChatId, 'seconds')`

     → `Promise.all([getMessagesForChatRender(chatId), availableModelsPromise])`
       - `getMessagesForChatRender`: DB select of `{id, role, parts}` ordered by `createdAt ASC`, limit 500
       - Returns `ChatRenderMessage[]` — reduced message shape (no createdAt, chatId, etc.)

     → `convertToUIMessages(dbMessages)` — maps DB messages to AI SDK `UIMessage[]` format

     → `isReadonly = !session?.user || session.user.id !== chat.userId`

     → Output:
       ```jsx
       <ChatStreamProvider>
         <VotesProvider chatId={chat.id}>
           <ChatShell
             id={chat.id}
             initialMessages={initialMessages}
             initialChatModel={chat.model ?? DEFAULT_CHAT_MODEL}
             isReadonly={isReadonly}
             initialVisibility={chat.visibility}
             availableModels={availableModels}
           />
           <Suspense fallback={null}>
             <VoteResolver votesPromise={votesPromise} />
           </Suspense>
         </VotesProvider>
       </ChatStreamProvider>
       ```

  6. `VotesProvider` (Client Component)
     → Creates internal `VotesStore` (useSyncExternalStore pattern)
     → `useVotes(chatId, serverVotes)` — hook with `useOptimistic` for vote mutations
     → Exposes `VotesContext` with `{store, submitVote}` + `VotesSetterContext` with `setServerVotes`
     → Initially empty votes (serverVotes = [])

  7. `ChatShell` (Client Component — same as first-paint but with data)
     → `initialMessages` is populated → Messages renders message list instead of greeting
     → `useChatSession(params)` creates useChat with initialMessages
     → `useChatSideEffects` — URL is already `/chat/[id]`, no URL update needed
     → No auto-submit (no initialQuery)

  8. `Messages` (Client Component, memo'd)
     → `messages.length > 0` → renders scrollable message list
     → Maps each message to `<MessageItem>` (memo'd with fast-deep-equal on parts):
       - User messages: blue bubble with rounded corners
       - Assistant messages: avatar icon + MessageContent with streaming markdown
       - Reasoning parts → `<MessageReasoning />` collapsible
       - Tool parts → `<GenericToolResult />` or `<ArtifactPreview />` for artifact tools
       - File attachments → `<Attachment>` + `<AttachmentPreview />`
     → Last message gets `isLoading={status === "streaming"}`
     → Shows `<ThinkingMessage />` when `status === "submitted"`
     → `useScrollToBottom()` — IntersectionObserver on sentinel element

  9. `VoteResolver` (Client Component — behind `<Suspense fallback={null}>`)
     → `use(votesPromise)` — React 19 API, suspends until promise resolves
     → When resolved: `setServerVotes(resolvedVotes)` updates VotesProvider
     → VotesStore notifies subscribers → VoteButtons re-render with actual vote state
     → Renders null — pure effect component

  10. Sidebar + StreamBridge + ArtifactPanel same as first-paint flow

COMPONENT TREE (full):
  ```
  RootLayout
  └── ThemeProvider
      └── TooltipProvider
          └── ChatLayout
              ├── Suspense(fallback=null) → NoticeHandler
              └── SessionProvider(promise)
                  └── PendingChatsProvider
                      └── Suspense(ChatLayoutFallback/ChatLayoutShell)
                          ├── SidebarProvider
                          │   ├── Suspense(SidebarSkeleton) → SidebarShell
                          │   │   ├── SidebarHeader → SidebarHeaderActions
                          │   │   ├── SidebarContent → SidebarHistoryClient
                          │   │   └── SidebarFooter → SidebarUserNav
                          │   └── SidebarInset
                          │       └── ChatStreamProvider
                          │           └── VotesProvider(chatId)
                          │               ├── ChatShell (ChatSessionContext.Provider)
                          │               │   ├── ChatHeader
                          │               │   │   ├── SidebarToggle
                          │               │   │   ├── ModelSelector
                          │               │   │   ├── VisibilitySelector
                          │               │   │   ├── New Chat Link
                          │               │   │   ├── Settings Button
                          │               │   │   └── SettingsPanel (Sheet)
                          │               │   ├── Messages
                          │               │   │   └── MessageItem[] (memo'd)
                          │               │   │       ├── ChatMessage
                          │               │   │       │   ├── MessageReasoning?
                          │               │   │       │   ├── MessageContent (text)
                          │               │   │       │   ├── GenericToolResult?
                          │               │   │       │   ├── ArtifactPreview?
                          │               │   │       │   └── Attachment[]?
                          │               │   │       └── MessageActions
                          │               │   ├── MultimodalInput (if !isReadonly)
                          │               │   ├── StreamBridge (renders null)
                          │               │   └── ArtifactPanel (dynamic, SSR=false)
                          │               └── Suspense(fallback=null) → VoteResolver
                          └── Toaster
  ```

BOTTLENECKS:
  - **Sequential await chain in page.tsx**: `await params` → `await chatPageStatePromise` → access control → `await Promise.all([messages, models])`. Three sequential await points before render.
  - **getAppSession() pipeline**: Supabase getUser() → cookie read → network to Supabase auth server. Cannot be cached (dynamic cookies).
  - **getCachedChat + getCachedVotes**: Both use `'use cache'` with `cacheLife('seconds')` — cold cache misses hit the DB.
  - **getMessagesForChatRender**: DB query for up to 500 messages ordered by createdAt — large chats incur significant serialization cost.
  - **convertToUIMessages**: Maps all messages in memory on every page load. For 500 messages, this is non-trivial.
  - **VoteResolver behind Suspense**: Votes don't block page render, but the internal `use()` suspends the component — React must track the suspended tree.

WASTE:
  - `generateMetadata` and `ExistingChatPage` both call `getChatPageState(chatId)`. The `React.cache` wrapper ensures it's only executed once per request — this is correct design, no waste.
  - `getAvailableModels()` is called even for readonly chats where model selection isn't shown — the model list is still needed for `initialChatModel` display. Minimal waste since it's hourly-cached.
  - `ChatStreamProvider` is rendered even for readonly chats where streaming won't occur — providers are lightweight (empty state array), acceptable overhead.
  - `StreamBridge` subscribes to chatStream even for readonly chats — renders null, minimal cost.

SIMPLIFICATION OPPORTUNITIES:
  - `getVisibleChat` is a pure function called after `getChatPageState` — could be inlined into page.tsx since it's 5 lines of logic.
  - `votesPromise` construction with guest check + `.catch()` wrapping could be a single function or integrated into `getCachedVotes` with a null-userId short-circuit.
  - The `DEFAULT_CHAT_MODEL` fallback in `chat.model ?? DEFAULT_CHAT_MODEL` suggests the DB field is nullable — this could be made non-null with a migration.

EXIT: Browser displays the existing chat with:
  - Two-column layout with sidebar (skeleton → real)
  - ChatHeader with the chat's persisted model
  - Message list with all historical messages rendered
  - MultimodalInput at bottom (or hidden if readonly)
  - Votes streamed in asynchronously via VoteResolver
  - ArtifactPanel code-split, loaded on demand
