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
 * A single chunk from the API stream.
 * The server sends: {"model":"...","message":{"role":"assistant","content":"chunk text"},"done":true|false,...}
 */
export interface ApiStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: MessageRole;
    content: string;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/** Structured API error returned when the server responds with a non-2xx status */
export interface ChatApiError {
  code: 'network_error' | 'server_error' | 'rate_limited' | 'unknown';
  message: string;
  status?: number;
}
