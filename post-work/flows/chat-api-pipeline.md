FLOW: Chat API Pipeline (POST /api/chat)
ENTRY: HTTP POST request to /api/chat from client-side DefaultChatTransport

STEPS:
  1. `validateOrigin(request)` (lib/utils/validate-origin.ts) →
     Extracts Origin header (or Referer fallback) →
     Builds allowed origins set: requestUrl.origin + VERCEL_URL + NEXT_PUBLIC_APP_URL + dev origins →
     Returns boolean — 403 if invalid →
     OUTPUT: Pass/fail (sync, no I/O)

  2. `requireChatSession()` (features/chat/lib/chat-route.ts:113-120) →
     Calls `getAppSession()` (React.cache-memoized) →
     Tries Supabase session first, then guest JWT token →
     Returns `AppSession | Response(401)` →
     OUTPUT: Authenticated session with `user.id` and `user.type`

  3. `enforceChatRateLimit(session.user.id)` (features/chat/lib/chat-route.ts:122-135) →
     Calls `checkRateLimit(key, 20, 60)` — Redis INCR + EXPIRE →
     Key: `rate-limit-chat:<userId>` →
     Graceful degradation: allows if Redis unavailable →
     Returns `null` (allowed) or `Response(429)` →
     OUTPUT: Pass/fail

  4. `readChatRequest(request)` (features/chat/lib/chat-route.ts:137-154) →
     `request.json()` → parses body →
     `chatRequestSchema.safeParse(body)` →
     Schema validates: `{ id: uuid, message: { id, role: "user", parts }, selectedChatModel, selectedVisibilityType, settings? }` →
     Returns `ChatRequest | Response(400)` →
     OUTPUT: Validated request data

  5. `resolveChatRouteContext({ session, requestData })` (features/chat/lib/chat-route.ts:156-221) →
     SUB-STEPS:
       5a. `Promise.all([getAvailableModels(), getChatById(chatId)])` — PARALLEL fetch of model catalog + existing chat
       5b. Validate model exists in catalog → 400 if unknown
       5c. Ownership check: `existingChat.userId !== session.user.id` → 403
       5d. If existing chat: `getMessagesForChatRender(chatId)` — fetch all messages (up to 500 limit)
       5e. Convert user message to DB format: `toUserDbMessage(chatId, message)`
       5f. If NEW chat:
           - `ensureGuestUser(session.user.id)` if guest (INSERT IF NOT EXISTS)
           - `createChatWithInitialMessage({...})` — DB TRANSACTION: insert chat + insert user message atomically
       5g. If EXISTING chat:
           - `saveMessages([userDbMessage])` — insert user message
       5h. Build `allMessages`: `[...convertToUIMessages(dbMessages), toUserMessage(message)]`
       5i. Determine `hasTools`: `getEnabledTools(modelMetadata).length > 0` (checks `supportsToolCalling` from metadata)
     OUTPUT: `ChatRouteContext { chatId, message, selectedChatModel, effectiveSettings, allMessages, hasTools, isNewChat, messageText }`

  6. **Title Generation** (app/api/chat/route.ts:119-127) →
     If `isNewChat`: fire-and-forget `generateTitle(messageText).then(title => { generatedTitle = title; emitGeneratedTitle() })` →
     Runs concurrently with streaming — no blocking →
     See "Title Generation" flow

  7. **System Prompt Composition** (app/api/chat/route.ts:136-139) →
     `composeSystemPrompt({ settings: effectiveSettings, hasTools })` →
     Assembles: BASE_PROMPT + date context + user custom prompt (sandboxed) + ARTIFACTS_PROMPT (if tools enabled) →
     OUTPUT: System prompt string

  8. **Provider Options** (app/api/chat/route.ts:141) →
     `getProviderOptions(selectedChatModel, effectiveSettings)` →
     Builds: `{ temperature, topP, maxOutputTokens, providerOptions }` →
     Adds reasoning config per provider (Google thinking budget / OpenAI effort / OpenRouter max_tokens) →
     OUTPUT: Options object to spread into streamText

  9. **Tool Construction** (app/api/chat/route.ts:142-155) →
     `buildChatTools({ hasTools, chatId, chatStream, session })` →
     If hasTools=false: returns undefined (no tools) →
     If hasTools=true: returns `{ getWeather, createArtifact, updateArtifact, requestSuggestions }` →
     Each tool is a factory that receives session + chatStream writer →
     OUTPUT: Tool map or undefined

  10. **Model Resolution** (app/api/chat/route.ts:157) →
      `myProvider.languageModel(selectedChatModel)` →
      See "Model Resolution" flow →
      OUTPUT: Language model instance

  11. **streamText** (app/api/chat/route.ts:159-170) →
      `streamText({ model, system, messages, tools, ...providerOpts, experimental_transform: smoothStream(), stopWhen: stepCountIs(5), abortSignal: request.signal })` →
      Converts UIMessages to model messages via `convertToModelMessages(allMessages)` →
      Multi-step tool loop: up to 5 steps (tool call → result → continue) →
      Smooth stream transform for gradual text delivery →
      Abort tied to client disconnection →
      OUTPUT: StreamResult

  12. **Stream Merge** (app/api/chat/route.ts:172-175) →
      `writer.merge(result.toUIMessageStream({ sendReasoning: true, generateMessageId: generateUUID, onFinish }))` →
      Merges AI stream into the UIMessageStream →
      Reasoning tokens included in stream →
      OUTPUT: SSE stream events to client

  13. **Post-Stream: Title Emission** (app/api/chat/route.ts:227-228) →
      `canEmitGeneratedTitle = true; emitGeneratedTitle()` →
      If title already resolved: writes `data-chat-title` event →
      If not yet resolved: the `.then()` callback from step 6 will emit when ready →
      OUTPUT: Optional title data part in stream

  14. **Post-Stream: Usage Emission** (app/api/chat/route.ts:230-233) →
      `serializeUsage(await result.usage)` — awaits final token counts →
      Writes `data-usage` event with JSON `{ inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens }` →
      OUTPUT: Usage data part in stream

  15. **Response** →
      `stream.pipeThrough(new JsonToSseTransformStream())` →
      Headers: `Cache-Control: no-store` →
      OUTPUT: SSE Response to client

BOTTLENECKS:
  - Steps 1-4 are strictly sequential (CSRF → auth → rate-limit → parse) — each must complete before next starts
  - Step 5d: `getMessagesForChatRender(chatId)` happens only AFTER model validation and ownership check — cannot start earlier because we need chat existence confirmed first
  - Step 5f/5g: DB write (save user message) happens BEFORE streaming starts — blocks time-to-first-token
  - Step 11: `convertToModelMessages(allMessages)` is awaited inline — converts entire message history synchronously before AI call

WASTE:
  - Step 5a fetches the FULL model catalog (`getAvailableModels()`) just to validate one model ID — could use a dedicated `isModelAvailable(id)` check
  - Step 5d fetches ALL messages (up to 500) from DB even when only needed for `convertToModelMessages` — the full history is loaded, converted to UIMessages, then immediately converted back to model messages
  - The `chatRequestSchema` validates message parts as `z.array(partSchema).min(1)` but doesn't enforce max parts — potential for abuse with many file parts

SIMPLIFICATION OPPORTUNITIES:
  - Steps 3 and 4 (rate limit + body parse) are independent of each other and could run in parallel: `Promise.all([enforceChatRateLimit(userId), readChatRequest(request)])` — saves one sequential await
  - Step 5: The message save (5f/5g) could be deferred to after streaming starts (fire-and-forget with retry), reducing time-to-first-token — but this risks data loss if the stream fails before save completes; current approach is safer
  - The double message conversion (DB → UIMessage → ModelMessage) could be eliminated if the DB format stored model-compatible messages directly, but this would couple storage to AI SDK

EXIT: SSE Response streaming to client with message chunks, data parts (artifact deltas, title, usage, errors), and onFinish persistence trigger
