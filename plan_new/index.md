# New App Design Documentation

This folder is the complete design documentation pack for the rebuilt app. It is intended to stand alone after the old planning folders are removed.

## Read In This Order

1. [`01-overview.md`](./01-overview.md) for product scope, stack, hard rules, and source precedence.
2. [`02-architecture.md`](./02-architecture.md) for layers, folders, import boundaries, providers, and server/client boundaries.
3. [`03-domain-model.md`](./03-domain-model.md) for feature ownership, public APIs, entities, cache tags, and naming rules.
4. [`04-data-flow-and-apis.md`](./04-data-flow-and-apis.md) for Route Handlers, Server Actions, request contracts, auth, rate limits, and revalidation.
5. [`05-chat-and-ai.md`](./05-chat-and-ai.md) for the chat lifecycle, streaming, model registry, prompts, settings, and tools.
6. [`06-artifacts.md`](./06-artifacts.md) for artifact state, handlers, editors, versioning, and suggestions.
7. [`07-ui-and-accessibility.md`](./07-ui-and-accessibility.md) for routes, layouts, interactions, loading states, errors, responsive rules, and accessibility.
8. [`08-build-roadmap.md`](./08-build-roadmap.md) for the phase design and critical path.
9. [`source-map.md`](./source-map.md) for provenance and explicit exclusions.

## Core Rules At A Glance

| Rule | Summary |
|---|---|
| Framework | Next.js 16 App Router, React 19, server components by default |
| Layout | Root-level `app/`, `features/`, `components/`, `lib/`, no `src/` |
| Proxy | Use `proxy.ts`, not `middleware.ts` |
| Mutations | Server Actions for user-triggered mutations |
| Streaming and files | Route Handlers for SSE, file upload, paginated GETs, health checks |
| Cache | `updateTag` in Server Actions, `revalidateTag(tag, 'max')` in Route Handlers |
| State | `ChatShell` plus `ChatSessionContext`, page-scoped `ChatStreamProvider`, `useSyncExternalStore` for artifacts and settings |
| AI | Provider registry, model catalog, current AI SDK project version, tool gating by model capability |
| Artifacts | Use artifact naming everywhere, with handler registry in `lib/ai/artifact-handlers.ts` |
| Removed logic | No credit, gateway, quota purchase, activation, polling title updates, or window title events |
| AI elements | `components/ai-elements/` is read-only and copied on demand |

## What This Pack Is Not

This pack is not an agent guide, task log, memory state, audit chronology, or archive summary. It is the current product and architecture design for the new app.
