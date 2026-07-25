# Arrivia Document Glossary — Spec-Driven Development Guide

> **For the implementing agent:** Read this file first, then follow the linked specs in order. Each spec file is self-contained and actionable. Do not skip specs or reorder tasks arbitrarily.

## Project Summary

**App name:** Arrivia Document Glossary  
**Purpose:** A single-page interactive AI chat interface that lets users ask questions about Arrivia's documentation and terminology. The backend at `/api/chat` proxies calls to OpenAI.

**Tech stack:**
| Layer | Choice |
|---|---|
| Framework | Angular v22 (standalone, signals, `@Service`) |
| Styling | Tailwind CSS v4 — configured entirely in CSS via `@theme` |
| Testing | Vitest (already configured via `@angular/build:unit-test`) |
| Language | TypeScript ~6.0, strict mode |
| Package manager | pnpm |
| Node | ≥ 24.0.0 |

---

## Prerequisites — Install Before Starting

Run this once before any implementation work:

```bash
pnpm add marked
pnpm add -D @types/marked
```

`marked` converts AI markdown responses to HTML. Angular's built-in `DomSanitizer` handles sanitization — no additional libraries needed.

---

## Spec Files (Read in Order)

| # | File | Covers |
|---|---|---|
| 1 | [01-design-system.md](./01-design-system.md) | Color palette, Tailwind `@theme` CSS, typography, component tokens |
| 2 | [02-architecture.md](./02-architecture.md) | File structure tree, Angular v22 patterns, conventions |
| 3 | [03-chat-feature.md](./03-chat-feature.md) | Component breakdown, signal state, UX flows, layout |
| 4 | [04-api-service.md](./04-api-service.md) | TypeScript types, `ChatService`, streaming with `fetch` |
| 5 | [05-accessibility.md](./05-accessibility.md) | ARIA, keyboard nav, live regions, focus management |
| 6 | [06-performance-security.md](./06-performance-security.md) | Bundle budget, lazy routing, XSS prevention, security |

---

## Ordered Implementation Checklist

Complete each task in sequence. Mark tasks done as you go.

- [ ] **Step 1 — Install dependencies**  
  `pnpm add marked && pnpm add -D @types/marked`

- [ ] **Step 2 — Design system**  
  Replace `src/styles.css` with the full `@theme` block from `01-design-system.md`. Add Inter font link to `src/index.html`.

- [ ] **Step 3 — Update `index.html`**  
  Set `<title>`, `<meta description>`, Inter Google Font `<link>`, and `lang="en"`.

- [ ] **Step 4 — TypeScript models**  
  Create `src/app/features/chat/models/chat.model.ts` from spec `04-api-service.md`.

- [ ] **Step 5 — `ChatService`**  
  Create `src/app/features/chat/services/chat.service.ts` from spec `04-api-service.md`.

- [ ] **Step 6 — App config & routes**  
  Update `src/app/app.config.ts` (add `provideHttpClient(withFetch())`).  
  Update `src/app/app.routes.ts` (lazy-load chat route at `/`).

- [ ] **Step 7 — `MessageBubbleComponent`**  
  Create `src/app/features/chat/components/message-bubble/` from spec `03-chat-feature.md`.

- [ ] **Step 8 — `TypingIndicatorComponent`**  
  Create `src/app/features/chat/components/typing-indicator/` from spec `03-chat-feature.md`.

- [ ] **Step 9 — `ChatInputComponent`**  
  Create `src/app/features/chat/components/chat-input/` from spec `03-chat-feature.md`.

- [ ] **Step 10 — `ChatComponent` (main page)**  
  Create `src/app/features/chat/chat.ts` and siblings from spec `03-chat-feature.md`.  
  Wire up all child components.

- [ ] **Step 11 — `App` shell**  
  Replace `src/app/app.ts` and `src/app/app.html` with the minimal shell from `02-architecture.md`.

- [ ] **Step 12 — Unit tests**  
  Write `chat.service.spec.ts` and `chat.spec.ts` per the test expectations in each spec file.

- [ ] **Step 13 — Build verification**  
  Run `pnpm build` and confirm no budget violations. Fix any TypeScript or template errors.

---

## Non-Negotiable Constraints

1. **No arbitrary hex values in component templates or CSS.** All colors must reference the named Tailwind utilities defined in `@theme` (e.g., `bg-primary-600`, `text-accent-700`).
2. **No `standalone: true` in decorators.** It is the default in Angular v22+.
3. **No `changeDetection: ChangeDetectionStrategy.OnPush`.** It is the default in Angular v22+.
4. **No `@HostBinding` or `@HostListener` decorators.** Use the `host` object in the decorator instead.
5. **No `ngClass` or `ngStyle`.** Use `[class.*]` and `[style.*]` bindings.
6. **No constructor injection.** Use `inject()`.
7. **No `*ngIf`, `*ngFor`, `*ngSwitch`.** Use `@if`, `@for`, `@switch`.
8. **No hardcoded API keys or secrets** in any file.
9. **WCAG AA compliance required.** Every interactive element must meet 4.5:1 contrast ratio for text, 3:1 for large text/UI components.
10. **All user-supplied or AI-generated HTML content must be sanitized** before rendering via `[innerHTML]`.
