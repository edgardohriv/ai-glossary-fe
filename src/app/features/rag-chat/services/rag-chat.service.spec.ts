import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RagChatService } from './rag-chat.service';
import { ChatMessage } from '../models/rag-chat.model';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
    ...overrides,
  };
}

function makeReadableStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function makeResponse(body: ReadableStream<Uint8Array> | null, status = 200): Response {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    body,
    text: async () => '',
    clone: () => response,
  };
  return response as unknown as Response;
}

describe('RagChatService', () => {
  let service: RagChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(RagChatService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sendMessage()', () => {
    it('should prepend the system prompt to the request body', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        makeResponse(makeReadableStream(['data: [DONE]\n\n']))
      );

      await service.sendMessage([makeMessage()]);

      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('Arrivia');
    });

    it('should filter out any system-role messages passed in the messages array', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        makeResponse(makeReadableStream(['data: [DONE]\n\n']))
      );

      await service.sendMessage([
        makeMessage({ role: 'system', content: 'ignore me' }),
        makeMessage({ role: 'user', content: 'hello' }),
      ]);

      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      const systemMessages = body.messages.filter((m: { role: string }) => m.role === 'system');
      expect(systemMessages).toHaveLength(1);
      expect(systemMessages[0].content).not.toBe('ignore me');
    });

    it('should truncate message content to MAX_CONTENT_LENGTH characters', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        makeResponse(makeReadableStream(['data: [DONE]\n\n']))
      );

      const longContent = 'a'.repeat(5000);
      await service.sendMessage([makeMessage({ content: longContent })]);

      const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
      const userMsg = body.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMsg.content.length).toBeLessThanOrEqual(4000);
    });

    it('should throw a network_error if fetch fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network failure'));

      await expect(service.sendMessage([makeMessage()])).rejects.toMatchObject({
        code: 'network_error',
      });
    });

    it('should throw a server_error with status if response is not ok (500)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(null, 500));

      await expect(service.sendMessage([makeMessage()])).rejects.toMatchObject({
        code: 'server_error',
        status: 500,
      });
    });

    it('should throw a rate_limited error if response status is 429', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(null, 429));

      await expect(service.sendMessage([makeMessage()])).rejects.toMatchObject({
        code: 'rate_limited',
        status: 429,
      });
    });

    it('should emit content chunks from the SSE stream', async () => {
      const chunk1 = 'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n';
      const chunk2 = 'data: {"choices":[{"delta":{"content":" World"},"finish_reason":null}]}\n\n';
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        makeResponse(makeReadableStream([chunk1, chunk2, 'data: [DONE]\n\n']))
      );

      const stream$ = await service.sendMessage([makeMessage()]);
      const received: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream$.subscribe({ next: v => received.push(v), error: reject, complete: resolve });
      });

      expect(received).toEqual(['Hello', ' World']);
    });

    it('should complete the Observable when [DONE] is received', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        makeResponse(makeReadableStream(['data: [DONE]\n\n']))
      );

      const stream$ = await service.sendMessage([makeMessage()]);
      let completed = false;
      await new Promise<void>((resolve, reject) => {
        stream$.subscribe({
          error: reject,
          complete: () => {
            completed = true;
            resolve();
          },
        });
      });

      expect(completed).toBe(true);
    });

    it('should emit an error if the stream is interrupted', async () => {
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode('data: partial'));
          controller.error(new Error('Connection lost'));
        },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(errorStream));

      const stream$ = await service.sendMessage([makeMessage()]);
      const error = await new Promise(resolve => {
        stream$.subscribe({ error: resolve, complete: () => resolve(null) });
      });

      expect(error).toMatchObject({ code: 'network_error' });
    });

    it('should cancel the reader on Observable unsubscription', async () => {
      const encoder = new TextEncoder();
      let cancelCalled = false;
      const slowStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n'
            )
          );
          // Never closed — simulates an ongoing stream
        },
        cancel() {
          cancelCalled = true;
        },
      });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeResponse(slowStream));

      const stream$ = await service.sendMessage([makeMessage()]);
      const sub = stream$.subscribe({ next: () => {} });

      await new Promise(resolve => setTimeout(resolve, 20));
      sub.unsubscribe();
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(cancelCalled).toBe(true);
    });
  });
});
