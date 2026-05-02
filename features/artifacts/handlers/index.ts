/**
 * Side-effect module: registers all artifact handlers into the handler registry.
 *
 * Import this module before tool execution to ensure all handlers are available.
 * Registration happens at module evaluation time — no function call needed.
 *
 * Usage (in chat API route):
 *   import "@/features/artifacts/handlers"
 *
 * All 4 kinds are registered (text, code, sheet, image) even though the
 * createArtifact tool only exposes 3 kinds (text, code, sheet). Image
 * artifacts are created via code execution, not AI generation, but still
 * need a handler entry for update/persistence support.
 */

import { registerArtifactHandler } from "@/lib/ai/artifact-handlers"

import { codeHandler } from "./code-handler"
import { imageHandler } from "./image-handler"
import { sheetHandler } from "./sheet-handler"
import { textHandler } from "./text-handler"

// ── Register all artifact handlers ───────────────────────────

registerArtifactHandler("text", textHandler)
registerArtifactHandler("code", codeHandler)
registerArtifactHandler("sheet", sheetHandler)
registerArtifactHandler("image", imageHandler)
