# Fix Plan: LOW Batch 1 - Security, Testing, Error Handling, Build, Hooks

**Issues**: 17 LOW severity issues
**Priority**: 🟢 LOW
**Total Effort**: ~2.5 hours
**Created**: 2025-12-22

---

## Summary Table

| #    | Category | Issue                          | File                                  | Effort | Fix                                   |
| ---- | -------- | ------------------------------ | ------------------------------------- | ------ | ------------------------------------- |
| #94  | Security | Unused TURNSTILE env           | lib/auth/\*                           | 5m     | Remove or implement                   |
| #95  | Security | Missing Playwright auth state  | tests/config/playwright.config.ts     | 10m    | Add `storageState` option             |
| #96  | Security | Test login credentials exposed | tests/e2e/\*.spec.ts                  | 10m    | Move to env vars                      |
| #100 | Testing  | Test isolation issues          | tests/e2e/                            | 15m    | Add `test.describe.parallel()`        |
| #124 | Testing  | Vitest browser mock incomplete | tests/\_\_mocks\_\_/                  | 15m    | Add missing browser APIs              |
| #125 | Testing  | No visual regression tests     | tests/                                | DEFER  | Future: Add Percy/Chromatic           |
| #126 | Testing  | Missing accessibility tests    | tests/e2e/                            | 20m    | Add axe-core checks                   |
| #127 | Testing  | No load testing                | tests/                                | DEFER  | Future: Add k6/Artillery              |
| #199 | Error    | Swallowed error in saveChat    | features/chat/actions/chat-actions.ts | 5m     | Add console.error                     |
| #203 | Error    | Silent fail in processChunk    | lib/ai/stream-processor.ts            | 10m    | Add error logging                     |
| #208 | Error    | Empty catch in file handler    | features/chat/actions/\*.ts           | 5m     | Log and rethrow                       |
| #106 | Build    | Unused tsconfig paths          | tsconfig.json                         | 5m     | Remove or use                         |
| #108 | Build    | Missing .nvmrc                 | /                                     | 2m     | Add `.nvmrc` with version             |
| #117 | Build    | Old Node.js in CI matrix       | .github/workflows/\*.yml              | 5m     | Update to Node 20                     |
| #192 | Hooks    | useOptimistic stale closure    | features/chat/hooks/\*                | 15m    | Use ref pattern                       |
| #324 | Hooks    | pendingCount unbounded         | features/sidebar/hooks/use-\*.tsx     | 10m    | Add limit check                       |
| #325 | Hooks    | Missing delete confirmation    | features/sidebar/hooks/use-\*.tsx     | 15m    | WONTFIX: UX decision                  |
| #326 | Hooks    | No undo for delete             | features/sidebar/hooks/use-\*.tsx     | DEFER  | Future: Toast with undo               |
| #328 | Hooks    | Sync ID with server            | features/sidebar/hooks/use-\*.tsx     | 10m    | Replace temp ID after server response |

---

## Fix Implementations

### Security (#94-96)

#### #94: Unused TURNSTILE env

```typescript
// Option A: Remove from .env.example if not used
// Option B: Implement Turnstile validation in auth flow
// RECOMMENDATION: Remove until needed
```

#### #95: Missing Playwright auth state

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: "tests/.auth/state.json",
  },
  projects: [
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      dependencies: ["setup"],
    },
  ],
});
```

#### #96: Test credentials exposed

```typescript
// Move to .env.test
// TEST_USER_EMAIL=test@example.com
// TEST_USER_PASSWORD=test-password

// tests/e2e/auth.spec.ts
const email = process.env.TEST_USER_EMAIL!;
const password = process.env.TEST_USER_PASSWORD!;
```

---

### Testing (#100, #124-127)

#### #100: Test isolation

```typescript
// tests/e2e/chat.spec.ts
test.describe.parallel("Chat tests", () => {
  test("test 1", async ({ page }) => {
    /* ... */
  });
  test("test 2", async ({ page }) => {
    /* ... */
  });
});
```

#### #124: Browser mock incomplete

```typescript
// tests/__mocks__/browser.ts
Object.defineProperty(window, "matchMedia", {
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, "ResizeObserver", {
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});
```

#### #126: Accessibility tests

```typescript
// tests/e2e/a11y.spec.ts
import AxeBuilder from "@axe-core/playwright";

test("page has no a11y violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

---

### Error Handling (#199, #203, #208)

#### #199: Swallowed saveChat error

```diff
// features/chat/actions/chat-actions.ts
  } catch (error) {
+   console.error('[saveChat] Failed:', error);
    throw error;
  }
```

#### #203: Silent processChunk fail

```diff
// lib/ai/stream-processor.ts
  } catch (error) {
+   console.error('[processChunk] Parse error:', error);
    return null;
  }
```

#### #208: Empty catch in file handler

```diff
  } catch (error) {
+   console.error('[handleFile] Error:', error);
    throw error;
  }
```

---

### Build/Config (#106, #108, #117)

#### #108: Add .nvmrc

```bash
# .nvmrc
20.18.0
```

#### #117: Update CI Node version

```yaml
# .github/workflows/ci.yml
strategy:
  matrix:
    node-version: [20.x, 22.x]
```

---

### Hooks (#192, #324, #328)

#### #192: Stale closure fix

```typescript
// Use ref to avoid stale closure
const callbackRef = useRef(callback);
callbackRef.current = callback;

useEffect(() => {
  return () => callbackRef.current();
}, []);
```

#### #324: Bound pendingCount

```typescript
const MAX_PENDING = 10;
if (pendingCount >= MAX_PENDING) {
  throw new Error("Too many pending operations");
}
```

#### #328: Sync temp ID with server

```typescript
// After server confirms creation
setPendingChats((prev) =>
  prev.map((chat) => (chat.id === tempId ? { ...chat, id: serverId } : chat))
);
```

---

## Effort Summary

| Category  | Issues | Effort | Notes                       |
| --------- | ------ | ------ | --------------------------- |
| Security  | 3      | 25m    | All actionable              |
| Testing   | 4      | 50m    | #125, #127 deferred         |
| Error     | 3      | 20m    | Quick logging fixes         |
| Build     | 3      | 12m    | Config updates              |
| Hooks     | 5      | 50m    | #325, #326 WONTFIX/deferred |
| **Total** | 18     | ~2.5h  | -                           |
