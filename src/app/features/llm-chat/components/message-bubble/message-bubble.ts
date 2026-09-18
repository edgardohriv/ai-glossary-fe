import { Component, computed, input } from '@angular/core';
import { marked } from 'marked';
import { ChatMessage } from '../../models/llm-chat.model';

@Component({
  selector: 'app-message-bubble',
  imports: [],
  templateUrl: './message-bubble.html',
})
export class MessageBubbleComponent {
  readonly message = input.required<ChatMessage>();

  protected readonly isUser = computed(() => this.message().role === 'user');

  protected readonly renderedContent = computed(() => {
    const msg = this.message();
    if (msg.role === 'assistant') {
      return marked.parse(msg.content || '…') as string;
    }
    return msg.content;
  });

  protected readonly formattedTime = computed(() => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }).format(this.message().timestamp);
  });
}
