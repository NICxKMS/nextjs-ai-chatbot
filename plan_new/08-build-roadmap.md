# Build Roadmap

This is a design roadmap, not a task log. It preserves the phase order, critical dependencies, and architectural gates needed to build the new app cleanly.

## Critical Path

```text
Phase 0 Scaffold
  -> Phase 1 Data foundation
    -> Phase 2 Auth
      -> Phase 3 Chat core
        -> Phase 4 Artifacts
          -> Phase 5 Sidebar and navigation
            -> Phase 6 Enhancements
              -> Phase 7 Polish and production readiness
```

Sidebar setup can begin after the chat layout stub exists, but the full sidebar depends on chat history data access and pending chat integration. Artifact UI depends on the chat stream bridge and handler registry.

## Phase 0: Scaffold And Infrastructure

Goal: create the root-level app skeleton, shared types, UI primitives, error utilities, proxy, and import boundary enforcement.

Key outputs:

| Area | Design requirement |
|---|---|
| Config | `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json`, PostCSS, Tailwind v4 |
| Root app | `app/layout.tsx`, `app/globals.css`, `app/global-error.tsx` |
| Proxy | `proxy.ts` with auth guard, guest token rotation, rate-limit check |
| DB | Drizzle schema with `Artifact`, not `Document` |
| Types | Result, session context, model, artifact, handler, settings, pending chat types |
| Errors | `AppError` and error code registry without gateway or credit codes |
| Shared UI | `components/ui/*`, theme provider, icons, toaster, sidebar toggle |
| Boundaries | `scripts/check-imports.mjs` or equivalent enforcement |

Exit design gate: project structure exists, import rules are enforceable, root layout is server-rendered, and artifact naming is present from the schema upward.

## Phase 1: Data Foundation

Goal: implement database, cache, data access, and AI provider foundation before UI features depend on them.

Key outputs:

| Area | Design requirement |
|---|---|
| DB migrations | Drizzle migration configuration and generated migrations |
| Cache | Upstash Redis client, cache key factory, cache-through helper |
| Revalidation | `invalidate*` wrappers for Server Actions and `refresh*` wrappers for Route Handlers |
| Data access | User, chat, message, artifact, vote, and suggestion modules |
| AI foundation | Provider registry, `myProvider`, model type constants |

Exit design gate: all data access functions use the new entity names, cache tags are defined, and provider registry excludes gateway logic.

## Phase 2: Auth Vertical

Goal: deliver complete Supabase plus guest JWT authentication.

Key outputs:

| Area | Design requirement |
|---|---|
| Session | `getAppSession()` resolves Supabase then guest JWT |
| Guest | Guest JWT creation, same-request forwarding, rotation near expiry |
| Actions | `login`, `register`, `logout` as Server Actions |
| UI | Auth layout, login page, register page, `AuthForm` |
| Root integration | `SessionProvider` receives server-fetched session |
| Proxy integration | Public route, guest-eligible route, and auth-required policies |

Exit design gate: both registered and guest users resolve to `AppSession`, auth forms use Server Actions, and guest users can enter the chat route.

## Phase 3: Chat Core

Goal: deliver the core chat surface, streaming route, settings, model selection foundation, and stream bridge.

Key outputs:

| Area | Design requirement |
|---|---|
| Model catalog | `getAvailableModels()`, default model resolution, model metadata |
| Prompts | Prompt composition with settings, reasoning, artifacts prompt |
| Registry | `lib/ai/artifact-handlers.ts` created before tools consume it |
| Chat state | `ChatSessionContext`, `useChatSession`, `useChatSideEffects` |
| Streaming | `ChatStreamProvider` with split contexts and RAF batching |
| UI | ChatShell, ChatHeader, Messages, Message, MultimodalInput, SuggestedActions |
| Bridge | `StreamBridge` and pure `processStreamDelta` |
| Actions | Delete chat, delete all chats, delete trailing messages |
| API | `POST /api/chat` with stream, tools, title, persistence, revalidation |
| Pages | New chat page and existing chat page with server fetching |

Exit design gate: ChatShell remains thin, stream deltas reach the artifact store through the bridge, title delivery uses `chat-title`, and no polling or window events exist.

## Phase 4: Artifacts Vertical

Goal: deliver the full artifact system.

Key outputs:

| Area | Design requirement |
|---|---|
| Store | `artifactStore` with `useSyncExternalStore` and selectors |
| Handlers | Text, code, sheet, and image display support, with registration module |
| Editors | TipTap text, CodeMirror plus Pyodide code, react-data-grid sheet, image display |
| UI | ArtifactPanel, ArtifactActions, ArtifactCloseButton, VersionFooter, ArtifactPreview |
| Routes | `GET/POST /api/artifact`, `GET /api/suggestions` |
| Versioning | Composite `(id, createdAt)` model, save and restore flows |
| Suggestions | Stream and display inline text suggestions |

Exit design gate: handlers register through the registry, deltas follow append/replace rules, saves refresh `artifact:{id}`, and no document naming remains.

## Phase 5: Sidebar And Navigation

Goal: deliver server-rendered chat history, client pagination, pending chats, rename/delete flows, and user navigation.

Key outputs:

| Area | Design requirement |
|---|---|
| Pending chats | Provider with add, remove, updateTitle, markConfirmed |
| Server shell | `SidebarShell` fetches first page with `cacheTag('chats:{userId}')` |
| Client history | `SidebarHistoryClient` uses SWR infinite only for later pages |
| Item actions | Rename, visibility/share menu, delete confirmation |
| User nav | Theme toggle, login/logout behavior |
| API | `GET /api/history` cursor pagination |

Exit design gate: first sidebar page is server-fetched, title updates through `PendingChats.updateTitle`, and delete/rename mutations use Server Actions.

## Phase 6: Enhancements

Goal: add secondary features after chat, auth, artifacts, and sidebar are stable.

Key outputs:

| Area | Design requirement |
|---|---|
| Voting | Vote buttons, `voteOnMessage`, `useOptimistic`, `votes:{chatId}` invalidation |
| Visibility | Chat-level public/private selector and `updateChatVisibility` |
| Model selector | Header dropdown with cookie plus localStorage persistence |
| Files | Vercel Blob upload route and attachment previews |
| Weather | Weather tool result renderer |
| Health | DB and Redis health check endpoint |

Exit design gate: enhancements obey the same action/route split, auth/guest constraints, and cache revalidation rules.

## Phase 7: Polish And Production Readiness

Goal: finish reliability, accessibility, responsive behavior, instrumentation, tests, and build hygiene.

Key outputs:

| Area | Design requirement |
|---|---|
| Error boundaries | Root, auth, chat, and artifact boundaries with recovery paths |
| Accessibility | Labels, live regions, focus behavior, keyboard support, reduced motion, no zoom blocking |
| Responsive | Mobile sidebar overlay and mobile artifact full-screen panel |
| Instrumentation | Server and client instrumentation files |
| Tests | Unit, integration, and E2E coverage for auth, chat, artifacts, sidebar |
| Verification | Import boundaries, artifact naming, no credit/gateway logic, production build |

Exit design gate: the product can be built, navigated, and tested end to end without relying on deleted planning folders.

## Cross-Phase Guardrails

1. Do not introduce `src/`.
2. Do not introduce `middleware.ts`.
3. Do not add credit, gateway, quota purchase, or activation logic.
4. Do not use `document` names for artifact concepts.
5. Do not make route group layouts client components.
6. Do not use SWR as a client state store.
7. Do not use window events or polling for title delivery.
8. Do not skip cache invalidation after mutations.
9. Do not modify generated AI element primitives directly.
