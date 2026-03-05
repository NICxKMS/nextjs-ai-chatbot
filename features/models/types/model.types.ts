/**
 * Feature-level re-exports of the canonical model types from lib/.
 *
 * Consumers within `features/models/` and external features that need model
 * types should import from here rather than reaching into `lib/types/` directly.
 */
export type { ModelMetadata, ProviderId } from "@/lib/types/model.types"
export { MODEL_COOKIE_NAME } from "@/lib/types/model.types"
