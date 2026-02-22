# Phase 04 — Shared UI Composition And Wrapper Compliance

**Scope:** Enforce wrapper boundaries and parity-critical interaction details.

**Entry Gate:** P03-T11 complete

**Task Count:** 7

---

## Tasks

### P04-T01 — Audit Shared UI Surface Against Wrapper Boundary Rules
- **Task ID:** P04-T01
- **Dependencies:** P03-T11
- **Complexity:** M
- **Success Criteria:**
  - Shared wrapper responsibilities and forbidden business-logic boundaries are explicit
  - Violations are categorized by severity and mapped to remediation tasks

### P04-T02 — Refactor Wrapper Interfaces to Consume Policy Authorities Only
- **Task ID:** P04-T02
- **Dependencies:** P04-T01
- **Complexity:** M
- **Success Criteria:**
  - Wrappers consume centralized capability policy contracts rather than embedding custom policy logic
  - Wrapper APIs remain presentation/state adapters without feature orchestration bleed
  - Settings sheet sections and toggle semantics (`aria-pressed`, reset, close) are explicitly preserved
- **References:** D-006, SI-008

### P04-T03 — Enforce AI Elements Read-Only Consumption Path
- **Task ID:** P04-T03
- **Dependencies:** P04-T01
- **Complexity:** S
- **Success Criteria:**
  - Feature/app imports resolve through `components/ai` wrappers only
  - Direct `ai-elements` consumption outside wrappers is prohibited and testable
  - Inline document/editor parity checks include per-kind skeletons and text/code/sheet/diff behavior matrix coverage

### P04-T04 — Validate Keyboard and Accessibility Interaction Contracts
- **Task ID:** P04-T04
- **Dependencies:** P04-T02, P04-T03
- **Complexity:** M
- **Success Criteria:**
  - Required keyboard flows (sidebar shortcut, enter/shift-enter behavior) are covered by acceptance checks
  - Screen-reader labels and live-region semantics are verified for key controls

### P04-T05 — Validate Responsive Shell and Sidebar Parity Contracts
- **Task ID:** P04-T05
- **Dependencies:** P04-T02, P04-T03
- **Complexity:** M
- **Success Criteria:**
  - Desktop collapse/mobile sheet transitions and persistence behavior are stable
  - Header/shell behavior across breakpoints matches parity expectations
  - User navigation menu preserves hydration placeholder, avatar seed behavior, and auth/dropdown actions
  - Root shell parity includes `h-dvh`, tooltip delay behavior, and runtime theme-color updates
  - Root shell parity preserves viewport `maximumScale: 1`, loading-copy behavior, and route-notice toast + URL-cleanup sequencing
  - Chat layout parity preserves lazy sidebar skeleton/children suspense behavior and reconciles initial sidebar/mobile hint contract deterministically
  - Root shell parity preserves head-network-hint policy (`preconnect`/`dns-prefetch`) for critical external domains
  - Head network hints explicitly include: `cdn.jsdelivr.net`, `va.vercel-scripts.com`, `vitals.vercel-insights.com`, `fonts.gstatic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, and `api.open-meteo.com`
  - New-chat header control composition and staged greeting/suggestion entrance behavior are preserved

### P04-T06 — Validate Stream-Driven Render Performance on Shared Surfaces
- **Task ID:** P04-T06
- **Dependencies:** P04-T04
- **Complexity:** M
- **Success Criteria:**
  - Stream-related long-task and frame-drop budgets are measurable and within targets
  - Shared wrapper changes do not broaden rerender surfaces unexpectedly

### P04-T07 — Execute Shared UI Compliance Exit Verification
- **Task ID:** P04-T07
- **Dependencies:** P04-T05, P04-T06
- **Complexity:** S
- **Success Criteria:**
  - Wrapper boundary, accessibility, responsive, and interaction-state checks all pass
  - Final UI/UX parity status is explicitly `same` or `improved` versus oldapp, with no regressions
  - Remaining UI risks are explicitly handed off to Phase 06 hardening tests
  - Toast shell parity (type icon, multiline alignment, compact responsive width) is included in the compliance sign-off checklist
