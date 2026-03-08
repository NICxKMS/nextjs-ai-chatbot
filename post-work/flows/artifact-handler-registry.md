FLOW: Handler Registry
ENTRY: Module evaluation of `@/features/artifacts/handlers` (side-effect import in `app/api/chat/route.ts`)

STEPS:
  1. `app/api/chat/route.ts` line 9: `import "@/features/artifacts/handlers"` — bare side-effect import at module top level
     - This import is at the top of the chat API route module, ensuring handlers are registered BEFORE any tool execution

  2. `features/artifacts/handlers/index.ts` evaluates:
     - Imports `registerArtifactHandler` from `@/lib/ai/artifact-handlers`
     - Imports all 4 handler implementations:
       - `textHandler` from `./text-handler`
       - `codeHandler` from `./code-handler`
       - `sheetHandler` from `./sheet-handler`
       - `imageHandler` from `./image-handler`

  3. Four `registerArtifactHandler()` calls execute at module evaluation time:
     - `registerArtifactHandler("text", textHandler)`
     - `registerArtifactHandler("code", codeHandler)`
     - `registerArtifactHandler("sheet", sheetHandler)`
     - `registerArtifactHandler("image", imageHandler)`

  4. `registerArtifactHandler(kind, handler)` (lib/ai/artifact-handlers.ts:33):
     - Checks `handlers.has(kind)` → throws if duplicate (programming error guard)
     - `handlers.set(kind, handler)` → Map stores kind → handler mapping
     - Module-level `Map<ArtifactKind, ArtifactHandler>` — singleton, persists for server lifetime

  5. At tool execution time, `getArtifactHandler(kind)` (lib/ai/artifact-handlers.ts:45):
     - `handlers.get(kind)` → returns registered handler
     - If not found → throws `AppError.notFound("not_found:artifact:artifact_not_found", ...)` — indicates registration gap

  --- HANDLER IMPLEMENTATIONS ---

  6. Each handler conforms to `ArtifactHandler` interface:
     ```
     type ArtifactHandler = {
       create(params: CreateArtifactParams): Promise<string>
       update(params: UpdateArtifactParams): Promise<string>
     }
     ```

  7. Handler streaming strategies:
     | Kind   | AI SDK Call    | Delta Type          | Semantics | Streaming Utility                |
     |--------|---------------|---------------------|-----------|----------------------------------|
     | text   | streamText()  | artifact-textDelta  | APPEND    | collectTextStreamDeltas()        |
     | code   | streamObject()| artifact-codeDelta  | REPLACE   | collectReplacingObjectStream()   |
     | sheet  | streamObject()| artifact-sheetDelta | REPLACE   | collectReplacingObjectStream()   |
     | image  | N/A           | N/A                 | N/A       | No AI — returns empty/unchanged  |

  8. Streaming utilities (features/artifacts/handlers/stream-artifact-deltas.ts):
     - `collectTextStreamDeltas({ fullStream, chatStream, eventType })`:
       - Iterates `fullStream`, filters for `type === "text-delta"` + non-null `.text`
       - APPENDS each delta to `content` string
       - Writes each delta as `{ type: eventType, content: part.text }` to chatStream
       - Returns final accumulated `content`
     - `collectReplacingObjectStream({ fullStream, chatStream, eventType, pickContent })`:
       - Iterates `fullStream`, filters for `type === "object"` + non-null `pickContent(part.object)`
       - REPLACES `content` with latest object value
       - Writes full current value as `{ type: eventType, content: nextContent }` to chatStream
       - Returns final `content`

EXIT: All 4 handlers registered in module-level Map, accessible via `getArtifactHandler(kind)` for the lifetime of the server process

BOTTLENECKS:
  - Step 1 (side-effect import): Handler registration happens at module load time. If the handlers module imports heavy dependencies (they import from `ai` SDK, `@/lib/ai/internal-models`, etc.), this adds to the cold start time of the chat API route.
  - Step 8 (REPLACE streaming): For code/sheet, `collectReplacingObjectStream` writes the FULL content on every object part. As the object grows, each delta becomes larger. For a 1000-line code artifact, late-stage deltas send ~1000 lines each.

WASTE:
  - Step 3 (image handler registration): Image handler is registered but its `create()` returns `""` and `update()` returns `currentContent` unchanged. It exists for "type completeness" but consumes a Map entry that will never produce meaningful output through the standard tool pipeline.
  - Step 8 (REPLACE semantics overhead): Each intermediate REPLACE delta is fully transmitted over SSE, processed by StreamBridge, and written to the artifact store — even though only the final value matters for persistence. The intermediate values exist purely for streaming preview.

SIMPLIFICATION OPPORTUNITIES:
  - REPLACE streaming could be optimized with delta compression — instead of sending the full code/CSV on each update, send only the diff from the previous version. This would dramatically reduce SSE bandwidth for large artifacts.
  - The handler registry could use a simple object literal instead of a Map, since `ArtifactKind` is a known finite union. A `Record<ArtifactKind, ArtifactHandler>` would be type-checked at compile time without runtime guards.
  - The side-effect import pattern works but is fragile — if the import is removed or the module is tree-shaken, handlers won't be registered. Consider an explicit `initializeHandlers()` function call for clarity.
