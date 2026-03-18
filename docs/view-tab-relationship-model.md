# View Tab Relationship Model (DatabaseSchema) — Detailed Implementation Reference

This document explains the View tab relationship/data-model overhaul in `DatabaseSchema.astro`.

It is intentionally detailed so future contributors can:

1. understand why View counts were previously wrong,
2. identify the exact source-of-truth paths now used,
3. preserve behavior while extending logic safely,
4. avoid drifting Mermaid/DBML/View relationship semantics.

This document covers the **current-schema View tab** only.
Deleted-tab-specific behavior is documented separately in:

- `docs/deleted-view-tab.md`

Related design/context docs:

- `docs/inspect-page-design.md`
- `docs/mermaid-diagram-relationships.md`
- `docs/dbml-output-normalization.md`

---

## 1) Problem Statement and Root Cause

Before this change, View-tab relationship counts and relationship lists under-reported real schema links in Bubble-heavy apps (notably Billfly).

### Symptom example

- Type `🚀 Comment` displayed `1 rel` in View.
- Structured schema metadata clearly indicated ~8 custom/user links.

### Why this happened

The old View path implicitly depended on weak signals:

1. worker-provided `database.refs` only, and/or
2. `field.isRelationship` flags.

In real Bubble payloads, both are incomplete:

1. `database.refs` can be sparse and biased (for Billfly, heavily user-centric).
2. `isRelationship` can be false even when `baseType`/`rawType` clearly indicate a relationship.

Result: the View tab looked visually correct but semantically incomplete.

---

## 2) Design Goals for the View Fix

The fix intentionally targeted data correctness without changing View styling or interactions.

### Goals

1. Derive View relationships from structured field metadata, not sparse refs.
2. Exclude deleted fields from current View (Deleted tab handles forensic data).
3. Exclude option-set links from View relationship counts/lists.
4. Preserve all existing UI patterns (accordion/table/legend/links).
5. Keep extraction deterministic and deduped.

### Non-goals

1. No worker contract change.
2. No DBML pipeline rewrite inside this task (handled elsewhere).
3. No Mermaid relationship pipeline rewrite inside this task (handled separately).

---

## 3) Files and Responsibilities

### Primary extraction/aggregation logic

- `src/lib/inspect/view-model.ts`

### View rendering and wiring

- `src/components/inspect/DatabaseSchema.astro`

### Tests validating current View logic

- `tests/inspect/view-model.test.ts`

### Related tests for deleted mode (same helper, different mode)

- `tests/inspect/view-model-deleted.test.ts`

---

## 4) `view-model.ts` API Surface (Current View)

The View tab now uses focused helpers instead of ad-hoc extraction in Astro markup.

### 4.1 `buildViewRefs(database, options?)`

Purpose:

- Produce canonical View refs directly from `database.types[*].fields[*]`.

Inputs used:

1. `type.key`
2. `type.name`
3. `field.displayName`
4. `field.baseType`
5. `field.rawType`
6. `field.isList`

Output type:

- `MermaidRef[]` shape `{ fromType, fromField, toType, isList }`

#### Extraction rules used for View mode (`includeDeleted=false`)

1. Build `keyToName` map from `type.key -> type.name`.
2. For each field:
   - skip empty display names,
   - skip deleted fields,
   - skip option fields,
   - infer target from custom/user types.
3. Resolve custom targets by key map.
4. Infer list cardinality from `field.isList`.
5. Dedupe by `(fromType, fromField, toType, isList)`.

### 4.2 `indexRefsByType(refs)`

Purpose:

- Create lookup indices for fast rendering.

Outputs:

1. `incomingByType: Map<string, Ref[]>`
2. `outgoingByType: Map<string, Ref[]>`

This prevents repeated per-row filtering in `DatabaseSchema.astro` and keeps rendering code clean.

### 4.3 `buildViewStats(database, optionSets, refs, options?)`

Purpose:

- Build top-level counts shown under `database schema` heading.

Output:

1. `typeCount`
2. `fieldCount`
3. `relCount`
4. `optionSetCount`
5. `deletedFieldCount` (also used by Deleted tab)

For View tab semantics, `relCount` must be based on `viewRefs` (not raw worker refs).

---

## 5) Relationship Inference Rules (Current View)

The rules below are the operational contract for View relationship correctness.

### 5.1 Sources

Primary:

- `field.baseType`

Fallback:

- `field.rawType`

### 5.2 Included relationship forms

1. `custom.<typeKey>`
2. `list.custom.<typeKey>`
3. `user`
4. `list.user`

### 5.3 Excluded forms

1. `option.<...>`
2. `list.option.<...>`
3. unknown custom targets not found in type-key map
4. deleted fields (current View mode)

### 5.4 Important implementation note

- View extraction **does not** require `field.isRelationship = true`.

This is deliberate and necessary for Bubble payload reliability.

---

## 6) Deleted Detection and Why View Excludes It

View is “current schema.”
Deleted fields are forensic and intentionally kept out of current relationship counts.

Mechanism:

- `isDeletedField(name)` via normalized case-insensitive token match.

Current View mode behavior:

- `includeDeleted = false` means deleted fields are ignored before relationship extraction.

For deleted behavior details, see `docs/deleted-view-tab.md`.

---

## 7) Wiring in `DatabaseSchema.astro`

The View panel now consumes View-model helpers directly.

### 7.1 Key computed values

1. `viewRefs = buildViewRefs(database)`
2. `{ incomingByType, outgoingByType } = indexRefsByType(viewRefs)`
3. `viewStats = buildViewStats(database, optionSets, viewRefs, { ... })`

### 7.2 Where these are used

1. Header subtitle counts:
   - `{types} data types · {fields} fields · {relationships} relationships · {option sets}`
2. Per-type relationship badge (`N rels`) in View rows.
3. Expanded “Relationships” list section for each type (incoming + outgoing).
4. Stats tab’s relationship-related calculations, using the same `viewRefs`-backed maps.

### 7.3 What remained unchanged

1. Tab layout and labels (except later addition of Deleted tab).
2. Accordion visuals and interaction style.
3. Field table columns and styling.
4. Relationship row visual style and click-to-jump UX.

---

## 8) Billfly-Specific Validation Rationale

Billfly fixture demonstrates why field-driven extraction is required.

Fixture used in tests:

- `data/inspections/2026-03-18T03-33-20-276Z_app-billfly-com.json`

Critical validation:

- `🚀 Comment` now emits 8 outgoing custom/user relationships in View extraction.

This verifies the fix addresses undercounting from sparse worker refs.

---

## 9) Test Coverage Breakdown

Primary file:

- `tests/inspect/view-model.test.ts`

### 9.1 Billfly correctness test

- Asserts `🚀 Comment` has 8 derived refs.
- Verifies key fields are represented (`Read by`, `Entity-Owner`, `F-Invoice_`, etc.).

### 9.2 Deleted and option exclusion test

- Confirms deleted field refs do not appear in current View mode.
- Confirms option-set fields do not produce View refs.

### 9.3 Dedupe and unknown-target safety test

- Duplicate semantic fields collapse to one ref.
- Unknown `custom.<missing>` is ignored safely.

### 9.4 Index + stats test

- Validates incoming/outgoing indexing.
- Validates top-level counts (`typeCount`, `fieldCount`, `relCount`, `optionSetCount`).

### 9.5 RawType fallback test

- Validates fallback when `baseType` is not relationship-like but `rawType` is (`list.user`, `list.custom.org`).

Secondary file:

- `tests/inspect/view-model-deleted.test.ts`

Even though this covers Deleted mode, it indirectly protects shared extraction paths used by View.

---

## 10) Data Contract Assumptions (Explicit)

These assumptions are currently encoded in the View model behavior:

1. `database.types[*].key` is canonical for cross-type resolution.
2. `database.types[*].name` is the display identity shown in UI rows.
3. `baseType` is primary; `rawType` is fallback.
4. `isList` is cardinality signal.
5. Option-set relationships should not be shown in View relationship graph/list.

If any assumption changes in worker payloads, update `view-model.ts` first, then adjust tests.

---

## 11) Extension Guidance (Safe Future Changes)

If expanding View logic, follow this order:

1. Add/adjust extraction in `view-model.ts`.
2. Add tests in `tests/inspect/view-model.test.ts` for new cases.
3. Wire minimal Astro changes to consume updated helper outputs.
4. Avoid embedding extraction rules directly in Astro loops.

### Recommended guardrails

1. Keep dedupe key stable unless there is a strong reason.
2. Keep deleted exclusion default for current View mode.
3. Keep option-set exclusion for View links/counts unless product requirement changes.
4. Preserve `baseType`-first behavior.

---

## 12) Relationship Between Systems (View vs Mermaid vs DBML)

These systems intentionally share schema metadata concepts but serve different outputs:

1. View tab: human-scannable current schema relationships in accordion/table UI.
2. Mermaid: graph visualization and pan/zoom behavior.
3. DBML: parser-safe export text with strict/current normalization.

To avoid drift, future schema relationship rule changes should generally land in shared helper logic first, then be consumed by each presentation layer as needed.

---

## 13) Quick Maintenance Checklist

When changing View relationship behavior:

1. Update `src/lib/inspect/view-model.ts`.
2. Re-run and update `tests/inspect/view-model.test.ts`.
3. Verify Billfly fixture still yields expected relationships for `🚀 Comment`.
4. Confirm header subtitle relationship count matches rendered relationship rows.
5. Ensure option fields are still excluded from View relationships.
6. Ensure deleted fields remain excluded from current View mode.

---

## 14) Why This Approach Was Chosen

A dedicated view model was chosen over one-off fixes in `DatabaseSchema.astro` because it:

1. centralizes relationship extraction logic,
2. keeps UI markup style-identical and focused on rendering,
3. makes behavior testable without DOM harness complexity,
4. supports both current View and Deleted forensic view via shared primitives,
5. reduces future regression risk when worker payloads vary by app.

