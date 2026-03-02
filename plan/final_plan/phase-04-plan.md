> **Updated per redesign audit (2026-03-01)**

# Phase 4 — Artifacts Vertical

> Artifact system: `useSyncExternalStore` store, handler registry with side-effect registration, editors (text/code/sheet/image), artifact panel, versioning, API routes.

---

## Objective

Implement the complete artifact system: `useSyncExternalStore`-based artifact store with selector hooks, handler implementations registered via side-effect imports, all four editors (TipTap text, CodeMirror code, react-data-grid sheet, image display), artifact panel with animations, supporting components (actions, close, error boundary, version footer), artifact preview, artifact API routes with `revalidateTag`, and wire everything into the ChatShell.

**Entry state:** P3 complete — chat streams, StreamBridge processes deltas, handler registry exists in `lib/ai/artifact-handlers.ts`, tool stubs call registry
**Exit state:** AI creates/updates text, code, sheet artifacts; editors render and are editable; versions tracked; suggestions work; `useArtifactSelector` enables granular subscriptions
**Est. duration:** ~4 days
**Tasks:** 18

---

## Task Table

| ID | Title | Type | Files Created | Dependencies | Complexity |
|---|---|---|---|---|---|
| P4-T01 | Create artifact types + schemas | IMPL | `features/artifacts/types/artifact.types.ts`, `features/artifacts/schemas/artifact.schema.ts` | P0-T06 | M |
| P4-T02 | Create artifact store | IMPL | `features/artifacts/lib/artifact-store.ts` (`useSyncExternalStore`: getSnapshot, subscribe, setState, reset) | P4-T01 | L |
| P4-T03 | Create artifact hook aliases | IMPL | `features/artifacts/hooks/use-artifact.ts`, `features/artifacts/hooks/use-artifact-selector.ts` (re-exports from store) | P4-T02 | S |
| P4-T04 | Create text + code handlers | IMPL | `features/artifacts/handlers/text-handler.ts` (`streamText` → `artifact-textDelta` APPEND), `features/artifacts/handlers/code-handler.ts` (`streamObject` → `artifact-codeDelta` REPLACE) | P3-T04, P1-T12 | M |
| P4-T05 | Create sheet + image handlers | IMPL | `features/artifacts/handlers/sheet-handler.ts` (`streamObject` → `artifact-sheetDelta` REPLACE), `features/artifacts/handlers/image-handler.ts` | P3-T04 | M |
| P4-T06 | Create handler registration | IMPL | `features/artifacts/handlers/index.ts` (side-effect: registers all handlers into `lib/ai/artifact-handlers.ts`) | P4-T04, P4-T05 | S |
| P4-T07 | Create text editor | IMPL | `features/artifacts/components/editors/text-editor.tsx` (TipTap + suggestions extension) | P4-T02 | L |
| P4-T08 | Create code editor | IMPL | `features/artifacts/components/editors/code-editor.tsx` (CodeMirror + Pyodide execution) | P4-T02 | L |
| P4-T09 | Create sheet editor | IMPL | `features/artifacts/components/editors/sheet-editor.tsx` (react-data-grid + PapaParse CSV) | P4-T02 | L |
| P4-T10 | Create image editor | IMPL | `features/artifacts/components/editors/image-editor.tsx` (base64/URL display) | P4-T02 | S |
| P4-T11 | Create artifact panel | IMPL | `features/artifacts/components/artifact-panel.tsx` (main container, kind-specific editor switch) | P4-T07..T10, P4-T03 | L |
| P4-T12 | Create artifact support components | IMPL | `features/artifacts/components/artifact-actions.tsx`, `artifact-close-button.tsx` (`useArtifactSelector`), `version-footer.tsx` | P4-T03 | M |
| P4-T13 | Create artifact error boundary | IMPL | `features/artifacts/components/artifact-error-boundary.tsx` | P0-T08 | S |
| P4-T14 | Create artifact preview | IMPL | `features/artifacts/components/artifact-preview.tsx` (inline in messages, uses `useArtifactSelector`) | P4-T03 | M |
| P4-T15 | Create artifact API route | IMPL | `app/api/artifact/route.ts` (GET: versions, POST: save/restore modes, `revalidateTag('artifact:{id}', 'max')`) | P1-T08, P1-T03 | M |
| P4-T16 | Create suggestions API route | IMPL | `app/api/suggestions/route.ts` (GET: suggestions by `artifactId`) | P1-T10 | M |
| P4-T17 | Wire artifact panel into ChatShell | INTEG | Update `features/chat/components/chat-shell.tsx` to conditionally render `ArtifactPanel` + wire `StreamBridge` → `artifactStore` | P4-T11, P3-T20 | M |
| P4-T18 | Verification gate G04 | VERIFY | — | P4-T01..T17 | S |

---

## Key Changes from Pre-Redesign Plan

| Aspect | Before | After |
|--------|--------|-------|
| State management | `useArtifact` with SWR synthetic key | `useSyncExternalStore` with `getSnapshot`/`subscribe`/`setState`/`reset` |
| Re-render scope | 5+ components re-render per delta | 1 component + selector-based subscribers (`useArtifactSelector`) |
| Handler wiring | Document handler factory + direct imports | Handler registry (`lib/ai/artifact-handlers.ts`) + side-effect registration in `features/artifacts/handlers/index.ts` |
| Delta semantics | `data-document-*` stream parts | `artifact-*` parts: `artifact-textDelta` (APPEND), `artifact-codeDelta`/`artifact-sheetDelta`/`artifact-imageDelta` (REPLACE) |
| Naming | `documentId`, `DocumentHandler`, `DocumentKind`, `createDocument`, `updateDocument` | `artifactId`, `ArtifactHandler`, `ArtifactKind`, `createArtifact`, `updateArtifact` |
| Task IDs | P04-T01..T22 (22 tasks) | P4-T01..T18 (18 tasks, leaner) |
| Cache invalidation | Unspecified | `revalidateTag('artifact:{id}', 'max')` on every save |
| Dependency inversion | Tools directly import handlers | Tools consume via `getArtifactHandler(kind)` registry pattern |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P3 gate passed; chat streams; StreamBridge processes deltas; handler registry exists; tool stubs call registry |
| Exit | AI creates text/code/sheet artifacts; editors render and are editable; versions tracked; suggestions display in text editor; `useArtifactSelector` enables granular subscriptions |

---

## Exit Criteria

- [ ] `artifactStore` uses `useSyncExternalStore` (NOT SWR synthetic key)
- [ ] `useArtifactSelector(s => s.isVisible)` re-renders ONLY on visibility change
- [ ] All 4 handlers register via side-effect import in `handlers/index.ts`
- [ ] Handler registry uses `getArtifactHandler(kind)` pattern (dependency inversion)
- [ ] Text handler uses APPEND delta (`artifact-textDelta`), code/sheet use REPLACE delta
- [ ] Artifact API route calls `revalidateTag('artifact:{id}', 'max')` on save
- [ ] Suggestions API uses `artifactId` parameter (not `documentId`)
- [ ] All files/types use "artifact" naming (zero "document" identifiers)
- [ ] `pnpm typecheck && pnpm lint` pass

**Verification:** `pnpm typecheck && pnpm lint && pnpm format`

---

## Integration Verification

- AI tool call `createArtifact` opens artifact panel with streaming content
- AI tool call `updateArtifact` updates existing artifact
- Text editor renders TipTap with suggestion extension
- Code editor runs Python via Pyodide, shows console output
- Sheet editor parses CSV and renders grid
- Version navigation (prev/next) and restore work
- StreamBridge → `processStreamDelta()` → `artifactStore.setState()` → panel re-renders

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-009 | `createArtifact` tool → handler registry → artifact handlers | P4-T04, P4-T06 |
| SEAM-010 | `updateArtifact` tool → handler registry → artifact handlers | P4-T04, P4-T06 |
| SEAM-011 | `requestSuggestions` tool → text editor | P4-T07, P4-T16 |
| SEAM-012 | Artifact stream → StreamBridge → `artifactStore` → artifact panel | P4-T11, P4-T17 |
| SEAM-021 | Artifact version fetch | P4-T15 |
| SEAM-025 | Artifact data operations (full) | P4-T15 |
| SEAM-032 | Text editor (TipTap + suggestions) | P4-T07 |
| SEAM-033 | Code editor (CodeMirror + Pyodide) | P4-T08 |
| SEAM-034 | Sheet editor (react-data-grid + PapaParse) | P4-T09 |
| SEAM-035 | Image editor | P4-T10 |
| SEAM-037 | Pyodide script loading | P4-T08, P4-T17 |
| SEAM-039 | Version navigation + restore | P4-T12 |
| SEAM-040 | Inline artifact preview → artifact panel | P4-T14 |
