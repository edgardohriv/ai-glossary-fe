import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The chat feature a header is rendered for. */
export type ChatMode = 'rag' | 'llm';

const MODE_LABEL: Record<ChatMode, string> = {
  rag: 'RAG CHAT',
  llm: 'LLM CHAT',
};

const MODE_ROUTE: Record<ChatMode, string> = {
  rag: '/rag-chat',
  llm: '/llm-chat',
};

/**
 * Blue title bar shared by the `rag-chat` and `llm-chat` features.
 * Shows the feature name in the title and a button to switch to the other feature.
 */
@Component({
  selector: 'app-chat-header',
  imports: [RouterLink],
  templateUrl: './chat-header.html',
})
export class ChatHeaderComponent {
  /** The feature currently displayed. */
  readonly mode = input.required<ChatMode>();
  /** Whether the assistant is currently generating a reply. */
  readonly isLoading = input(false);

  protected readonly modeLabel = computed(() => MODE_LABEL[this.mode()]);

  private readonly otherMode = computed<ChatMode>(() => (this.mode() === 'rag' ? 'llm' : 'rag'));
  protected readonly switchLabel = computed(() => MODE_LABEL[this.otherMode()]);
  protected readonly switchRoute = computed(() => MODE_ROUTE[this.otherMode()]);
}
