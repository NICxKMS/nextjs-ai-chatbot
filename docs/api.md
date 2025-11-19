# API Documentation

Complete API reference for the Next.js AI Chatbot.

## Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

### Regular Users
```http
Cookie: next-auth.session-token=<jwt-token>
```

### Guest Users
```http
Cookie: next-auth.session-token=<guest-token>
```

### Rate Limits
- **Regular**: 100 messages/day
- **Guest**: 20 messages/day

## Endpoints

### Authentication

#### POST /api/auth/signin
Sign in with email and password.

```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "type": "regular"
  }
}
```

#### POST /api/auth/register
Register new user account.

```json
// Request
{
  "email": "newuser@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "type": "regular"
  }
}
```

### Chat Operations

#### POST /api/chat
Send message and receive streaming response.

```json
// Request
{
  "id": "chat-uuid",
  "message": [
    {
      "role": "user",
      "content": "Hello, AI!",
      "attachments": []
    }
  ],
  "selectedChatModel": "gpt-4o-mini",
  "selectedVisibilityType": "private"
}
```

**Response (Server-Sent Events):**
```
event: data
data: {"type":"data-stream","content":"Hello!"}

event: data
data: {"type":"finish","usage":{"promptTokens":10,"completionTokens":15}}

event: finish
data: [DONE]
```

**Event Types:**
- `data-stream`: Streaming message content
- `chatTitle`: Generated title for new chats
- `appendMessage`: Message to append
- `finish`: Stream completion with usage

#### GET /api/chat/[id]/stream
Resume interrupted streaming.

**Parameters:**
- `id`: Chat UUID

**Response:** Same streaming format as POST /api/chat

**Conditions for Resume:**
- Last message from assistant
- Last message ≤ 15 seconds old
- User has access to chat

#### GET /api/history
Get user's chat list.

**Query Parameters:**
- `limit`: Number of chats (default: 20, max: 100)
- `cursor`: Pagination cursor (timestamp)

```json
// Response
{
  "chats": [
    {
      "id": "chat-uuid",
      "title": "Chat Title",
      "visibility": "private",
      "createdAt": "2024-01-15T10:30:00Z",
      "messageCount": 5
    }
  ],
  "hasMore": true,
  "nextCursor": "2024-01-14T15:20:00Z"
}
```

### Documents

#### POST /api/document
Create or update document.

```json
// Request
{
  "id": "doc-uuid",
  "title": "Document Title",
  "content": "Document content with **markdown**",
  "visibility": "private"
}

// Response
{
  "id": "doc-uuid",
  "title": "Document Title",
  "content": "Document content with **markdown**",
  "visibility": "private",
  "createdAt": "2024-01-15T10:30:00Z",
  "version": 1
}
```

#### GET /api/document/[id]
Get document by ID.

```json
// Response
{
  "id": "doc-uuid",
  "title": "Document Title",
  "content": "Document content",
  "visibility": "private",
  "createdAt": "2024-01-15T10:30:00Z",
  "versions": [
    {
      "version": 1,
      "content": "Version 1 content",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Files

#### POST /api/files/upload
Upload files for chat attachments.

**Request (multipart/form-data):**
```
file: [binary file data]
chatId: "chat-uuid"
```

```json
// Response
{
  "url": "https://storage.example.com/files/uuid.pdf",
  "name": "document.pdf",
  "size": 1024000,
  "type": "application/pdf",
  "chatId": "chat-uuid"
}
```

**Supported Types:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` (10MB)
- Documents: `.pdf`, `.txt`, `.md` (25MB)
- Code: `.js`, `.ts`, `.jsx`, `.tsx`, `.py` (5MB)

### Suggestions

#### GET /api/suggestions
Get AI-powered suggestions.

**Query Parameters:**
- `context`: Current chat context (optional)

```json
// Response
{
  "suggestions": [
    {
      "id": "suggestion-1",
      "text": "Help me debug this JavaScript function",
      "category": "programming"
    }
  ]
}
```

### Votes

#### POST /api/vote
Vote on chat message.

```json
// Request
{
  "chatId": "chat-uuid",
  "messageId": "message-uuid",
  "type": "up"
}

// Response
{
  "success": true,
  "vote": {
    "id": "vote-uuid",
    "type": "up",
    "chatId": "chat-uuid",
    "messageId": "message-uuid"
  }
}
```

## Data Models

### Chat
```typescript
interface Chat {
  id: string;
  userId: string;
  title: string;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  lastContext?: AppUsage;
}
```

### Message
```typescript
interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  attachments?: Attachment[];
  createdAt: string;
}

interface MessagePart {
  type: "text" | "image" | "file";
  text?: string;
  image?: { url: string; width: number; height: number };
  file?: { url: string; name: string; size: number; type: string };
}
```

### Document
```typescript
interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  version: number;
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  type: "regular" | "guest";
  createdAt: string;
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "error_code",
    "message": "Human readable error message",
    "details": { "additional": "context" }
  }
}
```

### Common Error Codes

#### Authentication
- `unauthorized:chat:missing_session` - No valid session
- `forbidden:chat:owner_mismatch` - Access denied

#### Rate Limiting
- `rate_limit:chat:daily_limit_exceeded` - Daily limit exceeded

#### Resources
- `not_found:chat` - Chat not found
- `not_found:document` - Document not found

#### Validation
- `bad_request:api:invalid_json` - Invalid JSON
- `bad_request:validation:invalid_field` - Invalid field value

## Client Examples

### JavaScript/TypeScript
```typescript
// Send message with streaming
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `next-auth.session-token=${token}`
  },
  body: JSON.stringify({
    id: 'new-chat',
    message: [{ role: 'user', content: 'Hello!' }],
    selectedChatModel: 'gpt-4o-mini',
    selectedVisibilityType: 'private'
  })
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      console.log(data);
    }
  }
}
```

### React Hook
```typescript
import { useChat } from '@your-org/chat-react';

const {
  messages,
  sendMessage,
  isLoading,
  error
} = useChat({
  chatId: 'chat-uuid',
  model: 'gpt-4o-mini'
});

// Send message
await sendMessage('Hello, AI!');
```

### cURL Examples
```bash
# Send message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=token" \
  -d '{
    "id": "test-chat",
    "message": [{"role": "user", "content": "Hello"}],
    "selectedChatModel": "gpt-4o-mini",
    "selectedVisibilityType": "private"
  }'

# Get chat history
curl -X GET http://localhost:3000/api/history?limit=10 \
  -H "Cookie: next-auth.session-token=token"

# Upload file
curl -X POST http://localhost:3000/api/files/upload \
  -F "file=@document.pdf" \
  -F "chatId=test-chat" \
  -H "Cookie: next-auth.session-token=token"
```

## Rate Limiting Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
```

## Caching Headers
```http
Cache-Control: private, max-age=300
ETag: "abc123"
Last-Modified: Wed, 15 Jan 2024 10:30:00 GMT
```
