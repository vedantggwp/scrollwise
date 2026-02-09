# Scrollwise Design

Single source of truth for design philosophy, principles, and implementation specs. Use this document to implement the entire UI.

---

## Philosophy

**Calm in the feed. Deep in the reader.**

The feed is for discovery and light engagement—low cognitive load, scrollable, snackable. The reader is for sustained focus—immersive, minimal chrome. The app never gets in the way.

---

## Principles

1. **One primary action per context** — Each screen or card has one clear primary action; secondary actions are available but not competing.
2. **State is always visible** — Loading, empty, error, and success states are explicit (skeletons, CTAs, messages). No dead ends.
3. **Motion has meaning** — Transitions reinforce hierarchy (e.g. card → reader) and wayfinding; no decoration-only animation. Respect `prefers-reduced-motion`.
4. **Feed is scannable, reader is readable** — Feed: headlines, covers, short snippets. Reader: typography and spacing optimized for long-form; chrome recedes.
5. **Actions are reversible** — Skip is soft; nothing is permanently deleted without confirmation. Back from reader returns to the same place in the feed.
6. **Accessibility is default** — Focus order, labels, contrast, and reduced motion are part of the design, not an add-on.
7. **Performance is part of the experience** — First paint and tap response meet the performance budget; perceived speed matters as much as real speed.

---

## Design Language

### Typography

- **Feed / UI:** System font or one variable font (e.g. Geist). Clear hierarchy: headline, body, caption.
- **Reader body:** Serif (e.g. Literata, Merriweather) across all themes.
- **Scale:** Consistent levels; no arbitrary font mixing. *(Exact sizes, weights, line heights: see Design Tokens below.)*

### Color

- **Feed:** Neutral background, elevated cards. One accent for primary actions (Save, Highlight).
- **Reader:** Theme-driven (light, dark, sepia, midnight). Cover dominant color used only for subtle card accents.
- *(Exact palette: see Design Tokens below.)*

### Motion

- **Duration:** &lt;300ms for taps; &lt;400ms for shared-element (card → reader).
- **Reduced motion:** Use `useReducedMotion()`; when set, use instant or very short cuts.
- *(Easing and per-transition specs: see Interaction & Motion below.)*

### Spacing

- Consistent scale (e.g. 4, 8, 16, 24). Feed cards: enough padding for comfortable tap targets. Reader: generous line height and margins.
- *(Exact scale and usage: see Design Tokens below.)*

---

## Surfaces

### Feed

- Infinite scroll; cards as “posts”; book as creator.
- **Primary action:** Read (tap body).
- **Secondary:** Save, Highlight, Skip. Header chip for light progress (e.g. “3 saved today”).
- No modal overlays for primary flow.

### Library

- Upload (EPUB/PDF), processing status, list of books. **Primary action:** Open (tap card when ready). **Secondary:** Remove, Re-extract (re-run extraction to refresh snippets). See **docs/LIBRARY_UI_OPTIONS.md** for alternate UI ideas (grid, overflow menu, sections).

### Reader

- **Format-agnostic:** The same reader experience for every format (EPUB, PDF, etc.): themes, font/zoom, annotations sidebar, selection toolbar, persist and jump to location. No feature gaps by format.
- Full-screen content; top bar with cover + title (shared element from card).
- Toolbars appear on selection or via explicit controls.
- Sidebars (TOC, annotations) overlay or drawer; closing returns to same position.

---

## Design Handoff (Implement From This)

Everything below is what a designer provides so the engineer can code the entire UI. Fill in or link to specs as they exist.

### 1. Visual Design & Mockups

- **Hi-fi mockups** for every key screen and state:
  - **Feed:** default scroll, first card, loading (skeletons), empty (no books), empty (no results for mode).
  - **Snippet card:** default, saved state, after Skip (next card visible).
  - **Reader:** with top bar, with selection + toolbar, with TOC/sidebar open.
  - **Library:** grid, empty, one book processing.
  - **Onboarding:** each step.
  - **Settings:** main view, AI/key section if needed.
- **Breakpoints:** at least mobile (e.g. 375px); tablet/desktop (e.g. 768, 1024) if in scope.
- **Design file:** *(Figma/Sketch link or export path: _____________)*

---

### 2. Design Tokens

Exact values to implement (no guessing).


| Token type              | Values / notes                                                                                   | Where used             |
| ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| **Font families**       | UI: _______. Reader body: _______.                                                               | Global / reader        |
| **Font sizes**          | e.g. headline: ___, body: ___, caption: ___                                                      | Per component          |
| **Font weights**        | e.g. regular ___, medium ___, bold ___                                                           | Per component          |
| **Line heights**        | Per text style                                                                                   | Per component          |
| **Colors – Feed**       | Background: ___. Card bg: ___. Text primary: ___. Text secondary: ___. Border: ___. Accent: ___. | Feed, cards            |
| **Colors – Reader**     | Per theme (light, dark, sepia, midnight): bg, text, link, highlight colors                       | Reader                 |
| **Spacing scale**       | e.g. 4, 8, 12, 16, 24, 32 (px)                                                                   | Padding, gaps, margins |
| **Border radius**       | Card: ___. Button: ___. Input: ___.                                                              | Components             |
| **Shadows / elevation** | Card: ___. Toolbar: ___.                                                                         | Components             |
| **Touch targets**       | Min height/width (e.g. 44px) for tappable areas                                                  | Buttons, card actions  |


*(Fill in or link to design system/tokens file.)*

---

### 3. Components & Variants

For each UI building block, specify:

- **Name** (e.g. SnippetCard, PrimaryButton).
- **States:** default, hover, focus, active, disabled, loading, error (as applicable).
- **Variants:** e.g. primary vs secondary button; card with/without cover.
- **Usage:** where it’s used (e.g. “SnippetCard uses Primary button for Read, icon buttons for Save/Highlight/Skip”).


| Component    | States                                           | Variants                              | Usage                   |
| ------------ | ------------------------------------------------ | ------------------------------------- | ----------------------- |
| SnippetCard  | default, saved, loading (skeleton)               | with/without cover, with/without tags | Feed                    |
| Button       | default, hover, focus, active, disabled, loading | primary, secondary, icon-only         | Cards, reader, settings |
| BottomNav    | default, active tab                              | —                                     | App shell               |
| ReaderTopBar | default, with back                               | —                                     | Reader                  |
| …            |                                                  |                                       |                         |


*(Expand table as needed; link to component library if available.)*

---

### 4. Interaction & Motion

- **Tap/click feedback:** What changes on press (e.g. button scale, card highlight). *(Spec: _____________)*
- **Card → reader transition:** Shared element (cover + title). Duration: ___ ms. Easing: ___. *(Spec: _____________)*
- **Skip (card dismiss):** Direction: ___. Duration: ___ ms. Next card behavior: ___. *(Spec: _____________)*
- **Modals/drawers:** Enter/exit animation and duration. *(Spec: _____________)*
- **Loading:** Skeleton shape vs real content; where spinner vs skeleton is used. *(Spec: _____________)*
- **Gestures:** Pull-to-refresh (yes/no, visual). Swipe to dismiss (Skip). Swipe between reader pages. Edge behavior. *(Spec: _____________)*

---

### 5. Copy & Content Rules

- **All user-facing strings:** Button labels, nav labels, empty states, error messages, onboarding steps, settings labels. *(Source: _____________ or list below.)*
  - Feed empty (no books): *“Add your first book”* + CTA.
  - Feed empty (no results): *“No results for this mode. Try Discovery mode or add more books.”*
  - Processing: *“Preparing your feed…”*
  - Card actions: Save, Highlight, Read, Skip.
  - Errors: e.g. *“This file couldn’t be processed”*, *“Retry”*, *“Remove”*.
- **Formatting:** “3 saved today”, “Chapter 3 · Page 42”, “N items due”, dates. *(Rules: _____________)*
- **Truncation:** Title: ___ lines. Snippet body: ___ lines. Ellipsis: yes/no. *(Rules: _____________)*

---

### 6. States & Edge Cases

- **Empty:** No books (CTA + drag-drop). No snippets for mode (message + suggestion). No search results (message).
- **Loading:** Feed (skeletons). Library (per-card progress). Reader (spinner or placeholder).
- **Error:** Per-card “Retry”. App-level: recovery UI (no white screen). *(Exact copy and layout: _____________)*
- **Edge content:** No cover (placeholder: _____________). No author (show: _____________). Very long title/snippet (wrap/truncate: _____________).

---

### 7. Navigation & Flow

- **Flows:** Onboarding → Feed → Library → back. Feed → Reader → back. Settings → Export / AI config. Where “Quote out” and “Export” live.
- **Focus:** On open reader: focus target (e.g. main content or “Skip to content”). On back: focus returns to the tapped card.
- **URLs:** `/feed`, `/library`, `/reader/[bookId]`, `/onboarding`, `/settings`. Reader deep link: `?loc=`.

---

### 8. Accessibility (Handoff)

- **Focus order:** Per screen, first focusable element and sequence. *(Spec: _____________)*
- **aria-labels:** Exact wording for icon-only buttons (Save, Highlight, Read, Skip, back, TOC, settings, etc.). *(List or link: _____________)*
- **Reduced motion:** Which animations are disabled or shortened when `prefers-reduced-motion: reduce`. *(Spec: _____________)*

---

### 9. Assets

- **Icons:** Set (Save, Highlight, Skip, back, TOC, settings, …). Format: SVG preferred. Size per use. *(Path or library: _____________)*
- **Illustrations:** Empty state, onboarding (if any). Format and usage. *(Path: _____________)*
- **Logo / wordmark:** Splash, PWA icon, header if needed. *(Path: _____________)*

---

## Accessibility (Implementation)

- Focus management: feed → reader → back to card.
- All interactive elements focusable and labeled (see handoff above).
- Contrast and touch targets meet WCAG 2.1 AA.
- Reduced motion: document in Motion (Design Language) and respect in code.

---

## Performance

- **Budget:** LCP &lt; 2.5s (3G), FCP &lt; 1.5s, feed first paint &lt; 200ms, shared-element &lt; 400ms, tap response &lt; 300ms.
- Mobile-first; bottom nav for thumbs; safe areas for notches.

---

## Out of Scope (Design)

- No dark patterns (fake urgency, hidden costs).
- No decorative-only animation.
- No modal-heavy flows for the core loop (feed → read → back).

