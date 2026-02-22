# Performance Requirements

## Scope
These requirements preserve oldapp behavioral performance characteristics during migration and reduce regression risk from known spec gaps.

## Measurement Notes
- Use p50/p95/p99 where feasible.
- Measure from production-like environments with representative Redis/DB/provider latency.
- Streaming metrics must include server emit and client render milestones.

## Requirements Register
| ID | Requirement | Target (measurable) | Behavioral evidence | Impacted phases |
|---|---|---|---|---|
| PR-001 | Chat stream start latency (`POST /api/chat`) | p95 time-to-first-stream-event <= 1.2s; p99 <= 2.0s | Streaming-first primary loop with incremental UI consumption and optimistic sidebar creation | Phase 3, 5, 6 |
| PR-002 | Chat stream continuity | Mid-stream gap p95 <= 350ms between emitted chunks (excluding provider idle spans); client stream error rate < 1% | SSE stream carries both content and state events (`usage`, `title`, artifacts) and must remain synchronized | Phase 3, 5, 6 |
| PR-003 | Chat API request overhead before model invocation | p95 pre-generation pipeline <= 250ms (auth + validation + limits + ownership + data prefetch) | Server performs guard/limit/quota/ownership and parallel prefetch before generation | Phase 1, 3, 5 |
| PR-004 | Stream resume endpoint responsiveness (`GET /api/chat/[id]/stream`) | p95 <= 200ms for "empty stream" responses and <= 300ms for resumable append event | Resume is intentionally short-window and should be lightweight reconnect support | Phase 3, 5, 6 |
| PR-005 | History pagination latency (`GET /api/history`) | p95 <= 250ms for first page and <= 300ms for subsequent pages | Sidebar infinite history with virtualized grouped rendering and optimistic merge/reconcile | Phase 2, 3, 5, 6 |
| PR-006 | Message fetch latency (`GET /api/chat/[id]/messages`) | p95 <= 300ms for canonical paginated mode | Canonical paginated response is the only supported shape; must remain fast under growth | Phase 2, 5, 6 |
| PR-007 | Document/artifact version read latency (`GET /api/document`) | p95 <= 300ms for <= 200 versions; p99 <= 600ms | Artifact workspace depends on timely version reads and diff interactions | Phase 2, 3, 5, 6 |
| PR-008 | File upload request performance (`POST /api/files/upload`) | p95 server processing overhead <= 450ms excluding network transfer; validation failure response <= 150ms p95 | Multi-file bounded-concurrency upload queue with explicit MIME/size checks | Phase 1, 3, 5, 6 |
| PR-009 | UI send interaction responsiveness | Input submit-to-optimistic-row/render <= 100ms p95 on desktop baseline; <= 180ms p95 on mid-tier mobile | First message creates optimistic chat row and immediate stream UI state | Phase 3, 4, 6 |
| PR-010 | Streaming UI render smoothness | During active stream, long tasks > 50ms occur in < 5% of samples; frame drops < 10% in 60s runs | Virtualized timeline + stream delta handlers + artifact side state all update in parallel | Phase 3, 4, 6 |
| PR-011 | Artifact delta application latency | p95 <= 120ms from SSE artifact delta receipt to visible artifact state update | Data stream handler incrementally applies `data-*Delta` and metadata parts | Phase 3, 4, 6 |
| PR-012 | Auth session bootstrap responsiveness | p95 <= 300ms for session resolution on shell load; guest bootstrap fallback p95 <= 500ms | Session bootstrap and optional `/api/auth/guest` call gate initial user flow | Phase 1, 3, 5, 6 |
| PR-013 | Guard and policy lookup overhead | Cumulative route guard + capability policy checks <= 50ms p95 per request | High guard density (auth, ownership, rate limits, non-guest, resource checks) in core routes | Phase 1, 5 |
| PR-014 | Cache fallback degradation envelope | For regular users, cache miss/failure adds <= 200ms p95 vs warm-cache baseline; guest failure behavior must fail fast <= 150ms | Read paths are cache-first; regular users fallback to DB, guests are cache-dependent | Phase 1, 2, 5, 6 |
| PR-015 | Health endpoint responsiveness (`GET /api/health`) | p95 <= 200ms under healthy and <= 350ms under degraded | Operational checks run continuously and drive monitoring confidence | Phase 1, 5, 6 |

## Cross-Cutting Constraints
- Preserve asynchronous decoupling already present in behavior:
  - generation, persistence, title generation, and cache updates must not be serialized into one blocking path.
- Preserve optimistic UI contracts:
  - update -> reconcile -> rollback behavior must remain non-blocking and deterministic.
- Maintain guest/regular branch performance parity on UX-critical paths while respecting different durability models.

## Spec Patterns Likely To Regress Performance
1. **Policy split across UI/backend (G002, A3 ambiguity):**
   duplicate capability checks can create repeated computation, branch mismatch, and retries/rejections after optimistic client acceptance.
2. **Canonical payload enforcement without strong fixture discipline (G004, A2 ambiguity):**
   payload/fixture drift can reintroduce expensive fetch or render paths and degrade large-chat performance.
3. **Artifact/document naming drift (G003, SI-003):**
   mixed naming across layers adds mapper overhead and cache-key fragmentation.
4. **Route policy drift in rate-limit config (SI-007):**
   misaligned route classes can accidentally over-throttle or under-throttle hot paths, causing user-perceived latency spikes.
5. **Wrapper responsibility creep (SI-008):**
   moving feature logic into shared wrappers risks heavier rerender surfaces and larger client bundles.

## Phase Prioritization For Performance
1. **Phase 1 (infra):** policy authority, guard path cost, limiter/classification, observability baselines.
2. **Phase 2 (data):** cache-key strategy, query/index efficiency for history/messages/doc versions.
3. **Phase 3-4 (feature/UI):** optimistic flows, stream handler cost, virtualized render discipline, artifact delta handling.
4. **Phase 5 (API):** endpoint contract performance envelopes and canonical response-shape controls.
5. **Phase 6 (verification):** SLO validation, regression tests, load and stream soak checks.

## Requirement Decisions (Resolved)
| Requirement ID | Decision | Gate classification | Enforcement point |
|---|---|---|---|
| PR-001 | Approved | Release-blocking | Phase 6 SLO + stream tests |
| PR-002 | Approved | Release-blocking | Phase 6 stream continuity checks |
| PR-003 | Approved | Release-blocking | Phase 5 route profiling + Phase 6 validation |
| PR-004 | Approved | Release-blocking | Phase 5 resume contract + Phase 6 regression |
| PR-005 | Approved | Release-blocking | Phase 5 history API + Phase 6 load tests |
| PR-006 | Approved | Release-blocking | Phase 5 message API + Phase 6 contract tests |
| PR-007 | Approved | Release-blocking | Phase 5 artifact API + Phase 6 latency suite |
| PR-008 | Approved | Release-blocking | Phase 5 upload API + Phase 6 reliability tests |
| PR-009 | Approved | Release-blocking | Phase 4 UI instrumentation + Phase 6 UX perf |
| PR-010 | Approved | Release-blocking | Phase 4 rendering budgets + Phase 6 soak runs |
| PR-011 | Approved | Release-blocking | Phase 4 stream handler metrics + Phase 6 perf checks |
| PR-012 | Approved | Release-blocking | Phase 1 auth bootstrap + Phase 6 startup perf |
| PR-013 | Approved | Release-blocking | Phase 1 guard utilities + Phase 5 enforcement |
| PR-014 | Approved | Release-blocking | Phase 2 cache strategy + Phase 6 degradation tests |
| PR-015 | Approved | Release-blocking | Phase 1 health contract + Phase 6 operational tests |

### Decision Notes
- All performance requirements are mandatory release gates in the current plan baseline.
- No fallback or relaxed threshold mode is allowed without a logged deviation and explicit approval.

## Conclusions
- Stream start/continuity and UI responsiveness are the highest-value performance constraints.
- Cache and policy authority decisions are the earliest architectural levers; deferring them increases downstream rework and regression probability.
