# Deleted Tab (DatabaseSchema) — Detailed Implementation Reference

This document describes the `Deleted` tab added to the database schema inspector, including:

- why it exists,
- exactly how data is derived,
- how UI behavior is wired,
- which files own which responsibilities,
- how tests validate behavior,
- and how to safely extend it in future iterations.

The goal is to make future changes predictable and avoid regressions in the main View/Diagram/DBML/Stats flows.

---

## 1) Purpose and Product Intent

The `Deleted` tab provides a forensic, read-only view of schema fields that were deleted in Bubble, without changing the canonical “current schema” View tab.

### Primary UX goals

1. Show only deleted fields.
2. Keep the exact visual language and structure of the existing View panel.
3. Make scanning fast by opening all rows by default.
4. Show deleted relationship links inferred from deleted fields.
5. Avoid option-set linking noise in relationships.

### Non-goals

1. No worker payload changes.
2. No Mermaid/DBML pipeline changes.
3. No redesign of tab controls or table styling.

---

## 2) Files and Ownership

### UI composition and tab wiring

- `src/components/inspect/DatabaseSchema.astro`

### Data derivation and indexing

- `src/lib/inspect/view-model.ts`

### Tests for deleted behavior

- `tests/inspect/view-model-deleted.test.ts`

### Related baseline docs and neighboring systems

- `docs/inspect-page-design.md` (original component patterns and tab behavior)
- `docs/mermaid-diagram-relationships.md` (diagram-only relationship pipeline)
- `docs/dbml-output-normalization.md` (DBML generation pipeline)

---

## 3) Data Model Extensions in `view-model.ts`

`view-model.ts` now supports both current-schema and deleted-schema extraction modes.

### 3.1 `buildViewRefs(database, options?)`

Signature concept:

- `buildViewRefs(database, { includeDeleted?: boolean })`

Behavior:

1. Reads only structured `database.types[*].fields[*]` metadata.
2. Builds `type.key -> type.name` mapping for target resolution.
3. Infers refs from:
   - `custom.<typeKey>`
   - `list.custom.<typeKey>`
   - `user`
   - `list.user`
4. Excludes option links:
   - `option.*`
   - `list.option.*`
5. Applies deleted filtering by mode:
   - default (`includeDeleted=false`): skip deleted fields
   - deleted mode (`includeDeleted=true`): include only deleted fields
6. Dedupes by `(fromType, fromField, toType, isList)`.

Important: it does **not** depend on `field.isRelationship`.

### 3.2 `buildDeletedTypes(database)`

Produces a filtered type array containing only types with at least one deleted field:

1. Iterates all database types.
2. Keeps only fields where `displayName` matches deleted pattern.
3. Drops types with zero deleted fields.

This powers deleted-only row rendering in the UI.

### 3.3 `indexRefsByType(refs)`

Reused for both normal View refs and Deleted refs:

- `incomingByType: Map<string, Ref[]>`
- `outgoingByType: Map<string, Ref[]>`

This keeps relationship list rendering O(1)-ish by type name, and avoids repetitive filtering in component loops.

### 3.4 `buildViewStats(...)`

Now includes:

- `deletedFieldCount`

This is used by Deleted panel summary text while preserving existing stats usage for the main subtitle.

---

## 4) Deleted-Field Detection Rules

Deleted detection uses a normalized, case-insensitive token check (`deleted`) against field display names.

Why this approach:

1. Matches Bubble-export naming patterns:
   - `foo - deleted`
   - `bar - deleted - deleted`
2. Keeps logic resilient against spacing/case variation.
3. Consistent with existing migration artifacts in Billfly fixtures.

Limitations:

- It relies on naming convention; if future payloads provide explicit deleted flags, prefer those.

---

## 5) UI Changes in `DatabaseSchema.astro`

### 5.1 New tab

Added tab button:

- label: `Deleted`
- position: between `View` and `Diagram`
- toggle key: `data-tab="deleted"`

### 5.2 New panel

Added panel container:

- `data-db-panel="deleted"`
- initially hidden

Panel content mirrors existing View styling and structure:

1. Accordion-like rows (`<details>`)
2. Field table with same headers/columns
3. Relationship subsection and clickable target links

### 5.3 Always-expanded rows

Deleted rows are rendered with `open` on each `<details>`, so users can scan quickly without manual expansion.

### 5.4 Red summary count

A red line is shown above deleted rows:

- text format: `X deleted fields`
- source: `viewStats.deletedFieldCount`

### 5.5 Relationship behavior in Deleted panel

Uses `deletedRefs` index maps:

- incoming from deleted-only refs
- outgoing from deleted-only refs

Count badge (`N rel(s)`) is derived from deleted incoming + deleted outgoing counts.

### 5.6 Cross-link navigation behavior

`data-goto-type` click handler now resolves targets panel-locally first:

1. try current panel’s matching `data-type-name`
2. fallback to global query

This prevents unexpected jumps between View and Deleted sections.

### 5.7 Single-open accordion behavior split

Main View panel keeps single-open behavior.

Deleted panel is excluded from that enforcement so all deleted rows remain open unless user explicitly collapses one.

---

## 6) Legend and Tab Interaction Rules

Legend visibility logic now supports both panels:

- show for `view`
- show for `deleted`
- hide for `diagram`, `dbml`, `stats`

Download buttons are unchanged:

- SVG button only on diagram
- DBML button only on dbml

---

## 7) Relationship Scope for Deleted Tab

Included:

1. Custom object links (`custom.*`)
2. User links (`user`, `list.user`)

Excluded:

1. Option links (`option.*`, `list.option.*`)
2. Unknown targets (safe skip)

This keeps deleted relationship output actionable and aligned with custom/user topology.

---

## 8) Test Coverage Mapping (`view-model-deleted.test.ts`)

The deleted test suite validates:

1. Deleted-only extraction from Billfly fixture yields non-zero deleted fields.
2. Deleted relationship inference works and still excludes option links.
3. Deduping works in deleted mode.
4. Unknown deleted custom targets are ignored without crash.
5. Deleted field count in stats matches deleted type model size.
6. Index maps work for incoming/outgoing lookups in deleted mode.

These tests are intentionally model-level, so UI rendering remains light and reusable.

---

## 9) Billfly-Specific Motivation Captured in Generic Logic

Billfly contains many migration artifacts and duplicate deleted suffixes.

The deleted tab intentionally surfaces those artifacts for audit/review while keeping the default View tab clean and current-state oriented.

The implementation is generic and not hardcoded to Billfly names.

---

## 10) Extension Guidance

If you add future variants (for example “Migrations”, “Legacy”, “Diff”):

1. Keep extraction logic in `view-model.ts` instead of embedding conditions in `.astro`.
2. Add mode flags/options in helper functions.
3. Preserve panel-specific behavior in JS handlers via `data-db-panel`.
4. Add fixture-backed tests before UI changes.

Suggested incremental enhancements:

1. Add “deleted relationships count” in red summary line.
2. Add panel-local filter/search for deleted field names.
3. Add “expand/collapse all” controls for deleted panel only.

---

## 11) Known Constraints

1. Deleted detection is naming-convention-based (`deleted` token).
2. Relationship inference relies on `baseType` first, `rawType` fallback.
3. Option relationships are intentionally excluded from View/Deleted link sections.

These are deliberate constraints for readability and consistency with current inspector goals.

