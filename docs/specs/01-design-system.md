# Spec 01 — Design System

## Overview

All visual tokens — colors, typography, spacing, shadows, animations — are declared once in `src/styles.css` using Tailwind v4's `@theme` directive. Components must reference only these named tokens; no arbitrary hex values or raw sizes are permitted anywhere in the application.

---

## 1. Color Palette

### Brand Colors
| Role | Hex | Notes |
|---|---|---|
| Primary brand | `#002D5D` | Arrivia navy — header, CTAs, user messages |
| Accent brand | `#00A0AF` | Arrivia teal — decorative, icons, AI accent |

### 1.1 Primary Palette — Navy
Derived from `#002D5D`:

| Token | Hex | Contrast on White | Use |
|---|---|---|---|
| `primary-50` | `#EEF3FA` | — | Hover overlays, subtle tints |
| `primary-100` | `#D4E2F2` | — | Focus rings on dark bg |
| `primary-200` | `#AAC6E5` | — | Disabled button fill |
| `primary-300` | `#6FA1D2` | — | Decorative borders |
| `primary-400` | `#3D7DB7` | — | Secondary actions |
| `primary-500` | `#1A5999` | ~6.5:1 ✓ AA | Active nav items |
| `primary-600` | `#002D5D` | **~12:1 ✓ AAA** | **Base brand — buttons, header** |
| `primary-700` | `#001F42` | ~17:1 ✓ AAA | Hover on primary-600 |
| `primary-800` | `#001229` | ~24:1 ✓ AAA | Pressed state |
| `primary-900` | `#000714` | ~27:1 ✓ AAA | Darkest UI shade |

### 1.2 Accent Palette — Teal
Derived from `#00A0AF`:

| Token | Hex | Contrast on White | Use |
|---|---|---|---|
| `accent-50` | `#E0F7F9` | — | AI message bubble background |
| `accent-100` | `#B2EBF2` | — | Hover on accent-50 |
| `accent-200` | `#80DEEA` | — | Decorative borders, dividers |
| `accent-300` | `#4DD0E1` | — | Decorative illustrations |
| `accent-400` | `#26C6DA` | — | Icons on dark backgrounds |
| `accent-500` | `#00A0AF` | ~3.1:1 (large text only) | Decorative, icons, logo |
| `accent-600` | `#0087A0` | ~4.1:1 (large text ≥18pt) | Large heading accents |
| `accent-700` | `#006E7D` | **~5.3:1 ✓ AA** | **Links and text on white** |
| `accent-800` | `#005465` | ~7:1 ✓ AA | Text on light teal bg |
| `accent-900` | `#003A47` | ~10:1 ✓ AAA | Darkest teal |

### 1.3 Neutral Palette
Used for backgrounds, borders, body text:

| Token | Hex | Contrast on White | Use |
|---|---|---|---|
| `neutral-50` | `#F8FAFC` | — | App background |
| `neutral-100` | `#F1F5F9` | — | Chat area background |
| `neutral-200` | `#E2E8F0` | — | Dividers, input borders |
| `neutral-300` | `#CBD5E1` | — | Placeholder text, inactive states |
| `neutral-400` | `#94A3B8` | ~4.5:1 ✓ AA | Muted icons |
| `neutral-500` | `#64748B` | ~4.7:1 ✓ AA | Muted text (minimum AA) |
| `neutral-600` | `#475569` | ~7:1 ✓ AA | Secondary text |
| `neutral-700` | `#334155` | ~10:1 ✓ AA | Timestamps, captions |
| `neutral-800` | `#1E293B` | ~14:1 ✓ AA | Body text |
| `neutral-900` | `#0F172A` | ~18:1 ✓ AAA | Headings |

### 1.4 Status Colors

| Token | Hex | Use |
|---|---|---|
| `error-50` | `#FEF2F2` | Error message background |
| `error-500` | `#EF4444` | Error icon, border |
| `error-700` | `#B91C1C` | Error text on white (~6:1 ✓) |
| `success-50` | `#F0FDF4` | Success notification bg |
| `success-700` | `#15803D` | Success text on white (~7:1 ✓) |

---

## 2. Approved Color Combinations (WCAG AA)

> ⚠️ Only use these combinations for text. For decorative/UI-only elements the 3:1 threshold applies.

| Text Color | Background | Ratio | Permitted Use |
|---|---|---|---|
| white | `primary-600` (#002D5D) | 12:1 ✓ | Header text, button labels, user bubble text |
| white | `primary-700` (#001F42) | 17:1 ✓ | Hover button state |
| white | `accent-700` (#006E7D) | 5.3:1 ✓ | Teal button labels |
| white | `accent-800` (#005465) | 7:1 ✓ | Dark teal buttons |
| `primary-600` | white | 12:1 ✓ | Headings, important body text |
| `accent-700` | white | 5.3:1 ✓ | Teal links on white |
| `neutral-800` | white | 14:1 ✓ | Primary body text |
| `neutral-800` | `neutral-50` | ~13:1 ✓ | Text on light gray |
| `neutral-800` | `accent-50` | ~11:1 ✓ | AI message bubble text |
| `neutral-600` | white | 7:1 ✓ | Secondary/supporting text |
| `neutral-700` | white | 10:1 ✓ | Timestamps, meta text |
| `error-700` | `error-50` | ~5:1 ✓ | Error messages |

---

## 3. Tailwind v4 `@theme` Configuration

Replace the entire contents of `src/styles.css` with the following:

```css
@import "tailwindcss";

@theme {
  /* ===== Primary Palette — Navy ===== */
  --color-primary-50:  #EEF3FA;
  --color-primary-100: #D4E2F2;
  --color-primary-200: #AAC6E5;
  --color-primary-300: #6FA1D2;
  --color-primary-400: #3D7DB7;
  --color-primary-500: #1A5999;
  --color-primary-600: #002D5D;
  --color-primary-700: #001F42;
  --color-primary-800: #001229;
  --color-primary-900: #000714;

  /* ===== Accent Palette — Teal ===== */
  --color-accent-50:  #E0F7F9;
  --color-accent-100: #B2EBF2;
  --color-accent-200: #80DEEA;
  --color-accent-300: #4DD0E1;
  --color-accent-400: #26C6DA;
  --color-accent-500: #00A0AF;
  --color-accent-600: #0087A0;
  --color-accent-700: #006E7D;
  --color-accent-800: #005465;
  --color-accent-900: #003A47;

  /* ===== Neutral Palette ===== */
  --color-neutral-50:  #F8FAFC;
  --color-neutral-100: #F1F5F9;
  --color-neutral-200: #E2E8F0;
  --color-neutral-300: #CBD5E1;
  --color-neutral-400: #94A3B8;
  --color-neutral-500: #64748B;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1E293B;
  --color-neutral-900: #0F172A;

  /* ===== Status Colors ===== */
  --color-error-50:    #FEF2F2;
  --color-error-200:   #FECACA;
  --color-error-500:   #EF4444;
  --color-error-700:   #B91C1C;
  --color-success-50:  #F0FDF4;
  --color-success-700: #15803D;

  /* ===== Surface / Semantic Aliases ===== */
  --color-surface:          #FFFFFF;
  --color-background:       #F0F4F8;
  --color-border:           #E2E8F0;   /* neutral-200 */
  --color-border-focus:     #002D5D;   /* primary-600 */

  /* ===== Typography ===== */
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

  /* ===== Border Radius ===== */
  --radius-sm:     0.25rem;  /* 4px  */
  --radius-md:     0.5rem;   /* 8px  */
  --radius-lg:     0.75rem;  /* 12px */
  --radius-xl:     1rem;     /* 16px */
  --radius-full:   9999px;

  /* ===== Shadows ===== */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);
  --shadow-chat: 0 0 0 1px rgb(0 45 93 / 0.08), 0 8px 32px rgb(0 45 93 / 0.10);

  /* ===== Animation ===== */
  --animate-typing:   typing-dot 1.4s ease-in-out infinite;
  --animate-fade-in:  fade-in 0.2s ease-out;
  --animate-slide-up: slide-up 0.25s ease-out;
}

/* Base styles */
@layer base {
  html {
    font-family: var(--font-sans);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background-color: var(--color-background);
    color: var(--color-neutral-800);
  }

  *:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
}

/* Keyframe animations */
@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30%            { transform: translateY(-4px); opacity: 1; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 4. Typography Scale

| Role | Tailwind classes | Used for |
|---|---|---|
| Display | `text-3xl font-bold` | App name in header |
| Heading 1 | `text-2xl font-semibold` | Page-level headings |
| Heading 2 | `text-xl font-semibold` | Section headings |
| Body | `text-base` (1rem/16px) | Chat message text |
| Small | `text-sm` (0.875rem) | Timestamps, captions |
| Tiny | `text-xs` (0.75rem) | Labels, badges |

Font weight conventions:
- **Bold (700)**: App title, strong emphasis
- **Semibold (600)**: Headings, button labels
- **Medium (500)**: Interactive element labels
- **Regular (400)**: Body text, messages

---

## 5. Component-Level Design Tokens

### Header Bar
```
height:          64px (h-16)
background:      gradient from primary-600 to primary-700, with accent-500 accent
text:            white font-semibold
padding:         px-4 md:px-6
```

### Chat Message Area
```
background:      neutral-50 (slightly off-white)
padding:         px-4 py-4 (sm: px-6)
gap between msgs: mb-4 (16px)
max-width msg:   max-w-[85%] on mobile, max-w-[75%] on desktop
```

### User Message Bubble
```
background:      primary-600
text:            white
border-radius:   rounded-2xl rounded-br-sm (1.25rem, bottom-right 2px)
padding:         px-4 py-3
alignment:       ml-auto (right side)
```

### Assistant Message Bubble
```
background:      accent-50
text:            neutral-800
border:          1px solid accent-200
border-radius:   rounded-2xl rounded-bl-sm
padding:         px-4 py-3
alignment:       mr-auto (left side)
avatar:          teal circle with robot/AI icon, 32x32px
```

### Chat Input Area
```
background:      surface (white)
border-top:      1px solid border (neutral-200)
padding:         px-4 py-3
shadow:          shadow-chat (upward)
textarea:        rounded-xl border border-neutral-200,
                 focus ring: ring-2 ring-primary-600/20 border-primary-600
send button:     rounded-xl bg-primary-600 text-white
                 hover: bg-primary-700
                 disabled: opacity-40 cursor-not-allowed
```

### Error Banner
```
background:      error-50
border:          1px solid error-200
text:            error-700
border-radius:   rounded-lg
padding:         px-4 py-3
```

---

## 6. Responsive Breakpoints

Use Tailwind's default breakpoints — do not define custom ones:
- `sm`: 640px — single column layout adjustments
- `md`: 768px — larger padding, wider max-width
- `lg`: 1024px — chat constrained to `max-w-3xl` centered

The chat interface is **full-height** on all screen sizes, using `h-svh` (small viewport height) to avoid mobile browser chrome issues.
