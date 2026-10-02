---
name: tailwind-css
description: Styling guide for this project's Tailwind CSS v4 setup — theme tokens, class conventions, dynamic values, and v4 gotchas. Use whenever writing or changing UI in src/components or src/app, adding a color/size/shadow, converting styles, or reviewing a diff that touches className.
when_to_use: Trigger on any UI/styling work — "style", "restyle", "layout", "className", "Tailwind", "spacing", "color", "dark mode", "responsive", "make it look like", "new component", "new page", "dialog", "table".
---

# Tailwind CSS (v4) — finance-dashboard

This project styles everything with **Tailwind CSS v4** utility classes. There are no
inline `style={{…}}` objects, no CSS modules, and no component library.

## Setup (already done — don't redo)

- Packages: `tailwindcss` + `@tailwindcss/postcss` (dev deps).
- `postcss.config.mjs` registers `@tailwindcss/postcss`. There is **no `tailwind.config.js`**:
  v4 is configured in CSS.
- `src/app/globals.css` starts with `@import "tailwindcss";` and defines every design token in
  `@theme` / `@theme inline`. Tailwind scans the project automatically (gitignored files are
  skipped), so classes in `src/lib/*.ts` are picked up too.

## Theme tokens (source of truth: `src/app/globals.css`)

Use these tokens. Add a new token to `@theme` rather than scattering arbitrary values.

| Purpose | Class examples | Value |
| --- | --- | --- |
| Page background | `bg-canvas` | `#f2f2f3` |
| Surface (sidebar, inputs, top bar) | `bg-surface` | `#e9e9ea` |
| Text | `text-ink`, faded `text-ink/60` | `#1d1f20` |
| Borders | `border-line` (16%), `border-line-soft` (8%) | ink at 16% / 8% |
| Accent scale | `accent-50 200 300 400 500 600 700 800` | `#f6f6ee` → `#333421` (olive), `500` = `#7f8051` |
| Neutrals | `graphite` `#424244`, `muted` `#5d5d60`, `mist` `#f5f5f8`, `shade` `#2b2b2d` | |
| Error | `text-error` | `#8a3b3b` |
| Fonts | `font-sans` (Barlow body), `font-condensed` (Barlow Condensed headings/buttons) | |
| Font sizes | `text-10 … text-32` — exact px, **no** built-in line-height | 10 11 12 13 14 15 17 20 22 28 30 32 |
| Shadows | `shadow-dialog`, `shadow-card`, `shadow-menu` | |

The default Tailwind `text-xs/sm/lg…` scale is cleared on purpose; use the px-named sizes.
Spacing uses the default 4px scale; v4 allows quarter steps (`gap-4.5` = 18px, `gap-1.25` = 5px,
`w-59` = 236px), so arbitrary spacing like `p-[18px]` is almost never needed.

## Conventions

1. **No inline `style`.** Every static style is a class. For runtime values:
   - Colors/states from data → return a **full class string** from the derivation
     (`amountClass: "text-accent-600"`), never a hex.
   - Percent widths (progress bars) → an SVG `<rect width={pct}>` attribute, or a CSS variable
     only as a last resort.
   - Chart geometry stays in SVG attributes (`x`, `y`, `d`); color it with `fill-*` / `stroke-*`.
2. **Never build class names from fragments** (`` `bg-${color}` ``). Tailwind only sees
   complete literal strings. Use lookup maps whose values are full classes.
3. **Shared class strings** are exported `const`s named camelCase + `Class`
   (e.g. `inputClass`, `saveButtonClass` in `DialogOverlay.tsx`). Components that accept
   extra styling take a `className` prop and join it with `cx()` from `@/lib/cx`.
4. **State variants over JS handlers.** Use `hover:`, `focus-visible:`, `disabled:`,
   `aria-[current=page]:` — never `onMouseEnter` to change styles.
5. **Order classes** roughly: layout/position → box (size, spacing) → border → background →
   typography → effects → state variants. Keep one class list per element; extract a const
   when the same list repeats 3+ times in a file.
6. **Opacity** uses the modifier: `text-ink/55`, `bg-accent-500/6`. Any integer works in v4.

## Preflight gotchas (things that differ from plain browser defaults)

- Headings are unstyled (`font-size`/`font-weight` inherit, margin 0) — set size and weight.
- Buttons have `cursor: default` and transparent background — add `cursor-pointer`.
- Borders default to `0 solid` with color `currentColor`; `border` alone draws 1px in the text
  color, so always pair it with a color (`border border-line`).
- `svg`/`img` are `display: block` — fine inside flex, but watch inline icons in text.
- `table` gets `border-collapse: collapse`; `th` keeps bold weight.

## v4 syntax reminders (training data is often v3)

- `@import "tailwindcss";` replaces the three `@tailwind` directives.
- Customize via `@theme { --color-x: …; }` in CSS, not a JS config. `@theme inline` when a token
  references another CSS variable (the `next/font` variables).
- Custom utilities: `@utility name { … }`; base styles: `@layer base { … }`.
- Renamed utilities: `shadow-sm`→`shadow-xs`, `shadow`→`shadow-sm`, `rounded`→`rounded-sm`,
  `outline-none`→`outline-hidden`, `ring` is 1px by default, `bg-gradient-to-r`→`bg-linear-to-r`.
- Important modifier goes at the end: `p-4!`.

## Verify

After styling changes run `npm run build` (type-check + CSS compile) and `npm run lint`,
then check the page in the browser. `grep -rn "style={{" src` should return nothing.
