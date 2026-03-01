# Phase 01 — Data Foundation

> Database client, cache layer, data access functions, and shared hooks.

---

## Objective

Establish the complete data layer: Supabase client, Drizzle migrations, Redis cache with `withCache` helper, all data-access functions (user, chat, message, document, vote), API utilities, rate limiting, and shared hooks. After this phase, any feature can read/write data.

**Entry state:** P00 complete — schema defined, types exported, project compiles
**Exit state:** All data-access functions work against Supabase; cache layer operational; shared hooks available
**Est. duration:** ~2 days
**Tasks:** 16

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P01-T01 | Create DB client (Supabase + Drizzle) | IMPLEMENTATION | M | P00-T07 |
| P01-T02 | Run DB migrations | IMPLEMENTATION | M | T01 |
| P01-T03 | Create cache client + key builders | IMPLEMENTATION | M | P00-T01 |
| P01-T04 | Create withCache helper + barrel | IMPLEMENTATION | M | T03 |
| P01-T05 | Create data context (request-scoped) | IMPLEMENTATION | M | T01 |
| P01-T06 | Create user data functions | IMPLEMENTATION | M | T01 |
| P01-T07 | Create chat data functions | IMPLEMENTATION | M | T01, T04 |
| P01-T08 | Create message data functions | IMPLEMENTATION | M | T01, T04 |
| P01-T09 | Create document data functions | IMPLEMENTATION | M | T01, T04 |
| P01-T10 | Create vote data functions | IMPLEMENTATION | S | T01 |
| P01-T11 | Create auth config (Supabase auth helpers) | IMPLEMENTATION | M | T01, P00-T14 |
| P01-T12 | Create API utilities (response helpers, withAuth) | IMPLEMENTATION | M | T05 |
| P01-T13 | Create rate limiting module | IMPLEMENTATION | M | T03 |
| P01-T14 | Create shared hooks (useMobile, useWindowSize) | IMPLEMENTATION | S | P00-T01 |
| P01-T15 | Create test mocks (DB, cache) | IMPLEMENTATION | M | T01, T03 |
| P01-T16 | Verification gate G01 | VERIFICATION | S | ALL |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P00 gate passed; schema defined; types exported |
| Exit | All data functions return correct data from Supabase; cache hit/miss works; rate limiter counts; `pnpm typecheck` passes |

---

## Integration Verification

- Each data function tested against real or mocked Supabase
- `withCache` returns cached value on second call
- Rate limiter increments and blocks after limit
- All exported types match Drizzle schema inference

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-023 | DB client initialization | P01-T01 |
| SEAM-024 | Cache key collisions (standardized key builders) | P01-T03, P01-T04 |
| SEAM-025 | Data access → schema alignment | P01-T06 through P01-T10 |
| SEAM-026 | Request-scoped data context | P01-T05 |
