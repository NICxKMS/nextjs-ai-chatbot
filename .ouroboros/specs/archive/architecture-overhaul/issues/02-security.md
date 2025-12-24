# 🔒 Security Issues

**Total**: 18 issues
**Critical**: 2 | **High**: 6 | **Medium**: 7 | **Low**: 3

## Summary Table

| #      | Issue                                     | Severity | File                                  | Status       | Verified                 |
| ------ | ----------------------------------------- | -------- | ------------------------------------- | ------------ | ------------------------ |
| #53    | Non-null assertion on Supabase env vars   | HIGH     | lib/auth/client.ts                    | ❌ CLOSED    | NOT CONFIRMED            |
| #56    | DATABASE_URL not validated                | HIGH     | lib/db/client.ts                      | ❌ CLOSED    | NOT CONFIRMED            |
| #64    | AUTH_SECRET validated at runtime only     | HIGH     | lib/auth/jwt.ts                       | ❌ CLOSED    | NOT CONFIRMED            |
| #76-82 | Various env/validation issues             | -        | -                                     | ❌ CLOSED    | NOT CONFIRMED            |
| #83    | Missing security headers in middleware    | CRITICAL | middleware.ts                         | ✅ CONFIRMED | CRITICAL - No headers    |
| #84    | XSS via unsanitized code highlighting     | HIGH     | components/ai-elements/code-block.tsx | ✅ CONFIRMED | HIGH - No DOMPurify      |
| #85    | Chat API allows unauthenticated access    | HIGH     | app/api/chat/route.ts                 | ✅ CONFIRMED | HIGH - Guests can chat   |
| #86    | Health endpoint exposes internal state    | HIGH     | app/api/health/route.ts               | ✅ CONFIRMED | HIGH - Exposes internals |
| #87    | Token stored without additional binding   | HIGH     | app/api/auth/exchange/route.ts        | ✅ CONFIRMED | HIGH - No binding        |
| #88    | Rate limiting fails open                  | HIGH     | lib/middleware/rate-limit.ts          | ✅ CONFIRMED | HIGH - Fails open        |
| #89    | AUTH_SECRET runtime validation            | MEDIUM   | lib/auth/jwt.ts                       | ✅ CONFIRMED | MEDIUM                   |
| #90    | Open redirect protection incomplete       | MEDIUM   | lib/auth/guards.ts                    | ❌ CLOSED    | NOT CONFIRMED            |
| #91    | Server Actions lack explicit CSRF         | MEDIUM   | features/chat/actions/\*.ts           | ✅ CONFIRMED | MEDIUM                   |
| #92    | Document handler error messages leak info | MEDIUM   | lib/ai/tools/update-document.ts       | ✅ CONFIRMED | MEDIUM                   |
| #93    | AI token usage logged with user ID        | MEDIUM   | app/api/chat/route.ts                 | ❌ CLOSED    | NOT CONFIRMED            |
| #94    | JWT Cookie TTL vs token expiry mismatch   | LOW      | lib/auth/constants.ts                 | ✅ CONFIRMED | LOW                      |
| #95    | IP extraction trusts x-forwarded-for      | LOW      | lib/middleware/rate-limit.ts          | ✅ CONFIRMED | LOW                      |
| #96    | No explicit CORS configuration            | LOW      | middleware.ts                         | ✅ CONFIRMED | LOW                      |
| #197   | Quota check fails open                    | HIGH     | lib/cache-ops/quota.ts                | ✅ CONFIRMED | HIGH - Fails open        |

---

## Issue #83 - Missing Security Headers

**Severity**: 🔴 CRITICAL
**File**: middleware.ts

### Verification

- **Status**: ✅ CONFIRMED
- **Verified**: 2025-12-22
- **Evidence**: middleware.ts has zero security headers, only rate limiting. Missing: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- **Severity**: UNCHANGED (CRITICAL)

**Description**:
Middleware only handles rate limiting. Missing critical security headers:

- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing)
- Content-Security-Policy (XSS protection)
- Referrer-Policy

**Fix**:

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  // ... rest of middleware
  return response;
}
```

---

## Issue #84 - XSS via Code Highlighting

**Severity**: � HIGH (Downgraded from CRITICAL)
**File**: components/ai-elements/code-block.tsx

### Verification

- **Status**: ⚠️ ADJUSTED
- **Verified**: 2025-12-22
- **Evidence**: Shiki escapes content by default (provides some protection). Still missing DOMPurify defense-in-depth.
- **Severity**: DOWNGRADED from CRITICAL to HIGH (Shiki provides base protection)

**Description**:
Uses `dangerouslySetInnerHTML` with Shiki-highlighted code without sanitization.

**Evidence**:

```tsx
// biome-ignore lint/security/noDangerouslySetInnerHtml: "this is needed."
dangerouslySetInnerHTML={{ __html: html }}
```

**Fix**:

```typescript
import DOMPurify from "dompurify";

const sanitizedHtml = DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ["pre", "code", "span"],
  ALLOWED_ATTR: ["class", "style"],
});
```

---

## Issue #85 - Unauthenticated Chat API

**Severity**: 🟠 HIGH
**File**: app/api/chat/route.ts

**Description**:
Chat endpoint allows requests without authentication, enabling AI API abuse.

**Fix**:

```typescript
const session = await getSession();
if (!session) {
  return Response.json({ error: "Session required" }, { status: 401 });
}
```

---

## Issue #88 - Rate Limiting Fails Open

**Severity**: 🟠 HIGH
**File**: lib/middleware/rate-limit.ts

**Description**:
When Redis is unavailable, rate limiting is bypassed:

```typescript
const { failOpen = true } = config;
if (failOpen) {
  console.warn("[RateLimit] Failing open");
  return null; // Rate limit bypassed!
}
```

**Fix**:
Set `failOpen: false` for critical endpoints (auth, AI).

---

## Issue #197 - Quota Fails Open

**Severity**: 🟠 HIGH
**File**: lib/cache-ops/quota.ts

**Description**:

```typescript
if (!redis) {
  return { allowed: true, count: 0, limit }; // Bypasses quota!
}
```

**Impact**: DOS protection disabled when Redis unavailable.

---

## OWASP Alignment

| OWASP Category                | Issues        |
| ----------------------------- | ------------- |
| A01 Access Control            | #85, #90, #91 |
| A02 Cryptographic Failures    | #64, #89      |
| A03 Injection (XSS)           | #84           |
| A04 Insecure Design           | #88, #197     |
| A05 Security Misconfiguration | #83, #96      |
| A07 Auth Failures             | #53, #56, #87 |
| A09 Logging Failures          | #86, #92, #93 |
