# Inspect Bubble App — Page Design & Component Reference

> Full documentation of the `/inspect-bubble-app` page: layout, component architecture, design system, dark mode strategy, interactive behavior, and data contracts.

---

## Page Overview

**Route:** `/inspect-bubble-app`
**File:** `src/pages/inspect-bubble-app.astro`
**Layout:** `BaseLayout` (shared site layout with navigation, theme toggle, etc.)
**Wrapper:** `Wrapper variant="standard"` (shared max-width container)

The page renders a full inspection report for a Bubble.io application. It currently consumes fixture data from a local JSON file and is designed for zero-change transition to live API data.

---

## Design Principles

### 1. Minimal & Clean

Every section follows the same visual pattern: a section title in `displaySM` weight, a muted subtitle with counts, and the content. No decorative chrome, no gradients, no unnecessary borders. White space does the work.

### 2. Consistent with Landing Page

The design mirrors `src/pages/index.astro` — same `Wrapper`, same `Text` component variants, same color tokens. The inspect page feels like a natural extension of the marketing site, not a bolted-on tool.

### 3. Data-Dense Without Clutter

Each component shows summary counts upfront (e.g. "24 data types · 18 relationships") and uses progressive disclosure (expandable accordions, tab views) so users aren't overwhelmed. Only one accordion item is open at a time.

### 4. Mobile-First Responsive

All layouts stack vertically on mobile and expand to multi-column on larger screens. Section headers, legends, and metadata rows wrap naturally using `flex-col` → `sm:flex-row` patterns. Tables hide non-essential columns on small screens (`hidden sm:table-cell`, `hidden md:table-cell`).

### 5. Domain-Specific Visualization

Components are tailored to what the data actually means:
- Database fields are color-coded by type (text = green, number = blue, etc.)
- Pages are tagged by category (Auth, Admin, Home, etc.)
- Colors render as actual swatches with hex codes
- API routes are purposefully blurred for security
- Console messages are grouped and color-coded by severity

---

## Dark Mode Strategy

### How It Works

The site uses class-based dark mode (`document.documentElement.classList.contains("dark")`). Tailwind's `dark:` variant prefix handles all CSS switching.

### Color Token System

All components use the project's `base-*` color scale rather than raw Tailwind grays:

| Purpose | Light | Dark |
|---------|-------|------|
| Primary text | `text-base-900` | `dark:text-white` |
| Secondary text | `text-base-500` | `dark:text-base-400` |
| Tertiary/muted text | `text-base-400` | `dark:text-base-500` |
| Faint text (counters, indices) | `text-base-400` | `dark:text-base-600` |
| Borders | `border-base-200` | `dark:border-base-800` |
| Dividers | `divide-base-200` | `dark:divide-base-800` |
| Surface/card backgrounds | `bg-base-100` | `dark:bg-base-800` |
| Subtle backgrounds | `bg-base-200/50` | `dark:bg-base-800/50` |

### Accent Colors (Semantic)

Accent colors always appear in pairs with the `dark:` prefix:

| Meaning | Light | Dark |
|---------|-------|------|
| Success/text type | `text-emerald-600` | `dark:text-emerald-400` |
| Number type | `text-blue-600` | `dark:text-blue-400` |
| Boolean type | `text-purple-600` | `dark:text-purple-400` |
| Date type | `text-rose-600` | `dark:text-rose-400` |
| File/image type | `text-cyan-600` | `dark:text-cyan-400` |
| Option set type | `text-orange-600` | `dark:text-orange-400` |
| Relationship type | `text-amber-600` | `dark:text-amber-400` |
| Error messages | `text-rose-600` | `dark:text-rose-400` |
| Warning messages | `text-amber-600` | `dark:text-amber-400` |

### Accent Backgrounds (Badges/Pills)

Badges use 10% opacity backgrounds with matching ring borders. This pattern works identically in both modes:

```
bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-600 dark:text-emerald-400
```

### Legend & Status Dots

Status dots use the `500` shade (e.g. `bg-emerald-500`, `bg-blue-500`) which reads well against both light and dark backgrounds.

### Mermaid Diagram Theme

The ERD diagram has full dark mode support via Mermaid's `themeVariables`:

**Dark mode:**
```javascript
{
  darkMode: true,
  background: "transparent",
  primaryColor: "#1e293b",        // slate-800
  primaryTextColor: "#e2e8f0",    // slate-200
  primaryBorderColor: "#334155",  // slate-700
  lineColor: "#475569",           // slate-600
  secondaryColor: "#1e293b",
  tertiaryColor: "#0f172a",       // slate-900
  fontFamily: "ui-monospace, monospace",
  fontSize: "12px",
}
```

**Light mode:**
```javascript
{
  background: "transparent",
  primaryColor: "#f8fafc",        // slate-50
  primaryTextColor: "#1e293b",    // slate-800
  primaryBorderColor: "#e2e8f0",  // slate-200
  lineColor: "#94a3b8",           // slate-400
  secondaryColor: "#f1f5f9",      // slate-100
  tertiaryColor: "#ffffff",
  fontFamily: "ui-monospace, monospace",
  fontSize: "12px",
}
```

Theme detection happens at render time: `document.documentElement.classList.contains("dark")`.

---

## Page Layout & Spacing

```
┌─────────────────────────────────────────┐
│ Header (pt-32 pb-12)                    │
│   Title: "Bubble app inspector"         │
│   Badge: "Bubble Detected"              │
│   URL + Version + App ID               │
├─────────────────────────────────────────┤
│ Detection Summary (pb-16)               │
├─────────────────────────────────────────┤
│ Pages (pb-16)                           │
├─────────────────────────────────────────┤
│ Color Palette (pb-16)                   │
├─────────────────────────────────────────┤
│ Database Schema (pb-16)                 │
│   [View] [Diagram] [DBML] tabs          │
├─────────────────────────────────────────┤
│ Option Sets (pb-16)                     │
├─────────────────────────────────────────┤
│ API Endpoints — blurred (pb-16)         │
├─────────────────────────────────────────┤
│ Console Output (pb-24)                  │
└─────────────────────────────────────────┘
```

Each section is a `<section>` with `<Wrapper variant="standard">` and consistent `pb-16` bottom padding (last section uses `pb-24` for extra breathing room).

---

## Component Reference

### 1. Header (inline in page)

**File:** `src/pages/inspect-bubble-app.astro` (lines 30–63)

The header is not a separate component. It contains:

- **Title**: `displayXL` variant, medium weight, tight tracking
- **Bubble Detected badge**: Emerald green pill with a pulsing dot. Uses `w-fit` so it doesn't stretch on mobile
- **URL**: `textSM` variant, `break-all` for long URLs
- **Version + App ID**: `textXS` variant, `whitespace-nowrap` to prevent mid-word breaks

**Mobile behavior**: The badge, URL, and version stack vertically (`flex-col gap-2`). On `sm+`, they flow horizontally (`sm:flex-row sm:flex-wrap sm:items-center sm:gap-3`).

---

### 2. BubbleDetection

**File:** `src/components/inspect/BubbleDetection.astro`

**Props:**
```typescript
{
  detection: { bubble_version, bubble_page_name, has_app, app_id, has_app_styles, has_client_safe, isLikelyBubble, ... };
  summary: { hasApp, appKeys, warnings };
  debugMeta: { hasUserTypes, hasOptionSets, hasPagesObject, hasColorsObject };
  submittedUrl: string;
  finalUrl: string;
}
```

**Sections:**
1. **Stat cards** — 4-column grid (1 col mobile → 2 col sm → 4 col lg): App ID, Bubble Version, Landing Page, Runtime Keys
2. **Redirect notice** — Amber-bordered callout shown only when `submittedUrl !== finalUrl`
3. **Detection checks** — 4-column grid of boolean indicators with green checkmarks (pass) or gray dots (fail): App runtime, App styles, Client safe data, User types, Option sets, Pages object, Colors object, API routes
4. **Warnings** — Amber-colored list of worker warnings

**Design notes:**
- Stat cards use `rounded-lg border border-base-200 dark:border-base-800 p-4`
- Labels are `textXS uppercase tracking-wider font-medium` in muted colors
- Values are `textBase font-medium` in primary text color

---

### 3. PageList

**File:** `src/components/inspect/PageList.astro`

**Props:**
```typescript
{ pages: { items: string[]; count: number; warnings?: string[] }; baseUrl: string }
```

**Design:**
- 3-column card grid (1 col → 2 col sm → 3 col lg)
- Each card: numbered index (mono), colored dot by category, page path, category label, external link icon
- Page categories with color mapping: Home (green), Error (rose), Auth (amber), Admin (purple), Onboarding (blue), Feature (cyan), Settings/Legal (gray), default (gray)
- External link icons appear on hover via the `group` class pattern
- URLs are constructed from `baseUrl + pageName`

---

### 4. ColorPalette

**File:** `src/components/inspect/ColorPalette.astro`

**Props:**
```typescript
{ colors: { "%del:false"?: ColorEntry[]; "%del:true"?: ColorEntry[]; warnings?: string[] } }
```

Where `ColorEntry = { id, "%nm" (name), "%d3" (description), rgba }`.

**Design:**
- 6-column responsive grid (2 → 3 → 4 → 6 columns)
- Each swatch: `aspect-4/3 rounded-lg` with the actual RGBA as `background-color`, hex code overlaid
- Smart text contrast: hex label uses `text-black/50` on light colors, `text-white/60` on dark colors. Luminance threshold: 0.7 via `(0.299R + 0.587G + 0.114B) / 255`
- Swatch border: `ring-1 ring-base-200 dark:ring-base-700` so swatches with near-white/near-black colors are still visible
- Below each swatch: color name + description in small text
- Deleted colors section: shown at 50% opacity with strikethrough names, smaller inline swatches (`size-5 rounded`)

---

### 5. DatabaseSchema

**File:** `src/components/inspect/DatabaseSchema.astro`

**Props:**
```typescript
{ database: { types: DataType[]; refs: Ref[]; dbml?: string; warnings?: string[] } }
```

This is the most complex component with three interactive views.

#### Tab System

Three text-style tab buttons with underline indicator:
- **View** — Default. Expandable accordion of data type cards
- **Diagram** — Mermaid ERD (lazy-loaded)
- **DBML** — Raw DBML text with copy button

Active tab: `dark:text-white text-base-900 border-b-2 border-base-900 dark:border-white`
Inactive tab: `dark:text-base-500 text-base-400 border-b-2 border-transparent` + hover states

All tabs have `cursor-pointer` and `transition-all duration-200`.

Switching is handled by client-side JavaScript. Panels use `data-db-panel="view|diagram|dbml"` attributes and toggle via `classList.toggle("hidden", ...)`.

#### View Panel

- Accordion using `<details>` elements — only one open at a time (enforced via `toggle` event listeners)
- Each card summary: index number (mono, right-aligned, zero-padded), type name, field count, relationship count (amber, shown only if > 0), chevron (rotates 180° when open via `group-open:rotate-180`)
- Expanded content: field table with columns: Field, Type (color-coded mono), DB Type (hidden on mobile), Flags (list/rel badges, hidden on small screens)
- Relationship summary below the table: outgoing refs (`→`) and incoming refs with `(many)` indicator for list relationships

**Field type color coding:**

| Type | Color |
|------|-------|
| `text` | Emerald |
| `number` | Blue |
| `boolean` | Purple |
| `date` | Rose |
| `image` / `file` | Cyan |
| `option.*` | Orange |
| `custom.*` (relationship) | Amber |
| Default | Base gray |

**Legend:** A row of colored dots with labels. Only visible in View mode (hidden when switching to Diagram or DBML via `legend?.classList.toggle("hidden", target !== "view")`).

#### Diagram Panel

- Lazy-loaded Mermaid library (`await import("mermaid")`)
- ERD definition generated server-side from `types` and `refs` data
- Entity names and field names are sanitized (non-word chars removed, spaces → underscores)
- Field types mapped: text→string, number→int, boolean→bool, date→datetime, relationships→FK, option sets→enum
- Relationship notation: `}o--||` for one-to-many, `||--||` for one-to-one
- Loading state: "Rendering diagram…" centered text, replaced by SVG on success
- Error state: "Failed to render diagram" in rose-500

**Data transfer to client-side:**
The Mermaid definition is stored in a `<script type="application/json" data-mermaid-src>` tag using `set:html={JSON.stringify(mermaidDef)}`. The client reads it via `JSON.parse(mermaidSrc.textContent)`. This approach avoids Astro's HTML encoding (which broke Mermaid when using `<pre>` tags — `"` was being encoded as `&quot;`).

#### DBML Panel

- Raw DBML text in a `<pre>` block with mono font, relaxed line-height
- Scrollable container: `overflow-auto max-h-128`
- Copy button: floating in top-right corner (`absolute top-3 right-3 z-10`)
- Copy feedback: icon swaps from clipboard to checkmark, text changes "Copy" → "Copied" for 2 seconds
- Fallback copy: `document.execCommand("copy")` for browsers without clipboard API

#### Initialization

The `initDbSchema()` function is called on both `DOMContentLoaded` and `astro:page-load` (for Astro's client-side navigation). A `data-initialized` attribute prevents double-initialization.

---

### 6. OptionSets

**File:** `src/components/inspect/OptionSets.astro`

**Props:**
```typescript
{ optionSets: { items: OptionSet[]; dbml?: string; warnings?: string[] } }
```

**Design:**
- Splits items into two groups: with custom attributes and without
- **With attributes**: Same accordion pattern as DatabaseSchema — numbered, expandable, one-at-a-time. Expanded view shows attribute table (name, type, flags)
- **Without attributes (simple)**: Rendered as a flex-wrap row of pill-shaped tags (`rounded-md bg-base-200/50 dark:bg-base-800/50 ring-1 ring-base-200 dark:ring-base-800`)
- Type color coding matches the database schema system

---

### 7. ApiRoutes

**File:** `src/components/inspect/ApiRoutes.astro`

**Props:**
```typescript
{ types: DataType[]; baseUrl: string }
```

**Design:**
This section is **intentionally blurred** to protect the inspected app's security.

- Generates plausible Data API endpoints from the database types × HTTP methods (GET, POST, PATCH, DELETE)
- Generates sample Backend Workflow endpoints (`wf/initialize`, `wf/process_payment`, etc.)
- All endpoint rows have `blur-[6px]` applied
- The entire section is `pointer-events-none select-none aria-hidden="true"`
- Max height capped at `max-h-64` to prevent excessive scrolling
- No count of routes is displayed (removed for security)

**Overlay:**
- Semi-transparent overlay: `bg-base-100/60 dark:bg-base-900/70 backdrop-blur-[2px]`
- Lock icon in a circular container
- "API routes hidden for security" heading
- Explanatory text about why routes are obscured

**HTTP method colors:**

| Method | Color |
|--------|-------|
| GET | Emerald |
| POST | Blue |
| PATCH | Amber |
| DELETE | Rose |

---

### 8. ConsoleMessages

**File:** `src/components/inspect/ConsoleMessages.astro`

**Props:**
```typescript
{ messages: ConsoleMessage[] }  // where ConsoleMessage = { type: string; text: string }
```

**Design:**
- Groups messages by type: Errors, Warnings, Logs (only non-empty groups shown)
- Each group has a colored dot, label, and count
- Individual messages: rounded cards with tinted backgrounds and ring borders
  - Errors: `bg-rose-500/5 ring-rose-500/10 text-rose-600 dark:text-rose-400`
  - Warnings: `bg-amber-500/5 ring-amber-500/10 text-amber-600 dark:text-amber-400`
  - Logs: `bg-base-500/5 ring-base-500/10 text-base-500 dark:text-base-400`
- Message text: `text-xs font-mono break-all leading-relaxed`
- Empty state: centered "No console messages captured" in a bordered container
- Header includes inline count badges (dots + counts for each type)

---

## Shared Component Patterns

### Text Component

All text uses the project's `Text` component from `@/components/fundations/elements/Text.astro`:

| Variant | Usage |
|---------|-------|
| `displayXL` | Page title |
| `displaySM` | Section titles |
| `textBase` | Stat card values |
| `textSM` | Section subtitles, body text |
| `textXS` | Labels, metadata, small counts |

### Section Header Pattern

Every component follows this structure:

```astro
<div class="flex flex-col gap-6">
  <div>
    <Text tag="h2" variant="displaySM" class="dark:text-white text-base-900 font-medium tracking-tighter">
      section title
    </Text>
    <Text tag="p" variant="textSM" class="dark:text-base-400 text-base-500 mt-1">
      {count} items · {otherCount} details
    </Text>
  </div>
  <!-- Content -->
</div>
```

Section titles are lowercase by convention (matching the landing page style).

### Accordion Pattern

Used in DatabaseSchema and OptionSets:

```html
<details class="group" data-*-card>
  <summary class="flex items-center justify-between py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
    <!-- Numbered index + name + count + chevron -->
  </summary>
  <div class="pb-6 pl-9">
    <!-- Expanded content -->
  </div>
</details>
```

- Native `<details>` element — works without JS for basic expand/collapse
- JS enhances with single-open accordion behavior
- Chevron animation via Tailwind's `group-open:rotate-180`
- Webkit marker hidden via `[&::-webkit-details-marker]:hidden`
- Content indented with `pl-9` to align under the name (past the index number)

### Badge/Pill Pattern

```html
<span class="inline-flex items-center rounded bg-{color}-500/10 px-1.5 py-0.5 text-[10px] font-medium text-{color}-600 dark:text-{color}-400 ring-1 ring-{color}-500/20">
  label
</span>
```

### Card Pattern

```html
<div class="rounded-lg border border-base-200 dark:border-base-800 p-4">
  <!-- content -->
</div>
```

### Numbered Index

```html
<span class="text-base-400 dark:text-base-600 text-xs font-mono tabular-nums w-6 shrink-0 text-right">
  {String(index + 1).padStart(2, "0")}
</span>
```

---

## Interactive Behavior Summary

| Feature | Implementation | Event |
|---------|---------------|-------|
| Database/OptionSet accordion | `<details>` + JS `toggle` listener | Single-open enforcement |
| Database view tabs | `data-tab` buttons + `data-db-panel` panels | Click → class toggle |
| Legend visibility | Hidden when not in "View" tab | Tab switch |
| DBML copy to clipboard | `navigator.clipboard.writeText()` + fallback `execCommand` | Click |
| Copy button feedback | Icon swap + text change for 2s | setTimeout |
| Mermaid diagram rendering | Lazy `import("mermaid")` on first "Diagram" tab click | Tab switch |
| Mermaid theme detection | `document.documentElement.classList.contains("dark")` at render time | Render-time check |

---

## Data Flow: Fixture → Live

Currently, the page imports a static JSON fixture:

```typescript
import fixtureData from "../../data/inspections/2026-03-07T00-00-43-548Z_app-vows-you.json";
```

Each data slice is destructured and passed as props:

```typescript
const detection = fixtureData.bubbleDetection;
const database = fixtureData.database;
// etc.
```

**To switch to live data**, only the page file changes:

1. Add a form or URL input that calls `POST /api/inspect`
2. Pass the response through the same destructuring
3. Feed the same props to the same components

No component modifications are needed. Every component:
- Accepts data via `Astro.props`
- Handles missing/empty data (empty arrays, nullish checks, `?? []` patterns)
- Renders an empty/zero state where appropriate

---

## Responsive Breakpoints Used

| Breakpoint | Usage |
|------------|-------|
| Default (mobile) | Single column, stacked layout |
| `sm` (640px) | 2-column grids, inline header metadata, show "DB Type" column |
| `md` (768px) | Show "Flags" column in schema tables |
| `lg` (1024px) | 3-4 column grids, 6-column color palette |

---

## Dependencies

| Package | Usage | Loaded |
|---------|-------|--------|
| `mermaid` | ERD diagram rendering | Lazy (client-side dynamic import, only when Diagram tab is clicked) |

Mermaid is the only client-side dependency added for this page. All other rendering is server-side Astro.

---

## Known Bugs Fixed During Development

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Tab switching didn't work | `initDbSchema()` not called on Astro page navigation | Added `astro:page-load` listener + `data-initialized` guard |
| Mermaid diagram "failed to render" | Astro HTML-encoded quotes in `<pre>` tag (`"` → `&quot;`) | Moved Mermaid definition to `<script type="application/json">` + `JSON.parse` on client |
| `aspect-[4/3]` linter warning | Tailwind shorthand available | Changed to `aspect-4/3` |
| JSON import lint error | TypeScript module resolution | Added `allowSyntheticDefaultImports: true` to `tsconfig.json` |
| Header cramped on mobile | All metadata on one line | Changed to `flex-col gap-2 sm:flex-row sm:flex-wrap` |
| Stale ConsoleMessage type error | `type` was a union literal, worker returned other strings | Widened `type` to `string` |
