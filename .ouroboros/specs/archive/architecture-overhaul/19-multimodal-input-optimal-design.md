# P2.6: Multimodal Input System - Optimal Architecture Design

**Status:** Proposed  
**Date:** 2024-12-17  
**Author:** Ouroboros Architect

---

## Feature/Module Purpose

Design the multimodal input system for handling file uploads, image attachments, and input composition in the chat interface.

---

## Context

### Current Implementation ([multimodal-input.tsx](components/multimodal-input.tsx))

**Component Size:** 551 lines - oversized, multiple responsibilities

**Current Features:**
- File upload via hidden input + FormData
- Attachment preview with remove capability
- Model-aware attachment disabling (reasoning models)
- localStorage persistence with debounced writes
- Concurrent upload batching (max 3)
- Embedded model selector (compact variant)

**Issues Identified:**
1. **Monolithic Component**: Input, attachments, model selector, context all in one file
2. **No Upload Progress**: Missing progress indicators for large files
3. **No Drag-and-Drop**: File selection only via button
4. **No Voice Input**: Missing speech-to-text capability
5. **Tight Coupling**: `PureMultimodalInput` has 15+ props

---

## Key Requirements

| REQ-ID | Requirement | Priority |
|--------|-------------|----------|
| REQ-MMI-001 | File uploads via button and drag-and-drop | P0 |
| REQ-MMI-002 | Upload progress indication | P1 |
| REQ-MMI-003 | Image preview with remove action | P0 |
| REQ-MMI-004 | Model-aware attachment validation | P0 |
| REQ-MMI-005 | Input persistence across page reloads | P1 |
| REQ-MMI-006 | Voice input (speech-to-text) | P2 |
| REQ-MMI-007 | Keyboard shortcuts (Ctrl+Enter submit) | P1 |

---

## Optimal Architecture Design

### 1. Component Decomposition

```
multimodal-input/
├── index.ts                    # Barrel export
├── MultimodalInput.tsx         # Container (orchestration only)
├── components/
│   ├── InputTextarea.tsx       # Text input with auto-resize
│   ├── AttachmentZone.tsx      # Drag-drop zone wrapper
│   ├── AttachmentList.tsx      # Preview grid
│   ├── AttachmentPreview.tsx   # Single preview card
│   ├── UploadProgress.tsx      # Progress bar component
│   ├── VoiceInput.tsx          # Speech-to-text button
│   └── SubmitButton.tsx        # Submit/stop toggle
├── hooks/
│   ├── useFileUpload.ts        # Upload logic + progress
│   ├── useInputPersistence.ts  # localStorage sync
│   ├── useDragDrop.ts          # DnD state management
│   └── useVoiceInput.ts        # Web Speech API
└── types.ts                    # Shared types
```

### 2. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MultimodalInput                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │ AttachmentZone  │───▶│ useFileUpload   │                │
│  │ (drag-drop)     │    │ - progress      │                │
│  └─────────────────┘    │ - abort         │                │
│                         │ - batch upload  │                │
│  ┌─────────────────┐    └────────┬────────┘                │
│  │ InputTextarea   │             │                         │
│  │ + persistence   │    ┌────────▼────────┐                │
│  └─────────────────┘    │ AttachmentList  │                │
│                         │ - previews      │                │
│  ┌─────────────────┐    │ - remove        │                │
│  │ VoiceInput      │    └─────────────────┘                │
│  │ (optional)      │                                       │
│  └─────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Upload Hook Design

```typescript
// hooks/useFileUpload.ts
interface UploadState {
  files: Map<string, {
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'complete' | 'error';
    result?: Attachment;
    error?: string;
  }>;
}

interface UseFileUploadReturn {
  upload: (files: File[]) => Promise<Attachment[]>;
  abort: (fileId: string) => void;
  abortAll: () => void;
  progress: Map<string, number>;
  isUploading: boolean;
}
```

### 4. Voice Input Integration

```typescript
// hooks/useVoiceInput.ts (P2 - future)
interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  isSupported: boolean;
}
// Uses Web Speech API (SpeechRecognition)
// Fallback: Hide button if unsupported
```

---

## Bundle Strategy

| Component | Strategy | Rationale |
|-----------|----------|-----------|
| MultimodalInput | Static import | Core chat feature |
| AttachmentZone | Static import | Always needed |
| VoiceInput | Dynamic import | Optional feature, not all browsers |
| UploadProgress | Static import | Small, always visible during upload |

**Target Bundle:** < 15KB gzipped for core, +5KB for voice input

---

## Dependencies

| Dependency | Purpose | Bundle Impact |
|------------|---------|---------------|
| `usehooks-ts` | localStorage, debounce | Tree-shakeable |
| `fast-deep-equal` | Memo comparison | ~1KB |
| Web Speech API | Voice input | Native (0KB) |

---

## Consequences

### Positive
- **POS-001**: Decomposed components enable targeted optimization
- **POS-002**: Upload progress improves UX for large files
- **POS-003**: Drag-drop reduces friction for file attachment

### Negative
- **NEG-001**: More files to maintain (mitigated by clear boundaries)
- **NEG-002**: Voice input browser support varies

---

## Implementation Notes

1. **Extract hooks first** - `useFileUpload`, `useInputPersistence` can be extracted without breaking changes
2. **Add drag-drop progressively** - Wrap existing input in `AttachmentZone`
3. **Voice input is P2** - Feature-flag behind settings toggle
4. **Keyboard shortcuts** - Handle at container level, not textarea
