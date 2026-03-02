# Screens & Routes — UI Parity Reference

> **Updated per redesign audit (2026-03-01)**

## Route Map

| Route | Page File | Layout Chain |
|-------|-----------|--------------|
| `/` | `app/(chat)/page.tsx` | Root → Chat Layout |
| `/chat/[id]` | `app/(chat)/chat/[id]/page.tsx` | Root → Chat Layout |
| `/login` | `app/(auth)/login/page.tsx` | Root → Auth Layout |
| `/register` | `app/(auth)/register/page.tsx` | Root → Auth Layout |
| Global Error | `app/global-error.tsx` | None (standalone) |

---

## Layout Hierarchy

### 1. Root Layout (`app/layout.tsx`)

**Type:** Server Component (async)

**Provider Stack (outer → inner):**
1. `<html>` with Geist + Geist_Mono font variables, `lang="en"`, `suppressHydrationWarning`
2. `<body className="antialiased">`
3. `<Script id="theme-color">` — inline theme-color meta sync (dark/light)
4. `<SpeedInsights />` + `<Analytics />` (Vercel)
5. `<ThemeProvider>` (next-themes, attribute="class", system enabled)
6. `<SessionProvider session={...}>` *(redesign: renamed from AuthProvider)*
7. `<Toaster position="top-center" />` (sonner)

> *(redesign: `<AppShell>` wrapper removed — providers placed directly in layout. `<SWRConfig>` removed from root — configured at point of use. `<TooltipProvider>` moved to point of consumption. `<Suspense>` + `<AppShellFallback>` no longer needed.)*

**Loading UI** *(redesign: `AppShellFallback` removed — no longer needed since providers are inlined in layout):*
- Full-viewport centered spinner
- `h-dvh w-full bg-background`
- Animated border spinner + "Loading..." text

**Fonts:**
- `Geist` (sans) — `--font-geist`
- `Geist_Mono` (mono) — `--font-geist-mono`

**Viewport:**
- `maximumScale: 1` — disables auto-zoom on mobile Safari

---

### 2. Chat Layout (`app/(chat)/layout.tsx`)

> *Redesign: Fully server-rendered. `ChatLayoutClient` eliminated. `SettingsProvider` removed (replaced by `useSettings` useSyncExternalStore). `DataStreamProvider` → `ChatStreamProvider` (moved to page-level). `OptimisticChatsProvider` → `PendingChatsProvider`. `AppSidebar` → `SidebarShell` (server component). Notice handling extracted to `NoticeHandler` client island.*

**Type:** Server Component (async)

**Server-side data fetched:**
- `cookies()` → `sidebar:state` for initial sidebar open/closed
- Session via `getAppSession()`

**Provider Stack (outer → inner):**
1. `<NoticeHandler />` — client island: reads `?notice=` from URL → toast *(redesign: extracted from layout to prevent client contamination)*
2. `<Script src="pyodide.js" strategy="lazyOnload" />` — Python runtime for code artifacts
3. `<PendingChatsProvider>` *(redesign: renamed from OptimisticChatsProvider)* — pending sidebar chat entries
4. `<SidebarProvider defaultOpen={sidebarOpen}>`
5. `<Suspense fallback={<SidebarSkeleton />}>` → `<SidebarShell />` *(redesign: server component, renamed from AppSidebar)*
6. `<SidebarInset>` → `{children}`

**Notice Handling** *(via NoticeHandler client island):*
- Reads `?notice=` from URL search params
- `chat_not_found` → warning toast
- `user_not_found` → error toast
- Cleans query param via `history.replaceState` to prevent repeat toasts

> *(redesign: `ChatLayoutClient` wrapper — REMOVED. Layout is now fully server-rendered. `SettingsProvider` removed — settings use `useSyncExternalStore` module-level store. `ChatStreamProvider` (formerly DataStreamProvider) moved to page-level to prevent high-frequency cascades to sidebar.)*

---

## Screen: Home / New Chat (`/`)

**Page Type:** Server Component (async)

**Server-side data:**
- `cookies()` → `chat-model` cookie for persisted model preference
- `listChatModels()` → available models from registry
- `generateUUID()` → new chat ID

**Renders:**
```
<ChatStreamProvider>
  <ChatShell
    id={newUUID}
    initialMessages={[]}
    initialChatModel={fromCookieOrDefault}
    isReadonly={false}
    availableModels={...}
  />
  <StreamBridge id={newUUID} />
</ChatStreamProvider>
```

> *(redesign: `Chat` → `ChatShell` (~60 lines, thin orchestrator). `DataStreamHandler` → `StreamBridge`. Wrapped in page-level `ChatStreamProvider`. `initialVisibilityType` and `initialVotes` removed from props.)*

**Visual States:**
- **Empty state:** Greeting component ("Hello there! How can I help you today?") + SuggestedActions grid (4 items, 2-col on sm+)
- **After first message:** URL changes to `/chat/{id}` via `history.replaceState`

**Auth Variants:**
- Guest: Full chat functionality with DB-backed history scoped to guest session
- Authenticated: Full chat + persistent history + voting

---

## Screen: Existing Chat (`/chat/[id]`)

**Page Type:** Server Component (async)

**Server-side data:**
- Session via `getAppSession()`
- Chat + messages via `chatData.getWithMessages(id, ctx)` (cache-first)
- Votes via `getVotesByChatIdAndUserId` (only if ≥2 messages and non-guest)
- Available models via `listChatModels()`
- Chat model from `chat.lastContext?.modelId`

**Access Control:**
- No session → redirect `/`
- Chat not found → `notFound()` (404)
- Private chat + not owner → `notFound()` (404)

**Renders:**
```
<ChatStreamProvider>
  <ChatShell
    id={chat.id}
    initialMessages={uiMessages}
    initialChatModel={chat.lastContext?.modelId || DEFAULT}
    isReadonly={session.user.id !== chat.userId}
    availableModels={...}
  />
  <StreamBridge id={chat.id} />
  <Suspense>
    <VoteResolver chatId={chat.id} votesPromise={votesPromise} />
  </Suspense>
</ChatStreamProvider>
```

> *(redesign: `Chat` → `ChatShell`. `DataStreamHandler` → `StreamBridge`. `VoteResolver` (redesign: renamed from VoteHydrator) defers vote loading via `<Suspense>`. `initialVisibilityType`, `initialVotes`, `initialLastContext` removed from props.)*

**Loading State (`loading.tsx`):**
- Centered column: spinning border circle + "Loading conversation..."
- `h-dvh w-full`

---

## Screen: Login (`/login`)

**Type:** Server Component

**Layout:**
- `h-dvh w-screen bg-background`
- Centered `max-w-md` card, rounded-2xl
- Heading: "Sign In"
- Subtext: "Use your email and password to sign in"

**Renders:**
- `<AuthForm>` (client component with `useActionState`) with `action={login}` server action
- `<SubmitButton>` with loading spinner
- Link to `/register`

**Flow:**
1. Supabase `signInWithPassword`
2. `AuthForm` uses `useActionState` to invoke `login` Server Action
3. On success: redirect `/` with router.refresh()
4. On error: toast notification

**Mobile Behavior:**
- `items-start pt-12` on mobile
- `items-center pt-0` on desktop (md+)

---

## Screen: Register (`/register`)

**Type:** Server Component

**Layout:** Same as login with different heading/CTA

**Renders:**
- `<AuthForm>` (client component with `useActionState`) with `action={register}` server action
- `<SubmitButton>` label: "Sign Up"
- Link to `/login`

**Flow:**
1. Supabase `signUp`
2. If no session (email confirmation required): toast success, redirect `/login`
3. If session (no email confirm): exchange token, redirect `/`

---

## Screen: Chat Error (`app/(chat)/error.tsx`)

**Type:** Client Component (error boundary)

**Layout:**
- `h-dvh w-full` centered
- Heading: "Something went wrong"
- Description text
- Error digest display (if available)
- Two buttons: "Go Home" (outline) + "Try Again" (default)

---

## Screen: Global Error (`app/global-error.tsx`)

**Type:** Client Component (root error boundary)

**Layout:**
- Standalone `<html><body>` wrapper
- `<NextError statusCode={0} />`
- Error digest logged to console.debug

---

## Screen: Chat Loading (`app/(chat)/loading.tsx`)

**Layout:**
- `h-dvh w-full` centered
- Spinner + "Loading chat..."
