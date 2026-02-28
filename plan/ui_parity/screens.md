# Screens & Routes — UI Parity Reference

## Route Map

| Route | Page File | Layout Chain |
|-------|-----------|--------------|
| `/` | `app/(chat)/page.tsx` | Root → Chat Layout |
| `/chat/[id]` | `app/(chat)/chat/[id]/page.tsx` | Root → Chat Layout |
| `/login` | `app/(auth)/login/page.tsx` | Root only |
| `/register` | `app/(auth)/register/page.tsx` | Root only |
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
5. `<Suspense fallback={<AppShellFallback />}>`
6. `<AppShell>` (async — fetches session via `getAppSession()`)
   - `<ThemeProvider>` (next-themes, attribute="class", system enabled)
   - `<TooltipProvider delayDuration={0}>`
   - `<Toaster position="top-center" />` (sonner)
   - `<SWRConfig>` (dedupingInterval=10s, no focus/reconnect revalidation)
   - `<AuthProvider initialSession={...}>`

**Loading Fallback (`AppShellFallback`):**
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

**Type:** Server Component (async)

**Server-side data fetched:**
- `headers()` → `x-device-type` for mobile detection
- `cookies()` → `sidebar_state` for initial sidebar open/closed

**Renders:** `<ChatLayoutClient>` passing `initialIsMobile` and `initialSidebarOpen`

---

### 3. Chat Layout Client (`app/(chat)/chat-layout-client.tsx`)

**Type:** Client Component (`"use client"`)

**Provider Stack (outer → inner):**
1. `<Script src="pyodide.js" strategy="lazyOnload" />` — Python runtime for code artifacts
2. `<SettingsProvider>` — localStorage-backed sampling/system-prompt/behavior settings
3. `<DataStreamProvider>` — split context (state + dispatch) for AI data stream
4. `<OptimisticChatsProvider>` — optimistic sidebar chat entries
5. `<SidebarProvider defaultOpen={true}>`
6. `<Suspense fallback={<SidebarSkeleton />}>` → `<AppSidebar>` (dynamic, ssr=false)
7. `<SidebarInset>` → `<Suspense fallback={<Loader />}>` → `{children}`

**Notice Handling:**
- Reads `?notice=` from URL search params
- `chat_not_found` → warning toast
- `user_not_found` → error toast
- Cleans query param via `history.replaceState` to prevent repeat toasts

---

## Screen: Home / New Chat (`/`)

**Page Type:** Server Component (async)

**Server-side data:**
- `cookies()` → `chat-model` cookie for persisted model preference
- `listChatModels()` → available models from registry
- `generateUUID()` → new chat ID

**Renders:**
```
<Chat
  id={newUUID}
  initialMessages={[]}
  initialChatModel={fromCookieOrDefault}
  initialVisibilityType="private"
  initialVotes={[]}
  isReadonly={false}
  availableModels={...}
/>
<DataStreamHandler />
```

**Visual States:**
- **Empty state:** Greeting component ("Hello there! How can I help you today?") + SuggestedActions grid (4 items, 2-col on sm+)
- **After first message:** URL changes to `/chat/{id}` via `history.replaceState`

**Auth Variants:**
- Guest: Full chat functionality, limited history
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
- Chat not found → redirect `/?notice=chat_not_found`
- Private chat + not owner → redirect `/?notice=chat_not_found`

**Renders:**
```
<Chat
  id={chat.id}
  initialMessages={uiMessages}
  initialChatModel={chat.lastContext?.modelId || DEFAULT}
  initialVisibilityType={chat.visibility}
  initialVotes={votes}
  isReadonly={session.user.id !== chat.userId}
  initialLastContext={chat.lastContext}
  availableModels={...}
/>
<DataStreamHandler />
```

**Loading State (`loading.tsx`):**
- Centered column: spinning border circle + "Loading conversation..."
- `h-dvh w-full`

---

## Screen: Login (`/login`)

**Type:** Client Component (`"use client"`)

**Layout:**
- `h-dvh w-screen bg-background`
- Centered `max-w-md` card, rounded-2xl
- Heading: "Sign In"
- Subtext: "Use your email and password to sign in"

**Form:**
- `<AuthForm>` component with email + password fields
- `<SubmitButton>` with loading spinner
- Link to `/register`

**Flow:**
1. Supabase `signInWithPassword`
2. Exchange access token via `/api/auth/exchange`
3. On success: redirect `/` with router.refresh()
4. On error: toast notification

**Mobile Behavior:**
- `items-start pt-12` on mobile
- `items-center pt-0` on desktop (md+)

---

## Screen: Register (`/register`)

**Type:** Client Component (`"use client"`)

**Layout:** Same as login with different heading/CTA

**Form:**
- Same `<AuthForm>` structure
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
