FLOW: Title Generation (New Chat → AI Title → Stream to Client)
ENTRY: `isNewChat === true` in POST /api/chat handler (app/api/chat/route.ts:119)

STEPS:
  1. `isNewChat` check (app/api/chat/route.ts:119) →
     Determined during `resolveChatRouteContext`: `isNewChat = !existingChat` →
     Only triggers for the FIRST message in a new chat →
     OUTPUT: Boolean gate for title generation

  2. `void generateTitle(messageText)` (app/api/chat/route.ts:120) →
     Fire-and-forget — NOT awaited →
     Runs CONCURRENTLY with the streaming AI response →
     `.then(title => { generatedTitle = title; emitGeneratedTitle() })` →
     `.catch(() => {})` — silently swallowed, title is optional →
     OUTPUT: Promise running in background

  3. `generateTitle(message)` (lib/ai/title.ts:25-44) →
     `getInternalLanguageModel("title")` → resolves to Google provider (always) →
     Internal model lookup:
       - `internalLanguageModels.title` → `{ providerId: "google", modelId: TITLE_MODEL }` (lib/ai/internal-models.ts:8-9)
       - Checks `isProviderConfigured("google")` → requires GEMINI_API_KEY
       - `myProvider.languageModel(TITLE_MODEL)` → through reasoning middleware provider →
     OUTPUT: Language model instance (Google, always)

  4. `generateText({ model, system, prompt, abortSignal })` (lib/ai/title.ts:26-37) →
     System prompt: "generate a short title based on the first message, not more than 80 characters, no quotes or colons" →
     Prompt: raw user message text →
     `AbortSignal.timeout(5000)` — hard 5-second timeout →
     OUTPUT: Generated title string

  5. Title post-processing (lib/ai/title.ts:39) →
     `title.slice(0, MAX_TITLE_LENGTH).trim()` — cap at 80 chars →
     If empty: `fallbackTitle(message)` → `message.trim().slice(0, 80).trim()` or "New Chat" →
     OUTPUT: Final title string (guaranteed non-empty)

  6. Fallback path (lib/ai/title.ts:41-43) →
     `catch` handler for any error (timeout, network, model failure) →
     `fallbackTitle(message)` — extracts first 80 chars from user message →
     OUTPUT: Best-effort title even on total failure

  7. Title assignment (app/api/chat/route.ts:121-122) →
     `.then(title => { generatedTitle = title })` — stores in closure variable →
     `emitGeneratedTitle()` — attempts to write title to stream →
     OUTPUT: Title stored for both stream emission and persistence

  8. `emitGeneratedTitle()` (app/api/chat/route.ts:96-105) →
     Guard: `if (!canEmitGeneratedTitle || titleEmitted || !generatedTitle) return` →
     `canEmitGeneratedTitle` is set to `true` AFTER `writer.merge()` completes (step 13 of API pipeline) →
     This ensures title is only emitted after the stream merge is set up →
     Writes: `writer.write({ type: "data-chat-title", data: generatedTitle })` →
     Sets `titleEmitted = true` to prevent double emission →
     `try/catch` — if stream already closed, silently fails →
     OUTPUT: Title data part in SSE stream (or no-op if stream closed)

  9. **Race Condition Handling** →
     Two paths compete:
       - PATH A: Title resolves BEFORE stream merge set up → `emitGeneratedTitle()` no-ops (canEmitGeneratedTitle=false) → later emitted at step 13 of API pipeline
       - PATH B: Title resolves AFTER stream merge → `emitGeneratedTitle()` succeeds immediately
     In both cases, title is also written to DB during persistence (step 10)

  10. Title persistence (features/chat/lib/chat-route.ts:272-285) →
      In `persistChatResponse()`: `const title = isNewChat ? generatedTitle : undefined` →
      Passed to `saveMessagesAndTouchChat({ chatId, messages, title })` →
      DB TRANSACTION: inserts assistant messages + updates chat title + updates updatedAt →
      If `generatedTitle` is still undefined (title generation hasn't resolved yet): title stays as "New Chat" →
      OUTPUT: Title persisted in DB (if resolved in time)

  11. Client reception (features/chat/hooks/use-chat-session.ts:139-141) →
      `onData` callback: `if (sdkType === "data-chat-title" && typeof dataPart.data === "string")` →
      `callbacksRef.current.onTitleUpdate?.(id, dataPart.data)` →
      OUTPUT: Sidebar updates chat title in real-time

BOTTLENECKS:
  - `generateText` has a hard 5-second timeout — if the title model is slow, it uses all 5s before falling back
  - Title generation uses a SEPARATE AI model call — additional network round-trip + inference time
  - Title must be generated before `onFinish` persistence fires to be included — if title is slow and response is fast, title defaults to "New Chat" in DB

WASTE:
  - The title model always uses Google provider regardless of user's selected provider — this is intentional (cost/latency) but means an extra provider call
  - The closure-variable pattern (`generatedTitle`) with two emission paths (immediate + deferred) is complex for what it achieves
  - If the stream closes before title resolves, the title is silently lost from the stream (only persisted to DB on next successful persistence)

SIMPLIFICATION OPPORTUNITIES:
  - Title could be generated as a PARALLEL step during persistence rather than racing with the stream — emit via cache revalidation instead of SSE
  - The `canEmitGeneratedTitle` / `titleEmitted` / `emitGeneratedTitle` pattern could be simplified to a single Promise that resolves when both conditions are met (title ready + stream merged)
  - Consider a queue-based approach: title generation fires, result goes into a channel, stream consumer reads when ready — eliminates race condition entirely

EXIT: Title string emitted in SSE stream as `data-chat-title` event + persisted to DB in chat title column (or fallback "New Chat" if generation fails/times out). Client sidebar updates title in real-time.
