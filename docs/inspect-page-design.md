# Inspect Bubble App — Page Design & Component Reference

> Full documentation of the `/inspect-bubble-app` page: SSR architecture, form UX, component design, dark mode strategy, interactive behavior, and data contracts.

---

## Page Overview

**Route:** `/inspect-bubble-app`
**File:** `src/pages/inspect-bubble-app.astro`
**Rendering:** Server-side rendered (`export const prerender = false`) — deployed as a Vercel serverless function
**Layout:** `BaseLayout` (shared site layout with navigation, theme toggle, etc.)
**Wrapper:** `Wrapper variant="standard"` (shared max-width container)

The page has two states controlled by the `?url=` query parameter:

1. **Empty state** (no `?url=`): Shows the form + feature cards explaining what the tool does
2. **Results state** (`?url=https://...`): Server calls the Bubble Runtime Worker, then renders all inspection components with live data

---

## SSR Architecture

```
User visits /inspect-bubble-app
  → No ?url= param
  → Renders: form + empty state feature cards

User submits URL → client JS navigates to /inspect-bubble-app?url=<encoded>
  → Astro SSR reads ?url= in frontmatter
  → Calls inspectUrl() server-side (direct function call, not HTTP)
  → Calls deriveCallerId() for rate limiting identity
  → On success: renders all 7 inspect components with live data
  → On isLikelyBubble=false: shows "Not a Bubble app" notice
  → On error: shows error message, form stays usable
```

Key architectural decision: the page calls `inspectUrl()` directly from `src/lib/worker/client.ts` in the frontmatter — no round-trip through the `/api/inspect` route. This avoids an unnecessary HTTP call since we're already on the server.

---

## Design Principles

### 1. Minimal & Clean

Every section follows the same visual pattern: a section title in `displaySM` weight, a muted subtitle with counts, and the content. No decorative chrome, no gradients, no unnecessary borders. White space does the work.

### 2. Consistent with Landing Page

The design mirrors `src/pages/index.astro` — same `Wrapper`, same `Text` component variants, same color tokens. The inspect page feels like a natural extension of the marketing site, not a bolted-on tool.

### 3. Data-Dense Without Clutter

Each component shows summary counts upfront (e.g. "18 data types · 142 fields · 13 relationships") and uses progressive disclosure (expandable accordions, tab views) so users aren't overwhelmed. Only one accordion item is open at a time.

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

## Form & Input UX

### Input Design

- Rounded input with link icon prefix (`pl-10`, `rounded-xl`)
- Placeholder: `app.example.com` (protocol added automatically)
- Search icon button with hover animation (`group-hover:translate-x-0.5`)
- Icon swaps to spinner during loading

### URL Normalization (client-side)

```javascript
function normalizeUrl(raw) {
  // 1. Trim whitespace
  // 2. Prepend https:// if no protocol
  // 3. Validate via new URL()
  // 4. Reject non-http(s) protocols
  // 5. Reject hostnames without dots (e.g. "localhost")
  // Return normalized href or null
}
```

Invalid URLs show red "Not a valid URL" text for 2 seconds without counting against the try limit.

### Rate Limiting (localStorage)

- `localStorage` key: `inspect-bubble-tries`
- Stores `{ count: number, resetAt: timestamp }`
- Max 5 inspections per 24-hour window
- Counter increments immediately on valid submit (before navigation)
- Display: "X of 5 inspections remaining" below the input
- At 0 remaining: button disabled, shows "No inspections remaining (resets in 24h)"
- Note: this is a client-side soft limit — server-side rate limiting is handled by the worker via caller ID

### Loading State

When the user submits, before the browser navigates to the SSR page:
- Button text changes to "Inspecting..." with spinner
- Input and button are disabled
- A loading skeleton appears below the form:
  - `rounded-2xl` bordered container, `min-h-80`
  - Double-ring spinning animation (concentric circles, opposite directions)
  - "Inspecting application..." heading
  - Subtitle: "Scanning runtime, database schema, option sets, pages, and more. This usually takes 10–20 seconds."
  - Three pulsing dots
  - Four animated step pills: "Detecting runtime", "Extracting schema", "Parsing option sets", "Mapping pages" — staggered `animation-delay` for wave effect

### Empty State (no URL submitted)

Below the form, a 3-column card grid explains what the tool does:
1. **Database schema** — "Discover every data type, field, and relationship..." (emerald icon)
2. **Option sets & pages** — "See all static option sets with their attributes..." (blue icon)
3. **Colors & console** — "Extract the complete color palette with hex values..." (rose icon)

Cards use `rounded-xl border border-base-200 dark:border-base-800 p-6` with colored icon containers (`size-9 rounded-lg bg-{color}-500/10`).

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
  primaryColor: "#1e293b",
  primaryTextColor: "#e2e8f0",
  primaryBorderColor: "#334155",
  lineColor: "#475569",
  secondaryColor: "#1e293b",
  tertiaryColor: "#0f172a",
  fontFamily: "ui-monospace, monospace",
  fontSize: "12px",
}
```

**Light mode:**
```javascript
{
  background: "transparent",
  primaryColor: "#f8fafc",
  primaryTextColor: "#1e293b",
  primaryBorderColor: "#e2e8f0",
  lineColor: "#94a3b8",
  secondaryColor: "#f1f5f9",
  tertiaryColor: "#ffffff",
  fontFamily: "ui-monospace, monospace",
  fontSize: "12px",
}
```

Theme detection happens at render time: `document.documentElement.classList.contains("dark")`.

---

## Page Layout & Spacing

### Empty State (no results)

```
┌─────────────────────────────────────────┐
│ Header (pt-32 pb-12)                    │
│   Title: "Bubble app inspector"         │
│   Subtitle: tool description            │
│   [URL input] [Inspect button]          │
│   Tries remaining counter               │
├─────────────────────────────────────────┤
│ Feature Cards (pb-24)                   │
│   [Database schema] [Option sets]       │
│   [Colors & console]                    │
└─────────────────────────────────────────┘
```

### Results State

```
┌─────────────────────────────────────────┐
│ Header (pt-32 pb-12)                    │
│   Title: "Bubble app inspector"         │
│   [URL input] [Inspect button]          │
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
│   [Download SVG] (diagram mode only)    │
├─────────────────────────────────────────┤
│ Option Sets (pb-16)                     │
├─────────────────────────────────────────┤
│ API Endpoints — blurred (pb-16)         │
├─────────────────────────────────────────┤
│ Console Output (pb-24)                  │
└─────────────────────────────────────────┘
```

Each section is a `<section>` with `<Wrapper variant="standard">` and consistent `pb-16` bottom padding (last section uses `pb-24`).

---

## Component Reference

### 1. Header + Form (inline in page)

**File:** `src/pages/inspect-bubble-app.astro`

The header and form are inline in the page file (not separate components). Contains:

- **Title**: `displayXL` variant, medium weight, tight tracking
- **Subtitle** (empty state only): describes the tool
- **Form**: input with link icon + button with search icon
- **Tries counter**: muted text below form
- **Bubble Detected badge** (results only): emerald green pill with dot, `w-fit`
- **URL + version** (results only): `textSM` and `textXS` variants
- **Not a Bubble app notice** (when `isLikelyBubble: false`): amber callout
- **Error display** (when worker fails): red text inline

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
1. **Stat cards** — 4-column grid (1→2→4 cols): App ID, Bubble Version, Landing Page, Runtime Keys
2. **Redirect notice** — amber callout shown only when `submittedUrl !== finalUrl`
3. **Detection checks** — 4-column grid of boolean indicators with green checkmarks or gray dots
4. **Warnings** — amber-colored list of worker warnings

---

### 3. PageList

**File:** `src/components/inspect/PageList.astro`

**Props:**
```typescript
{ pages: { items: string[]; count: number; warnings?: string[] }; baseUrl: string }
```

- 3-column card grid with numbered index, colored dot by category, page path, external link icon
- Category mapping: Home (green), Error (rose), Auth (amber), Admin (purple), Onboarding (blue), Feature (cyan)
- External link to Bubble docs next to section title

---

### 4. ColorPalette

**File:** `src/components/inspect/ColorPalette.astro`

**Props:**
```typescript
{ colors: { "%del:false"?: ColorEntry[]; "%del:true"?: ColorEntry[] } }
```

- 6-column responsive swatch grid with hex codes
- Smart text contrast via luminance calculation
- Deleted colors shown at 50% opacity with strikethrough
- External link to Bubble docs next to section title

---

### 5. DatabaseSchema

**File:** `src/components/inspect/DatabaseSchema.astro`

**Props:**
```typescript
{ database: { types: DataType[]; refs: Ref[]; dbml?: string }; appName?: string }
```

The most complex component with three interactive views + pan/zoom + download.

#### Tab System

Three tabs: **View** (default), **Diagram** (Mermaid ERD), **DBML** (raw text with copy).

#### View Panel

Accordion using `<details>` elements — only one open at a time. Each type shows field count, relationship count, and a field table with color-coded types.

Subtitle shows: `{types} data types · {totalFields} fields · {refs} relationships`

#### Diagram Panel

- Mermaid loaded from CDN: `https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs` (bypasses Vite dep cache issues)
- ERD definition generated server-side, passed via `<script type="application/json">` to avoid HTML encoding
- Field types: relationships use `ref` type with `FK` constraint (not `FK` as type — that's a Mermaid reserved keyword)
- **Pan & zoom**: scroll-wheel zoom (cursor-centered), click-drag pan, +/- buttons, Reset button
- Viewport: fixed 600px height, `overflow-hidden`, `cursor: grab`
- **Download SVG button**: appears only in diagram mode, inline with tabs. Downloads `<appName>-mermaid.svg`

#### DBML Panel

Raw DBML text in `<pre>` with copy-to-clipboard button.

#### External link

Links to Bubble docs: `https://manual.bubble.io/help-guides/data/the-database`

---

### 6. OptionSets

**File:** `src/components/inspect/OptionSets.astro`

**Props:**
```typescript
{ optionSets: { items: OptionSet[]; dbml?: string } }
```

- Splits into sets with attributes (accordion) and simple sets (pill tags)
- Same accordion pattern as DatabaseSchema
- External link to Bubble docs

---

### 7. ApiRoutes

**File:** `src/components/inspect/ApiRoutes.astro`

**Props:**
```typescript
{ types: DataType[]; baseUrl: string }
```

- **Intentionally blurred** for security — `blur-[6px]`, `pointer-events-none`, `select-none`
- `max-h-64` height cap, no route count displayed
- Lock icon overlay with explanation text
- External link to Bubble docs

---

### 8. ConsoleMessages

**File:** `src/components/inspect/ConsoleMessages.astro`

**Props:**
```typescript
{ messages: ConsoleMessage[] }
```

- Groups by type: Errors (rose), Warnings (amber), Logs (gray)
- Colored dot + count for each group
- Mono font messages in tinted cards
- Empty state: "No console messages captured"

---

## Section Title Links

Each component's section title has a small external-link icon that opens the relevant Bubble documentation:

| Section | Bubble Docs URL |
|---------|----------------|
| Pages | `https://manual.bubble.io/help-guides/design/elements/web-app/the-page` |
| Color Palette | `https://manual.bubble.io/help-guides/design/styling/color-variables` |
| Database Schema | `https://manual.bubble.io/help-guides/data/the-database` |
| Option Sets | `https://manual.bubble.io/help-guides/data/static-data/option-sets` |
| API Endpoints | `https://manual.bubble.io/core-resources/api/the-bubble-api` |

Icon style: `text-base-300 dark:text-base-700` default, brightens on hover.

---

## Shared Component Patterns

### Text Component

| Variant | Usage |
|---------|-------|
| `displayXL` | Page title |
| `displaySM` | Section titles |
| `textBase` | Stat card values, body text |
| `textSM` | Section subtitles |
| `textXS` | Labels, metadata |

### Section Header Pattern

```astro
<div class="flex items-center gap-2">
  <Text tag="h2" variant="displaySM" class="dark:text-white text-base-900 font-medium tracking-tighter">
    section title
  </Text>
  <a href="..." target="_blank" class="text-base-300 dark:text-base-700 hover:text-base-500 ...">
    <!-- external link SVG -->
  </a>
</div>
<Text tag="p" variant="textSM" class="dark:text-base-400 text-base-500 mt-1">
  {count} items · {otherCount} details
</Text>
```

Section titles are lowercase by convention.

### Accordion Pattern

```html
<details class="group" data-*-card>
  <summary class="... cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
    <!-- Numbered index + name + count + chevron -->
  </summary>
  <div class="pb-6 pl-9"><!-- Expanded content --></div>
</details>
```

### Badge/Pill, Card, Numbered Index

Same patterns as before — `rounded bg-{color}-500/10 ring-1 ring-{color}-500/20`, `rounded-lg border border-base-200 dark:border-base-800 p-4`, mono tabular-nums zero-padded indices.

---

## Interactive Behavior Summary

| Feature | Implementation | Event |
|---------|---------------|-------|
| Form submission | Client JS normalizes URL, navigates to `?url=` | Click / Enter |
| URL validation | `new URL()` + protocol/hostname checks | On submit |
| Rate limiting | localStorage counter, 5/24h | On submit |
| Loading skeleton | Hidden div, shown via `classList.toggle` on submit | Click |
| Database/OptionSet accordion | `<details>` + JS `toggle` listener | Single-open enforcement |
| Database view tabs | `data-tab` buttons + `data-db-panel` panels | Click → class toggle |
| Legend visibility | Hidden when not in "View" tab | Tab switch |
| Download SVG button | Visible only in Diagram tab | Tab switch |
| SVG download | `XMLSerializer` → Blob → download link | Click |
| DBML copy to clipboard | `navigator.clipboard.writeText()` + fallback | Click |
| Mermaid diagram rendering | CDN import on first "Diagram" tab click | Tab switch |
| Mermaid pan/zoom | Pointer events + CSS transform + wheel listener | Scroll/drag |
| Mermaid theme detection | `document.documentElement.classList.contains("dark")` | Render-time check |

---

## Data Flow

### Server-Side (SSR)

```typescript
// In frontmatter of inspect-bubble-app.astro:
const rawUrl = Astro.url.searchParams.get("url") ?? "";

if (rawUrl) {
  const callerId = deriveCallerId(Astro.request);
  const result = await inspectUrl(rawUrl, callerId);
  // result.data is passed as props to all components
}
```

No fixture data is imported. No client-side fetch to `/api/inspect`. The worker is called directly from the frontmatter using the same `inspectUrl()` function the API route uses.

### Component Data Flow

Each component receives its slice of the worker response as props:

| Component | Prop | Source |
|-----------|------|--------|
| BubbleDetection | `detection`, `summary`, `debugMeta`, URLs | `result.data.bubbleDetection`, `.summary`, `.debugMeta` |
| PageList | `pages`, `baseUrl` | `result.data.pages`, `.finalUrl` |
| ColorPalette | `colors` | `result.data.colors` |
| DatabaseSchema | `database`, `appName` | `result.data.database`, `.bubbleDetection.app_id` |
| OptionSets | `optionSets` | `result.data.optionSets` |
| ApiRoutes | `types`, `baseUrl` | `result.data.database.types`, `.finalUrl` |
| ConsoleMessages | `messages` | `result.data.consoleMessages` |

---

## Responsive Breakpoints Used

| Breakpoint | Usage |
|------------|-------|
| Default (mobile) | Single column, stacked layout, form stacked |
| `sm` (640px) | 2-column grids, inline form, show "DB Type" column |
| `md` (768px) | Show "Flags" column in schema tables |
| `lg` (1024px) | 3-4 column grids, 6-column color palette |

---

## Dependencies

| Package | Usage | Loaded |
|---------|-------|--------|
| `mermaid` | ERD diagram rendering | CDN (`https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs`), lazy-loaded on Diagram tab click |

Note: Mermaid is loaded from CDN rather than the npm package to bypass Vite's dependency optimizer cache issues (`504 Outdated Optimize Dep`). The npm `mermaid` package is still in `package.json` but unused at runtime.

---

## Known Bugs Fixed During Development

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| Vercel build failed | Fixture JSON import from gitignored `data/` directory | Removed fixture import; page now uses live SSR data |
| Tab switching didn't work | `initDbSchema()` not called on Astro page navigation | Added `astro:page-load` listener + `data-initialized` guard |
| Mermaid `import("mermaid")` failed | Vite dep optimizer stale cache (`504 Outdated Optimize Dep`) | Switched to CDN import |
| Mermaid parse error on `FK` | `FK` is a reserved Mermaid keyword, was used as field type | Changed to `ref` type + `FK` constraint after field name |
| Mermaid diagram "failed to render" | Astro HTML-encoded quotes in `<pre>` tag | Moved to `<script type="application/json">` + `JSON.parse` |
| `aspect-[4/3]` linter warning | Tailwind shorthand available | Changed to `aspect-4/3` |
| TypeScript `result.error` lint | Discriminated union not narrowing in else branch | Explicit cast via `(result as InspectError).error` |
| Header cramped on mobile | All metadata on one line | Changed to `flex-col gap-2 sm:flex-row sm:flex-wrap` |
| Stale ConsoleMessage type error | `type` was a union literal, worker returned other strings | Widened `type` to `string` |

---

## Future Enhancement Ideas

1. Search/filter within database schema by type name
2. Click-to-copy hex codes on color swatches
3. Collapsible console message groups for large counts
4. "Copy link" button for shareable results URL (`?url=` already works)
5. Summary stats bar at top of results (types, fields, pages, colors as pills)
6. Cross-linking between related types in the View tab
7. Download DBML as `.dbml` file (not just copy)
