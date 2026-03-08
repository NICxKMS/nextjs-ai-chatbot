FLOW: Loading States
ENTRY: Next.js renders loading.tsx files as automatic Suspense fallbacks for route segments

STEPS:

  1. **Loading state inventory** — files and what they wrap:

     | File                              | Type              | Wraps (Suspense scope)                      |
     |-----------------------------------|-------------------|----------------------------------------------|
     | `app/(auth)/loading.tsx`          | Route loading      | Auth page.tsx (login or register)            |
     | `app/(chat)/loading.tsx`          | Route loading      | `app/(chat)/page.tsx` (new chat)             |
     | `app/(chat)/chat/[id]/loading.tsx`| Route loading      | `app/(chat)/chat/[id]/page.tsx` (existing)   |

  2. **Manual Suspense boundaries** (not loading.tsx, but serve same purpose):

     | Location                                    | Fallback                  | Wraps                                  |
     |---------------------------------------------|---------------------------|----------------------------------------|
     | `(auth)/layout.tsx` → AuthLayout            | `<AuthLoadingState />`    | `<AuthGuard>{children}</AuthGuard>`    |
     | `(chat)/layout.tsx` → ChatLayout outer       | `<ChatLayoutFallback>`    | `<ChatLayoutShell>`                    |
     | `(chat)/layout.tsx` → ChatLayoutShell inner  | `<SidebarSkeleton />`     | `<SidebarShell />`                     |
     | `(chat)/layout.tsx` → NoticeHandler          | `null`                    | `<NoticeHandler />`                    |
     | `(chat)/chat/[id]/page.tsx` → VoteResolver   | `null`                    | `<VoteResolver votesPromise={...} />`  |

  3. **`app/(auth)/loading.tsx`** (Auth Loading):
     → Renders: `<AuthLoadingState />`
     → AuthLoadingState component:
       - `<output>` element with `aria-label="Loading authentication"`
       - Title skeleton: h-7 w-32 animate-pulse
       - Subtitle skeleton: h-4 w-48 animate-pulse
       - Email field: label skeleton (h-4 w-16) + input skeleton (h-10 w-full)
       - Password field: label skeleton (h-4 w-20) + input skeleton (h-10 w-full)
       - Submit button skeleton: h-10 w-full
       - Screen reader: "Loading authentication form…"
     → Shown when: Navigating to /login or /register while page.tsx is loading
     → NOTE: This is redundant with the AuthLayout's manual `<Suspense fallback={<AuthLoadingState />}>` around AuthGuard. The loading.tsx wraps the page, while the layout Suspense wraps the guard + page. In practice:
       - loading.tsx fires for page-level async work
       - Layout Suspense fires for AuthGuard's `getAppSession()` async work
       - Both show the same component, so the user experience is seamless

  4. **`app/(chat)/loading.tsx`** (New Chat Loading):
     → Full chat UI skeleton matching ChatShell layout:
       - **Header**: SidebarToggle skeleton (size-8) + ModelSelector skeleton (h-8 w-32) + ml-auto buttons (2x h-8 w-8)
       - **Message area**: Centered hint skeleton (h-4 w-48)
       - **Input**: Bottom-anchored input skeleton (h-[52px] w-full rounded-2xl)
       - Screen reader: "Loading chat…"
     → Shown when: Navigating to `/` while page.tsx resolves `getAvailableModels()` + `getDefaultModel()`
     → Renders INSIDE the sidebar layout (SidebarInset children) — sidebar skeleton is separate

  5. **`app/(chat)/chat/[id]/loading.tsx`** (Existing Chat Loading):
     → Enhanced skeleton matching ChatShell with existing messages:
       - **Header**: Same as new-chat + extra visibility selector skeleton (h-8 w-20, hidden md:block)
       - **Message list**: 4 alternating message skeletons:
         - User message: 75% width
         - Assistant message: avatar circle + 90%, 60%, 45% width lines
         - User message: 50% width
         - Assistant message: 85%, 70% width lines
       - Staggered animation: `animationDelay: ${index * 75}ms`
       - **Input**: Same bottom-anchored skeleton
       - Screen reader: "Loading conversation…"
     → Shown when: Navigating to `/chat/[id]` while page.tsx resolves chat data, messages, models
     → Renders INSIDE the sidebar layout — sidebar loading is separate

  6. **AuthLayout Suspense** (`<AuthLoadingState />`):
     → Same component as loading.tsx uses
     → Triggered by: `AuthGuard`'s `await getAppSession()` — dynamic API (cookies)
     → Shows skeleton while session is being checked
     → If authenticated: redirect to "/" (skeleton briefly shown then navigation)
     → If not authenticated: skeleton replaced by auth form

  7. **ChatLayout outer Suspense** (`<ChatLayoutFallback>{children}</ChatLayoutFallback>`):
     → `ChatLayoutFallback` renders:
       - `ChatLayoutFrame defaultOpen={true}` — assumes sidebar open (optimistic default)
       - `sidebar={<SidebarSkeleton />}` — full sidebar skeleton
       - `{children}` — passes through page content (loading.tsx or resolved page)
     → Triggered by: `ChatLayoutShell`'s `await cookies()` for sidebar_state
     → Key insight: **children are NOT blocked** — the page content renders immediately
       inside the fallback layout. Only the sidebar frame is in "skeleton" mode.

  8. **ChatLayoutShell inner Suspense** (`<SidebarSkeleton />`):
     → Triggered by: `SidebarShell`'s `await getAppSession()` + `getCachedChats()`
     → Shows SidebarSkeleton while session + chat history resolve
     → Replaces the outer SidebarSkeleton when ChatLayoutShell resolves, then
       this inner SidebarSkeleton takes over until SidebarShell resolves

  9. **VoteResolver Suspense** (`null` fallback):
     → Triggered by: `use(votesPromise)` in VoteResolver — React 19 `use()` suspends
     → Fallback: `null` — nothing rendered while votes load
     → Chat is fully interactive without votes — they're non-blocking decorations
     → When resolved: VoteResolver sets votes in VotesProvider context

  10. **NoticeHandler Suspense** (`null` fallback):
      → Triggered by: `useSearchParams()` — may suspend during SSR
      → Fallback: `null` — invisible component, no visual impact
      → When resolved: checks for notice param and shows toast

LOADING STATE TIMELINE (New Chat `/`):
  ```
  T=0    RootLayout renders (static)
  T=0    ChatLayout renders:
         - NoticeHandler Suspense → null
         - SessionProvider receives promise
         - PendingChatsProvider wraps
         - Outer Suspense → ChatLayoutFallback(SidebarSkeleton + children)
  T=0    (chat)/loading.tsx renders inside ChatLayoutFallback:
         - Header skeleton | Empty message area | Input skeleton
  T=0    User sees: SidebarSkeleton | Loading skeleton

  T=~50ms ChatLayoutShell resolves (cookies() completes):
         - Outer Suspense replaced by ChatLayoutFrame(actual defaultOpen)
         - Inner Suspense → SidebarSkeleton (SidebarShell still loading)
  T=~50ms User sees: SidebarSkeleton (inner) | Loading skeleton (unchanged)

  T=~100ms page.tsx resolves (models fetched):
         - loading.tsx replaced by ChatShell tree
  T=~100ms User sees: SidebarSkeleton | ChatHeader + Greeting + Input

  T=~200ms SidebarShell resolves (session + cached chats):
         - Inner SidebarSkeleton replaced by real sidebar
  T=~200ms User sees: Real Sidebar | ChatHeader + Greeting + Input
  ```

LOADING STATE TIMELINE (Existing Chat `/chat/[id]`):
  ```
  T=0    Same layout scaffolding as new chat
  T=0    (chat)/chat/[id]/loading.tsx renders:
         - Header skeleton + Message skeletons (4 alternating) + Input skeleton
  T=0    User sees: SidebarSkeleton | Chat loading skeleton with fake messages

  T=~100ms page.tsx resolves (session + chat + access control + messages + models):
         - loading.tsx replaced by ChatShell with actual messages
  T=~100ms User sees: SidebarSkeleton | Real chat with messages

  T=~200ms SidebarShell resolves
  T=~200ms User sees: Real Sidebar | Real chat with messages

  T=~300ms VoteResolver resolves (async votes):
         - Vote buttons update with actual vote state
  ```

WHAT IS UNSTREAMED (blocks behind loading.tsx):
  | Route              | Blocking Data                                          | Estimated Latency |
  |--------------------|-------------------------------------------------------|-------------------|
  | `/` (new chat)     | `getAvailableModels()` + `getDefaultModel()` (cookie) | 50-200ms (cached) |
  | `/chat/[id]`       | `getAppSession()` + `getCachedChat()` + messages + models | 100-500ms      |
  | `/login`           | `getAppSession()` in AuthGuard                        | 50-200ms          |
  | `/register`        | `getAppSession()` in AuthGuard                        | 50-200ms          |

BOTTLENECKS:
  - **Double SidebarSkeleton render**: Outer fallback shows SidebarSkeleton, then inner fallback shows another SidebarSkeleton. User might see a brief flash when the outer resolves and the inner takes over — the visual should be identical but the DOM is replaced.
  - **Existing chat loading is heavy**: The [id]/loading.tsx blocks on session + chat + access control + messages (up to 500) + models — all must resolve before any real content appears. This is the longest loading state.
  - **No streaming of individual messages**: Messages are fetched as a complete array (`getMessagesForChatRender`) and rendered all at once. There's no progressive rendering of individual messages.

WASTE:
  - `(auth)/loading.tsx` and the `<Suspense fallback={<AuthLoadingState />}>` in auth layout show the same component. The loading.tsx is technically redundant since the layout Suspense already handles the async boundary. However, loading.tsx handles page-level async (e.g., if page.tsx became async in the future), so it's defensive.
  - `ChatLayoutFallback` hardcodes `defaultOpen={true}` — if the user's preference is closed, there's a brief layout shift when the real value loads. Most users likely have the sidebar open, so the optimistic default is sensible.
  - All loading skeletons use `animate-pulse` — consistent but potentially distracting on fast loads where skeletons flash for <100ms.

SIMPLIFICATION OPPORTUNITIES:
  - The outer + inner Suspense boundary pattern for the sidebar creates complexity. If `getSidebarDefaultOpen()` were combined with `SidebarShell` into a single async function, one Suspense boundary would suffice.
  - The `[id]/loading.tsx` message skeletons are hardcoded (4 messages). For chats with many messages, the skeleton looks nothing like the final content. A simpler "Loading conversation…" spinner might be less jarring.
  - VoteResolver with `fallback={null}` is invisible — the Suspense boundary exists only for React 19 `use()` mechanics. This is correct but could be documented more explicitly in the code.

EXIT: Each route segment displays an appropriate loading skeleton:
  - Auth: Form skeleton in centered container
  - New Chat: Header + empty area + input skeletons in sidebar layout
  - Existing Chat: Header + message bubbles + input skeletons in sidebar layout
  - Sidebar: Skeleton sidebar with fade-in animation, independent of page content
  - Votes: Invisible, non-blocking — chat is interactive before votes load
