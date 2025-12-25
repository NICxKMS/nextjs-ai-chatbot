/**
 * Shared Services
 *
 * Client-side utilities and API services shared across features.
 *
 * @module shared/services
 */

export { pingEndpoint } from "./network-api";

// Tool Renderer Registry
export {
    type DocumentOperationType,
    type DocumentPreviewProps,
    type DocumentToolCallProps,
    type DocumentToolResultProps,
    FallbackToolRenderer,
    ToolRendererProvider,
    type ToolRenderers,
    useToolRenderers,
} from "./tool-renderer-registry";
