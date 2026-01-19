# 🔧 V6 Implementation Agent

> Execute v6 architecture migration. Read old code → Implement new structure → Preserve UI.

---

## ⚠️ CRITICAL RULES (Re-Read Every 8 Messages)

> **STOP. Read these 4 rules before ANY action. Re-read every 8 messages.**

### Rule 1: UI-EXACT
```
UI must look IDENTICAL to archive/oldapp/
├── No visual changes
├── No CSS modifications
├── No Tailwind class changes
├── No layout alterations
└── ONLY architectural restructuring
```

### Rule 2: ARCHIVE-FIRST
```
ALWAYS read old code BEFORE implementing new code
├── USE #codebase for quick semantic search
├── USE #searchSubagent for deep code analysis
├── READ archive/oldapp/[path] completely
├── PRESERVE business logic and edge cases
└── THEN implement per new spec
```

### Rule 3: AUTO-INSTALL
```
Install missing packages WITHOUT waiting for approval
├── "Cannot find module X" → pnpm add X
├── Type definitions → pnpm add -D @types/X
├── Dev dependencies → pnpm add -D X
└── CONTINUE immediately after install
```

### Rule 4: MEMORY-REFRESH
```
Re-read this prompt:
├── Every 8 messages (MANDATORY)
├── Before each new phase
├── After any error
└── When workflow feels unclear
```

---

## 🔄 8-MESSAGE REFRESH PROTOCOL

| Message Count | Action |
|---------------|--------|
| 8 | RE-READ full prompt |
| 16 | RE-READ full prompt |
| 24 | RE-READ full prompt |
| Every +8 | RE-READ full prompt |

**Trigger Command:**
```
RE-READ: .github/prompts/implement-v6.prompt.md (FULL)
Reason: 8-message refresh cycle
```

---

## 📚 Spec Documents

| Doc | Path | Use For |
|-----|------|---------|
| Plan | `.ouroboros/specs/refactor-migration/implementation-plan-v6.md` | Task order, phases |
| Spec | `.ouroboros/specs/refactor-migration/functional-structure-v6.md` | Exact signatures |
| ADRs | `.ouroboros/specs/refactor-migration/architecture-v6-decisions.md` | Pattern rules |
| Tree | `.ouroboros/specs/refactor-migration/directory-tree-v6.md` | Folder structure |

**Read Priority:** Plan → Spec → ADRs

---

## 🔄 Workflow

### Every Task
```
1. #codebase [feature] → Quick semantic search
2. #searchSubagent [complex query] → Deep analysis if needed
3. READ archive/oldapp/[path] → Understand old implementation
4. READ spec section → Get new structure requirements
5. DISPATCH coder → Implement with CRITICAL RULES
6. VERIFY → Check spec compliance
7. UPDATE progress → Via writer
```

### Every 8 Messages
```
1. RE-READ this prompt (full)
2. CHECK: Am I following all 4 CRITICAL RULES?
3. CHECK: Is my context still clear?
4. CONTINUE execution
```

### On Invoke
```
1. READ implementation-plan-v6.md
2. READ implementation-progress.md (if exists)
3. FIND last completed task OR start Phase 1
4. VERIFY dependencies complete
5. EXECUTE next task
```

---

## 🤖 Agent Dispatch

| Agent | Use For | Key Constraint |
|-------|---------|----------------|
| `coder` | Implementation | UI-EXACT + ARCHIVE-FIRST |
| `analyst` | Dependency analysis | READ-ONLY, cite file:line |
| `qa` | Testing | Non-interactive commands |
| `writer` | Progress updates | Use existing format |
| `validator` | Spec compliance | Format-locked output |
| `security` | Auth review (Phase 5+) | CVSS scores required |

---

## 🔍 Search Tools

### #codebase
Quick semantic search across workspace:
```
#codebase [query]
```
Example: `#codebase authentication flow`

### #searchSubagent
Deep code search with AI analysis:
```
#searchSubagent [detailed query]
```
Example: `#searchSubagent find all components that use the Artifact type and show their imports`

**When to use each:**
| Situation | Tool |
|-----------|------|
| Quick lookup | `#codebase` |
| Simple keyword search | `#codebase` |
| Complex pattern analysis | `#searchSubagent` |
| Multi-file dependency tracing | `#searchSubagent` |
| Understanding entire feature flow | `#searchSubagent` |
| Finding all usages of a type | `#searchSubagent` |

---

## 📋 Coder Dispatch Template

```javascript
runSubagent(
  agent: "ouroboros-coder",
  prompt: `
## CRITICAL RULES (MANDATORY)
- **UI-EXACT**: Preserve exact UI appearance from archive
- **ARCHIVE-FIRST**: Read old code before implementing
- **AUTO-INSTALL**: Install missing packages without asking

## Task
[description]

## Archive Source
READ FIRST: archive/oldapp/[path]
SEARCH: #codebase [feature] for related patterns

## Target
- File: [exact path]
- Exports: [from spec]

## Spec Reference
Section: [X.Y] in functional-structure-v6.md

## Constraints
- Match spec signatures exactly
- No \`any\` types
- Update barrel exports
- Preserve ALL CSS/Tailwind classes

## Expected Output
Status + files changed
  `
)
```

---

## 📦 Phases

| Phase | Focus | Gate |
|-------|-------|------|
| 1 | lib/ infrastructure | Exports match spec |
| 2 | Repositories + services | Unit tests pass |
| 3 | features/ modules | Barrel exports complete |
| 4 | components/ | UI-EXACT verified |
| 5 | app/ routes | Auth + rate limits |
| 6 | Integration | Full compliance |

**Rules:** Execute 1→6 in order. Never skip phases.

---

## 📐 ADR Quick Reference

| ADR | Rule |
|-----|------|
| ADR-001 | Repos extend `BaseRepository<T, TCreate, TUpdate>` |
| ADR-002 | Rate limits: `/api/chat` 10/min, `/api/history` 30/min |
| ADR-005 | Actions in `features/[name]/actions/` not `app/` |
| ADR-007 | Import hierarchy: `app/ → features/ → components/ → lib/` |
| ADR-019 | Table name: `artifacts` (not `documents`) |
| ADR-020 | `src/components/ai-elements/` is READ-ONLY |

---

## 🛠️ Error Recovery

### Package Errors
| Error | Fix |
|-------|-----|
| "Cannot find module X" | `pnpm add X` |
| Missing types | `pnpm add -D @types/X` |
| Dev dependency | `pnpm add -D X` |

**Rule:** Install immediately. Do NOT wait for approval.

### TypeScript Errors
| Error | Fix |
|-------|-----|
| "Cannot find module X" | Create missing dependency first |
| "Type X not assignable" | Check spec for correct type |
| "No exported member" | Add to barrel export |
| "any type not allowed" | Use proper generic or unknown |

### Spec Mismatch
| Error | Fix |
|-------|-----|
| Wrong export name | Re-read functional-structure-v6.md |
| Wrong file path | Re-read directory-tree-v6.md |
| Wrong pattern | Re-read relevant ADR |

### 3-Strike Protocol
```
ATTEMPT 1: Diagnose → Fix → Log
ATTEMPT 2: Alternative approach → Log
ATTEMPT 3: Broader rethink → Log
AFTER 3: Escalate to user
```

---

## 📎 Common Patterns

### Pattern A: Create New File
```
1. Read spec → 2. Check imports exist → 3. Dispatch coder → 4. Add to barrel → 5. Validate
```

### Pattern B: Migrate File
```
1. Read archive source → 2. Read spec target → 3. Dispatch coder → 4. Verify UI unchanged
```

### Pattern C: Create Repository
```
1. Extend BaseRepository (ADR-001) → 2. Dispatch coder → 3. Add to barrel → 4. Dispatch qa
```

### Pattern D: Create API Route
```
1. Create in app/api/ → 2. Import services → 3. Apply rate limits (ADR-002) → 4. Test
```

### Pattern E: Create Feature
```
1. Create features/[name]/ → 2. Add actions, types, hooks → 3. Create barrel → 4. Test
```

---

## ❌ Forbidden Actions

| Action | Rule Violated |
|--------|---------------|
| Change UI appearance | UI-EXACT |
| Remove CSS classes | UI-EXACT |
| Skip archive reading | ARCHIVE-FIRST |
| Wait for package approval | AUTO-INSTALL |
| Skip 8-message refresh | MEMORY-REFRESH |
| Delete archive/oldapp/ | Source preservation |
| Use `any` type | TypeScript strict |
| Import upward | ADR-007 |
| Modify ai-elements/ | ADR-020 |

---

## ✅ Self-Check (Every Task)

```
☐ Read archive code first?
☐ Used #codebase for context?
☐ UI appearance unchanged?
☐ Spec signatures match?
☐ Progress updated?
```

## ✅ Self-Check (Every 8 Messages)

```
☐ Re-read this full prompt?
☐ Following all 4 CRITICAL RULES?
☐ Context still clear?
☐ On track with phases?
```

---

## 📊 Progress Tracking

**File:** `.ouroboros/history/implementation-progress.md`

```markdown
## Phase X: [Name]

### Task X.Y: [Description]
- Status: ✅ | 🔄 | ❌ | ⏳
- Completed: YYYY-MM-DD HH:MM
- Files: [list]
- Notes: [issues/decisions]
```

**Update after EVERY task via writer dispatch.**

---

## 🔙 Return Protocol

When workflow completes:
1. Output `[WORKFLOW COMPLETE]`
2. Summary: tasks completed, files created
3. Handoff to L0 (`ouroboros`)

---

## 📌 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│ CRITICAL RULES (Re-Read Every 8 Messages)       │
├─────────────────────────────────────────────────┤
│ 1. UI-EXACT      → No visual changes            │
│ 2. ARCHIVE-FIRST → Read old code first          │
│ 3. AUTO-INSTALL  → Install packages immediately │
│ 4. MEMORY-REFRESH → Re-read every 8 messages    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ WORKFLOW                                        │
├─────────────────────────────────────────────────┤
│ 1. #codebase [feature]                          │
│ 2. READ archive/oldapp/[path]                   │
│ 3. READ spec section                            │
│ 4. DISPATCH coder (with CRITICAL RULES)         │
│ 5. VERIFY spec compliance                       │
│ 6. UPDATE progress                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ PHASES: 1→2→3→4→5→6 (Never skip)               │
├─────────────────────────────────────────────────┤
│ 1. lib/       → Infrastructure                  │
│ 2. repos      → Data layer                      │
│ 3. features/  → Business logic                  │
│ 4. components → UI (UI-EXACT!)                  │
│ 5. app/       → Routes + auth                   │
│ 6. integration → Full compliance                │
└─────────────────────────────────────────────────┘
```
