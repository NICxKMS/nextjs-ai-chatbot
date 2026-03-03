/**
 * Feature-level re-exports of the canonical model types from lib/.
 *
 * Consumers within `features/models/` and external features that need model
 * types should import from here rather than reaching into `lib/types/` directly.
 */
export type { ModelMetadata, ProviderId } from "@/lib/types/model.types"
export {
	ARTIFACT_MODEL,
	DEFAULT_CHAT_MODEL,
	TITLE_MODEL,
} from "@/lib/types/model.types"
