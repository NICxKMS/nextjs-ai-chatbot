# FIX-083: Missing Security Headers

## Summary

**Issue**: The middleware (`middleware.ts`) handles rate limiting but configures zero security headers. Missing headers include: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.

**Impact**: Critical - Application vulnerable to XSS, clickjacking, MIME sniffing attacks

**Root Cause**: Security headers were never implemented - middleware only focuses on rate limiting

---

## Files to Modify

| File                                                                              | Change Type | Purpose                       |
| --------------------------------------------------------------------------------- | ----------- | ----------------------------- |
| [middleware.ts](../../../middleware.ts)                                           | MODIFY      | Add security headers          |
| [lib/middleware/security-headers.ts](../../../lib/middleware/security-headers.ts) | CREATE      | Security header configuration |
| [next.config.ts](../../../next.config.ts)                                         | MODIFY      | Add headers for static assets |

---

## Implementation Steps

### Step 1: Create Security Headers Configuration

**File**: `lib/middleware/security-headers.ts`

```typescript
/**
 * Security Headers Configuration
 *
 * Configures security headers for the application.
 * References:
 * - https://owasp.org/www-project-secure-headers/
 * - https://securityheaders.com/
 *
 * @module lib/middleware/security-headers
 */

import type { NextResponse } from "next/server";

// =============================================================================
// TYPES
// =============================================================================

export type SecurityHeadersConfig = {
  /** Enable HSTS (requires HTTPS) */
  enableHSTS: boolean;
  /** HSTS max-age in seconds (default: 1 year) */
  hstsMaxAge: number;
  /** Include subdomains in HSTS */
  hstsIncludeSubdomains: boolean;
  /** Enable HSTS preload */
  hstsPreload: boolean;
  /** Frame-ancestors for CSP (who can embed us) */
  frameAncestors: string[];
  /** Additional CSP script-src domains */
  scriptSrcDomains: string[];
  /** Additional CSP connect-src domains (API endpoints) */
  connectSrcDomains: string[];
  /** Additional CSP img-src domains */
  imgSrcDomains: string[];
  /** Additional CSP font-src domains */
  fontSrcDomains: string[];
  /** Enable unsafe-inline for styles (needed for some UI libs) */
  allowUnsafeInlineStyles: boolean;
  /** Report-only mode for CSP (doesn't block, just reports) */
  cspReportOnly: boolean;
  /** CSP report URI */
  cspReportUri?: string;
};

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

export const DEFAULT_SECURITY_CONFIG: SecurityHeadersConfig = {
  // HSTS - only in production with HTTPS
  enableHSTS: isProduction,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: false, // Enable after testing

  // Frame protection - only allow self
  frameAncestors: ["'self'"],

  // Script sources
  scriptSrcDomains: [
    // Vercel Analytics
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
  ],

  // API/WebSocket connections
  connectSrcDomains: [
    // AI providers
    "https://api.openai.com",
    "https://api.anthropic.com",
    "https://generativelanguage.googleapis.com",
    // Vercel
    "https://va.vercel-scripts.com",
    "https://vitals.vercel-insights.com",
    // Blob storage (for file uploads)
    "https://*.blob.vercel-storage.com",
  ],

  // Image sources
  imgSrcDomains: [
    "https://*.googleusercontent.com",
    "https://*.gravatar.com",
    "https://avatars.githubusercontent.com",
    "data:", // For inline images
    "blob:", // For generated images
  ],

  // Font sources
  fontSrcDomains: ["https://fonts.gstatic.com"],

  // Styles - UI libraries often need inline styles
  allowUnsafeInlineStyles: true,

  // CSP reporting
  cspReportOnly: isDevelopment, // Report-only in dev, enforce in prod
  cspReportUri: undefined, // Set to your reporting endpoint
};

// =============================================================================
// CSP BUILDER
// =============================================================================

/**
 * Build Content-Security-Policy header value
 */
export function buildCSP(config: SecurityHeadersConfig): string {
  const directives: string[] = [];

  // Default - fallback for all resource types
  directives.push("default-src 'self'");

  // Scripts
  const scriptSrc = ["'self'", ...config.scriptSrcDomains];
  // Add nonce support for inline scripts (Next.js needs this)
  // In development, allow eval for hot reload
  if (isDevelopment) {
    scriptSrc.push("'unsafe-eval'");
    scriptSrc.push("'unsafe-inline'");
  }
  directives.push(`script-src ${scriptSrc.join(" ")}`);

  // Styles
  const styleSrc = ["'self'", "https://fonts.googleapis.com"];
  if (config.allowUnsafeInlineStyles) {
    styleSrc.push("'unsafe-inline'");
  }
  directives.push(`style-src ${styleSrc.join(" ")}`);

  // Images
  const imgSrc = ["'self'", ...config.imgSrcDomains];
  directives.push(`img-src ${imgSrc.join(" ")}`);

  // Fonts
  const fontSrc = ["'self'", ...config.fontSrcDomains];
  directives.push(`font-src ${fontSrc.join(" ")}`);

  // Connections (XHR, fetch, WebSocket)
  const connectSrc = ["'self'", ...config.connectSrcDomains];
  // Allow WebSocket in development for HMR
  if (isDevelopment) {
    connectSrc.push("ws://localhost:*");
    connectSrc.push("wss://localhost:*");
  }
  directives.push(`connect-src ${connectSrc.join(" ")}`);

  // Frames - who can embed us
  directives.push(`frame-ancestors ${config.frameAncestors.join(" ")}`);

  // Frame sources - what we can embed
  directives.push("frame-src 'self'");

  // Object/embed sources - disable for security
  directives.push("object-src 'none'");

  // Base URI - prevent base tag hijacking
  directives.push("base-uri 'self'");

  // Form actions
  directives.push("form-action 'self'");

  // Upgrade insecure requests in production
  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  // Report URI if configured
  if (config.cspReportUri) {
    directives.push(`report-uri ${config.cspReportUri}`);
  }

  return directives.join("; ");
}

// =============================================================================
// HEADER APPLICATION
// =============================================================================

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = DEFAULT_SECURITY_CONFIG
): NextResponse {
  const headers = response.headers;

  // 1. Content-Security-Policy
  const csp = buildCSP(config);
  const cspHeader = config.cspReportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  headers.set(cspHeader, csp);

  // 2. Strict-Transport-Security (HSTS)
  if (config.enableHSTS) {
    let hstsValue = `max-age=${config.hstsMaxAge}`;
    if (config.hstsIncludeSubdomains) {
      hstsValue += "; includeSubDomains";
    }
    if (config.hstsPreload) {
      hstsValue += "; preload";
    }
    headers.set("Strict-Transport-Security", hstsValue);
  }

  // 3. X-Frame-Options (legacy, CSP frame-ancestors is preferred)
  // Set to DENY or SAMEORIGIN based on frameAncestors
  if (
    config.frameAncestors.length === 1 &&
    config.frameAncestors[0] === "'self'"
  ) {
    headers.set("X-Frame-Options", "SAMEORIGIN");
  } else if (
    config.frameAncestors.length === 0 ||
    config.frameAncestors.includes("'none'")
  ) {
    headers.set("X-Frame-Options", "DENY");
  }

  // 4. X-Content-Type-Options - prevent MIME sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // 5. X-XSS-Protection - legacy but still useful
  // Note: Modern browsers use CSP, but older ones need this
  headers.set("X-XSS-Protection", "1; mode=block");

  // 6. Referrer-Policy - control what's sent in Referer header
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // 7. Permissions-Policy - disable dangerous features
  headers.set(
    "Permissions-Policy",
    [
      "accelerometer=()",
      "camera=()",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", ")
  );

  // 8. X-DNS-Prefetch-Control
  headers.set("X-DNS-Prefetch-Control", "on");

  // 9. Cross-Origin-Opener-Policy
  headers.set("Cross-Origin-Opener-Policy", "same-origin");

  // 10. Cross-Origin-Resource-Policy
  headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return response;
}

/**
 * Get security headers as a plain object (for next.config.ts)
 */
export function getSecurityHeadersObject(
  config: SecurityHeadersConfig = DEFAULT_SECURITY_CONFIG
): Array<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [];

  // CSP
  const csp = buildCSP(config);
  const cspHeader = config.cspReportOnly
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";
  headers.push({ key: cspHeader, value: csp });

  // HSTS
  if (config.enableHSTS) {
    let hstsValue = `max-age=${config.hstsMaxAge}`;
    if (config.hstsIncludeSubdomains) hstsValue += "; includeSubDomains";
    if (config.hstsPreload) hstsValue += "; preload";
    headers.push({ key: "Strict-Transport-Security", value: hstsValue });
  }

  // Static headers
  headers.push({ key: "X-Frame-Options", value: "SAMEORIGIN" });
  headers.push({ key: "X-Content-Type-Options", value: "nosniff" });
  headers.push({ key: "X-XSS-Protection", value: "1; mode=block" });
  headers.push({
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  });
  headers.push({
    key: "Permissions-Policy",
    value:
      "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  });
  headers.push({ key: "X-DNS-Prefetch-Control", value: "on" });
  headers.push({ key: "Cross-Origin-Opener-Policy", value: "same-origin" });
  headers.push({ key: "Cross-Origin-Resource-Policy", value: "same-origin" });

  return headers;
}
```

### Step 2: Update Middleware to Apply Security Headers

**File**: `middleware.ts`

```typescript
/**
 * Next.js Edge Middleware
 * Ref: Edge Runtime Configuration
 *
 * Rate limiting, security headers, and request processing at the edge.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  createRateLimitMiddleware,
  type LimiterType,
} from "@/lib/middleware/rate-limit";
import { applySecurityHeaders } from "@/lib/middleware/security-headers";

// ============== RATE LIMIT CONFIGURATION ==============

const rateLimitMiddleware = createRateLimitMiddleware({
  routes: {
    "/api/auth/login": "auth",
    "/api/auth/register": "auth",
    "/api/auth/callback": "auth",
    "/api/chat": "chat",
    "/api/files/upload": "upload",
    "/api/suggestions": "search",
    "/api/document": "standard",
    "/api/vote": "standard",
    "/api/history": "standard",
  } satisfies Record<string, LimiterType>,
  defaultType: "standard",
});

// ============== MIDDLEWARE ==============

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create base response
  let response = NextResponse.next();

  // Apply security headers to ALL responses
  response = applySecurityHeaders(response);

  // Skip rate limiting for non-API routes
  if (!pathname.startsWith("/api")) {
    return response;
  }

  // Skip rate limiting for health check endpoints
  if (pathname === "/api/health" || pathname === "/api/ping") {
    return response;
  }

  // Check rate limit
  const rateLimitResult = await rateLimitMiddleware(request);
  if (rateLimitResult) {
    // Apply security headers to rate limit response too
    return applySecurityHeaders(rateLimitResult);
  }

  return response;
}

// ============== MATCHER CONFIG ==============

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
```

### Step 3: Add Headers to next.config.ts for Static Assets

**File**: `next.config.ts`

```typescript
import { getSecurityHeadersObject } from "@/lib/middleware/security-headers";

const nextConfig = {
  // ... existing config

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: getSecurityHeadersObject(),
      },
    ];
  },
};
```

---

## Security Headers Reference

| Header                       | Value                                 | Purpose                     |
| ---------------------------- | ------------------------------------- | --------------------------- |
| Content-Security-Policy      | Complex (see CSP section)             | Prevent XSS, data injection |
| Strict-Transport-Security    | `max-age=31536000; includeSubDomains` | Force HTTPS                 |
| X-Frame-Options              | `SAMEORIGIN`                          | Prevent clickjacking        |
| X-Content-Type-Options       | `nosniff`                             | Prevent MIME sniffing       |
| X-XSS-Protection             | `1; mode=block`                       | Legacy XSS protection       |
| Referrer-Policy              | `strict-origin-when-cross-origin`     | Control referrer info       |
| Permissions-Policy           | Disable camera, mic, etc.             | Disable dangerous APIs      |
| Cross-Origin-Opener-Policy   | `same-origin`                         | Isolate browsing context    |
| Cross-Origin-Resource-Policy | `same-origin`                         | Prevent cross-origin reads  |

---

## CSP Policy Design

### Script Sources (`script-src`)

```
'self'
https://va.vercel-scripts.com     (Vercel Analytics)
https://vitals.vercel-insights.com (Vercel Insights)
```

**Development only**: `'unsafe-eval'`, `'unsafe-inline'` (for HMR)

### Style Sources (`style-src`)

```
'self'
'unsafe-inline'                   (Required for Tailwind/Radix)
https://fonts.googleapis.com
```

### Connect Sources (`connect-src`)

```
'self'
https://api.openai.com            (OpenAI API)
https://api.anthropic.com         (Claude API)
https://generativelanguage.googleapis.com (Google AI)
https://*.blob.vercel-storage.com (File uploads)
```

### Image Sources (`img-src`)

```
'self'
data:                             (Inline images)
blob:                             (Generated images)
https://*.googleusercontent.com   (Google avatars)
https://avatars.githubusercontent.com (GitHub avatars)
```

---

## Environment-Specific Settings

| Setting                   | Development       | Production       |
| ------------------------- | ----------------- | ---------------- |
| HSTS                      | Disabled          | Enabled (1 year) |
| CSP Mode                  | Report-Only       | Enforce          |
| unsafe-eval               | Allowed           | Blocked          |
| WebSocket                 | localhost allowed | Blocked          |
| upgrade-insecure-requests | No                | Yes              |

---

## Tests Required

### Unit Tests

```typescript
// tests/unit/lib/middleware/security-headers.test.ts
import {
  buildCSP,
  applySecurityHeaders,
  DEFAULT_SECURITY_CONFIG,
} from "@/lib/middleware/security-headers";
import { NextResponse } from "next/server";

describe("buildCSP", () => {
  it("includes default-src self", () => {
    const csp = buildCSP(DEFAULT_SECURITY_CONFIG);
    expect(csp).toContain("default-src 'self'");
  });

  it("includes frame-ancestors", () => {
    const csp = buildCSP(DEFAULT_SECURITY_CONFIG);
    expect(csp).toContain("frame-ancestors 'self'");
  });

  it("blocks object-src", () => {
    const csp = buildCSP(DEFAULT_SECURITY_CONFIG);
    expect(csp).toContain("object-src 'none'");
  });

  it("includes configured script domains", () => {
    const config = {
      ...DEFAULT_SECURITY_CONFIG,
      scriptSrcDomains: ["https://example.com"],
    };
    const csp = buildCSP(config);
    expect(csp).toContain("https://example.com");
  });
});

describe("applySecurityHeaders", () => {
  it("sets X-Frame-Options", () => {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("sets X-Content-Type-Options", () => {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Referrer-Policy", () => {
    const response = NextResponse.next();
    applySecurityHeaders(response);
    expect(response.headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("sets HSTS in production", () => {
    const response = NextResponse.next();
    const config = { ...DEFAULT_SECURITY_CONFIG, enableHSTS: true };
    applySecurityHeaders(response, config);
    expect(response.headers.get("Strict-Transport-Security")).toContain(
      "max-age="
    );
  });
});
```

### Integration Tests

```typescript
// tests/integration/middleware/security.test.ts
describe("Security Headers Middleware", () => {
  it("applies security headers to page requests", async () => {
    const response = await fetch("/");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
  });

  it("applies security headers to API requests", async () => {
    const response = await fetch("/api/health");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("has CSP header", async () => {
    const response = await fetch("/");
    const csp =
      response.headers.get("Content-Security-Policy") ||
      response.headers.get("Content-Security-Policy-Report-Only");
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
  });
});
```

### Manual Testing Checklist

- [ ] Run https://securityheaders.com on deployed site
- [ ] Verify no console CSP violations in browser
- [ ] Test file uploads still work
- [ ] Test AI chat still works (API connections)
- [ ] Test Google/GitHub OAuth flows
- [ ] Verify HMR works in development

---

## Dependencies

| Dependency | Type | Notes                      |
| ---------- | ---- | -------------------------- |
| None       | -    | Uses built-in Next.js APIs |

---

## Effort Estimate

| Task                        | Estimate       |
| --------------------------- | -------------- |
| Create security-headers.ts  | 1 hour         |
| Update middleware.ts        | 30 min         |
| Update next.config.ts       | 15 min         |
| Write unit tests            | 1 hour         |
| Write integration tests     | 45 min         |
| Manual testing & CSP tuning | 1 hour         |
| **Total**                   | **~4.5 hours** |

---

## Rollback Plan

1. Revert middleware.ts to previous version
2. Remove security-headers.ts
3. Revert next.config.ts changes

**Risk Level**: Medium - CSP misconfiguration can break functionality

- Mitigation: Start with report-only mode, monitor for violations

---

## Post-Deployment Verification

1. **SecurityHeaders.com Scan**: Target A+ rating
2. **Browser Console**: No CSP violation errors
3. **Functional Tests**: All features work (chat, uploads, auth)
4. **CSP Reports**: Monitor for unexpected violations

---

## Future Improvements

1. **CSP Nonces**: Add nonce-based script loading for better security
2. **CSP Reporting**: Set up endpoint to collect violation reports
3. **HSTS Preload**: Submit to browser preload lists after testing
4. **Subresource Integrity**: Add SRI hashes for external scripts
