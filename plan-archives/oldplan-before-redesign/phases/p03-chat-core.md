# Phase P03 — Chat Core Vertical

> Core chat vertical slice. Implements the complete chat experience: AI provider registry,
> settings, streaming, message display, input, tools, and page routes.
>
> **Entry state**: P02 complete — auth works, data layer ready, session resolution functional.
> **Exit state**: Users can send messages, receive AI streaming responses, see reasoning, use weather tool.
> **Est. duration**: ~4 days
> **Tasks**: 24
> **Files created**: ~45

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P03-T01 | Create AI provider registry | IMPLEMENTATION | L | 2 |
| P03-T02 | Create AI provider wrapper | IMPLEMENTATION | L | 1 |
| P03-T03 | Create AI model discovery | IMPLEMENTATION | M | 1 |
| P03-T04 | Create settings module | IMPLEMENTATION | M | 3 |
| P03-T05 | Create chat schemas | IMPLEMENTATION | M | 2 |
| P03-T06 | Create system prompts | IMPLEMENTATION | M | 1 |
| P03-T07 | Create chat completion logic | IMPLEMENTATION | L | 1 |
| P03-T08 | Create chat tools | IMPLEMENTATION | M | 4 |
| P03-T09 | Create stream chat action | IMPLEMENTATION | L | 1 |
| P03-T10 | Create message persistence actions | IMPLEMENTATION | M | 2 |
| P03-T11 | Create chat hooks | IMPLEMENTATION | M | 2 |
| P03-T12 | Create DataStream infrastructure | IMPLEMENTATION | L | 2 |
| P03-T13 | Create empty state components | IMPLEMENTATION | S | 2 |
| P03-T14 | Create message display | IMPLEMENTATION | L | 2 |
| P03-T15 | Create message interaction | IMPLEMENTATION | M | 2 |
| P03-T16 | Create messages list | IMPLEMENTATION | L | 1 |
| P03-T17 | Create chat input | IMPLEMENTATION | L | 1 |
| P03-T18 | Create chat header + weather | IMPLEMENTATION | M | 2 |
| P03-T19 | Create chat orchestrator | INTEGRATION | L | 1 |
| P03-T20 | Create chat API route | IMPLEMENTATION | M | 1 |
| P03-T21 | Create chat layouts | INTEGRATION | L | 2 |
| P03-T22 | Create chat pages | IMPLEMENTATION | M | 2 |
| P03-T23 | Create chat error states | IMPLEMENTATION | S | 2 |
| P03-T24 | Verification gate G03 | VERIFICATION | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-006 | Chat streaming + data persistence | P03-T09, P03-T19, P03-T20 |
| SEAM-007 | DataStream custom types | P03-T12 |
| SEAM-008 | AI completion orchestration | P03-T07, P03-T09 |
| SEAM-015 | Settings to completion pipeline | P03-T04, P03-T19 |
| SEAM-028 | Chat component assembly | P03-T19 |
| SEAM-029 | Provider tree (chat level) | P03-T21 |
| SEAM-031 | useChat + DataStreamHandler sync | P03-T19 |
| SEAM-038 | Message edit + re-submit | P03-T15, P03-T10 |

---

## Tasks

---

### TASK: [ID: P03-T01]
Title: Create AI provider registry
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (createProviderRegistry with 6 conditional providers)
Architecture ref: architecture/patterns.md (AI provider pattern); architecture/decisions.md (multi-provider support)

Action: Create lib/ai/registry.ts — Export createProviderRegistry() function that creates a Vercel AI SDK experimental_createProviderRegistry (or customProvider) with 6 providers, each conditionally registered based on env var presence: openai (OPENAI_API_KEY), google (GOOGLE_GENERATIVE_AI_API_KEY), anthropic (ANTHROPIC_API_KEY), openrouter (createOpenRouter with OPENROUTER_API_KEY), cloudflare-workers (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID), vercel-gateway (gateway with all keys). Each provider is only registered if its env var exists. Create lib/ai/index.ts barrel re-exporting registry, providers (P03-T02), and model-discovery (P03-T03).

Output files:
- lib/ai/registry.ts
- lib/ai/index.ts

Inputs: ai-sdk-usage.md (provider configuration); ai, @ai-sdk/openai, @ai-sdk/google, @ai-sdk/anthropic packages
Outputs: Provider registry consumed by AI provider wrapper (P03-T02) and completion logic (P03-T07)

AI layer handling: NEW

Dependencies: P01-T16
Dependents: P03-T02, P03-T03, P03-T07

Success criteria:
- createProviderRegistry returns functional registry
- Providers only registered when env vars present
- Registry resolves model IDs like "google:gemma-3-4b-it"
- Missing provider env var does not cause startup error
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T02]
Title: Create AI provider wrapper with middleware
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (myProvider wrapper, reasoning middleware, model resolution)
Architecture ref: architecture/patterns.md (AI provider middleware chain)

Action: Create lib/ai/providers.ts — Export myProvider as a customProvider that wraps the registry from P03-T01. The wrapper: (1) Resolves model IDs (e.g., "google:gemma-3-4b-it") through the registry. (2) Applies reasoning middleware for models that support it (wrapLanguageModel with extractReasoningMiddleware for Anthropic thinking, OpenAI reasoning, etc.). (3) Maps ReasoningType to appropriate middleware configuration per provider. (4) Export getModel(modelId: string): LanguageModel function that resolves and wraps a model with appropriate middleware. (5) Export isValidModelId(id: string): boolean for validation.

Output files:
- lib/ai/providers.ts

Inputs: lib/ai/registry.ts (P03-T01), lib/types/ai.types.ts (ReasoningType from P00-T08), Vercel AI SDK
Outputs: myProvider and getModel consumed by completion logic (P03-T07) and chat API route (P03-T20)

AI layer handling: NEW

Dependencies: P03-T01
Dependents: P03-T07, P03-T20

Success criteria:
- myProvider resolves any registered model ID
- Reasoning middleware applied for Anthropic/OpenAI/Gemini thinking models
- getModel("google:gemma-3-4b-it") returns usable LanguageModel
- isValidModelId validates against registered providers
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T03]
Title: Create AI model discovery
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (dynamic model discovery from provider APIs, model catalog)
Architecture ref: architecture/patterns.md (model discovery); data-flows.md (model metadata)

Action: Create lib/ai/model-discovery.ts — Export discoverModels(): Promise<ModelMetadata[]> that queries each registered provider's model listing API and returns normalized ModelMetadata objects. Export getModelCatalog(): ModelMetadata[] that returns the cached/static model catalog (fallback when discovery fails). Each ModelMetadata includes: id, provider, name, capabilities, modality, contextWindow, reasoningType?, isDefault. Include a hardcoded DEFAULT_MODELS fallback array with at least the 3 default models (DEFAULT_CHAT_MODEL, DEFAULT_TITLE_MODEL, DEFAULT_ARTIFACT_MODEL). This is consumed by model selector (P06) but defined here as shared infrastructure.

Output files:
- lib/ai/model-discovery.ts

Inputs: lib/ai/registry.ts (P03-T01), lib/types/ai.types.ts (ModelMetadata from P00-T08)
Outputs: Model catalog consumed by model selector (P06) and settings (P03-T04)

AI layer handling: NEW

Dependencies: P03-T01
Dependents: P03-T04, P06 (model selector)

Success criteria:
- discoverModels returns array of ModelMetadata
- getModelCatalog returns fallback array when discovery fails
- DEFAULT_MODELS includes default chat, title, and artifact models
- ModelMetadata matches type definition from ai.types.ts
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T04]
Title: Create settings module
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (settings: model selection, default model persistence); state-management.md (settings state)
Architecture ref: ADR-001 (feature collocation); SEAM-015 (settings to completion pipeline)

Action: Create 3 files in features/settings/. (1) features/settings/lib/types.ts — ChatSettings type with selectedModel (string, defaults to DEFAULT_CHAT_MODEL), temperature (number), maxTokens (number). (2) features/settings/lib/defaults.ts — DEFAULT_SETTINGS constant, getSettings(cookies/localStorage): ChatSettings reader, saveSettings(settings) writer. Settings stored in localStorage for client, passed to server via request body. (3) features/settings/hooks/use-settings.ts — "use client" hook useSettings() that reads/writes settings from localStorage, returns {settings, updateSettings, resetSettings}. Uses useState + useEffect for hydration safety.

Output files:
- features/settings/lib/types.ts
- features/settings/lib/defaults.ts
- features/settings/hooks/use-settings.ts

Inputs: lib/types/ai.types.ts (DEFAULT_CHAT_MODEL from P00-T08)
Outputs: ChatSettings type consumed by chat completion (P03-T07); useSettings consumed by chat component (P03-T19)

AI layer handling: NEW

Dependencies: P00-T08, P01-T16
Dependents: P03-T07, P03-T19

Success criteria:
- ChatSettings type includes selectedModel, temperature, maxTokens
- DEFAULT_SETTINGS uses DEFAULT_CHAT_MODEL
- useSettings reads from localStorage with SSR safety
- Settings persist across page reloads
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T05]
Title: Create chat validation schemas
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: api-contracts.md (POST /api/chat request body schema)
Architecture ref: conventions.md (Zod schemas with Schema suffix); AGENTS.md (input validation via Zod)

Action: Create 2 files. (1) features/chat/schemas/chat.schema.ts — chatRequestSchema (Zod: id string uuid, message object with role/content/parts, selectedModel string, settings optional ChatSettings). (2) features/chat/schemas/message.schema.ts — messageSchema (Zod: id, chatId, role enum, parts array, attachments array optional, createdAt), editMessageSchema (messageId, content string for re-edit flow), deleteMessagesSchema (chatId, messageId for delete-trailing). These schemas validate all chat-related API inputs.

Output files:
- features/chat/schemas/chat.schema.ts
- features/chat/schemas/message.schema.ts

Inputs: lib/types/ (P00-T08), features/settings/lib/types.ts (P03-T04)
Outputs: Chat schemas consumed by stream chat action (P03-T09), API route (P03-T20), message actions (P03-T10)

AI layer handling: NEW

Dependencies: P00-T08, P01-T16
Dependents: P03-T09, P03-T10, P03-T20

Success criteria:
- chatRequestSchema validates POST /api/chat body shape
- messageSchema validates message structure
- deleteMessagesSchema validates chatId + messageId
- All schemas export inferred TypeScript types
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T06]
Title: Create system prompts
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (system prompt with artifacts instructions, date context, tool descriptions)
Architecture ref: architecture/patterns.md (prompt management)

Action: Create features/chat/lib/prompts.ts — Export buildSystemPrompt(context?: {artifacts?: boolean}): string that assembles the system prompt. Include: base assistant identity, current date/time, available tools description, artifacts instructions (conditionally included). Export PROMPT_FRAGMENTS object with individual sections: IDENTITY, DATE_CONTEXT, TOOLS_DESCRIPTION, ARTIFACTS_INSTRUCTIONS, FORMATTING_RULES. Copy prompt content from oldapp/lib/ai/prompts.ts or equivalent. The prompt must describe available tools (weather, createDocument, updateDocument) and artifact document kinds (text, code, image, sheet).

Output files:
- features/chat/lib/prompts.ts

Inputs: oldapp/lib/ai/prompts.ts (reference), ai-sdk-usage.md (tool descriptions)
Outputs: System prompt consumed by completion logic (P03-T07)

AI layer handling: COPY_CONTENT

Dependencies: P01-T16
Dependents: P03-T07

Success criteria:
- buildSystemPrompt returns non-empty string
- Prompt includes date context with current date
- Prompt includes tool descriptions
- PROMPT_FRAGMENTS exportable for testing/customization
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T07]
Title: Create chat completion orchestration
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (streamText call with tools, maxSteps, onFinish callback, token usage)
Architecture ref: architecture/patterns.md (AI completion pattern); SEAM-008 (AI completion orchestration)

Action: Create features/chat/lib/completion.ts — Export executeChatCompletion(params: {modelId, messages, system, tools, dataStream, onFinish}) that calls Vercel AI SDK streamText with: model from getModel(modelId), system prompt, messages array, tools map, maxSteps (5 for tool-calling loops), onFinish callback for persisting messages and tracking usage. Returns the streamText result. This is the core AI orchestration function — it does NOT handle HTTP or actions, only the AI SDK call. Handles AbortSignal for cancellation. Writes custom data to dataStream on events (title generation, usage tracking).

Output files:
- features/chat/lib/completion.ts

Inputs: lib/ai/providers.ts (P03-T02 — getModel), features/chat/lib/prompts.ts (P03-T06), features/chat/lib/tools/ (P03-T08), Vercel AI SDK
Outputs: executeChatCompletion consumed by stream chat action (P03-T09)

AI layer handling: NEW

Dependencies: P03-T02, P03-T06, P03-T08
Dependents: P03-T09

Success criteria:
- streamText called with correct parameters
- maxSteps set to 5 for multi-step tool calling
- onFinish callback receives complete message for persistence
- AbortSignal propagated for cancellation
- dataStream.writeData used for custom events
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T08]
Title: Create chat tools
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (tool definitions: getWeather, createDocument, updateDocument, requestSuggestions)
Architecture ref: architecture/patterns.md (AI tool pattern); features.md (weather tool, document tools)

Action: Create 4 tool files in features/chat/lib/tools/. (1) weather.ts — Full implementation of getWeather tool: Zod schema for params (latitude, longitude), execute function that calls Open-Meteo API, returns {temperature, weather}. Generates WeatherComponent UI in tool result. (2) create-document.ts — STUB: tool definition with schema (title, kind) but execute returns "Document creation not yet available" (requires P04). (3) update-document.ts — STUB: tool definition with schema (id, description) but execute returns "Document update not yet available". (4) suggestions.ts — STUB: tool definition with schema (documentId) but execute returns "Suggestions not yet available". Export all tools as a toolsMap object for registration in completion.ts.

Output files:
- features/chat/lib/tools/weather.ts
- features/chat/lib/tools/create-document.ts
- features/chat/lib/tools/update-document.ts
- features/chat/lib/tools/suggestions.ts

Inputs: ai-sdk-usage.md (tool specs), zod package, Vercel AI SDK (tool helper)
Outputs: Tools map consumed by completion.ts (P03-T07)

AI layer handling: NEW

Dependencies: P01-T16
Dependents: P03-T07

Success criteria:
- getWeather tool fully functional (calls Open-Meteo API)
- 3 stub tools return "not yet available" messages
- All tools have Zod parameter schemas
- Tools exported as combined map object
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T09]
Title: Create stream chat server action
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (server action for chat streaming); data-flows.md (message persistence on completion)
Architecture ref: SEAM-006 (chat streaming + data persistence); conventions.md (server actions)

Action: Create features/chat/actions/stream-chat.ts — "use server" action streamChat(params: {id, messages, selectedModel}): Promise<{dataStream: ReadableStream}>. Flow: (1) Resolve session via getAppSession(), (2) Validate input with chatRequestSchema, (3) Get or create chat record, (4) Create dataStreamResponse using createDataStream(), (5) Call executeChatCompletion() with messages, model, tools, dataStream, (6) In onFinish: save assistant message via saveMessages(), generate title if first message (using generateText with DEFAULT_TITLE_MODEL), write title to dataStream, track usage, (7) Return the dataStream for client consumption. This is the primary server action called by useChat on the client.

Output files:
- features/chat/actions/stream-chat.ts

Inputs: features/auth/lib/session.ts (P02-T01), features/chat/schemas/ (P03-T05), features/chat/lib/completion.ts (P03-T07), lib/data/chat.ts (P01-T07), lib/data/message.ts (P01-T08)
Outputs: Stream action consumed by useChat hook via chat API route (P03-T20) or directly

AI layer handling: NEW

Dependencies: P03-T07, P03-T05, P02-T01, P01-T07, P01-T08
Dependents: P03-T20

Success criteria:
- Action resolves session and validates input
- Chat created if not exists
- executeChatCompletion called with correct params
- onFinish persists assistant message
- Title generated for first message and written to dataStream
- Returns ReadableStream
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T10]
Title: Create message persistence actions
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (message edit/re-submit, delete trailing messages); data-flows.md (message mutation flows)
Architecture ref: conventions.md (server actions); SEAM-038 (message edit + re-submit)

Action: Create 2 files. (1) features/chat/actions/save-message.ts — "use server" action saveUserMessage(params: {chatId, message}): saves a user message to the database via saveMessages(). Used when user sends a message (before AI response). (2) features/chat/actions/delete-trailing-messages.ts — "use server" action deleteTrailingMessages(params: {chatId, messageId}): deletes the specified message and all subsequent messages (by createdAt). Used by message edit flow — when user edits a previous message, all messages after it are deleted, then the edited message is re-submitted for a new AI response.

Output files:
- features/chat/actions/save-message.ts
- features/chat/actions/delete-trailing-messages.ts

Inputs: lib/data/message.ts (P01-T08), features/auth/lib/session.ts (P02-T01), features/chat/schemas/message.schema.ts (P03-T05)
Outputs: Persistence actions consumed by message editor (P03-T15) and chat component (P03-T19)

AI layer handling: NEW

Dependencies: P01-T08, P02-T01, P03-T05
Dependents: P03-T15, P03-T19

Success criteria:
- saveUserMessage persists message to DB and invalidates cache
- deleteTrailingMessages removes correct range of messages
- Both validate session before operating
- Both use Zod schemas for input validation
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T11]
Title: Create chat client hooks
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: state-management.md (useMessages composition, useScrollToBottom behavior)
Architecture ref: ADR-001 (feature collocation for hooks); DEV-003 (hooks in feature dir)

Action: Create 2 hooks. (1) features/chat/hooks/use-messages.ts — "use client" hook useMessages(chatId: string) that provides messages for a chat. Wraps useChat's messages with additional logic: optimistic message handling, message formatting for display, grouping by role for rendering. Returns {messages, isLoading, error, mutate}. Uses SWR or React state for message cache. (2) features/chat/hooks/use-scroll-to-bottom.ts — "use client" hook useScrollToBottom() that auto-scrolls chat container to bottom on new messages. Returns {containerRef, endRef, isAtBottom, scrollToBottom}. Uses IntersectionObserver for efficient scroll detection.

Output files:
- features/chat/hooks/use-messages.ts
- features/chat/hooks/use-scroll-to-bottom.ts

Inputs: oldapp/hooks/use-messages.tsx (reference), oldapp/hooks/use-scroll-to-bottom.tsx (reference)
Outputs: Chat hooks consumed by messages component (P03-T16) and chat component (P03-T19)

AI layer handling: NEW

Dependencies: P01-T16
Dependents: P03-T16, P03-T19

Success criteria:
- useMessages returns typed message array for given chatId
- useScrollToBottom auto-scrolls on new content
- Both hooks have "use client" directive
- IntersectionObserver used for scroll detection (not scroll events)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T12]
Title: Create DataStream infrastructure
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: ai-sdk-usage.md (custom data stream parts); state-management.md (DataStreamProvider, DataStreamHandler)
Architecture ref: SEAM-007 (DataStream custom types); architecture/patterns.md (streaming data pattern)

Action: Create 2 files. (1) features/chat/components/data-stream-provider.tsx — "use client" context provider that holds the current dataStream state (parsed custom data parts). Creates React context DataStreamContext with value containing accumulated data from stream (suggestions, title, usage, document updates). Export DataStreamProvider and useDataStream hook. (2) features/chat/components/data-stream-handler.tsx — "use client" component that consumes useChat's data stream and dispatches custom data parts to DataStreamContext. Handles all CustomUIDataTypes from ai.types.ts: data-id, data-title, data-kind, data-clear, data-finish, data-textDelta, data-codeDelta, data-sheetDelta, data-imageDelta, data-suggestion, data-chatTitle, data-usage, data-appendMessage. Updates local state based on stream events.

Output files:
- features/chat/components/data-stream-provider.tsx
- features/chat/components/data-stream-handler.tsx

Inputs: lib/types/ai.types.ts (CustomUIDataTypes from P00-T08), oldapp/components/data-stream-provider.tsx + data-stream-handler.tsx (reference)
Outputs: DataStream context consumed by chat component (P03-T19), artifact components (P04)

AI layer handling: NEW

Dependencies: P00-T08, P01-T16
Dependents: P03-T19, P03-T21, P04 (artifacts)

Success criteria:
- DataStreamProvider creates context with custom stream state
- DataStreamHandler processes all 14 CustomUIDataTypes
- useDataStream hook returns current stream state
- Stream data accumulates correctly (deltas append, not replace)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T13]
Title: Create empty state components
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (greeting/empty state, suggested actions for new chats)
Architecture ref: ADR-001 (feature collocation)

Action: Create 2 files. (1) features/chat/components/greeting.tsx — Greeting component shown when chat has no messages. Displays welcome text, app name, brief description. Matches oldapp/components/greeting.tsx visual structure. Server component or simple client component. (2) features/chat/components/suggested-actions.tsx — "use client" component showing clickable suggestion chips below greeting. Each chip has a title and action text. On click, calls the chat submit handler with the suggestion text. Suggestions are hardcoded initially (e.g., "Write a poem", "Explain quantum computing", "Help me code").

Output files:
- features/chat/components/greeting.tsx
- features/chat/components/suggested-actions.tsx

Inputs: oldapp/components/greeting.tsx + suggested-actions.tsx (reference), components/ui/ (P00-T11)
Outputs: Empty state components consumed by chat component (P03-T19)

AI layer handling: AI_WRAPPER

Dependencies: P00-T11, P01-T16
Dependents: P03-T19

Success criteria:
- Greeting renders welcome text
- SuggestedActions renders clickable chips
- Clicking a suggestion calls submit handler prop
- Visually matches oldapp
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P03-T14]
Title: Create message display components
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (message rendering: markdown, code blocks, tool results, reasoning); state-management.md (message parts rendering)
Architecture ref: ADR-005 (ai-elements as primitives, feature wrappers); architecture/patterns.md (message rendering)

Action: Create 2 files. (1) features/chat/components/message.tsx — ChatMessage component that renders a single message. Dispatches on message.role (user vs assistant). For assistant messages: renders parts array — text parts through Markdown renderer, tool-invocation parts through tool result components, reasoning parts through MessageReasoning. Uses ai-elements primitives (message.tsx for structure, code-block.tsx for code). For user messages: renders content with markdown support and attachment previews. (2) features/chat/components/message-reasoning.tsx — MessageReasoning component that renders thinking/reasoning content from AI models. Collapsible section showing the model's chain-of-thought. Uses ai-elements/reasoning.tsx or chain-of-thought.tsx as primitives.

Output files:
- features/chat/components/message.tsx
- features/chat/components/message-reasoning.tsx

Inputs: components/ai-elements/ (P00-T12), oldapp/components/message.tsx + message-reasoning.tsx (reference), lib/types/ (P00-T08)
Outputs: Message components consumed by messages list (P03-T16)

AI layer handling: AI_WRAPPER

Dependencies: P00-T12, P01-T16
Dependents: P03-T15, P03-T16

Success criteria:
- ChatMessage renders user and assistant messages differently
- Assistant text parts rendered as Markdown
- Tool invocations rendered with appropriate result UI
- Reasoning content collapsible
- Imports from ai-elements compile correctly
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T15]
Title: Create message interaction components
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (message actions: copy, vote, edit); state-management.md (message edit flow)
Architecture ref: SEAM-038 (message edit + re-submit flow)

Action: Create 2 files. (1) features/chat/components/message-actions.tsx — "use client" component rendered alongside each assistant message. Actions: copy to clipboard (copies message text content), vote up/down (calls voting API — stub for now, wired in P06). Shows on hover. Uses shadcn/ui Button, Tooltip. (2) features/chat/components/message-editor.tsx — "use client" component for inline message editing. When user clicks edit on their own message: replaces message content with textarea, save/cancel buttons. On save: calls deleteTrailingMessages() then re-submits the edited message for a new AI response. Uses useActionState for the server action.

Output files:
- features/chat/components/message-actions.tsx
- features/chat/components/message-editor.tsx

Inputs: features/chat/actions/delete-trailing-messages.ts (P03-T10), components/ui/ (P00-T11), features/chat/components/message.tsx (P03-T14)
Outputs: Message interaction consumed by message component (P03-T14) and messages list (P03-T16)

AI layer handling: AI_WRAPPER

Dependencies: P03-T10, P03-T14
Dependents: P03-T16

Success criteria:
- Copy action copies message text to clipboard
- Vote buttons render (functional voting wired in P06)
- Message editor shows textarea on edit click
- Save triggers deleteTrailingMessages + re-submit
- Actions show on hover/focus
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T16]
Title: Create messages list component
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (message list scrolling, loading states); state-management.md (messages rendering)
Architecture ref: architecture/patterns.md (virtualized list for large conversations); ADR-005

Action: Create features/chat/components/messages.tsx — "use client" component that renders the list of chat messages. Maps over messages array, renders ChatMessage + MessageActions for each. Handles: empty state (shows Greeting), loading state (shows skeleton), error state, scroll-to-bottom behavior via useScrollToBottom. Attaches containerRef and endRef from useScrollToBottom. Shows "scroll to bottom" FAB button when user has scrolled up and isAtBottom is false. Renders ThinkingIndicator (loading dots) when assistant is generating.

Output files:
- features/chat/components/messages.tsx

Inputs: features/chat/components/message.tsx (P03-T14), features/chat/components/message-actions.tsx + message-editor.tsx (P03-T15), features/chat/hooks/use-scroll-to-bottom.ts (P03-T11), features/chat/components/greeting.tsx (P03-T13)
Outputs: Messages consumed by chat component (P03-T19)

AI layer handling: AI_WRAPPER

Dependencies: P03-T11, P03-T13, P03-T14, P03-T15
Dependents: P03-T19

Success criteria:
- Messages list renders all messages in order
- Empty state shows Greeting component
- Scroll-to-bottom FAB shown when scrolled up
- Loading indicator shown during AI generation
- Each message has actions (copy, vote, edit)
- **[PATCH: Gap 4]** autoScroll setting from useSettingsSnapshot controls FAB behavior and followOutput mode; atBottomThreshold=100; followOutput="smooth" when autoScroll is on, disabled when off
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T17]
Title: Create multimodal chat input
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (multimodal input: text, file attachments, image paste); state-management.md (input composition)
Architecture ref: ADR-005 (ai-elements prompt-input as primitive)

Action: Create features/chat/components/multimodal-input.tsx — "use client" component. Text input area (auto-resizing textarea or ai-elements/prompt-input.tsx). File attachment button (image/PDF upload). Drag-and-drop file support. Image paste from clipboard. Preview thumbnails for attached files. Submit button (enabled when input has content). Stop button (shown during generation, calls abort). Keyboard shortcut: Enter to submit, Shift+Enter for newline. Props: onSubmit(message, attachments), isGenerating, stop(). Manages local state for input text and attachments array.

Output files:
- features/chat/components/multimodal-input.tsx

Inputs: components/ai-elements/prompt-input.tsx (P00-T12), components/ui/ (P00-T11), oldapp/components/multimodal-input.tsx (reference)
Outputs: Input component consumed by chat component (P03-T19)

AI layer handling: AI_WRAPPER

Dependencies: P00-T11, P00-T12, P01-T16
Dependents: P03-T19

Success criteria:
- Text input auto-resizes
- File attachment via button and drag-and-drop
- Image paste from clipboard
- Submit on Enter, newline on Shift+Enter
- Stop button shown during generation
- File previews displayed
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T18]
Title: Create chat header and weather component
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (chat header with model info, sidebar toggle); features.md (weather tool display)
Architecture ref: ADR-001 (feature collocation); scaffold/directory-structure.md

Action: Create 2 files. (1) features/chat/components/chat-header.tsx — Chat header bar at top of chat. Shows: sidebar toggle button (from @/components/sidebar-toggle), current model name/label, new chat button (navigates to "/"), visibility selector placeholder (wired in P06). Responsive: collapses model info on mobile. (2) features/chat/components/weather.tsx — Weather result display component for the getWeather tool. Renders temperature, weather description, location. Used as the UI component for weather tool invocations in message rendering. Matches oldapp/components/weather.tsx.

Output files:
- features/chat/components/chat-header.tsx
- features/chat/components/weather.tsx

Inputs: components/sidebar-toggle.tsx (P00-T13), components/ui/ (P00-T11), oldapp/components/chat-header.tsx + weather.tsx (reference)
Outputs: ChatHeader consumed by chat component (P03-T19); Weather consumed by message tool rendering (P03-T14)

AI layer handling: NEW

Dependencies: P00-T11, P00-T13, P01-T16
Dependents: P03-T14, P03-T19

Success criteria:
- ChatHeader renders sidebar toggle and model label
- ChatHeader has new chat navigation button
- Weather component renders temperature and description
- Responsive layout on mobile
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T19]
Title: Create chat orchestrator component
Phase: 3 — Chat Core Vertical
Type: INTEGRATION

Behavior ref: state-management.md (Chat component as orchestrator for useChat, messages, input, header)
Architecture ref: SEAM-028 (chat component assembly); SEAM-031 (useChat + DataStreamHandler sync); SEAM-015 (settings to completion)

Action: Create features/chat/components/chat.tsx — "use client" component that orchestrates the entire chat experience. Integrates: (1) useChat hook from Vercel AI SDK (or @ai-sdk/react) with api="/api/chat", id=chatId. (2) DataStreamHandler to process custom stream data. (3) Messages component with messages from useChat. (4) MultimodalInput with handleSubmit/input/setInput/isLoading from useChat. (5) ChatHeader with model info. (6) useSettings for model selection. (7) Greeting + SuggestedActions when no messages. Props: chatId (optional for new chat), initialMessages (from server). Handles: message submission (append), stop generation (stop), message edit (re-submit flow).

Output files:
- features/chat/components/chat.tsx

Inputs: features/chat/components/messages.tsx (P03-T16), features/chat/components/multimodal-input.tsx (P03-T17), features/chat/components/chat-header.tsx (P03-T18), features/chat/components/data-stream-handler.tsx (P03-T12), features/chat/hooks/ (P03-T11), features/settings/hooks/use-settings.ts (P03-T04), @ai-sdk/react (useChat)
Outputs: Chat orchestrator consumed by chat pages (P03-T22)

AI layer handling: NEW

Dependencies: P03-T04, P03-T11, P03-T12, P03-T16, P03-T17, P03-T18
Dependents: P03-T22

Success criteria:
- useChat configured with api="/api/chat" and chatId
- Messages passed from useChat to Messages component
- Input handling wired: handleSubmit, input, setInput
- Stop button calls useChat.stop()
- Settings model passed in request body
- DataStreamHandler processes stream events
- **[PATCH: Gap 3]** When data-usage stream part indicates credit depletion, render a non-dismissable AlertDialog overlay warning the user that daily credits are exhausted; usage state tracked via DataStreamHandler data-usage event
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T20]
Title: Create chat API route
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: api-contracts.md (POST /api/chat — streaming response); ai-sdk-usage.md (route handler with streamText)
Architecture ref: conventions.md (route handlers); SEAM-006 (chat streaming endpoint)

Action: Create app/api/chat/route.ts — POST handler. Flow: (1) Extract session via getAppSession(), (2) Validate body with chatRequestSchema, (3) Check rate limit via checkRateLimit(), (4) Call executeChatCompletion() with validated params, (5) Return streaming Response. Uses createDataStreamResponse() from AI SDK for proper SSE format. Handles errors: returns AppError.toResponse() for known errors, 500 for unknown. Sets proper headers for streaming (Content-Type: text/event-stream). This is the HTTP endpoint that useChat calls.

Output files:
- app/api/chat/route.ts

Inputs: features/auth/lib/session.ts (P02-T01), features/chat/schemas/ (P03-T05), features/chat/lib/completion.ts (P03-T07), lib/api/ (P01-T12), lib/rate-limit/ (P01-T13)
Outputs: Chat API route consumed by useChat on client (P03-T19)

AI layer handling: NEW

Dependencies: P03-T07, P03-T05, P02-T01, P01-T12, P01-T13
Dependents: P03-T19, P03-T24

Success criteria:
- POST /api/chat returns streaming SSE response
- Auth required (returns 401 for unauthenticated)
- Rate limiting applied (returns 429 when exceeded)
- Input validated against chatRequestSchema
- Error responses use AppError.toResponse()
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T21]
Title: Create chat layouts
Phase: 3 — Chat Core Vertical
Type: INTEGRATION

Behavior ref: features.md (chat layout with sidebar, providers)
Architecture ref: SEAM-029 (provider tree — chat level); scaffold/directory-structure.md (app/(chat)/ group)

Action: Create 2 files. (1) app/(chat)/layout.tsx — Server layout for chat route group. Fetches session via getAppSession(). If not authenticated and not guest, redirect to /login. Passes initial data to client layout. Includes SidebarProvider from shadcn/ui/sidebar. (2) app/(chat)/chat-layout-client.tsx — "use client" layout component. Wraps content with DataStreamProvider for stream state management. Includes sidebar placeholder (rendered in P05). Responsive: sidebar hidden on mobile, visible on desktop. This 2-file pattern separates server data fetching from client interactivity.

Output files:
- app/(chat)/layout.tsx
- app/(chat)/chat-layout-client.tsx

Inputs: features/auth/lib/session.ts (P02-T01), features/chat/components/data-stream-provider.tsx (P03-T12), components/ui/sidebar.tsx (P00-T11)
Outputs: Chat layout consumed by chat pages (P03-T22)

AI layer handling: NEW

Dependencies: P02-T01, P03-T12
Dependents: P03-T22, P03-T23, P05 (sidebar)

Success criteria:
- Server layout redirects unauthenticated, non-guest users
- DataStreamProvider wraps chat content
- SidebarProvider included for sidebar behavior
- Server/client split maintained properly
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P03-T22]
Title: Create chat pages
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: features.md (new chat page, existing chat page with message history)
Architecture ref: conventions.md (page.tsx default export async function); scaffold/directory-structure.md

Action: Create 2 pages. (1) app/(chat)/page.tsx — New chat page (root "/" route). Server component: renders Chat component with no chatId and no initialMessages. Metadata: title "New Chat". (2) app/(chat)/chat/[id]/page.tsx — Existing chat page. Server component: extracts chatId from params, fetches chat + messages from DB (getChatById, getMessagesByChatId), validates ownership, passes initialMessages to Chat component. 404 if chat not found. Metadata: dynamic title from chat.title.

Output files:
- app/(chat)/page.tsx
- app/(chat)/chat/[id]/page.tsx

Inputs: features/chat/components/chat.tsx (P03-T19), lib/data/chat.ts (P01-T07), lib/data/message.ts (P01-T08), features/auth/lib/session.ts (P02-T01)
Outputs: Chat pages — the main user-facing views

AI layer handling: NEW

Dependencies: P03-T19, P03-T21, P01-T07, P01-T08
Dependents: P03-T24

Success criteria:
- "/" renders empty Chat for new conversation
- "/chat/[id]" fetches and renders existing chat with messages
- 404 returned for non-existent or unauthorized chat
- Initial messages passed from server to client component
- Page metadata set correctly
- **[PATCH: Gap 2]** New chat page reads ?q= or ?query= search params via useSearchParams; on mount, if query param present, auto-submits it as the first message via useChat.append(); ~10 lines of useEffect
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P03-T23]
Title: Create chat error states
Phase: 3 — Chat Core Vertical
Type: IMPLEMENTATION

Behavior ref: edge-cases.md (loading states, error boundaries for chat)
Architecture ref: conventions.md (loading.tsx and error.tsx patterns)

Action: Create 2 files. (1) app/(chat)/loading.tsx — Loading state for chat route group. Renders chat skeleton: header placeholder, message area with skeleton bubbles, input area placeholder. Uses shadcn/ui Skeleton component. (2) app/(chat)/error.tsx — "use client" error boundary for chat. Catches runtime errors, displays friendly message with retry button (calls reset()). Logs error for debugging. Does not crash the entire app — contained within the chat route group.

Output files:
- app/(chat)/loading.tsx
- app/(chat)/error.tsx

Inputs: components/ui/skeleton.tsx (P00-T11)
Outputs: Error and loading states for chat routes

AI layer handling: NEW

Dependencies: P00-T11, P01-T16
Dependents: P03-T24

Success criteria:
- loading.tsx renders chat-shaped skeleton
- error.tsx catches errors and shows retry button
- error.tsx has "use client" directive
- Neither crashes on render
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P03-T24]
Title: Verification gate G03
Phase: 3 — Chat Core Vertical
Type: VERIFICATION

Behavior ref: features.md (complete chat flow)
Architecture ref: AGENTS.md (post-implementation validation); strategy/phase-order.md (gate G03)

Action: Run complete validation: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. Functional verification: (4) pnpm dev starts, (5) Navigate to "/" — greeting displays, (6) Type a message and submit — AI streaming response appears, (7) Reasoning content shows in collapsible section (for supported models), (8) Weather tool can be invoked (e.g., "What is the weather in Paris?"), (9) New chat creates a new conversation, (10) Existing chat loads messages from DB, (11) Message edit flow works (edit previous message, trailing messages deleted, re-submitted). Integration check: stream chat action persists messages, title auto-generated, DataStreamHandler processes all custom events.

Output files: none (validation only)

Inputs: all P03-T01 through P03-T23 outputs
Outputs: Gate G03 passed — P04 (artifacts) can begin

AI layer handling: N/A

Dependencies: P03-T01 through P03-T23
Dependents: P04-T01 (start of next phase)

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- Chat streaming works end-to-end (send message, receive response)
- Messages persist to database
- Title auto-generated for new chats
- Weather tool functional
- Message edit + re-submit works
- Loading and error states render correctly

Complexity: S