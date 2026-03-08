FLOW: Tool Execution (AI decides to call tool → result → continue or finish)
ENTRY: AI model returns a tool_call during streamText multi-step loop (app/api/chat/route.ts:159)

STEPS:
  1. `streamText` with `stopWhen: stepCountIs(5)` (app/api/chat/route.ts:169) →
     AI SDK detects tool_call in model output →
     Identifies tool by name from the tools map: `{ getWeather, createArtifact, updateArtifact, requestSuggestions }` →
     Validates tool input against the tool's Zod `inputSchema` →
     OUTPUT: Validated tool call with typed parameters

  2. **Tool dispatch** — AI SDK calls `tool.execute(params)` →
     Tool factories were created in `buildChatTools` (features/chat/lib/chat-route.ts:224-258) →
     Each tool receives injected `session: { userId, isGuest }` and `chatStream: ArtifactStreamWriter` →
     The `chatStream.writeData()` call maps to `writer.write({ type: 'data-<type>', data: content })` in the SSE stream →
     OUTPUT: Tool return value (or error)

  --- TOOL: createArtifact (features/chat/lib/tools/create-artifact.ts) ---

  3a. Input: `{ title: string, kind: "text" | "code" | "sheet" }` →
      `generateUUID()` → artifact ID

  3b. `writeArtifactCreatePrelude(chatStream, { id, title, kind })` (artifact-tool-utils.ts:86-90) →
      Writes 4 SSE events in sequence:
        - `artifact-kind` → kind value
        - `artifact-id` → artifact UUID
        - `artifact-title` → title string
        - `artifact-clear` → empty string (reset client content)
      OUTPUT: Client artifact panel opens with streaming status

  3c. `getArtifactHandler(kind)` (lib/ai/artifact-handlers.ts) →
      Registry lookup for handler by kind →
      Handlers registered via side-effect import: `import "@/features/artifacts/handlers"` at top of route.ts →
      OUTPUT: Handler object with `create()` and `update()` methods

  3d. `handler.create({ id, title, kind, chatId, session, chatStream })` →
      Handler generates content (uses internal AI model for code/text/sheet) →
      Streams content deltas via `chatStream.writeData({ type: "artifact-<kind>Delta", content })` →
      OUTPUT: Final content string

  3e. `ensureArtifactContent(content, "create")` (artifact-tool-utils.ts:23-30) →
      Validates content is non-empty → throws `ai_error:artifact:empty_output` if blank →
      OUTPUT: Validated content string

  3f. `saveArtifactVersion({ id, title, content, kind, userId, chatId })` (lib/data/artifact.ts) →
      DB INSERT into artifact_versions table →
      OUTPUT: Persisted artifact

  3g. `writeArtifactFinish(chatStream)` (artifact-tool-utils.ts:92-94) →
      Writes `artifact-finish` → empty string →
      OUTPUT: Client artifact panel status → idle

  3h. Return value: `{ id, title, kind, content: 'Created artifact: "<title>"' }` →
      This feeds back into the AI model as tool result for next step

  --- TOOL: updateArtifact (features/chat/lib/tools/update-artifact.ts) ---

  4a. Input: `{ id: string, description: string }` →
      `getArtifactById(id)` → fetches existing artifact from DB

  4b. Ownership check: `artifact.userId !== session.userId` → throws 403 if mismatch

  4c. `createDeferredArtifactClearWriter(chatStream)` (artifact-tool-utils.ts:38-78) →
      Creates a wrapper writer that DEFERS the `artifact-clear` signal →
      Buffers leading whitespace tokens → only sends `clear` when first non-whitespace delta arrives →
      PURPOSE: Prevents content flash (user sees blank artifact before new content starts rendering)

  4d. `handler.update({ id, title, kind, currentContent, description, session, chatStream: updateStream })` →
      Uses deferred writer → streams content deltas →
      OUTPUT: Updated content string

  4e. `ensureArtifactContent(updatedContent, "update")` → validates non-empty

  4f. `saveArtifactVersion({ id, title, content, kind, userId, chatId })` →
      DB INSERT new version (append-only versioning) →
      OUTPUT: New artifact version persisted

  4g. `writeArtifactFinish(chatStream)` → signals client completion

  4h. Return: `{ id, title, kind, content: "The artifact has been updated successfully." }`

  --- TOOL: requestSuggestions (features/chat/lib/tools/request-suggestions.ts) ---

  5a. Input: `{ artifactId: string }` →
      `getArtifactById(artifactId)` → fetches artifact + ownership check

  5b. `streamObject({ model: getInternalLanguageModel("artifact"), ..., output: "array", schema: suggestionElementSchema })` →
      Uses INTERNAL Google model (always, regardless of user's selected model) →
      Streams suggestion objects: `{ originalText, suggestedText, description, occurrenceIndex? }`

  5c. For each streamed element:
      `resolveSuggestionPosition(artifact.content, originalText, occurrenceIndex)` →
      Finds exact text positions in artifact content → resolves `selectionStart` / `selectionEnd` →
      Writes `artifact-suggestion` data part with full `ArtifactSuggestion` object →
      OUTPUT: Real-time suggestion events to client

  5d. Persistence: if `!session.isGuest && suggestions.length > 0`:
      `saveSuggestions(suggestionsToSave)` → batch INSERT into suggestions table →
      Guest users receive streamed suggestions but they are NOT persisted

  5e. Return: `{ id, title, kind, message: "Suggestions generated." }`

  --- TOOL: getWeather (features/chat/lib/tools/weather.ts) ---

  6a. Input: `{ latitude, longitude }` OR `{ city: string }` (union schema) →
      If city: `geocodeCity(city)` → Open-Meteo geocoding API (10s timeout) →
      City results cached in-memory `Map` with 30s TTL

  6b. `fetchJson(weatherUrl)` → Open-Meteo weather API (10s timeout) →
      Returns current weather data object

  6c. Return: weather result object (fed back to AI as tool result)

  --- MULTI-STEP LOOP ---

  7. AI SDK receives tool result → feeds back to model as next message →
     Model may:
       - Generate another tool call (loops back to step 1)
       - Generate text response (stream completes)
     Loop limited by `stopWhen: stepCountIs(5)` — max 5 tool call rounds

BOTTLENECKS:
  - Artifact tools block on DB save (step 3f/4f) BEFORE writing finish signal — client waits for persistence
  - `getArtifactById` in updateArtifact/requestSuggestions is a DB round-trip before content generation starts
  - requestSuggestions uses `streamObject` with internal model — a SECOND AI call within the tool, adding significant latency
  - Multi-step loop is sequential: each tool call must complete before the model can generate the next step

WASTE:
  - createArtifact fetches no existing data but still goes through the handler registry lookup each time (negligible cost, but the registry pattern adds indirection)
  - updateArtifact fetches the full artifact row just to get `kind`, `title`, `content`, and `chatId` — could use a lighter query
  - requestSuggestions loads the full artifact content twice conceptually: once for the AI prompt, once for position resolution

SIMPLIFICATION OPPORTUNITIES:
  - Artifact DB save (3f/4f) could be fire-and-forget with retry (like message persistence) — write `artifact-finish` immediately, persist in background
  - The deferred clear writer (4c) is clever but adds complexity; an alternative is to send clear immediately with a CSS transition to smooth the visual
  - Tool factories could share a common session+ownership validation middleware instead of each tool duplicating ownership checks

EXIT: Tool result returned to AI model → model either calls another tool (loop) or generates final text response → stream completes → onFinish triggers persistence
