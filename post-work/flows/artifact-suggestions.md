FLOW: Artifact Suggestions
ENTRY: AI model invokes `requestSuggestions` tool during chat streaming

STEPS:
  --- SERVER-SIDE GENERATION ---

  1. `buildChatTools()` (chat-route.ts:251) → calls `requestSuggestionsTool({ session, chatStream })` → returns AI SDK `tool()` instance
  2. AI model calls `requestSuggestions` tool with `{ artifactId }` (validated as UUID via Zod schema)
  3. `requestSuggestionsTool.execute` (features/chat/lib/tools/request-suggestions.ts:119):
     - `getArtifactById(artifactId)` → DB query for latest version → checks `artifact.content` exists
     - Ownership check: `artifact.userId !== session.userId` → throws `AppError.forbidden`

  4. `streamObject()` call (request-suggestions.ts:138):
     - Model: `getInternalLanguageModel("artifact")` — uses the internal artifact model
     - System prompt: "You are a writing assistant. Analyze the text and provide up to 5 specific suggestions..."
     - Input (`prompt`): `artifact.content` — the full artifact content
     - Output: `"array"` mode with `suggestionElementSchema`:
       - `originalText: string` — exact text to replace
       - `suggestedText: string` — replacement
       - `description: string` — why this change is recommended
       - `occurrenceIndex?: number` — zero-based index for disambiguation

  5. For each streamed element from `elementStream`:
     a. `resolveSuggestionPosition(artifact.content, element.originalText, element.occurrenceIndex)`:
        - `findTextPositions()` → finds ALL occurrences of `originalText` in content (exact string match)
        - If `occurrenceIndex` provided → uses the specific position at that index
        - If single occurrence → uses it directly with `occurrenceIndex: 0`
        - If multiple occurrences and no index → returns empty `{}` (no position resolved)
     b. Constructs `ArtifactSuggestion` with resolved `selectionStart` and `selectionEnd`
     c. `chatStream.writeData({ type: "artifact-suggestion", content: suggestion })` → SSE event with full suggestion object (not string — serialized as JSON)
     d. Pushes to local `suggestions` array

  6. After all elements streamed:
     - If NOT guest AND suggestions.length > 0 → `saveSuggestions(suggestionsToSave)`:
       - Maps each suggestion to `NewSuggestion` with: `id` (UUID), `artifactId`, `artifactCreatedAt`, `originalText`, `suggestedText`, `description`, `isResolved: false`, `userId`, `createdAt`
       - `db.insert(suggestions).values(data).returning()` — batch INSERT
     - Returns tool result: `{ id, title, kind, message: "Suggestions generated." }`

  --- CLIENT-SIDE RENDERING ---

  7. SSE events arrive as `data-artifact-suggestion` → `useChatSession.onData` → strips prefix → `DataPart { type: "artifact-suggestion", content: ArtifactSuggestion }`
  8. `ChatStreamProvider` → RAF batching → `StreamBridge` → `processStreamDelta()`:
     - `artifact-suggestion` case → `{ ...current, suggestions: [...(current.suggestions ?? []), delta.content] }` — APPENDS to suggestions array
  9. `artifactStore.setState()` → emits change → subscribers notified

  10. `ArtifactPanel` passes `artifact.suggestions ?? []` to `ArtifactPanelEditor`:
      - Only TextEditor receives suggestions (code/sheet/image editors don't have suggestion UI)

  11. `TextEditor` (editors/text-editor.tsx) receives `suggestions` prop:
      - Effect at ~line 116: `projectWithPositions(editor.state.doc, suggestions)`:
        a. For each suggestion, finds positions of `originalText` in the ProseMirror document
        b. Resolves position using `resolveProducerPosition()` which tries:
           - Explicit `selectionStart`/`selectionEnd` from server
           - `occurrenceIndex` from array of found positions
           - Falls back to single occurrence or positional match
        c. Returns `UISuggestion[]` with `id`, resolved `selectionStart`, `selectionEnd`
      - Filters: `s.selectionEnd > s.selectionStart` — drops unresolvable suggestions
      - `createDecorations(projected, editor.view)`:
        a. For each suggestion → creates TWO ProseMirror decorations:
           - `Decoration.inline()` — highlights the original text with CSS class `suggestion-highlight`
           - `Decoration.widget()` — inserts a `SuggestionWidget` React component at the selection start
      - Dispatches via `editor.state.tr.setMeta(suggestionsPluginKey, { decorations })`

  12. `SuggestionsExtension` (lib/suggestions-extension.tsx) — TipTap extension wrapping a ProseMirror plugin:
      - Plugin key: `suggestionsPluginKey`
      - State: `{ decorations: DecorationSet, selected: null }`
      - `apply(tr, state)`: if meta with `suggestionsPluginKey` exists → replaces state; otherwise maps decorations through transaction mapping
      - Props: `decorations(state)` → returns current decoration set

  13. `SuggestionWidget` React component renders inline:
      - Shows: description text, "Apply" button, dismiss (X) button
      - **Apply**: Dispatches ProseMirror transaction:
        a. Removes decoration for this suggestion from the set
        b. `tr.replaceWith(selectionStart, selectionEnd, schema.text(suggestedText))` — replaces original with suggested text
        c. `tr.setMeta("no-debounce", true)` — triggers immediate save (not debounced)
        d. Editor `onUpdate` fires → `onSaveContent(markdown, { debounce: false })` → immediate save to server
      - **Dismiss**: Removes decoration only (no content change)

  --- SUGGESTIONS API (separate from streaming) ---

  14. `GET /api/suggestions?artifactId=<id>&artifactCreatedAt=<iso>` (app/api/suggestions/route.ts):
      - Auth check → guest users get empty array (suggestions not persisted for guests)
      - Validates via `querySchema` (artifactId: UUID, artifactCreatedAt: ISO datetime optional)
      - IDOR check: fetches artifact, verifies `userId` match
      - `getSuggestionsByArtifactVersion(artifact.id, artifact.createdAt)` → DB SELECT
      - Returns `{ suggestions }` with `Cache-Control: private, max-age=30`
      - NOTE: This endpoint is for loading persisted suggestions on revisit, NOT for the real-time streaming flow

EXIT: Suggestions rendered as inline decorations in TipTap editor, user can apply (replaces text + saves) or dismiss (removes decoration)

BOTTLENECKS:
  - Step 4 (streamObject): AI model generates up to 5 suggestions. Each suggestion requires the model to:
    a. Identify a passage to improve
    b. Generate replacement text
    c. Provide a description
    All suggestions are streamed sequentially via `elementStream` — each element arrives only after the previous is fully generated.
  - Step 5a (findTextPositions): Linear scan of the full artifact content for each suggestion's `originalText`. For large documents with repeated phrases, this could be slow.
  - Step 6 (saveSuggestions): Batch INSERT waits for all suggestions to be generated first. During streaming, suggestions are sent to client in real-time but persistence is deferred.

WASTE:
  - Step 8: Each suggestion arrival creates a NEW suggestions array via spread: `[...current.suggestions, delta.content]`. For 5 suggestions, this creates 5 intermediate arrays.
  - Step 11: `projectWithPositions` re-runs on every suggestions change (each new suggestion appended triggers a re-render and re-projection). The decoration creation and dispatch happens for ALL suggestions, not just the new one.
  - Step 13 (SuggestionWidget): Uses `createRoot` from react-dom/client for EACH widget — each suggestion gets its own React root. This is necessary for ProseMirror compatibility but adds overhead. The roots are cleaned up in `destroy()` via `setTimeout(() => root.unmount(), 0)`.

SIMPLIFICATION OPPORTUNITIES:
  - Suggestion position resolution runs twice — once on server (step 5a) and once on client (step 11). The server resolves positions against raw content, the client resolves against the ProseMirror document. Consider trusting server-resolved positions and only re-resolving on the client if the document has been edited since.
  - The `createDecorations` function creates ALL decorations from scratch each time. Consider diffing against previous decorations and only adding/removing changed ones.
  - Guest user suggestions are streamed to the client (step 7-9) but never persisted (step 6). The streaming itself is still useful for real-time display, but the client could be informed that these won't survive a page refresh.
