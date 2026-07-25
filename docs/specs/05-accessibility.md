# Spec 05 — Accessibility

## Overview

All components must meet **WCAG 2.1 Level AA** compliance. The chat interface requires special accessibility treatment because it involves dynamic content updates (new messages appearing), live streaming text, and keyboard-driven interaction.

This spec is authoritative. The implementing agent must verify all items before marking Step 12 complete.

---

## 1. Document-Level Accessibility

### `index.html`

```html
<!-- Required: language declaration on <html> -->
<html lang="en">

<!-- Required: viewport meta -->
<meta name="viewport" content="width=device-width, initial-scale=1" />

<!-- Recommended: page description for screen readers -->
<meta name="description" content="Arrivia Document Glossary — interactive AI-powered glossary assistant" />
```

### Page Title
- Static title: `Arrivia Document Glossary` — set on the lazy route:
  ```typescript
  { path: '', ..., title: 'Arrivia Document Glossary' }
  ```

---

## 2. ARIA Roles and Landmark Structure

```
<body>
└── <app-root>                           (no landmark role)
    └── chat layout div
        ├── <header role="banner">       ← Page banner landmark
        │   ├── Logo icon (aria-hidden)
        │   ├── <h1>Arrivia Document Glossary</h1>
        │   └── Status <p aria-live="polite">
        │
        └── <main>                        ← Main content landmark
            ├── Message list
            │   role="log"
            │   aria-label="Conversation"
            │   aria-live="polite"
            │   aria-relevant="additions"
            │
            ├── <article> per message
            │   aria-label="[You/Assistant] at [time]"
            │
            └── Typing indicator
                role="status"
                aria-label="Assistant is typing"
        │
        ├── Error banner (when present)
        │   role="alert"                 ← assertive live region
        │   aria-live="assertive"
        │
        └── Input region
            role="region"
            aria-label="Message input"
            └── <textarea>
                id="chat-input"
                aria-label="Message input"
                aria-describedby="send-hint"
            └── <button aria-label="Send message">
            └── <p id="send-hint" class="sr-only">
                    Press Enter to send. Press Shift+Enter for a new line.
                </p>
```

---

## 3. Live Regions

Live regions announce dynamic content updates to screen readers without requiring focus.

| Element | `aria-live` | `role` | When it announces |
|---|---|---|---|
| Message list | `polite` | `log` | Each new message (after stream completes) |
| Status line in header | `polite` | — | "Thinking…" ↔ "Online" transitions |
| Typing indicator | `polite` | `status` | When shown ("Assistant is typing") |
| Error banner | `assertive` | `alert` | Immediately when an error occurs |

**Implementation Note:** The `role="log"` on the message list combined with `aria-live="polite"` and `aria-relevant="additions"` means screen readers announce new messages as they are added, without re-announcing the entire list. This is the correct ARIA pattern for chat interfaces.

**Streaming consideration:** During streaming, `aria-live="polite"` would announce every chunk, which creates noise. The streaming placeholder assistant message has empty content initially. Screen readers will announce the full message when the component is stable (on `complete()`). No special handling is required — the polite live region batches announcements when the DOM settles.

---

## 4. Keyboard Navigation

Every interactive element must be keyboard-reachable and operable.

| Tab Order | Element | Expected Behavior |
|---|---|---|
| 1 | Textarea | Focus lands here on page load (autofocus) |
| 2 | Send button | Space or Enter activates it |
| 3 | Error dismiss button | Only in tab order when error is visible |

**Rules:**
- The textarea receives `autofocus` on page load.
- After sending a message, focus must remain in the textarea (do not reset focus).
- The error dismiss button appears in the DOM only when there is an error (`@if (error())`), so it is automatically removed from tab order when dismissed.
- The Send button is `disabled` when the textarea is empty or `isLoading` is true. Disabled buttons are excluded from tab navigation automatically.
- Message bubbles are NOT interactive and should NOT receive tab focus.

### Tab Index Rules

```html
<!-- ✅ Textarea — receives autofocus -->
<textarea autofocus ...></textarea>

<!-- ✅ Send button — no explicit tabindex (natural order) -->
<button type="button" ...>Send</button>

<!-- ❌ Do NOT add tabindex to non-interactive elements -->
<article>...</article>   <!-- message bubble — not focusable -->
<div>...</div>           <!-- container — not focusable -->
```

---

## 5. Focus Management

### On Page Load
- `<textarea id="chat-input">` receives focus via the `autofocus` attribute.
- Screen reader announces the `aria-label` and `aria-describedby` instructions.

### After Sending a Message
- Focus stays in the textarea — do NOT call `element.blur()` or move focus to the message list.
- The user can immediately start typing the next message.
- The textarea value is cleared by `this.inputValue.set('')`.

### On Error
- Focus does NOT move to the error banner.
- The `role="alert"` on the error banner causes it to be announced assertively without focus movement.
- The user retains focus in the textarea so they can retry.

### On Error Dismissal
- Clicking the dismiss button removes the error banner.
- Focus should return to the textarea after dismissal:
  ```typescript
  // In ChatComponent
  onDismissError(): void {
    this.error.set(null);
    // Return focus to textarea after error banner disappears
    document.getElementById('chat-input')?.focus();
  }
  ```

---

## 6. Focus Visible Styles

All interactive elements must have a **visible focus indicator**. The global rule in `styles.css`:

```css
*:focus-visible {
  outline: 2px solid var(--color-primary-600);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

Do NOT suppress `:focus-visible` on any element with `outline: none` without providing a custom focus style that meets the 3:1 contrast requirement (WCAG 2.1 SC 1.4.11).

The Send button has explicit `focus-visible:ring-2` Tailwind utility to override the global rule with a button-specific style.

---

## 7. Touch Target Sizes

Per WCAG 2.5.5 (AAA) and practical mobile UX, all interactive elements must be at least **44 × 44 CSS pixels**.

| Element | Minimum Size | Implementation |
|---|---|---|
| Send button | 44 × 44px | `w-11 h-11` (44px × 44px) |
| Error dismiss button | 44 × 44px | Add `p-2.5` padding to the `<button>` |
| Textarea | 44px min-height | `min-h-[44px]` |

---

## 8. Color and Contrast Checklist

Refer to the approved combinations in **Spec 01 — Design System**, section 2.

✅ = required check before shipping

- [ ] White text on `primary-600` header — 12:1 ✓
- [ ] `neutral-800` text in AI bubbles on `accent-50` — 11:1 ✓
- [ ] White text in user bubbles on `primary-600` — 12:1 ✓
- [ ] `neutral-800` placeholder text on white textarea — verify ≥ 4.5:1
- [ ] `neutral-400` placeholder text on white — 4.5:1 (exactly AA minimum — acceptable)
- [ ] `error-700` on `error-50` — 5:1 ✓
- [ ] Send button icon (white) on `primary-600` — 12:1 ✓
- [ ] Timestamp text (`neutral-500` on white) — 4.7:1 ✓
- [ ] Focus ring (`primary-600` outline on white bg) — 12:1 ✓
- [ ] Typing dots (`accent-500` on `accent-50`) — decorative only, 3:1 threshold

---

## 9. Images and Icons

All decorative SVG icons must have `aria-hidden="true"`. No icon should be the sole means of conveying information without a text label.

```html
<!-- ✅ Icon with accessible label on parent -->
<button aria-label="Send message">
  <svg aria-hidden="true">...</svg>
</button>

<!-- ✅ Purely decorative -->
<svg aria-hidden="true" class="w-5 h-5">...</svg>

<!-- ❌ No aria-hidden on decorative icon -->
<svg class="w-5 h-5">...</svg>  <!-- will be read by screen reader! -->
```

---

## 10. Screen Reader Announcements — Verification Checklist

Test manually using VoiceOver (macOS) or NVDA (Windows) or browser accessibility tools:

- [ ] Page title announced on load: "Arrivia Document Glossary"
- [ ] Textarea announced: "Message input, text area. Press Enter to send. Press Shift+Enter for a new line."
- [ ] After sending: new message announced by `role="log"`
- [ ] Typing indicator announced: "Assistant is typing, status"
- [ ] Error: "Unable to reach the server…, alert" announced immediately
- [ ] Status changes ("Thinking…" / "Online") announced without interruption

---

## 11. Reduced Motion

Respect the user's reduced motion preference. The typing dot animation must be paused for users who prefer reduced motion:

Add to `styles.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 12. axe-core Validation

Run an automated accessibility audit during development using the browser's built-in axe DevTools extension or the following Vitest setup (optional but recommended):

```typescript
// In a spec file
import { checkA11y } from 'axe-vitest'; // if the package is available

it('should have no accessibility violations', async () => {
  await checkA11y(fixture.nativeElement);
});
```

At minimum, use the browser DevTools Accessibility panel or Lighthouse to verify zero axe violations before marking the implementation complete.
