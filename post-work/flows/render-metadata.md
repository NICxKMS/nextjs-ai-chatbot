FLOW: generateMetadata
ENTRY: Next.js calls `generateMetadata` for route segments during server rendering

STEPS:
  1. **Root Layout metadata** (`app/layout.tsx` — static export):
     ```ts
     export const metadata: Metadata = {
       title: "ai-assistant",
       description: "AI assistant powered by the AI SDK.",
       openGraph: {
         title: "ai-assistant",
         description: "AI assistant powered by the AI SDK.",
         type: "website",
       },
     }
     export const viewport: Viewport = {
       width: "device-width",
       initialScale: 1,
     }
     ```
     → Static — no async, no data fetching. Always available.

  2. **Auth layout metadata** (`app/(auth)/layout.tsx` — static export):
     ```ts
     export const metadata: Metadata = {
       title: "Authentication",
       description: "Sign in or create an account.",
     }
     ```
     → Static. Overridden by child pages. No title template.

  3. **Auth page metadata** (static exports):
     - `app/(auth)/login/page.tsx`: `{ title: "Sign In" }`
     - `app/(auth)/register/page.tsx`: `{ title: "Sign Up" }`
     → These replace the auth layout title. Final `<title>`: "Sign In" / "Sign Up"

  4. **Chat layout metadata** (`app/(chat)/layout.tsx` — static export with template):
     ```ts
     export const metadata: Metadata = {
       title: {
         template: "%s | ai-assistant",
         default: "ai-assistant",
       },
     }
     ```
     → Template: child page titles get `" | ai-assistant"` appended
     → Default: "ai-assistant" if no child provides a title

  5. **New Chat page metadata** (`app/(chat)/page.tsx` — static export):
     ```ts
     export const metadata: Metadata = {
       title: "New Chat",
     }
     ```
     → Combined with template: `<title>New Chat | ai-assistant</title>`
     → Static — no data fetching delay

  6. **Existing Chat page metadata** (`app/(chat)/chat/[id]/page.tsx` — async generateMetadata):
     ```ts
     export async function generateMetadata({
       params,
     }: {
       params: Promise<{ id: string }>
     }): Promise<Metadata> {
       const { id } = await params
       const { chat } = await getChatPageState(id)
       return { title: chat?.title ?? "Chat" }
     }
     ```
     → `getChatPageState(id)` — `React.cache`-wrapped:
       - `Promise.all([getAppSession(), getCachedChat(chatId)])`
       - getAppSession: cookies → Supabase getUser() → guest JWT
       - getCachedChat: `'use cache'` + `cacheLife('seconds')` → DB lookup
       - getVisibleChat: access control (null if private + wrong user)
     → If chat found: `<title>{chat.title} | ai-assistant</title>`
     → If not found: `<title>Chat | ai-assistant</title>` (then page.tsx calls notFound())
     → Combined with template: `<title>{title} | ai-assistant</title>`

TIMING RELATIVE TO PAGE DATA FETCHING:
  ```
  ┌─ generateMetadata() ──────────────────────────────┐
  │  await params                                      │
  │  getChatPageState(id) ← React.cache★              │ ← SHARES cache with page.tsx
  │    ├── getAppSession()                             │
  │    └── getCachedChat(chatId)                       │
  │  return { title }                                  │
  └────────────────────────────────────────────────────┘
                    ★ Same React.cache key
  ┌─ ExistingChatPage() ──────────────────────────────┐
  │  await params                                      │
  │  getChatPageState(chatId) ← React.cache★ (cache hit) │
  │  [...message + model fetching...]                  │
  └────────────────────────────────────────────────────┘
  ```

  → Next.js calls `generateMetadata` and the page component in the same server request
  → `React.cache` on `getChatPageState` ensures the session + chat fetch runs ONCE
  → `generateMetadata` may run first (for <head> streaming), page uses the cached result
  → For static metadata (new chat, auth pages), there's ZERO data fetching overhead

METADATA RESOLUTION ORDER (per Next.js docs):
  1. Root layout metadata (base)
  2. Route group layout metadata (overrides/extends)
  3. Page metadata or generateMetadata (final overrides)
  → Deeper segments override shallower ones
  → `title.template` from layouts wraps page-level `title` strings

ALL METADATA SOURCES:
  | Route                       | Type     | Title                              | Description                           |
  |-----------------------------|----------|------------------------------------|---------------------------------------|
  | `app/layout.tsx`            | static   | "ai-assistant"                     | "AI assistant powered by the AI SDK." |
  | `app/(auth)/layout.tsx`     | static   | "Authentication"                   | "Sign in or create an account."       |
  | `app/(auth)/login/page.tsx` | static   | "Sign In"                          | (inherits from layout)                |
  | `app/(auth)/register/page.tsx` | static | "Sign Up"                          | (inherits from layout)                |
  | `app/(chat)/layout.tsx`     | static   | template: "%s \| ai-assistant"     | (inherits from root)                  |
  | `app/(chat)/page.tsx`       | static   | "New Chat" → "New Chat \| ai-assistant" | (inherits from root)            |
  | `app/(chat)/chat/[id]/page.tsx` | async | `chat.title \| "Chat"` → `"{title} \| ai-assistant"` | (inherits from root) |

BOTTLENECKS:
  - **Existing chat generateMetadata** requires `getAppSession()` + `getCachedChat()` — both async with potential network calls. This delays `<head>` streaming until session + chat are resolved.
  - On cold cache for `getCachedChat`, a DB round-trip is required before the title is known.
  - `await params` is necessary in Next.js 16 (params are async) — slight overhead to unwrap.

WASTE:
  - `generateMetadata` runs `getChatPageState` which includes `getVisibleChat` access control — but metadata doesn't need to enforce access control. The page will call `notFound()` anyway. However, without the access check, metadata could leak a private chat title in the HTML `<title>`. So the access check is actually necessary for security. Not waste.
  - For the `"Chat"` fallback title (when chat is null/inaccessible), the full session + chat fetch still runs. A lighter check could be used, but `React.cache` means the page reuses this work.

SIMPLIFICATION OPPORTUNITIES:
  - Auth layout metadata is always overridden by child pages — the layout's `title: "Authentication"` never reaches the browser. Could be removed, but it serves as documentation intent.
  - The `generateMetadata` pattern with `React.cache(getChatPageState)` is elegant and efficient — no obvious simplification.

EXIT: Correct `<title>` and `<meta>` tags are in the `<head>` before page content streams. For existing chats, the title shows the chat's name; for new chats, "New Chat | ai-assistant".
