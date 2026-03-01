# Learnings Log

> Reusable patterns, gotchas, and tips discovered during implementation.
> These accumulate across sessions and help avoid repeating mistakes.

---

<!-- Template for new entry:
## LRN-NNN: {Short Title}

**Date:** YYYY-MM-DD
**Phase:** P{N}-T{XX}
**Category:** PATTERN | GOTCHA | TIP | WORKAROUND

### What
{Description of the learning}

### Context
{Where this was discovered}

### Application
{When to apply this knowledge in the future}

---
-->

## LRN-001: Next.js 16 API Verification

**Date:** 2026-03-01
**Phase:** Pre-implementation
**Category:** TIP

### What
Next.js 16 uses `proxy.ts` instead of `middleware.ts`, supports `'use cache'` directive with `cacheTag`/`cacheLife`, and `cacheComponents: true` in experimental config. Training data about Next.js may be outdated.

### Context
Discovered during plan audit — multiple plan files initially used `middleware.ts` naming.

### Application
Always read `.next-docs/` before implementing any Next.js feature. Verify API signatures against local docs, not memory.

---

## LRN-002: Naming Consistency is Critical

**Date:** 2026-03-01
**Phase:** Pre-implementation
**Category:** GOTCHA

### What
The plan uses a comprehensive rename table (artifact not document, ChatStreamProvider not DataStreamProvider, etc.). Inconsistency between plan files was the #1 bug found in the audit — the conventions directory tree used old names while patterns.md used new names.

### Context
Found in architecture/conventions.md directory tree vs patterns.md.

### Application
Before creating any new file, verify the component/concept name against the naming table in `plan/final_plan/preamble.md`. Use grep to check consistency after bulk changes.

---
