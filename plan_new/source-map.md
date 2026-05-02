# Source Map

This file records how the old planning source areas were folded into the standalone `plan_new/` design pack. The other documents do not depend on `plan/` or `plan-archives/` continuing to exist.

## Included Source Areas

| Old source area | Used for | New destination |
|---|---|---|
| `plan-archives/redesign/*.md` | Architecture, principles, directory structure, state topology, data flow, AI integration, streaming, naming, phase order | All design docs, especially `02-architecture.md`, `05-chat-and-ai.md`, `08-build-roadmap.md` |
| `plan/architecture/*.md` | Corrected architectural decisions, conventions, patterns | `01-overview.md`, `02-architecture.md`, `03-domain-model.md` |
| `plan/behavioral_extraction/*.md` | Feature behavior, API contracts, auth, AI SDK usage, artifact behavior, state and edge cases | `03-domain-model.md`, `04-data-flow-and-apis.md`, `05-chat-and-ai.md`, `06-artifacts.md` |
| `plan/dependencies/*.md` | Critical path and inter-phase ordering | `08-build-roadmap.md` |
| `plan/final_plan/*.md` | Concrete phase outputs, corrected contracts, integration summary | `08-build-roadmap.md` and cross-document details |
| `plan/integration_map/*.md` | Feature contracts, data chains, API/action mapping, stream event contracts | `03-domain-model.md`, `04-data-flow-and-apis.md`, `05-chat-and-ai.md`, `06-artifacts.md` |
| `plan/phases/*.md` | Phase design and exit gates | `08-build-roadmap.md` |
| `plan/scaffold/*.md` | Target root layout, file layout, shared types, config expectations | `02-architecture.md`, `03-domain-model.md`, `08-build-roadmap.md` |
| `plan/strategy/*.md` | Vertical slice sequence and rebuild strategy | `08-build-roadmap.md` |
| `plan/traceability/*.md` | Coverage checks for features and seams | All docs through coverage consolidation |
| `plan/ui_parity/*.md` | Routes, screen states, components, interactions, accessibility, AI elements policy | `07-ui-and-accessibility.md`, `06-artifacts.md`, `05-chat-and-ai.md` |
| `package.json` | Current dependency versions where older design docs conflict | `01-overview.md` |

## Excluded Source Areas

The following areas were intentionally not carried into the design pack:

| Excluded area | Reason |
|---|---|
| `plan/guides` | Agent and process guidance, not new app design |
| `plan/memory` | Memory state and running context, not product architecture |
| `plan/memory/tasks` | Task logs and execution history, not design documentation |
| `STARTER-PROMPT.md` | Prompting bootstrap, not product design |
| `plan-archives/prompt.md` | Historical prompt input, not current app design |
| `oldplan-before-redesign` | Superseded history, not needed after corrected redesign docs |

## Rewrite Rules Applied

1. The pack is organized by current app design, not by source-folder history.
2. Historical audit labels, wave notes, memory status, task summaries, and agent protocols were removed.
3. Authoritative corrected facts were preserved, including `proxy.ts`, App Router, root-level folders, server layouts, client islands, artifact naming, handler registry, cache revalidation rules, and no credit/gateway logic.
4. Old version conflicts were resolved with current project dependencies when directly available.
5. Parity-only UI notes were treated as behavior references, not as a command to rebuild removed legacy components.

## Coverage Check

| Required topic | Covered in |
|---|---|
| Product scope and stack | `01-overview.md` |
| Architecture and directory rules | `02-architecture.md` |
| Feature ownership and data entities | `03-domain-model.md` |
| Route Handlers and Server Actions | `04-data-flow-and-apis.md` |
| Auth and rate limits | `04-data-flow-and-apis.md` |
| Chat lifecycle and streaming | `05-chat-and-ai.md` |
| AI providers, model catalog, prompts, tools | `05-chat-and-ai.md` |
| Artifact lifecycle, store, handlers, editors | `06-artifacts.md` |
| Screens, interactions, responsive behavior, accessibility | `07-ui-and-accessibility.md` |
| Build phases and critical path | `08-build-roadmap.md` |
| Provenance and exclusions | `source-map.md` |
