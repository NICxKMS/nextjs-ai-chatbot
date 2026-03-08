# Rename Log

All file and symbol renames performed during the optimization campaign.

---

## File Renames

| Old Name | New Name | Location | Wave | Reason |
|----------|----------|----------|------|--------|
| `models.types.ts` | `entity.types.ts` | `lib/types/` | W3 | Naming collision with `model.types.ts` (AI model types). `entity.types` accurately describes its contents: `Chat`, `Message`, `User`, `Artifact`, `ChatSummary` — database entity types. |

## Import Path Updates

26 import paths updated across the codebase to match the renamed file:

| Old Import | New Import |
|------------|------------|
| `@/lib/types/models.types` | `@/lib/types/entity.types` |

### Files Updated

All consumers of the renamed module had their import paths updated in the same commit (W3-E):

1. Feature modules (`features/chat/`, `features/artifacts/`, `features/sidebar/`, `features/voting/`, `features/visibility/`)
2. Data layer (`lib/data/chat.ts`, `lib/data/user.ts`, `lib/data/message.ts`, `lib/data/vote.ts`, `lib/data/artifact.ts`, `lib/data/suggestion.ts`)
3. Database schema (`lib/db/schema.ts`)
4. Type re-exports (`lib/types/index.ts`)
5. Auth utilities (`lib/auth/`)
6. Component files consuming entity types directly

## Symbol Renames

| Old Name | New Name | File | Wave | Reason |
|----------|----------|------|------|--------|
| `PureArtifactPanel` | `ArtifactPanelGate` | `features/artifacts/components/artifact-panel.tsx` | W2b-fix | Export name did not match the component's purpose (visibility gate, not a "pure" panel). |
