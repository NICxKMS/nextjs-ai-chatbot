# Phase 15: Complexity Metrics Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 9            | 0   | 6   | 2   | 1   | 12.5h |

---

### ISSUE-P15-001: Long Function - StreamArtifact

**File**: `lib/ai/tools/stream-artifact.ts#L50-219`
**Severity**: P2 (High)
**Category**: Function Length
**Hours**: 2h
**Lines**: 169

**Problem**: Function exceeds 50-line guideline by 3x.

**Fix**: Extract into smaller functions:

```typescript
async function streamArtifact(ctx: StreamContext) {
  const artifact = await initializeArtifact(ctx);
  const stream = await createArtifactStream(artifact, ctx);
  return finalizeArtifact(stream, ctx);
}
```

---

### ISSUE-P15-002: Long Function - StreamText

**File**: `lib/ai/tools/stream-text.ts#L30-173`
**Severity**: P2 (High)
**Category**: Function Length
**Hours**: 1.5h
**Lines**: 143

**Problem**: Large streaming function with mixed concerns.

**Fix**: Split initialization, streaming, and finalization.

---

### ISSUE-P15-003: Long Function - Chat Route

**File**: `app/api/chat/route.ts#L45-205`
**Severity**: P2 (High)
**Category**: Function Length
**Hours**: 1.5h
**Lines**: 160

**Problem**: Route handler too long with multiple responsibilities.

**Fix**: Extract into handler modules:

```typescript
export async function POST(request: Request) {
  const ctx = await createChatContext(request);
  const validated = await validateChatRequest(ctx);
  return handleChatStream(validated);
}
```

---

### ISSUE-P15-004: Long Function - useChat Hook

**File**: `features/chat/hooks/use-chat.tsx#L50-218`
**Severity**: P2 (High)
**Category**: Function Length
**Hours**: 2h
**Lines**: 168

**Problem**: Hook has too many responsibilities.

**Fix**: Extract into smaller hooks:

- `useChatMessages()` - Message state
- `useChatStream()` - Streaming logic
- `useChatActions()` - Action handlers

---

### ISSUE-P15-005: Long Function - AuthProvider

**File**: `features/auth/components/auth-provider.tsx#L60-171`
**Severity**: P2 (High)
**Category**: Function Length
**Hours**: 1.5h
**Lines**: 111

**Problem**: Provider with complex initialization logic.

**Fix**: Extract `useAuthInit()` hook for initialization.

---

### ISSUE-P15-006: Deep Nesting - AuthProvider

**File**: `features/auth/components/auth-provider.tsx#L102-135`
**Severity**: P2 (High)
**Category**: Nesting Depth
**Hours**: 1h
**Depth**: 4+ levels

**Problem**: Deeply nested try/if/try/if blocks.

**Code**:

```typescript
try {
    const cookieStore = await cookies();
    if (authCookie) {
        try {
            const decoded = JSON.parse(...);
            if (decoded.access_token) {
                potentialUserId = extractUserIdFromToken(...);
            }
        } catch (parseError) {
            // ...
        }
    }
```

**Fix**: Use guard clauses and early returns:

```typescript
const cookieStore = await cookies();
if (!authCookie) return defaultState;

const decoded = safeJsonParse(authCookie);
if (!decoded?.access_token) return defaultState;

const userId = extractUserIdFromToken(decoded.access_token);
return { userId, ...rest };
```

---

### ISSUE-P15-007: Deep Nesting - Middleware

**File**: `lib/middleware/auth.ts#L160-193`
**Severity**: P3 (Medium)
**Category**: Nesting Depth
**Hours**: 0.5h
**Depth**: 4 levels

**Problem**: Nested conditionals in middleware.

**Fix**: Extract validation steps into helper functions.

---

### ISSUE-P15-008: High Cyclomatic Complexity - AI Tools

**File**: `lib/ai/tools/index.ts#L80-150`
**Severity**: P2 (High)
**Category**: Cyclomatic Complexity
**Hours**: 1.5h
**Branches**: 8+

**Problem**: Many conditional branches in tool selection.

**Fix**: Use lookup table pattern:

```typescript
const toolHandlers: Record<ToolType, ToolHandler> = {
  search: handleSearch,
  createDocument: handleCreateDocument,
  // ...
};

const handler = toolHandlers[toolType];
if (!handler) throw new UnknownToolError(toolType);
return handler(args);
```

---

### ISSUE-P15-009: Moderate Complexity - Markdown Renderer

**File**: `components/ai-elements/markdown.tsx#L45-80`
**Severity**: P4 (Low)
**Category**: Cyclomatic Complexity
**Hours**: 0.5h

**Problem**: Multiple conditional renderers.

**Note**: Acceptable for markdown rendering. Mark as P4-ACCEPTED.

---

## Complexity Thresholds

| Metric         | Good | Warning | Critical |
| -------------- | ---- | ------- | -------- |
| Function Lines | <50  | 50-100  | >100     |
| Nesting Depth  | ≤3   | 4       | >4       |
| Cyclomatic     | <10  | 10-15   | >15      |
| Parameters     | ≤4   | 5-6     | >6       |

## Refactoring Strategies

1. **Extract Function**: Pull out reusable logic
2. **Guard Clauses**: Early returns reduce nesting
3. **Lookup Tables**: Replace switch/if chains
4. **Decompose Conditionals**: Named boolean functions

## Validation Checklist

- [ ] All functions under 100 lines
- [ ] Nesting depth ≤3
- [ ] Cyclomatic complexity <15
- [ ] Switch statements converted to lookups
