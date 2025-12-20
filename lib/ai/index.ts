/**
 * AI Integration Module - Public API
 * Ref: 05-ai-integration-optimal-design.md
 *
 * @module lib/ai
 */

// Providers
export { getOpenAI, getAnthropic, getGoogle } from './providers';

// Models
export {
  MODEL_REGISTRY,
  DEFAULT_MODEL_ID,
  getAvailableModels,
  getModelById,
  isValidModel,
} from './models';

// Tools
export {
  createDocument,
  updateDocument,
  getTools,
  type CreateDocumentToolProps,
  type UpdateDocumentToolProps,
  type GetToolsProps,
} from './tools';
