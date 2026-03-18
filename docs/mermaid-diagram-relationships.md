# Mermaid Diagram Relationship Source

Reference for how the Inspect page builds Mermaid ERD connections.

## Purpose

The Mermaid diagram previously used `database.refs` only.  
Some apps (for example Billfly) return sparse refs that over-focus on `User`, causing a hub-and-spoke diagram that does not reflect the full schema.

This implementation keeps worker refs but augments them with inferred refs from field metadata.

## Source Files

- `src/lib/inspect/relationships.ts`
- `src/components/inspect/DatabaseSchema.astro`
- `tests/inspect/relationships.test.ts`

## Data Inputs

From worker response:

- `database.refs` (existing refs, preserved)
- `database.types[*].key`
- `database.types[*].name`
- `database.types[*].fields[*].displayName`
- `database.types[*].fields[*].baseType`
- `database.types[*].fields[*].rawType`
- `database.types[*].fields[*].isList`

## Relationship Extraction Flow

1. Build map: `typeKey -> typeName` from `database.types`.
2. Infer refs from fields:
   - Primary parser: `field.baseType`
   - Fallback parser: `field.rawType`
   - Supported relation patterns:
     - `custom.<typeKey>`
     - `custom.<typeKey>[]`
     - `list.custom.<typeKey>`
3. Ignore inferred refs when:
   - field name is deleted (`/deleted/i`)
   - target `typeKey` is unknown in `database.types`
4. Merge inferred refs with existing worker refs.
5. Deduplicate by `(fromType, fromField, toType, isList)`.
6. Use merged refs for Mermaid edges only.

## Public Helper API

`src/lib/inspect/relationships.ts` exports:

- `collectRefsFromFields(types)`
- `mergeRefs(existingRefs, inferredRefs)`
- `buildMermaidRefs(database)`

The component calls `buildMermaidRefs(database)` and uses that output in Mermaid edge generation.

## Scope Guardrails

- No worker payload changes.
- No tab or panel behavior changes.
- View/Stats/DBML logic still uses existing `database.refs` as before.
- Option set graph expansion is not included.

## Mermaid Initial Viewport Centering

`DatabaseSchema.astro` also centers the diagram on first render (and on Reset):

- After SVG render, compute diagram bounds from:
  1. `svg.viewBox`
  2. fallback `svg.getBBox()`
  3. fallback `svg.getBoundingClientRect()`
- Set `panX`/`panY` so diagram center aligns to viewport center.

This prevents first-open top-left anchoring.

## Test Coverage

`tests/inspect/relationships.test.ts` verifies:

1. Billfly-style sparse refs + rich field metadata yields multi-target graph.
2. Deleted inferred fields are excluded.
3. Existing + inferred duplicates are deduped.
4. Unknown custom targets are safely ignored.
5. Existing worker refs remain preserved.

