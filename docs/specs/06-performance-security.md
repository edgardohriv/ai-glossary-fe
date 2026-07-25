# Spec 06 — Performance & Security

## Overview

This spec covers Angular build performance targets, code-splitting strategy, XSS prevention for AI-generated content, HTTP security, and input validation. All items are required for the POC to be production-quality.

---

## 1. Performance Targets

### Angular Build Budget

The existing budget in `angular.json` must not be exceeded:

| Budget Type | Warning | Error | Strategy to stay within |
|---|---|---|---|
| `initial` | 500 kB | 1 MB | Lazy-load chat route; keep `marked` only in the chat chunk |
| `anyComponentStyle` | 4 kB | 8 kB | Use Tailwind utilities; avoid component-level CSS files |

Check budget compliance with:
```bash
pnpm build
```
The build output table shows each chunk's size. The initial chunk must include only the app shell (router, providers) — chat feature code must be in a separate lazy chunk.

### Expected Chunk Sizes (guidance)

| Chunk | Expected Size |
|---|---|
| `main.js` (initial) | < 100 kB (gzipped < 35 kB) |
| `chunk-chat.js` (lazy) | < 250 kB (includes `marked`) |
| `styles.css` | < 30 kB (Tailwind purges unused classes) |

---

## 2. Code Splitting — Lazy Routing

The chat feature is loaded lazily via `loadComponent`. This is already specified in `app.routes.ts`:

```typescript
{
  path: '',
  loadComponent: () =>
    import('./features/chat/chat').then(m => m.ChatComponent),
}
```

**Critical:** `marked` is imported inside `message-bubble.ts` which lives in the chat feature chunk. Because it is never imported from `app.ts`, `app.routes.ts`, or `app.config.ts`, it will be included in the lazy `chunk-chat.js` only. Verify this with `pnpm build -- --stats-json` if needed.

---

## 3. Rendering Performance

### Signals and `computed()`

- All component state is signals. Angular v22's `OnPush`-by-default ensures components only re-render when their signal inputs or template dependencies change.
- Message rendering uses `@for (... track message.id)` — the `track` expression is mandatory and must use a stable unique key (`id`). Do NOT use `track $index`.
- `renderedContent` in `MessageBubbleComponent` is a `computed()` — `marked.parse()` is only called when `message().content` changes, not on every parent re-render.

### Streaming Text Updates

During streaming, `messages.update()` is called for each SSE chunk. Each call triggers a re-render of the message list. This is acceptable for POC scale (typically 5–50 messages at once).

If performance degrades with very long messages, the optimization path is:
1. Accumulate chunks in a local string
2. Update the signal in `requestAnimationFrame` (batches DOM updates to 60fps)

This optimization is **not required** for the initial implementation.

### Auto-Scroll

Auto-scroll uses `requestAnimationFrame` to defer DOM measurement until after Angular renders:

```typescript
private scrollToBottom(): void {
  requestAnimationFrame(() => {
    const el = this.scrollContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  });
}
```

Never call `scrollTop` synchronously inside an `effect()` or signal write — it triggers layout thrashing.

---

## 4. XSS Prevention — AI Response Rendering

AI-generated content is **untrusted** and must be sanitized before rendering as HTML.

### The Rendering Pipeline

```
AI response text (untrusted string)
        ↓
  marked.parse(content)          ← Converts markdown to HTML string
        ↓
  [innerHTML]="renderedContent"  ← Angular's built-in sanitizer runs automatically
        ↓
  DOM render (safe HTML)
```

Angular's `[innerHTML]` binding automatically passes content through `DomSanitizer.sanitize(SecurityContext.HTML, html)`, which:
- Removes `<script>` tags
- Removes `javascript:` href values
- Removes inline event handlers (`onclick`, etc.)
- Removes dangerous attributes (`formaction`, `srcdoc`, etc.)

### Allowed HTML Elements from `marked`

After Angular sanitization, these elements are safe and will render correctly:
- Paragraphs: `<p>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Headings: `<h1>` – `<h6>`
- Emphasis: `<strong>`, `<em>`, `<code>`, `<pre>`
- Links: `<a href="...">` (Angular allows relative and http/https hrefs)
- Blockquotes: `<blockquote>`
- Tables: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`

### `marked` Configuration

Configure `marked` to be safe by default:

```typescript
// In message-bubble.ts, at module level (runs once)
import { marked, MarkedOptions } from 'marked';

const markedOptions: MarkedOptions = {
  gfm: true,           // GitHub Flavored Markdown (tables, strikethrough)
  breaks: true,        // Single line breaks become <br>
  async: false,
};

marked.setOptions(markedOptions);
```

### What NOT to Do

```typescript
// ❌ NEVER use bypassSecurityTrustHtml — it disables Angular sanitization
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(markedContent);

// ❌ NEVER set innerHTML directly
element.innerHTML = markedContent;
```

---

## 5. Input Validation and Rate Limiting

### Client-Side Input Validation

The textarea enforces:
- `maxlength="4000"` attribute — browser prevents typing beyond this limit
- Trim whitespace before sending: `const text = this.value().trim()`
- Empty check: `if (!text || !text.length)` — send button disabled

In `ChatService.sendMessage()`, the content is additionally truncated server-side:
```typescript
content: m.content.slice(0, MAX_CONTENT_LENGTH),  // MAX_CONTENT_LENGTH = 4000
```

### No Client-Side Rate Limiting

Rate limiting is the responsibility of the backend. The client handles the `429` response code by displaying a user-friendly error message (see Spec 04).

---

## 6. HTTP Security

### Headers to Request from Backend

The backend at `/api/chat` should return the following response headers. Document these requirements for the backend team (frontend cannot set response headers):

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';

X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### No Hardcoded Secrets

The Angular frontend must **never** contain:
- OpenAI API keys
- Backend service credentials
- Any tokens or secrets

The `/api/chat` proxy endpoint handles authentication with OpenAI on the server side. The frontend only sends conversation messages.

### Proxy Configuration Security

In `proxy.conf.json` (development only), ensure `changeOrigin: true` is set to avoid leaking the development server's origin to the backend:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

The `proxy.conf.json` is for **development only**. In production, the Angular build is served alongside the backend or behind a reverse proxy — no frontend proxy config is needed.

---

## 7. No Sensitive Data in State

- Chat messages are held in memory only (`signal<ChatMessage[]>`) — not written to `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
- No conversation history persists across page reloads (by design — POC constraint).
- Do not log message content to the browser console in production code.

---

## 8. Dependency Security

After installing packages, audit for known vulnerabilities:

```bash
pnpm audit
```

Address any high or critical vulnerabilities before delivery. The only new runtime dependency added by this project is:
- `marked` — a well-maintained markdown parsing library with regular security releases.

Check that you are using the **latest stable version** of `marked`:
```bash
pnpm add marked@latest
```

---

## 9. Performance Checklist

Before marking the implementation complete, verify all of the following:

- [ ] `pnpm build` completes without budget warnings
- [ ] Initial JS chunk < 500 kB (warning threshold)
- [ ] Chat feature in a separate lazy chunk (visible in build output)
- [ ] `marked` import is only in the chat feature chunk, not the initial bundle
- [ ] `@for` uses `track message.id` (not `track $index`)
- [ ] No `console.log` calls with message content in production code
- [ ] `requestAnimationFrame` used for auto-scroll
- [ ] Fonts loaded with `display=swap` (already in the Google Fonts URL)
- [ ] Inter font uses `<link rel="preconnect">` for faster loading
- [ ] `src/styles.css` only contains `@import "tailwindcss"` and `@theme` — no large custom CSS blocks

---

## 10. Security Checklist

Before marking the implementation complete, verify:

- [ ] No API keys or secrets in any TypeScript, HTML, or CSS file
- [ ] `[innerHTML]` binding used (not `element.innerHTML`)
- [ ] `bypassSecurityTrustHtml` is NOT used anywhere
- [ ] `marked.setOptions` configures `gfm: true, breaks: true`
- [ ] User input length limited to 4000 characters (`maxlength` attribute + service truncation)
- [ ] `proxy.conf.json` is not committed to production branches (add to `.gitignore` comment or use environment-based config)
- [ ] No sensitive message content logged to console
- [ ] HTTP `429` handled gracefully with user-facing error
