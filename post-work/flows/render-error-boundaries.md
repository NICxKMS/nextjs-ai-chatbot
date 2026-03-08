FLOW: Error Boundaries
ENTRY: Runtime error thrown during render, data fetch, or server action

STEPS:

  1. **Error boundary hierarchy** (outermost → innermost):

     ```
     app/global-error.tsx           ← Catches root layout failures
     └── app/layout.tsx             ← Root layout (no error.tsx at this level)
         ├── app/(auth)/error.tsx   ← Catches auth route group errors
         │   └── app/(auth)/layout.tsx
         │       └── login/page.tsx or register/page.tsx
         └── app/(chat)/error.tsx   ← Catches chat route group errors
             └── app/(chat)/layout.tsx
                 └── page.tsx or chat/[id]/page.tsx
     ```

  2. **`app/global-error.tsx`** (Global Error Boundary):
     → Directive: `"use client"`
     → Catches: Errors that crash the ROOT LAYOUT (`app/layout.tsx`)
     → Replaces: The ENTIRE page including `<html>` and `<body>` tags
     → Renders its own `<html><body>` since the root layout is unavailable
     → Uses INLINE STYLES (no Tailwind/CSS — stylesheets may be unavailable)
     → Style constants: PAGE_STYLE, LABEL_STYLE, TITLE_STYLE, BODY_STYLE, DIGEST_STYLE, ACTION_ROW_STYLE, LINK_STYLE, BUTTON_STYLE
     → Content:
       - "ai-assistant" label
       - "Something went wrong" title
       - "A critical error occurred" description
       - Error digest (if available): `error.digest`
       - Two actions: "Go Home" (`<a href="/">`) and "Try Again" (`<button onClick={reset}>`)
     → `useEffect` logs: `console.error("Global error:", error.digest ?? error.message)`
     → NOTE: Uses `<a href="/">` instead of Next.js `<Link>` — avoids client-side routing when app is in error state

  3. **`app/(auth)/error.tsx`** (Auth Error Boundary):
     → Directive: `"use client"`
     → Catches: Errors in `(auth)/login/page.tsx`, `(auth)/register/page.tsx`, and the AuthGuard in `(auth)/layout.tsx`
     → Does NOT catch: Errors in the auth layout itself (those go to global-error)
     → Renders within: The auth layout's centered container (inherits the `min-h-svh items-center justify-center` wrapper)
     → Content:
       - "Something went wrong" (text-2xl)
       - "An error occurred during authentication. Please try again."
       - Error digest display (if present)
       - Two buttons: "Try Again" (reset, variant="default") and "Go Home" (Link to "/", variant="outline")
     → Uses Tailwind classes (inherits root layout CSS)
     → `useEffect` logs: `console.error("Auth error:", error.digest ?? error.message)`

  4. **`app/(chat)/error.tsx`** (Chat Error Boundary):
     → Directive: `"use client"`
     → Catches: Errors in `(chat)/page.tsx`, `(chat)/chat/[id]/page.tsx`, and their children
     → Does NOT catch: Errors in the chat layout itself (those go to global-error)
     → Renders within: The chat layout, PRESERVING THE SIDEBAR for navigation
       - Error replaces only the `SidebarInset` children
       - User can still navigate via sidebar
     → Content: Full-height centered error card
       - "Something went wrong" (text-xl)
       - "An error occurred while loading this chat. You can try again or return to the home page."
       - Error digest display (if present)
       - Two buttons: "Go Home" (Link to "/", variant="outline") and "Try Again" (reset)
     → `useEffect` logs: `console.error("Chat error:", error.digest ?? error.message)`

  5. **What each boundary catches vs. what falls through**:

     | Error Source                          | Caught By            | Falls Through To     |
     |---------------------------------------|----------------------|----------------------|
     | Root layout (ThemeProvider, etc.)      | global-error.tsx     | N/A (top level)      |
     | Auth layout (AuthGuard crash)          | (auth)/error.tsx     | global-error.tsx     |
     | Login/Register page render             | (auth)/error.tsx     | global-error.tsx     |
     | Auth Server Action (login/register)    | Handled by useActionState | (auth)/error.tsx |
     | Chat layout (ChatLayout)               | (chat)/error.tsx     | global-error.tsx     |
     | Chat page data fetch (notFound)        | Next.js not-found.tsx| N/A                  |
     | Chat page render error                 | (chat)/error.tsx     | global-error.tsx     |
     | ChatShell client component crash       | (chat)/error.tsx     | global-error.tsx     |
     | SidebarShell render error              | (chat)/error.tsx     | global-error.tsx     |
     | ArtifactPanel render error             | (chat)/error.tsx     | global-error.tsx     |
     | StreamBridge / useChat error           | toast.error() + ChatShell handles | (chat)/error.tsx |
     | Supabase auth network failure          | getAppSession() returns null | No crash    |
     | Server Action failure                  | ActionResult.success=false | Toast/UI error |

  6. **`app/not-found.tsx`** (404 Page — NOT an error boundary):
     → Server Component (no "use client")
     → Triggered by: `notFound()` call in page.tsx, or unmatched routes
     → Renders within the ROOT LAYOUT (has ThemeProvider, Tailwind classes)
     → Content:
       - "ai-assistant" label
       - "Page not found" title
       - "The page you're looking for doesn't exist or has been moved."
       - "Go Home" button (Link to "/")
     → Uses `Button` component with `variant="outline"`

  7. **Suspense error handling** (NOT error boundaries, but related):
     → If a Suspense-wrapped async component throws:
       - The Suspense boundary DOES NOT catch the error
       - The error propagates to the nearest error.tsx boundary
       - For example: if SidebarShell throws inside its Suspense, the error goes to (chat)/error.tsx
     → Suspense only handles the "loading" state, not errors

  8. **Server Action error handling** (across all boundaries):
     → Auth actions (login, register): Return `ActionResult` → handled by `useActionState` in AuthForm
     → Chat actions (deleteChat, deleteTrailingMessages, updateChatVisibility):
       - Return `ActionResult` with success/error
       - Callers check `result.success` and show toast on failure
       - Do NOT throw — error boundaries are NOT triggered by action failures
     → This is intentional: Server Action errors are expected/recoverable, not crashes

  9. **Stream error handling** (chat route):
     → `useChat.onError(err)` → `toast.error(msg)` — shows transient error notification
     → `data-error` data part → `toast.error(data)` — server-pushed error messages
     → These do NOT trigger error boundaries — they're user-facing error messages
     → For unrecoverable stream errors: useChat sets `error` state, `clearError` available

SEGMENTS WITH error.tsx:
  | Segment      | File                  | Catches                                    |
  |--------------|-----------------------|--------------------------------------------|
  | Root         | `global-error.tsx`    | Root layout crashes (replaces entire DOM)   |
  | (auth)       | `(auth)/error.tsx`    | Auth page/guard errors (preserves centering)|
  | (chat)       | `(chat)/error.tsx`    | Chat page errors (preserves sidebar)        |

SEGMENTS WITHOUT error.tsx:
  | Segment               | What happens on error                        |
  |-----------------------|----------------------------------------------|
  | `(chat)/chat/[id]`    | Bubbles to `(chat)/error.tsx`                |
  | `(auth)/login`        | Bubbles to `(auth)/error.tsx`                |
  | `(auth)/register`     | Bubbles to `(auth)/error.tsx`                |

BOTTLENECKS:
  - **Global error boundary is "use client"**: It re-renders the entire page with no server components — loses all server-side context. The "Go Home" link uses a full `<a>` tag navigation, not client-side routing.
  - **Chat error boundary preserves sidebar** but replaces ALL page content — if the error is in a single message component, the entire chat view is lost.

WASTE:
  - All three error boundaries log to `console.error` via `useEffect` — in production, these should be sent to an error tracking service (Sentry, etc.), not just console.
  - The `error.digest` field is displayed to the user in all three boundaries — this is useful for support but may confuse end users.

SIMPLIFICATION OPPORTUNITIES:
  - Auth and Chat error boundaries share identical structure (title + description + digest + two buttons). A shared `ErrorFallback` component could DRY them up, parameterized by title/description text.
  - The `reset` function behavior differs between boundaries: in auth it retries the auth guard + page, in chat it retries the page data fetch. This is correct but not obvious — documenting reset scope would help.
  - `global-error.tsx` uses inline CSSProperties constants defined at module level — these could be a single style object to reduce variable count.

EXIT: User sees a contextually appropriate error page:
  - Global: Full-screen white page with inline styles
  - Auth: Centered card within auth container
  - Chat: Full-height centered message within sidebar layout (sidebar preserved)
  - 404: Centered card with "Go Home" button within root layout
