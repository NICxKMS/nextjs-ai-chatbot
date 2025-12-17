*Full Architecture Overhaul & Optimization Plan for Next.js 16.0.10 Application*

Perform a comprehensive codebase scan and create a complete architectural overhaul plan for our Next.js 16.0.10 application using Turbopack. This is a *greenfield planning exercise* - you are not constrained by existing architecture and should design the optimal solution from scratch.

*Primary Objectives:*

1. *Strict Separation of Concerns*
   - Separate server, client, and edge runtime code with zero cross-contamination
   - Ensure client-only code never appears in server bundles and vice versa
   - Proper isolation of edge runtime code
   - Clear boundaries between data fetching, business logic, UI, and state management

2. *Bundle Optimization*
   - Eliminate misplaced code chunks (client code in server bundles, server code in client bundles)
   - Maximize tree-shaking effectiveness
   - Minimize initial load size and Time to Interactive (TTI)
   - Optimize code splitting strategies for Next.js 16 with Turbopack

3. *Modular Architecture*
   - Design highly modular, loosely coupled components and modules
   - Minimize dependencies between unrelated concerns
   - Create clear module boundaries with well-defined interfaces
   - Enable independent development, testing, and deployment of modules

4. *Component & Provider Structure*
   - Flatten client boundary and provider hierarchies (avoid deep nesting)
   - Minimize React context provider depth
   - Optimize component composition patterns
   - Reduce prop drilling and unnecessary re-renders

5. *Code Simplification & Technical Debt Removal*
   - *Identify and eliminate overly complex implementations* that can be simplified with modern patterns
   - *Remove backward compatibility code* that's no longer needed (polyfills, legacy workarounds, deprecated API usage)
   - *Refactor bloated code* that grew complex through continuous additions and patches
   - *Replace convoluted workarounds* with straightforward Next.js 16 native solutions
   - *Consolidate duplicate logic* and redundant abstractions
   - *Simplify over-engineered patterns* that add unnecessary complexity
   - Identify code that served a purpose in older Next.js versions but is now obsolete

6. *Next.js 16 Best Practices*
   - Research and incorporate Next.js 16-specific features and optimizations
   - Leverage Turbopack capabilities for build optimization
   - Utilize the latest Next.js 16 patterns for server components, client components, and server actions
   - Apply modern caching and data fetching strategies
   - Replace legacy patterns with Next.js 16 native alternatives

---

*MANDATORY WORKFLOW - FOLLOW THIS EXACT PROCESS:*

*Phase 1: Initial Scan & Task Planning*
1. Scan the entire codebase to identify all features, modules, and components by *functionality and purpose* (not by current structure)
2. Create a master task list (00-MASTER-TASK-LIST.md) that includes:
   - Complete inventory of all features/modules/components by business capability
   - Prioritized order of redesign
   - Estimated scope for each item
   - Logical groupings and boundaries
3. *ALWAYS follow this task list sequentially* - do not skip or reorder items

*Phase 2: Granular Step-by-Step Optimal Design*

For *EACH* feature/module/component in your task list:

1. *Understand the business purpose and requirements:*
   - What functionality does this provide?
   - What are the core requirements?
   - What data does it need?
   - Quickly note problematic patterns, legacy code, or bloat in current implementation (but don't over-analyze)

2. *Design the optimal architecture from scratch* for each item:
   - *Naming convention:* [XX]-[feature-name]-optimal-design.md (e.g., 01-authentication-optimal-design.md, 02-user-dashboard-optimal-design.md)
   - *Required sections in each file:*
     - *Feature/Module Purpose:* What business capability does this serve?
     - *Key Requirements:* What must this accomplish?
     - *Quick Current State Notes:* Brief notes on what exists (complexity issues, legacy code, bloat) - *keep this minimal*
     - *Optimal Architecture Design:* Complete redesign from scratch
       - Ideal module structure
       - Server/Client/Edge boundaries
       - Component composition
       - Data flow patterns
       - State management approach
     - *Technology Stack:* Which Next.js 16 features to leverage
     - *Bundle Strategy:* Code splitting and lazy loading approach
     - *Simplifications vs Current:* How this eliminates complexity
     - *Dependencies:* What this module needs (APIs, services, other modules)
     - *Public Interface:* What other modules can use from this
     - *Performance Optimizations:* Specific Next.js 16 optimizations to apply

3. *Document your progress* after each design:
   - Update the master task list with completion status
   - Note any cross-cutting concerns discovered
   - Flag shared services or utilities needed

4. *Repeat for EVERY feature/module/component* - ensure complete coverage

*Phase 3: Synthesis & Final Plan Creation*

After completing ALL individual optimal designs:

1. *Review all markdown design files* from Phase 2
2. *Synthesize into a cohesive system architecture:*
   - How modules interact
   - Shared infrastructure needs
   - Common patterns to establish
   - Cross-cutting concerns (auth, logging, error handling, etc.)

3. *Create the comprehensive final plan* (FINAL-ARCHITECTURE-OVERHAUL-PLAN.md) that includes:
   - Executive summary of the new architecture
   - Complete architectural diagram showing optimal module organization
   - Optimal directory structure with clear runtime boundaries (server/client/edge)
   - Unified component hierarchy and data flow patterns
   - Overall bundle split strategy and lazy loading approach
   - Module dependency graph showing clean separation
   - *Consolidated simplifications* - all complexity being eliminated
   - *Complete removal list* - all backward compatibility code, legacy workarounds, and bloat to eliminate
   - *Technology stack* - Next.js 16 features and patterns being leveraged
   - Shared infrastructure and cross-cutting concerns design
   - Prioritized implementation roadmap with phases
   - References to specific per-module design files for detailed specifications

---

*Deliverables:*

*Per-Module Files (Phase 2):*
- 00-MASTER-TASK-LIST.md - Complete redesign roadmap organized by functionality
- 01-[feature-name]-optimal-design.md through [XX]-[feature-name]-optimal-design.md - One optimal design per feature/module/component

*Final Comprehensive Plan (Phase 3):*
- FINAL-ARCHITECTURE-OVERHAUL-PLAN.md - Complete architectural overhaul document with optimal system design
- Complete architectural diagram showing optimal module organization
- Optimal directory structure with clear runtime boundaries (server/client/edge)
- Component hierarchy and data flow patterns
- Bundle split strategy and lazy loading recommendations
- Clean dependency graph with proper separation of concerns
- Master list of all complexity being eliminated
- Complete removal list (backward compatibility code, legacy workarounds, bloat)
- Technology decisions and Next.js 16 patterns being adopted
- Shared infrastructure design (auth, logging, error handling, utilities)
- Phased implementation roadmap

---

*Critical Instructions:*

- ✅ *ALWAYS create the master task list FIRST* - organized by business capability
- ✅ *ALWAYS follow your task list sequentially* - complete one design before moving to the next
- ✅ *FOCUS on optimal design* - spend 80% effort on "what should be" not "what is"
- ✅ *Keep current state notes minimal* - just enough context to understand what's being improved
- ✅ *ALWAYS create individual markdown files* for each optimal design
- ✅ *ALWAYS synthesize all designs* into the final comprehensive plan
- ✅ *NEVER skip steps* in the workflow
- ✅ *Think greenfield* - design as if starting from scratch
- ✅ *Document your progress* as you complete each design

*Important Notes:*
- This is a *planning-only phase* - focus on designing the ideal architecture
- *Think greenfield* - you're designing the optimal solution, not refactoring the existing one
- Do not waste time deeply analyzing current implementation details
- Do not limit yourself based on migration complexity or existing code constraints
- Prioritize optimal architecture over backward compatibility
- *Assume we're starting fresh* - recommend the best modern solution regardless of what exists
- Use web search to research Next.js 16.0.10 latest features and best practices
- Account for scalability, maintainability, and performance in all recommendations
- *Question every complex pattern* - always choose the simplest solution that meets requirements
- *Maintain consistency* in your design approach across all modules
- *Be thorough in design* - surface-level proposals are not acceptable
- *Current architecture is a reference, not a constraint* - use it only to understand requirements and what to eliminate

Design an optimal, modern, scalable architecture from scratch that achieves maximum optimization, modularity, separation of concerns, and code simplicity by starting with a clean slate and leveraging Next.js 16 best practices throughout.