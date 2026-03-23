# Upload Inspector Conversation Handoff (Detailed)

## Document Purpose
This document is a full handoff of all implementation work completed in this conversation for the Bubble upload inspector route:

- `/inspect-bubble-upload`

It covers:

1. End-to-end chronology of what was implemented.
2. Current parser/model/view state architecture.
3. JSON structure discoveries from the fixture and how they changed implementation.
4. UI/UX behavior and interaction contracts.
5. Testing coverage and verification status.
6. Known constraints and next improvements.

This is intentionally detailed so another engineer/agent can continue without re-discovery.

---

## Workspace + Primary Artifacts

### Route + core logic
- `src/pages/inspect-bubble-upload.astro`
- `src/lib/inspect/parse-bubble-upload.ts`
- `src/lib/inspect/upload-view-state.ts`

### Inspector components
- `src/components/inspect-upload/UploadShell.astro`
- `src/components/inspect-upload/InspectorTabs.astro`
- `src/components/inspect-upload/PageViewLayout.astro`
- `src/components/inspect-upload/BackendWorkflowPanel.astro`
- `src/components/inspect-upload/ApiConnectorPanel.astro`
- `src/components/inspect-upload/GraphTab.astro`
- `src/components/inspect-upload/ReusableElementsPanel.astro` (added)

### Tests
- `tests/inspect/bubble-upload-parser.test.ts`
- `tests/inspect/upload-view-state.test.ts`
- `tests/inspect/upload-inspector-ui.test.ts`

### Fixture used for truth-testing
- `data/inspections/nqu-template-37091.bubble`

---

## Chronological Build Log (What Was Implemented)

## Phase A: Parser foundation and normalized tree
Implemented a parser-first architecture (client-side parsing) with deterministic normalized output.

### Core parser behaviors
- `.bubble` extension enforcement.
- `20 MB` max file hard cap.
- typed parse errors:
  - `FILE_TOO_LARGE`
  - `INVALID_JSON`
  - `INVALID_ROOT`
  - `UNSUPPORTED_FORMAT`
  - `MISSING_REQUIRED_BUCKET`
- root normalization (`json.root` fallback).
- required bucket validation (`pages`, `element_definitions`, `api`, `settings`).

### Extracted normalized domains
- Pages
- Reusables (`CustomDefinition`)
- Frontend workflows
- Backend workflows (`api` bucket)
- API Connector calls (`settings.client_safe.apiconnector2`)
- Element index (`byId`, `byLocalKey`)
- Graph nodes/edges

### Security baseline
- Never exposes `settings.secure`.
- API connector auth data redacted with key-based secret masking.

---

## Phase B: Page-centric model and workflow readability

### Reusable attribution
- Built direct and transitive reusable mapping per page:
  - direct custom element usage
  - nested reusable containment chains
- Grouping output per page reusable:
  - `instanceCount`
  - `directInstancePaths[]`
  - `nestedInstancePaths[]`

### Workflow display semantics
- Added human-first workflow labels with semantic trigger generation.
- Kept technical identifiers in subtitles/debug metadata.
- Added branch summaries from navigation/conditions.

### Graph expansion
Added text-graph edge coverage for:
- `page_contains_reusable`
- `reusable_contains_reusable`
- `workflow_triggers_workflow`
- `workflow_schedules_backend`
- `workflow_calls_api_connector`
- `workflow_navigates_page` (added for `ChangePage`)

---

## Phase C: State/expansion bug fixes and selection UX

### Expansion model
- Separated selected-state and expanded-state.
- Added per-context accordion expansion memory:
  - `backend`
  - `page:<pageKey>`
  - later expanded to `reusable:<reusableKey>`

### Deep-link state
- URL-driven selection for:
  - `tab`
  - `page`
  - `reusable`
  - `workflow`
  - `edge`
- Added page subtab deep-link:
  - `pageTab=workflows|reusables`

### Accessibility + interaction
- `aria-selected`, `aria-expanded`, focus-visible rings.
- State-driven `<details open>` rendering to prevent collapse-loss on rerender.

---

## Phase D: Deeper action drilldown + visual cleanup

### `ChangePage` destination resolution
- Added id/key fallback resolution for destinations.
- Uses page lookup from:
  - page keys
  - page ids
  - `_index.id_to_path`
  - element owner fallbacks

### Condition/argument decoding
- Added recursive expression decoding and readable text fallbacks.
- Captures workflow/step-level decoded condition/arguments.

### UI cleanup
- Removed dominant blue selection emphasis.
- Shifted to neutral surfaces + emerald semantic highlights.
- Improved spacing between workflow cards and step cards.

---

## Phase E: v3.1 (Reusable top tab + backend param fix + rollups)

### Top-level tab expansion
Inspector tabs now:
1. Page View
2. Reusable Elements
3. Backend
4. API Connector
5. Graph

### New Reusable Elements panel
- Left: reusable catalog list
- Right: selected reusable detail
  - reusable summary
  - pages using this reusable (direct+nested)
  - reusable workflows (accordion behavior preserved)

### Effective workflow rollups on pages
For each page:
- `baseWorkflowCount` = page-owned workflows
- `effectiveReusableWorkflowCount` = deduped reachable reusable workflows
- `effectiveWorkflowCount` = base + reusable
- `workflowCount` is set to effective count for display consistency

Dedup identity:
- `workflow:reusable:<reusableKey>:<workflowKey>` (via `workflowNodeId`)

### Backend parameter root-cause fix
Added support for actual APIEvent parameter shape:
- `key`
- `value`
- `is_list`
- `optional`
- `in_url`

Legacy fallback still supported:
- `param_name`
- `btype_id`
- `param_id`

Normalized backend param now includes:
- `displayName`
- `typeName`
- `isList`
- `optional`
- `inUrl`
- `sourceShape` (`api_event_key_value` | `legacy_param_shape` | `unknown`)

---

## Phase F: v3.2 (Prominent stats + drag-and-drop upload)

### Summary section prominence upgrade
Aligned with DatabaseSchema visual language:
- stronger summary container framing
- KPI subtitle line
- larger KPI numerals
- tighter label rhythm + accent dots
- responsive grid maintained

### Upload dropzone UX
`UploadShell` converted into full dropzone interaction:
- dedicated dropzone root (`data-upload-dropzone`)
- hover/focus neutral uplift
- drag-active emerald ring/tint
- helper text changes on drag-active
- keyboard accessible:
  - `role="button"`
  - `tabindex="0"`
  - `Enter/Space` opens picker
- keeps standard file input (`input[type=file]`) as fallback

### Shared file ingestion path
In page script:
- `handleSelectedFile(file)` handles both:
  - manual input change
  - dropped file
- drag events implemented:
  - `dragenter`
  - `dragover`
  - `dragleave`
  - `drop`
- browser-default drop behavior prevented in dropzone context

---

## JSON Structure Findings (Critical Discoveries)

These directly changed implementation behavior.

## 1) Backend workflow parameter shape discovery

### What was initially assumed (legacy-like)
```json
{
  "param_id": "abc",
  "param_name": "User",
  "btype_id": "user",
  "is_list": false,
  "optional": false
}
```

### What fixture actually contains for APIEvent parameters
```json
{
  "key": "Prime",
  "value": "custom.organisation",
  "in_url": { "type": "Empty" },
  "is_list": { "type": "Empty" },
  "optional": { "type": "Empty" }
}
```

### Impact
Without this discovery, UI showed `unknown` for backend params. Parser now normalizes both shapes with `sourceShape` marker.

---

## 2) API Connector structure used

Source bucket:
```json
{
  "settings": {
    "client_safe": {
      "apiconnector2": {
        "<connectorId>": {
          "human": "Stripe",
          "auth": { "...": "..." },
          "calls": {
            "<callId>": {
              "name": "Get invoice",
              "method": "get",
              "url": "https://api.stripe.com/v1/invoices/[invoiceId]",
              "publish_as": "action",
              "url_params": { "...": "..." },
              "params": { "...": "..." },
              "body_params": { "...": "..." },
              "types": { "...": "..." }
            }
          }
        }
      }
    }
  }
}
```

### Implementation effects
- Grouping model: `Connector -> Resource -> Call`
- Request param extraction by location:
  - path (`url_params`)
  - query (`params`)
  - body (`body_params`)
- `types` can be very large; compressed to summary (`topLevelFields`, `truncated`, `totalFieldEstimate`).
- private param previews suppressed.

---

## 3) Navigation resolution by ids (not just keys)

Observed behavior:
- `ChangePage` step may reference element/page id tokens.
- Destination resolution must map via:
  - page ids
  - page keys
  - `_index.id_to_path`
  - element owner inference

### Implementation effect
- Added `navigation` object per step with:
  - `targetPageId`
  - `targetPageKey`
  - `targetPageName`
  - `targetCandidates[]`
  - `branches[]`

---

## Current Public Contracts (High-Signal)

## View-state contract (`upload-view-state.ts`)
- `UploadInspectorTab = "page" | "reusable" | "backend" | "api" | "graph"`
- `selectedPageTab = "workflows" | "reusables"`
- expanded workflow contexts:
  - `backend`
  - `page:<pageKey>`
  - `reusable:<reusableKey>`
- URL params:
  - `tab`
  - `page`
  - `reusable`
  - `workflow`
  - `edge`
  - `pageTab`

## Parser contract highlights (`parse-bubble-upload.ts`)
- `BackendWorkflowParam` includes display + shape metadata.
- `ParsedNode` now includes base/effective workflow rollup fields.
- `BubbleParsedTree.tree` includes:
  - `pages`
  - `reusables`
  - `api`
  - `apiConnector`
  - `apiConnectorGroups`

---

## UI Behavior Contract (Current)

## Main tabs
- Page View
- Reusable Elements
- Backend
- API Connector
- Graph

## Page View
- page list shows effective workflows + breakdown (`page + reusable`)
- page detail includes page sub-tabs:
  - Workflows
  - Reusables

## Reusable Elements tab
- reusable catalog selection
- reusable metadata and usage-on-pages
- reusable workflows drilldown

## Backend tab
- backend workflows with normalized parameter chips and expanded param details

## API Connector tab
- grouped by connector/resource/call
- request sections per call (path/query/body)
- compact response summary

## Upload area
- dropzone hover/drag active transitions
- keyboard and click browse
- status updates via `aria-live`

---

## Security & Safety Decisions

1. `settings.secure` is never emitted from parser output.
2. API auth data is redacted.
3. Private API param values are not previewed.
4. Upload parsing remains client-side only.
5. No upload persistence added.

---

## Test Coverage Added/Updated

## Parser tests (`bubble-upload-parser.test.ts`)
- fixture truth counts and extraction coverage
- backend parameter normalization checks for `api_event_key_value` shape
- page effective workflow rollup checks
- navigation resolution checks
- API grouping and response summary checks
- deterministic output checks
- parse error-path checks

## View-state tests (`upload-view-state.test.ts`)
- tab parse/serialize includes `reusable` and `pageTab`
- context key resolution includes reusable context
- expansion helpers unchanged and verified

## UI tests (`upload-inspector-ui.test.ts`)
- selected-state token checks
- workflow spacing hooks
- page subtab hooks
- reusable top-tab hooks
- global cursor-pointer policy
- prominent KPI summary hooks
- dropzone + drag handler hooks

---

## Verification History (Most Recent)

Final verification executed:

1. `npm test`
   - result: pass
   - test files: 11 passed
   - total tests: 85 passed

2. `npm run build`
   - result: pass
   - route `/inspect-bubble-upload` builds successfully

---

## Implementation Decisions and Why

1. **Parser-first over UI-first**
   - Prevents UI churn from unstable extraction and naming contracts.

2. **Effective workflow counts on page cards**
   - Gives truer “what runs from this page” visibility for no-code audit context.

3. **Dedicated Reusable Elements top tab**
   - Separates reusable-centric exploration from page-centric exploration.

4. **Response summary truncation in API tab**
   - Avoids heavy/low-signal rendering of massive `types` blobs.

5. **Dropzone as whole upload box**
   - Better UX discoverability and easier drag targeting.

---

## Known Tradeoffs / Remaining Opportunities

1. API response summary currently uses top-level sorted sample (size-bounded), not full schema visualization.
2. Page effective workflow count uses reachable reusable workflows deduped by workflow identity; if Bubble execution semantics require more granular path-sensitive counting, a separate “path-weighted count” metric could be added.
3. Upload drag-and-drop is scoped to dropzone (intentional), not global page drag target.

---

## Next Suggested Enhancements (Optional)

1. Add a tiny legend under summary KPIs clarifying base vs effective workflow semantics.
2. Add inline filter chips in Reusable Elements tab:
   - “Used on X+ pages”
   - “Has workflows”
3. Add “copy deep link” action for selected page/reusable/workflow context.
4. Add parser snapshot fixtures for 2–3 additional Bubble exports to harden shape variance coverage.

---

## Quick Reproduction Guide

From repo root:

```bash
npm test
npm run build
```

Open:
- `/inspect-bubble-upload`

Try:
1. File select with `.bubble`.
2. Drag file onto dropzone and observe emerald active state.
3. Switch tabs: Page View -> Reusable Elements -> Backend -> API Connector -> Graph.
4. Validate page effective workflow count breakdown.
5. Inspect backend parameter chips (now key/value-derived, no `unknown` fallback unless truly unknown).

---

## Final Status
Conversation goals were implemented through v3.2:

- parser depth + normalization
- reusable attribution and reusable-centric exploration
- semantic workflow/action visibility
- robust selection/expansion/deep-link state
- neutral + emerald visual direction
- prominent KPI summary
- drag-and-drop upload interaction
- test and build green

