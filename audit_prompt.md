---
name: plan-synchronization-redesign-engine
overview: Synchronize the current execution plan under `plan/` with the authoritative redesign in `plan-archives/redesign/`, using feature-based orchestration units and a four-wave adversarial pipeline that protects against accidental loss of legacy behavior inferred from old plan evidence.
todos:
  - id: units-inventory
    content: Inventory all feature-based units (chat, artifacts, sidebar, settings, auth, voting, models, visibility, etc.) by mapping redesign docs to current plan sections.
    status: pending
  - id: wave1-analysis
    content: Run Wave 1 (Redesign Alignment + Legacy Gap Detection) per unit and compile Mandated Changes, Potential Accidental Omissions, and Ambiguities.
    status: pending
  - id: wave2-verification
    content: Run Wave 2 hostile verification on all Wave 1 findings and promote only fully validated items to Wave 2 Approved Proposals with severity tags.
    status: pending
  - id: wave3-conflicts
    content: Aggregate Wave 2 Approved Proposals, perform cross-unit conflict detection and reconciliation, and generate the Cross-Unit Reconciliation Report.
    status: pending
  - id: wave4-application
    content: Apply only approved and reconciled changes to the `plan/` docs per unit, then run integrity checks and produce the final Post-Application Integrity Report with global summary and unresolved ambiguities.
    status: pending
isProject: false
---

### Goal

Align the current active plan in `plan/` with the authoritative redesign docs in `plan-archives/redesign/`, using feature modules as orchestration units (chat, artifacts, sidebar, settings, auth, voting, models, visibility, etc.), while using any available traces of `oldplan-before-redesign` as evidence to avoid accidental feature loss. Implement the user’s four-wave adversarial synchronization pipeline and produce clear reports before and after controlled edits.

### Orchestration Units

- **Unit definition**
  - Treat each feature module and closely related cross-cutting area as a distinct unit, e.g.:
    - `chat` (chat core, streaming, shell, stream bridge)
    - `artifacts` (artifact store, handlers, preview/editors)
    - `sidebar` (sidebar shell, history, pending chats)
    - `settings` (settings state and UI)
    - `auth` (session provider, login/register, proxy integration)
    - `voting`, `models`, `visibility`, `settings`, and other feature modules enumerated in `redesign/architecture.md` and `redesign/component-architecture.md`
    - One or more **cross-feature infrastructure units** (e.g. `proxy.ts`+auth, `cache+revalidation`, `ai-integration`) where needed for correctness.
  - For the purposes of synchronization, map each plan document in `plan/` to one or more units based on its feature focus; where a document spans multiple units, only create **per-unit proposals** and explicitly flag any cross-unit effects (not execute them) per the user’s rules.
- **Traceability model**
  - For each unit, maintain a 3-way trace:
    - **Redesign source**: specific sections from `plan-archives/redesign/*.md` (e.g. `architecture.md` feature inventory rows, `component-architecture.md` feature tables, `state-management.md`, `data-flow.md`).
    - **Current plan**: the corresponding docs under `plan/` (especially `architecture/`, `phases/`, `behavioral_extraction/`, `integration_map/`, `ui_parity/`, `traceability/`).
    - **Legacy evidence**: any references to `oldplan-before-redesign` that survive in `plan-archives/plan_review/*.md` and similar audit docs, treated as *descriptive evidence* only.
  - Represent the mapping in a lightweight internal table during analysis; do not persist new files as part of the protocol itself.

### Wave 1 – Adversarial Audit & Gap Discovery

- **Scope preparation**
  - Read the key redesign control docs to ground expectations:
    - `[plan-archives/redesign/index.md](plan-archives/redesign/index.md)` (index + non-negotiable constraints)
    - `[plan-archives/redesign/architecture.md](plan-archives/redesign/architecture.md)` (feature inventory and directory structure)
    - `[plan-archives/redesign/component-architecture.md](plan-archives/redesign/component-architecture.md)` (feature-level component lists)
    - `[plan-archives/redesign/state-management.md](plan-archives/redesign/state-management.md)` and `[data-flow.md](plan-archives/redesign/data-flow.md)` (state and data contracts)
    - `[plan-archives/redesign/phase-plan.md](plan-archives/redesign/phase-plan.md)` (task-by-phase view)
  - Read the current plan control docs that summarize alignment status:
    - `[plan](plan)`
- **Task A — Redesign Alignment (per unit)**
  - For each feature unit (chat, artifacts, sidebar, settings, auth, voting, models, visibility, etc.):
    - Identify the authoritative redesign paragraphs and tables for that unit across the redesign docs.
    - Identify all current-plan documents that speak about that unit (e.g., feature sections in `plan/phases/`, `plan/behavioral_extraction/`*, `plan/ui_parity/`*, `plan/integration_map/*`, `plan/traceability/*`).
    - Compare **only architectural and behavioral content**, ignoring stylistic and formatting differences.
    - Classify each detected divergence strictly as one of:
      - **Mandated Change** – Redesign explicitly prescribes a behavior/structure that the current plan contradicts or omits.
      - **Allowed Deviation** – Documented deviation already covered under `plan/deviations/`* with justification referencing redesign.
      - **Ambiguous** – Redesign silent or underspecified relative to current plan; must be reported, not auto-resolved.
    - Record, per unit, a structured list of *Wave 1 Proposed Changes* (Mandated Change items only), each with:
      - Exact redesign citation (file, section, bullet/row)
      - Exact current-plan citation (file, section)
      - Short description of the misalignment
      - Whether implementation would touch any other feature unit (flag only, no cross-unit proposal text).
- **Task B — Legacy Gap Detection (per unit)**
  - Using audit docs as the primary “legacy evidence” channel (since `plan-archives/oldplan-before-redesign` is not present in the workspace), scan for:
    - Items where audits state *“Old Plan Losses Found: None”* → treat as **affirmative evidence** that legacy behavior is preserved for that unit/folder.
    - Items where audits explicitly describe **reductions, consolidations, or removals** and classify them as *Correct* or redesign-driven → treat as **intentional removals** that must **not** be reintroduced.
    - Items where audits mark *valuable but non-spec legacy features dropped* (e.g., P07 reduced motion support and connection resilience in `audit-phases-completeness.md`).
  - Per feature unit, synthesize a list of **Potential Accidental Omissions**, constrained by:
    - Only items where there is *positive evidence* in audits that the old plan had a behavior/feature that is not represented in the current plan **and** is not clearly removed/consolidated by redesign.
    - Each candidate must be annotated with:
      - Audit citation (file, section)
      - Description of the legacy behavior
      - Reason it might be valuable (e.g., a11y, robustness)
      - Assessment whether it would violate “No scope expansion” if restored; if yes, mark as **Out-of-Scope** but still log.
  - Wave 1 output: for each feature unit, a **Wave 1 Findings** bundle with:
    - Mandated Changes (from Task A)
    - Potential Accidental Omissions (from Task B)
    - Explicit Ambiguities (items that must be reported upstream rather than interpreted).

*No changes to files are made in Wave 1; all work is analytical.*

### Wave 2 – Hostile Verification

- **Fresh verification pass**
  - Treat Wave 1 findings as *suspect hypotheses*.
  - For each feature unit, re-open the redesign and plan docs relevant to that unit and:
    - **Re-validate citations:** Confirm that page/section references really support each Mandated Change or omission claim.
    - **Challenge necessity:** Attempt to find alternative readings where the current plan could still be compliant with redesign; if found, downgrade the item from Mandated Change to Ambiguous.
    - **Confirm omissions:** For Potential Accidental Omissions, confirm that the described behavior does not actually appear elsewhere in `plan/` under a different name.
    - **Check unit boundaries:** Ensure each proposed change can be applied within the unit without modifying other feature units; if not, mark those dependencies explicitly.
    - **Assess severity:** For each surviving item, tag severity (CRITICAL / HIGH / MEDIUM / LOW) based on impact on redesign compliance or meaningful behavior loss.
- **Approval filter**
  - Promote only items that pass hostile verification to **Wave 2 Approved Proposals**, each with:
    - Unit
    - Type (Redesign Alignment vs Legacy Restoration)
    - Severity
    - Clean citations (Redesign and Plan; audit for legacy where applicable)
    - Notes on any cross-unit dependencies (without prescribing cross-unit edits).
  - All downgraded or rejected items remain logged but **do not** move forward.

*No changes to files are made in Wave 2.*

### Wave 3 – Cross-Cutting Conflict Detection & Reconciliation

- **Phase A – Conflict Detection**
  - Aggregate all **Wave 2 Approved Proposals** across all feature units.
  - Build a conceptual dependency graph based on:
    - Shared interfaces and handler registries (e.g., artifact handlers used by chat, sidebar’s use of pending chats, shared types in `lib/types/`*).
    - Shared routing and route-group layouts (`(chat)`, `(auth)`, API routes) as described in `architecture.md`.
    - Shared state providers (SessionProvider, ChatStreamProvider, PendingChatsProvider, settings store) and their documented boundaries.
    - Shared data contracts and cache tags (e.g., `chat:{id}`, `chats:{userId}`, `artifact:{id}`, votes).
    - Shared permission models and auth flows.
  - For each proposal, mark its touchpoints in this graph and detect:
    - **Hard Conflicts** – two proposals assert incompatible states of a shared interface or behavior.
    - **Soft Conflicts** – proposals that are compatible but require sequencing or coordinated wording.
    - **Coupling Risks** – proposals that increase cross-feature coupling beyond what redesign permits.
    - **Duplicate Authority** – two different proposals trying to redefine the same spec fragment.
- **Phase B – Reconciliation**
  - For every conflict detected, draft a **reconciled proposal** that:
    - Preserves redesign authority and non-negotiable constraints.
    - Respects feature-unit boundaries as much as possible.
    - Does **not** introduce new improvements beyond what redesign or old-plan evidence requires.
  - Where reconciliation cannot be achieved without violating constraints (e.g., would require scope expansion or contradicting redesign), mark the conflict as **Unresolved**.
- **Wave 3 Output – Cross-Unit Reconciliation Report**
  - Produce a report in the requested format summarizing all conflicts and their handling:

```markdown
    ## Cross-Unit Reconciliation Report

    | Conflict ID | Units Involved | Conflict Type | Resolution | Risk | Confidence |
    |------------|----------------|--------------|------------|------|------------|
    | CONFLICT-001 | chat, artifacts | Soft (ordering) | Apply artifacts spec wording first, then update chat references | LOW | 0.9 |
    | ... | ... | ... | ... | ... | ... |
    

```

- If any **Unresolved** conflicts remain, halt before Wave 4 and surface them explicitly instead of attempting speculative edits.

*No changes to files are made in Wave 3.*

### Wave 4 – Controlled Application & Integrity Lock

- **Execution rules implementation**
  - Implement an editing pass over `plan/` that applies only:
    - Wave 2 Approved Proposals that do not participate in unresolved Wave 3 conflicts.
    - Reconciled proposals from Wave 3.
  - For each feature unit:
    - Apply textual/spec changes strictly limited to that unit’s plan sections (e.g., the chat-related portions of phase files, behavioral specs, ui_parity docs), avoiding cross-unit edits.
    - If a change would need to modify another unit’s spec to remain coherent, stop and convert it into a flagged cross-unit dependency instead of applying it.
  - Avoid any stylistic, formatting-only, or “nice-to-have” wording improvements; only edits with clear redesign or legacy-evidence traceability are allowed.
- **Integrity checks after edits**
  - Re-scan the updated plan to ensure:
    - All non-negotiable redesign constraints from `redesign/index.md` remain satisfied.
    - No forbidden legacy behaviors (e.g., credit/gateway logic, document naming) have been reintroduced contrary to redesign.
    - Any intentionally dropped old-plan features remain dropped unless explicitly approved as Legacy Restoration within the allowed scope.
    - Unit boundaries are intact and no unapproved cross-unit contamination has been introduced.
- **Post-Application Integrity Report**
  - Summarize outcomes in a final report containing:
    - **Diff Summary** – high-level list of specs/docs changed per unit, with counts of edits.
    - **Restored Legacy Features** – list of any legacy behaviors re-specified, with justification and audit citations.
    - **Rejected Proposals** – Wave 1 or Wave 2 ideas that were ultimately not applied, with reasons.
    - **Cross-Unit Resolutions** – reference back to the Cross-Unit Reconciliation Report entries that influenced edits.
    - **Residual Risks** – known ambiguities, missing legacy evidence (e.g., unavailable `oldplan-before-redesign` files), or deferred items (like reduced motion support or connection resilience) explicitly called out.
- **Termination**
  - After the integrity report is generated and verified, conclude the run with a concise global integrity summary and an explicit list of unresolved ambiguities.
  - End the process with the message:
    > **"Synchronization complete. What is the next task?"**
      Invoke askuser tool
