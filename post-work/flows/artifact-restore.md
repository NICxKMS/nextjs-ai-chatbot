FLOW: Artifact Restore
ENTRY: User clicks "Restore this version" button in VersionFooter while viewing a non-current version

STEPS:
  1. `VersionFooter` (features/artifacts/components/version-footer.tsx:97) → user clicks "Restore this version" button → `setIsMutating(true)`
  2. `getVersionTimestamp(versions, currentVersionIndex)` → extracts ISO timestamp string from `versions[currentVersionIndex].createdAt`
  3. `fetch("/api/artifact", { method: "POST", body: { id: artifactId, timestamp, mode: "restore" } })`:
     - `artifactId` read from `useArtifactSelector(s => s.artifactId)` — store subscription for just the ID field
     - Body matches `restoreArtifactSchema` (mode: "restore", id: UUID, timestamp: ISO datetime)

  4. **Server**: `POST /api/artifact` (app/api/artifact/route.ts):
     - `validateOrigin(request)` — CSRF check
     - `getAppSession()` — auth check
     - `artifactPostBodySchema.safeParse(body)` → discriminated union matches `mode: "restore"` → `handleRestore()`

  5. `handleRestore()` (route.ts ~line 155):
     - `getArtifactById(data.id)` — fetches latest version → existence check
     - Ownership check: `existing.userId !== userId` → throws `AppError.forbidden`
     - `restorePoint = new Date(data.timestamp)` — the version to keep
     - `afterRestore = new Date(restorePoint.getTime() + 1)` — 1ms after restore point
     - `deleteArtifactVersion(data.id, afterRestore)` → DELETE WHERE `id = ? AND createdAt >= afterRestore`

  6. DB operation (lib/data/artifact.ts:103): `db.delete(artifacts).where(and(eq(id, artifactId), gte(createdAt, afterRestore)))`
     - Deletes ALL versions strictly AFTER the restore point timestamp
     - The restore point version itself is preserved (strict > via +1ms offset)
     - This is destructive — deleted versions cannot be recovered

  7. Server returns `Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } })`

  8. **Client** response handling (version-footer.tsx:108):
     - If `!response.ok` → `toast.error("Failed to restore version. Please try again.")`
     - If `response.ok`:
       - `await onVersionRestore?.()` — calls `mutateVersions()` from parent ArtifactPanel → SWR revalidates `/api/artifact?id=<id>` → fresh version list from server
       - `handleVersionChange("latest")` → `setCurrentVersionIndex(panelVersions.length - 1)` — navigates to what is now the latest (restored) version

  9. ArtifactPanel's SWR response arrives → `panelVersions` updated (reversed for chronological order) → version footer disappears (now viewing current version) → editor shows restored content

  10. `setIsMutating(false)` in finally block

EXIT: Later versions deleted from DB, SWR cache refreshed, user sees restored version as the current version, version footer hidden

BOTTLENECKS:
  - Step 5 (getArtifactById): Existence + ownership check requires a DB query before the delete.
  - Step 6 (DELETE): The delete is a potentially large operation if many versions exist after the restore point. No batch size limit.
  - Step 8 (SWR revalidation): Full re-fetch of all versions after restore. This is necessary (unlike save, where optimistic update works) because the server determined which versions to delete. The client cannot predict the exact result.

WASTE:
  - Step 5: `getArtifactById` fetches the LATEST version (for ownership check), but the user is restoring a PAST version. If the latest version is very large (e.g., big code artifact), this loads unnecessary content just for a `userId` comparison.
  - Step 6: The `+ 1ms` offset to convert ">=  afterRestore" into effectively "> restorePoint" is a fragile timestamp arithmetic. If two versions share the same millisecond timestamp (unlikely but possible with rapid saves), the behavior is ambiguous.

SIMPLIFICATION OPPORTUNITIES:
  - The ownership check could use a lightweight query: `SELECT userId FROM artifacts WHERE id = ? LIMIT 1` instead of fetching the full row.
  - The `+1ms` offset pattern could be replaced with a direct `> restorePoint` comparison (`gt` instead of `gte` with offset) for clarity. Drizzle ORM supports `gt()`.
  - Consider making restore non-destructive by adding a `deletedAt` soft-delete column instead of hard deleting versions. This would allow undo-restore.
