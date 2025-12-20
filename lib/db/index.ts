export { db } from './client';
export { withTransaction } from './transactions';

export {
  user,
  chat,
  message,
  vote,
  document,
  visibilityEnum,
  roleEnum,
  artifactKindEnum,
  type User,
  type NewUser,
  type Chat,
  type NewChat,
  type Message,
  type NewMessage,
  type Vote,
  type NewVote,
  type Document,
  type NewDocument,
  type VisibilityType,
  type RoleType,
  type ArtifactKind,
} from './schema';

export type { ChatSummary, MessageSummary, DocumentSummary } from './types';
