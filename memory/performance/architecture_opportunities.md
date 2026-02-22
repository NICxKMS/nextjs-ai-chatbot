# Performance Architecture Opportunities

## Objective

Translate behavioral/spec findings into concrete architecture decisions that improve performance while preserving product behavior.

## Opportunity Register


| ID     | Opportunity                                                          | Architecture decision                                                                                                                                    | Expected performance effect                                                                                  | Phase impact  | Evidence/risk linkage                           |
| ------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------- |
| PA-001 | Single AI capability policy authority                                | Create one server-shared policy module consumed by route layer and UI (typed export, no duplicated rule logic).                                          | Reduce avoidable validation/rejection loops; lower guard+policy overhead by 10-25% on chat path.             | Phase 1, 3, 5 | G002, A3 ambiguity, SI-008                      |
| PA-002 | Two-tier chat request pipeline                                       | Split `POST /api/chat` into fast preflight lane (auth/validation/policy) and async side-effect lane (title/usage/persistence updates already decoupled). | Improve p95 first-stream-event by 150-350ms under load by minimizing synchronous pre-model work.             | Phase 3, 5    | Data Flow 1 primary loop, AI streaming behavior |
| PA-003 | Explicit stream event budget + handler batching                      | Define max per-event parsing work; batch UI state writes per animation frame where safe.                                                                 | Lower long-task frequency during streams; improve perceived smoothness and artifact delta responsiveness.    | Phase 3, 4, 6 | Feature 2/9, Data Flow 13                       |
| PA-004 | Contract-first pagination default                                    | Make paginated messages/history canonical as the only supported mode.                                                                                    | Avoid unbounded payload growth and reduce memory/render pressure for long chats.                             | Phase 5, 6    | G004, A2 ambiguity, API contracts               |
| PA-005 | Cache key and namespace unification for artifact/document transition | Introduce canonical key namespace only (no alias layers or deprecated key surfaces).                                                                     | Reduce cache fragmentation and lookup/mapping overhead; improve document/artifact read hit-rate consistency. | Phase 2, 5    | G003, SI-003                                    |
| PA-006 | Guard cost flattening                                                | Consolidate common route guard sequence into composable, cached request context primitives (session, ownership surface, policy snapshot).                | Reduce repetitive guard work and branch duplication; target <= 50ms p95 guard+policy overhead.               | Phase 1, 5    | Feature 2 route guard framework, PR-013         |
| PA-007 | Upload queue backpressure contract                                   | Define bounded client concurrency, cancellation semantics, and jittered retries with strict retry budget.                                                | More stable multi-file upload latency and reduced UI stall during attachment-heavy prompts.                  | Phase 3, 6    | G006, Feature 10                                |
| PA-008 | Client bundle containment for AI/artifact surfaces                   | Keep heavy editors and artifact tooling dynamically loaded; cap wrapper logic to presentation/state adapter role.                                        | Reduce initial route JS cost and hydration contention during chat startup.                                   | Phase 4, 6    | Feature 8 frontend perf architecture, SI-008    |
| PA-009 | Stream-aware observability baseline                                  | Add metrics for stream start, inter-chunk gap, handler apply latency, and resume-hit ratio.                                                              | Faster detection of regressions and precise rollback criteria during migration phases.                       | Phase 1, 6    | AI behavior streaming, Data Flow 5/13           |
| PA-010 | Guest-mode fail-fast UX envelope                                     | Preserve cache-only semantics but explicitly optimize and message failure paths (fast rejects + clear user guidance).                                    | Prevent long hangs on guest dependency failures; improve recoverability perception.                          | Phase 1, 3, 5 | Edge cases E/G, G007                            |


## Regression-Prone Spec Patterns (Performance Lens)

1. **Cross-document route policy drift (SI-007):**
  inconsistent limiter classes can create accidental throttling hotspots or insufficient protection leading to overload cascades.
2. **Incomplete artifact/document unification (SI-003):**
  dual naming across schema/routes/tools encourages translation layers and cache misses on hot artifact paths.
3. **Weakly defined slim-route boundary (SI-005):**
  unclear responsibility may allow business logic creep into routes, increasing synchronous request latency.
4. **Feature boundary loopholes (SI-006):**
  action-only cross-feature imports without strict enforcement can grow coupling and runtime overhead through unnecessary dependency loading.
5. **Wrapper logic ceiling ambiguity (SI-008):**
  if wrappers absorb feature workflows, stream-driven UI paths can rerender more broadly and inflate bundle/runtime cost.

## Better-Than-Spec Approaches Worth Adopting

- Prefer **public-boundary barrels only** (not universal barrels) to reduce accidental cycle risk and unnecessary module loading surfaces.
- Prefer **canonical paginated contracts only**, rather than keeping co-equal or fallback legacy/full response modes.
- Prefer **single-source policy compilation** for model/tool/attachment checks to avoid duplicated branch costs and mismatch retries.

## Implementation Notes By Phase

- **Phase 1:** establish policy authority, request-context guard utilities, and metric taxonomy first.
- **Phase 2:** finalize cache namespace and repository-level read/write performance invariants.
- **Phase 3-4:** enforce stream handler cost budgets and optimize optimistic update paths.
- **Phase 5:** lock route contract defaults (pagination, payload limits, resume semantics) with explicit SLO assertions.
- **Phase 6:** run stream soak + latency regression suites with release gates on p95 targets.

## Conclusions

- The highest-impact architecture opportunities are policy centralization, preflight-path minimization, and stream handler cost control.
- Most major regression risks come from unresolved spec ambiguities, not from missing raw optimization techniques.

