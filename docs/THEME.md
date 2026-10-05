# Theme: "Carbon & Volt"

## Why dark, and why volt

**What the research showed (October 2026)**

- The biggest sportswear sites (Nike, Adidas, Puma, Under Armour, Alpinestars) use plain, colourless light interfaces and let product photography carry the colour.
- The premium *performance-gear* trend for 2025–26 goes the other way:
  - a near-black base
  - a single neon yellow-green accent, used only for buttons, badges and interactive elements
  - oversized condensed type
  - cinematic 3D product visuals
- Nike picked its "Volt" yellow-green because the human eye is most sensitive to that hue.
- Against carbon, volt gives the strongest "click here" signal on the page: about 15:1 contrast.
- It clearly separates this brand from:
  - **FM Sports** (black and orange)
  - **Triad Thread Studio** (black and gold)

## Dark-mode rules applied

- **No pure black.** Pure black behind white text causes halation (letters appear to smear). The base is carbon `#0c0d10`; the deepest panels are `#07080a`.
- **Depth through lighter surfaces, not shadows:** paper `#0c0d10` → chalk `#111317` → surface `#15181c` → surface-2 `#1d2126`.
- **One accent, used sparingly:**
  - Volt `#cdf54a` is the primary action, always with dark text on it.
  - White is the secondary action.
  - Outline buttons are the tertiary action.
- **Contrast meets WCAG AA or better:**

  | Text | Contrast on paper |
  |---|---|
  | `fg` | 17.6:1 |
  | `muted` | 8.0:1 |
  | `subtle` | 5.1:1 |
  | `accent` | 15.4:1 |

- **Native controls render dark** via `color-scheme: dark` (selects, date pickers, scrollbars).
- **Focus rings are volt**, and switch to carbon on the volt call-to-action band so keyboard focus is never invisible.

## Tokens

All tokens live in `src/app/globals.css` (`@theme`). Change the accent in one place:

- `--color-accent`
- `--color-accent-hover`
- `--color-accent-ink`

## Sources

- [shadcn design notes — Puma, Under Armour, Adidas](https://www.shadcn.io/design/puma/raw)
- [Dark mode UI best practices (Atmos)](https://atmos.style/blog/dark-mode-ui-best-practices)
- [12 principles of dark mode design (Uxcel)](https://uxcel.com/blog/12-principles-of-dark-mode-design-627)
- [Why sneakers are so bright — the Volt story (Scholastic)](https://scope.scholastic.com/issues/2022-23/050123/why-are-your-sneakers-so-bright.html)
