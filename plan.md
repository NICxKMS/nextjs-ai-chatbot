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

5. *Next.js 16 Best Practices*
   - Research and incorporate Next.js 16-specific features and optimizations
   - Leverage Turbopack capabilities for build optimization
   - Utilize the latest Next.js 16 patterns for server components, client components, and server actions
   - Apply modern caching and data fetching strategies

*Deliverables:*

- Complete architectural diagram showing module organization
- Directory structure with clear runtime boundaries (server/client/edge)
- Component hierarchy and data flow patterns
- Bundle split strategy and lazy loading recommendations
- Dependency graph showing coupling points and proposed decoupling
- Migration strategy from current to proposed architecture

*Important Notes:*
- This is a *planning-only phase* - focus on designing the ideal architecture
- Do not limit yourself based on migration complexity or existing code constraints
- Prioritize optimal architecture over backward compatibility
- Use web search to research Next.js 16.0.10 latest features and best practices
- Account for scalability, maintainability, and performance in all recommendations

Analyze the entire codebase and deliver a comprehensive architectural overhaul plan that achieves maximum optimization, modularity, and separation of concerns.