# AI SDK Elements Research Report

**Date**: 2025-12-21  
**Researcher**: ouroboros-researcher  
**Subject**: Vercel AI SDK Elements - Pre-built UI Components

---

## Executive Summary

AI SDK Elements is a **component library and custom registry** built on top of shadcn/ui specifically for AI-native applications. It provides pre-built, customizable React components that integrate directly with the Vercel AI SDK's `useChat` hook and message streaming infrastructure. Components are installed into your project's codebase (not hidden in a library), allowing full customization.

**Key Finding**: AI SDK Elements can replace **11 of 13** custom OldApp components with minimal effort. The remaining 2 require custom implementation due to lack of official support.

---

## 1. Installation

### Prerequisites
- Node.js 18+
- Next.js project with AI SDK installed
- shadcn/ui installed (auto-installs if missing)
- **React 19** and **Tailwind CSS 4** (built targeting these versions)

### Installation Methods

```bash
# Method 1: AI Elements CLI (recommended)
npx ai-elements@latest

# Method 2: Individual component installation
npx ai-elements@latest add <component-name>

# Method 3: shadcn CLI
npx shadcn@latest add <component-name> --from ai-elements
```

### Dependencies
```bash
npm i ai @ai-sdk/react zod
```

### Additional Setup (for MessageResponse)
Add to `globals.css`:
```css
@source "../node_modules/streamdown/dist/*.js";
```

---

## 2. Available AI SDK Elements

### 2.1 Core Chatbot Components

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| **Conversation** | `npx ai-elements@latest add conversation` | Message container with auto-scroll, scroll button |
| **Message** | `npx ai-elements@latest add message` | Message rendering with actions, branching, markdown |
| **PromptInput** | `npx ai-elements@latest add prompt-input` | Rich input with attachments, model picker, voice |
| **Loader** | `npx ai-elements@latest add loader` | Spinning loader for streaming states |

### 2.2 AI Content Display Components

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| **Reasoning** | `npx ai-elements@latest add reasoning` | Chain-of-thought display with streaming |
| **Sources** | `npx ai-elements@latest add sources` | Citation/source URL display from AI |
| **InlineCitation** | `npx ai-elements@latest add inline-citation` | Hoverable inline citations |
| **Tool** | `npx ai-elements@latest add tool` | Tool call display with status/input/output |
| **Task** | `npx ai-elements@latest add task` | Task/workflow progress tracking |
| **Suggestion** | `npx ai-elements@latest add suggestion` | Clickable suggestion buttons |
| **Context** | `npx ai-elements@latest add context` | Token usage and cost display |

### 2.3 Utility Components

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| **CodeBlock** | `npx ai-elements@latest add code-block` | Syntax highlighting, copy, line numbers |
| **Image** | `npx ai-elements@latest add image` | AI-generated image display |
| **Shimmer** | `npx ai-elements@latest add shimmer` | Loading/progressive reveal effects |

---

## 3. Component Mapping: OldApp → AI SDK Elements

### 3.1 REPLACEABLE Components (11/13)

| OldApp Component | AI SDK Element | Replacement Coverage |
|------------------|---------------|---------------------|
| `message.tsx` | **Message** | ✅ 100% - Complete message rendering, actions, branching |
| `prompt-input.tsx` | **PromptInput** | ✅ 100% - Full-featured with attachments, voice, model picker |
| `loader.tsx` | **Loader** | ✅ 100% - Spinning animation for streaming states |
| `reasoning.tsx` | **Reasoning** | ✅ 100% - Chain-of-thought with auto-open on stream |
| `source.tsx` | **Sources** | ✅ 100% - Source URL display with collapsible UI |
| `inline-citation.tsx` | **InlineCitation** | ✅ 100% - Hover cards with carousel |
| `tool.tsx` | **Tool** | ✅ 100% - Tool invocation display with all states |
| `task.tsx` | **Task** | ✅ 100% - Collapsible task lists with status |
| `suggestion.tsx` | **Suggestion** | ✅ 100% - Clickable suggestion buttons |
| `context.tsx` | **Context** | ✅ 100% - Token usage, cost estimation |
| `response.tsx` | **MessageResponse** | ✅ 100% - Part of Message component, handles markdown |

### 3.2 CUSTOM IMPLEMENTATION REQUIRED (2/13)

| OldApp Component | AI SDK Element | Notes |
|------------------|---------------|-------|
| `actions.tsx` | ❌ **None** | MessageActions exists but for generic actions. Custom AI action buttons need custom implementation |
| `web-preview.tsx` | ❌ **None** | No AI SDK Element for web content preview. Maintain custom component |

---

## 4. Component Details

### 4.1 Message Component Suite

**Sub-components**:
- `Message` - Main container with `from` prop (user/assistant)
- `MessageContent` - Content wrapper
- `MessageResponse` - Markdown rendering with GFM, math, smart streaming (uses Streamdown)
- `MessageActions` - Action button container
- `MessageAction` - Individual action button with tooltip
- `MessageBranch` - Conversation branching UI
- `MessageBranchSelector` - Branch navigation controls
- `MessageAttachments` / `MessageAttachment` - File display

**Features**:
- Markdown with GFM (tables, task lists, strikethrough)
- Math equations support
- Response branching with navigation
- Syntax highlighting in code blocks
- Action buttons (retry, like, dislike, copy)

### 4.2 PromptInput Component Suite

**Sub-components**:
- `PromptInput` - Main form container
- `PromptInputTextarea` - Auto-resizing textarea
- `PromptInputSubmit` - Status-aware submit button
- `PromptInputAttachments` / `PromptInputAttachment` - File attachments
- `PromptInputActionMenu` - Action dropdown
- `PromptInputSelect` - Model selector dropdown
- `PromptInputSpeechButton` - Native Web Speech API voice input
- `PromptInputButton` - Custom tool buttons (e.g., web search toggle)

**Features**:
- Auto-resizing textarea
- Drag-and-drop file attachments
- Image preview for attachments
- Model selection dropdown
- Speech recognition (Web Speech API)
- Keyboard shortcuts (Enter submit, Shift+Enter newline)
- Global document drop support

### 4.3 Reasoning Component

**Sub-components**:
- `Reasoning` - Container with `isStreaming` prop
- `ReasoningTrigger` - Collapsible trigger with "Thinking..." text
- `ReasoningContent` - Reasoning text content

**Features**:
- Auto-opens during streaming, closes when complete
- Visual streaming indicator (pulsing animation)
- Works with DeepSeek R1, Claude models
- Server-side: `sendReasoning: true` in `toUIMessageStreamResponse()`

### 4.4 Tool Component

**Sub-components**:
- `Tool` - Collapsible container
- `ToolHeader` - Header with type and state badges
- `ToolContent` - Collapsible content area
- `ToolInput` - JSON parameter display
- `ToolOutput` - Result/error display

**States**: `pending`, `running`, `completed`, `error`, `denied`

### 4.5 Context Component

**Sub-components**:
- `Context` - Root provider
- `ContextTrigger` - Button showing usage percentage
- `ContextContent` - Hover card content
- `ContextInputUsage`, `ContextOutputUsage`, `ContextReasoningUsage`, `ContextCacheUsage`

**Features**:
- Circular progress ring
- Token breakdown by type
- Cost estimation via `tokenlens` library
- Automatic K/M/B formatting

---

## 5. Integration with AI SDK

### 5.1 Server-Side Configuration

```typescript
// app/api/chat/route.ts
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-4o',
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,   // Enable reasoning parts
    sendSources: true,     // Enable source parts
    messageMetadata: ({ part }) => {
      if (part.type === 'finish') {
        return { totalTokens: part.totalUsage.totalTokens };
      }
    },
  });
}
```

### 5.2 Client-Side Integration

```typescript
'use client';
import { useChat } from '@ai-sdk/react';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';

export default function Chat() {
  const { messages, sendMessage, status } = useChat();

  return (
    <Conversation>
      <ConversationContent>
        {messages.map(message => (
          <Message from={message.role} key={message.id}>
            <MessageContent>
              {message.parts.map((part, i) => {
                switch (part.type) {
                  case 'text':
                    return <MessageResponse key={i}>{part.text}</MessageResponse>;
                  case 'reasoning':
                    return (
                      <Reasoning key={i} isStreaming={status === 'streaming'}>
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  case 'source-url':
                    // Handle sources
                  case 'tool-*':
                    // Handle tool calls
                }
              })}
            </MessageContent>
          </Message>
        ))}
      </ConversationContent>
    </Conversation>
  );
}
```

---

## 6. Message Parts System

AI SDK uses a `parts` array on messages instead of single `content`:

| Part Type | Description |
|-----------|-------------|
| `text` | Text content |
| `reasoning` | Chain-of-thought reasoning |
| `source-url` | Web source citation |
| `source-document` | Document citation |
| `file` | File attachment |
| `tool-<name>` | Tool invocation with `state`, `input`, `output` |

---

## 7. Recommendations

### 7.1 Implementation Priority

1. **Phase 1 - Core Components** (Immediate)
   - Install: `conversation`, `message`, `prompt-input`, `loader`
   - These form the foundation of the chat UI

2. **Phase 2 - AI Features** (Next)
   - Install: `reasoning`, `sources`, `tool`, `context`
   - These handle AI-specific content rendering

3. **Phase 3 - Enhancements** (Later)
   - Install: `suggestion`, `inline-citation`, `task`, `code-block`
   - These add polish and additional features

### 7.2 Custom Components to Maintain

1. **actions.tsx** - Keep custom AI action buttons implementation
2. **web-preview.tsx** - Keep custom web content preview

### 7.3 Migration Steps

1. Install AI Elements: `npx ai-elements@latest`
2. Add individual components as needed
3. Update imports from OldApp paths to `@/components/ai-elements/`
4. Update message rendering to use `message.parts` pattern
5. Configure server to use `toUIMessageStreamResponse()` with appropriate options
6. Test streaming, reasoning, and tool call rendering

---

## 8. Key Differences from OldApp

| Aspect | OldApp | AI SDK Elements |
|--------|--------|-----------------|
| Message Structure | `content` string | `parts` array |
| Streaming Protocol | Custom | `toUIMessageStreamResponse()` |
| Component Style | Custom components | shadcn/ui based |
| State Management | Custom hooks | `useChat` from `@ai-sdk/react` |
| Tool Calls | Custom handling | Part-based with `tool-<name>` type |
| Reasoning | Custom | Native `reasoning` part type |

---

## 9. Files Created

- `.ouroboros/subagent-docs/researcher-ai-sdk-elements-2025-12-21.md` (this file)

---

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ [TASK COMPLETE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
