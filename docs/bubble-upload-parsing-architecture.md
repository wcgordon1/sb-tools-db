# Bubble Upload Parsing Architecture

Decision-complete reference for parsing user-uploaded Bubble export files (`.bubble`) into the same normalized inspect payload shape currently consumed by the existing inspect UI.

This is a design and implementation blueprint (doc-only). It does not change code yet.

## Grounding Sources

This architecture is derived from and constrained by:

- `docs/bubble_parsing_spec_nqu_template.md`
- `data/inspections/nqu-template-37091.bubble`
- `docs/dbml-output-normalization.md`
- `docs/view-tab-relationship-model.md`
- `docs/mermaid-diagram-relationships.md`

## Objective

Create an upload parser path that yields the same downstream shape used by the current inspect UI so the same rendering/modeling components continue to work without branch-specific UI logic.

Target reuse includes:

- View / Deleted relationships (`buildViewRefs`, `buildDeletedTypes`)
- Mermaid relationship graph (`buildMermaidRefs`)
- Canonical DBML pipeline (`buildDbmlModel` + `emitDbml`)
- Existing Stats and summary behaviors

## Canonical Parsing Pipeline

### 1) `loadBubbleExport(file)`

Purpose:

- Read uploaded `.bubble` file payload from user upload flow.

Behavior:

- Accept text file input.
- Enforce size limit policy (to be configured by product requirements; parser should fail safely when exceeded).
- Attempt JSON parse.
- Return structured parse result or typed parse failure.

Failure handling:

- Non-JSON payload: fail with user-facing parse error message.
- Empty payload: fail with validation error.

Output contract:

- `{ ok: true, json }` or `{ ok: false, errorCode, message }`.

### 2) `normalizeRoot(json)`

Purpose:

- Support Bubble exports wrapped in `root` and unwrapped exports.

Rule:

```ts
const app = json?.root ?? json;
```

Validation:

- `app` must be an object.
- If not object, fail with typed schema error.

### 3) `extractRawBuckets(app)`

Purpose:

- Pull known top-level buckets into a deterministic raw extraction object.

Buckets:

- `pages`
- `element_definitions`
- `api`
- `user_types`
- `option_sets`
- `styles`
- `settings`
- `_index`
- `mobile_views` (optional support)

Defaulting:

- Missing object bucket -> `{}`.
- Missing list bucket -> `[]`.
- Missing optional bucket -> `null` when semantically absent.

Safety and hygiene:

- Remove known helper keys where needed (example: `element_definitions.length`).
- Preserve raw bucket snapshots only in debug mode; sanitize before persistence/export.

### 4) `buildInspectModel(raw)`

Purpose:

- Convert extracted buckets into a canonical intermediate model aligned with current inspect contract.

Requirements:

- Deterministic sorting and stable identifiers.
- Relationship-ready field metadata.
- No dependency on fragile labels for identity.

Outputs should include at minimum:

- `database.types[*]`
- `database.refs` (optional transitional compatibility only; downstream should infer where possible)
- `optionSets.items[*]`
- `pages.items[*]`
- workflow summaries from `pages`, `element_definitions`, and `api`

### 5) `emitInspectPayload(model)`

Purpose:

- Emit the same payload shape currently consumed by `inspect-bubble-app.astro` and child components.

Hard requirement:

- Existing inspect components should render from upload payload without special-case branching in UI components.

## Mapping Tables

## A) `user_types` -> `database.types[*]`

| Bubble source | Inspect target | Notes |
|---|---|---|
| `user_types.<typeKey>` key | `database.types[*].key` | Canonical type identity |
| `user_types.<typeKey>.name` (or equivalent display field) | `database.types[*].name` | Human label; not identity |
| type fields collection | `database.types[*].fields[]` | Preserve field order deterministically |

Field mapping (per extracted field):

| Bubble source | Inspect field target | Rule |
|---|---|---|
| source field key | `field.key` | Stable identity |
| source display label | `field.displayName` | Used for UI display + deleted detection |
| parsed base token | `field.baseType` | Canonical relationship/type parsing source |
| parsed raw token | `field.rawType` | Fallback source |
| parsed list flag | `field.isList` | Cardinality signal |
| normalized DB type | `field.dbType` | Storage/display type |

## B) Relationship inference rules (model contract)

Infer relationships from structured metadata (not `isRelationship` alone):

- `custom.<typeKey>`
- `list.custom.<typeKey>`
- `user`
- `list.user`

Rules:

- Base source: `baseType`; fallback: `rawType`.
- Cardinality source: `isList` (fallback to list prefix in `rawType`).
- Unknown custom target key: ignore safely.
- Deleted-field exclusion depends on consumer mode:
  - current View/Mermaid/strict DBML: exclude deleted
  - Deleted forensic view: include deleted only

## C) `option_sets` -> `optionSets.items[*]`

| Bubble source | Inspect target | Notes |
|---|---|---|
| `option_sets.<optionKey>` key | `optionSets.items[*].key` | Stable option set identity |
| option set name | `optionSets.items[*].name` | UI display |
| option attributes | `optionSets.items[*].attributes[]` | Include key/display/type metadata |

Invariant:

- Option sets are represented in output, but option relationship edges are excluded from View/Mermaid by current contract.

## D) `pages` -> `pages.items[*]`

| Bubble source | Inspect target | Notes |
|---|---|---|
| `pages.<pageKey>` key | `pages.items[*].key` | Stable page identity |
| page name | `pages.items[*].name` | Display |
| page path/slug | `pages.items[*].path` | If available |
| elements/properties/workflows | page summary fields | Keep compact for UI listing |

## E) `api` -> backend workflow summary

| Bubble source type | Summary bucket |
|---|---|
| `APIEvent` | backend API workflow events |
| `DatabaseTriggerEvent` | backend DB-trigger workflows |

Expected behavior:

- Preserve event identity, name, trigger type, and action count summary.
- Keep action-level details redacted/sanitized as needed.

## F) `element_definitions` (`CustomDefinition`) -> reusable/frontend workflow summary

| Bubble source | Summary bucket |
|---|---|
| `element_definitions.<id>` with `type=CustomDefinition` | reusable definitions |
| nested `workflows` | reusable workflow summaries |
| nested `elements` | element counts / structural summaries |

Special handling:

- Ignore helper key `element_definitions.length`.

## Upload-Mode Safety and Normalization Rules

1. Reject invalid JSON with explicit parse error.
2. Redact `settings.secure` in any returned debug payload, logs, or exports.
3. Tolerate missing buckets using safe defaults.
4. Ignore helper/non-entity keys (`length`, etc.).
5. Preserve deterministic ordering:
   - sort by stable key when source order is not guaranteed
   - avoid non-deterministic object iteration assumptions
6. Keep raw secrets and secure tokens out of client-visible structures.

## Same-as-Public-Inspect Invariants

Upload output must preserve these semantics:

1. View/Deleted relationship extraction parity with existing `view-model` rules.
2. Mermaid relationship semantics parity with `relationships` helper rules.
3. DBML generated via canonical strict pipeline (`buildDbmlModel` + `emitDbml`) and optional compatibility normalization.
4. No option-set relationship edges in View/Mermaid unless contract explicitly changes in future.
5. Deleted handling parity:
   - excluded in current View/strict DBML inference
   - included in Deleted forensic mode only.

## Recommended Helper Modules (future implementation)

Under `src/lib/inspect/`:

1. `parse-bubble-upload.ts`
   - file loading, JSON parse, root normalization, raw bucket extraction, redaction.
2. `build-upload-inspection-model.ts`
   - canonical mapping from raw buckets to inspect payload shape.
3. Optional shared convergence helpers
   - extractors used by both URL-inspect and upload-inspect to reduce semantic drift.

## Proposed Data-Flow Wiring (future implementation)

1. Upload endpoint/page receives `.bubble` file.
2. Call `parse-bubble-upload` -> normalized raw buckets.
3. Call `build-upload-inspection-model` -> inspect payload.
4. Feed inspect payload into existing inspect page components with no UI-level branch logic.
5. Persist sanitized fixture-style JSON for debugging (optional, non-secret).

## Test Plan (fixture-driven)

Primary fixture:

- `data/inspections/nqu-template-37091.bubble`

Required tests:

1. Root normalization:
   - works with wrapped and unwrapped root.
2. Bucket extraction counts align to fixture reality:
   - pages `6`
   - element definitions `27` keys with `26` `CustomDefinition`
   - api `14`
   - user types `9`
   - option sets `14`
3. Relationship inference from field metadata:
   - does not require `isRelationship=true`.
4. Deleted-field parity:
   - excluded for current view paths, available for Deleted forensic path.
5. Downstream compatibility checks:
   - View refs build
   - Mermaid refs build
   - DBML model/emit path works on upload-derived payload.
6. Security redaction:
   - `settings.secure` not exposed in returned debug payload.
7. Determinism:
   - repeated parse/build yields stable identical output.

## Acceptance Criteria

Upload-derived payload is accepted as complete when:

1. It can be consumed by existing inspect components without special-case UI branches.
2. View/Deleted relationship counts and links match current model semantics.
3. Mermaid renders with merged inferred relationships (same helper path).
4. DBML strict output is parser-safe through canonical builder/emitter path.
5. Sensitive settings are redacted from any user-visible output.

## Assumptions

1. `.bubble` upload is JSON text (validated for `nqu-template-37091.bubble`).
2. Current inspect payload shape is the canonical contract.
3. This doc is architecture/spec only; implementation occurs in a follow-up build chat.
4. Existing inspect docs remain source-of-truth for downstream semantics and should be referenced rather than duplicated when implementation starts.

## Future Expansion Hooks

1. Add explicit migration-readiness scoring from upload model once canonical mapping is stable.
2. Add optional forensic toggle for DBML output mode.
3. Add API connector endpoint extraction/reporting if present in export internals.
4. Add reusable/page workflow action normalization into shared workflow analyzer.
