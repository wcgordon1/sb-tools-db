# Bubble Upload MVP Outline

Execution-ready MVP outline for implementing user-uploaded `.bubble` export parsing into the existing inspect experience.

This document is the build spec for the next chat and is intentionally constrained to v1 delivery: deterministic parsing, payload compatibility, and reuse of existing inspect components without UI redesign.

## Why this MVP

Current inspect flow depends on a public app URL. Many users instead have an exported `.bubble` file and want the same analysis output without requiring public runtime access.

This MVP provides a practical bridge:

1. upload `.bubble` file,
2. parse into canonical inspect payload,
3. render through existing inspect components and helper pipelines.

This aligns with Migration Readiness groundwork while minimizing branching and regression risk.

## MVP Scope (v1)

In scope:

1. File-upload parsing path for `.bubble` JSON export.
2. Root normalization (`root`-wrapped and unwrapped files).
3. Bucket extraction for data needed by current inspect views.
4. Canonical inspect payload emission compatible with current UI contracts.
5. Strict redaction of sensitive settings fields.
6. Fixture-driven test coverage using `nqu-template-37091.bubble`.

Out of scope:

1. Worker payload contract changes.
2. UI redesign or new visual system.
3. Mermaid/DBML algorithm rewrites (must reuse current helper contracts).
4. Advanced forensic toggles beyond existing inspect behavior.
5. Non-JSON `.bubble` archive variants.

## End-to-End Flow

1. User uploads `.bubble` file in new upload-based inspect page.
2. `loadBubbleExport(file)` reads text, validates size/type, parses JSON.
3. `normalizeRoot(json)` resolves `app = json.root ?? json`.
4. `extractRawBuckets(app)` extracts known buckets with safe defaults.
5. `buildInspectModel(raw)` maps export structure into canonical inspect model.
6. `emitInspectPayload(model)` emits the same contract expected by existing inspect sections.
7. Existing components render payload:
   - App Overview
   - Pages
   - Color palette
   - Database Schema tabs (View/Deleted/Diagram/DBML/Stats)
   - Option sets
8. Optional debug persistence stores sanitized parse result (no secrets).

## Deliverables

1. New upload inspect page route using existing inspect layout patterns.
2. Parser helper module for file load + root normalization + bucket extraction.
3. Model builder helper module mapping raw export to inspect payload contract.
4. Contract-compatible payload integration with current inspect components.
5. Sanitized persistence/debug mechanism consistent with current inspection data practices.
6. Tests for parsing, mapping, compatibility, error paths, and redaction.

## Contract Compatibility

Upload output must satisfy existing helper contracts and semantics.

Required compatibility targets:

1. `view-model` contract:
   - `database.types[*].key`
   - `database.types[*].name`
   - `database.types[*].fields[*].{ key, displayName, baseType, rawType, isList, dbType }`
   - relationship inference parity for View/Deleted
2. Mermaid relationship contract:
   - compatible with `buildMermaidRefs` merged/inferred relationship behavior
3. DBML contract:
   - compatible with canonical strict pipeline (`buildDbmlModel`, `emitDbml`, normalization pass)
4. Option-set behavior parity:
   - option sets represented in payload,
   - no option relationship edges in View/Mermaid by default

Reference docs:

- `docs/bubble-upload-parsing-architecture.md`
- `docs/dbml-output-normalization.md`
- `docs/view-tab-relationship-model.md`
- `docs/mermaid-diagram-relationships.md`

## Security/Redaction

Mandatory v1 rules:

1. Never expose raw `settings.secure` in UI payload, logs, or debug exports.
2. Preserve only safe, non-secret settings subset for diagnostics when needed.
3. Fail closed on malformed payloads (no partial secret leakage in errors).
4. Keep upload parsing deterministic and side-effect free until explicit persistence step.

Redaction must be test-covered.

## Acceptance Criteria

MVP is complete only if all criteria pass:

1. Uploading `nqu-template-37091.bubble` produces a payload consumable by existing inspect components without special-case UI branching.
2. Database View/Deleted relationship counts are consistent with current `view-model` semantics.
3. Mermaid diagram renders from upload payload with expected relationship behavior.
4. DBML tab renders and exports using existing strict canonical DBML path.
5. Invalid JSON, missing required root object, and oversize file cases return clean user-safe errors.
6. `settings.secure` is redacted from all user-visible/debug outputs.
7. Re-running parse on same file yields deterministic identical emitted payload.

## Test Matrix

Fixture target:

- `data/inspections/nqu-template-37091.bubble`

Required tests:

1. Root normalization:
   - wrapped + unwrapped root cases
2. Bucket extraction counts for fixture:
   - `pages = 6`
   - `element_definitions = 27 keys`, `CustomDefinition = 26`
   - `api = 14`
   - `user_types = 9`
   - `option_sets = 14`
3. Relationship inference parity:
   - custom/user inference from structured field metadata
   - no dependency on `isRelationship` alone
4. Deleted handling parity:
   - deleted fields excluded in current View semantics
   - available for Deleted tab semantics
5. DBML compatibility:
   - upload-derived payload works with strict DBML build/emit path
6. Mermaid compatibility:
   - upload-derived payload works with merged ref extraction path
7. Error paths:
   - malformed JSON
   - missing critical buckets/objects
   - oversize input
8. Security:
   - explicit assertion `settings.secure` redacted
9. Determinism:
   - same input => byte-equivalent serialized payload output (or stable deep-equal)

## Build Order

Implementation order for the new chat:

1. Create upload parser helper:
   - file read
   - JSON parse
   - root normalization
   - bucket extraction + safe defaults
2. Create model builder helper:
   - map buckets to inspect payload contract
   - enforce deterministic ordering
   - enforce redaction before return
3. Add/extend upload inspect page route:
   - upload UI interaction
   - invoke parser/model helpers
   - render existing inspect components with emitted payload
4. Wire optional sanitized debug persistence.
5. Add fixture-driven and failure-path tests.
6. Run full test suite and verify parity behavior in all inspect tabs.

## Open Questions for v2

Deferred by design:

1. Support non-JSON `.bubble` packaging variants (if encountered).
2. Forensic toggle for upload mode (beyond current deleted tab behavior).
3. Extended workflow/action-level summarization and classification.
4. Migration-readiness scoring and recommendations layer.
5. Shared abstraction to fully unify URL-inspect and upload-inspect parsing internals.

## New Chat Kickoff Block

Use this block to start the implementation chat.

Implementation objective:

- Build an upload-based inspect route that parses `.bubble` JSON export files into the same inspect payload contract already consumed by existing inspect components.

Constraints:

1. No worker contract changes.
2. Reuse existing inspect UI components and helper semantics.
3. No UI redesign; functional parity first.
4. Redact secrets (`settings.secure`) by default.

Stepwise build order:

1. Implement parser helper (`loadBubbleExport`, `normalizeRoot`, `extractRawBuckets`).
2. Implement model builder helper (`buildInspectModel`, `emitInspectPayload`).
3. Add route/page integration with existing inspect component composition.
4. Add fixture and error-path tests.
5. Validate View/Deleted/Mermaid/DBML compatibility and run full tests.

Required tests and done criteria:

1. Fixture count assertions pass for `nqu-template-37091.bubble`.
2. Security redaction tests pass.
3. Compatibility tests pass for View/Deleted/Mermaid/DBML paths.
4. Determinism test passes.
5. Full suite passes with no regressions.
