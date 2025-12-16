# App Optimization Plan: First Load & Hydration Issues

## Application Context

- **Framework**: Next.js 16 (Latest - App Router)
- **Hosting**: Vercel Edge Network with Fluid Compute
- **Architecture**: Edge-first with dynamic server components
- **Note**: Next.js 16 is very new - many patterns and best practices are still emerging

## Objective

Conduct a **comprehensive audit** of the entire application to identify ALL performance, SSR, and hydration issues . Document optimal solutions for every issue found, with special focus on optimal execution location (Edge Middleware vs Server vs Client). **DO NOT implement any changes** - only provide verified, optimal solutions with progress tracking. Ensure User Experience is prioritized.

## Progress Tracking Format

Use this format to track your progress:

```
[STATUS] Category Name
- [ ] Issue 1: Description
- [ ] Issue 2: Description
- [x] Issue 3: Description (COMPLETED)
```

Status indicators:

- `[ANALYZING]` - Currently investigating
- `[SOLUTIONS_FOUND]` - Solutions identified, pending verification
- `[VERIFIED]` - Solutions verified and documented
- `[COMPLETED]` - Fully documented with optimal solution

---

## Phase 1: Comprehensive Issue Discovery

### 1. Hydration & SSR Issues

#### 1.0 Server-Side Device Detection (CRITICAL)

**Search for**:

- Mobile detection done on CLIENT (window.innerWidth, navigator.userAgent)
- Responsive state managed in localStorage
- useEffect hooks for detecting mobile/tablet/desktop
- CSS-only responsive without server awareness
- Layout components that shift based on screen size client-side

**OPTIMAL SOLUTION**:

- Detect mobile on the SERVER using User-Agent headers
- Pass device type into layout state from server/middleware
- Prevent hydration mismatch from client-side detection
- Use Edge Middleware for ultra-low latency detection

**Check for**:

```typescript
// ❌ BAD - Client-side detection causing hydration issues
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  setIsMobile(window.innerWidth < 768)
}, [])

// ❌ BAD - Reading from localStorage
const [isSidebarOpen, setIsSidebarOpen] = useState(
  localStorage.getItem('sidebar') === 'open'
)

// ✅ GOOD - Server-detected, passed as prop
// In middleware.ts or layout.tsx server component
const userAgent = headers().get('user-agent')
const isMobile = /mobile/i.test(userAgent)
<ClientComponent isMobile={isMobile} />
```

#### 1.1 Client-Server Mismatch Patterns

**Search for**:

- Any localStorage/sessionStorage usage
- `window` object access during render
- `document` object access during render
- `navigator` API usage
- Browser-only APIs (ResizeObserver, IntersectionObserver, etc.)
- Date/time rendering (timezone differences)
- Random values in render (Math.random(), UUID generation)
- Client-side routing state
- Media queries evaluated client-side
- User agent detection
- Geolocation APIs
- Canvas/WebGL rendering
- Cookies read during render

#### 1.2 Conditional Rendering Issues

**Search for**:

- Components that show/hide based on client state
- Feature flags evaluated client-side
- A/B testing logic
- Responsive components without SSR support
- Browser capability detection
- Authentication checks in render
- Permission-based rendering
- Experiment frameworks

#### 1.3 Third-Party Integration Issues

**Search for**:

- Analytics scripts (Google Analytics, Mixpanel, etc.)
- Social media widgets (Twitter, Facebook embeds)
- Chat widgets (Intercom, Drift, etc.)
- Ad networks
- Payment provider scripts (Stripe, PayPal)
- Maps (Google Maps, Mapbox)
- Video players (YouTube, Vimeo embeds)
- External widget libraries
- CDN-loaded scripts
- Pixel tracking codes

### 2. Performance & First Load Issues

#### 2.1 JavaScript Bundle Problems

**Search for**:

- Large bundle sizes (check webpack/vite analysis)
- Unused code/dependencies
- Duplicate dependencies
- Non-tree-shakeable imports
- Entire libraries imported when only part is needed
- Polyfills loaded for modern browsers
- Legacy code no longer used
- Development-only code in production
- Inline scripts in HTML
- Non-deferred/async scripts

#### 2.2 Code Splitting Issues

**Search for**:

- Routes not lazy-loaded
- Heavy components not code-split
- Libraries that should be dynamically imported
- Vendor bundles too large
- Missing dynamic imports
- All imports at top level
- Heavy dependencies in main bundle
- No route-based splitting

#### 2.3 Data Fetching Problems

**Search for**:

- Data fetching in useEffect on mount
- Waterfalls (sequential requests)
- No prefetching/preloading
- Fetch on client when should be on server
- No caching strategy
- Redundant API calls
- Missing loading states
- Blocking data requirements
- No data streaming
- Missing pagination
- Over-fetching data
- GraphQL query optimization issues

#### 2.4 Image & Media Issues

**Search for**:

- Unoptimized images (no next/image or equivalent)
- Missing width/height attributes
- Images not lazy-loaded
- No responsive images
- Missing alt text
- Animated GIFs instead of video
- No image CDN usage
- SVGs not optimized
- Icon fonts vs SVG sprites
- Background images in CSS
- High-resolution images not needed
- Missing blur placeholders

### 3. CSS & Styling Issues

#### 3.1 CSS Loading Problems

**Search for**:

- CSS blocking render
- Unused CSS in bundles
- No critical CSS extraction
- CSS-in-JS runtime overhead
- Multiple CSS files not combined
- Missing CSS minification
- @import statements (slow)
- Non-optimized Tailwind (if used)
- Inline styles everywhere
- Style flash on load

#### 3.2 Theme & Dynamic Styling

**Search for**:

- Theme switching causing re-render
- Dark mode flash of wrong theme
- CSS variables set in useEffect
- Dynamic class names
- Style recalculation triggers
- getComputedStyle calls
- FOUC (Flash of Unstyled Content)
- FOIT (Flash of Invisible Text)

#### 3.3 Font Loading Issues

**Search for**:

- Fonts blocking render
- No font-display strategy
- Web fonts not preloaded
- Multiple font weights loaded
- Custom fonts vs system fonts
- Missing font subsetting
- Variable fonts not used
- Font loading waterfalls

### 4. Layout & Rendering Issues

#### 4.1 Layout Shift Problems

**Search for**:

- Elements without dimensions
- Ads causing shifts
- Dynamic content injection
- Fonts causing reflow
- Images without aspect ratio
- Skeletons mismatched with content
- Embeds causing shifts
- Sticky headers changing size
- Modals/popups affecting layout
- Accordion animations

#### 4.2 Rendering Performance

**Search for**:

- Large lists not virtualized
- Heavy re-renders on state change
- Missing React.memo/useMemo
- Expensive calculations in render
- Deep component trees
- Context causing wide re-renders
- Props drilling causing re-renders
- Non-optimized animations
- Layout thrashing
- Forced synchronous layouts

#### 4.3 Paint & Composite Issues

**Search for**:

- Expensive CSS properties (box-shadow, filters)
- Will-change overuse
- Transform/opacity not on composite layers
- Animations not GPU-accelerated
- SVG animation performance
- Canvas rendering issues
- Too many layers promoted

### 5. State Management Issues

#### 5.1 Initial State Problems

**Search for**:

- State initialized from localStorage
- State from cookies
- State from URL params
- Default state mismatch server/client
- Redux/Zustand hydration issues
- State persistence libraries
- Form state restoration
- Query params affecting render

#### 5.2 State Update Patterns

**Search for**:

- Batching issues
- useEffect dependency arrays
- Infinite loops
- Stale closures
- Race conditions
- Missing cleanup functions
- Memory leaks
- Event listener management

### 6. Framework-Specific Issues

#### 6.1 Next.js 16 & Vercel Edge Optimization

**CRITICAL: Next.js 16 is VERY NEW - Search for Emerging Patterns**

Since Next.js 16 is cutting-edge, you must:

1. **Search for Next.js 16 documentation** on latest best practices
2. **Check Vercel's blog/docs** for Next.js 16 specific guidance
3. **Look for breaking changes** from Next.js 15 → 16
4. **Identify new features** that should be adopted
5. **Find deprecated patterns** that need updating

**Areas to investigate with web search**:

- "Next.js 16 performance best practices"
- "Next.js 16 breaking changes"
- "Next.js 16 new features"
- "Next.js 16 App Router optimizations"
- "Next.js 16 caching changes"
- "Next.js 16 middleware updates"
- "Next.js 16 Server Components improvements"
- "Next.js 16 Vercel deployment optimizations"

##### 6.1.0 Next.js 16 Specific Features to Search For & Implement

**MUST SEARCH AND DOCUMENT**:

**New Features to Check**:

- [ ] What's new in Next.js 16 caching behavior?
- [ ] Are there new experimental features to enable?
- [ ] New compiler optimizations available?
- [ ] Changes to fetch() caching defaults?
- [ ] New metadata API improvements?
- [ ] Server Actions enhancements?
- [ ] Streaming improvements?
- [ ] New performance APIs?
- [ ] Edge Runtime changes?
- [ ] Turbopack improvements (if stable)?
- [ ] React 19 integration optimizations?
- [ ] Partial Prerendering (PPR) status?
- [ ] After API for background tasks?

**Breaking Changes to Check**:

- [ ] Deprecated APIs still in use?
- [ ] Changed default behaviors?
- [ ] Removed features?
- [ ] Updated configuration requirements?
- [ ] Middleware API changes?
- [ ] Image optimization changes?
- [ ] Font optimization updates?

**Configuration Audit**:

```typescript
// Check next.config.js/ts for:
- Are we using latest recommended config?
- Should experimental features be enabled?
- Are there Next.js 16 specific optimizations?
- Is the compiler config optimal?
- Should we enable new experimental flags?
```

**CRITICAL: Execution Location Analysis**

Search for logic that should be moved to different execution contexts:

##### 6.1.1 Edge Middleware Candidates (Lowest Latency)

**Should be in Edge Middleware** (`middleware.ts`):

- ✅ Device detection (mobile/tablet/desktop from User-Agent)
- ✅ Geolocation-based redirects
- ✅ A/B testing flags (set cookies/headers)
- ✅ Authentication checks (token validation)
- ✅ Bot detection
- ✅ Rate limiting
- ✅ Localization/i18n routing
- ✅ Feature flags evaluation
- ✅ Simple redirects based on headers
- ✅ Cookie manipulation
- ✅ Request header modification
- ✅ Security headers injection
- ✅ URL rewrites

**Check for these being done on SERVER or CLIENT instead**:

```typescript
// ❌ BAD - Device detection in Server Component
export default async function Layout() {
  const userAgent = headers().get("user-agent");
  const isMobile = /mobile/i.test(userAgent);
  // This should be in middleware!
}

// ❌ BAD - Auth check in Server Component
export default async function ProtectedPage() {
  const session = await getSession(); // Slow on server
  if (!session) redirect("/login");
}

// ✅ GOOD - In middleware.ts
export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent");
  const isMobile = /mobile/i.test(userAgent);

  const response = NextResponse.next();
  response.headers.set("x-is-mobile", isMobile.toString());
  return response;
}
```

##### 6.1.2 Server Component Candidates

**Should be in Server Components**:

- ✅ Database queries
- ✅ API calls to backend services
- ✅ File system operations
- ✅ Heavy computations with secrets
- ✅ Data transformation/aggregation
- ✅ Markdown/MDX processing
- ✅ Image optimization metadata
- ✅ SEO data fetching
- ✅ CMS content fetching
- ✅ Authentication state hydration (after middleware)

**Check for these being done on CLIENT instead**:

```typescript
// ❌ BAD - Data fetching in Client Component
"use client";
function Posts() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch("/api/posts")
      .then((r) => r.json())
      .then(setPosts);
  }, []);
}

// ✅ GOOD - Fetching in Server Component
async function Posts() {
  const posts = await db.posts.findMany();
  return <PostList posts={posts} />;
}
```

##### 6.1.3 Client Component Candidates

**Should be in Client Components**:

- ✅ Interactive UI (clicks, hovers, form inputs)
- ✅ Browser APIs (localStorage, geolocation after mount)
- ✅ React hooks (useState, useEffect, useRef)
- ✅ Event listeners
- ✅ Animations
- ✅ Third-party client libraries
- ✅ Real-time subscriptions (WebSocket)
- ✅ Context providers with state

**Check for these being attempted in Server Components**:

```typescript
// ❌ BAD - Interactivity in Server Component
async function Button() {
  return <button onClick={() => alert("hi")}>Click</button>;
  // Error: Event handlers cannot be passed to Client Components
}

// ✅ GOOD - Client component for interactivity
("use client");
function Button() {
  return <button onClick={() => alert("hi")}>Click</button>;
}
```

##### 6.1.4 Vercel Edge Functions

**Should use Edge Functions** (vs Serverless Functions):

- ✅ Geographically distributed logic
- ✅ Low-latency requirements
- ✅ Lightweight transformations
- ✅ Edge caching manipulation
- ✅ CDN-level logic

**Should use Serverless Functions** (vs Edge):

- ✅ Heavy computations
- ✅ Large dependencies
- ✅ Long-running operations
- ✅ Database connections (connection pooling)

##### 6.1.5 Specific Next.js 16 Patterns to Check

**FIRST: Research Next.js 16 Documentation**
Before analyzing code, research and document:

1. What changed from Next.js 15 → 16?
2. What are the new recommended patterns?
3. What performance features are new?
4. Are there new APIs we should use?

**App Router Issues**:

- Server Components marked as 'use client' unnecessarily
- Client Components that could be Server Components
- Missing 'use client' where needed
- Improper data fetching patterns
- fetch() not using Next.js caching
- No revalidation strategies
- Missing loading.tsx/error.tsx boundaries
- Suspense boundaries not utilized
- Parallel routes not leveraged
- Intercepting routes misused

**Caching Issues**:

```typescript
// IMPORTANT: Next.js 16 may have different caching defaults!
// Research current best practices before recommending

// Check if these patterns are still correct in Next.js 16:
fetch(url); // What's the default cache behavior in v16?
fetch(url, { cache: "force-cache" });
fetch(url, { next: { revalidate: 3600 } });

// Are there new caching options in Next.js 16?
// Check documentation for latest cache configuration
```

**Metadata Issues**:

```typescript
// ❌ BAD - Dynamic metadata on every request
export async function generateMetadata() {
  const data = await fetch(url); // Uncached
  return { title: data.title };
}

// ✅ GOOD - Static or cached metadata
export async function generateMetadata() {
  const data = await fetch(url, { next: { revalidate: 3600 } });
  return { title: data.title };
}
```

**Server Actions Issues**:

- Server Actions defined in Client Components
- Missing revalidatePath/revalidateTag
- No error handling in Server Actions
- Server Actions that should be Edge API routes
- Heavy operations in Server Actions
- **NEW: Check Next.js 16 Server Actions enhancements**

**Streaming Issues**:

- Missing Suspense boundaries for loading states
- No streaming for slow data
- Entire page waits for all data
- No progressive enhancement
- **NEW: Check Next.js 16 streaming improvements**

**React 19 Integration** (if Next.js 16 uses it):

- Are we using React 19 features optimally?
- useOptimistic usage opportunities
- useFormStatus patterns
- Server Actions best practices with React 19
- New hooks that could improve performance

#### 6.2 Vercel-Specific Optimizations

##### 6.2.0 Next.js 16 + Vercel Platform Features

**Research and check**:

- Does Next.js 16 have new Vercel-specific optimizations?
- Are there new deployment features to leverage?
- Has edge runtime changed in Next.js 16?
- New Vercel Analytics integrations?
- Speed Insights recommendations for Next.js 16?

##### 6.2.1 Edge Config Usage

**Check if these should use Vercel Edge Config**:

- Feature flags
- A/B test configurations
- Redirect rules
- Rate limit thresholds
- API keys that change rarely

##### 6.2.2 ISR & On-Demand Revalidation

**Check for**:

- Static pages that could use ISR
- Dynamic pages that could be static
- Missing on-demand revalidation
- Cache invalidation strategies

##### 6.2.3 Image Optimization

**Check for**:

- Images not using next/image
- Missing image domains in config
- No blur placeholders
- Remote images without optimization
- Missing responsive image sizes

##### 6.2.4 Middleware Performance

**Check middleware.ts for**:

- Heavy computations (should be cached)
- External API calls (should be avoided)
- Large dependencies
- Runs on every route (should be specific)
- Missing matcher config
- Unnecessary execution

#### 6.2 React 18+ Issues

**Search for**:

- Not using Suspense boundaries
- Missing error boundaries
- No concurrent features
- useTransition not used for slow updates
- useDeferredValue opportunities missed
- Streaming not enabled
- Missing key props
- Refs used incorrectly

### 7. Network & Resource Issues

#### 7.1 Resource Loading

**Search for**:

- No resource hints (preload, prefetch, preconnect)
- Missing service worker/PWA setup
- No offline strategy
- Resources not compressed
- Missing HTTP/2 push
- No CDN usage
- Suboptimal cache headers
- Missing immutable assets
- No edge caching

#### 7.2 API & Data Issues

**Search for**:

- No API response caching
- Missing compression (gzip/brotli)
- Large JSON payloads
- No pagination
- N+1 query problems
- Missing database indexes
- Slow backend queries
- No CDN for API
- Missing rate limiting
- Timeout configurations

### 8. Build & Deployment Issues

#### 8.1 Build Configuration

**Search for**:

- Source maps in production
- Console logs in production
- Development mode artifacts
- Missing minification
- No tree shaking
- Incorrect target browsers
- Missing optimizations
- Large environment files

#### 8.2 Hosting & Infrastructure

**Search for**:

- Slow server response time (TTFB)
- No CDN configuration
- Missing edge functions
- Wrong region deployment
- No auto-scaling
- Missing monitoring
- No error tracking
- Poor load balancing

### 9. Accessibility Impact on Performance

**Search for**:

- Missing ARIA labels (screen reader delays)
- No skip links
- Focus management issues
- Keyboard navigation problems
- Missing semantic HTML (parser performance)
- Contrast issues requiring computation

### 10. Mobile-Specific Issues

**Search for**:

- No responsive images
- Viewport not configured
- Touch event handlers
- Hover states on mobile
- Large tap targets
- Missing mobile optimizations
- Orientation change handling
- Mobile network detection

---

## Phase 2: Solution Documentation Template

For each identified issue, provide:

### Issue #X: [Category] - [Issue Name]

**Location**: `path/to/file.tsx` (line numbers)
**Type**: [Hydration/Performance/Layout/Network/etc.]
**Current Execution Context**: [Edge Middleware/Server Component/Client Component/API Route]
**Optimal Execution Context**: [Where it should run]

**Current Implementation**:

```typescript
// Current problematic code
```

**Problem Description**:
[Why this causes issues - impact on performance/UX]
[Why current execution context is wrong]

**Optimal Solution**:

```typescript
// Recommended optimal code with execution context
```

**Execution Context Reasoning**:

- Why Edge Middleware / Server / Client is optimal
- Latency impact: [ms saved]
- Edge compute benefits: [if applicable]
- Server-side benefits: [if applicable]
- Client-side necessity: [if applicable]

**Why This Solution**:

- Reason 1: [Explanation]
- Reason 2: [Explanation]
- Performance gain: [Estimated]
- Trade-offs: [Any considerations]

**Alternative Solutions Considered**:

1. Solution A (Different Context): [Pros/Cons]
2. Solution B (Same Context): [Pros/Cons]
3. Why optimal solution is better

**Verification Checklist**:

- [ ] Prevents hydration mismatch
- [ ] No layout shift introduced
- [ ] Performance impact measured
- [ ] SSR compatibility confirmed
- [ ] Runs in optimal execution context
- [ ] Edge compute compatible (if middleware)
- [ ] Vercel platform optimized
- [ ] Accessibility maintained
- [ ] Mobile tested (theory)
- [ ] Cross-browser compatible

**Priority**: [CRITICAL/HIGH/MEDIUM/LOW]
**Estimated Impact**:

- FCP: [+/- ms]
- LCP: [+/- ms]
- CLS: [+/- score]
- TTFB: [+/- ms] (especially for edge moves)
- Bundle size: [+/- KB]
- Edge latency reduction: [ms]

**Dependencies**: [Issues that must be fixed first]
**Vercel Platform Features Used**: [Edge Config, ISR, Edge Functions, etc.]

---

## Phase 3: Verification Protocol

Before documenting any solution, verify:

1. **Technical Correctness**

   - Solution follows best practices
   - No new issues introduced
   - Handles edge cases
   - Error handling included

2. **Performance Impact**

   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
   - Time to Interactive (TTI)
   - Total Blocking Time (TBT)
   - Bundle size change

3. **Compatibility**

   - React version compatibility
   - Framework compatibility
   - Browser support
   - SSR/CSR works
   - TypeScript types correct

4. **Edge Cases**
   - JavaScript disabled
   - Slow network
   - Private browsing
   - Cached vs fresh load
   - Different screen sizes

---

## Execution Instructions for Agent

### Step 0A: Next.js 16 Research Phase (CRITICAL FIRST STEP)

**Before analyzing any code, research Next.js 16**:

1. **Search for Next.js 16 documentation**:

   ```
   Search: "Next.js 16 documentation"
   Search: "Next.js 16 release notes"
   Search: "Next.js 16 migration guide"
   Search: "Next.js 16 breaking changes"
   Search: "Next.js 16 new features"
   ```

2. **Document findings**:

   - What's new in Next.js 16?
   - What changed from Next.js 15?
   - What patterns are now recommended?
   - What features are deprecated?
   - What new performance optimizations exist?

3. **Create Next.js 16 checklist**:

   - [ ] New features to adopt
   - [ ] Deprecated patterns to replace
   - [ ] Configuration changes needed
   - [ ] Breaking changes to handle
   - [ ] Performance optimizations available

4. **Update this document**:
   - Add specific Next.js 16 patterns found
   - Add new anti-patterns discovered
   - Update recommended solutions based on v16 docs

### Step 0B: Execution Context Audit

1. **Map all logic to current execution context**:

   - List everything in middleware.ts
   - List all Server Components
   - List all Client Components
   - List all API routes
   - List all Server Actions

2. **Evaluate optimal execution location** for each:

   - Should it be in Edge Middleware? (lowest latency)
   - Should it be in Server Component? (server-side benefits)
   - Should it be in Client Component? (interactivity required)
   - Should it use Vercel platform features?

3. **Create execution context migration plan**:

   - Client → Server moves
   - Server → Edge moves
   - Edge → Server moves (if too heavy)
   - Document latency impact of each move

4. **Special focus on**:
   - Device detection (MUST be server-side, ideally edge)
   - Layout state hydration
   - Authentication flows
   - Feature flags
   - A/B testing

### Step 1: Automated Scans

1. Run bundle analyzer
2. Check browser DevTools Lighthouse
3. Scan for console warnings/errors
4. Review Network tab patterns
5. Check React DevTools profiler
6. Analyze Coverage tab
7. **Check for Next.js 16 specific warnings**
8. **Review Vercel deployment logs for Next.js 16 hints**
9. **Document all findings**

### Step 2: Code Pattern Search

1. Use grep/search for all patterns listed above
2. Check each file systematically
3. Look for anti-patterns
4. Identify optimization opportunities
5. **Search for patterns that may be outdated in Next.js 16**
6. **Look for opportunities to use new Next.js 16 features**
7. **List every issue found**

### Step 3: Categorization

1. Group issues by type
2. Identify dependencies between issues
3. Assess severity and impact
4. **Update progress tracker**

### Step 4: Solution Research

1. For each issue, research 3-5 solutions
2. **Verify solutions are Next.js 16 compatible**
3. **Check if Next.js 16 has better native solutions**
4. Evaluate against verification checklist
5. Choose optimal solution
6. Document reasoning
7. **Verify solution twice**
8. **Cross-reference with Next.js 16 docs**

### Step 5: Comprehensive Report

1. Create executive summary
2. Document all issues with solutions
3. Provide implementation roadmap
4. Include metrics and estimates
5. **Final verification pass**

---

## Output Format

```markdown
# Complete Optimization Solutions Report

## Next.js 16 Research Summary

**Version Information**:

- Current Next.js version: 16.x.x
- Key changes from v15: [List]
- New features available: [List]
- Deprecated patterns: [List]
- Breaking changes: [List]

**Next.js 16 Specific Optimizations Found**:

- [List all v16-specific improvements to implement]
- [New APIs to adopt]
- [Configuration changes needed]

## Executive Summary

- Total issues found: X
- Next.js 16 specific issues: Y
- By category: [breakdown]
- By execution context:
  - Move to Edge Middleware: X issues
  - Move to Server: Y issues
  - Move to Client: Z issues
  - Stay in current context: A issues
- Critical: Y | High: Z | Medium: A | Low: B
- Estimated performance improvement: [metrics]
- Edge latency reduction: [Xms average]
- Estimated development time: [hours/days]

## Execution Context Analysis

**Current State**:

- Edge Middleware: [X operations]
- Server Components: [Y operations]
- Client Components: [Z operations]
- Misplaced operations: [N]

**Optimal State**:

- Move to Edge: [List]
- Move to Server: [List]
- Move to Client: [List]
- Expected TTFB improvement: [Xms]

## Metrics Analysis

**Current State**:

- FCP: Xms
- LCP: Yms
- CLS: Z
- TTFB: Ams
- Bundle: XKB
- Hydration warnings: N

**Expected After Fixes**:

- FCP: X-Yms (improvement: Z%)
- LCP: A-Bms (improvement: C%)
- CLS: D (improvement: E%)
- TTFB: F-Gms (improvement: H%) ← Critical for edge moves
- Bundle: IKB (reduction: J%)

## Critical Findings

### Device Detection Issue (CRITICAL)

[Detailed analysis of mobile detection and solution]

### Execution Context Mismatches

[List all logic running in wrong context]

## Progress Tracker

[Complete status of all categories]

## Issues by Category

### 0. Next.js 16 Specific Issues (PRIORITY)

[All Next.js 16 version-specific issues and opportunities]

### 1. Execution Context Issues (PRIORITY)

[All context misplacement issues with solutions]

### 2. Hydration Issues (X found)

[All hydration issues with solutions]

### 3. Performance Issues (Y found)

[All performance issues with solutions]

### 4. Layout Issues (Z found)

[All layout issues with solutions]

[Continue for all categories...]

## Implementation Roadmap

### Phase 0A: Next.js 16 Updates (Critical - Day 1)

**Research and adopt Next.js 16 features**

1. Update configuration for Next.js 16 best practices
2. Enable new experimental features if beneficial
3. Replace deprecated patterns
4. Adopt new performance APIs

### Phase 0B: Execution Context Fixes (Critical - Days 1-2)

**Must be done first - affects everything else**

1. Move device detection to middleware
2. Fix layout state hydration
3. Move auth checks to middleware
4. [Other context moves]

### Phase 1: Critical Hydration Fixes (Days 3-4)

1. [Issue priority order]
2. [Dependencies noted]
3. [Estimated time]

### Phase 2: High Priority (Week 2)

[Continue...]

### Phase 3: Medium Priority (Week 3-4)

[Continue...]

### Phase 4: Low Priority (Backlog)

[Continue...]

## Vercel Platform Utilization

**Currently Using**:

- [List current Vercel features]

**Should Use**:

- Edge Config for [X]
- ISR for [Y]
- Edge Functions for [Z]
- Image Optimization for [A]

**Next.js 16 + Vercel Integration**:

- [New Vercel features for Next.js 16]
- [Platform-specific optimizations]

## Next.js 16 Adoption Checklist

- [ ] Configuration updated for v16
- [ ] New features evaluated and adopted
- [ ] Deprecated patterns replaced
- [ ] Breaking changes handled
- [ ] Performance benchmarks show improvement

## Verification Summary

[Summary of all solution verifications]

## Additional Recommendations

[Any systemic improvements or tooling suggestions]

## Resources Used

- Next.js 16 Documentation: [links]
- Vercel Documentation: [links]
- Community discussions: [links]
- Blog posts referenced: [links]
```

---

## Important Reminders

⚠️ **RESEARCH NEXT.JS 16 FIRST** - Before analyzing code, understand what's new in v16
⚠️ **CAST A WIDE NET** - Search for ALL types of issues, not just localStorage
⚠️ **BE THOROUGH** - Check every file, every pattern, every category
⚠️ **VERIFY V16 COMPATIBILITY** - Ensure solutions work with Next.js 16
⚠️ **DO NOT IMPLEMENT** - Only document solutions
⚠️ **DO NOT DEGRADE USER EXPERIENCE** - Maintain or improve UX
⚠️ **FOCUS ON EXECUTION CONTEXT** - Optimize where code runs (Edge/Server/Client)
✅ **VERIFY TWICE** - Check every solution before documenting
📊 **TRACK EVERYTHING** - Update progress continuously
📝 **EXPLAIN WHY** - Document reasoning for optimal solution
🔍 **LOOK BEYOND OBVIOUS** - Find subtle performance issues too
🆕 **ADOPT NEW FEATURES** - Leverage Next.js 16 improvements

---

## Success Criteria

- [ ] Next.js 16 documentation researched and summarized
- [ ] Next.js 16 specific features identified and documented
- [ ] All 10+ major categories investigated
- [ ] Every file in codebase reviewed
- [ ] All patterns from checklist searched
- [ ] Bundle analysis completed
- [ ] Performance metrics baseline established
- [ ] All issues categorized and prioritized
- [ ] Optimal solutions verified for each issue (v16 compatible)
- [ ] Implementation roadmap created
- [ ] Zero solutions implemented (only documented)
- [ ] Progress tracked throughout
- [ ] All solutions verified against Next.js 16 best practices

---
