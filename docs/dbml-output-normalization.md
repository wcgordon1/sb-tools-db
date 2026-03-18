# DBML Output Normalization

Reference for how DBML text is normalized before display/copy/download in the Inspect page.

## Purpose

Worker DBML may include type tokens that break some DBML viewers/parsers, and may contain duplicate deleted field variants inside a table.

This implementation normalizes DBML text for compatibility while keeping UI behavior unchanged.

## Source Files

- `src/lib/inspect/normalize-dbml.ts`
- `src/components/inspect/DatabaseSchema.astro`
- `tests/inspect/normalize-dbml.test.ts`

## Where It Applies

Only the DBML panel text in `DatabaseSchema.astro`:

- rendered `<pre>` content
- copy-to-clipboard content
- downloaded `.dbml` file content

No changes are made to worker payloads.

## Normalization Rules

Type normalization on table field lines:

- `boolean` -> `bool`
- `image` -> `bubble_image`
- `file` -> `bubble_file`
- `date_range` -> `bubble_date_range`
- `varchar[]` -> `string[]`
- `api.<path>[]` -> `api."<path>"`
- `custom.<name>[]` -> `<name>.id`
- `option.<name>[]` -> `<name>.id`
- `<entity>.id[]` -> `<entity>.id`

## Duplicate/Deleted Field Handling

Per table, fields are deduped by canonical name:

1. Canonical name removes repeated ` - deleted` suffixes and normalizes spacing/case.
2. First seen variant is kept.
3. If a later non-deleted variant appears for the same canonical name, it replaces the kept deleted variant.
4. Additional duplicates are dropped.

This prevents duplicate-column parser errors for cases like repeated deleted variants.

## Parsing Boundaries

Normalization is intentionally constrained:

- Runs line-by-line.
- Only applies inside `Table ... { ... }` blocks.
- Targets field-definition lines only.
- Leaves `Project`, `Ref:`, comments, and non-field lines unchanged.

## Guarantees and Non-Goals

Guarantees:

- Parser-safe DBML text for common Bubble token patterns.
- Idempotent normalization.

Non-goals:

- No worker-side DBML rewrite.
- No change to Mermaid/View/Stats data sources.
- No attempt to reinterpret relationship semantics beyond token normalization.

## Test Coverage

`tests/inspect/normalize-dbml.test.ts` verifies:

1. Token normalization for primitives and dotted Bubble types.
2. Non-target lines remain unchanged.
3. Normalization is idempotent.
4. Duplicate deleted variants collapse correctly.

