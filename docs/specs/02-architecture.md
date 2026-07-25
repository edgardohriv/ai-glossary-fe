# Spec 02 — Architecture

## Overview

This spec defines the exact file structure, Angular v22 coding patterns, naming conventions, and module organization for the Arrivia Document Glossary application.

---

## 1. Directory Structure

Create this exact structure. Every path is relative to the project root.

```
src/
├── index.html                          ← Updated: title, meta, Inter font
├── styles.css                          ← Full @theme design system (see spec 01)
├── main.ts                             ← Unchanged bootstrap
└── app/
    ├── app.ts                          ← Root component — shell layout only
    ├── app.html                        ← Router outlet inside full-height layout
    ├── app.css                         ← Empty or deleted (styles live in styles.css)
    ├── app.routes.ts                   ← Lazy-loaded chat route
    ├── app.config.ts                   ← provideRouter + provideHttpClient(withFetch())
    │
    └── features/
        └── chat/
            ├── chat.ts                 ← ChatComponent — main page container
            ├── chat.html               ← Chat page template
            ├── chat.css                ← Minimal, prefer Tailwind utilities
            ├── chat.routes.ts          ← Chat feature routes (if nested routes needed)
            │
            ├── models/
            │   └── chat.model.ts       ← All TypeScript types for chat
            │
            ├── services/
            │   └── chat.service.ts     ← API calls, streaming, system prompt
            │
            └── components/
                ├── message-bubble/
                │   ├── message-bubble.ts
                │   ├── message-bubble.html
                │   └── message-bubble.css ← Only if needed; prefer utilities
                ├── typing-indicator/
                │   └── typing-indicator.ts  ← Inline template OK (small component)
                ├── chat-input/
                │   ├── chat-input.ts
                │   └── chat-input.html
                └── error-banner/
                    └── error-banner.ts      ← Inline template OK (small component)
```

---

## 2. Angular v22 Patterns

### 2.1 Components — Do's and Don'ts

```typescript
// ✅ CORRECT — Angular v22 component
import { Component, input, output, signal, computed, inject } from '@angular/core';

@Component({
  selector: 'app-example',
  templateUrl: './example.html',
  // ✅ No standalone: true (default in v22)
  // ✅ No changeDetection: OnPush (default in v22)
  host: {
    // ✅ Use host object instead of @HostBinding / @HostListener
    '[class.active]': 'isActive()',
    '(keydown.escape)': 'onEscape()',
  },
})
export class ExampleComponent {
  // ✅ inject() instead of constructor injection
  private readonly someService = inject(SomeService);

  // ✅ input() signal — not @Input() decorator
  readonly value = input.required<string>();
  readonly disabled = input(false);

  // ✅ output() — not @Output() decorator
  readonly valueChange = output<string>();

  // ✅ Local signal state
  protected readonly count = signal(0);

  // ✅ computed() for derived values
  protected readonly doubleCount = computed(() => this.count() * 2);
}
```

```typescript
// ❌ WRONG — do not write this
@Component({
  standalone: true,           // ❌ Not needed
  changeDetection: ChangeDetectionStrategy.OnPush, // ❌ Not needed
})
export class WrongComponent {
  @Input() value!: string;    // ❌ Use input()
  @Output() changed = new EventEmitter(); // ❌ Use output()
  @HostBinding('class.foo') foo = true;   // ❌ Use host: {}
  @HostListener('click') onClick() {}     // ❌ Use host: {}

  constructor(private svc: SomeService) {} // ❌ Use inject()
}
```

### 2.2 Services — `@Service` Decorator

Angular v22 introduces the `@Service` decorator as shorthand for `@Injectable({ providedIn: 'root' })`:

```typescript
// ✅ CORRECT — Angular v22 service
import { Service } from '@angular/core';

@Service()  // equivalent to @Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly http = inject(HttpClient);
  // ...
}
```

> **Note:** If `@Service` is not yet available in the installed version, fall back to `@Injectable({ providedIn: 'root' })`. Check `@angular/core` exports.

### 2.3 Templates — Native Control Flow

```html
<!-- ✅ CORRECT -->
@if (isLoading()) {
  <app-typing-indicator />
}

@for (message of messages(); track message.id) {
  <app-message-bubble [message]="message" />
}

@switch (status()) {
  @case ('error') { <app-error-banner [message]="errorText()" /> }
  @case ('idle')  { <p>Start chatting</p> }
}

<!-- ❌ WRONG -->
<app-typing-indicator *ngIf="isLoading()" />
<app-message-bubble *ngFor="let msg of messages()" />
```

### 2.4 Class and Style Bindings

```html
<!-- ✅ CORRECT -->
<div [class.hidden]="!visible()">...</div>
<button [class]="buttonClasses()">...</button>
<div [style.opacity]="opacity()">...</div>

<!-- ❌ WRONG -->
<div [ngClass]="{ hidden: !visible() }">...</div>
<div [ngStyle]="{ opacity: opacity() }">...</div>
```

### 2.5 Inline Templates (Small Components)

Components with ≤ 15 lines of template may use `template` directly on the decorator:

```typescript
@Component({
  selector: 'app-typing-indicator',
  template: `
    <div class="flex gap-1 px-4 py-3" aria-label="Assistant is typing" role="status">
      @for (i of [0, 1, 2]; track i) {
        <span class="w-2 h-2 rounded-full bg-accent-500"
              [style.animation-delay]="i * 0.2 + 's'"
              style="animation: typing-dot 1.4s ease-in-out infinite">
        </span>
      }
    </div>
  `,
})
export class TypingIndicatorComponent {}
```

---

## 3. Routing

### `app.routes.ts`
```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/chat/chat').then(m => m.ChatComponent),
    title: 'Arrivia Document Glossary',
  },
  { path: '**', redirectTo: '' },
];
```

### `app.config.ts`
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

---

## 4. App Shell — `app.ts` and `app.html`

The root `App` component is a minimal shell that renders the router outlet inside a full-height page layout.

### `app.ts`
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App {}
```

### `app.html`
```html
<div class="flex flex-col h-svh overflow-hidden bg-background">
  <router-outlet />
</div>
```

> The outer `div` sets up the full-height flex column that all pages inherit. The chat page fills this space.

---

## 5. Naming Conventions

| Artifact | Convention | Example |
|---|---|---|
| Component class | `PascalCase` + `Component` suffix | `MessageBubbleComponent` |
| Component file | `kebab-case.ts` | `message-bubble.ts` |
| Component selector | `app-` prefix + kebab | `app-message-bubble` |
| Service class | `PascalCase` + `Service` suffix | `ChatService` |
| Service file | `kebab-case.service.ts` | `chat.service.ts` |
| Model file | `kebab-case.model.ts` | `chat.model.ts` |
| Interface | `PascalCase`, no `I` prefix | `ChatMessage`, `ChatRequest` |
| Type alias | `PascalCase` | `MessageRole` |
| Signal | camelCase, no `$` suffix | `messages`, `isLoading` |
| Observable | camelCase with `$` suffix | `stream$` |
| Private field | camelCase, no `_` prefix | `readonly chatService = inject(...)` |

---

## 6. Import Order Convention

```typescript
// 1. Angular core/platform
import { Component, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// 2. Angular router / forms
import { RouterOutlet } from '@angular/router';

// 3. Third-party libraries
import { marked } from 'marked';

// 4. App — absolute paths (from src/)
import { ChatService } from '../../services/chat.service';
import { ChatMessage } from '../../models/chat.model';

// 5. Relative imports (siblings, children)
import { MessageBubbleComponent } from './components/message-bubble/message-bubble';
```

---

## 7. Testing Conventions (Vitest)

Tests live alongside their source file as `*.spec.ts`.

```typescript
// chat.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('ChatService', () => {
  let service: ChatService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ChatService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

Use `vi.fn()` for mocks, `vi.spyOn()` for spies. Do not use Jasmine-style `jasmine.createSpy()`.

---

## 8. `index.html` Updates

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Arrivia Document Glossary</title>
  <base href="/" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description"
        content="Arrivia Document Glossary — interactive AI-powered glossary assistant" />
  <meta name="theme-color" content="#002D5D" />
  <link rel="icon" type="image/x-icon" href="favicon.ico" />
  <!-- Inter font — variable font for performance -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
</head>
<body>
  <app-root></app-root>
</body>
</html>
```
