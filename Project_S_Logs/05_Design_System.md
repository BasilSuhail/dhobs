# Project S — Design System

A living design system for Project S. This document defines the visual language, component patterns, and interaction principles that ensure a consistent, trustworthy, and intuitive experience across the dashboard, mobile app, and all public-facing materials.

---

## 1. Design Principles

These principles guide every design decision. When in doubt, refer back here.

1. **Clarity over cleverness** — Every element must have an obvious purpose. No decorative noise. If a user has to guess what something does, the design has failed.
2. **Trust through transparency** — The UI must always communicate what the system is doing. Show container states, encryption status, and resource usage honestly. Never hide errors.
3. **Power without complexity** — The default view should be simple enough for a first-time self-hoster. Advanced controls exist but are layered — revealed on demand, never in the way.
4. **Consistent and predictable** — Same action, same pattern, everywhere. A toggle behaves the same in Settings as it does in the Smart Home module. No surprises.
5. **Privacy-first aesthetic** — The visual tone should feel secure, private, and grounded. No playful candy colors. Think: vault door, not toy box.

---

## 2. Color System

### 2.1 Core Palette

| Token | Hex | Usage |
|---|---|---|
| `--ps-midnight` | `#0D1117` | Primary background (dark mode default) |
| `--ps-surface` | `#161B22` | Cards, panels, elevated surfaces |
| `--ps-surface-raised` | `#1C2128` | Modals, dropdowns, popovers |
| `--ps-border` | `#30363D` | Dividers, card borders, input outlines |
| `--ps-text-primary` | `#E6EDF3` | Primary text, headings |
| `--ps-text-secondary` | `#8B949E` | Secondary text, labels, timestamps |
| `--ps-text-muted` | `#484F58` | Placeholder text, disabled labels |

### 2.2 Accent Palette

| Token | Hex | Usage |
|---|---|---|
| `--ps-accent` | `#58A6FF` | Primary accent — links, active states, primary buttons |
| `--ps-accent-hover` | `#79C0FF` | Hover state for accent elements |
| `--ps-accent-subtle` | `rgba(56,139,253,0.15)` | Accent backgrounds (badges, highlights) |

### 2.3 Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `--ps-success` | `#3FB950` | Healthy containers, successful operations, online status |
| `--ps-success-subtle` | `rgba(63,185,80,0.15)` | Success background tints |
| `--ps-warning` | `#D29922` | High resource usage, expiring certs, degraded services |
| `--ps-warning-subtle` | `rgba(210,153,34,0.15)` | Warning background tints |
| `--ps-danger` | `#F85149` | Errors, stopped containers, security alerts, destructive actions |
| `--ps-danger-subtle` | `rgba(248,81,73,0.15)` | Danger background tints |
| `--ps-info` | `#58A6FF` | Informational banners, tips, update available |

### 2.4 Light Mode (Future)

Light mode is a secondary priority. When implemented, invert the core palette:
- Background: `#FFFFFF`, Surface: `#F6F8FA`, Border: `#D0D7DE`
- Text Primary: `#1F2328`, Text Secondary: `#656D76`
- Accent and semantic colors remain the same with adjusted subtle tints for contrast.

### 2.5 Color Usage Rules

- Never use raw hex values in components — always reference tokens.
- Accent color is reserved for interactive elements only. Do not use it for static decoration.
- Semantic colors must only be used for their stated purpose. Green = success/healthy, never "go" or "positive revenue."
- Maintain a minimum contrast ratio of 4.5:1 for text on backgrounds (WCAG AA).

---

## 3. Typography

### 3.1 Font Stack

| Role | Font | Fallback |
|---|---|---|
| **UI / Body** | Inter | -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif |
| **Monospace / Code** | JetBrains Mono | "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace |

Inter is chosen for its excellent legibility at small sizes, wide language support, and open-source license (OFL). JetBrains Mono provides clear distinction between similar characters (0/O, 1/l/I) which is critical for terminal output, logs, and configuration display.

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `--ps-display` | 28px | 600 | 1.25 | Page titles (e.g., "Dashboard", "Settings") |
| `--ps-heading-lg` | 20px | 600 | 1.3 | Section headings, module card titles |
| `--ps-heading-sm` | 16px | 600 | 1.4 | Sub-section headings, widget titles |
| `--ps-body` | 14px | 400 | 1.5 | Default body text, descriptions |
| `--ps-body-sm` | 12px | 400 | 1.5 | Captions, timestamps, helper text |
| `--ps-label` | 11px | 500 | 1.2 | ALL CAPS labels, badge text, overlines |
| `--ps-mono` | 13px | 400 | 1.6 | Terminal output, code blocks, config values |

### 3.3 Typography Rules

- Headings use weight 600 (semibold), never bold (700) — keeps the tone calm, not aggressive.
- Body text is always 14px minimum. Never go below 11px for any readable content.
- Monospace is used exclusively for: terminal output, code, container IDs, IP addresses, file paths, and configuration keys/values.
- Use sentence case for all UI text ("Manage containers"), never Title Case ("Manage Containers") except in the product name "Project S."

---

## 4. Spacing & Layout

### 4.1 Spacing Scale (Base 4px)

| Token | Value | Usage |
|---|---|---|
| `--ps-space-1` | 4px | Tight internal padding, icon-to-text gap |
| `--ps-space-2` | 8px | Compact element spacing, inline padding |
| `--ps-space-3` | 12px | Default internal padding for small components |
| `--ps-space-4` | 16px | Standard card padding, section gaps |
| `--ps-space-5` | 20px | Medium separation between sections |
| `--ps-space-6` | 24px | Large card padding, column gaps |
| `--ps-space-8` | 32px | Page-level section separation |
| `--ps-space-10` | 40px | Major layout breaks |
| `--ps-space-12` | 48px | Top/bottom page margins |

### 4.2 Grid System

- **Dashboard grid:** 12-column fluid grid with `24px` gutters.
- **Module cards:** Auto-fill grid with `min-width: 280px`, `max-width: 1fr`.
- **Sidebar:** Fixed width `240px` (collapsed: `64px` icon-only mode).
- **Content max-width:** `1280px` centered, with `24px` horizontal padding.
- **Breakpoints:**

| Token | Width | Target |
|---|---|---|
| `--ps-bp-sm` | 640px | Mobile |
| `--ps-bp-md` | 768px | Tablet portrait |
| `--ps-bp-lg` | 1024px | Tablet landscape / small desktop |
| `--ps-bp-xl` | 1280px | Standard desktop (1080p) |
| `--ps-bp-2xl` | 1536px | Wide desktop (1440p+) |

### 4.3 Layout Rules

- No module should require more than 2 clicks to reach from the home screen.
- Cards must be rearrangeable via drag and drop on the home screen.
- Sidebar collapses to icon-only on screens below `1024px`.
- All layouts must remain usable at `1080p` — this is the primary target resolution.

---

## 5. Border Radius & Elevation

### 5.1 Border Radius

| Token | Value | Usage |
|---|---|---|
| `--ps-radius-sm` | 4px | Badges, tags, small chips |
| `--ps-radius-md` | 6px | Buttons, inputs, dropdowns |
| `--ps-radius-lg` | 8px | Cards, panels, modals |
| `--ps-radius-xl` | 12px | Large containers, feature panels |
| `--ps-radius-full` | 9999px | Avatars, status dots, pill shapes |

### 5.2 Elevation (Shadows)

Dark mode relies primarily on surface color differentiation rather than shadows. Shadows are subtle and used sparingly.

| Token | Value | Usage |
|---|---|---|
| `--ps-shadow-sm` | `0 1px 2px rgba(0,0,0,0.3)` | Dropdowns, tooltips |
| `--ps-shadow-md` | `0 4px 12px rgba(0,0,0,0.4)` | Modals, floating panels |
| `--ps-shadow-lg` | `0 8px 24px rgba(0,0,0,0.5)` | Popovers, context menus |

---

## 6. Iconography

### 6.1 Icon Set

- **Primary set:** Lucide Icons (MIT licensed, consistent stroke style, 24x24 grid).
- **Stroke width:** `1.5px` — matches the Inter font weight visually.
- **Default size:** `20px` for inline icons, `24px` for navigation, `16px` for compact contexts.

### 6.2 Icon Usage Rules

- Every icon must be accompanied by a text label in navigation and primary actions. Icon-only is acceptable only in: toolbar buttons (with tooltips), status indicators, and the collapsed sidebar.
- Use semantic color on icons only to convey status (green checkmark = healthy, red X = error). Decorative icons use `--ps-text-secondary`.
- Never use icons from mixed sets. Stick to Lucide throughout the entire product.
- Custom icons (for modules like Jellyfin, Matrix, etc.) must be designed on the same 24x24 grid with 1.5px stroke to maintain visual consistency.

---

## 7. Core Components

### 7.1 Buttons

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Primary** | `--ps-accent` | `#FFFFFF` | none | Main CTA per screen (Install, Save, Create) |
| **Secondary** | transparent | `--ps-text-primary` | `--ps-border` | Secondary actions (Cancel, Back, Edit) |
| **Danger** | `--ps-danger` | `#FFFFFF` | none | Destructive actions (Delete, Stop, Remove) |
| **Ghost** | transparent | `--ps-text-secondary` | none | Tertiary actions, toolbar items |

- **Sizing:** Height `36px` (default), `32px` (compact), `40px` (large).
- **Padding:** `12px 16px` horizontal, always center-aligned text.
- **Disabled state:** 40% opacity, `cursor: not-allowed`.
- **Loading state:** Replace label with a spinner, maintain button width.
- **Rule:** Only one Primary button per visible screen area.

### 7.2 Module Cards

The home screen card is the primary interaction point for every integrated service.

```
┌─────────────────────────────┐
│  [Icon]  Module Name    [●] │  ← Header: icon + name + status dot
│                             │
│  Key Metric or Status       │  ← Body: one-line summary stat
│  e.g. "3.2 TB / 4 TB"      │
│                             │
│  [ Open ]  [ ⋮ ]           │  ← Footer: launch button + overflow menu
└─────────────────────────────┘
```

- **Status dot:** Green (running), Yellow (degraded), Red (stopped), Gray (not installed).
- **Min-width:** `280px`. Cards fill available grid space evenly.
- **Hover:** Subtle border color shift to `--ps-accent` at 30% opacity.
- **Drag handle:** Visible on hover, top-left grip icon.

### 7.3 Inputs

- **Height:** `36px` default.
- **Border:** `1px solid var(--ps-border)`, focus: `1px solid var(--ps-accent)` + `0 0 0 2px var(--ps-accent-subtle)`.
- **Background:** `--ps-surface`.
- **Placeholder:** `--ps-text-muted`, regular weight.
- **Error state:** Border `--ps-danger`, helper text below in `--ps-danger`.
- **Labels:** Always above the input, `--ps-body-sm` size, `--ps-text-secondary` color.

### 7.4 Status Badges

| State | Background | Text | Dot |
|---|---|---|---|
| Running | `--ps-success-subtle` | `--ps-success` | Pulsing green |
| Stopped | `--ps-danger-subtle` | `--ps-danger` | Static red |
| Degraded | `--ps-warning-subtle` | `--ps-warning` | Static yellow |
| Updating | `--ps-accent-subtle` | `--ps-accent` | Spinning |
| Not Installed | `--ps-border` bg | `--ps-text-muted` | None |

### 7.5 Notifications & Toasts

- **Position:** Top-right of viewport, stacked vertically.
- **Auto-dismiss:** Info/success after 5 seconds. Warnings persist until dismissed. Errors persist until resolved or dismissed.
- **Structure:** Icon (semantic color) + title + optional description + dismiss button.
- **Max visible:** 3 stacked. Overflow collapses into "N more notifications" link.

---

## 8. Server Metrics Widget

The resource monitoring widget is a core dashboard element.

### 8.1 Gauge Design

```
     CPU          RAM         Storage        GPU
   ┌─────┐     ┌─────┐     ┌─────┐      ┌─────┐
   │ 42% │     │ 6.1 │     │ 2.8 │      │ 15% │
   │     │     │/8 GB│     │/4 TB│      │     │
   └─────┘     └─────┘     └─────┘      └─────┘
   ▓▓▓▓▓░░░   ▓▓▓▓▓▓▓░   ▓▓▓▓▓▓▓░    ▓▓░░░░░░
```

- **Bar style:** Horizontal progress bars below each metric.
- **Color coding:** `--ps-success` (0-60%), `--ps-warning` (60-85%), `--ps-danger` (85-100%).
- **Update frequency:** Poll via WebSocket every 2-5 seconds.
- **GPU:** Only shown if GPU is detected. Graceful absence — no empty slot.

---

## 9. Navigation

### 9.1 Sidebar Structure

```
┌──────────────────────┐
│  [S] Project S       │  ← Logo/wordmark
├──────────────────────┤
│  ◆  Dashboard        │
│  ◇  Media            │
│  ◇  Drive            │
│  ◇  CodeSpace        │
│  ◇  Chat             │
│  ◇  Passwords        │
│  ◇  Smart Home       │
├──────────────────────┤
│  ◇  App Store        │
│  ◇  Terminal         │
│  ◇  Docker           │
├──────────────────────┤
│  ◇  Settings         │
│  ◇  Users & Roles    │
│  ◇  Backups          │
│  ◇  System Logs      │
├──────────────────────┤
│  [avatar] User Name  │  ← Bottom: user context
│  Role · Logout       │
└──────────────────────┘
```

- **Active item:** `--ps-accent-subtle` background + `--ps-accent` text + left border accent bar (3px).
- **Collapsed mode:** Icons only at `64px` width. Tooltip on hover shows module name.
- **Grouping:** Logical groups separated by a thin `--ps-border` divider, not labels.

### 9.2 Top Bar

- **Left:** Breadcrumb (e.g., Dashboard > Media > Jellyfin).
- **Center:** Global search (`Cmd/Ctrl + K` to focus).
- **Right:** Notification bell (with unread count badge) + user avatar.

---

## 10. Motion & Animation

### 10.1 Timing

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `--ps-duration-fast` | `100ms` | `ease-out` | Hover states, color transitions |
| `--ps-duration-base` | `200ms` | `ease-in-out` | Panel open/close, dropdowns |
| `--ps-duration-slow` | `300ms` | `ease-in-out` | Page transitions, modal enter/exit |

### 10.2 Animation Rules

- **Reduce motion:** Respect `prefers-reduced-motion: reduce`. Replace all animations with instant state changes.
- **No bouncing, no elastic easing.** Motion should feel precise and mechanical — matching the "technical precision" brand value.
- **Status dot pulse:** Running containers have a subtle 2s infinite pulse on their green status dot. This is the only looping animation in the UI.
- **Loading spinners:** Simple rotating circle, 1s loop, `--ps-accent` color. Never use skeleton screens for data that loads in under 500ms.

---

## 11. Accessibility

- **Contrast:** All text meets WCAG AA (4.5:1). Large text (18px+) meets AAA (7:1).
- **Focus indicators:** Visible `2px` outline in `--ps-accent` on all focusable elements. Never remove focus outlines.
- **Keyboard navigation:** Full tab-order support across all components. `Escape` closes modals/dropdowns. `Enter` activates buttons. Arrow keys navigate lists.
- **Screen readers:** All icons have `aria-label`. Status dots include `aria-live` for dynamic updates. Module cards are `role="article"` with descriptive `aria-label`.
- **Color independence:** Never convey information through color alone. Status badges always include text labels alongside colored dots.

---

## 12. Dark Mode as Default

Project S ships in dark mode by default. Rationale:

- Server dashboards are often used in low-light environments (home offices, server rooms).
- Reduces eye strain during extended monitoring sessions.
- Aligns with the "privacy-first" aesthetic — dark UIs feel more secure and private.
- Lower power consumption on OLED displays (relevant for mobile companion app).

Light mode will be offered as a toggle in Settings (future iteration) but is not the primary design target.

---

## 13. File & Asset Naming Conventions

| Asset Type | Pattern | Example |
|---|---|---|
| Icons | `icon-{name}.svg` | `icon-media.svg` |
| Illustrations | `illust-{context}.svg` | `illust-onboarding.svg` |
| Screenshots | `screen-{module}-{state}.png` | `screen-dashboard-active.png` |
| Logo variants | `logo-{variant}.svg` | `logo-full.svg`, `logo-mark.svg`, `logo-mono.svg` |
| Component tokens | `--ps-{category}-{property}` | `--ps-color-accent`, `--ps-space-4` |
