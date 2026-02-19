# Architecture Analysis

This directory contains architecture pattern analysis and structural issue identification.

## Purpose

Architecture analysis evaluates:

- Adherence to v6 architecture patterns
- Layer separation and dependency direction
- Module boundary integrity
- Design pattern consistency

## v6 Architecture Patterns

### Repository Pattern

All data access should go through `lib/data/repositories/`:

```
✅ Correct: Route → Service → Repository → Database
❌ Incorrect: Route → Direct Database Access
```

### Service Layer

Business logic belongs in `lib/data/services/`:

```
✅ Correct: Route calls Service for business logic
❌ Incorrect: Business logic in Route handlers
```

### Feature Modules

Self-contained features under `features/`:

```
✅ Correct: features/chat/components/, features/chat/hooks/
❌ Incorrect: Scattered feature code across multiple directories
```

### Slim Routes

API routes should delegate to services:

```
✅ Correct: Route validates input, calls service, returns response
❌ Incorrect: Route contains business logic
```

## Analysis Areas

### Layer Compliance

| Layer | Allowed Dependencies | Violation Examples |
|-------|---------------------|-------------------|
| Routes | Services, Validation | Direct DB access |
| Services | Repositories, Other Services | Direct DB, UI components |
| Repositories | Database, Types | Services, Routes |

### Module Boundaries

| Module | Should Contain | Should Not Contain |
|--------|---------------|-------------------|
| `features/chat` | Chat UI, hooks, actions | Auth logic, Artifact logic |
| `features/auth` | Auth UI, session handling | Chat logic, Data access |
| `lib/data` | Repositories, Services | UI components, Routes |

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| `pattern-compliance.md` | v6 pattern adherence analysis | Pending |
| `layer-violations.md` | Cross-layer dependency issues | Pending |
| `module-boundaries.md` | Feature module boundary analysis | Pending |
| `dependency-graph.md` | Module dependency visualization | Pending |
| `recommendations.md` | Architecture improvement recommendations | Pending |

## Methodology

1. **Pattern Definition**: Document expected v6 patterns
2. **Code Scanning**: Identify pattern implementations
3. **Violation Detection**: Find deviations from patterns
4. **Impact Assessment**: Evaluate violation severity
5. **Remediation Planning**: Propose fixes

## Output

This analysis produces:

- Pattern compliance scorecard
- Layer violation report
- Module boundary integrity assessment
- Dependency graphs
- Remediation recommendations
