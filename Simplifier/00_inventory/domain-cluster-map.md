# Domain Cluster Map

**Generated:** Wave 1 Synthesis  
**Source:** Import pattern analysis across all shards

---

## Identified Domain Clusters

### Cluster 1: Chat & Conversation
**Core Domain:** Real-time AI chat with streaming responses

| Files | LOC | Purpose |
|-------|-----|---------|
| features/chat/** | ~9,410 | Chat domain logic |
| app/api/chat/** | ~1,030 | Chat API endpoints |
| components/ai/chat/** | ~1,000 | Chat UI components |

**Key Dependencies:**
- lib/ai → Model registry, completion
- lib/data → Message persistence
- lib/auth → Session context

**Cross-Domain Dependencies:**
- features/artifact → Artifact creation during chat
- features/input → Multimodal input handling
- features/sidebar → Chat history

---

### Cluster 2: Artifact Management
**Core Domain:** Document/code/image/sheet artifact lifecycle

| Files | LOC | Purpose |
|-------|-----|---------|
| features/artifact/** | ~6,103 | Artifact domain logic |
| components/document/** | ~900 | Document rendering |
| app/api/artifacts/** | ~572 | Artifact API |

**Key Dependencies:**
- lib/ai → Artifact content generation
- lib/data → Artifact persistence
- lib/editor → Diff and suggestions

**Cross-Domain Dependencies:**
- features/chat → Artifact creation from chat
- features/settings → Default artifact model

---

### Cluster 3: Authentication & Authorization
**Core Domain:** User identity, sessions, permissions

| Files | LOC | Purpose |
|-------|-----|---------|
| features/auth/** | ~2,107 | Auth feature |
| lib/auth/** | ~1,487 | Auth infrastructure |
| app/api/auth/** | ~300 | Auth API |

**Key Dependencies:**
- lib/db → User persistence
- lib/errors → Auth errors
- next-auth → External auth

**Cross-Domain Dependencies:**
- All features depend on auth context
- Guest strategy affects caching

---

### Cluster 4: Settings & Configuration
**Core Domain:** User preferences, model selection, app configuration

| Files | LOC | Purpose |
|-------|-----|---------|
| features/settings/** | ~2,720 | Settings domain |
| components/settings/** | ~80 | Settings UI |

**Key Dependencies:**
- lib/ai → Model registry
- lib/auth → User context
- lib/cache → Settings caching

**Critical Issue:** Two `useSettings` implementations exist:
- Context-based (settings-provider.tsx)
- Server action-based (use-settings.ts)

---

### Cluster 5: Sidebar & Navigation
**Core Domain:** Chat history, navigation, user actions

| Files | LOC | Purpose |
|-------|-----|---------|
| features/sidebar/** | ~2,050 | Sidebar domain |
| components/ui/sidebar.tsx | ~828 | Sidebar primitive |

**Key Dependencies:**
- lib/data → Chat history queries
- lib/auth → User context
- features/chat → Chat visibility

---

### Cluster 6: Input & Multimodal
**Core Domain:** Message input, file uploads, suggested actions

| Files | LOC | Purpose |
|-------|-----|---------|
| features/input/** | ~1,945 | Input domain |
| components/ai-elements/prompt-input.tsx | ~1,464 | Input primitive |

**Key Dependencies:**
- lib/utils → File validation
- features/chat → Message sending
- lib/ai → Model selection

---

### Cluster 7: Data Layer
**Core Domain:** Persistence, queries, caching

| Files | LOC | Purpose |
|-------|-----|---------|
| lib/db/** | ~2,000 | Database client |
| lib/data/** | ~6,350 | Repositories & services |
| lib/cache/** | ~5,503 | Caching infrastructure |

**Key Dependencies:**
- drizzle-orm → Database ORM
- @upstash/redis → Cache backend
- postgres → Database driver

**Circular Dependency:** lib/db/pagination ↔ lib/data/types

---

### Cluster 8: AI Integration
**Core Domain:** LLM integration, model management, prompt handling

| Files | LOC | Purpose |
|-------|-----|---------|
| lib/ai/** | ~4,861 | AI utilities |
| components/ai/** | ~3,000 | AI UI components |
| components/ai-elements/** | ~5,700 | AI primitives |

**Key Dependencies:**
- ai SDK → Streaming, completion
- Multiple AI providers → OpenAI, Google, etc.

**Architecture Note:** Layered structure:
- Layer 1: ai-elements/ (primitives)
- Layer 2: ai/ (wrappers)

---

### Cluster 9: Infrastructure & Utilities
**Core Domain:** Shared utilities, errors, middleware

| Files | LOC | Purpose |
|-------|-----|---------|
| lib/utils/** | ~2,657 | Utilities |
| lib/errors/** | ~2,100 | Error handling |
| lib/middleware/** | ~1,200 | Request middleware |
| lib/a11y/** | ~1,500 | Accessibility |
| components/ui/** | ~3,412 | UI primitives |

---

## Domain Dependency Matrix

| Domain | Chat | Artifact | Auth | Settings | Sidebar | Input | Data | AI | Utils |
|--------|------|----------|------|----------|---------|-------|------|-----|-------|
| Chat | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Artifact | ✓ | — | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Auth | ✗ | ✗ | — | ✓ | ✓ | ✗ | ✓ | ✗ | ✓ |
| Settings | ✗ | ✗ | ✓ | — | ✗ | ✗ | ✓ | ✓ | ✓ |
| Sidebar | ✓ | ✗ | ✓ | ✗ | — | ✗ | ✓ | ✗ | ✓ |
| Input | ✓ | ✓ | ✗ | ✗ | ✗ | — | ✗ | ✓ | ✓ |
| Data | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | — | ✗ | ✓ |
| AI | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | — | ✓ |
| Utils | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | — |

---

## Architectural Observations

### Positive Patterns
1. **Feature isolation** - Each domain has self-contained actions, components, hooks, types
2. **Layered AI UI** - ai-elements primitives + ai wrappers
3. **Repository pattern** - Clean data access abstraction

### Concerns
1. **Cross-feature imports** - Chat imports from 5 other features
2. **Type duplication** - Same types defined in multiple clusters
3. **Settings dual-implementation** - Two `useSettings` hooks
4. **Artifact/chat tight coupling** - Heavy bidirectional dependency
