import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatMessage, ChatRequest, OpenAiStreamChunk } from '../models/chat.model';

const SYSTEM_PROMPT =
  `You are a helpful assistant for Arrivia's Document Glossary. ` +
  `Your purpose is to clearly explain terminology, concepts, and processes ` +
  `found in Arrivia's business documentation. ` +
  `Provide accurate, concise, and well-structured answers. ` +
  `When relevant, use bullet points or short definitions. ` +
  `If a question is outside your knowledge domain, acknowledge it politely ` +
  `and redirect to relevant glossary topics you can help with.`;

const API_ENDPOINT = '/api/chat';
const MAX_CONTENT_LENGTH = 4_000; // characters per user message

@Injectable({ providedIn: 'root' })
export class ChatService {

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
    } catch {
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
        } catch {
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
