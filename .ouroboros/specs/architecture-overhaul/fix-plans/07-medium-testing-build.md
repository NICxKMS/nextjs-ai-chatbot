# Fix Plan: MEDIUM Testing & Build Issues

**Issues**: Testing (#98-103), Build (#104, #107, #109-113), Hooks (#307, #314, #316, #317, #322, #323)
**Priority**: 🟡 MEDIUM
**Total Effort**: ~6-8 hours
**Created**: 2025-12-22

---

## Summary

### Testing Issues

| #    | Issue                    | File                 | Effort | Status  |
| ---- | ------------------------ | -------------------- | ------ | ------- |
| #98  | setupMockAI never called | tests/e2e/\*.spec.ts | 30m    | OPEN    |
| #99  | No seed logic in tests   | tests/e2e/           | 45m    | OPEN    |
| #101 | Hardcoded delays         | tests/e2e/\*.spec.ts | 30m    | OPEN    |
| #102 | No action unit tests     | features/\*/actions/ | 2h     | OPEN    |
| #103 | Coverage gaps            | tests/               | 1h     | PARTIAL |

### Build/Environment Issues

| #    | Issue                                  | File                  | Effort | Status |
| ---- | -------------------------------------- | --------------------- | ------ | ------ |
| #104 | Missing maxDuration export             | app/api/chat/route.ts | 5m     | OPEN   |
| #107 | Biome rules disabled                   | biome.jsonc           | 15m    | OPEN   |
| #109 | Missing SUPABASE_SERVICE_ROLE_KEY docs | .env.example          | 10m    | OPEN   |
| #110 | Missing LOG_LEVEL in .env.example      | .env.example          | 5m     | OPEN   |
| #111 | Missing USE_MOCK_AI in .env.example    | .env.example          | 5m     | OPEN   |
| #112 | Missing TOOL_MODEL_ID, TITLE_MODEL_ID  | .env.example          | 5m     | OPEN   |
| #113 | Missing DEFAULT_CHAT_MODEL_ID          | .env.example          | 5m     | OPEN   |

### Hooks/Providers Issues

| #    | Issue                              | File                                            | Effort | Status |
| ---- | ---------------------------------- | ----------------------------------------------- | ------ | ------ |
| #307 | Double rAF without cancellation    | shared/hooks/use-scroll-to-bottom.ts            | 15m    | OPEN   |
| #314 | Zustand persist hydration mismatch | features/settings/stores/settings.ts            | 30m    | OPEN   |
| #316 | deleteChat lacks error rollback    | features/sidebar/hooks/use-optimistic-chats.tsx | 20m    | OPEN   |
| #317 | Context value not memoized         | lib/providers/artifact-provider.tsx             | 10m    | OPEN   |
| #322 | Missing MAX_OPTIMISTIC_CHATS limit | features/sidebar/hooks/use-optimistic-chats.tsx | 15m    | OPEN   |
| #323 | O(n) duplicate detection           | features/sidebar/hooks/use-optimistic-chats.tsx | 15m    | OPEN   |

---

## Testing Fixes

### Issue #98: setupMockAI Never Called

**Files**: `tests/e2e/*.spec.ts`
**Effort**: 30 minutes

```typescript
// tests/e2e/utils.ts - Already exists, needs integration
export async function setupMockAI(page: Page) {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body: 'data: {"type":"text","content":"Mock response"}\n\n',
    });
  });
}

// tests/e2e/chat.spec.ts - Add to each test
test.beforeEach(async ({ page }) => {
  await setupMockAI(page);
});
```

---

### Issue #99: No Seed Logic in Tests

**Effort**: 45 minutes

```typescript
// tests/e2e/fixtures/seed.ts
export async function seedTestData(page: Page) {
  // Create test user via API
  await page.request.post("/api/test/seed", {
    data: {
      user: { email: "test@example.com", password: "test123" },
      chats: [{ id: "test-chat-1", title: "Test Chat" }],
    },
  });
}

// tests/e2e/fixtures/cleanup.ts
export async function cleanupTestData(page: Page) {
  await page.request.delete("/api/test/cleanup");
}

// tests/e2e/chat.spec.ts
test.beforeEach(async ({ page }) => {
  await seedTestData(page);
});

test.afterEach(async ({ page }) => {
  await cleanupTestData(page);
});
```

---

### Issue #101: Hardcoded Delays

**Effort**: 30 minutes

```typescript
// Before (flaky)
await page.waitForTimeout(2000);

// After (reliable)
await page.waitForSelector('[data-testid="message-content"]', {
  state: "visible",
});

// Or with custom polling
await expect(page.locator('[data-testid="chat-input"]')).toBeEnabled({
  timeout: 10000,
});
```

---

### Issue #102: No Action Unit Tests

**Target**: `features/*/actions/`
**Effort**: 2 hours

```typescript
// tests/unit/actions/chat-actions.test.ts
import { describe, it, expect, vi } from "vitest";
import { saveChat, deleteChat } from "@/features/chat/actions";

describe("saveChat", () => {
  it("should save chat to database", async () => {
    const mockDb = vi.mocked(db);
    mockDb.insert.mockResolvedValueOnce([{ id: "chat-1" }]);

    const result = await saveChat({ title: "Test", messages: [] });

    expect(result).toEqual({ id: "chat-1" });
    expect(mockDb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Test",
      })
    );
  });

  it("should throw on database error", async () => {
    const mockDb = vi.mocked(db);
    mockDb.insert.mockRejectedValueOnce(new Error("DB error"));

    await expect(saveChat({ title: "Test", messages: [] })).rejects.toThrow(
      "DB error"
    );
  });
});
```

---

## Build/Environment Fixes

### Issue #104: Missing maxDuration Export

**File**: `app/api/chat/route.ts`
**Effort**: 5 minutes

```typescript
// Add at top of file
export const maxDuration = 60; // Vercel serverless function timeout

export async function POST(request: NextRequest) {
  // ...
}
```

---

### Issues #109-113: Missing .env.example Entries

**File**: `.env.example`
**Effort**: 30 minutes total

```bash
# .env.example additions

# ===================
# Supabase (Required)
# ===================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # #109

# ===================
# AI Configuration
# ===================
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Model IDs (optional, uses defaults if not set)
DEFAULT_CHAT_MODEL_ID=gpt-4-turbo-preview  # #113
TOOL_MODEL_ID=gpt-4-turbo-preview          # #112
TITLE_MODEL_ID=gpt-3.5-turbo              # #112

# ===================
# Development
# ===================
USE_MOCK_AI=false    # #111 - Set true for E2E tests
LOG_LEVEL=info       # #110 - debug|info|warn|error
```

---

### Issue #107: Biome Rules Disabled

**File**: `biome.jsonc`
**Effort**: 15 minutes

Add tracking comments for disabled rules:

```jsonc
{
  "linter": {
    "rules": {
      "suspicious": {
        // TODO: Enable after #221 is fixed (type assertions)
        "noExplicitAny": "off",

        // TODO: Enable after #178, #200 are fixed (empty catch)
        "noEmptyBlockStatements": "off"
      }
    }
  }
}
```

---

## Hooks/Providers Fixes

### Issue #307: Double rAF Without Cancellation

**File**: `shared/hooks/use-scroll-to-bottom.ts`
**Effort**: 15 minutes

```typescript
// Before (leaks)
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    element.scrollTo({ top: element.scrollHeight });
  });
});

// After (proper cleanup)
useEffect(() => {
  let rafId1: number;
  let rafId2: number;

  if (shouldScroll) {
    rafId1 = requestAnimationFrame(() => {
      rafId2 = requestAnimationFrame(() => {
        element.scrollTo({ top: element.scrollHeight });
      });
    });
  }

  return () => {
    cancelAnimationFrame(rafId1);
    cancelAnimationFrame(rafId2);
  };
}, [shouldScroll, element]);
```

---

### Issue #314: Zustand Persist Hydration Mismatch

**File**: `features/settings/stores/settings.ts`
**Effort**: 30 minutes

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  theme: "light" | "dark" | "system";
  _hasHydrated: boolean;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "system",
      _hasHydrated: false,
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?._hasHydrated && set({ _hasHydrated: true });
      },
    }
  )
);

// Component usage - wait for hydration
function ThemeProvider({ children }) {
  const hasHydrated = useSettingsStore((s) => s._hasHydrated);

  if (!hasHydrated) {
    return <div className="theme-skeleton" />;
  }

  return children;
}
```

---

### Issue #316: deleteChat Lacks Error Rollback

**File**: `features/sidebar/hooks/use-optimistic-chats.tsx`
**Effort**: 20 minutes

```typescript
async function deleteChat(chatId: string) {
  // Store current state for rollback
  const previousChats = chats;

  // Optimistic update
  setChats(chats.filter((c) => c.id !== chatId));

  try {
    await deleteChatAction(chatId);
  } catch (error) {
    // Rollback on error
    setChats(previousChats);
    toast.error("Failed to delete chat");
    throw error;
  }
}
```

---

### Issue #322 & #323: Optimistic Queue Improvements

**File**: `features/sidebar/hooks/use-optimistic-chats.tsx`
**Effort**: 30 minutes

```typescript
const MAX_OPTIMISTIC_CHATS = 50; // #322

// Use Set for O(1) lookup - #323
const optimisticIds = useRef(new Set<string>());

function addOptimisticChat(chat: Chat) {
  if (optimisticIds.current.has(chat.id)) {
    return; // O(1) duplicate check
  }

  if (optimisticIds.current.size >= MAX_OPTIMISTIC_CHATS) {
    // Remove oldest
    const oldest = Array.from(optimisticIds.current)[0];
    optimisticIds.current.delete(oldest);
    setChats((prev) => prev.filter((c) => c.id !== oldest));
  }

  optimisticIds.current.add(chat.id);
  setChats((prev) => [chat, ...prev]);
}
```

---

## Implementation Order

### Phase 1: Quick Fixes (1 hour)

- [ ] #104 - maxDuration (5m)
- [ ] #109-113 - .env.example (30m)
- [ ] #317 - Context memoization (10m)
- [ ] #307 - rAF cleanup (15m)

### Phase 2: Testing Infrastructure (2-3 hours)

- [ ] #98 - setupMockAI integration
- [ ] #99 - Test seeding
- [ ] #101 - Remove hardcoded delays

### Phase 3: Hooks Hardening (1.5 hours)

- [ ] #314 - Zustand hydration
- [ ] #316 - Error rollback
- [ ] #322, #323 - Queue optimization

### Phase 4: Test Coverage (2 hours)

- [ ] #102 - Action unit tests
- [ ] #103 - Coverage gaps
