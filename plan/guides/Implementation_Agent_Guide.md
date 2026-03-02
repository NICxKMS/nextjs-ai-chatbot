# Implementation Agent Guide — Subagent Playbook

> **READ THIS ENTIRE FILE BEFORE STARTING ANY TASK.**
> You are a **subagent** — you receive task assignments from the orchestrator. You never self-assign tasks.
> Non-negotiable rules. Violations cause rework.

---

## 1. Context

You are building new code in the project root. Old app at `oldapp/` is behavioral reference only.
Stack and hierarchies: see `STARTER-PROMPT.md` § 1.

> **Your Next.js knowledge is outdated.** This project runs Next.js 16 with App Router. Always consult `.next-docs/` before using Next.js APIs. Do not rely on training data for Next.js features.

Your assignment includes: task ID, task spec path, task log path, and acceptance criteria.

> **Task ID format:** Always use **single-digit phase prefix** (`P0`, not `P00`) for task file names and YAML `task` field. Phase specs use `P00-T01` — strip the leading zero when creating files. Example: spec `P00-T01` → file `P0-T01.md`.

---

## 2. Before Writing Code

### Required Reading (Every Task)

1. **Your task spec** — `plan/phases/p{NN}-{name}.md` → your task section
2. **This guide** — you're reading it now
3. **Next.js 16 local docs** — `.next-docs/` (your training data about Next.js is outdated; always consult these)
4. **Naming conventions** — `plan/architecture/conventions.md`
5. **Relevant patterns** — `plan/architecture/patterns.md` (only sections your task touches)

### Conditional Reading

| If your task involves... | Also read... |
|--------------------------|-------------|
| Phase context | `plan/final_plan/phase-{NN}-plan.md` (your phase overview) |
| Next.js features (`use cache`, proxy, routes) | `.next-docs/` relevant sections for the specific API |
| Data access or Drizzle | `plan/phases/p01-data-foundation.md` |
| Streaming or AI SDK | `plan/final_plan/ai-migration-guide.md` |
| Component wiring or providers | `plan/integration_map/component-wiring.md` |
| Integration seams | `plan/integration_map/seam-inventory.md` |
| Shared types | `plan/scaffold/shared-types.md` |
| Old app behavior | `oldapp/` — specific files relevant to your task |

### Pre-Implementation Checklist

- [ ] I know exactly which files to create/modify (from task spec)
- [ ] I understand the naming conventions
- [ ] I've read the relevant architecture patterns
- [ ] I know what this code's consumers expect (who calls it, what interface)
- [ ] I've checked `oldapp/` for behavioral reference

---

## 3. Naming Rules (Never Violate)

### Component & Module Names

| Correct | WRONG (never use) |
|---------|-------------------|
| `artifact` | `document` (in artifact context) |
| `artifactId` | `documentId` |
| `ArtifactKind` | `DocumentKind` |
| `ArtifactHandler` | `DocumentHandler` |
| `createArtifact` / `updateArtifact` | `createDocument` / `updateDocument` |
| `ChatShell` | `Chat` (god component) |
| `ChatStreamProvider` | `DataStreamProvider` |
| `StreamBridge` | `DataStreamHandler` |
| `SessionProvider` | `AuthProvider` |
| `VoteResolver` | `VoteHydrator` |
| `PendingChatsProvider` | `OptimisticChatsProvider` |
| `ChatSessionContext` | `ChatContext` |
| `proxy.ts` | `middleware.ts` |

### File & Symbol Naming

| Element | Convention | Example |
|---------|------------|---------|
| Files/directories | `kebab-case` | `chat-shell.tsx`, `data-access/` |
| Components | `PascalCase` | `ChatShell`, `ModelSelector` |
| Hooks | `camelCase` + `use` prefix | `useChatSession` |
| Server Actions | `camelCase` verb-first | `deleteChat`, `voteOnMessage` |
| Constants | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES` |
| Types/Interfaces | `PascalCase` | `ChatMessage`, `ArtifactKind` |
| Zod schemas | `camelCase` + `Schema` suffix | `loginSchema` |

---

## 4. Architecture Rules

### Server-First

Every component is a Server Component by default. Only add `'use client'` when the component needs browser APIs, state, or event handlers.

### Three-Layer Imports

`app/` → `features/` → `lib/` + `components/`. Cross-feature imports are allowlist-only: shared **types/schemas** plus explicitly documented composition exceptions (see `architecture/conventions.md`). Enforced by `scripts/check-imports.mjs` (created in P0-T17).

### Feature Collocation

Domain code in `features/<domain>/`. Only truly shared code in `lib/` or `components/`. No `src/` directory.

### Patterns

| Pattern | Rule |
|---------|------|
| Server Actions | Client-called: return `ActionResult<T>`. RH-delegated: may throw `AppError`. (See `patterns.md` § 2) |
| Route Handlers | Use `AppError.toResponse()` for error responses |
| Mutations | SAs call `invalidate*()` wrappers (`updateTag`). RHs call `refresh*()` wrappers (`revalidateTag(tag, 'max')`). (See `patterns.md` § 9) |
| Artifact state | `useSyncExternalStore` with selector — NOT SWR |
| Settings | `useSettings()` hook — NO SettingsProvider |
| ChatShell | ~60 lines target (≤80 hard limit) thin orchestrator |
| StreamBridge | ~20 lines target (≤30 hard limit) thin bridge |
| Providers | Scope tightly — wrap only components that consume them |

### Forbidden

| Do NOT... | Reason |
|-----------|--------|
| Use "document" in artifact context | Naming consistency |
| Add credit/gateway/quota logic | Removed by design |
| Create `middleware.ts` | Use `proxy.ts` (Next.js 16) |
| Add unnecessary barrel files | Create `index.ts` only when 3+ public exports AND consumers benefit (e.g., `features/artifacts/handlers/index.ts`) |
| Use SWR for artifact state | `useSyncExternalStore` pattern (SWR is allowed for data-fetching like sidebar pagination) |
| Create monolithic `'use client'` layouts | Server layouts + client islands |
| Import another feature's internals | Use shared contracts in `lib/` |
| Use implicit `any` | TypeScript strict mode |

---

## 5. During Implementation

### Code Quality

- TypeScript strict mode — no implicit `any`
- Input validation with Zod at all boundaries
- Biome formatting (enforced via `pnpm format`)
- Follow existing patterns — search codebase before creating new abstractions

### Using Old App Reference

`oldapp/` shows **what the app does**, not how to build it. Match behavior, apply new architecture + new names, and simplify.

### Size Guidelines

Feature components: 50–150 lines. Utility functions: 10–50 lines. Hooks: 20–80 lines.

---

## 6. Provider Tree

> **Canonical source:** `plan/integration_map/component-wiring.md` § 1
> If this and component-wiring.md conflict, **component-wiring.md wins.**
> This is a simplified view. Before implementing layout/page tasks (P3-T24, P3-T25), read the full tree in component-wiring.md.

```
Root Layout (SERVER):
  <ThemeProvider>
    <SessionProvider session={session}>   ← server-fetched
      {children}
    </SessionProvider>
  </ThemeProvider>
  <Toaster position="top-center" />       ← outside ThemeProvider (sonner)

Chat Layout (SERVER):
  <PendingChatsProvider>                  ← outermost (both sidebar + pages)
    <SidebarProvider>
      <SidebarShell />                    ← SERVER with 'use cache'
      {children}
    </SidebarProvider>
  </PendingChatsProvider>

Chat Page (SERVER):
  <ChatStreamProvider>                    ← Page-scoped, NOT layout
    <ChatShell>                           ← 'use client' ≤80 lines
      <ChatSessionContext.Provider>
        <ChatHeader />
        <Messages />
        <MultimodalInput />
        <ArtifactPanel />                 ← conditional
      </ChatSessionContext.Provider>
    </ChatShell>
    <StreamBridge />                      ← sibling of ChatShell (≤30 lines)
    <Suspense>
      <VoteResolver />                   ← React 19 use() deferred votes
    </Suspense>
  </ChatStreamProvider>
```

---

## 7. After Completing Your Task

### Step 1: Validate

```bash
pnpm format        # Must pass
pnpm typecheck     # Must pass
pnpm lint          # Must pass
```

Fix any failures before proceeding. If you cannot fix a pre-existing failure (not caused by your task), set `has_issues: true` and report it.

> **First task (P0-T01) only:** Run `pnpm install` after creating `package.json`. Subsequent tasks can assume `node_modules/` exists.

### Step 2: Fill the Task Log

Fill your assigned task log file per `plan/guides/Task_Log_Guide.md`. Key parts:

- YAML frontmatter (task, title, agent, status, flags)
- Summary, Work Performed, Files Created/Modified
- Validation results
- Issues, Deviations, Findings (if applicable)

### Step 3: Report Back

Report to the orchestrator with:
- Task ID and status
- Files created/modified (paths)
- Whether validation passed
- Any flags raised (deviations, issues, findings)

---

## 8. Key Paths

> Full reference: `STARTER-PROMPT.md` § 4. Most-used paths for subagents:

| What | Where |
|------|-------|
| Task specs | `plan/phases/p{NN}-{name}.md` |
| Architecture patterns | `plan/architecture/patterns.md` |
| Naming conventions | `plan/architecture/conventions.md` |
| Component wiring | `plan/integration_map/component-wiring.md` |
| Shared types | `plan/scaffold/shared-types.md` |
| Old app (reference) | `oldapp/` |
| Task log format | `plan/guides/Task_Log_Guide.md` |

---

## 9. When You're Stuck

| Step | Action |
|------|--------|
| 1 | Re-read the task spec — the answer may be there |
| 2 | Check `plan/architecture/patterns.md` for the relevant pattern |
| 3 | Search `oldapp/` for how the old app handled it |
| 4 | Read `.next-docs/` if it's a Next.js API question |
| 5 | If genuinely blocked — set `status: blocked` in your log and report back with details |

Never guess. If behavior is unclear, stop and ask. If sources conflict, see `STARTER-PROMPT.md` § 2 for precedence.

If the task is too large to complete, mark `status: partial` with a "Remaining Work" checklist and report back immediately.
