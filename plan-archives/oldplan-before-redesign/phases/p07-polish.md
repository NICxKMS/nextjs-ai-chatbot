# Phase P07 — Polish Vertical

> Production-readiness phase. Error boundaries, loading states, accessibility, responsive design,
> instrumentation, and final integration verification. After this phase, the app is deployable.
>
> **Entry state**: P06 complete — all features work: auth, chat, artifacts, sidebar, voting, models, settings, upload, visibility.
> **Exit state**: App is production-ready with proper error handling, accessibility, responsive design, and passing build.
> **Est. duration**: ~2 days
> **Tasks**: 15
> **Files created/modified**: ~16

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P07-T01 | Finalize global error boundary | IMPLEMENTATION | M | 1 |
| P07-T02 | Finalize chat error boundary | IMPLEMENTATION | M | 1 |
| P07-T03 | Finalize artifact error boundary | IMPLEMENTATION | S | 1 |
| P07-T04 | Finalize loading states | IMPLEMENTATION | M | 3 |
| P07-T05 | Add accessibility attributes | IMPLEMENTATION | M | 4 |
| P07-T06 | Add keyboard navigation | IMPLEMENTATION | M | 3 |
| P07-T07 | Verify responsive design | VERIFICATION | M | 3 |
| P07-T08 | Add reduced motion support | IMPLEMENTATION | S | 1 |
| P07-T09 | Finalize instrumentation | IMPLEMENTATION | M | 2 |
| P07-T10 | Create import boundary check script | IMPLEMENTATION | M | 1 |
| P07-T11 | Create E2E test specs | IMPLEMENTATION | L | 4 |
| P07-T12 | Run full build verification | VERIFICATION | M | 0 |
| P07-T13 | Run comprehensive integration test | VERIFICATION | L | 0 |
| P07-T15 | Connection resilience hook | IMPLEMENTATION | M | 2 |
| P07-T14 | Verification gate G07 (final) | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-027 | Error boundaries (all 3 levels) | P07-T01, P07-T02, P07-T03 |
| (new) | SSE reconnection / offline detection | P07-T15 |

---

## Tasks

---

### TASK: [ID: P07-T01]
Title: Finalize global error boundary
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: edge-cases.md (global error boundary catches unhandled errors)
Architecture ref: SEAM-027 (error boundaries — root level); scaffold/directory-structure.md (app/global-error.tsx)

Action: Finalize app/global-error.tsx — "use client" standalone error boundary that renders its own html/body (required by Next.js for global-error — it replaces the root layout entirely). Layout: centered error message with app branding, error code display, "Try again" button (calls reset()), "Go home" link (navigates to /). Must not import from any layout-level providers (ThemeProvider, AuthProvider, etc.) — render standalone with inline styles or minimal Tailwind. Log error to console for debugging. Accept props: error (Error & { digest?: string }), reset (() => void).

Output files:
- app/global-error.tsx

Inputs: None (standalone)
Outputs: Root-level error boundary catches unhandled errors

AI layer handling: NEW

Dependencies: P00-T05 (root layout exists)
Dependents: P07-T14

Success criteria:
- Renders standalone html/body with error message
- "Try again" calls reset()
- "Go home" links to /
- Does not import layout-level providers
- Error logged to console
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T02]
Title: Finalize chat error boundary
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: edge-cases.md (chat error boundary preserves sidebar); screens.md (chat error UI)
Architecture ref: SEAM-027 (error boundaries — chat route level)

Action: Finalize app/(chat)/error.tsx — "use client" error boundary for the chat route group. Unlike global-error, this preserves the sidebar and layout (only replaces the main content area). Layout: centered error message within SidebarInset area, shows: error icon, "Something went wrong" heading, error.message (truncated), "Try again" button (calls reset()), "Go home" button (navigates to /). Log error details. The surrounding layout/sidebar remain functional so users can navigate to other chats.

Output files:
- app/(chat)/error.tsx

Inputs: components/ui/ (P00-T11)
Outputs: Chat-level error boundary preserves navigation

AI layer handling: NEW

Dependencies: P03-T23 (initial error.tsx), P05-T10 (sidebar in layout)
Dependents: P07-T14

Success criteria:
- Error boundary contained within chat route group (sidebar preserved)
- "Try again" button calls reset()
- "Go home" navigates to /
- User can still navigate via sidebar
- Error details logged
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T03]
Title: Finalize artifact error boundary
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: artifacts-system.md (editor crash boundary)
Architecture ref: SEAM-027 (error boundaries — artifact level)

Action: Verify and finalize features/artifacts/components/artifact-error-boundary.tsx (created in P04-T18). Ensure: class component with getDerivedStateFromError + componentDidCatch. Fallback UI: "Failed to render artifact" message + error code + "Retry" button that calls resetErrorBoundary (sets hasError to false). The boundary wraps only the editor content area inside the artifact panel — the panel chrome (close button, actions, version footer) remains functional. Add error logging (console.error + optional telemetry hook).

Output files:
- features/artifacts/components/artifact-error-boundary.tsx (verify/modify)

Inputs: features/artifacts/components/artifact-error-boundary.tsx (P04-T18)
Outputs: Artifact error boundary prevents editor crashes from breaking the app

AI layer handling: NEW

Dependencies: P04-T18
Dependents: P07-T14

Success criteria:
- Class component with getDerivedStateFromError
- Fallback shows error message and retry button
- Retry resets error state
- Panel chrome (close, actions, footer) remains functional outside boundary
- Error logged to console
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P07-T04]
Title: Finalize loading states for all routes
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: screens.md (loading states for chat, auth); ui-parity screens
Architecture ref: conventions.md (loading.tsx pattern)

Action: Finalize 3 loading-related files. (1) app/(chat)/loading.tsx — Full-viewport loading state for chat routes. Centered column: spinning border circle + "Loading conversation..." text. Renders chat skeleton: header placeholder, message area with skeleton bubbles, input area placeholder. Uses shadcn/ui Skeleton. (2) components/app-shell.tsx — Verify AppShellFallback is exported: full-viewport centered spinner (h-dvh w-full bg-background), animated border spinner + "Loading..." text. Used as Suspense fallback wrapping AppShell in root layout. (3) features/sidebar/components/sidebar-skeleton.tsx — Verify component exists and matches spec (created in P05-T02). Ensure staggered animation timing is correct.

Output files:
- app/(chat)/loading.tsx (finalize)
- components/app-shell.tsx (verify/modify)
- features/sidebar/components/sidebar-skeleton.tsx (verify)

Inputs: components/ui/skeleton.tsx (P00-T11), screens.md
Outputs: Loading states for all route transitions

AI layer handling: NEW

Dependencies: P03-T23 (initial loading.tsx), P05-T02 (sidebar skeleton)
Dependents: P07-T14

Success criteria:
- Chat loading state renders chat-shaped skeleton
- AppShellFallback renders centered spinner
- SidebarSkeleton renders staggered skeleton items
- All loading states use consistent styling
- No layout shift when content loads
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T05]
Title: Add accessibility attributes across features
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: accessibility.md (ARIA attributes, roles, labels, states, live regions)
Architecture ref: AGENTS.md (no specific a11y guidance, but correctness first)

Action: Audit and update 4 key component files for comprehensive ARIA coverage. (1) features/chat/components/multimodal-input.tsx — Verify: aria-label="Upload file" on hidden file input, aria-label="Send Message" on submit, aria-label="Stop generation" on stop button. (2) features/settings/components/settings-panel.tsx — Verify: aria-pressed on all toggle buttons, label+input pairings for sliders. (3) features/auth/components/auth-form.tsx — Verify: label+input with htmlFor for email/password, output aria-live="polite" for submit status. (4) features/sidebar/components/sidebar-skeleton.tsx — Verify: aria-busy on skeleton sections. Add any missing ARIA attributes found in accessibility.md that aren't already implemented.

Output files:
- features/chat/components/multimodal-input.tsx (modify)
- features/settings/components/settings-panel.tsx (modify)
- features/auth/components/auth-form.tsx (modify)
- features/sidebar/components/sidebar-skeleton.tsx (modify)

Inputs: accessibility.md (full ARIA inventory), all target component files
Outputs: Components have correct ARIA attributes

AI layer handling: NEW

Dependencies: P06-T18 (all features built)
Dependents: P07-T14

Success criteria:
- All interactive elements have aria-label or accessible name
- Toggle buttons have aria-pressed
- Form inputs have associated labels
- Live regions announce status changes
- Skeleton sections have aria-busy
- No new accessibility violations introduced
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T06]
Title: Add keyboard navigation support
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: accessibility.md (keyboard navigation patterns: Enter/Shift+Enter, Escape, Arrow keys)
Architecture ref: interactions.md (keyboard shortcuts documented)

Action: Audit and update 3 key component files for keyboard navigation. (1) features/chat/components/multimodal-input.tsx — Verify: Enter submits (when not composing), Shift+Enter for newline, composition detection via onCompositionStart/End. (2) features/chat/components/message-editor.tsx — Verify: Escape cancels editing, Enter submits edit (or Cmd+Enter). (3) features/artifacts/components/editors/console.tsx — Verify: ArrowUp/ArrowDown adjusts resize height by 10px on the resize handle. Ensure all keyboard handlers don't interfere with normal typing and respect focus context.

Output files:
- features/chat/components/multimodal-input.tsx (modify)
- features/chat/components/message-editor.tsx (modify)
- features/artifacts/components/editors/console.tsx (modify)

Inputs: accessibility.md (keyboard patterns), interactions.md
Outputs: Keyboard navigation works throughout the app

AI layer handling: NEW

Dependencies: P06-T18 (all features built)
Dependents: P07-T14

Success criteria:
- Enter submits chat message (not during composition)
- Shift+Enter creates newline
- Escape cancels message editing
- Arrow keys adjust console resize
- No keyboard traps in any component
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T07]
Title: Verify responsive design across breakpoints
Phase: 7 — Polish Vertical
Type: VERIFICATION

Behavior ref: accessibility.md (mobile vs desktop layout differences); screens.md (responsive behaviors)
Architecture ref: interactions.md (mobile behavior per component)

Action: Audit and fix 3 key areas for responsive design. (1) Artifact panel: verify mobile renders full-screen (w-dvw h-dvh), desktop renders 400px sidebar + remaining. ArtifactMessages not rendered on mobile. (2) Sidebar: verify mobile renders as overlay sheet (SheetContent), desktop renders as fixed panel. Sidebar closes on mobile navigation. (3) Chat header: verify VisibilitySelector hidden on mobile (hidden md:flex), SidebarToggle hidden on mobile (hidden md:block), New Chat button positioning adapts. All interactive elements must have 44px minimum touch targets on mobile. Test at 320px, 768px, and 1024px viewport widths.

Output files:
- features/artifacts/components/artifact-panel.tsx (modify if needed)
- features/sidebar/components/app-sidebar.tsx (modify if needed)
- features/chat/components/chat-header.tsx (modify if needed)

Inputs: accessibility.md (responsive table), screens.md (layout specs)
Outputs: Responsive design verified across breakpoints

AI layer handling: N/A

Dependencies: P06-T18 (all features built)
Dependents: P07-T14

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

### TASK: [ID: P07-T08]
Title: Add reduced motion support
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: accessibility.md (no prefers-reduced-motion checks found — recommendation to add)
Architecture ref: accessibility.md (motion patterns: framer-motion, AnimatePresence)

Action: Update lib/motion.tsx (or create if not exists) — the centralized framer-motion re-export module. Add prefers-reduced-motion support: detect via window.matchMedia("(prefers-reduced-motion: reduce)"), when active: disable spring animations (use instant transitions), disable AnimatePresence transitions, disable staggered animations. This is a single-point change since all motion usage goes through lib/motion.tsx. If framer-motion supports MotionConfig with reducedMotion="user", use that instead.

Output files:
- lib/motion.tsx (create or modify)

Inputs: framer-motion package, accessibility.md (motion patterns)
Outputs: Reduced motion support for all animated components

AI layer handling: NEW

Dependencies: P00-T10 (utils exist)
Dependents: P07-T14

Success criteria:
- prefers-reduced-motion media query detected
- Animations disabled when reduced motion preferred
- Single point of change (lib/motion.tsx)
- Does not break components that import from lib/motion
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P07-T09]
Title: Finalize instrumentation setup
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: N/A (observability infrastructure)
Architecture ref: scaffold/base-config.md (instrumentation hooks)

Action: Finalize 2 instrumentation files. (1) instrumentation.ts — Complete the register() function stub (from P00-T15). When NEXT_RUNTIME === "nodejs": conditionally import OpenTelemetry SDK, configure basic tracing (service name from env or "ai-chatbot"), export spans to configured endpoint (OTEL_EXPORTER_OTLP_ENDPOINT env var, optional). If no OTEL endpoint configured, skip setup (no-op). (2) instrumentation-client.ts — Client-side instrumentation. Export onRequestError hook for error reporting. Optionally integrate with Vercel Web Analytics if @vercel/analytics is present. Keep minimal — client instrumentation should not add bundle size.

Output files:
- instrumentation.ts (finalize)
- instrumentation-client.ts (finalize)

Inputs: instrumentation.ts (P00-T15 stub), @opentelemetry packages (optional dep)
Outputs: Instrumentation hooks active for production monitoring

AI layer handling: NEW

Dependencies: P00-T15
Dependents: P07-T14

Success criteria:
- instrumentation.ts register() runs without error
- OTel setup conditional on OTEL_EXPORTER_OTLP_ENDPOINT
- No runtime error when OTel packages not installed
- instrumentation-client.ts exports are valid
- No significant bundle size increase
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T10]
Title: Create import boundary check script
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: N/A (architectural enforcement)
Architecture ref: DEV-012 (Biome instead of ESLint, CI script for boundary check); conventions.md (layer rules)

Action: Create scripts/check-imports.ts (or .mjs) — ~50-line script that validates import layer boundaries. Rules enforced: (1) app/ files can only import from features/, components/, lib/. (2) features/ files can import from lib/, components/, other features (same feature or explicit cross). (3) components/ files can only import from lib/, other components/. (4) lib/ files can only import from other lib/ files. (5) No direct DB/cache imports from features/ or app/ (must go through lib/data/). Script: glob all .ts/.tsx files, parse import statements via regex, check each against rules. Exit 1 on violations with file:line detail. Add to package.json scripts as "check-imports".

Output files:
- scripts/check-imports.ts

Inputs: conventions.md (layer rules), architecture/patterns.md (import rules)
Outputs: CI-runnable import boundary check

AI layer handling: NEW

Dependencies: None (standalone script)
Dependents: P07-T12, P07-T14

Success criteria:
- Script validates all import paths against layer rules
- Exits 0 when no violations
- Exits 1 with detail on violations
- Runs in <5 seconds
- Added to package.json scripts
- pnpm typecheck passes on the script itself

Complexity: M

---

### TASK: [ID: P07-T11]
Title: Create E2E test specifications
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (all user flows); interactions.md (detailed interaction patterns)
Architecture ref: AGENTS.md (pnpm test:e2e)

Action: Create 4 E2E test spec files using Playwright (or the project's E2E framework). (1) tests/e2e/auth.spec.ts — Login flow (fill form, submit, redirect), register flow, guest auto-bootstrap, logout. (2) tests/e2e/chat.spec.ts — Send message and see streaming response, message appears in list, weather tool invocation, new chat creation + URL change, load existing chat with messages. (3) tests/e2e/artifacts.spec.ts — AI creates text artifact (panel opens), code artifact (CodeMirror renders), version navigation (prev/next), close artifact panel. (4) tests/e2e/sidebar.spec.ts — Chat history loads in sidebar, click chat navigates, delete chat removes from list, new chat button works, mobile sidebar toggle. Each spec covers the happy path for its feature area.

Output files:
- tests/e2e/auth.spec.ts
- tests/e2e/chat.spec.ts
- tests/e2e/artifacts.spec.ts
- tests/e2e/sidebar.spec.ts

Inputs: features.md (user flows), interactions.md (interaction patterns), playwright.config.ts (P00 or existing)
Outputs: E2E test suite runnable via pnpm test:e2e

AI layer handling: NEW

Dependencies: P06-T18 (all features built)
Dependents: P07-T13, P07-T14

Success criteria:
- Auth spec: login, register, guest, logout tests defined
- Chat spec: send message, receive response, tool use tests defined
- Artifacts spec: create, navigate versions, close tests defined
- Sidebar spec: history, navigation, delete tests defined
- All specs follow consistent patterns
- pnpm typecheck passes on test files

Complexity: L

---

### TASK: [ID: P07-T12]
Title: Run full build verification
Phase: 7 — Polish Vertical
Type: VERIFICATION

Behavior ref: N/A
Architecture ref: AGENTS.md (pnpm build as final verification)

Action: Run the complete build pipeline: (1) pnpm typecheck — zero TypeScript errors, (2) pnpm lint — zero Biome lint errors, (3) pnpm format --check — all files formatted, (4) pnpm build — Next.js production build succeeds with zero errors. Analyze build output: check for unexpected large chunks (>500KB), verify code splitting works (editors lazy-loaded), check route manifest for all expected routes. Fix any issues found. Also run: tsx scripts/check-imports.ts — import boundaries respected.

Output files: none (verification only)

Inputs: All project files
Outputs: Build passes — no compilation/lint/format errors

AI layer handling: N/A

Dependencies: P07-T01 through P07-T10
Dependents: P07-T13, P07-T14

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- pnpm build exits 0
- No unexpected large chunks in build output
- scripts/check-imports passes
- All expected routes in route manifest

Complexity: M

---

### TASK: [ID: P07-T13]
Title: Run comprehensive integration test
Phase: 7 — Polish Vertical
Type: VERIFICATION

Behavior ref: features.md (all features end-to-end)
Architecture ref: AGENTS.md (post-implementation validation)

Action: Manual or automated integration verification of all features working together: (1) Auth: login, guest bootstrap, session persistence, (2) Chat: send message → stream response → persist, (3) Chat tools: weather displays result, createDocument opens artifact, updateDocument updates artifact, (4) Artifacts: text/code/sheet editors render, versioning works, suggestions display, (5) Sidebar: history loads, chat switching works, delete works, title syncs, (6) Enhancements: voting works, model selection changes AI, settings affect responses, file upload attaches to messages, visibility toggle works, (7) Error handling: error boundaries catch errors at all 3 levels, (8) Responsive: mobile layout works (sidebar overlay, full-screen artifacts), (9) A11y: keyboard navigation works, ARIA attributes present. Run E2E specs if available.

Output files: none (verification only)

Inputs: All project features
Outputs: Integration verified — all features work together

AI layer handling: N/A

Dependencies: P07-T11, P07-T12
Dependents: P07-T14

Success criteria:
- All 12 features from features.md functional
- No console errors in production build
- All 3 error boundary levels catch errors
- Core Web Vitals acceptable
- Mobile and desktop layouts correct
- All keyboard shortcuts work
- E2E specs pass (if running)

Complexity: L

---

### TASK: [ID: P07-T15]
Title: Connection resilience hook and SSE reconnection
Phase: 7 — Polish Vertical
Type: IMPLEMENTATION

Behavior ref: features.md §1 (Edge Cases), interactions.md §14 (Error States)
Architecture ref: edge-cases.md (reconnection, offline detection)

Action: Create 2 files. (1) features/chat/hooks/use-connection-status.ts — "use client" hook useConnectionStatus() that monitors navigator.onLine and SSE connection health. Returns {isOnline, isConnected, reconnectAttempts}. On offline detection: shows "Connection lost" toast via sonner. On reconnect: auto-retries SSE connection. Uses navigator.onLine + window "online"/"offline" events. (2) Update features/chat/components/chat.tsx — Integrate useConnectionStatus: when offline, disable submit button and show "Offline" indicator in chat header. When SSE drops mid-stream, auto-reconnect with exponential backoff (max 3 retries, 1s/2s/4s). On reconnect success, resume from last received message. Wrap useChat transport with retry logic for transient network failures.

Output files:
- features/chat/hooks/use-connection-status.ts
- features/chat/components/chat.tsx (modify)

Inputs: features/chat/components/chat.tsx (P03-T19), sonner (toast)
Outputs: Connection resilience for streaming chat

AI layer handling: NEW

Dependencies: P03-T19, P06-T18
Dependents: P07-T14

Success criteria:
- navigator.onLine monitored with event listeners
- "Connection lost" toast shown on offline
- SSE reconnection with exponential backoff (max 3 retries)
- Submit button disabled when offline
- No errors thrown on network interruption
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P07-T14]
Title: Verification gate G07 (final)
Phase: 7 — Polish Vertical
Type: VERIFICATION

Behavior ref: All behavioral extraction documents
Architecture ref: AGENTS.md (final validation); strategy/vertical-slices.md (Phase 07 exit criteria)

Action: Final gate — verify all exit criteria from the strategy document. Checklist: (1) Error boundary catches and displays errors at all 3 levels, (2) Loading states render for all route transitions, (3) Sidebar skeleton shows during initial load, (4) App is usable on mobile (320px width), (5) Artifact panel is full-screen on mobile, (6) All interactive elements have ARIA labels, (7) Keyboard navigation works throughout, (8) pnpm build succeeds with zero errors, (9) E2E tests pass for all core flows, (10) No console errors in production build, (11) Import boundary script passes, (12) Bundle size is reasonable (no unexpected large deps), (13) Core Web Vitals are acceptable. Update any documentation if needed. The rebuild is complete.

Output files: none (validation only)

Inputs: All P07-T01 through P07-T13 outputs
Outputs: Gate G07 passed — rebuild complete, production-ready

AI layer handling: N/A

Dependencies: P07-T01 through P07-T13
Dependents: None — this is the final task

Success criteria:
- All 13 exit criteria from strategy/vertical-slices.md P07 verified
- pnpm build exits 0
- E2E tests pass
- No console errors
- Import boundaries respected
- Mobile usable at 320px
- Keyboard navigation functional
- ARIA attributes present
- All features work together

Complexity: S
