import { Component, ElementRef, effect, inject, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-rag-chat-input',
  imports: [],
  templateUrl: './rag-chat-input.html',
})
export class RagChatInputComponent {
  readonly value    = input('');
  readonly disabled = input(false);

  readonly valueChange = output<string>();
  readonly send        = output<string>();

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  constructor() {
    effect(() => {
      const val = this.value();
      const el = this.textareaRef()?.nativeElement;
      if (el) {
        el.value = val;
        this.autoResize(el);
      }
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.valueChange.emit(target.value);
    this.autoResize(target);
  }

  protected onSend(): void {
    const text = this.value().trim();
    if (text && !this.disabled()) {
      this.send.emit(text);
    }
  }

  private autoResize(textarea: HTMLTextAreaElement): void {
    textarea.style.height = 'auto';
    // Clamp between 1 row (40px) and 5 rows (160px)
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }
}
