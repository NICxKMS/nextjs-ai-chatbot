# Phase 05 — Sidebar & History

> Sidebar navigation: chat history with infinite scroll, optimistic updates, date grouping, user nav, chat switching.

---

## Objective

Implement the complete sidebar experience: optimistic chats provider with Set-based dedup, sidebar skeleton, user navigation with theme toggle, history item with dropdown actions, history list with SWRInfinite + GroupedVirtuoso, app sidebar shell, history API route, and wire everything into the chat layout provider tree.

**Entry state:** P04 complete — chat + artifacts work, messages stream, documents created
**Exit state:** Full sidebar navigation works — chat switching, history loading, creation, deletion, title syncing
**Est. duration:** ~2 days
**Tasks:** 12

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P05-T01 | Create optimistic chats provider | IMPLEMENTATION | L | P00-T08 |
| P05-T02 | Create sidebar skeleton | IMPLEMENTATION | S | P00-T11 |
| P05-T03 | Create sidebar user nav | IMPLEMENTATION | M | P00-T11, P02-T07 |
| P05-T04 | Create sidebar history item | IMPLEMENTATION | M | P00-T11 |
| P05-T05 | Create sidebar history list (SWRInfinite) | IMPLEMENTATION | L | T01, T04, P00-T11 |
| P05-T06 | Create app sidebar shell | IMPLEMENTATION | M | T03, T05, P00-T11 |
| P05-T07 | Create history API route (GET/DELETE) | IMPLEMENTATION | M | P01-T07, P02-T01 |
| P05-T08 | Wire optimistic chats into chat | INTEGRATION | M | T01, P03-T19 |
| P05-T09 | Wire title sync flow | INTEGRATION | M | T05, T08 |
| P05-T10 | Wire sidebar into chat layout | INTEGRATION | L | T01, T02, T06, P03-T21 |
| P05-T11 | Move sidebar toggle to feature | IMPLEMENTATION | S | P00-T13 |
| P05-T12 | Verification gate G05 | VERIFICATION | S | ALL |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P04 gate passed; chat + artifacts functional |
| Exit | Sidebar loads chat history with pagination; chat switching works; optimistic entries appear instantly; title syncs from stream; delete removes chats |

---

## Integration Verification

- Sidebar loads 20 chats per page with infinite scroll
- Date grouping: Today, Yesterday, Last 7 days, Last 30 days, Older
- Optimistic entry appears in sidebar before server confirms
- Title updates flow: stream → optimistic update → poll → SWR revalidation
- Delete chat removes from list and redirects if active
- Mobile: sidebar as overlay sheet

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-013 | Optimistic chat creation | P05-T01, T08 |
| SEAM-014 | Title sync (stream + poll + event) | P05-T09 |
| SEAM-020 | Sidebar history pagination | P05-T05, T07 |
| SEAM-030 | Theme system (toggle in user nav) | P05-T03 |
