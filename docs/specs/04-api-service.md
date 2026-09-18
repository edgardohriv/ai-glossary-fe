# Spec 04 — API Service

## Overview

`LlmChatService` is the single service responsible for all communication with the backend. It sends the conversation history to `POST /api/chat` and returns an `Observable<string>` that emits content chunks as they arrive from the server-sent event (SSE) stream.

The service does **not** use Angular's `HttpClient` for streaming — it uses the native browser `fetch` API with `ReadableStream` for SSE parsing, which is the reliable approach for POST-based SSE endpoints.

---

## 1. TypeScript Types

**File:** `src/app/features/llm-chat/models/llm-chat.model.ts`

```typescript
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
```

---

## 2. System Prompt Constant

Define as a top-level constant in `llm-chat.service.ts` (not in the model file):

```typescript
const SYSTEM_PROMPT =
  `You are a helpful assistant for Arrivia's Document Glossary. ` +
  `Your purpose is to clearly explain terminology, concepts, and processes ` +
  `found in Arrivia's business documentation. ` +
  `Provide accurate, concise, and well-structured answers. ` +
  `When relevant, use bullet points or short definitions. ` +
  `If a question is outside your knowledge domain, acknowledge it politely ` +
  `and redirect to relevant glossary topics you can help with.`;
```

---

## 3. `LlmChatService`

**File:** `src/app/features/llm-chat/services/llm-chat.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatMessage, ChatRequest, OpenAiStreamChunk } from '../models/llm-chat.model';

const SYSTEM_PROMPT = `...`; // see section 2

const API_ENDPOINT = '/api/chat';
const MAX_CONTENT_LENGTH = 4_000; // characters per user message

@Injectable({ providedIn: 'root' })
export class LlmChatService {

  /**
   * Sends the conversation history to the API and returns an Observable
   * that emits content delta strings as they stream in.
   *
   * @param messages - Full conversation history including the latest user message
   * @returns Observable<string> — each emission is a content chunk
   * @throws ChatApiError — if the request cannot be initiated (network down, etc.)
   */
  sendMessage(messages: ChatMessage[]): Promise<Observable<string>> {
    const body: ChatRequest = {
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role,
            content: m.content.slice(0, MAX_CONTENT_LENGTH),
          })),
      ],
    };

    return this.streamResponse(body);
  }

  private async streamResponse(body: ChatRequest): Promise<Observable<string>> {
    let response: Response;
    try {
      response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      throw {
        code: 'network_error',
        message: 'Unable to reach the server. Check your connection and try again.',
      };
    }

    if (!response.ok) {
      const code = response.status === 429 ? 'rate_limited' : 'server_error';
      const userMessage =
        response.status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : `Server error (${response.status}). Please try again.`;
      throw { code, message: userMessage, status: response.status };
    }

    if (!response.body) {
      throw { code: 'unknown', message: 'The server returned an empty response.' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new Observable<string>(observer => {
      const pump = async (): Promise<void> => {
        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              observer.complete();
              return;
            }

            const rawChunk = decoder.decode(value, { stream: true });
            const lines = rawChunk.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;

              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                observer.complete();
                return;
              }

              try {
                const parsed: OpenAiStreamChunk = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  observer.next(content);
                }
              } catch {
                // Ignore malformed JSON lines — partial SSE packets are normal
              }
            }
          }
        } catch (streamErr) {
          observer.error({
            code: 'network_error',
            message: 'The connection was interrupted. Please try again.',
          });
        }
      };

      pump();

      // Cleanup: cancel the reader when the subscription is unsubscribed
      return () => {
        reader.cancel().catch(() => {/* ignore */});
      };
    });
  }
}
```

---

## 4. API Contract

### Request

```
POST /api/chat
Content-Type: application/json
Accept: text/event-stream
```

**Body:**
```json
{
  "stream": true,
  "messages": [
    { "role": "system",    "content": "You are a helpful assistant for..." },
    { "role": "assistant", "content": "Hello! I'm your Arrivia..." },
    { "role": "user",      "content": "What does MBI stand for?" }
  ]
}
```

- The `system` message is **always** first and injected by `LlmChatService` — never from the UI.
- The full conversation history is sent on every request (OpenAI expects this for context).
- The latest user message is always the last element.

### Response (SSE stream)

```
Content-Type: text/event-stream
```

```
data: {"id":"chatcmpl-abc","choices":[{"delta":{"role":"assistant","content":""},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","choices":[{"delta":{"content":"MBI"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","choices":[{"delta":{"content":" stands for"},"finish_reason":null}]}

data: {"id":"chatcmpl-abc","choices":[{"delta":{"content":" Member Benefits Insurance."},"finish_reason":null}]}

data: [DONE]
```

Each `data:` line contains a JSON object. The service reads `choices[0].delta.content` and emits it to the Observable subscriber.

---

## 5. Error Handling Strategy

| Scenario | Error Code | User Message |
|---|---|---|
| No network / DNS failure | `network_error` | "Unable to reach the server. Check your connection and try again." |
| HTTP 4xx (not 429) | `server_error` | "Server error (4xx). Please try again." |
| HTTP 429 Too Many Requests | `rate_limited` | "Too many requests. Please wait a moment and try again." |
| HTTP 5xx | `server_error` | "Server error (5xx). Please try again." |
| Empty response body | `unknown` | "The server returned an empty response." |
| Stream interrupted | `network_error` | "The connection was interrupted. Please try again." |

The `LlmChatComponent.onSend()` method catches both:
1. The `Promise` rejection from `sendMessage()` (before the stream starts)
2. The `Observable` error notification (during streaming)

Both paths set `this.error` to the error message for display in `ErrorBannerComponent`.

---

## 6. `app.config.ts` Update

Add `provideHttpClient(withFetch())` to the providers array:

```typescript
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
  ],
};
```

> `provideHttpClient(withFetch())` is required even though `LlmChatService` uses native `fetch`, because other Angular internals (router prefetching, etc.) may use `HttpClient` and `withFetch()` enables the fetch-based backend globally.

---

## 7. Unit Tests for `LlmChatService`

**File:** `src/app/features/llm-chat/services/llm-chat.service.spec.ts`

Key test scenarios to cover:

```typescript
describe('LlmChatService', () => {
  describe('sendMessage()', () => {
    it('should prepend the system prompt to the request body');
    it('should filter out any system-role messages passed in the messages array');
    it('should truncate message content to MAX_CONTENT_LENGTH characters');
    it('should throw a network_error if fetch fails');
    it('should throw a server_error with status if response is not ok (500)');
    it('should throw a rate_limited error if response status is 429');
    it('should emit content chunks from the SSE stream');
    it('should complete the Observable when [DONE] is received');
    it('should emit an error if the stream is interrupted');
    it('should cancel the reader on Observable unsubscription');
  });
});
```

For testing the streaming behavior, use `vi.spyOn(globalThis, 'fetch')` to mock `fetch` with a controllable `ReadableStream`.

---

## 8. Proxy Configuration (Development)

During local development, the Angular dev server needs to proxy `/api/chat` to the backend. Create `proxy.conf.json` in the project root:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Update `angular.json` to reference it in the development serve configuration:

```json
"serve": {
  "configurations": {
    "development": {
      "buildTarget": "ai-glossary-fe:build:development",
      "proxyConfig": "proxy.conf.json"
    }
  }
}
```
