export type VisibilityType = 'public' | 'private';
export type RoleType = 'user' | 'assistant' | 'system';
export type ArtifactKind = 'text' | 'code' | 'image' | 'sheet';

export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  visibility: VisibilityType;
}

export interface MessageSummary {
  id: string;
  role: RoleType;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  kind: ArtifactKind;
  createdAt: string;
}
