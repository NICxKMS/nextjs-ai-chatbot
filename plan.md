Perform a comprehensive codebase analysis with the following structure:

PHASE 1 - INVENTORY & DOCUMENTATION
- Scan the entire codebase and create a complete inventory of all features and functionality
- Document the architecture, file structure, and component hierarchy
- Identify all dependencies and their versions (Next.js 16.1.0 is already latest/current)

**Create a Master Task List:**
Generate a numbered list of all features in this format:
[ ] Feature #1: [Feature Name]
[ ] Feature #2: [Feature Name]
[ ] Feature #3: [Feature Name]
...and so on

PHASE 2 - NEXT.JS BEST PRACTICES AUDIT

**Important:** Next.js 16.1.0 is already installed (latest version), but the codebase may be using OUTDATED patterns from previous Next.js versions.

**Search Online for Next.js 16.1.0 Best Practices:**
Research and compare current implementation against modern patterns:

- **Routing patterns:** 
  - Is App Router being used correctly (vs. legacy Pages Router patterns)?
  - Are route groups, parallel routes, intercepting routes leveraged where appropriate?

- **Data fetching:** 
  - Server Components vs. Client Components usage
  - Async Server Components for data fetching
  - Server Actions for mutations
  - Modern fetch API with caching options
  - Avoiding old patterns like getServerSideProps, getStaticProps, getInitialProps

- **Rendering strategies:** 
  - Proper use of dynamic vs. static rendering
  - Streaming and Suspense implementation
  - Partial Prerendering (if applicable)

- **Metadata handling:** 
  - Metadata API usage (vs. old Head component patterns)
  - generateMetadata for dynamic metadata
  - OpenGraph and Twitter cards

- **Image optimization:** 
  - Next.js Image component with proper configuration
  - Responsive images, lazy loading, placeholder strategies

- **Performance patterns:** 
  - Proper code splitting with dynamic imports
  - Font optimization (next/font)
  - Script component usage
  - Bundle analysis and optimization

- **Caching strategies:** 
  - fetch cache options ('force-cache', 'no-store', revalidate)
  - Route segment config (dynamic, revalidate, etc.)
  - Cache tagging with revalidateTag/revalidatePath

- **Error handling:** 
  - error.js and global-error.js implementation
  - not-found.js pages
  - Proper error boundaries

- **Loading states:** 
  - loading.js files
  - Streaming with Suspense
  - Skeleton UIs

- **Middleware:** 
  - Edge middleware patterns
  - Proper matcher configuration

- **API routes:** 
  - Route Handlers (app/api) vs. old API routes pattern
  - Server Actions for form handling

**Pattern Migration Checklist:**
Identify which old patterns are still in use:
- [ ] Using Pages Router when App Router is better
- [ ] getServerSideProps/getStaticProps instead of Server Components
- [ ] Client-side data fetching that should be server-side
- [ ] Old _app.js/_document.js patterns
- [ ] Manual head management vs. Metadata API
- [ ] Improper use of 'use client' directive
- [ ] Missing Suspense boundaries
- [ ] Not leveraging streaming
- [ ] Outdated configuration in next.config.js

PHASE 3 - FEATURE-BY-FEATURE ANALYSIS WITH SUBTASK LISTS

**Analyze EACH feature individually, one at a time, in sequential order.**

For each feature, create a detailed subtask list with all analysis types:

---

## [ ] Feature #1: [Feature Name]

### Subtask List:

#### Code Quality Analysis:
- [ ] Check for redundant code or duplicate logic
- [ ] Identify unused imports, variables, or functions
- [ ] Find overly complex functions that need simplification
- [ ] Review code readability and maintainability

#### Refactoring Opportunities:
- [ ] Identify code violating DRY (Don't Repeat Yourself) principles
- [ ] Find functions/components exceeding single responsibility
- [ ] Look for opportunities for better abstraction or modularization
- [ ] Check for proper separation of concerns

#### Next.js Modern Pattern Compliance:
- [ ] Verify use of Next.js 16.1.0 best practices
- [ ] Identify outdated patterns from older Next.js versions
- [ ] Assess Server Component vs. Client Component usage
- [ ] Check if feature can leverage Server Actions
- [ ] Evaluate data fetching approach (modern vs. legacy)
- [ ] Review routing implementation (App Router patterns)
- [ ] Check metadata implementation (Metadata API vs. old Head)
- [ ] Verify caching strategy implementation
- [ ] Assess loading and error handling patterns

#### Performance Analysis:
- [ ] Identify performance bottlenecks
- [ ] Check bundle size impact
- [ ] Review lazy loading implementation
- [ ] Assess image optimization
- [ ] Check for unnecessary re-renders
- [ ] Evaluate data fetching efficiency

#### Security Analysis:
- [ ] Identify security vulnerabilities
- [ ] Check input validation
- [ ] Review authentication/authorization patterns
- [ ] Assess data sanitization
- [ ] Check for exposed sensitive data

#### Accessibility Analysis:
- [ ] Review semantic HTML usage
- [ ] Check ARIA labels and roles
- [ ] Verify keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Check color contrast and visual accessibility

#### Error Handling Analysis:
- [ ] Review error boundary implementation
- [ ] Check error.js and not-found.js usage
- [ ] Assess try-catch coverage
- [ ] Review user-facing error messages
- [ ] Check logging and monitoring

#### Testing Coverage:
- [ ] Identify missing unit tests
- [ ] Check integration test coverage
- [ ] Review E2E test scenarios
- [ ] Assess test quality and effectiveness

#### TypeScript Analysis (if applicable):
- [ ] Check for missing type definitions
- [ ] Identify 'any' types that should be specific
- [ ] Review type safety
- [ ] Check for proper interface/type usage

#### Best Practices Compliance:
- [ ] Review naming conventions
- [ ] Check code organization and file structure
- [ ] Assess comment quality and documentation
- [ ] Review consistent coding patterns
- [ ] Check for proper error messages

#### Feature-Specific Recommendations:
- [ ] List immediate critical fixes
- [ ] Document refactoring suggestions
- [ ] Note optimization opportunities
- [ ] Provide migration steps for outdated patterns

**Summary for Feature #1:**
- Total issues found: [count]
- Critical issues: [count]
- High priority: [count]
- Medium priority: [count]
- Low priority: [count]

---

## [ ] Feature #2: [Feature Name]

### Subtask List:
[Repeat the same comprehensive subtask structure as Feature #1]

---

## [ ] Feature #3: [Feature Name]

### Subtask List:
[Repeat the same comprehensive subtask structure as Feature #1]

---

Continue this pattern for ALL features identified in Phase 1.

PHASE 4 - CONSOLIDATED RECOMMENDATIONS

**Global Task List Summary:**

### Overall Statistics:
- Total features analyzed: [count]
- Total issues found across all features: [count]
- Critical issues: [count]
- High priority: [count]
- Medium priority: [count]
- Low priority: [count]

### Pattern Modernization Master Checklist:
- [ ] Migrate from Pages Router to App Router (if applicable)
- [ ] Replace getServerSideProps with Server Components
- [ ] Replace getStaticProps with Server Components
- [ ] Update to Metadata API from Head component
- [ ] Implement Server Actions for mutations
- [ ] Add proper loading.js files
- [ ] Add proper error.js files
- [ ] Implement Suspense boundaries
- [ ] Update next.config.js for Next.js 16.1.0
- [ ] Migrate to Route Handlers from old API routes
- [ ] Implement proper caching strategies
- [ ] Add streaming where beneficial

### Cross-Feature Issues (Repeated Patterns):
List issues that appear in multiple features:
- [ ] Issue #1: [Description] - Found in Features: [#1, #3, #5]
- [ ] Issue #2: [Description] - Found in Features: [#2, #4]
...

### Prioritized Action Plan:

#### CRITICAL (Do First):
- [ ] Task 1: [Description] - Affects Features: [list]
- [ ] Task 2: [Description] - Affects Features: [list]

#### HIGH PRIORITY:
- [ ] Task 1: [Description] - Affects Features: [list]
- [ ] Task 2: [Description] - Affects Features: [list]

#### MEDIUM PRIORITY:
- [ ] Task 1: [Description] - Affects Features: [list]
- [ ] Task 2: [Description] - Affects Features: [list]

#### LOW PRIORITY:
- [ ] Task 1: [Description] - Affects Features: [list]
- [ ] Task 2: [Description] - Affects Features: [list]

### Migration Roadmap:
Step-by-step guide with task dependencies:

**Phase 1: Critical Fixes (Week 1-2)**
- [ ] Step 1: [Task]
- [ ] Step 2: [Task]

**Phase 2: High Priority Modernization (Week 3-4)**
- [ ] Step 1: [Task]
- [ ] Step 2: [Task]

**Phase 3: Medium Priority Improvements (Week 5-6)**
- [ ] Step 1: [Task]
- [ ] Step 2: [Task]

**Phase 4: Low Priority Refinements (Week 7+)**
- [ ] Step 1: [Task]
- [ ] Step 2: [Task]

### Effort Estimation:
- Total estimated hours: [number]
- Critical tasks: [hours]
- High priority tasks: [hours]
- Medium priority tasks: [hours]
- Low priority tasks: [hours]