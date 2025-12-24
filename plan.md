## Mission

Perform a multi-agent, multi-wave analysis of the entire codebase to identify and document critical optimization opportunities affecting performance, load times, and user experience, with specific focus on Next.js 16.1.0 modern features.

---

## Phase 0: Research & Discovery (CRITICAL FIRST STEP)

### Agent: `ouroboros-researcher`

**Objective**: Research Next.js 16.1.0 and React 19 latest features relevant to our project

**Tasks**:

1. Research Next.js 16.1.0 official documentation and release notes
2. Identify all new features, APIs, and optimization patterns
3. Research React 19 features compatible with Next.js 16.1.0:
   - React Server Components updates
   - Server Actions enhancements
   - New hooks (use, useOptimistic, useFormStatus, useActionState)
   - Async components patterns
   - Enhanced Suspense capabilities
4. Research performance optimization patterns specific to Next.js 16.1.0:
   - Partial Prerendering (PPR) implementation
   - Advanced caching strategies (fetch cache, route cache, full route cache)
   - Streaming and Suspense improvements
   - Server Actions best practices
   - Image optimization updates
   - Font optimization strategies
   - Metadata API enhancements
5. Identify deprecated patterns we should migrate away from
6. Compile case studies and real-world implementation examples
7. Document breaking changes from previous versions

**Deliverable**:

- Comprehensive research document: "Next.js 16.1.0 & React 19 Feature Matrix for [Project Name]"
- Compatibility checklist
- Migration risk assessment
- Feature adoption roadmap

**Output Format**:

```markdown
# Next.js 16.1.0 Research Report

## New Features Available
- Feature name: [Description, Use case, Implementation example]

## Optimization Opportunities
- Pattern: [What it optimizes, How to implement]

## Deprecated Patterns in Our Codebase
- Old pattern → New pattern

## Recommended Adoption Priority
1. High Priority: [Features with immediate impact]
2. Medium Priority: [Important but non-critical]
3. Low Priority: [Nice-to-haves]
```

---

## Phase 1: Requirements & Scope Definition

### Agent: `ouroboros-requirements`

**Objective**: Define EARS requirements for optimization project

**Tasks**:

1. Create EARS format requirements based on research findings
2. Define success criteria and acceptance tests
3. Identify constraints and dependencies
4. Document performance benchmarks and targets
5. Specify compatibility requirements

**Deliverable**: EARS Requirements Document

**Example Requirements**:

```
WHEN the application loads on a 4G connection
THE system SHALL achieve First Contentful Paint within 1.5 seconds
WHERE performance is measured using Lighthouse CI

IF a component does not require client-side interactivity
THEN the component SHALL be implemented as a React Server Component
TO reduce client-side JavaScript bundle size

WHILE implementing Partial Prerendering
THE system SHALL maintain backward compatibility with existing routes
UNLESS explicitly marked for migration
```

---

## Phase 2: Architecture Analysis & Planning

### Agent: `ouroboros-architect`

**Objective**: High-level architectural review and optimization strategy

**Tasks**:

1. Review overall application architecture
2. Design optimal component architecture using Next.js 16.1.0 patterns
3. Plan Server Component vs Client Component boundaries
4. Design data fetching strategy (Server Actions, Route Handlers, etc.)
5. Plan routing optimization (Parallel Routes, Intercepting Routes, Route Groups)
6. Design caching strategy across all layers
7. Create migration architecture from current state to optimal state

**Input**: Research report from ouroboros-researcher

**Deliverable**:

- Architecture optimization blueprint
- Component boundary diagram
- Data flow optimization diagram
- Migration strategy document

---

## Phase 3: Detailed Code Analysis

### Agent: `ouroboros-analyst`

**Objective**: Deep code analysis to identify specific optimization opportunities

**Tasks**:

1. Scan entire codebase structure and generate dependency graphs
2. Identify all components and classify as Server/Client/Hybrid
3. Analyze component loading patterns:
   - Sequential loading issues
   - Waterfall request patterns
   - Blocking resources on critical path
   - Parallel loading opportunities
4. Detect excessive re-render issues:
   - Missing memoization (React.memo, useMemo, useCallback)
   - Unstable dependencies in effects
   - Context overuse causing cascading renders
   - Prop drilling patterns
5. Analyze data fetching patterns:
   - Client-side fetching that could be server-side
   - Missing data prefetching
   - Sequential API calls that could be parallel
   - Improper cache utilization
6. Review Next.js 16.1.0 feature adoption gaps:
   - Components not using Server Components when possible
   - Missing or improperly placed 'use client' directives
   - Routes not leveraging App Router features
   - Missing Parallel/Intercepting Routes opportunities
   - Underutilized Metadata API
   - Missing Image/Font optimizations
7. Audit Suspense boundary implementation:
   - Missing Suspense boundaries
   - Improperly placed boundaries
   - Loading state inconsistencies
8. Analyze bundle and asset optimization:
   - Large bundles needing code splitting
   - Duplicate dependencies
   - Unused code and dead exports
   - Dynamic import opportunities
9. Identify performance bottlenecks:
   - Heavy computations in render
   - Layout thrashing
   - Large component trees
   - Inefficient state updates

**Cross-reference with**: ouroboros-researcher findings

**Deliverable**:

- Detailed Analysis Report with file paths, line numbers, and code snippets
- Dependency graph visualizations
- Performance bottleneck matrix
- Next.js 16.1.0 feature gap analysis

**Output Format for Each Finding**:

```markdown
## [CRITICAL/HIGH/MEDIUM/LOW] Issue Title

**File**: `path/to/file.tsx` (Lines: 45-67)
**Category**: [Performance/Architecture/Modern Features/Loading/Bundle/Security]
**Impact**: Load Time: +X ms | Runtime: Y | Bundle: +Z KB
**Effort**: [Low/Medium/High]
**Assigned Agent**: [Agent for next phase]

### Current Implementation
```typescript
// Problematic code here
```

### Issue Description

[Clear explanation with metrics]

### Recommended Solution (Based on Next.js 16.1.0)

```typescript
// Optimized code here using latest features
```

### Related Research

- Links to ouroboros-researcher findings
- Relevant Next.js 16.1.0 documentation

### Next Steps

- Route to: ouroboros-[agent-name] for implementation

```

---

## Phase 4: Task Planning & Prioritization

### Agent: `ouroboros-tasks`
**Objective**: Create prioritized, actionable task list from analysis

**Tasks**:
1. Review all findings from ouroboros-analyst
2. Group related optimizations into logical tasks
3. Prioritize based on:
   - User-facing impact (Core Web Vitals, load time)
   - Implementation complexity
   - Dependencies between tasks
   - Risk level
4. Create implementation order considering:
   - Quick wins (low effort, high impact)
   - Foundation tasks (required for other optimizations)
   - Major refactors (high effort, high impact)
   - Nice-to-haves (low priority)
5. Assign each task to appropriate agent(s)
6. Estimate effort and timeline
7. Identify parallel vs sequential tasks

**Deliverable**: 
- Prioritized Task Backlog
- Sprint/Phase planning recommendations
- Dependency graph for task ordering
- Risk assessment for each task

**Task Format**:
```markdown
## Task ID: OPT-001
**Title**: Migrate ProductCard to Server Component
**Priority**: HIGH (Quick Win)
**Estimated Effort**: 2 hours
**Impact**: -15KB bundle, -200ms load time
**Dependencies**: None
**Assigned Agents**: 
  - Primary: ouroboros-coder
  - Review: ouroboros-architect
  - Testing: ouroboros-qa
  - Writing: ouroboros-writer

**Implementation Steps**:
1. [Specific actionable steps]

**Acceptance Criteria**:
- [ ] Component successfully renders as Server Component
- [ ] No client-side interactivity lost
- [ ] Bundle size reduced by target amount
- [ ] Tests passing
```

---

## Phase 5: Validation & Specification Review

### Agent: `ouroboros-validator`

**Objective**: Validate all specifications before implementation

**Tasks**:

1. Review requirements from ouroboros-requirements
2. Validate architecture plans from ouroboros-architect
3. Cross-check analysis findings from ouroboros-analyst
4. Verify task prioritization from ouroboros-tasks
5. Ensure alignment with Next.js 16.1.0 best practices
6. Validate that solutions meet EARS requirements
7. Check for conflicts or contradictions
8. Verify feasibility of proposed changes
9. Approve or request revisions for each specification

**Deliverable**:

- Validation Report
- Approved specifications
- Risk mitigation plans
- Go/No-Go recommendations for each optimization

---

## Phase 6: Security Review

### Agent: `ouroboros-security`

**Objective**: Security analysis of current code and proposed changes

**Tasks**:

1. Review Server Actions for security vulnerabilities
2. Analyze data exposure in Server Components
3. Check for XSS vulnerabilities in dynamic content
4. Review API route security
5. Validate environment variable usage
6. Check for sensitive data in client bundles
7. Review authentication/authorization in optimized code
8. Analyze CSRF protection in Server Actions
9. Review third-party dependency security

**Deliverable**:

- Security Assessment Report
- Security requirements for each optimization
- Threat model for new patterns
- Security testing checklist

---

## Phase 7: Implementation

### Agent: `ouroboros-coder`

**Objective**: Implement approved optimizations

**Tasks**:

1. Implement optimizations according to validated tasks
2. Follow Next.js 16.1.0 best practices from research
3. Apply architecture patterns from ouroboros-architect
4. Implement one task at a time with proper testing
5. Document code changes inline
6. Create migration guides for breaking changes
7. Preserve backward compatibility where required
8. Request code reviews from ouroboros-architect

**Important**:

- **READ-ONLY during analysis phases**
- **WRITE-ONLY during implementation phase**
- Never write files until tasks are validated
- Coordinate with ouroboros-writer for all file operations

**Input**: Validated tasks from ouroboros-validator

**Deliverable**:

- Implemented code changes
- Inline documentation
- Implementation notes for each change

---

## Phase 8: File Writing

### Agent: `ouroboros-writer`

**Objective**: Handle ALL file writing operations

**Tasks**:

1. Write all code changes from ouroboros-coder
2. Maintain file integrity and formatting
3. Ensure proper file permissions
4. Write documentation files
5. Update configuration files
6. Create comprehensive change logs

**Critical Rules**:

- **ONLY agent allowed to write files**
- All other agents must route write requests through ouroboros-writer
- Maintain audit log of all changes
- Verify file changes before writing
- Version control and merge management handled by user

**Note**: CI/CD, Git operations, and deployment are managed by the user

---

## Phase 9: Testing & QA

### Agent: `ouroboros-qa`

**Objective**: Comprehensive testing of all optimizations

**Tasks**:

1. Create test plans for each optimization
2. Perform functional testing:
   - Verify features work as expected
   - Test Server Components render correctly
   - Validate Server Actions function properly
   - Test loading states and Suspense boundaries
3. Perform performance testing:
   - Measure load time improvements
   - Verify bundle size reductions
   - Test Core Web Vitals (LCP, FID, CLS)
   - Profile runtime performance
   - Test under various network conditions
4. Perform regression testing:
   - Ensure no existing functionality broken
   - Validate backward compatibility
   - Test edge cases
5. Cross-browser and cross-device testing
6. Accessibility testing (no regressions)
7. Create bug reports and route to appropriate agents
8. Verify security requirements met
9. Load testing and stress testing

**Deliverable**:

- Test results report
- Bug reports (if any)
- Performance comparison (before/after)
- Sign-off for production deployment

---

## Multi-Wave Execution Strategy

### Wave 1: Foundation (Weeks 1-2)

**Agents**: ouroboros-researcher → ouroboros-requirements → ouroboros-architect → ouroboros-validator

**Goal**: Establish knowledge base and strategy

### Wave 2: Analysis (Week 3)

**Agents**: ouroboros-analyst + ouroboros-security → ouroboros-tasks → ouroboros-validator

**Goal**: Identify all optimization opportunities and plan implementation

### Wave 3: Quick Wins (Week 4)

**Agents**: ouroboros-coder + ouroboros-writer + ouroboros-qa → ouroboros-devops

**Goal**: Implement and deploy low-effort, high-impact optimizations

**Examples**:

- Add missing Suspense boundaries
- Convert simple components to Server Components
- Add missing image optimizations
- Implement proper memoization

### Wave 4: Major Optimizations (Weeks 5-7)

**Agents**: ouroboros-architect + ouroboros-coder + ouroboros-writer + ouroboros-qa → ouroboros-devops

**Goal**: Implement architectural changes and major refactors

**Examples**:

- Implement Partial Prerendering
- Refactor data fetching to Server Actions
- Restructure routes for parallel loading
- Implement advanced caching strategies

### Wave 5: Validation & Monitoring (Week 8)

**Agents**: ouroboros-qa + ouroboros-validator + ouroboros-devops

**Goal**: Final validation and production monitoring setup

---

## Agent Routing Matrix

| Issue Type            | Primary Agent          | Supporting Agents                       | Review Agent        |
| --------------------- | ---------------------- | --------------------------------------- | ------------------- |
| Research needed       | ouroboros-researcher   | -                                       | ouroboros-validator |
| Requirements          | ouroboros-requirements | ouroboros-researcher                    | ouroboros-validator |
| Architecture decision | ouroboros-architect    | ouroboros-analyst, ouroboros-researcher | ouroboros-validator |
| Code analysis         | ouroboros-analyst      | -                                       | ouroboros-architect |
| Security concern      | ouroboros-security     | ouroboros-analyst                       | ouroboros-validator |
| Task planning         | ouroboros-tasks        | ouroboros-analyst, ouroboros-architect  | ouroboros-validator |
| Code implementation   | ouroboros-coder        | ouroboros-architect                     | ouroboros-qa        |
| File writing          | ouroboros-writer       | ouroboros-coder                         | ouroboros-devops    |
| Testing               | ouroboros-qa           | -                                       | ouroboros-validator |
| Deployment            | ouroboros-devops       | ouroboros-writer                        | ouroboros-qa        |
| Bug found             | ouroboros-qa           | -                                       | ouroboros-coder     |
| Validation needed     | ouroboros-validator    | All agents                              | -                   |

---

## Critical Success Metrics

### Performance Targets

- First Contentful Paint: < 1.5s (4G)
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- Total Blocking Time: < 200ms
- Cumulative Layout Shift: < 0.1
- Bundle size reduction: 30%+ for client JavaScript

### Code Quality Targets

- 80%+ Server Component adoption (where applicable)
- 100% Suspense boundary coverage for async operations
- 90%+ utilization of Next.js 16.1.0 optimization features
- Zero security vulnerabilities introduced
- 100% test coverage for critical paths

### Implementation Targets

- Quick wins deployed: Week 4
- Major optimizations: Week 7
- Full validation: Week 8
- Zero breaking changes for end users

---

## Communication Protocol

### Agent Handoffs

When routing work between agents, use this format:

```
@ouroboros-[agent-name]

TASK: [Clear task description]
CONTEXT: [Relevant background from previous agents]
INPUT ARTIFACTS: [Links to research, analysis, specs]
DELIVERABLE: [What the agent should produce]
DEADLINE: [If time-sensitive]
DEPENDENCIES: [What must be completed first]
ROUTING: [Where output should go next]

[Detailed instructions...]
```

### Status Updates

Each agent reports status in standardized format:

```
AGENT: ouroboros-[name]
PHASE: [Current phase]
STATUS: [In Progress/Blocked/Complete]
PROGRESS: [X/Y tasks complete]
BLOCKERS: [Any issues]
NEXT: [Next steps]
ETA: [Estimated completion]
```

---

## Emergency Protocols

### If Critical Issue Found

1. **ouroboros-analyst** or **ouroboros-qa** immediately flags to **ouroboros-validator**
2. **ouroboros-validator** assesses severity
3. If critical: Escalate to **ouroboros-architect** and **ouroboros-security**
4. Emergency task created by **ouroboros-tasks**
5. Fast-track implementation through all phases

### If Optimization Causes Regression

1. **ouroboros-qa** documents regression
2. **ouroboros-devops** initiates rollback if in production
3. **ouroboros-analyst** investigates root cause
4. **ouroboros-coder** implements fix
5. **ouroboros-qa** re-validates before re-deployment

---

## Final Deliverables

### Documentation (ouroboros-writer)

1. Executive Summary Dashboard
2. Detailed Analysis Report
3. Implementation Guide
4. Migration Checklist
5. Performance Comparison Report
6. Lessons Learned Document

### Code (ouroboros-coder + ouroboros-writer)

1. Optimized codebase
2. Comprehensive inline documentation
3. Updated README files
4. Configuration files

### Infrastructure (ouroboros-devops)

1. CI/CD pipelines
2. Monitoring dashboards
3. Deployment scripts
4. Rollback procedures

### Quality Assurance (ouroboros-qa)

1. Test suites
2. Performance benchmarks
3. Regression test results
4. Sign-off documentation

---

## Next.js 16.1.0 Research Priorities for ouroboros-researcher

### Critical Research Areas

1. **Partial Prerendering (PPR)**

   - How to enable and configure
   - Which routes benefit most
   - Fallback strategies
   - Performance implications
2. **Enhanced Server Actions**

   - Best practices for data mutations
   - Error handling patterns
   - Progressive enhancement
   - Security considerations
3. **Advanced Caching**

   - New cache APIs and options
   - Per-route cache configuration
   - Cache invalidation strategies
   - Full Route Cache vs Data Cache
4. **React 19 Integration**

   - use() hook implementation
   - Async Server Components patterns
   - Enhanced Suspense features
   - Form Actions and useFormStatus
5. **Image & Font Optimization**

   - Latest next/image features
   - Font optimization updates
   - Lazy loading improvements
6. **Metadata API**

   - Dynamic metadata generation
   - SEO optimization patterns

### Research Deliverables Template

```markdown
# Feature: [Feature Name]

## What's New in 16.1.0
[Changes from previous version]

## Use Cases for Our Project
[Specific opportunities in our codebase]

## Implementation Example
```typescript
// Code example
```

## Performance Impact

- Expected improvement: [metrics]
- Trade-offs: [any downsides]

## Migration Path

1. [Step-by-step from current implementation]

## Gotchas & Best Practices

- [Common pitfalls]
- [Recommendations]

## Resources

- [Official docs links]
- [Blog posts]
- [Example repos]

```

---

## Execution Checklist

- [ ] Phase 0: ouroboros-researcher completes Next.js 16.1.0 research
- [ ] Phase 1: ouroboros-requirements defines EARS requirements
- [ ] Phase 2: ouroboros-architect creates optimization blueprint
- [ ] Phase 3: ouroboros-analyst performs code analysis
- [ ] Phase 4: ouroboros-tasks creates prioritized backlog
- [ ] Phase 5: ouroboros-validator approves all specifications
- [ ] Phase 6: ouroboros-security validates security posture
- [ ] Phase 7: ouroboros-coder implements optimizations
- [ ] Phase 8: ouroboros-writer manages all file operations
- [ ] Phase 9: ouroboros-devops sets up CI/CD and monitoring
- [ ] Phase 10: ouroboros-qa validates all changes
- [ ] Final: All deliverables completed and approved

**Start with: @ouroboros-researcher - Begin Next.js 16.1.0 research immediately**
```
