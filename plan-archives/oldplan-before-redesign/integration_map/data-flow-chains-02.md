# Data Flow Chains — Part 02 (Flows 9–15)

> Continuation of data flow chains. See [data-flow-chains-01.md](data-flow-chains-01.md) for Flows 1–8.

---

## Flow 9: File Upload

**Trigger:** User clicks attachment button in `MultimodalInput`

```
USER CLICKS PAPERCLIP
  │
  ├── Hidden <input type="file" accept="image/*"> triggered
  │     └── onChange → files added to uploadQueue state
  │
  ├── UPLOAD (max 3 concurrent)
  │     ├── For each file: new FormData().append('file', file)
  │     ├── POST /api/files/upload (multipart/form-data)
  │     │     ├── Auth check
  │     │     ├── Rate limit: upload (10/hour)
  │     │     ├── put(filename, file) → Vercel Blob storage
  │     │     └── Return { url, pathname, contentType }
  │     └── Attachment added: { name, url, contentType }
  │
  ├── PREVIEW
  │     └── PreviewAttachment: 64x64 thumbnail, remove button, upload spinner
  │
  ├── ON SUBMIT
  │     ├── Attachments converted to message parts: { type: "file", data: url, mimeType }
  │     ├── Sent with sendMessage({ message, experimental_attachments })
  │     └── Attachments cleared after send
  │
  └── ABORT
        └── AbortController cancels active uploads on component unmount
```

---

## Flow 10: Vote

**Trigger:** User clicks thumbs up/down on assistant message

```
USER CLICKS VOTE BUTTON
  │
  ├── MessageActions component
  │     ├── Optimistic SWR mutation: update vote cache immediately
  │     └── PATCH /api/vote { chatId, messageId, type: "up"|"down" }
  │
  ├── SERVER
  │     ├── parseJsonBodyForRoute(body, voteSchema)
  │     ├── requireAuthForRoute → session
  │     ├── requireNonGuestForRoute → 403 if guest
  │     ├── RateLimiters.standard(userId) → rate limit
  │     ├── chatData.get(chatId, ctx) → ownership check
  │     ├── chatData.getWithMessages(chatId, ctx) → message membership check
  │     │     └── Verify messageId exists in chat's messages (IDOR protection)
  │     ├── DB: INSERT INTO votes ... ON CONFLICT DO UPDATE SET isUpvoted = ?
  │     └── Return { success: true, messageId, type }
  │
  └── RENDER: Vote button shows filled/highlighted icon for active vote
```

---

## Flow 11: Suggestions

**Trigger:** AI calls `requestSuggestions` tool

```
AI TOOL CALL: requestSuggestions({ documentId })
  │
  ├── SERVER
  │     ├── documentData.get(documentId, ctx) → existing document
  │     ├── latestVersion = document.versions.at(-1)
  │     ├── streamObject() with artifact-model:
  │     │     schema: z.object({ suggestions: z.array(z.object({
  │     │       originalText, suggestedText, description
  │     │     })).max(5) })
  │     ├── For each suggestion:
  │     │     dataStream.write({ type: "data-suggestion", data: suggestion })
  │     ├── Auth users: saveSuggestions() → DB INSERT
  │     └── Guest users: suggestions in-session only (not persisted)
  │
  ├── CLIENT
  │     ├── DataStreamHandler receives data-suggestion parts
  │     ├── Suggestions accumulated in artifact or component state
  │     └── Text editor integrates suggestions via SuggestionsExtension
  │
  └── RENDER (Text artifact only)
        ├── TipTap SuggestionsExtension creates decorations for originalText
        ├── Inline popup: suggestedText + description
        ├── Accept → replace text in editor
        └── Dismiss → mark resolved (remove decoration)
```

---

## Flow 12: Model Selection

**Trigger:** User picks model from dropdown

```
USER SELECTS MODEL
  │
  ├── ModelSelectorCompact (in MultimodalInput toolbar)
  │   or ModelSelector (standalone)
  │     ├── Models from: listChatModels() → server → page props → component
  │     ├── Grouped by provider, sorted by name
  │     └── onModelChange(newModelId) called
  │
  ├── STATE UPDATE
  │     ├── settings.setSelectedModelId(modelId) → localStorage
  │     ├── Cookie: document.cookie = "chat-model={modelId}" (server-readable)
  │     └── Chat component: currentModelId state updated
  │
  ├── NEXT CHAT REQUEST
  │     ├── prepareSendMessagesRequest includes selectedChatModel
  │     ├── Server: isValidModelId() validates against registry
  │     ├── Server: getModelById() → capabilities, reasoning type
  │     └── Server: myProvider.languageModel(selectedChatModel) resolves model
  │
  └── CAPABILITY EFFECTS
        ├── Tool enablement: reasoning-only models → no tools
        ├── Gemma models → no tools
        ├── Reasoning middleware: wraps model with extractReasoningMiddleware if applicable
        ├── Provider options: per-provider reasoning config injected
        └── Attachment button: disabled for reasoning models
```

---

## Flow 13: Visibility Toggle

**Trigger:** User selects Private/Public in VisibilitySelector

```
USER CLICKS VISIBILITY OPTION
  │
  ├── VisibilitySelector component (in ChatHeader, desktop only)
  │     └── setChatVisibilityType(type) from useChatVisibility
  │
  ├── OPTIMISTIC UPDATE
  │     ├── SWR mutate(`${chatId}-visibility`, type, false) → immediate UI
  │     └── UI shows new icon (lock/globe) immediately
  │
  ├── SERVER ACTION: updateChatVisibility({ chatId, visibility })
  │     ├── getAppSession() → session
  │     ├── Ownership verification
  │     ├── chatData.updateVisibility(chatId, visibility, ctx)
  │     │     ├── DB UPDATE chats SET visibility = ? WHERE id = ?
  │     │     └── Cache: update chat:{id}:{userId}:meta
  │     └── Return void
  │
  └── ON FAILURE
        ├── SWR mutate(`${chatId}-visibility`, initialVisibility)
        ├── toast.error("Failed to update visibility")
        └── UI reverts to previous state
```

---

## Flow 14: Settings Update

**Trigger:** User changes settings in Settings Sheet

```
USER CHANGES SETTING
  │
  ├── SettingsSheet component (Sheet from right)
  │     ├── Temperature input → updateSettings({ sampling: { temperature: v } })
  │     ├── TopP input → updateSettings({ sampling: { topP: v } })
  │     ├── MaxOutputTokens input → updateSettings({ sampling: { maxOutputTokens: v } })
  │     ├── SystemPrompt textarea → updateSettings({ systemPrompt: text })
  │     ├── Enable Reasoning toggle → updateSettings({ enableReasoning: bool })
  │     ├── Stream Artifacts toggle → updateSettings({ streamArtifacts: bool })
  │     └── Auto-scroll toggle → updateSettings({ autoScroll: bool })
  │
  ├── STATE
  │     ├── SettingsProvider: useSyncExternalStore + localStorage
  │     ├── Key: "settings" in localStorage
  │     ├── Pub/sub pattern: all subscribers notified on change
  │     └── useSettingsSnapshot() reads without re-render subscription
  │
  ├── CONSUMPTION
  │     ├── Chat component reads via useSettings()
  │     ├── prepareSendMessagesRequest includes full settings object
  │     ├── Server: settings.sampling → temperature, topP, maxOutputTokens
  │     ├── Server: settings.systemPrompt → appended to system prompt
  │     ├── Server: settings.enableReasoning → providerOptions config
  │     └── Client: settings.autoScroll → Virtuoso followOutput behavior
  │
  └── RESET
        └── "Reset to defaults" → clear localStorage → defaults restored
```

---

## Flow 15: Title Generation

**Trigger:** New chat's first message send

```
FIRST MESSAGE IN NEW CHAT
  │
  ├── SERVER (parallel with streaming)
  │     ├── generateTitleFromUserMessage({ message })
  │     │     ├── generateText({ model: DEFAULT_TITLE_MODEL, system: "...", prompt: JSON.stringify(message) })
  │     │     ├── Returns: generated title string
  │     │     └── Fallback: first 80 chars of message text
  │     │
  │     ├── IMMEDIATE: placeholderTitle used for saveChat()
  │     ├── STREAM: dataStream.write({ type: "data-chatTitle", data: generatedTitle })
  │     │
  │     └── ASYNC (fire-and-forget):
  │           ├── Verify chat still exists (race condition: user may delete quickly)
  │           ├── updateChatTitle({ chatId, title, ctx })
  │           │     ├── DB UPDATE chats SET title = ? WHERE id = ?
  │           │     └── Cache: update chat:{id}:{userId}:meta
  │           └── On error: log warning, stale placeholder persists
  │
  ├── CLIENT
  │     ├── useChat.onData receives data-chatTitle
  │     │     └── updateOptimisticChat(chatId, { title: generatedTitle })
  │     ├── onFinish: poll /api/chat?id={chatId} for confirmed title
  │     │     (max 5 attempts, 500ms interval)
  │     └── window.dispatchEvent('chat-title-updated') → sidebar listens
  │
  └── SIDEBAR UPDATES
        ├── Optimistic entry shows placeholder → then real title
        ├── SWR revalidation on next page load confirms title
        └── GroupedVirtuoso re-renders affected item
```
