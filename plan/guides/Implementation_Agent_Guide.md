# Implementation Agent Guide — ai-assistant Migration

> **READ THIS ENTIRE FILE BEFORE STARTING ANY TASK.**
> This guide defines how implementation subagents work in this project.
> Non-negotiable rules. Violations cause rework.

---

## 1. You Are Building From Scratch

This is a **full rebuild** of a Next.js AI chatbot. The old app lives at `oldapp/` — it is your behavioral reference. You are creating new files in the project root.

**Stack:** Next.js 16 · React 19 · TypeScript strict · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK 4.x · Biome · pnpm

You will receive a task assignment with:
- A task ID (e.g., `P3-T08` or `P03-T08` — these are equivalent; phase specs use two-digit `P0N`, guides use single-digit `PN`)
- A task spec path (e.g., `plan/phases/p03-chat-core.md` → P03-T08)
- A task log path to fill when done
- Acceptance criteria

---

## 2. Before Writing a Single Line of Code

### Required Reading (Every Task)

1. **Your task spec** — `plan/phases/p{NN}-{name}.md` → your task section
2. **This guide** — you're reading it now
3. **Naming conventions** — `plan/architecture/conventions.md`
4. **Relevant patterns** — `plan/architecture/patterns.md` (only sections your task touches)

### Conditional Reading

| If your task involves... | Also read... |
|--------------------------|-------------|
| Next.js features (`use cache`, proxy, routes) | `.next-docs/` local docs |
| Data access or Drizzle | `plan/phases/p01-data-foundation.md` for schema patterns |
| Streaming or AI SDK | `plan/final_plan/ai-migration-guide.md` |
| Component wiring or providers | `plan/integration_map/component-wiring.md` |
| Integration seams | `plan/integration_map/seam-inventory.md` |
| Shared types | `plan/scaffold/shared-types.md` |
| Old app behavior | `oldapp/` — the specific files relevant to your task |

### Pre-Implementation Checklist

Before writing code, confirm:
- [ ] I know exactly which files to create/modify (from task spec)
- [ ] I understand the naming conventions
- [ ] I've read the relevant architecture patterns
- [ ] I know what this code's consumers expect (who calls it, what interface)
- [ ] I've checked `oldapp/` for behavioral reference

---

## 3. Non-Negotiable Rules

### Naming (NEVER Violate)

| Correct | WRONG |
|---------|-------|
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

### File Naming
- Files and directories: `kebab-case` — e.g., `chat-shell.tsx`, `data-access/`
- Components: `PascalCase` in code — e.g., `ChatShell`, `ModelSelector`
- Hooks: `camelCase` with `use` prefix — e.g., `useChatSession`
- Server Actions: `camelCase` verb-first — e.g., `saveChat`, `deleteMessage`
- Constants: `SCREAMING_SNAKE_CASE` — e.g., `MAX_RETRIES`
- Types: `PascalCase` — e.g., `ChatMessage`, `ArtifactKind`
- Zod schemas: `camelCase` with `Schema` suffix — e.g., `loginSchema`

### Architecture

1. **Server-first**: Every component is a Server Component by default. Only add `'use client'` when the component needs browser APIs, state, or event handlers.
2. **Three-layer imports**: `app/` → `features/` → `lib/` + `components/`. Never import from another feature's implementation.
3. **Feature collocation**: Domain code in `features/<domain>/`. Only truly shared code in `lib/` or `components/`.
4. **No `src/` directory**: Everything at project root.

### Patterns

| Pattern | Rule |
|---------|------|
| Server Actions | MUST return `ActionResult<T>` — never throw from client-called SAs |
| Route Handlers | MUST use `AppError.toResponse()` for error responses |
| Mutations | MUST call `updateTag()` (SAs) or `revalidateTag(tag, 'max')` (RHs) |
| Artifact state | MUST use `useSyncExternalStore` with selector — NOT SWR |
| Settings | MUST use `useSettings()` hook — NO SettingsProvider |
| ChatShell | MUST be ≤80 lines thin orchestrator |
| StreamBridge | MUST be ≤30 lines thin bridge |
| Providers | MUST scope tightly — wrap only components that consume them |

### Forbidden

| Do NOT... | Reason |
|-----------|--------|
| Use "document" in artifact context | Naming consistency |
| Add credit/gateway/quota logic | Removed by design |
| Create `middleware.ts` | Use `proxy.ts` (Next.js 16) |
| Add barrel files (index.ts) | Direct imports preferred (exception: `features/artifacts/handlers/index.ts` for handler registration) |
| Use SWR for artifact state | `useSyncExternalStore` pattern |
| Create monolithic `'use client'` layouts | Server layouts + client islands |
| Import from another feature's `components/` or `hooks/` directly | Use shared contracts in `lib/` |
| Use implicit `any` | TypeScript strict mode |
| Skip validation | Always run format/typecheck/lint |

---

## 4. During Implementation

### Code Quality

- TypeScript strict mode — no implicit `any`
- Input validation with Zod at all boundaries
- Biome formatting (enforced via `pnpm format`)
- Follow existing patterns — search the codebase before creating new abstractions
- Prefer `Reuse → Extend → Refactor → Create`

### Using Old App Reference

The old app at `oldapp/` shows **what the app does**, not how to build it. When referencing:

1. Match the **behavior** (what the user sees / data flow)
2. Apply the **new architecture** (server-first, providers, hooks pattern)
3. Use the **new names** (artifact, ChatShell, ChatStreamProvider, etc.)
4. Simplify where possible — the old app is often over-engineered

### Component Size Guidelines

| Component | Target Size | Role |
|-----------|-------------|------|
| ChatShell | ≤80 lines | Thin orchestrator — provides context, renders children |
| StreamBridge | ≤30 lines | Dispatches stream events to artifact store |
| Feature components | 50-150 lines | Focused, single-responsibility |
| Utility functions | 10-50 lines | Pure, testable |
| Hooks | 20-80 lines | Single concern, composable |

---

## 5. After Completing Your Task

### Step 1: Validate

```bash
pnpm format        # Must pass
pnpm typecheck     # Must pass
pnpm lint          # Must pass
```

If any fail, fix them before proceeding. Do not report completion with failing validation.

### Step 2: Fill the Task Log

Fill your assigned task log file using this format:

```yaml
---
task: P{N}-T{NN}
title: {Task title}
agent: {your agent name}
status: completed | partial | blocked | error
phase: {N}
started: YYYY-MM-DD HH:MM
finished: YYYY-MM-DD HH:MM
validation_passed: true | false
has_deviations: false
has_issues: false
has_findings: false
---
```

Then fill the Markdown sections:
- **Summary** — 1-2 sentences
- **Work Performed** — steps in logical order
- **Files Created/Modified** — list with brief description
- **Validation** — format/typecheck/lint results
- **Issues** — problems found (or "None")
- **Deviations** — only if `has_deviations: true`
- **Important Findings** — only if `has_findings: true`
- **Next** — what the next agent should know

Full format reference: `plan/guides/Task_Log_Guide.md`

### Step 3: Report Back

Report your status to the orchestrator. Include:
- Task ID and status
- Files created/modified (paths)
- Whether validation passed
- Any flags raised (deviations, issues, findings)

---

## 6. Key Reference Paths

| What | Where |
|------|-------|
| Task specs | `plan/phases/p{NN}-{name}.md` |
| Phase plans | `plan/final_plan/phase-{NN}-plan.md` |
| Architecture patterns | `plan/architecture/patterns.md` |
| Naming conventions | `plan/architecture/conventions.md` |
| Architecture decisions | `plan/architecture/decisions.md` |
| Integration seams | `plan/integration_map/seam-inventory.md` |
| Component wiring | `plan/integration_map/component-wiring.md` |
| Data flow chains | `plan/integration_map/data-flow-chains-01.md`, `data-flow-chains-02.md` |
| Shared types | `plan/scaffold/shared-types.md` |
| Directory structure | `plan/scaffold/directory-structure.md` |
| AI migration | `plan/final_plan/ai-migration-guide.md` |
| Type contracts | `plan/integration_map/contracts.md` |
| Old app (reference) | `oldapp/` |
| Next.js 16 docs | `.next-docs/` |
| Task log format | `plan/guides/Task_Log_Guide.md` |

---

## 7. Provider Tree

> **Canonical source:** `plan/integration_map/component-wiring.md` § 1
> If below and component-wiring.md conflict, **component-wiring.md wins.**

```
Root Layout (SERVER):
  <ThemeProvider>
    <SessionProvider session={session}>   ← server-fetched
      {children}
    </SessionProvider>
  </ThemeProvider>
  <Toaster />                             ← outside ThemeProvider

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

## 8. Decision Hierarchy

When facing tradeoffs:

```
Correctness → Architecture → Consistency → Performance → Speed
```

A fast wrong solution is still wrong. A performant solution that breaks architecture is still broken.

---

## 9. When You're Stuck

| Step | Action |
|------|--------|
| 1 | Re-read the task spec — the answer may be there |
| 2 | Check `plan/architecture/patterns.md` for the relevant pattern |
| 3 | Search `oldapp/` for how the old app handled it |
| 4 | Read `.next-docs/` if it's a Next.js API question |
| 5 | If genuinely blocked — set `status: blocked` in your log and report back with specific details |

Never guess. If behavior is unclear, stop and ask rather than implementing wrong.

---

**End of Guide**
