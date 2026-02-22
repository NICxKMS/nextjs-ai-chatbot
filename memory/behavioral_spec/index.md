# Behavioral Spec Index (oldapp reference)

Source analyzed: `oldapp/` (routes, lib, components, proxy, tests, docs).
Purpose: capture behavioral requirements only (no code migration guidance).

## Scope And Evidence
- Complete feature behavior extracted from `app/`, `components/`, `hooks/`, `lib/`, `artifacts/`, `tests/`.
- API contracts and constraints primarily from route handlers plus request schemas and guards.
- AI behavior derived from model registry, provider wiring, completion pipeline, tools, artifact handlers, and tests.
- Known uncertainty is explicitly tracked in edge-case docs for downstream gap analysis.

## Domain Files
- Feature inventory, UX states, permissions: @behavioral_spec/features_1.md#feature-inventory-core-ux-and-product-surface
- Supporting capabilities and operational features: @behavioral_spec/features_2.md#feature-inventory-platform-security-and-operations
- End-to-end user/data state transitions (auth/chat/stream): @behavioral_spec/data_flows_1.md#flow-1-session-bootstrap-and-identity-resolution
- Document/artifact/history/vote/file workflows: @behavioral_spec/data_flows_2.md#flow-6-file-attachment-lifecycle
- API routes, inputs, outputs, errors, guard rails: @behavioral_spec/api_contracts.md#api-contract-catalog
- AI SDK behavior, model/tool policy, streaming, reasoning: @behavioral_spec/ai_behaviors.md#ai-behavior-catalog
- Error/loading/empty and boundary behaviors + ambiguities: @behavioral_spec/edge_cases_1.md#edge-case-catalog

## Coverage Checklist
- Features by area: covered in `features_*.md`.
- User/data flows: covered in `data_flows_*.md`.
- API contracts and error handling: covered in `api_contracts.md`.
- AI model/stream/tool/reasoning behavior: covered in `ai_behaviors.md`.
- Edge/loading/empty/boundary states and ambiguous semantics: covered in `edge_cases_1.md`.

## Uncertainty Tracking Pointers
- Public chat read/resume behavior is partially contradictory between implementation and tests: @behavioral_spec/edge_cases_1.md#a1-public-chat-access-semantics-uncertain
- Route tests include payload shapes that may be stale vs current schemas: @behavioral_spec/edge_cases_1.md#a2-test-vs-runtime-schema-drift-risk
- Model list and defaults are runtime/env dependent, so exact available model set is deployment-specific: @behavioral_spec/ai_behaviors.md#model-availability-and-runtime-discovery
