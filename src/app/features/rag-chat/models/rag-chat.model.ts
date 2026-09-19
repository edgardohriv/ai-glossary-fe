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
  model: string;
  options: {
    num_ctx: number;
  };
}

/**
 * A single chunk from the RAG service SSE stream (OpenAI Chat Completions delta format).
 * Each event arrives as:
 *   data: {"choices":[{"delta":{"content":"chunk text"},"finish_reason":null}]}
 * and the stream is terminated by the sentinel event:
 *   data: [DONE]
 */
export interface ApiStreamChunk {
  choices: ApiStreamChoice[];
}

export interface ApiStreamChoice {
  delta: ApiStreamDelta;
  /** `null` while streaming; a string (e.g. "stop") on the final content chunk */
  finish_reason: string | null;
}

export interface ApiStreamDelta {
  role?: MessageRole;
  content?: string;
}

/** SSE sentinel payload sent by the RAG service to signal the end of the stream */
export const SSE_DONE_SENTINEL = '[DONE]';

/** Structured API error returned when the server responds with a non-2xx status */
export interface ChatApiError {
  code: 'network_error' | 'server_error' | 'rate_limited' | 'unknown';
  message: string;
  status?: number;
}
