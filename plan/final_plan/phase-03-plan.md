# Phase 03 — Chat Core

> Primary vertical slice: AI provider registry, settings, streaming, message display, input, tools, pages.

---

## Objective

Build the complete chat experience end-to-end: AI provider registry with 6 providers, streaming chat completion, message display with reasoning support, multimodal input, chat tools (weather, createDocument/updateDocument/requestSuggestions stubs), DataStream infrastructure, settings module, and all chat pages. After this phase, users can send messages and receive streaming AI responses.

**Entry state:** P02 complete — auth works, data layer ready, session resolution functional
**Exit state:** Users can chat with AI, see streaming responses with reasoning, use weather tool; settings persist
**Est. duration:** ~4 days
**Tasks:** 24

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P03-T01 | AI provider registry (6 providers) | IMPLEMENTATION | L | P01-T16 |
| P03-T02 | AI provider wrapper + reasoning middleware | IMPLEMENTATION | L | T01 |
| P03-T03 | AI model discovery | IMPLEMENTATION | M | T01 |
| P03-T04 | Settings module (localStorage + pub/sub) | IMPLEMENTATION | M | P00-T08 |
| P03-T05 | Chat Zod schemas | IMPLEMENTATION | M | P00-T08 |
| P03-T06 | System prompt composition | IMPLEMENTATION | M | T04 |
| P03-T07 | Chat completion orchestrator | IMPLEMENTATION | L | T02, T06 |
| P03-T08 | Chat tools (weather + artifact stubs) | IMPLEMENTATION | M | T05 |
| P03-T09 | Stream chat server action | IMPLEMENTATION | L | T07, T08, P02-T01 |
| P03-T10 | Message persistence actions | IMPLEMENTATION | M | P01-T08 |
| P03-T11 | Chat hooks (useMessages, useScrollToBottom) | IMPLEMENTATION | M | P00-T08 |
| P03-T12 | DataStream infrastructure (Provider + Handler) | IMPLEMENTATION | L | P00-T08 |
| P03-T13 | Empty state (Greeting + SuggestedActions) | IMPLEMENTATION | S | P00-T11 |
| P03-T14 | Message display components | IMPLEMENTATION | L | T11, P00-T12 |
| P03-T15 | Message interaction (actions, editor) | IMPLEMENTATION | M | T14 |
| P03-T16 | Messages list component | IMPLEMENTATION | L | T14, T15, T11 |
| P03-T17 | Multimodal input component | IMPLEMENTATION | L | P00-T12 |
| P03-T18 | Chat header + weather display | IMPLEMENTATION | M | P00-T11 |
| P03-T19 | Chat orchestrator (wires everything) | INTEGRATION | L | T04, T11, T12, T16, T17, T18 |
| P03-T20 | Chat API route (POST /api/chat) | IMPLEMENTATION | M | T07, T05, P02-T01 |
| P03-T21 | Chat layouts (server + client split) | INTEGRATION | L | P02-T01, T12 |
| P03-T22 | Chat pages (new + existing) | IMPLEMENTATION | M | T19, T21 |
| P03-T23 | Chat error states | IMPLEMENTATION | S | T21 |
| P03-T24 | Verification gate G03 | VERIFICATION | S | ALL |

---

## Patch Notes (Traceability Gap Fixes)

| Task | Gap | Patch |
|------|-----|-------|
| P03-T16 | AutoScroll setting wire | `autoScroll` from `useSettingsSnapshot` controls FAB and `followOutput` mode |
| P03-T19 | Credit/usage alert UI | `data-usage` stream part triggers non-dismissable `AlertDialog` on credit depletion |
| P03-T22 | URL query auto-send | New chat page reads `?q=` search param, auto-submits via `useChat.append()` |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P02 gate passed; auth works; data layer operational |
| Exit | Send message → stream AI response → persist; weather tool works; settings persist in localStorage; `pnpm typecheck` passes |

---

## Integration Verification

- Send message, receive streaming response with text deltas
- Reasoning tokens display in collapsible section
- Weather tool invocation shows result UI
- Settings panel changes affect chat completion parameters
- DataStreamHandler processes all custom data parts
- Chat pages navigate correctly (new chat at `/`, existing at `/chat/[id]`)

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-006 | Chat request pipeline (client → server → SSE) | P03-T09, T19, T20 |
| SEAM-007 | DataStream pipeline (server → provider → handler → SWR) | P03-T12 |
| SEAM-008 | Chat completion execution (model + tools + settings) | P03-T07, T09 |
| SEAM-015 | Settings pipeline (localStorage → request → server) | P03-T04, T19 |
| SEAM-028 | Client error handling (onError, toast) | P03-T19, T23 |
| SEAM-029 | Provider tree assembly (chat level) | P03-T21 |
| SEAM-031 | URL state management | P03-T19, T22 |
| SEAM-038 | Message edit + regenerate flow | P03-T10, T15 |
