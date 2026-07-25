/** The role of a chat participant */
export type MessageRole = 'user' | 'assistant' | 'system';

/** A single message in the conversation */
export interface ChatMessage {
  /** Unique identifier — use `crypto.randomUUID()` */
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

/**
 * The payload sent to POST /api/chat.
 * Mirrors the OpenAI Chat Completions API message format.
 */
export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  stream: true;
}

/**
 * A single chunk from the OpenAI SSE stream.
 * OpenAI sends: data: {"choices":[{"delta":{"content":"..."}}]}
 */
export interface OpenAiStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: MessageRole;
    };
    finish_reason: string | null;
  }>;
}

/** Structured API error returned when the server responds with a non-2xx status */
export interface ChatApiError {
  code: 'network_error' | 'server_error' | 'rate_limited' | 'unknown';
  message: string;
  status?: number;
}
