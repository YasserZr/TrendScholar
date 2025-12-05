# AI Chat Feature Documentation

## Overview

The AI Chat feature allows users to have conversations with an AI assistant about specific research papers. All conversations are stored persistently and can be retrieved later.

## Architecture

### Database Schema

**Chat Model** (`prisma/schema.prisma`)
- `id`: Unique identifier
- `title`: Optional title (auto-generated from first message)
- `paperId`: Reference to associated paper (optional)
- `userId`: Reference to user who owns the chat
- `metadata`: JSON field for additional settings
- `messages`: Related messages collection

**Message Model**
- `id`: Unique identifier
- `role`: USER | ASSISTANT | SYSTEM
- `content`: Message text content
- `promptTokens`: Token count for prompt
- `completionTokens`: Token count for completion
- `chatId`: Reference to parent chat
- `createdAt`: Timestamp

### API Endpoints

#### `GET /api/chat`
List all chats for the current user.

Query Parameters:
- `paperId` (optional): Filter chats by paper

Response:
```json
{
  "chats": [
    {
      "id": "chat_123",
      "title": "Discussion: Paper Title",
      "paperId": "paper_456",
      "paper": {
        "id": "paper_456",
        "title": "Paper Title",
        "arxivId": "2301.00001"
      },
      "messages": [...],
      "_count": { "messages": 5 },
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T01:00:00Z"
    }
  ]
}
```

#### `POST /api/chat`
Create a new chat conversation.

Request Body:
```json
{
  "paperId": "paper_456",
  "title": "My Chat Title",
  "initialMessage": "What are the main findings?"
}
```

Response:
```json
{
  "chat": {
    "id": "chat_123",
    "title": "My Chat Title",
    "paperId": "paper_456",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

#### `GET /api/chat/[chatId]`
Get chat details with full message history.

Response:
```json
{
  "chat": {
    "id": "chat_123",
    "title": "Discussion: Paper Title",
    "paper": {
      "id": "paper_456",
      "title": "Paper Title",
      "abstract": "...",
      "authors": ["Author 1", "Author 2"],
      "summaries": [...]
    },
    "messages": [
      {
        "id": "msg_1",
        "role": "USER",
        "content": "What are the main findings?",
        "createdAt": "2025-01-01T00:00:00Z"
      },
      {
        "id": "msg_2",
        "role": "ASSISTANT",
        "content": "The main findings are...",
        "promptTokens": 100,
        "completionTokens": 200,
        "createdAt": "2025-01-01T00:00:05Z"
      }
    ]
  }
}
```

#### `POST /api/chat/[chatId]`
Send a message and receive AI response.

Request Body:
```json
{
  "message": "What are the main findings?"
}
```

Response:
```json
{
  "userMessage": {
    "id": "msg_1",
    "role": "USER",
    "content": "What are the main findings?",
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "assistantMessage": {
    "id": "msg_2",
    "role": "ASSISTANT",
    "content": "The main findings are...",
    "createdAt": "2025-01-01T00:00:05Z"
  },
  "usage": {
    "promptTokens": 100,
    "completionTokens": 200,
    "totalTokens": 300
  }
}
```

#### `DELETE /api/chat/[chatId]`
Delete a chat and all its messages.

Response:
```json
{
  "success": true
}
```

### AI Integration

**Gemini Chat Completion** (`src/lib/gemini.ts`)

```typescript
import { generateChatCompletion } from "@/lib/gemini";

const result = await generateChatCompletion({
  messages: [
    { role: "user", content: "What is this paper about?" }
  ],
  paperContext: {
    title: "Paper Title",
    abstract: "Paper abstract...",
    summary: "AI generated summary...",
    authors: ["Author 1", "Author 2"]
  },
  temperature: 0.7,
  maxTokens: 2048
});

console.log(result.content); // AI response
console.log(result.usage); // Token usage
```

The AI assistant:
- Uses **gemini-2.5-flash** model
- Has context about the research paper (title, abstract, summary, authors)
- Maintains conversation history
- Provides detailed, accurate responses about research methodologies, findings, and implications

## Components

### `<ChatInterface>`
Main chat UI component.

Props:
- `chatId`: ID of the chat conversation
- `paperId` (optional): ID of the associated paper
- `initialMessages` (optional): Pre-loaded message history

Features:
- Real-time message streaming
- Auto-scroll to latest message
- Loading states with animated indicators
- Error handling and retry
- Optimistic UI updates

### `<ChatMessage>`
Individual message display component.

Props:
- `role`: "user" | "assistant"
- `content`: Message text content
- `timestamp` (optional): Message timestamp

### `<ChatInput>`
Message input component with send button.

Props:
- `onSend`: Callback function when message is sent
- `disabled` (optional): Disable input
- `placeholder` (optional): Placeholder text

Features:
- Multi-line textarea
- Enter to send (Shift+Enter for new line)
- Auto-focus on mount
- Disabled state during loading

### `<PaperChatSection>`
Wrapper component for paper detail pages.

Props:
- `paperId`: ID of the paper
- `paperTitle`: Title of the paper

Features:
- Automatic chat initialization
- Reuses existing chats for the same paper
- Collapsible UI (start collapsed)
- Error handling

## Usage

### 1. Add to Paper Detail Page

```tsx
import { PaperChatSection } from "@/components/papers";

export default function PaperPage({ paper }) {
  return (
    <div>
      {/* ... other paper content ... */}
      
      {session?.user && (
        <PaperChatSection 
          paperId={paper.id} 
          paperTitle={paper.title} 
        />
      )}
    </div>
  );
}
```

### 2. Standalone Chat

```tsx
import { ChatInterface } from "@/components/chat";

export default function ChatPage({ chatId, messages }) {
  return (
    <div className="h-screen">
      <ChatInterface
        chatId={chatId}
        initialMessages={messages}
      />
    </div>
  );
}
```

## Database Migration

To apply the schema changes:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name add_chat_models
```

## Environment Variables

Required:
- `GEMINI_API_KEY`: Google Gemini API key
- `DATABASE_URL`: PostgreSQL connection string

## Features

✅ **Persistent Chat History**: All conversations are saved to the database
✅ **Paper Context**: AI has access to paper details, abstract, and summary
✅ **Token Tracking**: Track API usage per message
✅ **Auto-Generated Titles**: Chat titles are automatically generated from the first message
✅ **Multi-Chat Support**: Users can have multiple conversations about the same paper
✅ **Secure**: All endpoints require authentication
✅ **Real-time Updates**: Optimistic UI updates for better UX

## Future Enhancements

- [ ] Streaming responses for longer conversations
- [ ] Chat sharing between users
- [ ] Export chat history as PDF/Markdown
- [ ] Chat search functionality
- [ ] Suggested questions based on paper content
- [ ] Rate limiting per user/plan
- [ ] Multi-paper context (compare papers)
- [ ] Voice input/output support

## Error Handling

The chat system handles various error scenarios:

1. **Authentication Errors**: 401 Unauthorized
2. **Missing Paper**: 404 Not Found
3. **Gemini API Errors**: 503 Service Unavailable
4. **Quota Exceeded**: 429 Too Many Requests
5. **General Errors**: 500 Internal Server Error

All errors are displayed to the user with appropriate messages and retry options.
