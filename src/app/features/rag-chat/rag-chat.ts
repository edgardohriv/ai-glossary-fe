import { ChatHeaderComponent } from '../../shared/chat-header/chat-header';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RagChatService } from './services/rag-chat.service';
import { ChatMessage } from './models/rag-chat.model';
import { RagMessageBubbleComponent } from './components/message-bubble/message-bubble';
import { RagTypingIndicatorComponent } from './components/typing-indicator/typing-indicator';
import { RagErrorBannerComponent } from './components/error-banner/error-banner';
import { RagChatInputComponent } from './components/rag-chat-input/rag-chat-input';

@Component({
  selector: 'app-rag-chat',
  host: {
    class: 'flex flex-col flex-1 min-h-0 overflow-hidden',
  },
  imports: [
    ChatHeaderComponent,
    RagMessageBubbleComponent,
    RagTypingIndicatorComponent,
    RagErrorBannerComponent,
    RagChatInputComponent,
  ],
  templateUrl: './rag-chat.html',
})
export class RagChatComponent {
  private readonly ragChatService = inject(RagChatService);

  protected readonly messages = signal<ChatMessage[]>([{
    id: crypto.randomUUID(),
    role: 'assistant',
    content: 'Hello! I\'m your Arrivia Document Glossary assistant. '
           + 'Ask me anything about Arrivia\'s terminology, processes, or documentation.',
    timestamp: new Date(),
  }]);

  protected readonly isLoading  = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly inputValue = signal('');

  protected readonly canSend = computed(
    () => this.inputValue().trim().length > 0 && !this.isLoading()
  );

  protected readonly isEmpty = computed(() => this.messages().length === 0);

  private readonly scrollContainer = viewChild<ElementRef>('scrollContainer');

  async onSend(text: string): Promise<void> {
    if (!this.canSend()) return;

    const trimmedText = text.trim();
    this.error.set(null);

    // 1. Add user message
    this.messages.update(msgs => [
      ...msgs,
      { id: crypto.randomUUID(), role: 'user', content: trimmedText, timestamp: new Date() },
    ]);
    this.inputValue.set('');
    this.isLoading.set(true);
    this.scrollToBottom();

    // 2. Add empty assistant placeholder
    const assistantId = crypto.randomUUID();
    this.messages.update(msgs => [
      ...msgs,
      { id: assistantId, role: 'assistant', content: '', timestamp: new Date() },
    ]);

    // 3. Stream response
    try {
      const stream$ = await this.ragChatService.sendMessage(this.messages());
      stream$.subscribe({
        next: (chunk: string) => {
          this.messages.update(msgs =>
            msgs.map(m => m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m
            )
          );
          this.scrollToBottom();
        },
        error: (err: { message?: string }) => {
          this.error.set(err.message || 'Something went wrong. Please try again.');
          this.messages.update(msgs => msgs.filter(m => m.id !== assistantId));
          this.isLoading.set(false);
        },
        complete: () => {
          this.isLoading.set(false);
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to the server.';
      this.error.set(message);
      this.messages.update(msgs => msgs.filter(m => m.id !== assistantId));
      this.isLoading.set(false);
    }
  }

  onDismissError(): void {
    this.error.set(null);
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
