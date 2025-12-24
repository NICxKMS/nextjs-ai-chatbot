# Fix Plan: MEDIUM Accessibility & Architecture Issues

**Issues**: #129, #139, #148, #171, #176 (A11y) + #68, #69, #73, #74, #75 (Arch)
**Priority**: 🟡 MEDIUM
**Total Effort**: ~4-5 hours
**Created**: 2025-12-22

---

## Summary

### Accessibility Issues

| #    | Issue                              | File                                         | Effort | Status  |
| ---- | ---------------------------------- | -------------------------------------------- | ------ | ------- |
| #129 | Hardcoded greeting (i18n)          | features/chat/components/overview.tsx        | 30m    | OPEN    |
| #139 | Missing keyboard activation        | features/chat/components/suggestions.tsx     | 20m    | CLOSED  |
| #148 | Using title instead of Tooltip     | features/chat/components/message/actions.tsx | 15m    | OPEN    |
| #171 | More options button no focus state | features/sidebar/components/chat-item.tsx    | 10m    | PARTIAL |
| #176 | Input missing autoComplete         | features/auth/components/auth-form.tsx       | 5m     | OPEN    |

### Architecture Issues

| #   | Issue                                | Location          | Effort | Status |
| --- | ------------------------------------ | ----------------- | ------ | ------ |
| #68 | Missing MessageReasoning component   | oldapp → features | 2h     | OPEN   |
| #69 | Missing TipTap Suggestions extension | oldapp → features | 1h     | OPEN   |
| #73 | Heavy library direct imports         | DataGrid ~95KB    | 30m    | OPEN   |
| #74 | No env validation                    | lib/config/       | 30m    | OPEN   |
| #75 | No correlation IDs                   | middleware/API    | 30m    | OPEN   |

---

## Priority Order

1. **P1 - Security/Critical**: #74 (env validation), #176 (autocomplete)
2. **P2 - Feature Parity**: #68, #69 (missing components)
3. **P3 - Performance**: #73 (bundle size)
4. **P4 - DX/UX**: #75, #148, #171, #129

---

## Accessibility Fixes

### Issue #129: Hardcoded Greeting

**File**: `features/chat/components/overview.tsx`
**Effort**: 30 minutes

```tsx
// Before
<h1>Welcome to the AI Chat</h1>;

// After
import { useTranslation } from "next-intl";

function Overview() {
  const t = useTranslation("chat");
  return <h1>{t("welcome")}</h1>;
}

// Add to messages/en.json:
// { "chat": { "welcome": "Welcome to the AI Chat" } }
```

---

### Issue #148: Using title Instead of Tooltip

**File**: `features/chat/components/message/actions.tsx`
**Effort**: 15 minutes

```tsx
// Before (inaccessible on touch/keyboard)
<button title="Copy message">
  <CopyIcon />
</button>;

// After
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

<Tooltip>
  <TooltipTrigger asChild>
    <button aria-label="Copy message">
      <CopyIcon />
    </button>
  </TooltipTrigger>
  <TooltipContent>Copy message</TooltipContent>
</Tooltip>;
```

---

### Issue #171: Missing Focus State

**File**: `features/sidebar/components/chat-item.tsx`
**Effort**: 10 minutes

```tsx
// Add focus-visible styles
<button
  className={cn(
    "p-2 rounded",
    "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
    "hover:bg-muted"
  )}
>
```

---

### Issue #176: Missing autoComplete

**File**: `features/auth/components/auth-form.tsx`
**Effort**: 5 minutes

```tsx
// Add autoComplete attributes
<input
  type="email"
  name="email"
  autoComplete="email"
/>
<input
  type="password"
  name="password"
  autoComplete="current-password" // or "new-password" for signup
/>
```

---

## Architecture Fixes

### Issue #68: Missing MessageReasoning Component

**Source**: `oldapp/components/elements/reasoning.tsx`
**Target**: `features/chat/components/message/reasoning.tsx`
**Effort**: 2 hours

1. Port component from oldapp
2. Update imports to new paths
3. Add to message parts renderer
4. Add tests

```tsx
// features/chat/components/message/reasoning.tsx
export function MessageReasoning({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger className="flex items-center gap-2">
        <ChevronRight className={cn("transition", isExpanded && "rotate-90")} />
        <span>Reasoning</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Markdown>{content}</Markdown>
      </CollapsibleContent>
    </Collapsible>
  );
}
```

---

### Issue #69: Missing TipTap Suggestions Extension

**Source**: `oldapp/artifacts/text/extensions/suggestions-extension.ts`
**Target**: `features/artifacts/editors/extensions/suggestions-extension.ts`
**Effort**: 1 hour

1. Port extension from oldapp
2. Update TipTap version compatibility
3. Integrate with text-editor.tsx
4. Add AI suggestion endpoint

---

### Issue #73: Heavy Library Direct Imports

**Issue**: DataGrid (~95KB) imported directly, no dynamic import
**Effort**: 30 minutes

```tsx
// Before
import { DataGrid } from "some-datagrid-lib";

// After - Dynamic import
import dynamic from "next/dynamic";

const DataGrid = dynamic(
  () => import("some-datagrid-lib").then((m) => m.DataGrid),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
);
```

---

### Issue #74: No Environment Validation

**Target**: `lib/config/env.ts`
**Effort**: 30 minutes

```typescript
// lib/config/env.ts
import { z } from "zod";

const envSchema = z.object({
  // Required
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Optional with defaults
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  USE_MOCK_AI: z.coerce.boolean().default(false),

  // AI providers (at least one required in production)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return result.data;
}

export const env = validateEnv();
```

**Usage**:

```typescript
import { env } from '@/lib/config/env';

// Type-safe, validated access
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, ...);
```

---

### Issue #75: No Correlation IDs

**Target**: `middleware.ts`, `app/api/*/route.ts`
**Effort**: 30 minutes

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  return response;
}

// lib/utils/request-context.ts
import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage<{ requestId: string }>();

export function getRequestId(): string {
  return requestContext.getStore()?.requestId || "unknown";
}

// Usage in API routes
export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id")!;

  return requestContext.run({ requestId }, async () => {
    // All logs now include requestId
    console.log(`[${getRequestId()}] Processing chat request`);
    // ...
  });
}
```

---

## Implementation Checklist

### Week 1 (Critical)

- [ ] #74 - Env validation (blocks safe deployment)
- [ ] #176 - AutoComplete (security/UX quick win)

### Week 2 (Feature Parity)

- [ ] #68 - MessageReasoning component
- [ ] #69 - Suggestions extension

### Week 3 (Polish)

- [ ] #73 - Dynamic imports for heavy libs
- [ ] #75 - Correlation IDs
- [ ] #148, #171, #129 - A11y improvements
