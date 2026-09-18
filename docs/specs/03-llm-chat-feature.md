# Spec 03 — LLM Chat Feature

## Overview

The `llm-chat` feature is a single-page interface that fills the full viewport. It has a persistent header, a scrollable message list, and a fixed input area at the bottom. The page is the **only** page in this application.

---

## 1. Component Tree

```
LlmChatComponent  (src/app/features/llm-chat/llm-chat.ts)
├── Header section          ← inline in llm-chat.html, not a separate component
├── MessageBubbleComponent  (components/message-bubble/)  [repeated via @for]
├── TypingIndicatorComponent (components/typing-indicator/)  [shown while loading]
├── ErrorBannerComponent     (components/error-banner/)     [shown on API error]
└── LlmChatInputComponent    (components/llm-chat-input/)    [always visible]
```

---

## 2. Layout Structure

```
┌──────────────────────────────────────────────────────┐
│  HEADER  (h-16, primary-600 → primary-700 gradient)  │  ← fixed top
│  App logo + "Arrivia Document Glossary" title         │
│  Status indicator (Online / Connecting...)            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  MESSAGE LIST  (flex-1, overflow-y-auto)             │  ← scrollable
│  ┌────────────────────────────────────────────┐      │
│  │  [assistant msg bubble]                    │      │
│  └────────────────────────────────────────────┘      │
│                   ┌────────────────────────────────┐ │
│                   │  [user msg bubble]              │ │
│                   └────────────────────────────────┘ │
│  ┌────────────────────────────────────────────┐      │
│  │  [typing indicator — dots animation]       │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
├──────────────────────────────────────────────────────┤
│  [ERROR BANNER — shown only on error]                │  ← above input
├──────────────────────────────────────────────────────┤
│  CHAT INPUT  (shrink-0, white bg, shadow-chat)       │  ← fixed bottom
│  ┌──────────────────────────────────┐  [Send ▶]     │
│  │  textarea (auto-grow, 1-5 rows)  │              │  │
│  └──────────────────────────────────┘              │  │
└──────────────────────────────────────────────────────┘
```

The chat container uses `flex flex-col h-svh` (full small-viewport-height). The message list uses `flex-1 overflow-y-auto` to fill remaining space and scroll independently.

---

## 3. Chat Page State (Signals)

Declare these signals in `LlmChatComponent`:

```typescript
protected readonly messages    = signal<ChatMessage[]>([]);
protected readonly isLoading   = signal(false);
protected readonly error       = signal<string | null>(null);
protected readonly inputValue  = signal('');

// Derived
protected readonly canSend = computed(
  () => this.inputValue().trim().length > 0 && !this.isLoading()
);
protected readonly isEmpty = computed(() => this.messages().length === 0);
```

**Initial assistant greeting:** On component init (`ngOnInit` equivalent via constructor or `effect`), push one assistant message to `messages`:

```typescript
// In LlmChatComponent constructor or in ngOnInit equivalent
this.messages.set([{
  id: crypto.randomUUID(),
  role: 'assistant',
  content: 'Hello! I\'m your Arrivia Document Glossary assistant. '
         + 'Ask me anything about Arrivia\'s terminology, processes, or documentation.',
  timestamp: new Date(),
}]);
```

---

## 4. `LlmChatComponent` (`llm-chat.ts`)

```typescript
@Component({
  selector: 'app-llm-chat',
  imports: [
    MessageBubbleComponent,
    TypingIndicatorComponent,
    ErrorBannerComponent,
    LlmChatInputComponent,
  ],
  templateUrl: './llm-chat.html',
})
export class LlmChatComponent {
  private readonly llmChatService = inject(LlmChatService);

  protected readonly messages   = signal<ChatMessage[]>([/* initial greeting */]);
  protected readonly isLoading  = signal(false);
  protected readonly error      = signal<string | null>(null);
  protected readonly inputValue = signal('');

  protected readonly canSend = computed(
    () => this.inputValue().trim().length > 0 && !this.isLoading()
  );

  // Reference to scroll container (for auto-scroll)
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
      const stream$ = await this.llmChatService.sendMessage(this.messages());
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
        error: (err: Error) => {
          this.error.set(err.message || 'Something went wrong. Please try again.');
          // Remove empty assistant placeholder
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
    // Use requestAnimationFrame to scroll after render
    requestAnimationFrame(() => {
      const el = this.scrollContainer()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
```

### `llm-chat.html` Template

```html
<div class="flex flex-col h-full bg-neutral-50">

  <!-- Header -->
  <header class="shrink-0 h-16 flex items-center gap-3 px-4 md:px-6
                 bg-gradient-to-r from-primary-600 to-primary-700
                 shadow-md z-10"
          role="banner">
    <!-- Logo / Icon -->
    <div class="flex items-center justify-center w-9 h-9 rounded-xl
                bg-white/15 text-white shrink-0"
         aria-hidden="true">
      <!-- Inline SVG: simple book/doc icon -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="10" x2="16" y2="10"/>
        <line x1="8" y1="14" x2="12" y2="14"/>
      </svg>
    </div>

    <!-- Title -->
    <div class="min-w-0">
      <h1 class="text-white font-semibold text-base md:text-lg leading-tight truncate">
        Arrivia Document Glossary
      </h1>
      <p class="text-accent-200 text-xs" aria-live="polite">
        @if (isLoading()) { Thinking... } @else { Online }
      </p>
    </div>
  </header>

  <!-- Message List -->
  <main class="flex-1 overflow-y-auto px-4 py-4 md:px-6 scroll-smooth"
        #scrollContainer
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        aria-relevant="additions">

    <div class="max-w-3xl mx-auto flex flex-col gap-4">

      @if (isEmpty()) {
        <!-- Empty state hint -->
        <div class="flex flex-col items-center justify-center h-full py-16 gap-4"
             aria-hidden="true">
          <div class="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-primary-600" ...></svg>
          </div>
          <p class="text-neutral-500 text-sm text-center max-w-xs">
            Ask a question about Arrivia's documentation and terminology.
          </p>
        </div>
      }

      @for (message of messages(); track message.id) {
        <app-message-bubble [message]="message" />
      }

      @if (isLoading() && messages().length > 0
           && messages()[messages().length - 1].content === '') {
        <!-- Typing indicator shown before first chunk arrives -->
        <app-typing-indicator />
      }

    </div>
  </main>

  <!-- Error Banner -->
  @if (error()) {
    <app-error-banner
      [message]="error()!"
      (dismissed)="onDismissError()" />
  }

  <!-- Input Area -->
  <app-llm-chat-input
    [value]="inputValue()"
    [disabled]="isLoading()"
    (valueChange)="inputValue.set($event)"
    (send)="onSend($event)" />

</div>
```

---

## 5. `MessageBubbleComponent`

**File:** `components/message-bubble/message-bubble.ts`

```typescript
@Component({
  selector: 'app-message-bubble',
  imports: [], // No child components needed
  templateUrl: './message-bubble.html',
})
export class MessageBubbleComponent {
  readonly message = input.required<ChatMessage>();

  protected readonly isUser = computed(() => this.message().role === 'user');

  // Render markdown for assistant, plain text for user
  protected readonly renderedContent = computed(() => {
    const msg = this.message();
    if (msg.role === 'assistant') {
      // Use marked to render markdown; sanitization done in template via [innerHTML]
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
```

**Template** (`message-bubble.html`):

```html
<article
  [class]="isUser()
    ? 'flex justify-end'
    : 'flex justify-start items-start gap-2'"
  [attr.aria-label]="(isUser() ? 'You' : 'Assistant') + ' at ' + formattedTime()">

  <!-- Assistant avatar (not shown for user) -->
  @if (!isUser()) {
    <div class="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center
                text-white text-xs font-bold shrink-0 mt-0.5"
         aria-hidden="true">
      AI
    </div>
  }

  <div class="flex flex-col gap-1" [class.items-end]="isUser()">

    <!-- Bubble -->
    <div
      [class]="isUser()
        ? 'bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] md:max-w-[75%]'
        : 'bg-accent-50 text-neutral-800 border border-accent-200 rounded-2xl rounded-bl-sm px-4 py-3 max-w-[85%] md:max-w-[75%] prose prose-sm max-w-none'">

      @if (isUser()) {
        <!-- User message: plain text, preserve whitespace -->
        <p class="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {{ message().content }}
        </p>
      } @else {
        <!-- Assistant message: rendered markdown -->
        <div class="text-sm leading-relaxed prose-headings:text-neutral-900
                    prose-a:text-accent-700 prose-a:underline
                    prose-code:bg-primary-50 prose-code:text-primary-700
                    prose-code:px-1 prose-code:rounded"
             [innerHTML]="renderedContent()">
        </div>
      }

    </div>

    <!-- Timestamp -->
    <time class="text-xs text-neutral-500 px-1"
          [attr.datetime]="message().timestamp.toISOString()">
      {{ formattedTime() }}
    </time>

  </div>
</article>
```

> **Security:** `[innerHTML]` uses Angular's built-in HTML sanitizer, which strips `<script>` tags, event handlers, and unsafe attributes automatically. The `marked` output is treated as untrusted by Angular. No additional sanitization library is required for standard markdown output.

---

## 6. `TypingIndicatorComponent`

**File:** `components/typing-indicator/typing-indicator.ts`

Use an inline template. The component shows three animated dots.

```typescript
@Component({
  selector: 'app-typing-indicator',
  template: `
    <div class="flex justify-start items-start gap-2"
         role="status"
         aria-label="Assistant is typing">
      <div class="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center
                  text-white text-xs font-bold shrink-0"
           aria-hidden="true">
        AI
      </div>
      <div class="bg-accent-50 border border-accent-200 rounded-2xl rounded-bl-sm
                  px-4 py-3 flex items-center gap-1.5">
        @for (i of [0, 1, 2]; track i) {
          <span class="w-2 h-2 rounded-full bg-accent-500 inline-block"
                [style.animation]="'typing-dot 1.4s ease-in-out infinite'"
                [style.animation-delay]="(i * 0.2) + 's'"
                aria-hidden="true">
          </span>
        }
      </div>
    </div>
  `,
})
export class TypingIndicatorComponent {}
```

---

## 7. `LlmChatInputComponent`

**File:** `components/llm-chat-input/llm-chat-input.ts`

```typescript
@Component({
  selector: 'app-llm-chat-input',
  imports: [],
  templateUrl: './llm-chat-input.html',
})
export class LlmChatInputComponent {
  readonly value    = input('');
  readonly disabled = input(false);

  readonly valueChange = output<string>();
  readonly send        = output<string>();

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
```

**Template** (`llm-chat-input.html`):

```html
<div class="shrink-0 bg-surface border-t border-border shadow-chat px-4 py-3"
     role="region"
     aria-label="Message input">

  <div class="max-w-3xl mx-auto flex gap-2 items-end">

    <!-- Textarea -->
    <label class="sr-only" for="llm-chat-input">Type your message</label>
    <textarea
      id="llm-chat-input"
      class="flex-1 resize-none rounded-xl border border-neutral-200 bg-white
             px-4 py-2.5 text-sm text-neutral-800 leading-relaxed
             placeholder:text-neutral-400 min-h-[44px] max-h-[160px]
             transition-colors duration-150
             focus:outline-none focus:ring-2 focus:ring-primary-600/20
             focus:border-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
      rows="1"
      placeholder="Ask about Arrivia's documentation…"
      maxlength="4000"
      [value]="value()"
      [disabled]="disabled()"
      (input)="onInput($event)"
      (keydown)="onKeydown($event)"
      aria-label="Message input"
      aria-describedby="send-hint">
    </textarea>

    <!-- Send Button -->
    <button
      type="button"
      class="shrink-0 w-11 h-11 rounded-xl bg-primary-600 text-white
             flex items-center justify-center
             hover:bg-primary-700 active:bg-primary-800
             focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2
             disabled:opacity-40 disabled:cursor-not-allowed
             transition-colors duration-150"
      [disabled]="disabled() || !value().trim()"
      (click)="onSend()"
      aria-label="Send message">
      <!-- Send icon (paper plane) -->
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>

  </div>

  <p id="send-hint" class="sr-only">
    Press Enter to send. Press Shift+Enter for a new line.
  </p>

</div>
```

---

## 8. `ErrorBannerComponent`

**File:** `components/error-banner/error-banner.ts`

```typescript
@Component({
  selector: 'app-error-banner',
  template: `
    <div class="mx-4 mb-2 flex items-center gap-3 px-4 py-3
                bg-error-50 border border-error-200 rounded-lg text-error-700
                max-w-3xl md:mx-auto"
         role="alert"
         aria-live="assertive">
      <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p class="flex-1 text-sm font-medium">{{ message() }}</p>
      <button type="button"
              class="text-error-500 hover:text-error-700 transition-colors"
              (click)="dismissed.emit()"
              aria-label="Dismiss error">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `,
})
export class ErrorBannerComponent {
  readonly message  = input.required<string>();
  readonly dismissed = output();
}
```

---

## 9. Interaction Flows

### Happy Path
```
User types message
  → onSend() called
  → User ChatMessage added to messages[]
  → Empty assistant ChatMessage placeholder added
  → isLoading = true
  → llmChatService.sendMessage() called
  → stream$.subscribe:
      next(chunk): append chunk to assistant message content
      scroll to bottom on each chunk
  → complete(): isLoading = false
  → Input re-enabled, focus retained
```

### Error Path
```
llmChatService.sendMessage() throws OR stream$.error fires
  → Remove empty assistant placeholder
  → error signal set with user-friendly message
  → isLoading = false
  → ErrorBanner shown above input
  → User can dismiss banner, re-edit input, retry
```

### Empty State
```
On first load: one assistant greeting message is pre-populated
  (so the empty-state illustration is never shown after first render)
```

---

## 10. Auto-Scroll Behavior

- Scroll to bottom after every new message (user and assistant)
- Scroll on each streaming chunk
- Use `requestAnimationFrame` to schedule scroll after Angular renders
- Implementation: `el.scrollTop = el.scrollHeight` on the `#scrollContainer` element
- **Do not** force-scroll if the user has manually scrolled up (future enhancement — outside POC scope)
