# Phase 21: Security Issues

## Summary

| Total Issues | P1  | P2  | P3  | P4  | Hours |
| ------------ | --- | --- | --- | --- | ----- |
| 4            | 0   | 1   | 3   | 0   | 3h    |

---

### ISSUE-P21-001: DOMPurify SSR Fallback Missing

**File**: `components/ai-elements/markdown.tsx`
**Severity**: P3 (Medium)
**Category**: Security - XSS
**Hours**: 1h

**Problem**: DOMPurify only runs client-side. During SSR, unsanitized HTML may be rendered initially.

**Code**:

```tsx
// biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized with DOMPurify
dangerouslySetInnerHTML={{ __html: html }}
```

**Fix**:

```tsx
// Option 1: Render placeholder during SSR
const [sanitizedHtml, setSanitizedHtml] = useState<string | null>(null);

useEffect(() => {
  setSanitizedHtml(DOMPurify.sanitize(html));
}, [html]);

if (!sanitizedHtml) return <MarkdownSkeleton />;

// Option 2: Use isomorphic DOMPurify
import createDOMPurify from "isomorphic-dompurify";
const DOMPurify = createDOMPurify();
```

---

### ISSUE-P21-002: CSRF Protection Documentation Missing

**File**: `docs/API.md`
**Severity**: P3 (Medium)
**Category**: Security - Documentation
**Hours**: 0.5h

**Problem**: API documentation doesn't document CSRF protection strategy.

**Fix**: Add CSRF section to API.md:

```markdown
## CSRF Protection

This application uses multiple CSRF protection mechanisms:

1. **SameSite Cookies**: All session cookies use `SameSite=Lax` or `Strict`
2. **Origin Verification**: Middleware validates Origin header for mutations
3. **Token Validation**: State-changing endpoints require valid session

### Protected Endpoints

All POST/PUT/DELETE endpoints require authentication and verify cookie origin.
```

---

### ISSUE-P21-003: Timing-Safe Comparison Audit Needed

**File**: Multiple auth files
**Severity**: P3 (Medium)
**Category**: Security - Timing Attacks
**Hours**: 1h

**Problem**: Have timing-safe utilities but need audit to ensure all sensitive comparisons use them.

**Code**:

```typescript
// lib/utils/timing-safe.ts exists but usage may not be universal
import { timingSafeEqual } from "crypto";
```

**Fix**: Audit all auth flows for:

- Token comparison
- API key validation
- Session ID checks

Replace any direct `===` with `timingSafeEqual` for secrets.

---

### ISSUE-P21-004: Database URL Non-Null Assertion

**File**: `lib/db/client.ts#L49`
**Severity**: P2 (High)
**Category**: Security - Configuration
**Hours**: 0.5h

**Problem**: Using non-null assertion without pre-validation at module load.

**Code**:

```typescript
const client = postgres(process.env.DATABASE_URL!, getPoolConfig());
```

**Fix**:

```typescript
// lib/config/env.ts
import { z } from "zod";

const dbEnvSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgres"),
});

export const dbEnv = dbEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});

// lib/db/client.ts
import { dbEnv } from "@/lib/config/env";
const client = postgres(dbEnv.DATABASE_URL, getPoolConfig());
```

---

## Security Checklist

- [ ] All HTML sanitization works during SSR
- [ ] CSRF protection documented
- [ ] All secret comparisons timing-safe
- [ ] Environment variables validated before use

## Security Standards

1. Never trust user input
2. Use timing-safe comparisons for secrets
3. Validate all external data with schemas
4. Document security mechanisms
