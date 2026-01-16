# Component Specification

**Version**: 1.0  
**Framework**: React 19 + Next.js 15.1  
**UI Library**: shadcn/ui + custom AI elements  
**Date**: 2024-12-27  
**Status**: 🟢 Active

---

## Overview

This specification documents all React components in the Next.js AI Chatbot codebase. Components are organized into three primary categories:

1. **AI Elements** (31 SDK components in `components/ai-elements/`)
2. **UI Primitives** (shadcn/ui based in `components/ui/`)
3. **Feature Components** (domain-specific in `features/*/components/`)

### Critical Architecture Rule

> ⚠️ **NEVER edit files in `components/ai-elements/`**  
> These files are SDK-provided and will be overwritten on updates.  
> **Always edit wrappers in `shared/components/ai/`**

---

## Component Locations

| Category | Location | Purpose |
|----------|----------|---------|
| AI Elements (SDK) | `components/ai-elements/` | READ-ONLY SDK components |
| AI Wrappers | `shared/components/ai/` | Editable AI component wrappers |
| UI Primitives | `components/ui/` | shadcn/ui base components |
| Shared Components | `shared/components/` | Cross-feature reusable UI |
| Feature Components | `features/*/components/` | Domain-specific components |

---

## AI Element Components (31 Components)

### Category: Streaming & Display

#### Component: Conversation

**File**: `components/ai-elements/conversation.tsx`  
**Category**: Streaming  
**LOC**: ~104

**Props**:
```typescript
export type ConversationProps = ComponentProps<typeof StickToBottom>;

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;
```

**Dependencies**:
- `use-stick-to-bottom` (auto-scroll management)
- `@/components/ui/button`
- `@/lib/utils/index`

**SDK Integration**:
- Provides scroll-to-bottom behavior for chat interfaces
- Manages automatic scrolling during message streaming

**Exported Components**:
- `Conversation` - Main container with auto-scroll
- `ConversationContent` - Message container
- `ConversationEmptyState` - Empty chat placeholder
- `ConversationScrollButton` - Manual scroll control

**Usage Example**:
```tsx
<Conversation>
  <ConversationContent>
    {messages.map(msg => <Message key={msg.id} {...msg} />)}
  </ConversationContent>
  <ConversationScrollButton />
</Conversation>
```

---

#### Component: Reasoning

**File**: `components/ai-elements/reasoning.tsx`  
**Category**: Streaming  
**LOC**: ~204

**Props**:
```typescript
export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  duration?: number;
};
```

**Dependencies**:
- `@radix-ui/react-use-controllable-state`
- `@/components/ui/collapsible`
- `./shimmer`
- `streamdown`

**SDK Integration**:
- Displays AI reasoning/thinking process
- Auto-closes when streaming completes
- Tracks thinking duration

**Exported Components**:
- `Reasoning` - Collapsible container with streaming state
- `ReasoningHeader` - Header with toggle trigger
- `ReasoningContent` - Expandable content area

**Usage Example**:
```tsx
<Reasoning isStreaming={isThinking} duration={thinkingTime}>
  <ReasoningHeader>
    <ReasoningTitle>Thinking...</ReasoningTitle>
  </ReasoningHeader>
  <ReasoningContent>{reasoningText}</ReasoningContent>
</Reasoning>
```

---

#### Component: ChainOfThought

**File**: `components/ai-elements/chain-of-thought.tsx`  
**Category**: Streaming  
**LOC**: ~236

**Props**:
```typescript
export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};
```

**Dependencies**:
- `@radix-ui/react-use-controllable-state`
- `@/components/ui/collapsible`
- `@/components/ui/badge`

**SDK Integration**:
- Displays step-by-step reasoning process
- Supports nested thought nodes
- Collapsible tree structure

**Exported Components**:
- `ChainOfThought` - Container context provider
- `ChainOfThoughtHeader` - Collapsible trigger
- `ChainOfThoughtNode` - Individual thought step
- `ChainOfThoughtContent` - Node content area

---

#### Component: Plan

**File**: `components/ai-elements/plan.tsx`  
**Category**: Streaming  
**LOC**: ~143

**Props**:
```typescript
export type PlanProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};
```

**Dependencies**:
- `@/components/ui/card`
- `@/components/ui/collapsible`
- `./shimmer`

**SDK Integration**:
- Displays AI-generated action plans
- Streaming shimmer effect during generation

**Exported Components**:
- `Plan` - Card-based collapsible container
- `PlanHeader` - Card header section
- `PlanTitle` - Title with shimmer effect
- `PlanDescription` - Description text
- `PlanContent` - Collapsible content
- `PlanToggle` - Expand/collapse trigger
- `PlanFooter` - Footer section

---

#### Component: Shimmer

**File**: `components/ai-elements/shimmer.tsx`  
**Category**: Streaming  
**LOC**: ~57

**Props**:
```typescript
export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};
```

**Dependencies**:
- `motion/react` (Framer Motion)

**SDK Integration**:
- Animated text shimmer effect for streaming indicators
- Customizable animation duration and spread

**Usage Example**:
```tsx
<Shimmer duration={2} spread={2}>
  Loading content...
</Shimmer>
```

---

### Category: Message Display

#### Component: Message

**File**: `components/ai-elements/message.tsx`  
**Category**: Message  
**LOC**: ~446

**Props**:
```typescript
export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};
```

**Dependencies**:
- `ai` (UIMessage, FileUIPart types)
- `streamdown` (markdown rendering)
- `@/components/ui/button`
- `@/components/ui/button-group`
- `@/components/ui/tooltip`

**SDK Integration**:
- Uses `UIMessage` from `ai` package
- Supports user/assistant role styling
- File attachment display
- Branch navigation for message variants

**Exported Components**:
- `Message` - Container with role-based styling
- `MessageContent` - Content wrapper
- `MessageActions` - Action buttons container
- `MessageAction` - Individual action with tooltip
- `MessageAttachments` - File attachments display
- `MessageAttachment` - Single attachment
- `MessageBranches` - Branch navigation UI
- `MessageMarkdown` - Markdown renderer

**Usage Example**:
```tsx
<Message from="assistant">
  <MessageContent>
    <MessageMarkdown>{message.content}</MessageMarkdown>
  </MessageContent>
  <MessageActions>
    <MessageAction tooltip="Copy" onClick={handleCopy}>
      <CopyIcon />
    </MessageAction>
  </MessageActions>
</Message>
```

---

#### Component: Image

**File**: `components/ai-elements/image.tsx`  
**Category**: Message  
**LOC**: ~120

**Props**:
```typescript
export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
  lazy?: boolean;
};
```

**Dependencies**:
- `ai` (Experimental_GeneratedImage type)

**SDK Integration**:
- Displays AI-generated images
- Supports base64 and uint8Array formats
- Lazy loading via IntersectionObserver
- Loading skeleton with shimmer

**Usage Example**:
```tsx
<Image 
  base64={imageData.base64}
  mediaType="image/png"
  lazy={true}
/>
```

---

#### Component: InlineCitation

**File**: `components/ai-elements/inline-citation.tsx`  
**Category**: Message  
**LOC**: ~299

**Props**:
```typescript
export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[];
};
```

**Dependencies**:
- `@/components/ui/badge`
- `@/components/ui/carousel`
- `@/components/ui/hover-card`

**SDK Integration**:
- Displays source citations inline with text
- Hover card with source carousel
- Supports multiple source URLs

**Exported Components**:
- `InlineCitation` - Container wrapper
- `InlineCitationText` - Cited text span
- `InlineCitationCard` - Hover card container
- `InlineCitationCardTrigger` - Badge trigger
- `InlineCitationCardContent` - Source details
- `InlineCitationCarousel` - Multiple sources carousel

---

#### Component: Sources

**File**: `components/ai-elements/sources.tsx`  
**Category**: Message  
**LOC**: ~76

**Props**:
```typescript
export type SourcesProps = ComponentProps<"div">;

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number;
};

export type SourceProps = ComponentProps<"a">;
```

**Dependencies**:
- `@/components/ui/collapsible`

**SDK Integration**:
- Collapsible source references
- Link to external sources

**Exported Components**:
- `Sources` - Collapsible container
- `SourcesTrigger` - Count badge trigger
- `SourcesContent` - Source list
- `Source` - Individual source link

---

### Category: Tool Invocation

#### Component: Tool

**File**: `components/ai-elements/tool.tsx`  
**Category**: Tools  
**LOC**: ~174

**Props**:
```typescript
export type ToolProps = ComponentProps<typeof Collapsible>;

export type ToolHeaderProps = {
  title?: string;
  type: ToolUIPart["type"];
  state: ExtendedToolState;
  className?: string;
};
```

**Dependencies**:
- `ai` (ToolUIPart type)
- `@/lib/types/ai-sdk` (ExtendedToolState)
- `@/components/ui/badge`
- `@/components/ui/collapsible`
- `./code-block`

**SDK Integration**:
- Displays tool call status and results
- Supports states: `input-streaming`, `input-available`, `approval-requested`, `approval-responded`, `output-available`, `output-error`, `output-denied`

**Exported Components**:
- `Tool` - Collapsible container
- `ToolHeader` - Status badge and title
- `ToolContent` - Expandable details
- `ToolInput` - Tool input display
- `ToolOutput` - Tool output display

**Usage Example**:
```tsx
<Tool>
  <ToolHeader 
    title="searchWeb" 
    type="tool-call"
    state="output-available"
  />
  <ToolContent>
    <ToolInput>{JSON.stringify(args)}</ToolInput>
    <ToolOutput>{JSON.stringify(result)}</ToolOutput>
  </ToolContent>
</Tool>
```

---

#### Component: Confirmation

**File**: `components/ai-elements/confirmation.tsx`  
**Category**: Tools  
**LOC**: ~189

**Props**:
```typescript
export type ConfirmationProps = ComponentProps<typeof Alert> & {
  approval?: ToolUIPartApproval;
  state: ExtendedToolState;
};
```

**Dependencies**:
- `@/components/ui/alert`
- `@/components/ui/button`
- `@/lib/types/ai-sdk`

**SDK Integration**:
- Tool approval UI for human-in-the-loop
- Displays approval/denial status
- Action buttons for approve/deny

**Exported Components**:
- `Confirmation` - Alert container
- `ConfirmationHeader` - Title section
- `ConfirmationContent` - Message content
- `ConfirmationActions` - Approve/Deny buttons

---

### Category: Canvas (ReactFlow)

#### Component: Canvas

**File**: `components/ai-elements/canvas.tsx`  
**Category**: Canvas  
**LOC**: ~23

**Props**:
```typescript
type CanvasProps = ReactFlowProps & {
  children?: ReactNode;
};
```

**Dependencies**:
- `@xyflow/react` (ReactFlow)

**SDK Integration**:
- ReactFlow wrapper for node-based canvas
- Pre-configured with keyboard shortcuts and zoom

**Usage Example**:
```tsx
<Canvas nodes={nodes} edges={edges} onNodesChange={onNodesChange}>
  <Panel position="top-right">Controls</Panel>
</Canvas>
```

---

#### Component: Node

**File**: `components/ai-elements/node.tsx`  
**Category**: Canvas  
**LOC**: ~71

**Props**:
```typescript
export type NodeProps = ComponentProps<typeof Card> & {
  handles: {
    target: boolean;
    source: boolean;
  };
};
```

**Dependencies**:
- `@xyflow/react` (Handle, Position)
- `@/components/ui/card`

**Exported Components**:
- `Node` - Card-based node container
- `NodeHeader` - Header with background
- `NodeTitle` - Node title
- `NodeDescription` - Node description
- `NodeAction` - Action button
- `NodeContent` - Main content area
- `NodeFooter` - Footer section

---

#### Component: Edge

**File**: `components/ai-elements/edge.tsx`  
**Category**: Canvas  
**LOC**: ~150

**Props**:
```typescript
// Uses ReactFlow EdgeProps
```

**Dependencies**:
- `@xyflow/react` (BaseEdge, getBezierPath)

**SDK Integration**:
- Custom edge rendering with Bezier paths
- Temporary (dashed) edge for connections in progress

---

#### Component: Panel

**File**: `components/ai-elements/panel.tsx`  
**Category**: Canvas  
**LOC**: ~16

**Props**:
```typescript
type PanelProps = ComponentProps<typeof PanelPrimitive>;
```

**Dependencies**:
- `@xyflow/react` (Panel)

**SDK Integration**:
- Styled ReactFlow panel for controls/info

---

#### Component: Toolbar

**File**: `components/ai-elements/toolbar.tsx`  
**Category**: Canvas  
**LOC**: ~18

**Props**:
```typescript
type ToolbarProps = ComponentProps<typeof NodeToolbar>;
```

**Dependencies**:
- `@xyflow/react` (NodeToolbar)

**SDK Integration**:
- Node toolbar positioned at bottom

---

#### Component: Controls

**File**: `components/ai-elements/controls.tsx`  
**Category**: Canvas  
**LOC**: ~19

**Props**:
```typescript
export type ControlsProps = ComponentProps<typeof ControlsPrimitive>;
```

**Dependencies**:
- `@xyflow/react` (Controls)

**SDK Integration**:
- Zoom/pan controls for canvas

---

#### Component: Connection

**File**: `components/ai-elements/connection.tsx`  
**Category**: Canvas  
**LOC**: ~27

**Props**:
```typescript
// ConnectionLineComponent type from ReactFlow
```

**Dependencies**:
- `@xyflow/react` (ConnectionLineComponent)

**SDK Integration**:
- Custom connection line during edge creation

---

### Category: Input & Prompt

#### Component: PromptInput

**File**: `components/ai-elements/prompt-input.tsx`  
**Category**: Input  
**LOC**: ~1450

**Props**:
```typescript
export type AttachmentsContext = {
  files: (FileUIPart & { id: string })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
};

export type TextInputContext = {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
};
```

**Dependencies**:
- `ai` (ChatStatus, FileUIPart)
- `@/components/ui/button`
- `@/components/ui/command`
- `@/components/ui/dropdown-menu`
- `@/components/ui/hover-card`
- `@/components/ui/input-group`
- `@/components/ui/select`

**SDK Integration**:
- Complete prompt input system with attachments
- Voice input support (microphone)
- Command menu for actions
- File upload with drag-and-drop
- Model selection integration

**Exported Components**:
- `PromptInputController` - Context provider
- `PromptInputRoot` - Form container
- `PromptInputTextarea` - Auto-resizing textarea
- `PromptInputActions` - Action buttons
- `PromptInputAttachments` - File previews
- `PromptInputVoice` - Voice input button
- `PromptInputSubmit` - Submit button
- `PromptInputStop` - Stop generation button
- `PromptInputModelSelect` - Model selector
- `PromptInputCommandMenu` - Command palette

---

#### Component: Suggestion

**File**: `components/ai-elements/suggestion.tsx`  
**Category**: Input  
**LOC**: ~58

**Props**:
```typescript
export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};
```

**Dependencies**:
- `@/components/ui/button`
- `@/components/ui/scroll-area`

**SDK Integration**:
- Horizontal scrolling suggestion chips
- Click handler passes suggestion text

**Usage Example**:
```tsx
<Suggestions>
  {suggestions.map(s => (
    <Suggestion 
      key={s} 
      suggestion={s} 
      onClick={handleSuggestionClick}
    />
  ))}
</Suggestions>
```

---

### Category: Display UI

#### Component: Artifact

**File**: `components/ai-elements/artifact.tsx`  
**Category**: UI  
**LOC**: ~148

**Props**:
```typescript
export type ArtifactProps = HTMLAttributes<HTMLDivElement>;
export type ArtifactActionProps = ComponentProps<typeof Button> & {
  icon?: LucideIcon;
  tooltip?: string;
};
```

**Dependencies**:
- `@/components/ui/button`
- `@/components/ui/tooltip`

**SDK Integration**:
- Container for AI-generated artifacts (code, documents)
- Header with title and close button
- Action toolbar support

**Exported Components**:
- `Artifact` - Main container
- `ArtifactHeader` - Header bar
- `ArtifactClose` - Close button
- `ArtifactTitle` - Title text
- `ArtifactDescription` - Subtitle
- `ArtifactContent` - Main content area
- `ArtifactActions` - Action toolbar
- `ArtifactAction` - Individual action button

---

#### Component: CodeBlock

**File**: `components/ai-elements/code-block.tsx`  
**Category**: UI  
**LOC**: ~204

**Props**:
```typescript
type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: BundledLanguage;
  showLineNumbers?: boolean;
};
```

**Dependencies**:
- `shiki` (syntax highlighting)
- `dompurify` (XSS sanitization)
- `@/components/ui/button`

**SDK Integration**:
- Syntax-highlighted code display
- Light/dark theme support
- Copy to clipboard
- Line numbers (optional)
- XSS-safe HTML rendering

**Exported Components**:
- `CodeBlock` - Main container with highlighting
- `CodeBlockCopyButton` - Copy action button
- `highlightCode` - Async highlighting function

**Usage Example**:
```tsx
<CodeBlock 
  code={codeString}
  language="typescript"
  showLineNumbers={true}
>
  <CodeBlockCopyButton />
</CodeBlock>
```

---

#### Component: Checkpoint

**File**: `components/ai-elements/checkpoint.tsx`  
**Category**: UI  
**LOC**: ~68

**Props**:
```typescript
export type CheckpointProps = HTMLAttributes<HTMLDivElement>;
export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};
```

**Dependencies**:
- `@/components/ui/button`
- `@/components/ui/separator`
- `@/components/ui/tooltip`

**SDK Integration**:
- Conversation checkpoint marker
- Restore point trigger

---

#### Component: Context

**File**: `components/ai-elements/context.tsx`  
**Category**: UI  
**LOC**: ~430

**Props**:
```typescript
export type ContextProps = ComponentProps<typeof HoverCard> & {
  usedTokens: number;
  maxTokens: number;
  usage?: LanguageModelUsage;
  modelId?: ModelId;
};
```

**Dependencies**:
- `ai` (LanguageModelUsage)
- `tokenlens` (token counting)
- `@/components/ui/button`
- `@/components/ui/hover-card`
- `@/components/ui/progress`

**SDK Integration**:
- Context window usage visualization
- Token counts (input/output/reasoning)
- Circular progress indicator
- Model-specific limits

**Exported Components**:
- `Context` - Hover card container
- `ContextTrigger` - Circular usage indicator
- `ContextContent` - Detailed breakdown
- `ContextBar` - Progress bar variant
- `ContextDetails` - Token statistics

---

#### Component: Loader

**File**: `components/ai-elements/loader.tsx`  
**Category**: UI  
**LOC**: ~97

**Props**:
```typescript
type LoaderProps = HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "dots";
};
```

**Dependencies**:
- None (SVG-based)

**SDK Integration**:
- Animated loading indicator
- Multiple variants (spinner, dots)

**Exported Components**:
- `Loader` - Container with animation
- `LoaderIcon` - SVG spinner icon

---

#### Component: ModelSelector

**File**: `components/ai-elements/model-selector.tsx`  
**Category**: UI  
**LOC**: ~206

**Props**:
```typescript
export type ModelSelectorProps = ComponentProps<typeof Dialog>;
export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode;
};
```

**Dependencies**:
- `@/components/ui/command`
- `@/components/ui/dialog`

**SDK Integration**:
- Model selection dialog with search
- Grouped by provider
- Keyboard navigation

**Exported Components**:
- `ModelSelector` - Dialog container
- `ModelSelectorTrigger` - Open button
- `ModelSelectorContent` - Command palette
- `ModelSelectorInput` - Search input
- `ModelSelectorList` - Model list
- `ModelSelectorGroup` - Provider group
- `ModelSelectorItem` - Individual model
- `ModelSelectorItemIcon` - Model icon
- `ModelSelectorShortcut` - Keyboard hint

---

#### Component: Queue

**File**: `components/ai-elements/queue.tsx`  
**Category**: UI  
**LOC**: ~280

**Props**:
```typescript
export type QueueMessage = {
  id: string;
  parts: QueueMessagePart[];
};

export type QueueTodo = {
  id: string;
  title: string;
  description?: string;
  status?: "pending" | "completed";
};
```

**Dependencies**:
- `@/components/ui/button`
- `@/components/ui/collapsible`
- `@/components/ui/scroll-area`

**SDK Integration**:
- Message queue display
- Todo list with status
- Pending/completed states

**Exported Components**:
- `Queue` - Container
- `QueueHeader` - Collapsible header
- `QueueContent` - Scrollable content
- `QueueItem` - Individual item
- `QueueItemIndicator` - Status dot
- `QueueItemContent` - Item text
- `QueueMessages` - Message list
- `QueueTodos` - Todo list

---

#### Component: Task

**File**: `components/ai-elements/task.tsx`  
**Category**: UI  
**LOC**: ~92

**Props**:
```typescript
export type TaskProps = ComponentProps<typeof Collapsible>;
export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: string;
};
```

**Dependencies**:
- `@/components/ui/collapsible`

**SDK Integration**:
- Collapsible task display
- File references in tasks

**Exported Components**:
- `Task` - Collapsible container
- `TaskTrigger` - Search-style trigger
- `TaskContent` - Expandable content
- `TaskItem` - Individual task item
- `TaskItemFile` - File reference badge

---

#### Component: WebPreview

**File**: `components/ai-elements/web-preview.tsx`  
**Category**: UI  
**LOC**: ~269

**Props**:
```typescript
export type WebPreviewProps = ComponentProps<"div"> & {
  defaultUrl?: string;
  onUrlChange?: (url: string) => void;
};
```

**Dependencies**:
- `@/components/ui/button`
- `@/components/ui/collapsible`
- `@/components/ui/input`
- `@/components/ui/tooltip`

**SDK Integration**:
- Iframe web preview with URL bar
- Console log viewer
- Refresh and navigation controls

**Exported Components**:
- `WebPreview` - Main container
- `WebPreviewHeader` - URL bar and controls
- `WebPreviewFrame` - Iframe container
- `WebPreviewConsole` - Log viewer

---

#### Component: OpenInChat

**File**: `components/ai-elements/open-in-chat.tsx`  
**Category**: UI  
**LOC**: ~368

**Props**:
```typescript
// Provider-specific URL generation for chat services
```

**Dependencies**:
- `@/components/ui/button`
- `@/components/ui/dropdown-menu`

**SDK Integration**:
- Open prompts in external chat services
- Supports: GitHub, Scira, ChatGPT, Claude, Grok, Perplexity, etc.

---

### Category: Utilities

#### Component: Lazy

**File**: `components/ai-elements/lazy.tsx`  
**Category**: Utils  
**LOC**: ~116

**Exports**:
```typescript
export const LazyCodeBlock = dynamic(...);
export const LazyCodeBlockCopyButton = dynamic(...);
export const LazyCanvas = dynamic(...);
export const LazyWebPreview = dynamic(...);
export const LazyReasoning = dynamic(...);
export const LazyChainOfThought = dynamic(...);
```

**Dependencies**:
- `next/dynamic`
- `@/lib/utils/lazy` (skeletons)

**SDK Integration**:
- Pre-configured lazy-loaded versions
- Loading skeletons for heavy components
- Bundle size optimization

---

## Shared UI Components

### Location: `shared/ui/`

| Component | File | Description |
|-----------|------|-------------|
| AlertDialog | `alert-dialog.tsx` | Confirmation dialogs |
| Avatar | `avatar.tsx` | User avatars |
| Label | `label.tsx` | Form labels |
| Sheet | `sheet.tsx` | Slide-out panels |
| Sidebar | `sidebar.tsx` | Navigation sidebar |
| Skeleton | `skeleton.tsx` | Loading placeholders |
| Slider | `slider.tsx` | Range input |
| Switch | `switch.tsx` | Toggle switch |
| Toast | `toast.tsx` | Notifications |

### Location: `shared/components/`

| Component | File | Description |
|-----------|------|-------------|
| Announcer | `announcer.tsx` | Screen reader announcements |
| ConnectionStatus | `connection-status.tsx` | Network status indicator |
| EmptyState | `empty-state.tsx` | Empty content placeholder |
| ErrorFallback | `error-fallback.tsx` | Error display component |
| Icons | `icons.tsx` | Icon library exports |
| Progress | `progress.tsx` | Progress indicators |
| RetryButton | `retry-button.tsx` | Retry action button |
| Skeleton | `skeleton.tsx` | Loading skeletons |
| ThemeProvider | `theme-provider.tsx` | Dark/light theme |
| Tooltip | `tooltip.tsx` | Hover tooltips |

---

## AI Wrapper Components

### Location: `shared/components/ai/`

These wrappers extend SDK components with customizations:

| Wrapper | SDK Component | Customizations |
|---------|---------------|----------------|
| `code-block.tsx` | `ai-elements/code-block` | Custom styling, line highlighting |
| `confirmation.tsx` | `ai-elements/confirmation` | Branded buttons |
| `context.tsx` | `ai-elements/context` | Custom limits display |
| `conversation.tsx` | `ai-elements/conversation` | Custom scroll behavior |
| `image.tsx` | `ai-elements/image` | Custom loading states |
| `inline-citation.tsx` | `ai-elements/inline-citation` | Custom badge styling |
| `loader.tsx` | `ai-elements/loader` | Branded animation |
| `message.tsx` | `ai-elements/message` | Custom message styling |
| `reasoning.tsx` | `ai-elements/reasoning` | Custom duration display |
| `shimmer.tsx` | `ai-elements/shimmer` | Custom animation timing |
| `sources.tsx` | `ai-elements/sources` | Custom source display |
| `suggestion.tsx` | `ai-elements/suggestion` | Custom button styling |
| `task.tsx` | `ai-elements/task` | Custom file badges |
| `tool.tsx` | `ai-elements/tool` | Custom status badges |

### Import Pattern

```typescript
// ❌ WRONG - Never import SDK directly in features
import { CodeBlock } from '@/components/ai-elements/code-block';

// ✅ CORRECT - Always use wrapper
import { CodeBlock, Message } from '@/shared/components/ai';
```

---

## UI Primitives (shadcn/ui)

### Location: `components/ui/`

| Component | File | Base |
|-----------|------|------|
| Alert | `alert.tsx` | Radix Alert |
| Badge | `badge.tsx` | Custom |
| Button | `button.tsx` | Radix Slot |
| ButtonGroup | `button-group.tsx` | Custom |
| Card | `card.tsx` | Custom |
| Carousel | `carousel.tsx` | Embla |
| Collapsible | `collapsible.tsx` | Radix Collapsible |
| Command | `command.tsx` | cmdk |
| Dialog | `dialog.tsx` | Radix Dialog |
| DropdownMenu | `dropdown-menu.tsx` | Radix DropdownMenu |
| HoverCard | `hover-card.tsx` | Radix HoverCard |
| Input | `input.tsx` | Native |
| InputGroup | `input-group.tsx` | Custom |
| Progress | `progress.tsx` | Radix Progress |
| ScrollArea | `scroll-area.tsx` | Radix ScrollArea |
| Select | `select.tsx` | Radix Select |
| Separator | `separator.tsx` | Radix Separator |
| Skeleton | `skeleton.tsx` | Custom |
| Textarea | `textarea.tsx` | Native |
| Tooltip | `tooltip.tsx` | Radix Tooltip |

### Button Variants

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground...",
        destructive: "bg-destructive text-destructive-foreground...",
        outline: "border border-input bg-background...",
        secondary: "bg-secondary text-secondary-foreground...",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4...",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
  }
);
```

---

## Feature Components

### Feature: Chat

**Location**: `features/chat/components/`

| Component | Props Interface | Description |
|-----------|-----------------|-------------|
| `chat.tsx` | ChatProps | Main chat interface |
| `chat-container.tsx` | ChatContainerProps | Layout wrapper |
| `chat-context.tsx` | - | Chat context provider |
| `chat-error-boundary.tsx` | - | Error handling |
| `chat-greeting.tsx` | ChatGreetingProps | Welcome message |
| `chat-header.tsx` | ChatHeaderProps | Title and actions |
| `chat-input.tsx` | ChatInputProps | Input with toolbar |
| `chat-messages.tsx` | ChatMessagesProps | Message list |
| `chat-provider.tsx` | ChatProviderProps | State provider |
| `data-stream-handler.tsx` | - | Stream processing |
| `data-stream-provider.tsx` | - | Stream context |
| `markdown-renderer.tsx` | MarkdownProps | Message rendering |
| `message-editor.tsx` | MessageEditorProps | Edit message UI |
| `model-selector.tsx` | ModelSelectorProps | Model picker |
| `model-selector-compact.tsx` | - | Compact variant |
| `new-chat-button.tsx` | - | New chat action |
| `suggested-actions.tsx` | SuggestedActionsProps | Quick actions |
| `visibility-selector.tsx` | - | Public/private toggle |
| `weather.tsx` | WeatherProps | Weather tool display |

#### Subfolders

**`features/chat/components/input/`** - Input sub-components  
**`features/chat/components/message/`** - Message sub-components

---

### Feature: Artifacts

**Location**: `features/artifacts/components/`

| Component | Description |
|-----------|-------------|
| `artifact.tsx` | Main artifact viewer |
| `artifact-actions.tsx` | Action toolbar |
| `artifact-close.tsx` | Close button |
| `artifact-error.tsx` | Error display |
| `artifact-messages.tsx` | Artifact messages |
| `toolbar.tsx` | Editing toolbar |
| `version-footer.tsx` | Version history |

**`features/artifacts/components/editors/`** - Code/text editors

---

### Feature: Sidebar

**Location**: `features/sidebar/components/`

| Component | Description |
|-----------|-------------|
| `app-sidebar.tsx` | Main sidebar container |
| `sidebar-history.tsx` | Chat history list |
| `sidebar-history-item.tsx` | Individual chat item |
| `sidebar-toggle.tsx` | Collapse/expand |
| `sidebar-user-nav.tsx` | User menu |

---

### Feature: Auth

**Location**: `features/auth/components/`

| Component | Description |
|-----------|-------------|
| `auth-bootstrap.tsx` | Auth initialization |
| `auth-form.tsx` | Login/register form |
| `auth-provider.tsx` | Auth context |

---

### Feature: Documents

**Location**: `features/documents/components/`

| Component | Description |
|-----------|-------------|
| `document-preview.tsx` | Document viewer |
| `document-skeleton.tsx` | Loading state |
| `document-tool.tsx` | Document tool UI |

**`features/documents/components/renderers/`** - Document type renderers

---

### Feature: Settings

**Location**: `features/settings/components/`

| Component | Description |
|-----------|-------------|
| `settings-hydration.tsx` | SSR hydration |
| `settings-sheet.tsx` | Settings panel |

---

## Design System

### Color Tokens

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 0 0% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  --secondary: 0 0% 96.1%;
  --secondary-foreground: 0 0% 9%;
  --muted: 0 0% 96.1%;
  --muted-foreground: 0 0% 45.1%;
  --accent: 0 0% 96.1%;
  --accent-foreground: 0 0% 9%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 0 0% 89.8%;
  --input: 0 0% 89.8%;
  --ring: 0 0% 3.9%;
  --sidebar: 0 0% 98%;
}
```

### Spacing Scale

```css
/* Tailwind defaults */
--spacing-0: 0;
--spacing-1: 0.25rem;  /* 4px */
--spacing-2: 0.5rem;   /* 8px */
--spacing-3: 0.75rem;  /* 12px */
--spacing-4: 1rem;     /* 16px */
--spacing-6: 1.5rem;   /* 24px */
--spacing-8: 2rem;     /* 32px */
```

### Typography

```css
/* Font families */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', monospace;

/* Font sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
```

### Animation Patterns

```typescript
// Framer Motion presets
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export const slideUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.2 },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15 },
};
```

---

## Accessibility

### ARIA Patterns

| Pattern | Components | Implementation |
|---------|------------|----------------|
| Live Region | `Loader`, `Tool` | `aria-live="polite"` for status updates |
| Dialog | `Dialog`, `Sheet`, `AlertDialog` | Focus trap, Escape to close |
| Collapsible | `Reasoning`, `Sources`, `Tool` | `aria-expanded`, keyboard toggle |
| Menu | `DropdownMenu`, `Command` | Arrow key navigation |
| Tooltip | `Tooltip`, `MessageAction` | Delay, focus management |

### Keyboard Navigation

| Component | Keys | Action |
|-----------|------|--------|
| Command Menu | `↑↓` | Navigate items |
| Command Menu | `Enter` | Select item |
| Command Menu | `Escape` | Close |
| Collapsible | `Space/Enter` | Toggle |
| Dialog | `Escape` | Close |
| Dialog | `Tab` | Focus cycle |
| Carousel | `←→` | Navigate slides |

### Screen Reader Support

- All interactive elements have accessible labels
- Status changes announced via live regions
- Form inputs have associated labels
- Images have alt text or aria-hidden
- Loading states announced

---

## Component Summary

| Category | Count | Location |
|----------|-------|----------|
| AI Elements (SDK) | 31 | `components/ai-elements/` |
| AI Wrappers | 15 | `shared/components/ai/` |
| UI Primitives | 23 | `components/ui/` |
| Shared UI | 10 | `shared/ui/` |
| Shared Components | 11 | `shared/components/` |
| Chat Components | 23+ | `features/chat/components/` |
| Artifact Components | 7+ | `features/artifacts/components/` |
| Sidebar Components | 5 | `features/sidebar/components/` |
| Auth Components | 3 | `features/auth/components/` |
| Document Components | 4+ | `features/documents/components/` |
| Settings Components | 2 | `features/settings/components/` |

**Total**: ~130+ components

---

## Related Documents

- [architecture-v5-optimal.md](architecture-v5-optimal.md) - Architecture specification
- [SDK-SPEC.md](SDK-SPEC.md) - AI SDK integration patterns
- [API-SPEC.md](API-SPEC.md) - API route specifications
