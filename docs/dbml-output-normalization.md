# DBML Generation and Normalization

Detailed reference for the DBML path used by the Inspect page.

This document describes the current correctness-critical pipeline that generates DBML from structured Bubble JSON, then applies a compatibility normalization pass before rendering/copy/download.

## Why This Exists

The worker payload includes a raw `database.dbml` string, but that string can be:

- parser-fragile (token formats not accepted by strict DBML viewers),
- inconsistent with richer structured metadata in `database.types`,
- noisy due to deleted/duplicate legacy fields.

The app now treats structured JSON as source of truth for DBML correctness.

## Current DBML Data Flow

Runtime flow for the DBML panel:

1. `src/pages/inspect-bubble-app.astro` fetches inspection payload from worker.
2. Page passes both `database` and `optionSets` to `DatabaseSchema.astro`.
3. `DatabaseSchema.astro` builds canonical DBML from structured JSON:
   - `buildDbmlModel({ database, optionSets }, { mode: "strict" })`
   - `emitDbml(model, appName)`
4. Resulting DBML is passed through `normalizeDbmlForViewer(...)` as last-mile compatibility.
5. Final DBML is used for:
   - DBML `<pre>` rendering,
   - copy-to-clipboard,
   - DBML download.

The worker `database.dbml` string is no longer the correctness-critical source.

## Source Files

Core DBML pipeline:

- `src/lib/inspect/build-dbml-model.ts`
- `src/lib/inspect/emit-dbml.ts`

Compatibility pass:

- `src/lib/inspect/normalize-dbml.ts`

UI integration:

- `src/components/inspect/DatabaseSchema.astro`
- `src/pages/inspect-bubble-app.astro`

Tests:

- `tests/inspect/canonical-dbml.test.ts`
- `tests/inspect/normalize-dbml.test.ts`

## Canonical Builder (`build-dbml-model.ts`)

### Public API

- `collectBubbleSchema(input)` (IR collection utility)
- `normalizeSchema(schema, options)` (IR normalization utility)
- `buildDbmlModel(input, { mode })` (active model builder used by UI)

Mode:

- `strict` (default in UI)
- `forensic` (available in helper layer; not exposed in current UI)

### Canonical Inputs Used

From worker JSON:

- `database.types[*].key`
- `database.types[*].name`
- `database.types[*].fields[*].key`
- `database.types[*].fields[*].displayName`
- `database.types[*].fields[*].baseType`
- `database.types[*].fields[*].rawType`
- `database.types[*].fields[*].isList`
- `database.types[*].fields[*].dbType`
- `optionSets.items[*].key`
- `optionSets.items[*].name`
- `optionSets.items[*].attributes[*]...`

The builder intentionally does not rely on `database.refs` for DBML correctness.

### Table Identity Rules

- Custom tables are emitted with stable key identity: `custom.<typeKey>`
- Option tables are emitted with stable key identity: `option.<optionKey>`
- Human-readable Bubble names are preserved as table notes in emitted DBML.

This avoids identity drift from display-name sanitization.

### Strict Mode Field Rules

Strict mode is the default output shown in UI:

1. Deleted fields are dropped early.
2. Fields are deduped by canonical display name (case/whitespace normalized; deleted suffix normalized).
3. If non-deleted collisions remain, winner is selected by semantic priority:
   - custom/user relationship
   - option type
   - primitive/file/image fallback

### Forensic Mode Field Rules

For forensic mode (helper-level support):

- duplicate canonical names are retained,
- collisions are disambiguated deterministically by `field.key` suffix.

This ensures no duplicate emitted column names.

### Type Normalization (Structured, Pre-Emit)

Primitive and special types are normalized before serialization:

- `boolean` -> `bool`
- `image` -> `bubble_image`
- `file` -> `bubble_file`
- `date_range` -> `bubble_date_range`
- `varchar[]` -> `string[]`
- `number_range` -> `bubble_number_range`
- list primitives map to typed arrays where applicable.

### Relationship Extraction (Structured, Not Label-Based)

Relationship targets are inferred primarily from `baseType`, with `rawType` fallback.

Supported custom/user patterns:

- `custom.<typeKey>`
- `custom.<typeKey>[]`
- `list.custom.<typeKey>`
- `user`
- `list.user`

Rules:

- cardinality is derived from `isList` (plus list rawType fallback),
- unknown targets are ignored safely,
- refs target stable identity column `"_id"` on custom/user tables,
- option refs are intentionally not emitted in strict mode to avoid fabricated joins.

## DBML Emitter (`emit-dbml.ts`)

`emitDbml(model, projectName)` serializes the canonical model to DBML text:

- emits `Project` header,
- emits each `Table <schema>.<key>`,
- emits `_id` identity column for every table block,
- emits table note preserving Bubble display name,
- emits `Ref:` lines for custom/user refs only,
- emits list refs with `<` and singular refs with `-` according to current serializer logic.

Output is deterministic (sorted tables/refs in builder).

## Last-Mile Compatibility (`normalize-dbml.ts`)

`normalizeDbmlForViewer(...)` remains in use as a parser-compatibility pass after canonical emit.

What it still does:

- line-by-line field type token cleanup for known parser-sensitive forms,
- per-table duplicate field collapse logic if duplicate labels appear,
- leaves non-field lines (`Project`, `Ref`, comments) unchanged.

This is now safety polish, not primary correctness logic.

## Integration Scope

What changed:

- DBML tab correctness now comes from canonical structured pipeline.

What did not change:

- worker payload contract,
- Mermaid logic path,
- other tabs’ behavior and UI controls.

## Fixture-Driven Validation

Primary fixtures used in tests:

- `data/inspections/2026-03-18T03-33-20-276Z_app-billfly-com.json`
- `data/inspections/2026-03-18T03-26-37-473Z_launchclub-ai.json`

The tests intentionally target Billfly migration/collision patterns and launchclub option coverage.

## Test Coverage Summary

### `tests/inspect/canonical-dbml.test.ts`

1. Billfly user doc-field migration and list semantics (`_billfly_docs` variants).
2. `old-emails - deleted` vs `old-emails` array behavior in strict mode.
3. Company Billing deleted collision cleanup.
4. Allowed-entities deleted/current migration handling.
5. Relationship extraction from `baseType/rawType/isList` even when `isRelationship` is not relied on.
6. Unknown custom target ignored safely.
7. Option tables emitted with no fabricated option refs.
8. Deterministic/idempotent model+emit behavior.

### `tests/inspect/normalize-dbml.test.ts`

1. Token normalization coverage.
2. Non-target line preservation.
3. Idempotence.
4. Duplicate deleted variant collapse.

## Known Constraints / Follow-Ups

- Current emitter always includes `_id` as an identity column for every emitted table.
- Option-set refs are intentionally omitted in strict mode; this is by design.
- If future UI needs forensic-mode DBML, mode toggle wiring can be added without changing worker contract.
