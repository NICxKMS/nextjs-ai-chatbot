# 23-Types-System-Optimal-Design

> **Module**: P3.4 - TypeScript Types Organization  
> **Priority**: MEDIUM  
> **Status**: DESIGN COMPLETE  
> **Author**: Ouroboros Architect  
> **Date**: 2024-12-17

---

## 1. Purpose

**Business Capability**: Type safety, developer experience, and runtime validation across the application.

The types system provides:
- **Compile-time safety**: Catch errors before runtime
- **Documentation**: Self-documenting interfaces
- **Validation**: Runtime schema validation with Zod
- **Inference**: Reduce boilerplate via inference

**Success Criteria**:
- Zero `any` types in application code
- Single source of truth per domain type
- <2KB types-only bundle overhead
- 100% coverage of API contracts

---

## 2. Key Requirements

### 2.1 Current State Analysis

| Location | Types | Issues |
|----------|-------|--------|
| `lib/types.ts` | Chat, Message, UI types | Growing monolith (105 lines) |
| `lib/types/message-parts.ts` | Message part union | Comprehensive but isolated |
| `lib/db/schema.ts` | Drizzle schema types | Inferred from schema |
| `components/*.tsx` | Inline prop types | Duplicated across files |
| `lib/ai/tools/*.ts` | Tool schemas | Zod schemas scattered |

**Problems Identified**:
1. Mixed concerns in `lib/types.ts` (UI + API + streaming)
2. Duplicated prop types (e.g., `EditorProps` variations)
3. No clear separation: domain vs utility vs UI types
4. Validation schemas not co-located with types

### 2.2 Type Categories

| Category | Purpose | Location |
|----------|---------|----------|
| **Domain Types** | Core business entities | `lib/types/domain/` |
| **API Types** | Request/response contracts | `lib/types/api/` |
| **UI Types** | Component props, state | `lib/types/ui/` |
| **Utility Types** | Helpers, inference | `lib/types/utils.ts` |
| **Validation Schemas** | Runtime validation | Co-located with types |

---

## 3. Architecture Design

### 3.1 Decision: Domain-Driven Type Organization

**ADR-023-001: Type Directory Structure**

```
lib/types/
├── index.ts              # Public API - re-exports
├── utils.ts              # Type utilities (Prettify, etc.)
│
├── domain/               # Core business types
│   ├── chat.ts           # Chat, Message, Conversation
│   ├── artifact.ts       # Document, Artifact, Version
│   ├── user.ts           # User, Session, Auth
│   └── suggestion.ts     # Suggestion, Vote
│
├── api/                  # API contract types
│   ├── streaming.ts      # SSE data parts, stream events
│   ├── requests.ts       # API request bodies
│   └── responses.ts      # API response shapes
│
├── ui/                   # Component-specific types
│   ├── message-parts.ts  # EXISTING - comprehensive
│   ├── editors.ts        # EditorProps union
│   ├── forms.ts          # Form state types
│   └── components.ts     # Shared component props
│
└── schemas/              # Zod validation schemas
    ├── chat.schema.ts    # Chat validation
    ├── message.schema.ts # Message validation
    └── api.schema.ts     # API payload validation
```

**Rejected Alternative**: Keep flat `lib/types.ts`
- Becomes unmaintainable at scale
- No clear ownership boundaries
- Difficult to tree-shake

### 3.2 Type Inference Strategy

```typescript
// schemas/chat.schema.ts
import { z } from "zod";

export const chatSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255),
  createdAt: z.date(),
  visibility: z.enum(["public", "private"]),
});

// Domain type inferred from schema
export type Chat = z.infer<typeof chatSchema>;

// Partial for updates
export type ChatUpdate = Partial<Omit<Chat, "id" | "createdAt">>;
```

### 3.3 Public API Design

```typescript
// lib/types/index.ts - Barrel exports
// Domain types
export type { Chat, ChatUpdate } from "./domain/chat";
export type { Message, MessageRow } from "./domain/message";
export type { Artifact, ArtifactKind } from "./domain/artifact";
export type { User, Session } from "./domain/user";

// UI types
export type { ChatMessage, CustomUIDataTypes } from "./ui/chat-ui";
export type { EditorProps, EditorType } from "./ui/editors";
export type { MessagePart, TextPart, FilePart } from "./ui/message-parts";

// API types
export type { StreamingDataPart, DataChatTitlePart } from "./api/streaming";

// Validation schemas
export { chatSchema, messageSchema } from "./schemas";
```

### 3.4 Utility Types

```typescript
// lib/types/utils.ts
/**
 * Makes complex types readable in IDE tooltips
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Extract non-null from union
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Make specific keys optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Strict omit that errors on non-existent keys
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

---

## 4. Bundle Strategy

### 4.1 Type-Only Imports

```typescript
// CORRECT - Type-only import (zero runtime cost)
import type { Chat, Message } from "@/lib/types";

// AVOID - Regular import pulls in runtime code
import { Chat, chatSchema } from "@/lib/types";
```

### 4.2 Schema Code Splitting

```typescript
// Schemas are runtime code - lazy load when needed
const validateChat = async (data: unknown) => {
  const { chatSchema } = await import("@/lib/types/schemas/chat.schema");
  return chatSchema.parse(data);
};
```

### 4.3 Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Type files | 3 | 12 |
| Type-only imports | ~40% | ~95% |
| Schema bundle | 15KB (always) | 15KB (lazy) |
| IDE autocomplete | Slow | Fast |

---

## 5. Dependencies

### 5.1 External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `zod` | ^3.x | Runtime validation |
| `typescript` | ^5.x | Type system |

### 5.2 Internal Dependencies

| Module | Purpose |
|--------|---------|
| `lib/db/schema` | Drizzle types (source of truth) |
| `ai` (Vercel) | `UIMessage`, `InferUITool` |
| `components/artifact` | `ArtifactKind` enum |

---

## 6. Implementation Notes

### 6.1 Migration Path

1. **Phase 1**: Create `lib/types/` directory structure
2. **Phase 2**: Move `message-parts.ts` into `lib/types/ui/`
3. **Phase 3**: Extract domain types from `lib/types.ts`
4. **Phase 4**: Create Zod schemas with inferred types
5. **Phase 5**: Update all imports project-wide
6. **Phase 6**: Delete old `lib/types.ts`

### 6.2 Import Path Updates

```typescript
// Before
import type { ChatMessage } from "@/lib/types";

// After (same path, reorganized internally)
import type { ChatMessage } from "@/lib/types";

// Or explicit path
import type { ChatMessage } from "@/lib/types/ui/chat-ui";
```

### 6.3 Co-location Rules

| Type | Co-located With |
|------|-----------------|
| Component props | Component file (inline) |
| API request/response | Route handler file |
| Domain entities | `lib/types/domain/` |
| Shared UI types | `lib/types/ui/` |

---

## 7. Trade-off Analysis

| Decision | Benefit | Cost |
|----------|---------|------|
| Domain-driven folders | Clear ownership, scalable | More files to navigate |
| Zod inference | Single source of truth | Zod as hard dependency |
| Barrel exports | Clean import paths | Potential tree-shake issues |
| Type-only imports | Zero runtime cost | Manual enforcement needed |

**Recommended**: 
- Accept folder structure complexity for maintainability
- Keep Zod for validation (already in use)
- Use `verbatimModuleSyntax` in tsconfig to enforce type imports
