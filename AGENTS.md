# AGENTS.md

**Project:** ai-assistant · Next.js AI chatbot with multi-model support, artifact management, and real-time streaming.

**Stack:** Next.js 16 · React 19 · TypeScript · Drizzle ORM · Supabase · Tailwind v4 · Vercel AI SDK · Biome

> Always use a timeout when running tests to prevent infinite loops or hanging processes. A reasonable default is 30 seconds, but adjust as needed based on the test complexity.
>Also for calling external APIs, set a timeout to avoid hanging requests. A common timeout is 10 seconds, but adjust based on expected response times.

## Next.js Documentation

> Your training data about Next.js is likely outdated. This project runs **Next.js 16** with the **App Router**.

Before working on any Next.js-related code:

1. Read the local docs at `./.next-docs/`
2. Search relevant docs before relying on memory
3. Verify API signatures against current docs

---

## Architectural Improvement Policy

- Do not copy existing architecture verbatim when a clearly superior approach is available.
- If spec or existing code, patterns, or abstractions are unnecessarily complex, **simplify them** — reduce indirection, flatten hierarchies, and eliminate over-engineering wherever possible.
- Every architectural deviation **must** be logged with:
  - What the original design prescribed
  - What was done instead
  - Why the new approach is better
  - Any trade-offs introduced

---

## Code Standards

| Standard         | Requirement                        |
| ---------------- | ---------------------------------- |
| TypeScript       | Strict mode, no implicit `any`     |
| `any` type       | Requires written justification     |
| Input validation | Zod schemas                        |
| Formatting       | Biome (enforced via `pnpm format`) |
| Mutations        | Server Actions only                |

---

## Naming Consistency

| Element          | Convention                                 | Example                           |
| ---------------- | ------------------------------------------ | --------------------------------- |
| Files/Dirs       | `kebab-case`                               | `chat-header.tsx`, `data-stream/` |
| Components       | `PascalCase`                               | `ChatHeader`, `ModelSelector`     |
| Hooks            | `camelCase` with `use` prefix              | `useChat`, `useScrollToBottom`    |
| Functions        | `camelCase`                                | `getChatById`, `formatDate`       |
| Constants        | `SCREAMING_SNAKE_CASE`                     | `MAX_RETRIES`, `DEFAULT_MODEL`    |
| Types/Interfaces | `PascalCase`                               | `ChatMessage`, `ModelConfig`      |
| Zod schemas      | `camelCase` with `Schema` suffix           | `loginSchema`, `messageSchema`    |
| Server Actions   | `camelCase` verb-first                     | `saveChat`, `deleteMessage`       |
| Route handlers   | `app/` path convention, `route.ts` exports | `GET`, `POST`, `DELETE`           |

Before creating any new symbol, search the codebase for the existing naming pattern in that area and match it.

---

## Decision Hierarchy

```
Correctness → Architecture → Consistency → Performance → Speed
```

A fast wrong solution is still wrong.

## Reuse Hierarchy

```
Reuse → Extend → Refactor → Create
```

Always prefer existing solutions over writing new code.

---

## Pre-Implementation Checklist

Before writing any code:

1. **Search the codebase** for existing logic that already solves the problem. If it exists, reuse it.
2. **Read the target file and its consumers** to understand actual behavior, not assumed behavior.
3. **Map the impact surface** — what calls this code, what depends on it, what side effects exist.
4. **Confirm architectural fit** — correct layer, correct module, correct abstraction level.

Do not proceed to implementation if any of the above is unclear.

---

## Post-Implementation Validation

Before marking any code change complete:

- [ ] `pnpm format`; `pnpm lint`; `pnpm typecheck` passes (run all 3 at one if doable)
- [ ] Architecture constraints are respected
- [ ] No duplicate logic introduced
- [ ] All imports resolve correctly
- [ ] No unintended side effects introduced

> This validation applies to code files only, not documentation changes.

---

## Error Resolution

| Attempt | Approach                           |
| ------- | ---------------------------------- |
| 1       | Fix directly                       |
| 2       | Try an alternative approach        |
| 3       | Step back and rethink the strategy |
| 4       | Escalate to the user               |

Never repeat the same failed approach.

---

## Behavioral Rules

- **Understand before coding.** Read the relevant code before implementing. Never guess at behavior.
- **Use search tools over terminal** for finding code, text, or file references. Reserve the terminal for builds, tests, and shell commands.
- **Work autonomously.** Only ask the user when genuinely blocked by missing information.
- **Stay in scope.** Do not expand beyond the requested task without justification.
---

## Forbidden Actions

| Action                      | Reason                             |
| --------------------------- | ---------------------------------- |
| Overwrite working logic     | Breaks existing functionality      |
| Introduce new architecture  | Violates intentional design        |
| Bypass architectural layers | Breaks separation of concerns      |
| Modify unrelated files      | Scope creep and unintended effects |
| Skip validation steps       | Ships broken code                  |
| Guess at behavior           | Produces bugs from assumptions     |

---

## ai-element Rule
- files in components/ai-elements/ are **read-only** and should not be modified directly. They are generated from prompts and any changes will be overwritten.
- Modify the colocated wrapper if you need to change behavior or styling, but do not change the core ai-element file.

---
## Guiding Principle

> This system is intentionally designed. Extend it safely, consistently, and correctly.


This is a greenfield prject so there is no need to maintain backward compatibility. 
Also no external users are consuming this code, so we can make breaking changes whenever we want.
Always prefer the simplest solution that works, and do not over-engineer for hypothetical future use cases. We can always refactor later if needed.