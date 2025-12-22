# Fix Plan: LOW Batch 2 - UI Components, Misc Original, Database

**Issues**: 17 LOW severity issues
**Priority**: 🟢 LOW
**Total Effort**: ~2 hours
**Created**: 2025-12-22

---

## Summary Table

| #    | Category | Issue                             | File                           | Effort | Fix                           |
| ---- | -------- | --------------------------------- | ------------------------------ | ------ | ----------------------------- |
| #137 | UI       | Sidebar width not persisted       | features/sidebar/\*            | 15m    | Add to localStorage/settings  |
| #132 | UI       | Missing skeleton loading states   | components/ui/\*               | 20m    | Add Skeleton components       |
| #133 | UI       | Inconsistent button sizes         | components/ui/button.tsx       | 10m    | Standardize size variants     |
| #143 | UI       | Missing empty state illustrations | features/\*/components/\*      | DEFER  | Future: Add SVG illustrations |
| #145 | UI       | Chat list virtualization missing  | features/sidebar/components/\* | 30m    | Add react-window              |
| #31  | Misc     | Hardcoded model list              | lib/ai/models.ts               | 15m    | Move to config/env            |
| #35  | Misc     | Missing model icons               | lib/ai/models.ts               | DEFER  | Future: Add provider icons    |
| #44  | Misc     | No keyboard shortcuts help        | features/chat/\*               | 20m    | Add shortcuts modal           |
| #45  | Misc     | Missing chat export               | features/chat/actions/\*       | 30m    | Add export to JSON/MD         |
| #46  | Misc     | No chat import                    | features/chat/actions/\*       | 30m    | Add import from JSON          |
| #47  | Misc     | Missing chat search               | features/sidebar/\*            | 30m    | Add search filter             |
| #48  | Misc     | No chat folders/tags              | features/sidebar/\*            | DEFER  | Future: Major feature         |
| #49  | Misc     | Missing chat pinning              | features/sidebar/\*            | 20m    | Add pinned chats list         |
| #251 | Database | Missing soft delete               | lib/db/schema.ts               | 15m    | Add `deletedAt` column        |
| #258 | Database | Naming inconsistency (userId)     | lib/db/schema.ts               | DEFER  | Breaking: Needs migration     |

---

## Fix Implementations

### UI Components (#132, #133, #137, #143, #145)

#### #137: Sidebar width persistence

```typescript
// features/sidebar/hooks/use-sidebar-width.ts
export function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    return saved ? parseInt(saved, 10) : 280;
  });

  const updateWidth = useCallback((newWidth: number) => {
    setWidth(newWidth);
    localStorage.setItem("sidebar-width", String(newWidth));
  }, []);

  return { width, setWidth: updateWidth };
}
```

#### #132: Skeleton loading states

```typescript
// components/ui/skeleton.tsx
export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}
```

#### #133: Button size standardization

```typescript
// components/ui/button.tsx - Ensure consistent sizes
const buttonVariants = cva("...", {
  variants: {
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
      icon: "h-10 w-10",
      "icon-sm": "h-8 w-8",
    },
  },
});
```

#### #145: Chat list virtualization

```typescript
// features/sidebar/components/chat-list.tsx
import { FixedSizeList } from "react-window";

export function ChatList({ chats }: { chats: Chat[] }) {
  return (
    <FixedSizeList
      height={600}
      width="100%"
      itemCount={chats.length}
      itemSize={48}
    >
      {({ index, style }) => (
        <div style={style}>
          <ChatListItem chat={chats[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

### Misc Original (#31, #44-49)

#### #31: Model list from config

```typescript
// lib/ai/models.ts
import { modelConfig } from "@/lib/config/models";

export const models = modelConfig.enabledModels.map((id) => ({
  id,
  ...modelConfig.modelDetails[id],
}));
```

#### #44: Keyboard shortcuts modal

```typescript
// features/chat/components/shortcuts-modal.tsx
const shortcuts = [
  { key: "⌘ + K", action: "New chat" },
  { key: "⌘ + /", action: "Toggle sidebar" },
  { key: "⌘ + Enter", action: "Send message" },
  { key: "Escape", action: "Cancel/Close" },
];
```

#### #45-46: Chat export/import

```typescript
// features/chat/actions/export-chat.ts
export async function exportChat(chatId: string, format: "json" | "md") {
  const chat = await getChatById(chatId);
  if (format === "json") {
    return JSON.stringify(chat, null, 2);
  }
  return formatChatAsMarkdown(chat);
}

// features/chat/actions/import-chat.ts
export async function importChat(data: string) {
  const parsed = JSON.parse(data);
  // Validate and create chat
  return createChatFromImport(parsed);
}
```

#### #47: Chat search

```typescript
// features/sidebar/hooks/use-chat-search.ts
export function useChatSearch(chats: Chat[]) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return chats;
    const lower = query.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.title?.toLowerCase().includes(lower) ||
        chat.messages?.some((m) => m.content?.toLowerCase().includes(lower))
    );
  }, [chats, query]);

  return { query, setQuery, filtered };
}
```

#### #49: Chat pinning

```typescript
// features/sidebar/hooks/use-pinned-chats.ts
export function usePinnedChats() {
  const [pinned, setPinned] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("pinned-chats");
    return new Set(saved ? JSON.parse(saved) : []);
  });

  const togglePin = useCallback((chatId: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      localStorage.setItem("pinned-chats", JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { pinned, togglePin };
}
```

---

### Database (#251, #258)

#### #251: Soft delete

```typescript
// lib/db/schema.ts
export const chat = pgTable("chat", {
  // ... existing columns
  deletedAt: timestamp("deleted_at"),
});

// lib/db/queries.ts
export async function softDeleteChat(chatId: string) {
  await db
    .update(chat)
    .set({ deletedAt: new Date() })
    .where(eq(chat.id, chatId));
}

export async function getActiveChats(userId: string) {
  return db
    .select()
    .from(chat)
    .where(and(eq(chat.userId, userId), isNull(chat.deletedAt)));
}
```

---

## Effort Summary

| Category  | Issues | Effort | Notes                    |
| --------- | ------ | ------ | ------------------------ |
| UI        | 5      | 75m    | #143 deferred            |
| Misc      | 8      | 115m   | #35, #48 deferred        |
| Database  | 2      | 15m    | #258 deferred (breaking) |
| **Total** | 15     | ~2h    | 4 issues deferred        |

---

## Deferred Items

| #    | Reason                       | Future Phase  |
| ---- | ---------------------------- | ------------- |
| #143 | Requires design assets       | Phase 12+     |
| #35  | Nice-to-have, needs icons    | Phase 12+     |
| #48  | Major feature (folders/tags) | Phase 12+     |
| #258 | Breaking DB change           | Major release |
