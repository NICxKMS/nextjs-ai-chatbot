# Phase P3 — Chat Core Vertical

> **Updated per redesign audit (2026-03-01)**

> Core chat vertical slice. Implements AI model catalog, system prompts, streaming infrastructure,
> ChatShell (~60 lines) + ChatSessionContext decomposition, StreamBridge (~20 lines),
> ChatStreamProvider (split state/dispatch with RAF batching), tools (createArtifact/updateArtifact),
> message display, input, server layout + client islands, and chat pages.
> SettingsProvider removed — useSettings() imported directly via useSyncExternalStore + localStorage.
> Handler registry in lib/ai/artifact-handlers.ts for tool→handler dispatch (dependency inversion).
>
> **Entry state**: P2 complete — auth works, data layer ready, AI providers registered.
> **Exit state**: Users can send messages, receive AI streaming responses, see reasoning, use weather tool.
> **Est. duration**: ~4 days
> **Tasks**: 27
> **Files created**: ~42

---

## Task Summary

| ID | Title | Type | Complexity | Files |
|----|-------|------|------------|-------|
| P3-T01 | Create AI model catalog | IMPL | M | 3 |
| P3-T02 | Create system prompts + provider options | IMPL | M | 2 |
| P3-T03 | Create tool enablement + title gen | IMPL | S | 2 |
| P3-T04 | Create artifact handler registry | IMPL | M | 1 |
| P3-T05 | Create chat types + schemas | IMPL | M | 2 |
| P3-T06 | Create settings store + hooks | IMPL | M | 2 |
| P3-T07 | Create settings panel | IMPL | M | 1 |
| P3-T08 | Create ChatSessionContext | IMPL | S | 1 |
| P3-T09 | Create chat pure functions | IMPL | M | 2 |
| P3-T10 | Create ChatStreamProvider | IMPL | L | 1 |
| P3-T11 | Create useChatSession hook | IMPL | L | 1 |
| P3-T12 | Create chat side-effect hooks | IMPL | M | 2 |
| P3-T13 | Create chat tools | IMPL | L | 4 |
| P3-T14 | Create empty state components | IMPL | S | 3 |
| P3-T15 | Create message display | IMPL | M | 2 |
| P3-T16 | Create message interactions | IMPL | M | 2 |
| P3-T17 | Create messages list | IMPL | L | 1 |
| P3-T18 | Create multimodal input | IMPL | L | 2 |
| P3-T19 | Create chat header | IMPL | M | 1 |
| P3-T20 | Create StreamBridge | IMPL | S | 1 |
| P3-T21 | Create ChatShell orchestrator | INTEG | L | 1 |
| P3-T22 | Create chat server actions | IMPL | M | 3 |
| P3-T23 | Create chat API route | IMPL | L | 1 |
| P3-T24 | Create chat layout (SERVER) | INTEG | M | 1 |
| P3-T25 | Create chat pages | IMPL | M | 2 |
| P3-T26 | Create chat error boundary | IMPL | S | 1 |
| P3-T27 | Verification gate G03 | VERIFY | S | 0 |

---

## Seam Coverage

| Seam | Description | Task |
|------|-------------|------|
| SEAM-006 | Chat streaming + data persistence | P3-T23, P3-T21 |
| SEAM-007 | ChatStreamProvider custom types (split state/dispatch) | P3-T10 |
| SEAM-008 | AI completion orchestration (streamText + tools) | P3-T23 |
| SEAM-015 | Settings to completion pipeline (useSettings → useChatSession) | P3-T06, P3-T07, P3-T21 |
| SEAM-028 | Client Error Handling (useChat.onError → toast) | P3-T21, P3-T26 |
| SEAM-029 | Provider tree (chat level — SERVER layout + client islands) | P3-T24 |
| SEAM-031 | URL State Management (history.replaceState + NoticeHandler) | P3-T21, P3-T25 |
| SEAM-038 | Message edit + re-submit (deleteTrailingMessages + resubmit) | P3-T16, P3-T22 |

---

## Tasks

---

### TASK: [ID: P3-T01]
Title: Create AI model catalog
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: ai-sdk-usage.md (model listing, provider resolution)
Architecture ref: ../../plan-archives/redesign/ai-integration.md (model catalog)

Action: Create 3 files. (1) lib/ai/models.ts — Model definitions: chatModels array with id, name, provider, description for each available model. Export model lookup utilities. (2) features/models/lib/models.ts — Export listChatModels() with `use cache` directive for Next.js 16 caching. Export getAvailableModels() for server components. (3) features/models/types/model.types.ts — ChatModel type, ModelProvider type.

Output files:
- lib/ai/models.ts
- features/models/lib/models.ts
- features/models/types/model.types.ts

Inputs: lib/ai/registry.ts (P1-T11), lib/ai/provider.ts (P1-T12)
Outputs: Model catalog consumed by system prompts (P3-T02), chat header (P3-T19), chat pages (P3-T25)

Dependencies: P1-T12
Dependents: P3-T02, P3-T19, P3-T25

Success criteria:
- chatModels array includes models from all registered providers
- listChatModels uses `use cache` for Next.js 16
- getAvailableModels returns typed ChatModel[]
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T02]
Title: Create system prompts + provider options
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: ai-sdk-usage.md (system prompt with artifacts instructions, date context, tool descriptions)
Architecture ref: ../../plan-archives/redesign/ai-integration.md (prompt management, provider-specific options)

Action: Create 2 files. (1) lib/ai/prompts.ts — Export composeSystemPrompt(context?: {artifacts?: boolean}): string that assembles the system prompt. Include: base assistant identity, current date/time, available tools description, artifacts instructions (conditionally included). Copy prompt content from oldapp/lib/ai/prompts.ts. The prompt must describe tools as **createArtifact/updateArtifact** and artifact kinds (text, code, image, sheet). **No createDocument/updateDocument references.** (2) lib/ai/provider-options.ts — Export getProviderOptions(modelId: string) for provider-specific settings (e.g., thinking budget for Claude).

Output files:
- lib/ai/prompts.ts
- lib/ai/provider-options.ts

Inputs: oldapp/lib/ai/prompts.ts (reference), lib/ai/models.ts (P3-T01)
Outputs: System prompt and provider options consumed by chat API route (P3-T23)

Dependencies: P3-T01
Dependents: P3-T23

Success criteria:
- composeSystemPrompt returns non-empty string
- Prompt includes date context with current date
- Prompt describes tools as **createArtifact/updateArtifact** (NOT createDocument/updateDocument)
- Provider options return correct settings per model provider
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T03]
Title: Create tool enablement + title generation
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: ai-sdk-usage.md (tool selection per model, title generation)
Architecture ref: ../../plan-archives/redesign/ai-integration.md (tool enablement, title flow)

Action: Create 2 files. (1) lib/ai/tools.ts — Export getEnabledTools(modelId: string) that returns the subset of tools available for a given model (some models don't support tool calling). (2) lib/ai/title.ts — Export generateTitle(message: string): Promise<string> that uses a lightweight model call to generate a short chat title from the first user message. Title is **awaited server-side** before stream close (no polling).

Output files:
- lib/ai/tools.ts
- lib/ai/title.ts

Inputs: lib/ai/provider.ts (P1-T12)
Outputs: Tool enablement consumed by API route (P3-T23); title gen consumed by API route (P3-T23)

Dependencies: P1-T12
Dependents: P3-T23

Success criteria:
- getEnabledTools returns correct tool subset per model
- generateTitle returns a short string from first message
- Title generation uses a lightweight model (not the full chat model)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P3-T04]
Title: Create artifact handler registry
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: ai-sdk-usage.md (AI tools); ../../plan-archives/redesign/ai-integration.md (handler registry)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (artifact handler pattern, dependency inversion)

Action: Create **lib/ai/artifact-handlers.ts** — Export ArtifactHandler type and handler registry. Export registerArtifactHandler(kind, handler) and getArtifactHandler(kind): ArtifactHandler. Each handler defines how an ArtifactKind (text, code, image, sheet) is created, updated, and rendered. Registry maps ArtifactKind → ArtifactHandler. This is the central dispatch point for all artifact operations — dependency inversion so tools don't import handler implementations directly. Handlers are registered in P4 but the registry infrastructure is created here.

Output files:
- lib/ai/artifact-handlers.ts

Inputs: lib/types/artifact-handler.types.ts (P0-T06)
Outputs: Handler registry consumed by artifact tools (P3-T13), artifact components (P4)

Dependencies: P0-T06
Dependents: P3-T13, P4-T06

Success criteria:
- ArtifactHandler type defines create/update/render interface
- registerArtifactHandler adds handler to registry
- getArtifactHandler returns correct handler for each kind
- **File is lib/ai/artifact-handlers.ts** (NOT lib/ai/document-handlers.ts)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T05]
Title: Create chat types + schemas
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: api-contracts.md (POST /api/chat request body schema)
Architecture ref: AGENTS.md (input validation via Zod); ../../plan-archives/redesign/streaming-architecture.md (ArtifactDataPart types)

Action: Create 2 files. (1) features/chat/types/chat.types.ts — ChatSessionValue type (from ChatSessionContext), ArtifactDataPart union type covering all artifact-* stream part types (artifact-id, artifact-title, artifact-kind, artifact-clear, artifact-finish, artifact-textDelta, artifact-codeDelta, artifact-sheetDelta, artifact-imageDelta, artifact-suggestion, chat-title). Export DataPart = ArtifactDataPart. ArtifactSuggestion interface. (2) features/chat/schemas/chat.schema.ts — chatRequestSchema (Zod: id string uuid, message object, selectedChatModel string), messageSchema, editMessageSchema, deleteMessagesSchema.

Output files:
- features/chat/types/chat.types.ts
- features/chat/schemas/chat.schema.ts

Inputs: lib/types/artifact.types.ts (P0-T06), lib/types/ (P0-T05)
Outputs: Types/schemas consumed by ChatSessionContext (P3-T08), ChatStreamProvider (P3-T10), chat tools (P3-T13), API route (P3-T23), server actions (P3-T22)

Dependencies: P0-T06
Dependents: P3-T08, P3-T09, P3-T10, P3-T22, P3-T23

Success criteria:
- ChatSessionValue type contains messages, status, input, setInput, sendMessage, stop, chatId, chatModel, isReadonly, error, clearError
- ArtifactDataPart covers all 11 artifact-* and chat-title part types
- chatRequestSchema validates POST /api/chat body shape
- All schemas export inferred TypeScript types
- **Uses artifactId (NOT documentId) throughout**
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T06]
Title: Create settings store + hooks
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (settings: model selection, default model persistence)
Architecture ref: ../../plan-archives/redesign/state-management.md (**NO SettingsProvider** — useSettings() imported directly)

Action: Create 2 files. (1) features/settings/types/settings.types.ts — ChatSettings type with selectedModel (string, defaults to DEFAULT_CHAT_MODEL), temperature (number), maxTokens (number). DEFAULT_SETTINGS constant. (2) features/settings/hooks/use-settings.ts — "use client" hook **useSettings()** backed by **useSyncExternalStore** + localStorage. Module-level store (not context-based). Returns {settings, updateSettings, resetSettings}. **NO SettingsProvider context** — useSettings() is imported directly where needed. SSR-safe via getServerSnapshot returning DEFAULT_SETTINGS.

Output files:
- features/settings/types/settings.types.ts
- features/settings/hooks/use-settings.ts

Inputs: lib/types/model.types.ts (DEFAULT_CHAT_MODEL from P0-T05), lib/types/settings.types.ts (P0-T07)
Outputs: ChatSettings type and useSettings hook consumed by useChatSession (P3-T11), settings panel (P3-T07)

Dependencies: P0-T07
Dependents: P3-T07, P3-T11

Success criteria:
- ChatSettings type includes selectedModel, temperature, maxTokens
- DEFAULT_SETTINGS uses DEFAULT_CHAT_MODEL
- **useSettings() uses useSyncExternalStore** (NOT useState + useEffect, NOT context-based SettingsProvider)
- Module-level store — no provider wrapping needed
- SSR-safe via getServerSnapshot
- Settings persist across page reloads via localStorage
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T07]
Title: Create settings panel
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (settings UI: model selection, temperature, max tokens)
Architecture ref: ../../plan-archives/redesign/state-management.md (settings panel as sheet UI)

Action: Create features/settings/components/settings-panel.tsx — "use client" sheet UI for editing chat settings (model, temperature, max tokens). Consumes **useSettings()** directly (NOT from a SettingsProvider context). Uses shadcn/ui Sheet, Slider, Select components.

Output files:
- features/settings/components/settings-panel.tsx

Inputs: features/settings/hooks/use-settings.ts (P3-T06), components/ui/ (P0-T11)
Outputs: Settings panel consumed by chat header or ChatShell (P3-T21)

Dependencies: P3-T06
Dependents: P3-T21

Success criteria:
- Renders as a Sheet overlay
- Reads/writes settings via **useSettings()** (NOT SettingsProvider context)
- Includes model selector, temperature slider, max tokens input
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T08]
Title: Create ChatSessionContext
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: state-management.md (chat session context)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (ChatSessionContext replaces old ChatContext); ../../plan-archives/redesign/state-management.md

Action: Create features/chat/hooks/use-chat-session-context.ts — "use client". Defines **ChatSessionContext** (NOT ChatContext) with createContext. Exports **ChatSessionValue** type containing all composed chat state: messages, status, input, setInput, attachments, setAttachments, sendMessage, stop, appendMessage, chatId, chatModel, isReadonly, error, clearError. Exports **useChatSessionContext()** hook (NOT useChatContext). Intent-based callbacks (sendMessage, stop) instead of raw setter props. This context is provided by ChatShell (P3-T21) and consumed by Messages, MultimodalInput, ChatHeader.

Output files:
- features/chat/hooks/use-chat-session-context.ts

Inputs: features/chat/types/chat.types.ts (P3-T05)
Outputs: ChatSessionContext consumed by all chat child components (P3-T15 through P3-T19, P3-T21)

Dependencies: P3-T05
Dependents: P3-T11, P3-T15, P3-T17, P3-T18, P3-T19, P3-T21

Success criteria:
- Context name is **ChatSessionContext** (NOT ChatContext)
- Value type is **ChatSessionValue** (NOT ChatContextValue)
- Hook name is **useChatSessionContext** (NOT useChatContext)
- Uses intent-based callbacks: sendMessage, stop (NOT raw setters)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P3-T09]
Title: Create chat pure functions
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: state-management.md (side-effect extraction, stream delta processing)
Architecture ref: ../../plan-archives/redesign/streaming-architecture.md (processStreamDelta pure function, chat-callbacks for side-effect extraction)

Action: Create 2 files. (1) features/chat/lib/chat-callbacks.ts — Export pure callback factory functions that extract side-effects from the chat orchestrator. createOnMessageCallback(chatId, saveMessage), createOnTitleCallback(chatId, updateTitle), createOnErrorCallback(chatId). These callbacks are injected into useChatSession (P3-T11) rather than being inline, making the orchestrator testable. (2) features/chat/lib/process-stream-deltas.ts — Export **processStreamDelta(delta: DataPart, current: UIArtifact): { artifact: UIArtifact }** pure function. Handles all artifact-* data part types: artifact-id (set artifactId + status=streaming + isVisible=true), artifact-title, artifact-kind, artifact-clear (reset content), artifact-finish (status=idle), artifact-textDelta (APPEND), artifact-codeDelta/sheetDelta/imageDelta (REPLACE). Pure function — no React state, no side effects, fully testable.

Output files:
- features/chat/lib/chat-callbacks.ts
- features/chat/lib/process-stream-deltas.ts

Inputs: features/chat/types/chat.types.ts (P3-T05), lib/types/artifact.types.ts (P0-T06)
Outputs: Callbacks consumed by useChatSession (P3-T11); processStreamDelta consumed by StreamBridge (P3-T20)

Dependencies: P3-T05
Dependents: P3-T11, P3-T20

Success criteria:
- Each callback factory returns a typed function
- Side-effects extracted from orchestrator (testable in isolation)
- **processStreamDelta is a pure function** (no React state, no side effects)
- Handles all artifact-* data part types correctly
- artifact-textDelta uses APPEND accumulation
- artifact-codeDelta/sheetDelta/imageDelta use REPLACE accumulation
- artifact-clear resets content, artifact-finish sets status=idle
- Testable without React
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T10]
Title: Create ChatStreamProvider
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: state-management.md (stream state context)
Architecture ref: SEAM-007 (ChatStreamProvider custom types); ../../plan-archives/redesign/streaming-architecture.md (split state/dispatch contexts + RAF batching)

Action: Create features/chat/components/**chat-stream-provider.tsx** (NOT data-stream-provider.tsx) — "use client" context provider with **split state/dispatch contexts** and **RAF batching**. StateContext holds { ChatStream: DataPart[] } — consumed by StreamBridge (reads). DispatchContext holds { setChatStream: updater } — consumed by useChatSession.onData (writes). RAF batching coalesces ~200 SSE deltas/sec to ~60 React updates/sec. Export **ChatStreamProvider**, **useChatStream** (reads state), and **useChatStreamDispatch** (writes). Scoped to **page level** (NOT layout level) — resets on page navigation, prevents cascade to sidebar.

Output files:
- features/chat/components/chat-stream-provider.tsx

Inputs: features/chat/types/chat.types.ts (P3-T05)
Outputs: ChatStreamProvider consumed by chat pages (P3-T25); useChatStream consumed by StreamBridge (P3-T20); useChatStreamDispatch consumed by useChatSession (P3-T11)

Dependencies: P3-T05
Dependents: P3-T11, P3-T20, P3-T25

Success criteria:
- File is **chat-stream-provider.tsx** (NOT data-stream-provider.tsx)
- Provider name is **ChatStreamProvider** (NOT DataStreamProvider)
- Hook names are **useChatStream** and **useChatStreamDispatch** (NOT useDataStream)
- **Split contexts**: StateCtx and DispatchCtx (prevents re-render cascades)
- **RAF batching**: pendingRef + requestAnimationFrame coalesces rapid updates
- Scoped to page level (placed in chat pages, NOT layout)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T11]
Title: Create useChatSession hook
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: state-management.md (chat session composition)
Architecture ref: ../../plan-archives/redesign/state-management.md (useChatSession creates ChatSessionValue); ../../plan-archives/redesign/component-architecture.md (ChatShell)

Action: Create features/chat/hooks/use-chat-session.ts — "use client" hook **useChatSession(params: {id, initialMessages, initialChatModel, isReadonly})** (~120 lines). Composes all chat-related state and returns a **ChatSessionValue**. Internally: (1) Calls useChat with api="/api/chat", DefaultChatTransport with prepareSendMessagesRequest, initialMessages, experimental_throttle (adaptive), maxSteps: 5, generateId. (2) Calls useSettings() directly (NOT from SettingsProvider). (3) Wires onData callback to route artifact-* parts to ChatStreamDispatch and chat-title to PendingChats.updateTitle(). (4) Wires onFinish to clear ChatStream. (5) Wires onError to toast. (6) Returns intent-based ChatSessionValue: {messages, status, input, setInput, attachments, setAttachments, sendMessage, stop, appendMessage, chatId, chatModel, isReadonly, error, clearError}. This hook creates the value for ChatSessionContext.Provider in ChatShell.

Output files:
- features/chat/hooks/use-chat-session.ts

Inputs: @ai-sdk/react (useChat, DefaultChatTransport), features/settings/hooks/use-settings.ts (P3-T06), features/chat/hooks/use-chat-session-context.ts (P3-T08), features/chat/lib/chat-callbacks.ts (P3-T09), features/chat/components/chat-stream-provider.tsx (P3-T10)
Outputs: ChatSessionValue consumed by ChatShell (P3-T21)

Dependencies: P3-T06, P3-T08, P3-T09, P3-T10
Dependents: P3-T21

Success criteria:
- Hook name is **useChatSession** (NOT useChatContext or useChatHandler)
- Returns composed **ChatSessionValue** including all chat state
- Calls useChat with correct api, id, initialMessages, DefaultChatTransport
- Includes **useSettings()** directly (NOT from SettingsProvider context)
- onData routes artifact-* parts to **useChatStreamDispatch** and chat-title to **PendingChats.updateTitle()**
- onFinish clears ChatStream (setChatStream([]))
- onError parses error and shows toast
- Intent-based sendMessage wraps: validation, attachment processing, handleSubmit
- ~120 lines (substantial but focused — NOT a God Component)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T12]
Title: Create chat side-effect hooks
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: state-management.md (side-effect hooks, scroll management)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (useChatSideEffects, useScrollToBottom)

Action: Create 2 files. (1) features/chat/hooks/use-chat-side-effects.ts — "use client" hook useChatSideEffects({id, status, messages}) that handles: URL update via history.replaceState on new chat, abort controller cleanup on chat change, artifactStore.reset() on navigation. (2) features/chat/hooks/use-scroll-to-bottom.ts — "use client" hook useScrollToBottom() that returns {containerRef, endRef, isAtBottom, scrollToBottom}. Uses **IntersectionObserver** for scroll detection (NOT scroll events). Smooth scroll behavior.

Output files:
- features/chat/hooks/use-chat-side-effects.ts
- features/chat/hooks/use-scroll-to-bottom.ts

Inputs: features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: Side-effect hooks consumed by ChatShell (P3-T21); scroll hook consumed by messages list (P3-T17)

Dependencies: P3-T08
Dependents: P3-T17, P3-T21

Success criteria:
- useChatSideEffects handles URL update, abort cleanup, artifact reset
- useScrollToBottom uses **IntersectionObserver** (NOT scroll events)
- Returns containerRef, endRef, isAtBottom, scrollToBottom
- Both hooks have "use client" directive
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T13]
Title: Create chat tools
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: ai-sdk-usage.md (tool definitions for weather, artifact creation/update, suggestions)
Architecture ref: ../../plan-archives/redesign/ai-integration.md (artifact tools, handler registry dispatch)

Action: Create 4 tool files. (1) features/chat/lib/tools/weather.ts — Full getWeather tool: Zod schema (latitude, longitude), execute calls Open-Meteo API, returns {temperature, weather}. (2) features/chat/lib/tools/**create-artifact.ts** — STUB: tool definition with schema (title, kind: ArtifactKind). Execute writes artifact-id, artifact-kind, artifact-title, artifact-clear data parts, calls getArtifactHandler(kind) from registry, streams content deltas, writes artifact-finish. Returns "Artifact creation not yet available" until P4 completes handlers. (3) features/chat/lib/tools/**update-artifact.ts** — STUB: tool definition with schema (**artifactId**, description). (4) features/chat/lib/tools/request-suggestions.ts — STUB: tool definition with schema (**artifactId** NOT documentId). Export all tools as a toolsMap object.

Output files:
- features/chat/lib/tools/weather.ts
- features/chat/lib/tools/create-artifact.ts
- features/chat/lib/tools/update-artifact.ts
- features/chat/lib/tools/request-suggestions.ts

Inputs: lib/ai/artifact-handlers.ts (P3-T04), lib/data/artifact.ts (P1-T08), zod, Vercel AI SDK (tool helper)
Outputs: Tools consumed by API route (P3-T23)

Dependencies: P3-T04, P1-T08
Dependents: P3-T23

Success criteria:
- getWeather tool fully functional (calls Open-Meteo API)
- Tool files named **create-artifact.ts / update-artifact.ts** (NOT create-document / update-document)
- Schema uses **artifactId** (NOT documentId) and **ArtifactKind** (NOT DocumentKind)
- createArtifact tool writes artifact-* data parts and dispatches to handler registry
- All tools have Zod parameter schemas
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T14]
Title: Create empty state components
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (greeting/empty state, suggested actions, notice handling)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (NoticeHandler extracted to prevent layout contamination)

Action: Create 3 files. (1) features/chat/components/greeting.tsx — Greeting component shown when chat has no messages. Welcome text. (2) features/chat/components/suggested-actions.tsx — "use client" component showing clickable suggestion chips. On click, reads sendMessage from **ChatSessionContext** and submits. (3) features/chat/components/notice-handler.tsx — "use client" renderless component (~15 lines, returns null). Reads ?notice=chat_not_found from URL via useSearchParams → shows toast. **Extracted to prevent chat layout from becoming 'use client'** (CRITICAL-1 fix).

Output files:
- features/chat/components/greeting.tsx
- features/chat/components/suggested-actions.tsx
- features/chat/components/notice-handler.tsx

Inputs: components/ui/ (P0-T11), features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: Empty state components consumed by ChatShell (P3-T21) and chat layout (P3-T24)

Dependencies: P3-T08
Dependents: P3-T21, P3-T24

Success criteria:
- Greeting renders welcome text
- SuggestedActions reads sendMessage from **ChatSessionContext** (NOT props)
- NoticeHandler is renderless (returns null), handles URL notice params
- NoticeHandler prevents layout from needing 'use client'
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P3-T15]
Title: Create message display components
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (message rendering: markdown, code blocks, tool results, reasoning)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (message rendering, ChatSessionContext consumption)

Action: Create 2 files. (1) features/chat/components/message.tsx — ChatMessage component that renders a single message. For assistant: renders parts array (text through Markdown, tool-invocation through result components, reasoning through MessageReasoning). For user: renders content with markdown and attachment previews. Reads from **ChatSessionContext** where needed. (2) features/chat/components/message-reasoning.tsx — MessageReasoning component. Collapsible section for chain-of-thought reasoning display.

Output files:
- features/chat/components/message.tsx
- features/chat/components/message-reasoning.tsx

Inputs: components/ui/ (P0-T11), oldapp/components/message.tsx (reference), features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: Message components consumed by messages list (P3-T17)

Dependencies: P3-T08
Dependents: P3-T16, P3-T17

Success criteria:
- ChatMessage renders user and assistant messages differently
- Assistant text parts rendered as Markdown
- Tool invocations rendered with appropriate result UI
- Reasoning content collapsible
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T16]
Title: Create message interaction components
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (message actions: copy, vote, edit); state-management.md (message edit flow)
Architecture ref: SEAM-038 (message edit + re-submit flow); ../../plan-archives/redesign/component-architecture.md

Action: Create 2 files. (1) features/chat/components/message-actions.tsx — "use client" component. Actions: copy to clipboard, vote up/down (stub for P6 — functional voting via **VoteResolver** wired later). Shows on hover/focus. (2) features/chat/components/message-editor.tsx — "use client" component for inline editing. On save: calls deleteTrailingMessages() server action (P3-T22) then re-submits via ChatSessionContext.

Output files:
- features/chat/components/message-actions.tsx
- features/chat/components/message-editor.tsx

Inputs: features/chat/actions/ (P3-T22), components/ui/ (P0-T11), features/chat/components/message.tsx (P3-T15)
Outputs: Message interaction consumed by messages list (P3-T17)

Dependencies: P3-T15, P3-T22
Dependents: P3-T17

Success criteria:
- Copy action copies message text to clipboard
- Vote buttons render (functional voting via **VoteResolver** wired in P6)
- Message editor shows textarea on edit click
- Save triggers deleteTrailingMessages + re-submit via ChatSessionContext
- Actions show on hover/focus
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T17]
Title: Create messages list component
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (message list scrolling, loading states, virtualization)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (messages list, react-virtuoso)

Action: Create features/chat/components/messages.tsx — "use client" component that renders the list of chat messages. Gets state from **ChatSessionContext** (NOT props drilling). Maps over messages array, renders ChatMessage + MessageActions for each. Handles: empty state (shows Greeting + SuggestedActions), loading state, scroll-to-bottom via useScrollToBottom (P3-T12). Shows "scroll to bottom" FAB button when scrolled up. Renders ThinkingIndicator when assistant is generating. Virtualized via react-virtuoso with followOutput for streaming.

Output files:
- features/chat/components/messages.tsx

Inputs: features/chat/components/message.tsx (P3-T15), features/chat/components/message-actions.tsx (P3-T16), features/chat/components/greeting.tsx (P3-T14), features/chat/hooks/use-scroll-to-bottom.ts (P3-T12), features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: Messages consumed by ChatShell (P3-T21)

Dependencies: P3-T12, P3-T14, P3-T15, P3-T16
Dependents: P3-T21

Success criteria:
- Messages list renders all messages in order
- Empty state shows Greeting + SuggestedActions
- Scroll-to-bottom FAB shown when scrolled up
- Loading indicator shown during AI generation
- Consumes state from **ChatSessionContext** (NOT props drilling)
- Uses **useScrollToBottom** for scroll management
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T18]
Title: Create multimodal input
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (multimodal input: text, file attachments, image paste)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (MultimodalInput reads from ChatSessionContext)

Action: Create 2 files. (1) features/chat/components/multimodal-input.tsx — "use client" component (~80 lines main + extracted helpers). Auto-resizing textarea. File attachment, drag-and-drop, image paste. Submit on Enter, Shift+Enter for newline. Stop button during generation. Gets submit handler, input, setInput, attachments, setAttachments, stop from **ChatSessionContext** (NOT props). (2) features/chat/components/submit-button.tsx — Send or stop button with loading state.

Output files:
- features/chat/components/multimodal-input.tsx
- features/chat/components/submit-button.tsx

Inputs: components/ui/ (P0-T11), features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: Input consumed by ChatShell (P3-T21)

Dependencies: P3-T08
Dependents: P3-T21

Success criteria:
- Text input auto-resizes
- File attachment via button and drag-and-drop
- Image paste from clipboard
- Submit on Enter, newline on Shift+Enter
- Stop button shown during generation
- Gets handlers from **ChatSessionContext** (NOT props drilling)
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T19]
Title: Create chat header
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (chat header with model info, sidebar toggle)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (ChatHeader reads from ChatSessionContext)

Action: Create features/chat/components/chat-header.tsx — "use client" chat header (~40 lines). Reads chatModel and status from **ChatSessionContext** (NOT props). Renders: sidebar toggle via useSidebar, model label, new chat navigation button. Model selector placeholder (functional ModelSelector wired in P6). Visibility selector placeholder (wired in P6).

Output files:
- features/chat/components/chat-header.tsx

Inputs: components/sidebar-toggle.tsx (P0-T12), components/ui/ (P0-T11), features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: ChatHeader consumed by ChatShell (P3-T21)

Dependencies: P3-T08
Dependents: P3-T21

Success criteria:
- ChatHeader reads from **ChatSessionContext** (NOT props — zero prop drilling)
- Renders sidebar toggle and model label
- Includes new chat navigation button
- ~40 lines
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T20]
Title: Create StreamBridge
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: state-management.md (stream event dispatching)
Architecture ref: SEAM-031 (URL State Management); ../../plan-archives/redesign/streaming-architecture.md (thin bridge + pure function)

Action: Create features/chat/components/**stream-bridge.tsx** (NOT data-stream-handler.tsx) — "use client" thin bridge component, **~20 lines**. Renders null (renderless). Consumes useChatStream() from ChatStreamProvider (reads ChatStream data parts). Processes unprocessed deltas via **processStreamDelta()** pure function (P3-T09). Writes resulting artifact state to **artifactStore.setState()**. Tracks last processed index via useRef to avoid reprocessing. Resets on chat ID change. Cross-feature import of artifactStore is an intentional documented exception (public API of artifacts feature).

Output files:
- features/chat/components/stream-bridge.tsx

Inputs: features/chat/components/chat-stream-provider.tsx (P3-T10), features/chat/lib/process-stream-deltas.ts (P3-T09)
Outputs: StreamBridge consumed by chat pages (P3-T25)

Dependencies: P3-T09, P3-T10
Dependents: P3-T25

Success criteria:
- File is **stream-bridge.tsx** (NOT data-stream-handler.tsx)
- Component name is **StreamBridge** (NOT DataStreamHandler)
- **~20 lines** — thin bridge, logic in processStreamDelta
- Bridges useChatStream() → processStreamDelta() → artifactStore.setState()
- Tracks lastProcessedRef to avoid reprocessing deltas
- Resets processing index on chat ID change
- Renderless (returns null)
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P3-T21]
Title: Create ChatShell orchestrator
Phase: 3 — Chat Core Vertical
Type: INTEG

Behavior ref: state-management.md (ChatShell as thin orchestrator)
Architecture ref: SEAM-028 (Client Error Handling); SEAM-031 (URL State Management); SEAM-015 (settings); ../../plan-archives/redesign/component-architecture.md (ChatShell ~60 lines)

Action: Create features/chat/components/**chat-shell.tsx** (NOT chat.tsx as God Component) — "use client" component, **~60 lines**. Thin orchestrator that: (1) Accepts props: id, initialMessages, initialChatModel, isReadonly, availableModels. (2) Calls **useChatSession({id, initialMessages, initialChatModel, isReadonly})** to get composed ChatSessionValue. (3) Calls **useChatSideEffects({id, status, messages})** for URL update, abort cleanup, artifact reset. (4) Provides **ChatSessionContext.Provider value={chatSession}**. (5) Renders ChatHeader, Messages, MultimodalInput as children — they read state from ChatSessionContext (zero props drilling). (6) Conditionally renders ArtifactPanel when artifact.isVisible (ArtifactPanel wired in P4-T17). **No direct useChat/useSettings calls** — all composition in useChatSession hook. **No SettingsProvider wrapping.** **No credit/gateway logic.**

Output files:
- features/chat/components/chat-shell.tsx

Inputs: features/chat/hooks/use-chat-session.ts (P3-T11), features/chat/hooks/use-chat-side-effects.ts (P3-T12), features/chat/components/messages.tsx (P3-T17), features/chat/components/multimodal-input.tsx (P3-T18), features/chat/components/chat-header.tsx (P3-T19), features/chat/hooks/use-chat-session-context.ts (P3-T08)
Outputs: ChatShell consumed by chat pages (P3-T25)

Dependencies: P3-T11, P3-T12, P3-T17, P3-T18, P3-T19
Dependents: P3-T25

Success criteria:
- File is **chat-shell.tsx** (NOT chat.tsx as monolithic orchestrator)
- Component is **~60 lines** (NOT 200+)
- Uses **useChatSession** hook (NOT inline useChat + useSettings)
- Calls **useChatSideEffects** for side-effect management
- Provides **ChatSessionContext.Provider** to children
- Children get state from **ChatSessionContext** (NOT prop drilling — zero props to ChatHeader, Messages, MultimodalInput)
- **No SettingsProvider** wrapping
- **No credit/gateway** logic
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T22]
Title: Create chat server actions
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (chat deletion, message operations)
Architecture ref: ../../plan-archives/redesign/data-flow.md (server actions for mutations); SEAM-038 (message edit flow)

Action: Create 3 files. (1) features/chat/actions/delete-chat.ts — "use server" action deleteChat(chatId): deletes chat and all messages, calls **updateTag** for cache invalidation. (2) features/chat/actions/delete-all-chats.ts — "use server" action deleteAllChats(): deletes all chats for current user, calls **updateTag**. (3) features/chat/actions/delete-trailing-messages.ts — "use server" action deleteTrailingMessages(chatId, messageId): deletes the specified message and all subsequent messages (by createdAt), calls **updateTag**. Used by message edit flow. All actions validate session via getAppSession(), use Zod schemas for input validation, return ActionResult<T> (never throw).

Output files:
- features/chat/actions/delete-chat.ts
- features/chat/actions/delete-all-chats.ts
- features/chat/actions/delete-trailing-messages.ts

Inputs: lib/data/chat.ts (P1-T06), lib/data/message.ts (P1-T07), lib/auth/session.ts (P2-T01), lib/cache/revalidate.ts (P1-T03), features/chat/schemas/chat.schema.ts (P3-T05)
Outputs: Server actions consumed by message editor (P3-T16), sidebar (P5)

Dependencies: P1-T03, P1-T06, P1-T07, P2-T01, P3-T05
Dependents: P3-T16, P5

Success criteria:
- deleteChat removes chat + messages + calls updateTag
- deleteAllChats removes all user chats + calls updateTag
- deleteTrailingMessages removes correct range of messages + calls updateTag
- All validate session before operating
- All use Zod schemas for input validation
- All return **ActionResult<T>** (never throw)
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T23]
Title: Create chat API route
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: api-contracts.md (POST /api/chat — streaming response)
Architecture ref: ../../plan-archives/redesign/streaming-architecture.md (createUIMessageStream, onFinish revalidation, title awaited server-side)

Action: Create app/api/chat/route.ts — POST handler. Flow: (1) Extract session via getAppSession(), (2) Validate body with chatRequestSchema, (3) Create chat record if new, (4) Build createUIMessageStream with execute callback: (a) Start titlePromise = generateTitle(msg) in parallel, (b) Call streamText with model, system prompt (composeSystemPrompt), messages, tools (getEnabledTools), providerOptions (getProviderOptions), smoothStream, maxSteps: 5, abortSignal, (c) result.consumeStream() + ChatStream.merge(result.toUIMessageStream({sendReasoning: true})), (d) **Await titlePromise** → write chat-title data part, (5) onFinish: saveMessages + updateChatTitle + refreshChat + refreshChatList via revalidateTag, (6) Return Response with stream.pipeThrough(new JsonToSseTransformStream()). **No credit/gateway checks.** Handles AbortSignal for partial save.

Output files:
- app/api/chat/route.ts

Inputs: lib/auth/session.ts (P2-T01), features/chat/schemas/chat.schema.ts (P3-T05), lib/ai/prompts.ts (P3-T02), lib/ai/tools.ts (P3-T03), features/chat/lib/tools/ (P3-T13), lib/data/chat.ts (P1-T06), lib/data/message.ts (P1-T07), lib/cache/revalidate.ts (P1-T03)
Outputs: Chat API route consumed by useChat on client (P3-T11)

Dependencies: P1-T03, P1-T06, P1-T07, P2-T01, P3-T02, P3-T03, P3-T05, P3-T13
Dependents: P3-T27

Success criteria:
- POST /api/chat returns streaming SSE response
- Uses **createUIMessageStream** (NOT createDataStreamResponse)
- Title **awaited server-side** before stream close (no polling)
- onFinish persists messages + revalidates cache tags via **refreshChat/refreshChatList**
- Auth required (returns 401 for unauthenticated)
- Input validated against chatRequestSchema
- **No credit/gateway/quota checks**
- Handles AbortSignal for cancellation + partial save
- pnpm typecheck passes

Complexity: L

---

### TASK: [ID: P3-T24]
Title: Create chat layout (SERVER)
Phase: 3 — Chat Core Vertical
Type: INTEG

Behavior ref: features.md (chat layout with sidebar, providers)
Architecture ref: SEAM-029 (provider tree — SERVER layout + client islands); ../../plan-archives/redesign/component-architecture.md (server layout)

Action: Create app/(chat)/layout.tsx — **SERVER layout** (no "use client" directive). Fetches session via getAppSession(). If not authenticated and not guest, redirect to /login. Renders: (1) NoticeHandler (P3-T14) — client island for URL notice params, (2) Script for pyodide (lazy), (3) PendingChatsProvider (stub — completed in P5-T02), (4) SidebarProvider(defaultOpen from cookie), (5) Suspense → SidebarSkeleton stub (completed in P5-T07), (6) SidebarInset → {children}. **No ChatStreamProvider here** — ChatStreamProvider is page-scoped (P3-T25). **No separate chat-layout-client.tsx** — client islands render inside this server layout.

Output files:
- app/(chat)/layout.tsx

Inputs: lib/auth/session.ts (P2-T01), features/chat/components/notice-handler.tsx (P3-T14), components/ui/sidebar.tsx (P0-T11)
Outputs: Chat layout consumed by chat pages (P3-T25)

Dependencies: P2-T01, P3-T14, P0-T11
Dependents: P3-T25, P5 (sidebar wiring)

Success criteria:
- Layout is a **SERVER component** (no "use client" directive)
- Redirects unauthenticated non-guest users to /login
- Includes **NoticeHandler** client island (prevents layout contamination)
- **PendingChatsProvider** stub wraps content (completed in P5)
- SidebarProvider reads defaultOpen from cookies
- **No ChatStreamProvider here** (page-scoped, not layout-scoped)
- **No chat-layout-client.tsx** file
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T25]
Title: Create chat pages
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: features.md (new chat page, existing chat page with message history)
Architecture ref: ../../plan-archives/redesign/component-architecture.md (page-level ChatStreamProvider, parallel fetches)

Action: Create 2 pages. (1) app/(chat)/page.tsx — New chat page ("/"). Server component: generates UUID, gets session, gets available models, renders **ChatStreamProvider** > **ChatShell** (empty) + **StreamBridge**. (2) app/(chat)/chat/[id]/page.tsx — Existing chat page. Server component: fetches chat + votes via **Promise.all** (parallel fetches), validates ownership/access, uses **`use cache`** + **cacheTag** for caching, renders **ChatStreamProvider** > **ChatShell**(initialMessages) + **StreamBridge** + Suspense > **VoteResolver**(votesPromise). VoteResolver defers vote hydration without blocking chat render.

Output files:
- app/(chat)/page.tsx
- app/(chat)/chat/[id]/page.tsx

Inputs: features/chat/components/chat-shell.tsx (P3-T21), features/chat/components/stream-bridge.tsx (P3-T20), features/chat/components/chat-stream-provider.tsx (P3-T10), lib/data/chat.ts (P1-T06), lib/auth/session.ts (P2-T01)
Outputs: Chat pages — the main user-facing views

Dependencies: P1-T06, P2-T01, P3-T10, P3-T20, P3-T21
Dependents: P3-T27

Success criteria:
- "/" renders **ChatStreamProvider** > **ChatShell** (empty) + **StreamBridge** for new conversation
- "/chat/[id]" fetches data with **Promise.all** (parallel, no waterfall)
- "/chat/[id]" uses **`use cache`** + **cacheTag** for caching
- 404 returned for non-existent or unauthorized chat
- **ChatStreamProvider** is page-scoped (placed here, NOT in layout)
- **VoteResolver** defers vote hydration in Suspense (P6 completes)
- Page metadata set correctly
- pnpm typecheck passes

Complexity: M

---

### TASK: [ID: P3-T26]
Title: Create chat error boundary
Phase: 3 — Chat Core Vertical
Type: IMPL

Behavior ref: edge-cases.md (error boundaries for chat routes)
Architecture ref: ../../plan-archives/redesign/architecture.md (error.tsx per route group)

Action: Create app/(chat)/error.tsx — "use client" error boundary with retry button. Catches route-level errors in the chat group. Shows user-friendly error message and a retry action. Uses reset() from Next.js error boundary props.

Output files:
- app/(chat)/error.tsx

Inputs: components/ui/ (P0-T11), lib/errors/app-error.ts (P0-T08)
Outputs: Error boundary for chat routes

Dependencies: P0-T08
Dependents: P3-T27

Success criteria:
- error.tsx has "use client" directive
- Catches route-level errors and shows retry button
- Uses reset() for recovery
- pnpm typecheck passes

Complexity: S

---

### TASK: [ID: P3-T27]
Title: Verification gate G03
Phase: 3 — Chat Core Vertical
Type: VERIFY

Behavior ref: features.md (complete chat flow)
Architecture ref: AGENTS.md (post-implementation validation)

Action: Run complete validation. **Tooling**: (1) pnpm typecheck passes, (2) pnpm lint passes, (3) pnpm format passes. **Functional**: (4) pnpm dev starts, (5) Navigate to "/" — greeting displays, (6) Send message — AI streaming response appears, (7) Reasoning content shows (supported models), (8) Weather tool works, (9) New chat creates conversation, (10) Existing chat loads messages, (11) Message edit flow works. **Architecture**: (12) **ChatShell is ~60 lines** (NOT a God Component), (13) **StreamBridge ~20 lines** (NOT DataStreamHandler), (14) **ChatStreamProvider** split state/dispatch with RAF batching (NOT DataStreamProvider), (15) **ChatSessionContext** used (NOT ChatContext), (16) **useChatSession** composes all chat state (~120 lines), (17) **processStreamDelta** is a pure testable function, (18) **No SettingsProvider** wrapping — useSettings() via useSyncExternalStore, (19) **No credit/gateway** logic, (20) **createArtifact/updateArtifact** tool stubs (NOT createDocument/updateDocument), (21) **Handler registry** in lib/ai/artifact-handlers.ts, (22) Chat API route uses **createUIMessageStream** with title **awaited server-side**, (23) Chat layout is **SERVER component**, (24) Chat pages use **`use cache`** + **cacheTag**.

Output files: none (validation only)

Inputs: all P3-T01 through P3-T26 outputs
Outputs: Gate G03 passed — P4 (artifacts) can begin

Dependencies: P3-T01 through P3-T26
Dependents: P4-T01

Success criteria:
- pnpm typecheck exits 0
- pnpm lint exits 0
- pnpm format --check exits 0
- Chat streaming works end-to-end (send message, receive response)
- Messages persist to database
- Title auto-generated for new chats (awaited server-side, no polling)
- Weather tool functional
- Message edit + re-submit works
- **ChatShell** ≤ 60 lines (thin orchestrator, NOT God Component)
- **StreamBridge** ~20 lines (NOT DataStreamHandler)
- **ChatStreamProvider** uses split contexts + RAF batching (NOT DataStreamProvider)
- **ChatSessionContext** naming verified (NOT ChatContext)
- **useChatSession** composes chat state (NOT inline in ChatShell)
- **processStreamDelta** is pure function (NOT embedded in component)
- **useSettings()** via useSyncExternalStore (NOT SettingsProvider)
- **createArtifact/updateArtifact** stubs present (NOT createDocument/updateDocument)
- Handler registry present in lib/ai/artifact-handlers.ts
- Chat API uses **createUIMessageStream** (NOT createDataStreamResponse)
- Chat layout is SERVER component (no "use client")
- Chat pages use **`use cache`** + **cacheTag**
- Zero credit/gateway/quota code

Complexity: S

---

## Exit Criteria

- [ ] ChatShell creates `ChatSessionContext.Provider` (~60 lines, NOT a God Component)
- [ ] `useChatSession` encapsulates `useChat` config + callbacks (~120 lines)
- [ ] `ChatStreamProvider` uses split contexts (state/dispatch) with RAF batching
- [ ] `processStreamDelta()` is a pure testable function (no React state)
- [ ] `StreamBridge` is a thin bridge (~20 lines, NOT DataStreamHandler)
- [ ] Chat API route uses `createUIMessageStream` with `onFinish` revalidation
- [ ] Title is AWAITED server-side before stream close (no polling)
- [ ] System prompt uses "artifact" (not "document")
- [ ] Chat tools: `createArtifact`, `updateArtifact` (not createDocument/updateDocument)
- [ ] Handler registry in `lib/ai/artifact-handlers.ts` (dependency inversion)
- [ ] Chat pages use `'use cache'` + `cacheTag` for fetching
- [ ] Chat layout is a SERVER component (no "use client")
- [ ] `ChatStreamProvider` is page-scoped (NOT layout-scoped)
- [ ] `useSettings()` uses `useSyncExternalStore` + localStorage (NO SettingsProvider)
- [ ] Children read from `ChatSessionContext` (NOT 15-16 props drilling)
- [ ] All Server Actions return `ActionResult<T>` (never throw)
- [ ] `pnpm typecheck && pnpm lint && pnpm format` pass

---

## Verification

```bash
pnpm format && pnpm typecheck && pnpm lint
```
