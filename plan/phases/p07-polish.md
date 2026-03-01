# Phase P07 — Polish & Production

> **Updated per redesign audit (2026-03-01)**

> Production-readiness phase. Error boundaries, loading states, accessibility, responsive design,
> instrumentation, testing, import boundary enforcement, and naming/terminology verification.
>
> **Entry state**: P06 complete — all features work: auth, chat, artifacts, sidebar, voting, models, upload, visibility.
> **Exit state**: App is production-ready with proper error handling, accessibility, responsive design, verified naming, and passing build.
> **Est. duration**: ~2 days
> **Tasks**: 13
> **Files created/modified**: ~20

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P07-T01 | Finalize error boundaries | IMPLEMENTATION | M | 3 |
| P07-T02 | Finalize artifact error boundary | IMPLEMENTATION | S | 1 |
| P07-T03 | Add accessibility + keyboard nav | IMPLEMENTATION | M | ~8 |
| P07-T04 | Verify responsive design | VERIFICATION | M | ~5 |
| P07-T05 | Finalize instrumentation | IMPLEMENTATION | M | 2 |
| P07-T06 | Create E2E test specs | IMPLEMENTATION | L | 4 |
| P07-T07 | Create integration tests | IMPLEMENTATION | L | 4 |
| P07-T08 | Create stream test utility | IMPLEMENTATION | M | 3 |
| P07-T09 | Verify import boundaries | VERIFICATION | S | 0 |
| P07-T10 | Verify "artifact" naming | VERIFICATION | S | 0 |
| P07-T11 | Verify no credit/gateway logic | VERIFICATION | S | 0 |
| P07-T12 | Full build verification | VERIFICATION | M | 0 |
| P07-T13 | Verification gate G07 (final) | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-027 | Error boundaries (all 3 levels) | P07-T01, P07-T02 |

---

## Tasks

---

### TASK: [ID: P07-T01]
Title: Finalize error boundaries
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: edge-cases.md (error boundaries at 3 levels)
Architecture ref: SEAM-027 (error boundaries — root, chat route, artifact); redesign (polish all 3)

Action: Finalize 3 error boundary files. (1) app/global-error.tsx — "use client" standalone error boundary that renders its own html/body (required by Next.js for global-error). Layout: centered error message with app branding, error code display, "Try again" button (calls reset()), "Go home" link (navigates to /). Must not import from any layout-level providers (SessionProvider, etc.) — render standalone. (2) app/(chat)/error.tsx — "use client" error boundary for the chat route group. Preserves sidebar and layout (only replaces main content area). Shows error message, "Try again" button, "Go home" button. Sidebar remains functional for navigation. (3) app/(auth)/error.tsx — Auth route error boundary with recovery actions.

Output files:
- app/global-error.tsx
- app/(chat)/error.tsx
- app/(auth)/error.tsx

Inputs: None (standalone components)
Outputs: Error boundaries at all 3 levels

AI layer handling: NEW

Dependencies: P03-T26, P02-T07
Dependents: P07-T13

Success criteria:
- Global error renders standalone html/body
- Chat error preserves sidebar for navigation
- Auth error provides recovery path
- All 3 render standalone with recovery actions
- "Try again" calls reset()
- Error logged to console
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T02]
Title: Finalize artifact error boundary
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (editor crash boundary)
Architecture ref: SEAM-027 (error boundaries — artifact level)

Action: Verify and finalize features/artifacts/components/artifact-error-boundary.tsx (created in P04-T13). Ensure: class component with getDerivedStateFromError + componentDidCatch. Fallback UI: "Failed to render artifact" message + error code + "Retry" button. The boundary wraps only the editor content area — panel chrome (close button, actions, version footer) remains functional. Error logging present.

Output files:
- features/artifacts/components/artifact-error-boundary.tsx (verify/modify)

Inputs: features/artifacts/components/artifact-error-boundary.tsx (P04-T13)
Outputs: Artifact error boundary prevents editor crashes from breaking the app

AI layer handling: NEW

Dependencies: P04-T13
Dependents: P07-T13

Success criteria:
- Class component with getDerivedStateFromError
- Fallback shows error message and retry button
- Retry resets error state
- Panel chrome remains functional outside boundary
- Error logged to console
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P07-T03]
Title: Add accessibility attributes and keyboard navigation
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: accessibility.md (ARIA attributes, roles, labels, states, live regions, keyboard patterns)
Architecture ref: interactions.md (keyboard shortcuts)

Action: Audit and update ~8 key component files for comprehensive ARIA coverage, keyboard navigation, and motion preferences. Key areas: (1) multimodal-input.tsx — aria-label="Upload file" on file input, aria-label="Send Message" on submit, Enter submits (not during composition), Shift+Enter newline. (2) settings-panel.tsx — aria-pressed on all toggle buttons, label+input pairings. (3) auth-form.tsx — label+input with htmlFor, output aria-live="polite". (4) sidebar-skeleton.tsx — aria-busy on loading sections. (5) message-editor.tsx — Escape cancels, Enter submits. (6) code-editor console — ArrowUp/ArrowDown adjusts resize. (7) artifact-panel.tsx — focus management on open/close. (8) vote-buttons.tsx — aria-pressed on vote buttons. (9) Add `prefers-reduced-motion` CSS media query in globals.css — disable all CSS transitions/animations when user prefers reduced motion. Apply `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` as a global baseline.

Output files:
- ~8 component files (modify)

Inputs: accessibility.md (full ARIA inventory), interactions.md (keyboard patterns)
Outputs: Components have correct ARIA attributes and keyboard navigation

AI layer handling: NEW

Dependencies: P06-T14 (all features built)
Dependents: P07-T13

Success criteria:
- All interactive elements have aria-label or accessible name
- Toggle buttons have aria-pressed
- Form inputs have associated labels
- Skeleton sections have aria-busy
- Enter submits chat (not during composition)
- Shift+Enter creates newline
- Escape cancels message editing
- No keyboard traps
- `prefers-reduced-motion: reduce` disables all CSS animations/transitions
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T04]
Title: Verify responsive design
Phase: 7 — Polish & Production
Type: VERIFICATION

Behavior ref: accessibility.md (mobile vs desktop layout differences)
Architecture ref: interactions.md (mobile behavior per component)

Action: Audit and fix responsive design across key areas. (1) Artifact panel: mobile renders full-screen (w-dvw h-dvh), desktop renders sidebar + editor. (2) Sidebar: mobile renders as overlay sheet, desktop as fixed panel. Closes on mobile navigation. (3) Chat header: VisibilitySelector hidden on mobile. All interactive elements must have 44px minimum touch targets on mobile. Test at 320px, 768px, and 1024px viewport widths.

Output files:
- ~5 component files (modify if needed)

Inputs: accessibility.md (responsive table), screens.md (layout specs)
Outputs: Responsive design verified across breakpoints

AI layer handling: N/A

Dependencies: P06-T14
Dependents: P07-T13

Success criteria:
- App usable at 320px width (mobile)
- Artifact panel full-screen on mobile
- Sidebar as overlay sheet on mobile
- Desktop layouts correct at 1024px+
- Touch targets ≥44px on mobile
- No horizontal scroll at any breakpoint
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T05]
Title: Finalize instrumentation
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: N/A (observability infrastructure)
Architecture ref: scaffold/base-config.md (instrumentation hooks)

Action: Finalize 2 instrumentation files. (1) instrumentation.ts — Complete register() function. When NEXT_RUNTIME === "nodejs": conditionally import OpenTelemetry SDK, configure basic tracing. If no OTEL endpoint configured, skip setup (no-op). (2) instrumentation-client.ts — Client-side instrumentation. Export onRequestError hook for error reporting. Keep minimal — no bundle size increase.

Output files:
- instrumentation.ts (finalize)
- instrumentation-client.ts (finalize)

Inputs: instrumentation.ts (P00-T15 stub)
Outputs: Instrumentation hooks active for production monitoring

AI layer handling: NEW

Dependencies: P00-T15
Dependents: P07-T13

Success criteria:
- instrumentation.ts register() runs without error
- OTel setup conditional on OTEL_EXPORTER_OTLP_ENDPOINT
- No runtime error when OTel packages not installed
- No significant bundle size increase
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T06]
Title: Create E2E test specs
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: features.md (all user flows)
Architecture ref: AGENTS.md (pnpm test:e2e)

Action: Create 4 E2E test spec files using Playwright. (1) tests/e2e/auth.spec.ts — Login, register, guest auto-bootstrap, logout flows. (2) tests/e2e/chat.spec.ts — Send message, streaming response, weather tool invocation, new chat creation, load existing chat. (3) tests/e2e/artifacts.spec.ts — AI creates text artifact (panel opens), code artifact (CodeMirror renders), version navigation, close panel. (4) tests/e2e/sidebar.spec.ts — Chat history loads, click chat navigates, delete removes from list, new chat button, mobile sidebar toggle.

Output files:
- tests/e2e/auth.spec.ts
- tests/e2e/chat.spec.ts
- tests/e2e/artifacts.spec.ts
- tests/e2e/sidebar.spec.ts

Inputs: features.md (user flows), playwright.config.ts
Outputs: E2E test suite runnable via pnpm test:e2e

AI layer handling: NEW

Dependencies: P06-T14 (all features built)
Dependents: P07-T12, P07-T13

Success criteria:
- Auth spec: login, register, guest, logout tests
- Chat spec: send, receive, tool use tests
- Artifacts spec: create, version nav, close tests
- Sidebar spec: history, navigation, delete tests
- All specs use "artifact" naming (not "document")
- pnpm typecheck passes on test files

Complexity: L

---

### TASK: [ID: P07-T07]
Title: Create integration tests
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: features.md (feature integration)
Architecture ref: AGENTS.md (pnpm test:unit)

Action: Create 4 integration test files. (1) tests/integration/chat-flow.test.ts — Chat send/receive flow with mocked AI. (2) tests/integration/artifact-flow.test.ts — Artifact creation/update flow with mocked handlers. (3) tests/integration/auth-flow.test.ts — Auth session resolution and guard flows. (4) tests/integration/sidebar-flow.test.ts — Sidebar data loading and pending chat operations.

Output files:
- tests/integration/chat-flow.test.ts
- tests/integration/artifact-flow.test.ts
- tests/integration/auth-flow.test.ts
- tests/integration/sidebar-flow.test.ts

Inputs: tests/fixtures/ (P01-T13), tests/mocks/ (P00-T16)
Outputs: Integration test suite

AI layer handling: NEW

Dependencies: P06-T14
Dependents: P07-T12, P07-T13

Success criteria:
- Tests cover core flows for each feature area
- All tests use "artifact" naming (not "document")
- Tests use mocked dependencies
- pnpm typecheck passes on test files

Complexity: L

---

### TASK: [ID: P07-T08]
Title: Create stream test utility
Phase: 7 — Polish & Production
Type: IMPLEMENTATION

Behavior ref: testing infrastructure
Architecture ref: conventions.md (test utilities)

Action: Create 3 test utility files. (1) tests/utils/stream.ts — `collectStreamEvents` utility for testing stream-based flows. (2) tests/mocks/ai.ts — Mocked AI provider for testing. (3) tests/mocks/fetch.ts — Mocked fetch for API route testing.

Output files:
- tests/utils/stream.ts
- tests/mocks/ai.ts
- tests/mocks/fetch.ts

Inputs: tests/setup.ts (P00-T16)
Outputs: Stream test utilities consumed by integration tests (P07-T07)

AI layer handling: NEW

Dependencies: P00-T16
Dependents: P07-T07

Success criteria:
- collectStreamEvents works with artifact stream parts
- Mocked AI provider returns predictable responses
- Mocked fetch intercepts API calls
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T09]
Title: Verify import boundaries
Phase: 7 — Polish & Production
Type: VERIFICATION

Behavior ref: N/A (architectural enforcement)
Architecture ref: conventions.md (layer rules); redesign (scripts/check-imports.mjs created in P0-T17, verified here)

Action: Run `scripts/check-imports.mjs` and verify zero violations. The script (created in P0-T17) validates import layer boundaries: (1) app/ → features/, components/, lib/ only. (2) features/ → lib/, components/, other features. (3) components/ → lib/, other components/. (4) lib/ → other lib/ only. (5) No direct DB/cache imports from features/ or app/. Fix any violations found.

Output files: none (verification only, fix files if violations found)

Inputs: scripts/check-imports.mjs (P00-T17), all project files
Outputs: Import boundaries verified — zero violations

AI layer handling: N/A

Dependencies: P00-T17, P06-T14
Dependents: P07-T13

Success criteria:
- `node scripts/check-imports.mjs` exits 0
- Zero import boundary violations
- All layer rules respected

Complexity: S

---

### TASK: [ID: P07-T10]
Title: Verify "artifact" naming throughout codebase
Phase: 7 — Polish & Production
Type: VERIFICATION

Behavior ref: redesign (artifact naming throughout)
Architecture ref: redesign (zero "document" in code identifiers)

Action: Run grep verification to ensure zero occurrences of old naming in code. Specifically verify: (1) `grep -r "document"` in code directories — zero "document" identifiers in features/, app/, lib/, components/ (excluding .next-docs/, oldapp/, node_modules/, plan/). (2) `grep -r "documentId"` — zero occurrences (should be `artifactId`). (3) `grep -r "DocumentHandler"` — zero occurrences (should be `ArtifactHandler`). (4) `grep -r "DocumentKind"` — zero occurrences (should be `ArtifactKind`). (5) `grep -r "createDocument"` in tool/handler code — zero occurrences (should be `createArtifact`). (6) `grep -r "updateDocument"` in tool/handler code — zero occurrences (should be `updateArtifact`). (7) `grep -r "document-preview"` — zero occurrences (should be `artifact-preview`). (8) `grep -r "DataStreamHandler"` — zero occurrences (should be `StreamBridge`). (9) `grep -r "DataStreamProvider"` — zero occurrences (should be `ChatStreamProvider`). (10) `grep -r "OptimisticChats"` — zero occurrences (should be `PendingChats`). (11) `grep -r "VoteHydrator"` — zero occurrences (should be `VoteResolver`). (12) `grep -r "AuthProvider"` — zero occurrences (should be `SessionProvider`). (13) `grep -r "SettingsProvider"` — zero occurrences (REMOVED). (14) `grep -r "ChatContext[^S]"` — zero occurrences (should be `ChatSessionContext`). (15) `grep -r "middleware\.ts"` in config — zero occurrences (should be `proxy.ts`). Fix any violations found.

Output files: none (verification only, fix files if violations found)

Inputs: all project source files
Outputs: Naming consistency verified

AI layer handling: N/A

Dependencies: all phases
Dependents: P07-T13

Success criteria:
- Zero "documentId" in code (use artifactId)
- Zero "DocumentHandler" (use ArtifactHandler)
- Zero "DocumentKind" (use ArtifactKind)
- Zero "createDocument" in tools (use createArtifact)
- Zero "updateDocument" in tools (use updateArtifact)
- Zero "document-preview" (use artifact-preview)
- Zero "DataStreamHandler" (use StreamBridge)
- Zero "DataStreamProvider" (use ChatStreamProvider)
- Zero "OptimisticChats" (use PendingChats)
- Zero "VoteHydrator" (use VoteResolver)
- Zero "AuthProvider" (use SessionProvider)
- Zero "SettingsProvider" (REMOVED)
- Zero "middleware.ts" in config (use proxy.ts)
- All artifact naming consistent

Complexity: S

---

### TASK: [ID: P07-T11]
Title: Verify no credit/gateway logic
Phase: 7 — Polish & Production
Type: VERIFICATION

Behavior ref: redesign (no credit/gateway/quota terminology)
Architecture ref: redesign (zero credit/gateway across entire codebase)

Action: Run grep verification: `grep -rE "credit|gateway|quota|entitlement|AppUsage|activate_gateway|vercel-gateway"` across all code directories (excluding .next-docs/, oldapp/, node_modules/, plan/). Verify zero results. Fix any violations found.

Output files: none (verification only, fix files if violations found)

Inputs: all project source files
Outputs: No credit/gateway logic exists

AI layer handling: N/A

Dependencies: all phases
Dependents: P07-T13

Success criteria:
- Zero occurrences of credit/gateway/quota/entitlement/AppUsage/activate_gateway/vercel-gateway
- No credit-related error codes in lib/errors/codes.ts
- No gateway provider in AI registry

Complexity: S

---

### TASK: [ID: P07-T12]
Title: Full build verification
Phase: 7 — Polish & Production
Type: VERIFICATION

Behavior ref: N/A
Architecture ref: AGENTS.md (pnpm build as final verification); redesign (proxy.ts verification)

Action: Run the complete build and verification pipeline: (1) `pnpm format` — all files formatted, (2) `pnpm typecheck` — zero TypeScript errors, (3) `pnpm lint` — zero Biome lint errors, (4) `node scripts/check-imports.mjs` — import boundaries clean, (5) `pnpm build` — Next.js production build succeeds with zero errors, (6) Verify `proxy.ts` exists (NOT `middleware.ts`), (7) Analyze build output: check for unexpected large chunks, verify code splitting (editors lazy-loaded), check route manifest. Fix any issues found.

Output files: none (verification only)

Inputs: All project files
Outputs: Build passes — production ready

AI layer handling: N/A

Dependencies: P07-T01 through P07-T11
Dependents: P07-T13

Success criteria:
- `pnpm format` exits 0
- `pnpm typecheck` exits 0
- `pnpm lint` exits 0
- `node scripts/check-imports.mjs` exits 0
- `pnpm build` exits 0
- `proxy.ts` exists (NOT `middleware.ts`)
- No unexpected large chunks in build output
- All expected routes in route manifest

Complexity: M

---

### TASK: [ID: P07-T13]
Title: Verification gate G07 (final)
Phase: 7 — Polish & Production
Type: VERIFICATION

Behavior ref: All behavioral extraction documents
Architecture ref: AGENTS.md (final validation); redesign (complete exit criteria)

Action: Final gate — verify all exit criteria. Checklist: (1) All 3 error boundaries render standalone with recovery actions, (2) `scripts/check-imports.mjs` reports zero violations, (3) Zero occurrences of "document" in code identifiers (use "artifact"), (4) Zero occurrences of credit/gateway/quota terminology, (5) `proxy.ts` exists (not `middleware.ts`), (6) `pnpm format && pnpm typecheck && pnpm lint` all pass, (7) `pnpm build` succeeds cleanly, (8) E2E test specs cover: auth flow, chat send/receive, artifact create/edit, sidebar navigation, (9) All naming consistent per redesign: StreamBridge, ChatStreamProvider, ChatSessionContext, PendingChatsProvider, VoteResolver, SessionProvider, ArtifactHandler, ArtifactKind, artifactId, createArtifact, updateArtifact, artifact-preview, (10) No SettingsProvider exists (REMOVED), (11) Responsive design verified at mobile + desktop, (12) Keyboard navigation functional, (13) ARIA attributes present on all interactive elements.

Output files: none (validation only)

Inputs: All P07-T01 through P07-T12 outputs
Outputs: Gate G07 passed — rebuild complete, production-ready

AI layer handling: N/A

Dependencies: P07-T01 through P07-T12
Dependents: None — this is the final task

Verification commands:
```bash
pnpm format && pnpm typecheck && pnpm lint
node scripts/check-imports.mjs
pnpm build
pnpm test:unit
```

Success criteria:
- All 3 error boundaries functional
- Import boundaries respected (zero violations)
- "artifact" naming throughout (zero "document" identifiers)
- Zero credit/gateway/quota terminology
- `proxy.ts` exists (not `middleware.ts`)
- `pnpm format && pnpm typecheck && pnpm lint` pass
- `pnpm build` succeeds
- E2E tests cover all core flows
- All redesign naming applied:
  - StreamBridge (NOT DataStreamHandler)
  - ChatStreamProvider (NOT DataStreamProvider)
  - ChatSessionContext (NOT ChatContext)
  - useChatSessionContext (NOT useChatContext)
  - PendingChatsProvider (NOT OptimisticChatsProvider)
  - VoteResolver (NOT VoteHydrator)
  - SessionProvider (NOT AuthProvider)
  - ArtifactHandler (NOT DocumentHandler)
  - ArtifactKind (NOT DocumentKind)
  - artifactId (NOT documentId)
  - createArtifact (NOT createDocument)
  - updateArtifact (NOT updateDocument)
  - artifact-preview (NOT document-preview)
  - proxy.ts (NOT middleware.ts)
  - SettingsProvider REMOVED
- Mobile usable at 320px
- Keyboard navigation functional
- ARIA attributes present

Complexity: S
