# New App Overview

This folder is the standalone design pack for the rebuilt AI assistant. It is written so `plan/` and `plan-archives/` can be deleted without losing the new app architecture, behavior, domains, UI, API, data flow, AI, artifact, and roadmap decisions.

## Product Scope

The app is a Next.js AI chatbot with registered and guest users, multi-model chat, streaming responses, file attachments, chat history, voting, visibility controls, settings, and editable AI artifacts. The product centers on a chat surface with an optional artifact panel for substantial generated content.

Supported artifact kinds are `text`, `code`, `sheet`, and `image`. AI creates and updates `text`, `code`, and `sheet` artifacts through registered handlers. Image artifacts are displayed through the artifact UI and can be produced from client-side code execution outputs rather than a dedicated AI generation handler.

## Current Stack

| Area | Technology |
|---|---|
| Framework | Next.js 16.2.4 App Router |
| UI runtime | React 19.2.5 |
| Language | TypeScript strict, project currently on TypeScript 6.x |
| AI | Vercel AI SDK via `ai@6.0.172`, `@ai-sdk/react@3.0.174`, Google, OpenAI, OpenRouter providers |
| Data | Drizzle ORM with Supabase/Postgres |
| Auth | Supabase auth plus app-managed guest JWT |
| Cache and rate limits | Redis through Upstash Redis and Upstash Ratelimit |
| Files | Vercel Blob uploads |
| Styling | Tailwind CSS v4 with shadcn style primitives |
| Validation | Zod |
| Tooling | Biome, pnpm, Vitest, Playwright |

Older source notes mention AI SDK 4.x or 5.x. The design uses the current project dependency, `ai@6.0.172`, while preserving the same architectural concepts: provider registry, `useChat`, UI message streams, tool calling, data parts, and stream transforms.

## Non-Negotiables

1. Use the App Router with server components by default.
2. Keep `app/`, `features/`, `components/`, and `lib/` at the repository root. There is no `src/` directory.
3. Use `proxy.ts`, not `middleware.ts`, for request interception.
4. Keep feature code collocated under `features/[name]/`.
5. Keep `lib/` as infrastructure only. It must not import from `app/`, `features/`, or `components/`.
6. Use Server Actions for user-triggered mutations.
7. Use Route Handlers for SSE, file upload, paginated GETs, health checks, and debounced artifact save APIs.
8. Use `updateTag` in Server Actions and `revalidateTag(tag, 'max')` in Route Handlers.
9. Use `artifact` naming everywhere. Do not use `document` for the artifact domain.
10. Remove credit, gateway, quota purchase, and activation logic from the new app.
11. Treat `components/ai-elements/` as read-only generated primitives. Change wrappers, not the primitives.
12. Keep model selection separate from settings. Persist selected model through a `chat-model` cookie plus localStorage.

## Source Precedence Inside This Pack

This folder is not a summary of old folders. It is a rewritten current design. When a detail conflicts, use this precedence:

1. `plan_new/` docs are the current authority after rewrite.
2. Redesign architecture and naming decisions were treated as the architectural baseline.
3. Corrected concrete contracts from architecture, integration, behavior, UI parity, final plan, scaffold, dependency, phase, strategy, and traceability source areas were folded into these documents.
4. Current project dependencies override older source version notes.
5. Guides, memory files, task logs, prompt files, and old archive chronology are intentionally excluded.

## Documentation Map

| File | Purpose |
|---|---|
| `01-overview.md` | Scope, stack, non-negotiables, source precedence |
| `02-architecture.md` | Layers, directory structure, imports, providers, RSC rules |
| `03-domain-model.md` | Feature ownership, public APIs, entities, cache tags, naming |
| `04-data-flow-and-apis.md` | Routes, actions, contracts, auth, rate limits, revalidation |
| `05-chat-and-ai.md` | Chat lifecycle, streaming, provider registry, tools, prompts, settings |
| `06-artifacts.md` | Artifact lifecycle, store, handlers, editors, versions, suggestions |
| `07-ui-and-accessibility.md` | Screens, layout, interactions, loading, errors, responsive, a11y |
| `08-build-roadmap.md` | Design roadmap and critical path |
| `source-map.md` | Provenance from old source areas and explicit exclusions |
| `index.md` | Navigation entrypoint |

## Design Vocabulary

| Term | Meaning |
|---|---|
| Chat | A persisted conversation with messages, model, visibility, title, and owner |
| Artifact | A versioned side-panel asset created or updated by AI or user edits |
| Data part | Custom stream event such as `artifact-textDelta` or `chat-title` |
| Pending chat | A client-only optimistic chat row shown before the server history refresh catches up |
| App session | Unified session shape for Supabase users and guest JWT users |
| Client island | A small client component embedded inside a server-rendered tree |
