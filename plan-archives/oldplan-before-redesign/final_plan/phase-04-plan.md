# Phase 04 — Artifacts

> Artifact system: document handlers, editors (text/code/sheet/image), panel UI, versioning, diff view, AI tool wiring.

---

## Objective

Implement the complete artifact experience: type definitions, Zod schemas, hooks (useArtifact with SWR), document handler factory with per-kind handlers, all four editors (TipTap text, CodeMirror code, react-data-grid sheet, image display), artifact panel with animations, supporting components (actions, close, error boundary, version footer), document preview + diff view, artifact API routes, and wire everything into the chat layout.

**Entry state:** P03 complete — chat works E2E, messages stream, DataStreamHandler processes data parts
**Exit state:** AI creates/updates text, code, sheet artifacts; users edit; versions tracked; suggestions work
**Est. duration:** ~4 days
**Tasks:** 22

---

## Task Table

| ID | Title | Type | Complexity | Dependencies |
|----|-------|------|------------|-------------|
| P04-T01 | Define artifact types | IMPLEMENTATION | M | P00-T08 |
| P04-T02 | Create artifact Zod schemas | IMPLEMENTATION | S | T01 |
| P04-T03 | Create artifact hooks (useArtifact SWR) | IMPLEMENTATION | L | T01 |
| P04-T04 | Create document handler factory | IMPLEMENTATION | L | T01 |
| P04-T05 | Create text document handler | IMPLEMENTATION | M | T04 |
| P04-T06 | Create code document handler | IMPLEMENTATION | M | T04 |
| P04-T07 | Create sheet document handler | IMPLEMENTATION | M | T04 |
| P04-T08 | Create image document handler | IMPLEMENTATION | S | T04 |
| P04-T09 | Wire createDocument tool | INTEGRATION | L | T04, T05 |
| P04-T10 | Wire updateDocument tool | INTEGRATION | M | T04 |
| P04-T11 | Wire requestSuggestions tool | INTEGRATION | M | T04 |
| P04-T12 | Create text editor (TipTap + suggestions) | IMPLEMENTATION | L | T01 |
| P04-T13 | Create code editor (CodeMirror + Pyodide) | IMPLEMENTATION | L | T01 |
| P04-T14 | Create console component | IMPLEMENTATION | M | T13 |
| P04-T15 | Create sheet editor (react-data-grid) | IMPLEMENTATION | L | T01 |
| P04-T16 | Create image editor | IMPLEMENTATION | S | T01 |
| P04-T17 | Create artifact panel | IMPLEMENTATION | L | T01, T03, T12 |
| P04-T18 | Create supporting components | IMPLEMENTATION | L | T01 |
| P04-T19 | Create document preview + diffview | IMPLEMENTATION | M | T01 |
| P04-T20 | Create artifact API routes | IMPLEMENTATION | M | T02, P01-T09 |
| P04-T21 | Wire artifact panel into chat | INTEGRATION | L | T17, P03-T21 |
| P04-T22 | Verification gate G04 | VERIFICATION | S | ALL |

---

## Entry/Exit States

| State | Condition |
|-------|-----------|
| Entry | P03 gate passed; chat streaming works; DataStreamHandler operational |
| Exit | AI creates text/code/sheet artifacts; editors render and are editable; versions tracked; suggestions display in text editor |

---

## Integration Verification

- AI tool call "createDocument" opens artifact panel with streaming content
- AI tool call "updateDocument" updates existing artifact
- Text editor renders TipTap with suggestion extension
- Code editor runs Python via Pyodide, shows console output
- Sheet editor parses CSV and renders grid
- Version navigation (prev/next) and restore work
- Diff view shows changes between versions

---

## Seams Addressed

| Seam | Description | Task |
|------|-------------|------|
| SEAM-009 | createDocument tool → artifact handlers | P04-T09 |
| SEAM-010 | updateDocument tool → artifact handlers | P04-T10 |
| SEAM-011 | requestSuggestions tool → text editor | P04-T11 |
| SEAM-012 | Artifact stream → artifact panel | P04-T17, T21 |
| SEAM-021 | Document version fetch | P04-T20 |
| SEAM-025 | Document data operations (full) | P04-T20 |
| SEAM-032 | Text editor (TipTap + suggestions) | P04-T12 |
| SEAM-033 | Code editor (CodeMirror + Pyodide) | P04-T13, T14 |
| SEAM-034 | Sheet editor (react-data-grid + PapaParse) | P04-T15 |
| SEAM-035 | Image editor | P04-T16 |
| SEAM-037 | Pyodide script loading | P04-T21 |
| SEAM-039 | Version navigation + restore | P04-T18 |
| SEAM-040 | Inline document preview → artifact panel | P04-T19 |
