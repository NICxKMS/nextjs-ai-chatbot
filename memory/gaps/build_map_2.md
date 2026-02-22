# Build Map 2 (B033-B060)

## Scope
API contracts, operational/security boundaries, cache/consistency behavior, and ambiguity-driven edge cases.

## Mapping Table
| ID | Behavior (oldapp) | Source | Build target + pattern/deviation | Status | Reasoning and conclusion |
|---|---|---|---|---|---|
| B033 | History read path with guest cache-only and regular DB fallback | @behavioral_spec/data_flows_1.md#flow-6-chat-history-read-path | `app/api/history`, repositories; P1 + P3 | Covered | Repository cache-through and route delegation map directly. |
| B034 | Per-chat delete transaction semantics + client reconciliation | @behavioral_spec/data_flows_1.md#flow-7-chat-deletion-paths | `app/api/chat`, `lib/data/chat.repository`; P3 | Partial | Transaction and delete path are spec-compatible; optimistic UI reconciliation is not explicit. |
| B035 | Delete-all chats across guest/regular branches | @behavioral_spec/data_flows_1.md#flow-7-chat-deletion-paths | `app/api/history`, repositories; P1 + P3 | Covered | Behavior aligns with route + repository patterns. |
| B036 | Visibility update action with revalidation | @behavioral_spec/data_flows_1.md#flow-8-visibility-update | `features/chat/actions`, App Router revalidation | Partial | Action orchestration fits, but exact revalidation contract is not specified in spec facts. |
| B037 | Attachment lifecycle (upload -> metadata -> message parts) | @behavioral_spec/data_flows_2.md#flow-6-file-attachment-lifecycle | upload route + chat compose pipeline; P1 + P2 | Covered | Route and schema constraints align; compose integration is implementation detail. |
| B038 | Artifact creation tooling stream + persistence | @behavioral_spec/data_flows_2.md#flow-7-artifact-creation-through-ai-tooling | `lib/ai/tools`, artifact feature, repository; P6 + P9 | Partial | Event model fits; canonical artifact naming/ID policy is decision-closed and must be enforced across tooling + persistence. |
| B039 | Artifact update as append-only version write | @behavioral_spec/data_flows_2.md#flow-8-artifact-update-through-ai-tooling | artifact feature + repositories; P3 + P6 + P9 | Partial | Versioned repository behavior maps, naming drift still unresolved. |
| B040 | Suggestion generation streamObject + persistence split | @behavioral_spec/data_flows_2.md#flow-9-suggestion-generation-lifecycle | tool pipeline + suggestions route; P6 + P3 | Partial | Streaming is spec-supported; canonical naming decision is closed and must be reflected in suggestion key contracts. |
| B041 | Document version read/save/delete-after-timestamp | @behavioral_spec/data_flows_2.md#flow-10-document-crudversion-flows | document/artifact repository + routes; P1 + P3 | Partial | CRUD semantics fit repository pattern, but "document vs artifact" endpoint contract still mixed. |
| B042 | Vote flow chat/message consistency checks | @behavioral_spec/data_flows_2.md#flow-11-voting-flow | `app/api/vote`, `features/chat/actions`; P2 + P5 | Covered | Guard composition and typed errors support this behavior. |
| B043 | Edit/regenerate via delete trailing messages | @behavioral_spec/data_flows_2.md#flow-12-message-editregenerate-path | `features/chat/actions`, data layer transactions; P3 | Covered | Transactional deletion and regenerate orchestration align. |
| B044 | Stream-to-artifact state synchronization with indexed delta processing | @behavioral_spec/data_flows_2.md#flow-13-data-stream-to-artifact-state-synchronization | stream provider/handler + UI state; P6 + P11 | Covered | Pattern match is direct and high-confidence. |
| B045 | Runtime model availability discovered from configured providers | @behavioral_spec/ai_behaviors.md#1-model-availability-and-runtime-discovery | `lib/ai/models`, settings defaults; P10 | Partial | Dynamic discovery is represented, but canonical fallback policy scope is not fully constrained. |
| B046 | Provider-specific reasoning option mapping and extraction middleware | @behavioral_spec/ai_behaviors.md#2-model-identity-reasoning-and-provider-options | `lib/ai/providers`, middleware | Uncovered | Spec patterns do not define provider-option matrix governance; behavior is implementation-specific. |
| B047 | Prompt composition includes geo + optional user prompt + artifact branch | @behavioral_spec/ai_behaviors.md#3-system-prompt-composition | `features/chat/actions`, AI service layer | Partial | Layering supports composition; prompt assembly contract detail is unspecified. |
| B048 | Streaming completion with timeout, step cap, usage enrichment events | @behavioral_spec/ai_behaviors.md#4-streaming-completion-pipeline | chat execute action + provider/handler; P6 | Covered | Stream lifecycle pattern supports this strongly. |
| B049 | Active tool gating by model capability policy | @behavioral_spec/ai_behaviors.md#5-tooling-behavior-in-chat-generation | `lib/ai/policy`, chat route | Partial | Single-source policy authority is decision-closed (`lib/ai/capability-policy`); implementation remains in Phase 1/3/5. |
| B050 | Artifact generation by kind-model mapping | @behavioral_spec/ai_behaviors.md#7-artifact-generation-model-behavior | artifact handlers + tool layer; P6 + P9 | Partial | Architecture can host this, but naming and handler authority boundaries are still mixed. |
| B051 | Async title generation and transient title stream event | @behavioral_spec/ai_behaviors.md#8-title-generation-behavior | chat action + stream channel; P6 | Partial | Event transport is supported; race-resolution behavior is not explicitly spec-locked. |
| B052 | Quota/day-limit checks before generation and async increments | @behavioral_spec/ai_behaviors.md#9-quotaentitlement-interaction-with-ai-calls | `lib/rate-limit`, chat action | Covered | Fits edge + route policy with pre-generation gating. |
| B053 | AI-path fallback mapping for provider billing/offline/unhandled | @behavioral_spec/ai_behaviors.md#10-error-and-fallback-semantics-in-ai-path | `lib/errors`, route error boundary; P5 | Partial | AppError pattern supports taxonomy, but exact code mapping catalog is not canonicalized in spec. |
| B054 | API error envelope `{code,message,cause?}` and typed code taxonomy | @behavioral_spec/api_contracts.md#conventions | `lib/errors`, route helpers; P5 | Covered | This is directly aligned to standardized error architecture. |
| B055 | API contract split: legacy and paginated message retrieval modes | @behavioral_spec/api_contracts.md#3-get-apichatidmessages | `app/api/chat/[id]/messages`, schemas | Partial | Canonical pagination-only contract is decision-closed; route and fixtures must enforce a single payload mode. |
| B056 | Health endpoint degraded/unhealthy distinctions plus proxy liveness fast-path (`/ping`) | @behavioral_spec/api_contracts.md#13-get-apihealth | `app/api/health`, proxy operational checks | Partial | Operational checks are expected, but concrete degraded criteria and proxy-liveness fixture coverage are underspecified in architecture docs. |
| B057 | CSRF + IP rate-limit on auth mutations | @behavioral_spec/api_contracts.md#14-post-apiauthguest | auth routes + middleware; P2 + P4 | Covered | Guard and edge policy strongly fit this behavior. |
| B058 | Public chat access semantics for non-owner readers | @behavioral_spec/edge_cases_1.md#a1-public-chat-access-semantics-uncertain | visibility policy layer; deviation SI-005 | Partial | Visibility authorization matrix is decision-closed and now requires consistent route + UI enforcement. |
| B059 | Payload/schema drift risk between tests and runtime | @behavioral_spec/edge_cases_1.md#a2-test-vs-runtime-schema-drift-risk | validation + test policy; deviation SI-004 | Partial | Canonical payload fixtures and pagination-only response policy are decision-closed; test/runtime contract enforcement remains. |
| B060 | Guest durability expectations and UX disclosure | @behavioral_spec/edge_cases_1.md#a4-guest-durability-expectations | auth UX + history UX + product copy | Partial | Guest lifecycle and durability messaging contract is decision-closed and now needs explicit UX copy + route enforcement. |

## Section Reasoning
- Contract-level behaviors map well where route/guard/repository patterns are explicit.
- Uncovered items are primarily policy-definition gaps, not implementation-mechanics gaps.
- Ambiguity sections in behavioral memory map to decision-closed gaps and now act as implementation gates.

## Section Conclusion
For B033-B060, implementation shape is mostly available, and the decision baseline is now closed; release risk shifts to strict execution and verification fidelity.
