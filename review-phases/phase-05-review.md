# Phase 5: Artifact System — Detailed Review (Multi-Agent, Chunked)

- Date: 2026-02-18
- Phase: Phase 5: Artifact System
- Task count: 10
- Chunk files: P5-C1, P5-C2

## Summary

- Status counts: Completed=4, Partial=5, Incorrect=1, Missing=0
- Difference counts: defect=2, partial=4, other-problem=1, improvement=1, no-difference=2

## Task Matrix

| Task | Name | Status | Difference Type | Detail |
|---|---|---|---|---|
| 5.1 | Create ArtifactMessages Component | Partial | partial | `ArtifactMessages` exists and is integrated into the artifact panel, but messages are rendered from the full `messages` array without artifact-specific filtering logic required by the plan. |
| 5.2 | Create Artifact Class & Registration System | Partial | partial | A class-based registry (`registerArtifact`/`getArtifactDefinition`) is implemented, but plan-required pieces are incomplete: no `getArtifactIcon(kind)` helper, no explicit exported `artifactKinds` registration map of built-ins, and interface contract differs from the planned `kind/title/description/component/handler/model` shape. |
| 5.3 | Add MultimodalInput to Artifact Panel | Completed | no-difference | `MultimodalInput` is imported and rendered in artifact panel layout beneath artifact messages, wired to chat context and attachment props (`attachments`, `setAttachments`, `sendMessage`). |
| 5.4 | Add Toolbar to Artifact Panel | Incorrect | defect | Artifact panel uses `features/chat/components/toolbar.tsx` (not a dedicated artifact toolbar module), and the implemented toolbar only provides the text 'Adjust reading level' tool with empty tools for other kinds; required actions (Undo/Redo/Copy/Download/Version History), keyboard shortcuts, and action-group separators are not implemented. |
| 5.5 | Fix Artifact Actions Implementation | Partial | defect | Copy and version navigation actions are implemented in `ArtifactActions`, but download behavior and version-comparison modal are missing, and artifact actions are rendered in the header while toolbar remains a separate tool system rather than being wired to artifact action buttons as requested. |
| 5.6 | Fix Artifact GET Endpoint | Partial | partial | GET now returns version arrays via `getVersionHistory()` with cache headers and chronological ordering, but the plan-required timestamp-based rollback behavior on DELETE is still missing in `app/api/artifacts/route.ts`. |
| 5.7 | Fix rejectSuggestion Implementation | Completed | improvement | The no-op behavior is fixed: `ArtifactService.deleteSuggestion()` exists and `rejectSuggestion()` now deletes suggestions after ownership verification. Remaining gap is non-typed error throwing (`Error`) in action layer instead of domain `AppError` usage. |
| 5.8 | Fix Data Stream Artifact Handlers | Completed | no-difference | All three required stream-handler fixes are implemented: text auto-visibility window, callback-based suggestion accumulation, and explicit `status: "streaming"` in delta handlers. |
| 5.9a | Fix Artifact Panel Hook Integrations | Partial | partial | `useWindowSize` and `useSidebar` are integrated for responsive width calculations, but plan-required `VersionFooter` integration is still not done; panel still renders an inline minimal footer and fetches only a wrapped single artifact version. |
| 5.9b | Fix Broken Artifact Component References | Completed | other-problem | Artifact import/reference surface appears healthy (barrel exports and feature-path imports resolve, no unresolved references in checked artifact files). However, plan guidance maps this task to `P3-BRK-017–024`, which are primarily message-component issues and represents scope-assignment drift. |

## Defect Items

### 5.4 — Add Toolbar to Artifact Panel (Incorrect)
- Detail: Artifact panel uses `features/chat/components/toolbar.tsx` (not a dedicated artifact toolbar module), and the implemented toolbar only provides the text 'Adjust reading level' tool with empty tools for other kinds; required actions (Undo/Redo/Copy/Download/Version History), keyboard shortcuts, and action-group separators are not implemented.
- Issues:
  - Planned output `features/artifact/components/toolbar.tsx` is not present.
  - Required toolbar action set (Undo, Redo, Copy, Download, Version History) is missing.
  - Keyboard shortcuts and separator grouping requirements are not implemented.
- Suggested fixes:
  - Create `features/artifact/components/toolbar.tsx` (or move current toolbar there) and implement the required action set.
  - Add keyboard shortcut bindings for common artifact actions.
  - Add visual separators between primary/secondary action groups.
- Evidence (new):
  - features/artifact/components/artifact-panel.tsx#L25-L25
  - features/artifact/components/artifact-panel.tsx#L638-L646
  - features/chat/components/toolbar.tsx#L339-L356
  - features/chat/components/toolbar.tsx#L451-L453
  - features/chat/components/toolbar.tsx#L498-L498
- Evidence (legacy):
  - archive/oldapp/components/toolbar.tsx#L319-L388
  - archive/oldapp/components/toolbar.tsx#L484-L493
- Plan refs:
  - .apm/Implementation_Plan.md#L651-L659

### 5.5 — Fix Artifact Actions Implementation (Partial)
- Detail: Copy and version navigation actions are implemented in `ArtifactActions`, but download behavior and version-comparison modal are missing, and artifact actions are rendered in the header while toolbar remains a separate tool system rather than being wired to artifact action buttons as requested.
- Issues:
  - Plan bullet 5.5.2 (download action with kind-specific file formats) is missing.
  - Plan bullet 5.5.3 (version comparison modal) is missing.
  - Plan bullet 5.5.4 (wire actions to toolbar buttons) is not satisfied by current split between `ArtifactActions` header actions and separate chat toolbar tools.
- Suggested fixes:
  - Add kind-aware download action (`.md`, code extension, `.csv`) in artifact actions.
  - Implement version comparison modal and hook it to action UI.
  - Unify/wire artifact actions into toolbar button flow so toolbar drives artifact action handlers directly.
- Evidence (new):
  - features/artifact/components/artifact-actions.tsx#L38-L75
  - features/artifact/components/artifact-actions.tsx#L86-L107
  - features/artifact/components/artifact-panel.tsx#L596-L604
  - features/artifact/components/artifact-panel.tsx#L641-L648
- Evidence (legacy):
  - archive/oldapp/components/artifact-actions.tsx#L26-L52
  - archive/oldapp/components/artifact-actions.tsx#L47-L79
- Plan refs:
  - .apm/Implementation_Plan.md#L661-L669

## Partial Items

### 5.1 — Create ArtifactMessages Component (Partial)
- Detail: `ArtifactMessages` exists and is integrated into the artifact panel, but messages are rendered from the full `messages` array without artifact-specific filtering logic required by the plan.
- Issues:
  - Plan bullet 5.1.2 (filtered artifact-only messages) is not implemented; the component maps all provided chat messages directly.
- Suggested fixes:
  - Add artifact-context filtering (e.g., by artifact/document correlation in message parts) before rendering the message list.
- Evidence (new):
  - features/artifact/components/artifact-messages.tsx#L27-L43
  - features/artifact/components/artifact-messages.tsx#L88-L108
  - features/artifact/components/artifact-panel.tsx#L505-L523
- Evidence (legacy):
  - archive/oldapp/components/artifact-messages.tsx#L11-L18
  - archive/oldapp/components/artifact-messages.tsx#L47-L67
  - archive/oldapp/components/artifact.tsx#L385-L405
- Plan refs:
  - .apm/Implementation_Plan.md#L621-L628

### 5.2 — Create Artifact Class & Registration System (Partial)
- Detail: A class-based registry (`registerArtifact`/`getArtifactDefinition`) is implemented, but plan-required pieces are incomplete: no `getArtifactIcon(kind)` helper, no explicit exported `artifactKinds` registration map of built-ins, and interface contract differs from the planned `kind/title/description/component/handler/model` shape.
- Issues:
  - Plan bullet 5.2.4 (`getArtifactIcon`) is missing.
  - Plan bullet 5.2.2 (artifact kind registration map for text/code/image/sheet) is not explicitly implemented as requested.
  - `ArtifactDefinition` field contract does not match the plan-specified shape (`title/component/handler/model`).
- Suggested fixes:
  - Add a built-in registration map (or equivalent exported constant) for text/code/image/sheet and register at startup.
  - Add `getArtifactIcon(kind)` helper in the artifact registration layer.
  - Provide compatibility fields or adapters for the planned `ArtifactDefinition` contract.
- Evidence (new):
  - features/artifact/types.ts#L163-L170
  - features/artifact/lib/artifact-class.ts#L30-L58
  - features/artifact/lib/artifact-class.ts#L77-L98
  - features/artifact/lib/artifact-class.ts#L187-L238
- Evidence (legacy):
  - archive/oldapp/components/artifact.tsx#L36-L42
  - archive/oldapp/lib/artifacts/server.ts#L104-L110
- Plan refs:
  - .apm/Implementation_Plan.md#L630-L639

### 5.6 — Fix Artifact GET Endpoint (Partial)
- Detail: GET now returns version arrays via `getVersionHistory()` with cache headers and chronological ordering, but the plan-required timestamp-based rollback behavior on DELETE is still missing in `app/api/artifacts/route.ts`.
- Issues:
  - Plan bullet 5.6.4 is not implemented: `DELETE /api/artifacts` does not accept/use a `timestamp` query parameter for version rollback.
  - Current DELETE path only performs full artifact deletion (`deleteArtifact`) and does not route to rollback semantics (`rollbackToVersion`/`rollbackToTimestamp`).
- Suggested fixes:
  - Extend `DELETE /api/artifacts` to support `timestamp` query param and call `rollbackToVersion(id, new Date(timestamp))` when provided.
  - Preserve full-delete behavior for requests without `timestamp`, with explicit branching and validation errors for invalid timestamp format.
- Evidence (new):
  - app/api/artifacts/route.ts#L45-L76
  - app/api/artifacts/route.ts#L238-L275
  - features/artifact/actions/versions.ts#L58-L73
  - features/artifact/actions/versions.ts#L92-L120
  - lib/data/repositories/artifact.repository.ts#L463-L478
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/document/route.ts#L22-L80
  - archive/oldapp/app/(chat)/api/document/route.ts#L177-L254
- Plan refs:
  - .apm/Implementation_Plan.md#L671-L680

### 5.9a — Fix Artifact Panel Hook Integrations (Partial)
- Detail: `useWindowSize` and `useSidebar` are integrated for responsive width calculations, but plan-required `VersionFooter` integration is still not done; panel still renders an inline minimal footer and fetches only a wrapped single artifact version.
- Issues:
  - Plan bullet 5.9a.3 is not met: `components/version-footer.tsx` is not imported/rendered in `artifact-panel.tsx`.
  - `artifact-panel.tsx` still calls `getArtifact()` and wraps one record as `ArtifactVersion[]`, so multi-version footer workflows remain constrained.
- Suggested fixes:
  - Replace inline footer block with `VersionFooter` integration and pass `documents/currentVersionIndex/handleVersionChange` as in OLD pattern.
  - Switch artifact panel version fetch from `getArtifact()` to `getVersionHistory()` so version navigation/restore receives full history data.
- Evidence (new):
  - features/artifact/components/artifact-panel.tsx#L24-L28
  - features/artifact/components/artifact-panel.tsx#L267-L278
  - features/artifact/components/artifact-panel.tsx#L289-L302
  - features/artifact/components/artifact-panel.tsx#L665-L679
  - components/version-footer.tsx#L28-L111
- Evidence (legacy):
  - archive/oldapp/components/artifact.tsx#L32-L33
  - archive/oldapp/components/artifact.tsx#L109-L109
  - archive/oldapp/components/artifact.tsx#L297-L301
  - archive/oldapp/components/artifact.tsx#L579-L583
- Plan refs:
  - .apm/Implementation_Plan.md#L699-L707

## Other-Problem Items

### 5.9b — Fix Broken Artifact Component References (Completed)
- Detail: Artifact import/reference surface appears healthy (barrel exports and feature-path imports resolve, no unresolved references in checked artifact files). However, plan guidance maps this task to `P3-BRK-017–024`, which are primarily message-component issues and represents scope-assignment drift.
- Issues:
  - Task-to-issue mapping drift: referenced IDs `P3-BRK-017–024` are not artifact-import defects, so this task’s guidance mixes cross-phase concerns.
- Suggested fixes:
  - Re-scope `P3-BRK-017–024` tracking to the chat/message task stream and keep artifact-reference validation under artifact-specific issue IDs only.
  - Retain the current artifact barrel/feature import conventions and gate with phase-level typecheck in CI.
- Evidence (new):
  - features/artifact/index.ts#L10-L33
  - features/artifact/components/index.ts#L16-L36
  - app/api/artifacts/route.ts#L15-L21
  - features/chat/components/message.tsx#L28-L29
  - features/chat/components/message.tsx#L307-L307
  - features/chat/components/message.tsx#L498-L498
- Evidence (legacy):
  - archive/oldapp/lib/types.ts#L3-L3
  - archive/oldapp/lib/editor/suggestions-extension.tsx#L8-L8
- Plan refs:
  - .apm/Implementation_Plan.md#L708-L716
  - .apm/Implementation_Plan.md#L601-L601

## Improvement Items

### 5.7 — Fix rejectSuggestion Implementation (Completed)
- Detail: The no-op behavior is fixed: `ArtifactService.deleteSuggestion()` exists and `rejectSuggestion()` now deletes suggestions after ownership verification. Remaining gap is non-typed error throwing (`Error`) in action layer instead of domain `AppError` usage.
- Issues:
  - `rejectSuggestion()` still throws generic `Error("Suggestion not found")` instead of a typed domain error (`NotFoundError`), reducing consistency with v6 error handling patterns.
- Suggested fixes:
  - Replace generic `Error` throws in `features/artifact/actions/suggestions.ts` with `NotFoundError` (or mapped `AppError`) to align with service/route error contracts.
- Evidence (new):
  - features/artifact/actions/suggestions.ts#L195-L217
  - features/artifact/actions/suggestions.ts#L149-L149
  - features/artifact/actions/suggestions.ts#L213-L213
  - lib/data/services/artifact.service.ts#L578-L608
  - lib/data/repositories/suggestion.repository.ts#L370-L414
- Evidence (legacy):
  - archive/oldapp/app/(chat)/api/suggestions/route.ts#L13-L89
- Plan refs:
  - .apm/Implementation_Plan.md#L681-L689

## No-Difference Items

### 5.3 — Add MultimodalInput to Artifact Panel (Completed)
- Detail: `MultimodalInput` is imported and rendered in artifact panel layout beneath artifact messages, wired to chat context and attachment props (`attachments`, `setAttachments`, `sendMessage`).
- Evidence (new):
  - features/artifact/components/artifact-panel.tsx#L27-L27
  - features/artifact/components/artifact-panel.tsx#L505-L527
- Evidence (legacy):
  - archive/oldapp/components/artifact.tsx#L398-L417
- Plan refs:
  - .apm/Implementation_Plan.md#L641-L649

### 5.8 — Fix Data Stream Artifact Handlers (Completed)
- Detail: All three required stream-handler fixes are implemented: text auto-visibility window, callback-based suggestion accumulation, and explicit `status: "streaming"` in delta handlers.
- Evidence (new):
  - features/chat/components/data-stream-handler.tsx#L69-L97
  - features/chat/components/data-stream-handler.tsx#L104-L133
- Evidence (legacy):
  - archive/oldapp/artifacts/text/client.tsx#L52-L75
  - archive/oldapp/components/data-stream-handler.tsx#L29-L94
- Plan refs:
  - .apm/Implementation_Plan.md#L690-L698
