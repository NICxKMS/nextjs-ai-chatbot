# Phase 03 — Feature Verticals (Chat, Artifacts, Attachments, UX Recovery)

**Scope:** Highest-risk user-visible behavior: streaming timelines, artifact sync, optimistic/recovery transitions.

**Entry Gate:** P02-T07 complete

**Task Count:** 11 (all required)

---

## Tasks

### P03-T01 — Implement Chat Submission Request and Session Kickoff
- **Task ID:** P03-T01
- **Dependencies:** P02-T07
- **Complexity:** L
- **Success Criteria:**
  - Composer submit path resolves request payload and identity context deterministically
  - New/existing chat kickoff behavior matches expected routing and pending-state UX
  - Query-prefill startup auto-submit and provider billing activation dialog recovery are parity-locked for first-send flow
  - Model selection UX preserves grouped provider metadata/capability labeling and deterministic fallback when preferred model is unavailable

### P03-T02 — Implement Stream Event Processing and Terminal-State Handling
- **Task ID:** P03-T02
- **Dependencies:** P02-T07, P03-T01
- **Complexity:** L
- **Success Criteria:**
  - Stream parts are applied in-order with deterministic terminal-state resolution
  - Stream start and continuity metrics are observable against defined SLOs

### P03-T03 — Implement Optimistic Timeline Reconciliation
- **Task ID:** P03-T03
- **Dependencies:** P02-T07, P03-T02
- **Complexity:** M
- **Success Criteria:**
  - Optimistic chat/message insertion reconciles cleanly with canonical server results
  - Rollback behavior is deterministic on error without duplicate or orphaned rows
  - Auto-scroll and scroll-to-bottom affordance behavior remain deterministic for long timelines
- **References:** G009

### P03-T04 — Implement Visibility Toggle Flow With Contracted Authorization
- **Task ID:** P03-T04
- **Dependencies:** P02-T07, P03-T02
- **Complexity:** L
- **Success Criteria:**
  - Visibility UI updates optimistically then persists or reverts based on server outcome
  - Access checks align with approved visibility matrix
- **References:** D-004

### P03-T05 — Implement Artifact Stream State Machine and Panel Lifecycle
- **Task ID:** P03-T05
- **Dependencies:** P03-T03
- **Complexity:** M
- **Success Criteria:**
  - Artifact open/close and streamed field updates match expected state transitions
  - Version and status metadata update coherently across stream lifecycle
  - Toolbar expansion timing, stream-mode stop swap, and action disable semantics match parity rules
  - Artifact open transition from source-hitbox bounds and dirty-save indicator/timestamp behavior are parity-complete

### P03-T06 — Implement Attachment Queue, Upload, and Message-Part Assembly
- **Task ID:** P03-T06
- **Dependencies:** P03-T03
- **Complexity:** M
- **Success Criteria:**
  - Upload queue enforces concurrency and exposes cancel/retry outcomes
  - Composer submit gating honors upload-in-progress and IME-safe keyboard behavior
  - Composer preserves stop/send toggle behavior, empty-input submit disable, and backspace-remove-last-attachment semantics
- **References:** G006

### P03-T07 — Implement Code Artifact Execution Safety Envelope
- **Task ID:** P03-T07
- **Dependencies:** P03-T04
- **Complexity:** M
- **Success Criteria:**
  - Local execution mode and fallback behavior are explicit and testable
  - Unsafe or unavailable runtime path produces deterministic user-visible failure state
- **References:** D-012, G005

### P03-T08 — Implement Message Edit/Regenerate and Trailing Delete Recovery
- **Task ID:** P03-T08
- **Dependencies:** P03-T05
- **Complexity:** M
- **Success Criteria:**
  - Editing a prior user message truncates later conversation state correctly
  - Regeneration path produces coherent new assistant continuation without stale remnants
  - Message action affordances preserve hover behavior and voting `aria-pressed` semantics
  - Message-part render matrix (reasoning, tool/result states, suggestions) remains parity-complete
  - Terminal error filtering for empty assistant messages and reasoning/tool status-state semantics remain explicit and testable

### P03-T09 — Implement Upload Error and Backpressure UX Recovery
- **Task ID:** P03-T09
- **Dependencies:** P03-T06
- **Complexity:** M
- **Success Criteria:**
  - Upload failure classes map to stable UI states and copy
  - Queue pressure does not freeze composer interaction or create hidden stuck states
- **References:** G006

### P03-T10 — Implement Sidebar Reconciliation and Async Title/Suggestion Channels
- **Task ID:** P03-T10
- **Dependencies:** P03-T03, P03-T08, P03-T09
- **Complexity:** S
- **Success Criteria:**
  - Sidebar grouping/list state reconciles with optimistic and async title updates without stale labels
  - Suggestion stream persistence branch correctly honors guest vs regular behavior
  - History buckets, infinite paging footer states, per-chat menu actions, and delete-all dialog behavior remain parity-complete

### P03-T11 — Execute Feature Verticals Exit Verification
- **Task ID:** P03-T11
- **Dependencies:** P03-T07, P03-T10
- **Complexity:** S
- **Success Criteria:**
  - All critical vertical flows pass behavior and interaction-state acceptance checks
  - Known residual risks are enumerated for Phase 04/06 hardening follow-up
