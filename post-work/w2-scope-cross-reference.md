# Wave 2: Implementation Scope Cross-Reference

**Date:** 2026-03-07  
**Purpose:** Map overlapping findings, shared root causes, dependency chains, and file conflicts across all 10 implementation scopes.  
**Source:** All 14 `w1-audit-*` reports + `w1-deep-dive-chat-waterfall.md` + `w1-fix-approaches-top3.md`

---

## Table of Contents

1. [Duplicate Findings](#1-duplicate-findings)
2. [Shared Root Causes](#2-shared-root-causes)
3. [Scope Dependencies](#3-scope-dependencies)
4. [File Conflict Map](#4-file-conflict-map)
5. [Amplification Chains](#5-amplification-chains)
6. [Recommended Execution Order](#6-recommended-execution-order)
7. [Unscoped Findings](#7-unscoped-findings)

---

## 1. Duplicate Findings

Findings reported identically across multiple audits. Each maps to a **single** scope — no double-counting.

| Finding | Reported In | Authoritative Scope |
|---------|-------------|---------------------|
| Missing rate limit on artifact GET+POST | app-routes F-13, logging-security F-07 | **Scope 1** |
| Missing rate limit on history/suggestions | app-routes F-14/F-15, logging-security F-08 | **Scope 1** |
| INCR+EXPIRE non-atomic race condition | lib-infra CRIT, logging-security F-09 | **Scope 1** |
| No security headers configured | app-routes F-27, logging-security F-15 | **Scope 8** |
| Missing robots.txt + sitemap.xml | app-routes F-20, a11y-seo HIGH ×2 | **Scope 10** |
| Missing public/ (favicon, OG image) | app-routes F-22, a11y-seo note | **Scope 10** |
| Triple/double JWT verify on guest requests | lib-infra CRIT, root-components HIGH | **Scope 5** |
| `getChatById` full-entity for ownership | lib-data-db CRIT, chat HIGH ×2 | **Scope 2** |
| `getArtifactById` full-entity for ownership | lib-data-db CRIT, artifacts HIGH, app-routes MEDIUM | **Scope 2** |
| ChatRouteContext discards modelMetadata | lib-ai HIGH ×3, chat HIGH ×2 | **Scope 7** |
| Store emission flooding per-frame | chat CRIT (stream-bridge), artifacts CRIT (artifact-store) | **Scope 3** |
| Dead rate-limit key builders | lib-infra HIGH, todo READY-3 | **Scope 9** (or remove in Scope 1) |
| chat/[id] error boundary missing | app-routes F-11/MEDIUM, logging-security F-13/MEDIUM | **Scope 8** |
| Retry-After header missing on 429 | app-routes F-17/MEDIUM, logging-security F-10/MEDIUM | **Scope 1** |

**De-duplication count:** 14 findings appear in 2+ audits. After de-duplication, the true unique finding count drops from ~95 to ~81.

---

## 2. Shared Root Causes

Different findings that trace to the same underlying architectural issue. Fixing the root cause resolves multiple findings simultaneously.

### Root Cause A: Full-Entity Fetch for Auth Checks

**Pattern:** Data functions return entire row (all columns incl. large TEXT content) when only `userId` is needed for ownership verification.

| Finding | Audit | Scope |
|---------|-------|-------|
| `getChatById` for ownership in 5 actions | lib-data-db CRIT | 2 |
| `getArtifactById` for ownership in save/restore/suggestions | lib-data-db CRIT | 2 |
| Artifact route ownership check re-fetches full row | artifacts HIGH | 2 |
| Vote action sequential getChatById + getMessageById | lib-data-db HIGH | 2 |
| Chat actions (delete, delete-trailing) fetch full Chat | chat HIGH | 2 |

**Single fix:** Create `getChatOwnerId()` and `getArtifactOwnerId()` in data layer → update all 8+ call sites.  
**Blast radius:** Scopes 2 (creation) → Scope 4 (lighter queries in waterfall) → Scope 9 (artifact route `gt()` fix uses same file)

---

### Root Cause B: Per-Request Recomputation of Stable Data

**Pattern:** Module-level constants and singletons re-created on every request instead of cached at startup.

| Finding | Audit | Scope |
|---------|-------|-------|
| Env vars re-read per request (session.ts, client.ts) | lib-infra CRIT | 5 |
| `allowedOrigins` Set rebuilt per POST (validate-origin.ts) | lib-infra CRIT | 5 |
| Model instances re-created per request (provider.ts) | lib-ai HIGH | 7 |
| `getModelCapabilities` derived twice per request | lib-ai HIGH | 7 |

**Single fix:** Module-level caching (lazy singletons) for env reads, allowed origins, and model instances.  
**Note:** Scopes 5 and 7 are **independent** fixes on different files, but share the same abstract pattern.

---

### Root Cause C: Streaming Store Flooding

**Pattern:** During artifact streaming, every incoming delta triggers a full store emission → all subscribers re-render per delta instead of per frame.

| Finding | Audit | Scope |
|---------|-------|-------|
| StreamBridge 2-frame indirection | chat CRIT | 3 |
| Per-delta store emissions (N per RAF) | chat CRIT | 3 |
| O(n²) REPLACE streaming bandwidth | artifacts CRIT | 3 |
| artifact-store emission flooding | artifacts CRIT | 3 |
| TextEditor memo bypass during streaming | artifacts HIGH | 6 |
| SheetEditor memo bypass | artifacts HIGH | 6 |
| Suggestions rebuilt from scratch per delta | artifacts HIGH | 6 |
| ArtifactPreview full-store subscription | artifacts HIGH | 6 |

**Root fix:** Scope 3 (batch store emissions + remove StreamBridge) → then Scope 6 (editor-level memo/debounce fixes) become higher-leverage because the actual re-render frequency drops.  
**Key insight:** Scope 6 is **partially dependent** on Scope 3 — if store flooding isn't fixed, editor memo fixes still face N updates per frame from the parent. Scope 3 first = orders-of-magnitude reduction in re-renders before editors even need to defend.

---

### Root Cause D: Missing Rate Limiting Across Endpoints

**Pattern:** Only 5 of 16 endpoint/action pairs have rate limiting. Same primitive is broken (non-atomic).

| Finding | Audit | Scope |
|---------|-------|-------|
| Artifact GET+POST unprotected | app-routes CRIT | 1 |
| History GET unprotected | app-routes HIGH | 1 |
| Suggestions GET unprotected | app-routes HIGH | 1 |
| Rate-limit primitive non-atomic | lib-infra CRIT | 1 |
| 5 mutation actions unprotected | logging-security MEDIUM | 1 |
| Health endpoint unprotected | logging-security LOW | 1 |
| Rate-limit bypass not logged | logging-security MEDIUM | 8 |

**Single fix:** Replace `rate-limit.ts` with `@upstash/ratelimit` SDK → add limits to 4 endpoints → optionally add mutation rate limiting.  
**Cross-scope:** Scope 8 (structured logger) would improve logging of rate-limit bypasses. Not a hard dependency.

---

### Root Cause E: Model Metadata Not Propagated

**Pattern:** `ChatRouteContext` drops `modelMetadata` after validation — forcing 5+ downstream functions to re-derive capabilities from a string ID.

| Finding | Audit | Scope |
|---------|-------|-------|
| `getModelCapabilities` computed 2× per request | lib-ai HIGH | 7 |
| `customProvider` no-op wrapper | lib-ai HIGH | 7 |
| `getModelById` misses dynamic models | lib-ai HIGH | 7 |
| Model instances not cached | lib-ai HIGH | 7 |
| Dual reasoning systems (metadata vs tag) | lib-ai HIGH | 7 |
| ChatRouteContext discards metadata | chat HIGH | 7 |
| Full catalog fetch for single model check | chat HIGH | 7 |

**Single fix:** Add `modelMetadata: ModelMetadata` to `ChatRouteContext` → all downstream consumers receive pre-validated metadata.  
**Fully contained:** This entire root cause lives in Scope 7 with zero dependencies on other scopes.

---

## 3. Scope Dependencies

### Hard Dependencies (must complete first)

```
Scope 2 (Data Layer) ──→ Scope 4 (Waterfall)
│                          └── Uses getChatOwnerId from Scope 2 for lighter queries
│                              (not strictly required, but wasteful without it)
│
Scope 3 (Streaming) ───→ Scope 6 (Editors)
│                          └── Editor memo fixes are partially premature without
│                              store flooding fix — they defend against symptoms
│                              that Scope 3 eliminates at the source
│
Scope 1 (Rate Limit) ──→ Scope 8 (Security Hardening)
                           └── Structured logger (Scope 8) would log rate-limit
                               bypass events from Scope 1's graceful degradation
                               (soft dependency — can log without it)
```

### Soft Dependencies (recommended order, not blocking)

```
Scope 2 ──→ Scope 9
│             └── Both touch lib/data/chat.ts — do dead code removal (S9)
│                 after adding new functions (S2) to avoid merge conflicts
│
Scope 5 ──→ Scope 4
│             └── Proxy optimization reduces request overhead that compounds
│                 with waterfall latency — stacks well but independent
│
Scope 7 ──→ Scope 4
              └── Model metadata propagation makes resolveChatRouteContext
                  leaner — optimizing the function Scope 4 also modifies
```

### Fully Independent (zero dependencies in either direction)

| Scope | Can execute anytime |
|-------|---------------------|
| Scope 10 (A11y + SEO) | Touches no shared code with other scopes except `artifact-panel.tsx` (focus trap) |
| Scope 1 (Rate Limiting) | Self-contained — different files from all other scopes except `keys.ts` (dead code shared with S9) |
| Scope 8 (Security Headers + Logger) | `next.config.ts` and new files — no overlap |

---

## 4. File Conflict Map

Files touched by **2+ scopes**. These require sequential execution or careful merge coordination.

### High-Conflict Files (3 scopes)

| File | S1 | S2 | S3 | S4 | S5 | S6 | S7 | S8 | S9 | S10 | Conflict Notes |
|------|----|----|----|----|----|----|----|----|----|----|-------|
| `app/api/artifact/route.ts` | RL | OQ | | | | | | | gt() | | S1 adds rate-limit lines at top; S2 swaps ownership queries; S9 fixes gt() operator. **Sequential safe — non-overlapping regions.** |
| `features/artifacts/components/artifact-panel.tsx` | | | | | | Lazy | | | Sort | Trap | S6 gates render; S9 fixes version sort; S10 adds focus trap. **S6 first** (structural gate), then S9+S10 inside. |

### Medium-Conflict Files (2 scopes)

| File | Scopes | Conflict Notes |
|------|--------|----------------|
| `features/chat/lib/chat-route.ts` | **S4** (waterfall), **S7** (metadata) | Both modify `resolveChatRouteContext`. S7 adds `modelMetadata` to context; S4 adds messages to `Promise.all`. **Do S7 first** — its changes are structural (type change), then S4 reorders within the function. |
| `lib/data/chat.ts` | **S2** (new functions + rewrite transfer), **S9** (remove dead `getChatWithMessages`) | S2 adds code, S9 removes code. **Do S2 first** — adding new functions, then S9 removes dead ones = clean sequencing. |
| `lib/cache/keys.ts` | **S1** (add new keys), **S9** (remove dead keys) | S1 adds `rateLimitArtifact/History/Suggestions`; S9 removes `rateLimit`/`rateLimitDaily`. **Can combine** — do both in S1 to keep rate-limit work together. |
| `features/chat/hooks/use-chat-session.ts` | **S3** (move artifact writes + useMemo) | Only S3 — but also touched tangentially by S6 (artifact store API change). If S3 changes the store emission API, S6's editor changes need the new API. |
| `features/artifacts/lib/suggestions-extension.tsx` | **S6** (memoize + WeakMap), types-hydration scope (not assigned to numbered scope) | S6 owns this file. The types-hydration `as unknown as` cast fix is part of the WeakMap migration. |

### Zero-Conflict Files (single scope only)

These files are touched by exactly one scope — no coordination needed:

| Scope | Files (exclusive) |
|-------|-------------------|
| S1 | `lib/cache/rate-limit.ts`, `app/api/history/route.ts`, `app/api/suggestions/route.ts`, `lib/errors/app-error.ts` |
| S2 | `lib/db/schema.ts`, `lib/db/migrations/`, `lib/data/artifact.ts`, `lib/data/message.ts` |
| S3 | `features/chat/components/stream-bridge.tsx` (delete), `features/artifacts/handlers/stream-artifact-deltas.ts`, `features/artifacts/lib/artifact-store.ts`, `features/chat/components/chat-shell.tsx` |
| S4 | `app/(chat)/chat/[id]/page.tsx` |
| S5 | `proxy.ts`, `lib/auth/session.ts`, `lib/cache/client.ts`, `lib/utils/validate-origin.ts` |
| S6 | `features/artifacts/components/editors/code-editor.tsx`, `text-editor.tsx`, `sheet-editor.tsx`, `artifact-preview.tsx` |
| S7 | `lib/ai/provider.ts`, `provider-options.ts`, `model-capability-inference.ts`, `models.ts` |
| S8 | `next.config.ts`, `app/(chat)/chat/[id]/error.tsx` (create), `lib/utils/logger.ts` (create) |
| S9 | `features/sidebar/components/*` (3 files), `lib/cache/revalidate.ts`, `lib/auth/guest.ts`, `lib/data/user.ts`, `features/chat/schemas/chat.schema.ts` |
| S10 | `app/layout.tsx`, `components/ui/sidebar.tsx`, `features/chat/components/messages.tsx`, `app/robots.ts`, `app/sitemap.ts`, `public/`, `package.json` |

---

## 5. Amplification Chains

Sequences where one scope's fix amplifies the measurable impact of a later scope.

### Chain 1: Streaming Pipeline → Editor Memos

```
Scope 3 (batch store emissions)
  → Reduces store updates from N/frame to 1/frame
    → Scope 6 (editor memo fixes)
      → Memo comparisons that were bypassed during streaming now actually gate renders
        → Combined: editors render 1×/frame instead of N×/frame
        → Without S3: S6 alone reduces N renders to ~N/2 (memo helps but still N inputs)
        → With S3 first: S6 reduces 1 input to 0 unnecessary renders (memo fully effective)
```

**Impact multiplier:** S6 alone = ~2× improvement. S3 + S6 = ~N× improvement (where N = deltas per frame, typically 5-20).

### Chain 2: Data Layer → Waterfall → API Route

```
Scope 2 (getChatOwnerId — lightweight queries)
  → Ownership checks go from ~20ms (full row) to ~3ms (single column)
    → Scope 4 (waterfall optimization)
      → Messages fetch runs in parallel with now-lighter ownership checks
        → Scope 7 (metadata propagation)
          → Model validation skips full catalog fetch
            → Combined: resolveChatRouteContext goes from ~220ms to ~80ms
```

**Impact multiplier:** S4 alone saves ~70ms. With S2 + S7 = ~140ms savings (ownership + model validation both faster).

### Chain 3: Rate Limiting → Logger → Security Headers

```
Scope 1 (rate limiting with @upstash/ratelimit)
  → All endpoints protected; Retry-After header available
    → Scope 8 (structured logger)
      → Rate-limit bypasses logged; security events auditable
        → Scope 8 (security headers)
          → Defense-in-depth: rate limiting + headers + logging = complete HTTP security posture
```

**Impact:** No measurable performance amplification, but **security coverage** compounds: each layer catches what others miss.

---

## 6. Recommended Execution Order

Based on dependencies, conflicts, and amplification chains:

### Phase A — Foundation (no dependencies, high blast-radius)

| Order | Scope | Rationale |
|-------|-------|-----------|
| A1 | **Scope 1** (Rate Limiting) | Zero dependencies; protects production immediately; modifies no shared code |
| A2 | **Scope 2** (Data Layer Bugs) | Zero dependencies; correctness fixes must ship before optimization |
| A3 | **Scope 5** (Proxy/Session) | Zero dependencies; per-request overhead reduction benefits all subsequent testing |

*These three can run in **parallel** if three engineers are available.*

### Phase B — Performance (depends on Phase A)

| Order | Scope | Rationale |
|-------|-------|-----------|
| B1 | **Scope 3** (Streaming Pipeline) | Depends on nothing, but **must precede** Scope 6 |
| B2 | **Scope 7** (AI Model Pipeline) | Independent, but **should precede** Scope 4 (shared file) |
| B3 | **Scope 4** (Waterfall) | Benefits from S2 (lighter queries) + S7 (leaner context); shared file with S7 |

### Phase C — Quality (depends on Phase A/B for stable code)

| Order | Scope | Rationale |
|-------|-------|-----------|
| C1 | **Scope 6** (Editor Memos) | Depends on S3 (store emissions fixed first) |
| C2 | **Scope 8** (Security Hardening) | Benefits from S1 (rate-limit logging) |
| C3 | **Scope 9** (Sidebar + Dead Code) | Benefits from S2 (shared file: chat.ts) |
| C4 | **Scope 10** (A11y + SEO + Deps) | No dependencies; housekeeping |

### Visual DAG

```
    ┌──────────────────────────────────────────────────┐
    │                  Phase A (parallel)               │
    │  [S1: Rate Limit]  [S2: Data Bugs]  [S5: Proxy]  │
    └──────┬─────────────────┬───────────────┬─────────┘
           │                 │               │
           │          ┌──────┘               │
           │          │                      │
    ┌──────▼──────────▼──────────────────────▼─────────┐
    │                  Phase B (sequential)              │
    │  [S3: Streaming] → [S7: AI Pipeline] → [S4: WF]  │
    └──────┬──────────────────┬────────────────────────┘
           │                  │
    ┌──────▼──────────────────▼────────────────────────┐
    │                  Phase C (parallel)                │
    │  [S6: Editors]  [S8: Security]  [S9: Sidebar]     │
    │                 [S10: A11y/SEO]                    │
    └──────────────────────────────────────────────────┘
```

---

## 7. Unscoped Findings

Findings from audits that didn't cleanly fit into the 10 scopes. These are MEDIUM/LOW severity and can be addressed opportunistically.

| Finding | Severity | Source | Notes |
|---------|----------|--------|-------|
| `ChatHeader` re-renders ~60×/sec during streaming | HIGH | chat | Could live in S3 (streaming context split) or S9 (secondary fixes). Currently unassigned. |
| Auth success events not logged | MEDIUM | logging-security F-02 | Assigned to S8 but could slip — needs explicit implementation |
| Rate-limit bypass not logged | MEDIUM | logging-security F-03 | Depends on S1 (rate-limit change) + S8 (logger) |
| Delete/rename mutations no server logging | MEDIUM | logging-security F-06 | Assigned to S8 |
| Server Action mutations lack rate limiting | MEDIUM | logging-security F-11 | Covered by S1 if global mutation rate limit added; otherwise deferred |
| Health endpoint no rate limit | LOW | logging-security F-12 | Intentionally exempt; monitor. |
| maxDuration missing on non-chat routes | MEDIUM | app-routes F-29 | Not in any scope — trivial one-line additions per route |
| Inconsistent API response shapes | MEDIUM | app-routes F-19 | Normalization task; no scope assigned | 
| Weather component unwired | READY | todo inventory | Scope TBD — P6-T12 tool rendering |
| `updateUserLastLogin` unused | READY | todo inventory | Decision needed before implementation |
| 4 type-safety casts for SDK writer | HIGH | types-hydration | Could live in S7 (API route changes) or standalone micro-scope |
| role/parts cast without validation | HIGH | types-hydration | Could live in S7 (message processing changes) |
| Sidebar cookie missing `secure` flag | MEDIUM | logging-security | Trivial fix; no scope needed |
| `isGuest` flash bug in SessionProvider | HIGH | auth | Could be standalone or bundled with S5 (session optimization) |
| Swallowed promise rejections undocumented | LOW | logging-security F-14 | Comment-only change |

### Recommendation for Unscoped Items

1. **ChatHeader re-renders** → Add to **Scope 3** (streaming context split solves this)
2. **Type-safety casts (4 writer + 2 role/parts)** → Create **Scope 7 addendum** or new **Scope 7b: Type Safety**
3. **`isGuest` flash bug** → Add to **Scope 5** (session optimization touches same area)
4. **maxDuration additions** → Bundle with **Scope 1** (touching same API routes for rate limiting)
5. **Everything else** → Opportunistic during scope implementation (comment fixes, cookie secure flag, etc.)

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total unique findings (after de-duplication) | ~81 |
| Findings in 2+ audits (duplicates) | 14 |
| Shared root causes identified | 5 (A–E) |
| Hard scope dependencies | 3 |
| Soft scope dependencies | 3 |
| Fully independent scopes | 3 (S1, S8, S10) |
| High-conflict files (3+ scopes) | 2 (`artifact/route.ts`, `artifact-panel.tsx`) |
| Medium-conflict files (2 scopes) | 5 |
| Unscoped findings | ~15 (mostly MEDIUM/LOW) |
