FLOW: Artifact Panel Lifecycle
ENTRY: `isVisible` transitions from `false` to `true` in the artifact store

STEPS:
  --- PANEL MOUNT ---

  1. `ChatShell` (features/chat/components/chat-shell.tsx) renders `<ArtifactPanel chatId={id} />`:
     - `ArtifactPanel` is lazy-loaded via `dynamic()` with `{ ssr: false }`:
       ```js
       const ArtifactPanel = dynamic(
         () => import("@/features/artifacts/components/artifact-panel").then(m => ({ default: m.ArtifactPanel })),
         { ssr: false }
       )
       ```
     - The dynamic import loads when the component first appears in the render tree
     - Since ChatShell always renders `<ArtifactPanel />`, the chunk downloads on first page load (not lazily gated by visibility)

  2. `PureArtifactPanel` (artifact-panel.tsx) calls `useArtifact()`:
     - Returns `{ artifact, setArtifact }` — subscribes to full store state
     - `artifact.isVisible` controls `AnimatePresence` child rendering

  --- VISIBILITY TRIGGER ---

  3. Visibility set to `true` via one of:
     a. **StreamBridge**: `processStreamDelta` processes `artifact-id` delta → `{ ...current, status: "streaming", isVisible: true }` → store update
     b. **ArtifactPreview HitboxLayer**: User clicks preview → `setArtifact(prev => ({ ...prev, artifactId, title, kind, isVisible: true, boundingBox }))` — includes bounding box for origin animation
     c. **ArtifactPreview CompactToolResult**: User clicks compact card → same as HitboxLayer but clears content

  4. `AnimatePresence` detects new child → `motion.div` enters with animation:
     - If `artifact.boundingBox` exists (click from preview): animate FROM the preview's screen position/size TO full viewport
     - If no `boundingBox` (streaming trigger): fade in with slight scale (`opacity: 0, scale: 0.95` → `opacity: 1`)
     - Spring transition: `stiffness: 300, damping: 30`
     - Final state: `width: 100dvw, height: 100dvh, top: 0, left: 0, borderRadius: 0`

  5. Focus management effect (artifact-panel.tsx ~line 73):
     - `previousFocusRef.current = document.activeElement` — saves current focus
     - `requestAnimationFrame(() => panelRef.current?.focus())` — focuses the panel container after mount
     - Panel has `tabIndex={-1}` and `role="dialog"` for accessibility

  --- PANEL ACTIVE STATE ---

  6. SWR version fetch activates:
     - Key: `artifact.artifactId !== "init" && artifact.status !== "streaming" ? "/api/artifact?id=<id>" : null`
     - During streaming: key is `null` → SWR inactive
     - After streaming (status: "idle"): key activates → GET /api/artifact → version list loaded

  7. Panel renders three sections:
     a. **Header** (`ArtifactPanelHeader`): title, kind badge, status indicator, close button, action buttons
     b. **Editor area**: `ArtifactPanelEditor` → kind-specific editor via lazy imports
     c. **Version footer** (`VersionFooter`): only visible when viewing non-current version (AnimatePresence)

  8. Panel is fixed-position fullscreen overlay:
     - `className: "fixed top-0 left-0 z-50 flex h-dvh w-dvw flex-col overflow-hidden"`
     - Uses `dvh`/`dvw` for mobile viewport compatibility
     - `z-50` ensures it's above all other content

  --- STREAMING STATE ---

  9. During streaming (`artifact.status === "streaming"`):
     - SWR key is `null` → no version fetch
     - `saveState` resets to "idle", dirty flag cleared (effect at line 136)
     - Editor receives `status: "streaming"` → enters streaming content display mode
     - Header shows "Generating…" with spinning loader
     - Action buttons disabled (`status === "streaming"` check in ArtifactActions)
     - ArtifactPreview in chat shows loading spinner or compact card

  10. When streaming completes (`artifact-finish` → `status: "idle"`):
      - SWR key activates → fetches version list
      - Version index syncs to latest
      - Editor transitions to editable mode
      - Header shows "Updated X ago" relative timestamp

  --- CLOSE ---

  11. Close triggered via one of:
      a. `ArtifactCloseButton`: `artifactStore.setState(prev => ({ ...prev, isVisible: false }))` — direct store write, no subscription
      b. Chat navigation (`useChatSideEffects`): `artifactStore.reset()` — full state reset including visibility

  12. `AnimatePresence` detects child removal → exit animation:
      - `exit: { opacity: 0, scale: 0.5, transition: { delay: 0.1, stiffness: 600, damping: 30 } }`
      - Panel shrinks and fades out

  13. Focus restoration effect (artifact-panel.tsx ~line 80):
      - `previousFocusRef.current?.focus()` — restores focus to the element that was focused before panel opened
      - `previousFocusRef.current = null` — clears reference

  --- CLEANUP ---

  14. Panel unmount cleanup:
      - `debounceTimerRef.current` cleared (prevents save after unmount)
      - `pendingSaveRef.current?.abort()` — cancels in-flight save requests
      - SWR subscription cleaned up automatically
      - Editor instances destroyed:
        - TextEditor: TipTap editor destroyed by `useEditor` cleanup
        - CodeEditor: `editorRef.current.destroy()` in effect cleanup
        - SheetEditor: React state cleanup (no explicit destroy needed)

  15. If close was via `artifactStore.reset()` (chat navigation):
      - `artifactId` back to "init", all content cleared
      - New chat's streaming will trigger a fresh panel lifecycle

  16. If close was via `ArtifactCloseButton` (just visibility toggle):
      - `artifactId`, `title`, `kind`, `content` preserved in store
      - Panel can be reopened by clicking ArtifactPreview → HitboxLayer → `isVisible: true`
      - Reopening restores the same artifact state without re-fetching

EXIT: Panel unmounted from DOM, focus restored, debounce timers cleared, editor instances destroyed. Store state either preserved (close button) or fully reset (navigation).

BOTTLENECKS:
  - Step 1 (dynamic import): ArtifactPanel chunk downloads on first page load even when no artifact exists. The `dynamic()` with `ssr: false` defers SSR rendering but the chunk still downloads eagerly because ChatShell unconditionally renders `<ArtifactPanel />`.
  - Step 4 (animation frame): `requestAnimationFrame` for focus adds up to 16ms latency before the panel receives focus.
  - Step 6 → 10 (SWR activation after streaming): There is a gap between streaming completion and version data availability. During this gap, the version footer cannot show and the "Updated X ago" timestamp is unavailable.

WASTE:
  - Step 1 (eager chunk load): The ArtifactPanel JS chunk loads on every page visit, even for chats that never use artifacts. Gating the `<ArtifactPanel />` render behind `artifact.isVisible` would make the dynamic import truly lazy.
  - Step 16 (preserved state on close): When the user closes the panel with the close button, all artifact state stays in the store. If they then navigate to a different chat, `useChatSideEffects` resets it. But if they stay on the same chat and interact with a different artifact preview, the old state gets overwritten. There's no conflict resolution — it's a simple overwrite.
  - Step 8 (fullscreen always): The panel is always full viewport. There's no intermediate size or resize capability. On large screens, the full viewport may be excessive for small artifacts.

SIMPLIFICATION OPPORTUNITIES:
  - Gate `<ArtifactPanel />` behind `useArtifactSelector(s => s.isVisible)` in ChatShell to make the dynamic import truly lazy — chunk only downloads when an artifact is first opened.
  - The close button could optionally trigger a full reset instead of just visibility toggle, to free memory for large artifact content strings.
  - Consider adding a panel-specific error boundary wrapping the entire ArtifactPanel (in addition to the per-editor boundary) to catch layout/animation errors.
  - The focus management could use the `inert` attribute on background content instead of manual focus save/restore — this is the modern approach for modal dialogs.
