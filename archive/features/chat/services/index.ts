/**
 * Chat Services
 *
 * Client-side API services for chat feature.
 *
 * @module features/chat/services
 */

export {
    type Attachment,
    convertBlobToDataUrl,
    type FileUploadResponse,
    uploadFile,
} from "./chat-api";
export {
    createModelService,
    defaultModelService,
    getDefaultModelId,
    getModels,
    type IModelPersistence,
    type IModelService,
} from "./model-service";
