# Architecture

The rebuilt app uses a root-level, feature-collocated architecture. `app/` owns routing and server composition. `features/` owns product behavior. `components/` owns shared UI primitives. `lib/` owns infrastructure and shared contracts.

## Layer Model

```text
app/          routes, layouts, pages, route handlers, server composition
features/     chat, artifacts, auth, sidebar, voting, models, visibility, settings
components/   shared UI primitives and generated AI elements
lib/          db, data, auth, cache, ai, errors, shared types, utilities
```

## Directory Structure

```text
app/
  layout.tsx
  globals.css
  global-error.tsx
  (auth)/
    layout.tsx
    login/page.tsx
    register/page.tsx
    error.tsx
  (chat)/
    layout.tsx
    loading.tsx
    error.tsx
    page.tsx
    chat/[id]/page.tsx
  api/
    chat/route.ts
    artifact/route.ts
    files/upload/route.ts
    history/route.ts
    suggestions/route.ts
    health/route.ts

features/
  chat/
  artifacts/
  auth/
  sidebar/
  voting/
  models/
  visibility/
  settings/

components/
  ui/
  ai-elements/
  theme-provider.tsx
  icons.tsx
  sidebar-toggle.tsx
  toaster.tsx
  weather.tsx

lib/
  ai/
  auth/
  cache/
  data/
  db/
  errors/
  types/
  utils/
  hooks/

proxy.ts
instrumentation.ts
instrumentation-client.ts
next.config.ts
biome.json
tsconfig.json
package.json
```

## Import Rules

| Source | May import | Must not import |
|---|---|---|
| `app/` | `features/*`, `components/*`, `lib/*` | Feature internals not needed by routing |
| `features/*` | `components/*`, `lib/*`, own feature files | Other feature components, hooks, actions, lib internals |
| `features/X` | `lib/types/*` for cross-feature contracts | `features/Y/components/*`, `features/Y/hooks/*`, `features/Y/actions/*` |
| `components/*` | `lib/*`, external packages | `features/*`, `app/*` |
| `lib/*` | External packages only, sibling `lib/*` files | `app/*`, `features/*`, `components/*` |

The declared exception is `StreamBridge` reading the artifact store public API. If that becomes painful, elevate the store to `lib/`, but do not spread feature-to-feature imports.

## Feature Module Shape

```text
features/[feature]/
  actions/       Server Actions owned by the feature
  components/    UI components, server or client as needed
  hooks/         client hooks and context helpers
  lib/           feature-specific pure functions and tools
  schemas/       Zod schemas
  types/         feature-local TypeScript types
  handlers/      artifact handlers only where needed
```

Use direct imports. Do not create barrel files by default. The main exception is `features/artifacts/handlers/index.ts`, which exists as a side-effect registration module.

## Server Components and Client Islands

Server is the default. Use `'use client'` only when a component needs browser APIs, React state, effects, event handlers, context consumption, or hooks that require those capabilities.

| Component area | Boundary |
|---|---|
| Root layout | Server, wraps client providers |
| Auth layout and pages | Server, render `AuthForm` client island |
| Chat layout | Server, reads session and cookies, renders sidebar shell and providers |
| Chat pages | Server, fetch chat, votes, models, render page-scoped providers |
| ChatShell | Client, thin context orchestrator |
| StreamBridge | Client, null-render bridge from stream parts to artifact store |
| SidebarShell | Server, fetches first page of history |
| SidebarHistoryClient | Client, pagination and menu interactions |
| ArtifactPanel and editors | Client, interactive editor and store subscribers |

## Provider Topology

Providers are scoped by who consumes them. High-frequency state stays low in the tree.

```text
Root layout, server
  ThemeProvider, client, app-wide
    SessionProvider, client, app-wide
      route group layouts

Chat layout, server
  NoticeHandler, client island
  Pyodide script, lazy
  PendingChatsProvider, client, chat layout only
    SidebarProvider, client, chat layout only
      SidebarShell, server in Suspense
      SidebarInset
        page children

Chat page, server
  ChatStreamProvider, client, page only
    ChatShell, client, creates ChatSessionContext inline
    StreamBridge, client
    optional VoteResolver in Suspense
```

## State Placement Rules

| State | Owner | Pattern | Scope |
|---|---|---|---|
| Chat messages, input, status | AI SDK `useChat` through `useChatSession` | Hook state | `ChatShell` |
| Chat session value | `ChatSessionContext` | React context | `ChatShell` subtree |
| Stream data parts | `ChatStreamProvider` | Split contexts plus RAF batching | Chat page |
| Artifact UI state | `artifactStore` | `useSyncExternalStore` | Module store |
| Settings | `settingsStore` | `useSyncExternalStore` plus localStorage | Module store |
| Pending chats | `PendingChatsProvider` | React context | Chat layout |
| Votes | Voting feature | React 19 optimistic state | Per chat/message |
| Visibility | Visibility feature plus ChatSessionContext mirror | React 19 optimistic state | Per chat |
| Model selection | Models feature | Cookie plus localStorage | Per browser/session |

## Request Interception

`proxy.ts` is the single interception layer. It handles public route checks, guest JWT minting and rotation, auth redirects, request headers such as device type, and lightweight Redis-backed abuse throttling. It must not perform database queries.

## Architecture Decisions

| Decision | Reason |
|---|---|
| Root-level folders instead of `src/` | Matches project convention and path alias `@/*` to root |
| Server layouts with client islands | Keeps routing shells lightweight and avoids layout-wide hydration |
| Feature collocation | Keeps behavior, schemas, actions, and UI near their domain |
| Handler registry in `lib/ai` | Lets chat tools depend on interfaces, not artifact implementation files |
| `useSyncExternalStore` for artifact and settings state | Avoids provider churn and lets selectors limit re-renders |
| Route Handlers for stream/upload/GET APIs | These surfaces are not simple user-triggered form mutations |
| Server Actions for user mutations | Enables `updateTag` and direct form/action composition |
