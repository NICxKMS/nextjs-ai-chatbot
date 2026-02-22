# UI Parity Checklist 1: Screens and Layout Shell

Purpose: enumerate route/screen parity requirements with traceability to `oldapp`.

## Reasoning
- Route-level files define first impressions, fallback behavior, and shell composition; these must be cataloged before component-level parity.
- Multiple states are progressive (`Suspense`, loading pages, error boundaries), so parity requires sequence-accurate behavior, not only static visuals.

## A. Global App Shell

### A1. Root Layout and Providers
- **Source:** `oldapp/app/layout.tsx`, `oldapp/components/auth-provider.tsx`, `oldapp/components/theme-provider.tsx`.
- **Visual/structure parity**
  - Full-viewport app shell with antialiased body and app-wide theme variables.
  - Global top-center toaster layer.
  - Tooltip behavior globally enabled with zero delay.
  - Document head network hints preserve preconnect/dns-prefetch policy for Pyodide CDN, Vercel analytics/insights, and configured provider/weather domains.
- **Interaction/state parity**
  - App shell renders loading spinner fallback while async shell data resolves.
  - Auth bootstraps guest session when no session exists; status transitions must not flash incorrect auth UI.
  - Theme toggling changes class and runtime `theme-color` meta tag.
- **Responsive parity**
  - Must preserve `h-dvh` usage and mobile Safari zoom suppression (`maximumScale: 1` viewport).
- **A11y + keyboard parity**
  - Loading fallback text present ("Loading..."), not spinner-only.
  - Global error uses generic error page fallback.
- **Animation/progressive rendering parity**
  - Suspense fallback appears before providers hydrate.

### A2. Global Error Surface
- **Source:** `oldapp/app/global-error.tsx`.
- **Parity requirements**
  - Replace app UI with full HTML/body error page on uncaught route-level exceptions.
  - Generic error messaging via Next default error component; no sensitive detail exposure.

## B. Chat Route Group

### B1. Chat Layout Container
- **Source:** `oldapp/app/(chat)/layout.tsx`, `oldapp/app/(chat)/chat-layout-client.tsx`.
- **Visual/structure parity**
  - Sidebar + main inset split layout.
  - Sidebar loads lazily with skeleton fallback.
  - Centered loader in content area while children suspense.
- **Interaction/state parity**
  - Query notices map to toast warnings/errors and are removed from URL after display.
  - Providers wrap chat routes: settings store, data stream, optimistic chats.
- **Responsive parity**
  - Sidebar switches to mobile sheet behavior under `<768px`.
- **A11y parity**
  - Loader fallback must remain readable and discoverable.

### B2. New Chat Screen (`/`)
- **Source:** `oldapp/app/(chat)/page.tsx`, `oldapp/components/chat.tsx`, `oldapp/components/messages.tsx`, `oldapp/components/greeting.tsx`.
- **Visual/structure parity**
  - Header row (sidebar toggle/new chat/visibility/settings).
  - Empty-state greeting section with staged entrance.
  - Sticky bottom composer.
- **States**
  - Empty: greeting + suggested actions visible.
  - Submitted: thinking placeholder appears.
  - Streaming: assistant message live updates.
  - Error: inline retry panel in timeline footer.
  - Query-prefill startup can auto-submit an initial user message once and then clear route query state.
  - Provider billing failure path surfaces activation dialog before retrying generation.
  - Readonly off (new chat) -> composer enabled.
- **Animation parity**
  - Greeting and suggestions animate in with slight delays.
  - Thinking block fades in/out.

### B3. Existing Chat Screen (`/chat/[id]`)
- **Source:** `oldapp/app/(chat)/chat/[id]/page.tsx`.
- **Visual/structure parity**
  - Same shell as new chat but prepopulated with history and vote state.
- **States**
  - Private unauthorized or missing chat -> redirect to `/` with notice and toast.
  - Readonly mode enabled when viewer is not owner (composer hidden, restricted artifact actions).
  - Votes preloaded server-side for eligible sessions.

### B4. Chat Loading and Error Routes
- **Source:** `oldapp/app/(chat)/loading.tsx`, `oldapp/app/(chat)/chat/[id]/loading.tsx`, `oldapp/app/(chat)/error.tsx`.
- **Loading parity**
  - Full-screen centered spinner + descriptive text (two variants: "Loading chat..." and "Loading conversation...").
- **Error parity**
  - Centered recovery panel with headline, short explanatory body, optional digest ID.
  - Two actions: `Go Home` and `Try Again`.

## C. Auth Screens

### C1. Login Screen (`/login`)
- **Source:** `oldapp/app/(auth)/login/page.tsx`, `oldapp/components/auth-form.tsx`, `oldapp/components/submit-button.tsx`, `oldapp/components/toast.tsx`.
- **Visual/structure parity**
  - Centered auth card-like column with title, subtitle, two labeled fields, submit button, and sign-up link.
  - Top-aligned on small screens, vertically centered on md+.
- **States**
  - Pending submit: button disabled with spinner.
  - Success: immediate redirect to `/`.
  - Existing signed-in regular session reaching `/login` redirects to `/`.
  - Invalid input / invalid credentials / session exchange failure: error toast copy.
- **A11y parity**
  - Email and password labels linked via `htmlFor`.
  - Live-region output in submit button reports loading state.

### C2. Register Screen (`/register`)
- **Source:** `oldapp/app/(auth)/register/page.tsx`.
- **Parity requirements**
  - Mirrors login layout and control structure.
  - Existing signed-in regular session reaching `/register` redirects to `/`.
  - Distinct async outcomes:
    - Account created with email confirmation required -> success toast + redirect to login.
    - Account + session exchange success -> success toast + redirect home.
    - Any error path -> error toast.

## D. Cross-Screen Responsive and Accessibility Baseline
- **Source:** `oldapp/app/globals.css`, `oldapp/components/ui/sidebar.tsx`, `oldapp/hooks/use-mobile.ts`, `oldapp/hooks/use-window-size.ts`.
- **Responsive parity**
  - Mobile breakpoint centered on `768px`.
  - Desktop sidebar persistence + collapsed/icon modes.
  - Mobile sidebar rendered as sheet drawer.
- **A11y/keyboard parity**
  - Sidebar keyboard shortcut `Ctrl/Cmd+B`.
  - Screen-reader labels exist for icon-only actions (sidebar toggle, branch nav, remove attachment).
  - Form Enter/Shift+Enter behavior preserved in composer and auth.

## Unknowns Requiring Confirmation
- `oldapp/app/(chat)/layout.tsx` passes `initialSidebarOpen`/`initialIsMobile` props, but `chat-layout-client.tsx` currently does not consume them; likely drift between revisions.
- Some imported modules appear absent under `oldapp/components/elements` (`response`, `actions`). Need confirmation whether these are external package aliases or omitted files.

## Conclusions
- Route parity is heavily state-sequenced; preserving transitions between loading, redirect-notice, streaming, and recovery states is mandatory for UX equivalence.
- Keyboard and mobile sidebar behavior should be treated as acceptance criteria, not enhancements.
