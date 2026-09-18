import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatMessage, ChatRequest, ApiStreamChunk } from '../models/llm-chat.model';

// const SYSTEM_PROMPT =
//   `You are a helpful assistant for Arrivia's Document Glossary. ` +
//   `Your purpose is to clearly explain terminology, concepts, and processes ` +
//   `found in Arrivia's business documentation. ` +
//   `Provide accurate, concise, and well-structured answers. ` +
//   `When relevant, use bullet points or short definitions. ` +
//   `If a question is outside your knowledge domain, acknowledge it politely ` +
//   `and redirect to relevant glossary topics you can help with.`;


const SYSTEM_PROMPT =
  `You are a helpful assistant to answer any kind of questions related to cooking.` +
  `Provide enough information, and well-structured answers. ` +
  `When relevant, use bullet points or short definitions. ` +
  `If a question is outside your knowledge domain, acknowledge it politely ` +
  `and redirect to relevant glossary topics you can help with.`;

const API_ENDPOINT = '/api/chat';
const MAX_CONTENT_LENGTH = 4_000; // characters per user message

/**
 * Scans a text buffer for complete top-level JSON objects delimited by `{...}`,
 * ignoring braces inside string literals. Works regardless of whether the objects
 * arrive as compact single-line NDJSON, pretty-printed multi-line JSON, or wrapped
 * in SSE "data: " framing — anything outside a `{...}` span is simply skipped.
 *
 * @returns the extracted object strings, plus the unconsumed remainder to keep buffering
 */
function extractJsonObjects(buffer: string): { objects: string[]; rest: string } {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        objects.push(buffer.slice(start, i + 1));
        start = -1;
      }
    }
  }

  // Keep only the unconsumed tail: an in-progress object, or trailing whitespace/noise.
  const rest = start !== -1 ? buffer.slice(start) : '';
  return { objects, rest };
}

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
      model: 'llama3.1:8b',
      options: {
        num_ctx: 8192,
      },
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
    } catch (fetchErr) {
      console.error('[LlmChatService] fetch() threw before a response was received', fetchErr);
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
      const bodyText = await response.clone().text().catch(() => '<unreadable>');
      console.error('[LlmChatService] non-OK response body:', bodyText);
      throw { code, message: userMessage, status: response.status };
    }

    if (!response.body) {
      console.error('[LlmChatService] response.body is null — no readable stream');
      throw { code: 'unknown', message: 'The server returned an empty response.' };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return new Observable<string>(observer => {
      const pump = async (): Promise<void> => {
        let buffer = '';

        const handleObject = (raw: string): boolean => {
          try {
            const parsed: ApiStreamChunk = JSON.parse(raw);
            const content = parsed.message?.content;
            if (content) {
              observer.next(content);
            }
            if (parsed.done) {
              observer.complete();
              return true;
            }
          } catch (parseErr) {
            console.warn('[LlmChatService] failed to JSON.parse extracted object:', raw, parseErr);
          }
          return false;
        };

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              observer.complete();
              return;
            }

            buffer += decoder.decode(value, { stream: true });
            const { objects, rest } = extractJsonObjects(buffer);
            buffer = rest;

            for (const obj of objects) {
              if (handleObject(obj)) return;
            }
          }
        } catch (streamErr) {
          console.error('[LlmChatService] error while reading stream:', streamErr);
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
