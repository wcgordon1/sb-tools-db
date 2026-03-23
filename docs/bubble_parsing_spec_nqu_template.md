# Bubble `.bubble` Parsing Spec
## File analyzed
`nqu-template-37091.bubble`

This spec is based on the actual uploaded Bubble export file.

---

# Goal
Build a frontend-only parser that can:

- identify pages
- identify reusable elements
- identify frontend workflows
- identify backend/server-side workflows
- identify API Connector calls
- summarize workflow actions in plain English
- build lookup tables so opaque ids become readable
- safely avoid exposing secrets

---

# 1) Root normalization
Some Bubble exports are wrapped in `root`. Some are not.

Always start with:

```ts
const app = json?.root ?? json;
```

All parsing below assumes `app` is the normalized root.

---

# 2) Top-level schema found in this file

Top-level keys found:

```txt
element_definitions
pages
api
_index
settings
mobile_views
type
_id
styles
favicon
comments
screenshot
user_types
app_version
last_change
option_sets
template_id
creation_date
last_change_date
hardcode_stored_expanded
closest_ancestor_snapshots
```

## Counts validated in this file

- `element_definitions`: 27 keys total
  - 26 real reusable definitions
  - 1 helper key: `length`
- `pages`: 6
- `api`: 14
- `styles`: 41
- `user_types`: 9
- `option_sets`: 14

---

# 3) High-level meaning of each top-level bucket

## `element_definitions`
This is the reusable element bucket in this file.

Important detail for this specific file:

- real reusable objects have `type === "CustomDefinition"`
- there is one fake/helper key: `length`

Each reusable may include:

- nested `elements`
- reusable-level `properties`
- `states`
- `custom_states`
- `workflows`
- `style`
- `transitions`

## `pages`
Actual page definitions.

A valid page object has:

- `type === "Page"`

Each page may include:

- `elements`
- `properties`
- `custom_states`
- `workflows`

## `api`
Backend/server-side workflows.

This bucket includes:

- `APIEvent`
- `DatabaseTriggerEvent`

Important: this bucket is **not** the same thing as API Connector calls.

## `styles`
Shared style definitions.

Useful for:

- style names
- style types
- default style properties
- conditional style states
- transitions

## `user_types`
Database data types.

Useful for:

- thing type names
- fields
- privacy roles
- exposed API data

## `option_sets`
Option sets.

Useful for:

- option set names
- option values
- attributes on options

## `_index`
Helper lookup maps.

Useful for:

- id to path
- page name to page id
- custom name to id
- page name to path

This is useful for debugging and quick linking, but should not be your only source of truth.

## `settings`
App configuration.

Two important sub-buckets:

- `settings.client_safe`
- `settings.secure`

Important safety note:

- `settings.secure` contains sensitive values and should be redacted in any browser-side doc/export flow.

---

# 4) Exact extraction rules

# 4.1 Reusable elements

## Source

```txt
app.element_definitions
```

## Rule
A reusable is:

- `key !== "length"`
- value is an object
- `value.type === "CustomDefinition"`

## Extractor

```ts
const reusables = Object.entries(app.element_definitions || {})
  .filter(([key, def]) =>
    key !== "length" &&
    def &&
    typeof def === "object" &&
    def.type === "CustomDefinition"
  )
  .map(([reusableKey, def]: any) => ({
    reusableKey,
    id: def.id,
    name: def.name,
    type: def.type,
    elements: def.elements || {},
    properties: def.properties || {},
    states: def.states || {},
    customStates: def.custom_states || {},
    workflows: def.workflows || {},
    style: def.style || null,
    transitions: def.transitions || {}
  }));
```

## Fields worth keeping

- `reusableKey`
- `id`
- `name`
- `type`
- `elements`
- `properties`
- `states`
- `customStates`
- `workflows`
- `style`
- `transitions`

## Notes for this file

- there are 26 real reusables
- 17 of the 26 have attached workflows
- many reusable names are already human-friendly and should be surfaced directly

---

# 4.2 Pages

## Source

```txt
app.pages
```

## Rule
A page is:

- value is an object
- `value.type === "Page"`

## Extractor

```ts
const pages = Object.entries(app.pages || {})
  .filter(([_, p]) => p && typeof p === "object" && p.type === "Page")
  .map(([pageKey, p]: any) => ({
    pageKey,
    id: p.id,
    name: p.name,
    type: p.type,
    elements: p.elements || {},
    properties: p.properties || {},
    customStates: p.custom_states || {},
    workflows: p.workflows || {}
  }));
```

## Important file-specific note

For pages in this file, use:

```txt
custom_states
```

not `states`.

## Fields worth keeping

- `pageKey`
- `id`
- `name`
- `type`
- `elements`
- `properties`
- `customStates`
- `workflows`

---

# 4.3 Backend workflows

## Source

```txt
app.api
```

## Rule
Each object in `api` is a backend/server-side workflow or trigger.

## Extractor

```ts
const backendWorkflows = Object.entries(app.api || {})
  .filter(([_, wf]) => wf && typeof wf === "object")
  .map(([apiKey, wf]: any) => ({
    apiKey,
    id: wf.id,
    name: wf.name || null,
    type: wf.type,
    properties: wf.properties || {},
    actions: wf.actions || {}
  }));
```

## Validated backend types in this file

- `APIEvent`: 12
- `DatabaseTriggerEvent`: 2

## Useful backend fields

Keep these if present:

- `apiKey`
- `id`
- `name`
- `type`
- `properties.wf_name`
- `properties.wf_folder`
- `properties.parameters`
- `properties.condition`
- `actions`

## Example backend workflow names found in this file

- `stripe-invoice`
- `stripe-subscription`
- `Sign Up`
- `Send Email`
- `Request Password Reset`
- `Create Account`
- `stripe-product`
- `stripe-price`
- `Cancel Subscription`
- `Delete User`
- `Promote Admin`
- `Demote Admin`

---

# 4.4 Styles

## Source

```txt
app.styles
```

## Extractor

```ts
const styles = Object.entries(app.styles || {})
  .filter(([_, s]) => s && typeof s === "object")
  .map(([styleKey, s]: any) => ({
    styleKey,
    id: s.id,
    display: s.display || null,
    type: s.type,
    properties: s.properties || {},
    states: s.states || {},
    transitions: s.transitions || {}
  }));
```

## Validated style types in this file

- `Button`: 13
- `Text`: 12
- `Icon`: 2
- `Group`: 2
- `Shape`: 1
- `FloatingGroup`: 1
- `Image`: 1
- `Input`: 1
- `GroupFocus`: 1
- `Dropdown`: 1
- `FileInput`: 1
- `DateInput`: 1
- `RadioButtons`: 1
- `AutocompleteDropdown`: 1
- `PictureInput`: 1
- `select2-MultiDropdown`: 1

## What to pull from styles

At minimum:

- `display`
- `type`
- `properties`
- `states`
- `transitions`

Also scan style properties for:

- CSS variable refs like `var(--color_...)`
- hex colors
- rgba values
- font families

---

# 4.5 User types

## Source

```txt
app.user_types
```

## Extractor

```ts
const userTypes = Object.entries(app.user_types || {})
  .filter(([_, t]) => t && typeof t === "object")
  .map(([typeKey, t]: any) => ({
    typeKey,
    display: t.display,
    fields: t.fields || {},
    privacyRole: t.privacy_role || {},
    exposedApi: t.exposed_api || null
  }));
```

## Field shape

Fields are keyed objects, not arrays.

Typical field shape:

```json
{
  "display": "firstName",
  "value": "text"
}
```

## What to pull

- data type display name
- all fields with display + value
- privacy role info
- exposed API info if present

---

# 4.6 Option sets

## Source

```txt
app.option_sets
```

## Extractor

```ts
const optionSets = Object.entries(app.option_sets || {})
  .filter(([_, os]) => os && typeof os === "object")
  .map(([optionSetKey, os]: any) => ({
    optionSetKey,
    display: os.display,
    values: os.values || {},
    attributes: os.attributes || {},
    creationSource: os.creation_source || null
  }));
```

## Option set value shape

Option set values are keyed objects.

Example pattern:

```json
{
  "bTHFM": {
    "display": "Login",
    "description": "Login with your Google account or email",
    "title": "Welcome back",
    "slug": "login",
    "db_value": "login",
    "buttonlabel": "Login",
    "sort_factor": 2
  }
}
```

## What to pull

- option set name
- every option value display name
- extra attributes per option
- `db_value` when present
- `slug` when present

---

# 5) Workflow parsing

# 5.1 Frontend workflows

Frontend workflows live in two places:

```txt
pages[pageKey].workflows
element_definitions[reusableKey].workflows
```

## Normalized extractor

```ts
function extractFrontendWorkflows(app: any) {
  const out: any[] = [];

  for (const [pageKey, page] of Object.entries(app.pages || {})) {
    if (!page || typeof page !== "object" || (page as any).type !== "Page") continue;

    for (const [workflowKey, wf] of Object.entries((page as any).workflows || {})) {
      if (!wf || typeof wf !== "object") continue;

      out.push({
        scope: "page",
        ownerKey: pageKey,
        ownerId: (page as any).id,
        ownerName: (page as any).name,
        workflowKey,
        workflowId: (wf as any).id,
        triggerType: (wf as any).type,
        properties: (wf as any).properties || {},
        actions: (wf as any).actions || {}
      });
    }
  }

  for (const [reusableKey, def] of Object.entries(app.element_definitions || {})) {
    if (
      reusableKey === "length" ||
      !def ||
      typeof def !== "object" ||
      (def as any).type !== "CustomDefinition"
    ) continue;

    for (const [workflowKey, wf] of Object.entries((def as any).workflows || {})) {
      if (!wf || typeof wf !== "object") continue;

      out.push({
        scope: "reusable",
        ownerKey: reusableKey,
        ownerId: (def as any).id,
        ownerName: (def as any).name,
        workflowKey,
        workflowId: (wf as any).id,
        triggerType: (wf as any).type,
        properties: (wf as any).properties || {},
        actions: (wf as any).actions || {}
      });
    }
  }

  return out;
}
```

## Validated trigger types in this file

### Page trigger types
- `ButtonClicked`
- `PageLoaded`
- `CustomEvent`

### Reusable trigger types
- `ButtonClicked`
- `CustomEvent`
- `ConditionTrue`
- `InputChanged`
- `OnPageError`
- `PageLoaded`

## Useful workflow property keys found in this file

### Page workflow properties
- `element_id`
- `condition`
- `event_name`
- `parameters`

### Reusable workflow properties
- `element_id`
- `condition`
- `event_name`
- `parameters`
- `wf_folder`
- `return_types`
- `run_when`

---

# 5.2 Backend workflows

Use the exact same normalization shape as frontend workflows, but source them from `api`.

Recommended normalized shape:

```ts
type NormalizedWorkflow = {
  scope: "page" | "reusable" | "api";
  ownerKey: string;
  ownerId: string | null;
  ownerName: string | null;
  workflowKey: string;
  workflowId: string | null;
  triggerType: string | null;
  properties: Record<string, any>;
  actions: Record<string, any>;
};
```

For backend workflows:

- `scope = "api"`
- `ownerKey = apiKey`
- `ownerId = wf.id`
- `ownerName = wf.properties?.wf_name ?? wf.name ?? null`
- `triggerType = wf.type`

---

# 6) Action parsing

Actions live here:

```txt
pages[pageKey].workflows[workflowKey].actions[stepKey]
element_definitions[reusableKey].workflows[workflowKey].actions[stepKey]
api[apiKey].actions[stepKey]
```

## Normalized extractor

```ts
function extractActions(actions: any) {
  return Object.entries(actions || {})
    .filter(([_, action]) => action && typeof action === "object")
    .map(([stepKey, action]: any) => ({
      step: Number(stepKey),
      stepKey,
      id: action.id,
      type: action.type,
      properties: action.properties || {}
    }))
    .sort((a, b) => a.step - b.step);
}
```

## Rule for understanding an action
The real meaning of an action comes from:

1. `action.type`
2. `action.properties`
3. nested objects inside `action.properties`, especially:
   - `value`
   - `condition`
   - `to_change`
   - `changes`
   - `arguments`
   - `_wf_param_*`

---

# 7) Validated action types found in this file

## Page action types
- `1745074183379x203385499606843400-AAO`
- `ChangePage`
- `LogIn`
- `OAuthLogin`
- `ResetPassword`
- `ScheduleAPIEvent`
- `ScheduleCustom`
- `SignUp`
- `TriggerCustomEvent`
- `TriggerCustomEventFromReusable`

## Reusable action types
- `1659259586969x934092730321338400-AAD`
- `1745074183379x203385499606843400-AAO`
- `ChangePage`
- `ChangeThing`
- `DeleteUploadedFile`
- `DisplayGroupData`
- `HideElement`
- `LogOut`
- `MakeChangeCurrentUser`
- `OpenURL`
- `ResetGroup`
- `ResetInputs`
- `ScheduleAPIEvent`
- `ScheduleCustom`
- `SetCustomState`
- `ShowElement`
- `TerminateWorkflow`
- `ToggleElement`
- `TriggerCustomEvent`
- `TriggerCustomEventFromReusable`
- `UpdateCredentials`
- `apiconnector2-bTHcX.bTHxE`
- `apiconnector2-bTHcX.bTIeL`
- `apiconnector2-bTHcX.bTIDh`

## Backend/API action types
- `ChangeThing`
- `DeleteThing`
- `DeleteUploadedFile`
- `NewThing`
- `ScheduleAPIEvent`
- `SendEmail`
- `SendPasswordResetEmail`
- `TerminateWorkflow`
- `apiconnector2-bTHcX.bTHdH`
- `apiconnector2-bTHcX.bTHiQ`
- `apiconnector2-bTHcX.bTHiW`
- `apiconnector2-bTHcX.bTHeH`
- `apiconnector2-bTHcX.bTHpH`
- `apiconnector2-bTHcX.bTHcb`
- `apiconnector2-bTHcX.bTHjl`
- `apiconnector2-bTHcX.bTHkf`
- `apiconnector2-bTHcX.bTHxE`

---

# 8) Action classification rules

## 8.1 Native Bubble actions
These have human-readable action types, for example:

- `ChangePage`
- `SetCustomState`
- `ChangeThing`
- `DisplayGroupData`
- `TriggerCustomEvent`
- `ScheduleAPIEvent`
- `ScheduleCustom`
- `SignUp`
- `LogIn`
- `OAuthLogin`
- `ResetPassword`
- `LogOut`

## 8.2 API Connector actions
These are easy to fingerprint in this file.

### Rule

```ts
const isApiConnectorAction = typeof action.type === "string" && action.type.startsWith("apiconnector2-");
```

### Important
API Connector calls are **workflow steps**. They are not top-level backend workflow definitions.

## 8.3 Opaque plugin actions
If an action type:

- is not a known Bubble native action
- and does not start with `apiconnector2-`

then classify it as:

```txt
plugin_action
```

Examples in this file:

- `1745074183379x203385499606843400-AAO`
- `1659259586969x934092730321338400-AAD`

In this file, `1745074183379x203385499606843400-AAO` appears to be a toast/notification-style plugin action based on its property pattern.

---

# 9) API Connector metadata join

This file contains API Connector config in:

```txt
settings.client_safe.apiconnector2
```

In this file there is one connector bucket:

```txt
settings.client_safe.apiconnector2.bTHcX
```

That connector contains:

- `calls`
- `auth`
- `human`
- `shared_headers`

## Why this matters
Workflow action types like:

```txt
apiconnector2-bTHcX.bTHxE
```

can be joined to:

```txt
settings.client_safe.apiconnector2.bTHcX.calls.bTHxE
```

That gives you the actual call metadata.

## Validated API call ids and names in this file

- `bTHdH` → `Get invoice`
- `bTHdM` → `List invoices`
- `bTHeH` → `Get subscription`
- `bTHiQ` → `Get payment intent`
- `bTHiW` → `Get charge`
- `bTHpH` → `Get subscription items`
- `bTHrJ` → `Cancel subscription immediately`
- `bTHxE` → `Update subscription`
- `bTIDh` → `Create subscription`
- `bTHcb` → `Create customer`
- `bTHjl` → `Get product`
- `bTHkf` → `Get price`
- `bTIeL` → `Create portal session`

## Join helper

```ts
function parseApiConnectorType(type: string) {
  const m = /^apiconnector2-([^.]+)\.(.+)$/.exec(type || "");
  if (!m) return null;
  return {
    connectorId: m[1],
    callId: m[2]
  };
}

function lookupApiConnectorCall(app: any, actionType: string) {
  const parsed = parseApiConnectorType(actionType);
  if (!parsed) return null;

  const connector = app?.settings?.client_safe?.apiconnector2?.[parsed.connectorId];
  const call = connector?.calls?.[parsed.callId];
  if (!call) return null;

  return {
    connectorId: parsed.connectorId,
    callId: parsed.callId,
    name: call.name || null,
    method: call.method || null,
    url: call.url || null,
    params: call.params || {},
    urlParams: call.url_params || {},
    bodyType: call.body_type || null,
    publishAs: call.publish_as || null,
    initialized: call.initialized || false,
    raw: call
  };
}
```

## Keys found on API connector call definitions in this file
Depending on the call, a call object can include:

- `types`
- `name`
- `url`
- `rank`
- `method`
- `params`
- `url_params`
- `body_type`
- `ret_value`
- `publish_as`
- `wrap_error`
- `get_headers`
- `initialized`
- `should_reinitialize`
- `url_cant_be_private`

## Keys found on API connector workflow step properties in this file
Examples of workflow-step-level input keys:

- `params_customer`
- `params_return_url`
- `url_params_subscriptionId`
- `params_items&40&5&4price&5`

So for API Connector actions, parse both:

1. metadata from `settings.client_safe.apiconnector2`
2. actual runtime inputs from `action.properties`

---

# 10) Important action property patterns

## 10.1 `SetCustomState`
Useful keys:

- `element_id`
- `custom_state`
- `value`

Summary pattern:

```txt
Set custom state {custom_state} on {element_id} to {rendered value}
```

## 10.2 `ChangeThing`
Useful keys:

- `to_change`
- `changes`
- optional `condition`

Summary pattern:

```txt
Change thing {renderExpr(to_change)} with {renderChanges(changes)}
```

## 10.3 `DisplayGroupData`
Useful keys:

- `element_id`
- `data_source`

Summary pattern:

```txt
Display data in {element_id} from {renderExpr(data_source)}
```

## 10.4 `TriggerCustomEvent`
Useful keys:

- `custom_event`
- `arguments`
- optional `condition`

Summary pattern:

```txt
Trigger custom event {custom_event} with {arguments}
```

## 10.5 `TriggerCustomEventFromReusable`
Useful keys:

- `element_id`
- `custom_event`
- `arguments`
- optional `condition`

Summary pattern:

```txt
Trigger custom event {custom_event} on reusable element {element_id}
```

## 10.6 `ScheduleCustom`
Useful keys:

- `delay`
- `custom_event`
- `arguments`
- optional `condition`

Summary pattern:

```txt
Schedule custom event {custom_event} after {delay}
```

## 10.7 `ScheduleAPIEvent`
Useful keys:

- `date`
- `api_event`
- `_wf_param_*`
- optional `condition`

Summary pattern:

```txt
Schedule backend workflow {api_event} at {date} with params {_wf_param_*}
```

This is one of the most important cross-links in the app because it connects frontend workflows to backend workflows.

## 10.8 `ChangePage`
Useful keys:

- `element_id`
- `add_parameters`
- `url_parameters`
- `keep_current_page_params`
- optional `condition`

Summary pattern:

```txt
Navigate to {target} with URL params
```

## 10.9 `TerminateWorkflow`
Useful keys:

- optional `condition`
- optional `return_values`

Summary pattern:

```txt
Stop workflow
```

or

```txt
Stop workflow and return values
```

---

# 11) Dynamic expression / AST parsing

Bubble stores many values as nested expression objects, not plain strings.

This is a core parser requirement.

## Common expression node shape

```json
{
  "type": "SomeExpressionType",
  "properties": { ... },
  "next": { ... },
  "is_slidable": false
}
```

## Common expression node types found in this file

- `TextExpression`
- `CurrentWorkflowItem`
- `CurrentUser`
- `OneOptionValue`
- `OptionValue`
- `InjectedValue`
- `GetElement`
- `GetParamFromUrl`
- `ElementParent`
- `Message`
- `State`

## What `next` means
`next` is a chained operation.

Examples of values found in `next.name` in this file include things like:

- `slug`
- `first_element`
- `equals`
- `not_equals`
- `or_`
- `get_group_data`
- `buttonlabel`

This is how Bubble stores chained dynamic expressions.

## Minimum recursive renderer

```ts
function renderExpr(node: any): string {
  if (node == null) return "null";
  if (typeof node !== "object") return String(node);

  const t = node.type || "Unknown";

  if (t === "TextExpression") {
    const entries = node.entries || {};
    return Object.values(entries).map(renderExpr).join("");
  }

  if (t === "OneOptionValue") {
    return `Option(${node.properties?.option_set}.${node.properties?.option_value})`;
  }

  if (t === "OptionValue") {
    return `OptionValue(${node.properties?.option_set}:${node.properties?.option_value})`;
  }

  if (t === "CurrentUser") {
    return "Current User" + (node.next ? ` -> ${renderExpr(node.next)}` : "");
  }

  if (t === "CurrentWorkflowItem") {
    const label = node.properties?.param_name || node.properties?.param_id || "WorkflowParam";
    return `${label}` + (node.next ? ` -> ${renderExpr(node.next)}` : "");
  }

  if (t === "GetElement") {
    return `Element(${node.properties?.element_id})` + (node.next ? ` -> ${renderExpr(node.next)}` : "");
  }

  if (t === "GetParamFromUrl") {
    return `URLParam(${renderExpr(node.properties?.parameter_name)})` + (node.next ? ` -> ${renderExpr(node.next)}` : "");
  }

  if (t === "ElementParent") {
    return "ElementParent" + (node.next ? ` -> ${renderExpr(node.next)}` : "");
  }

  if (t === "InjectedValue") {
    return "InjectedValue" + (node.next ? ` -> ${renderExpr(node.next)}` : "");
  }

  if (t === "Message") {
    return node.name || "Message";
  }

  return t + (node.next ? ` -> ${renderExpr(node.next)}` : "");
}
```

## Important engineering note
A perfect renderer is a later phase. For version 1, it is enough to:

- recognize expression objects
- print their `type`
- print key inner fields
- recurse into `next`

That alone makes the data far more useful than raw JSON dumps.

---

# 12) Element lookup table is required

Many workflow actions only reference ids.

Common examples:

- `element_id`
- `custom_event`
- ids nested inside expressions
- targets inside `DisplayGroupData`, `HideElement`, `ShowElement`, `ToggleElement`, `SetCustomState`

If you do not build an element-id lookup table, your summaries stay cryptic.

## Build a recursive element index

You need to recurse through:

- all pages
- all reusables
- all nested `elements`

## Recommended index shape

```ts
type ElementRecord = {
  scope: "page" | "reusable";
  ownerKey: string;
  ownerName: string;
  localKey: string;
  id: string | null;
  name: string | null;
  type: string | null;
  defaultName: string | null;
  currentParent: string | null;
  raw: any;
};
```

## Recursive index builder

```ts
function buildElementIndex(app: any) {
  const byId: Record<string, ElementRecord> = {};
  const byLocalKey: Record<string, ElementRecord> = {};

  function walkElements(
    elements: any,
    scope: "page" | "reusable",
    ownerKey: string,
    ownerName: string
  ) {
    for (const [localKey, el] of Object.entries(elements || {})) {
      if (!el || typeof el !== "object") continue;

      const rec: ElementRecord = {
        scope,
        ownerKey,
        ownerName,
        localKey,
        id: (el as any).id || null,
        name: (el as any).name || null,
        type: (el as any).type || null,
        defaultName: (el as any).default_name || null,
        currentParent: (el as any).current_parent || null,
        raw: el
      };

      byLocalKey[localKey] = rec;
      if (rec.id) byId[rec.id] = rec;

      if ((el as any).elements) {
        walkElements((el as any).elements, scope, ownerKey, ownerName);
      }
    }
  }

  for (const [pageKey, page] of Object.entries(app.pages || {})) {
    if (!page || typeof page !== "object" || (page as any).type !== "Page") continue;
    walkElements((page as any).elements, "page", pageKey, (page as any).name);
  }

  for (const [reusableKey, def] of Object.entries(app.element_definitions || {})) {
    if (
      reusableKey === "length" ||
      !def ||
      typeof def !== "object" ||
      (def as any).type !== "CustomDefinition"
    ) continue;
    walkElements((def as any).elements, "reusable", reusableKey, (def as any).name);
  }

  return { byId, byLocalKey };
}
```

## Why this matters
An action like:

```json
{
  "type": "SetCustomState",
  "properties": {
    "element_id": "bTHmk",
    "custom_state": "custom.frequency_",
    "value": { ... }
  }
}
```

is much more useful if `bTHmk` resolves to a real human label.

---

# 13) `_index` usage

## Useful keys found in this file

- `_index.id_to_path`
- `_index.page_name_to_id`
- `_index.custom_name_to_id`
- `_index.page_name_to_path`

## Best use
Use `_index` for:

- quick deep linking
- debugging
- helping your raw JSON viewer jump to exact locations
- translating ids to source paths

Do not use `_index` as the only source of truth for business logic.

---

# 14) Settings mapping

## 14.1 `settings.client_safe`
This file contains these important client-safe keys:

- `apiconnector2`
- `plugins`
- `project`
- `app_rights`
- `font_tokens`
- `color_tokens`
- `color_tokens_user`
- `color_swatches`
- `default_styles`
- `bubble_version`
- `responsive_breakpoints`
- `api_wf_folder_list`
- `default_page_title`
- `facebook_meta_tag_title`
- `facebook_meta_tag_description`
- and others

## 14.2 `settings.secure`
This file contains secure keys including:

- `password`
- `username`
- `apiconnector2`
- additional secure/internal fields

## Critical safety rule
Never expose `settings.secure` raw in a browser-side viewer/export.

At minimum, redact:

- private keys
- auth tokens
- usernames/passwords
- webhook secrets
- private headers

---

# 15) Color and style token mapping

There are two important places to map colors.

## 15.1 Shared token sources

Look in:

- `settings.client_safe.color_tokens`
- `settings.client_safe.color_tokens_user`
- `settings.client_safe.color_swatches`
- `styles[*].properties`

## 15.2 Inline usage
Also scan all properties throughout the file for:

- `var(--color_...)`
- hex colors like `#ffffff`
- rgba values

## Recommended color extraction rule

```ts
function collectColorLikeStrings(obj: any, out: { value: string; path: string }[] = [], path = "$") {
  if (typeof obj === "string") {
    if (
      obj.includes("var(--color_") ||
      /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(obj) ||
      /^rgba?\(/i.test(obj)
    ) {
      out.push({ value: obj, path });
    }
    return out;
  }

  if (!obj || typeof obj !== "object") return out;

  if (Array.isArray(obj)) {
    obj.forEach((v, i) => collectColorLikeStrings(v, out, `${path}[${i}]`));
    return out;
  }

  for (const [k, v] of Object.entries(obj)) {
    collectColorLikeStrings(v, out, `${path}.${k}`);
  }

  return out;
}
```

---

# 16) How to label key findings

Do not just dump raw workflow/action JSON.

Normalize everything.

## Recommended normalized workflow-step record

```ts
type NormalizedStep = {
  scope: "page" | "reusable" | "api";
  ownerName: string;
  ownerKey: string;
  workflowKey: string;
  workflowId: string | null;
  triggerType: string | null;
  step: number;
  actionType: string | null;
  actionId: string | null;
  summary: string;
  rawPath: string;
};
```

## Recommended summary format

### Page
```txt
[Page] auth
  Trigger: ButtonClicked
  Step 0: ChangePage -> navigate to page pricing with param mode = login
```

### Reusable
```txt
[Reusable] PopupSwitchPlans
  Trigger: ButtonClicked
  Step 1: ScheduleAPIEvent -> schedule Cancel Subscription with subscription id
```

### Backend
```txt
[Backend] stripe-subscription
  Step 0: ChangeThing -> update Subscription from webhook payload
```

## Summary strategy

For every step:

1. classify the action type
2. resolve ids to names where possible
3. render nested expressions where possible
4. keep a raw JSON path pointer for debugging

---

# 17) Recommended summarizer rules

## 17.1 Classification order

### First: API Connector action

```ts
if (typeof action.type === "string" && action.type.startsWith("apiconnector2-")) {
  // api connector
}
```

### Second: opaque plugin action

```ts
if (!KNOWN_NATIVE_ACTIONS.has(action.type) && !String(action.type || "").startsWith("apiconnector2-")) {
  // plugin_action
}
```

### Third: native Bubble action
Fallback to the readable action type.

## 17.2 Known native action starter set

```ts
const KNOWN_NATIVE_ACTIONS = new Set([
  "ChangePage",
  "SetCustomState",
  "ChangeThing",
  "NewThing",
  "DeleteThing",
  "DeleteUploadedFile",
  "DisplayGroupData",
  "HideElement",
  "ShowElement",
  "ToggleElement",
  "TriggerCustomEvent",
  "TriggerCustomEventFromReusable",
  "ScheduleAPIEvent",
  "ScheduleCustom",
  "TerminateWorkflow",
  "OpenURL",
  "ResetInputs",
  "ResetGroup",
  "UpdateCredentials",
  "MakeChangeCurrentUser",
  "LogOut",
  "LogIn",
  "OAuthLogin",
  "SignUp",
  "ResetPassword",
  "SendEmail",
  "SendPasswordResetEmail"
]);
```

---

# 18) Sanitization rules

Before exposing this file in a frontend viewer or exporting docs, redact:

- `settings.secure`
- all private auth values under API Connector config
- usernames/passwords
- secret headers/tokens
- any private API keys

## Safe export strategy
Keep:

- connector call name
- method
- URL template
- workflow names
- action types

Redact:

- secret values
- raw auth material

Example:

```json
{
  "private_key_test": "[REDACTED]"
}
```

---

# 19) Practical parser architecture

## Pass 1: normalize root

```ts
const app = json?.root ?? json;
```

## Pass 2: extract raw structural sections

- pages
- reusables
- backend workflows
- styles
- user types
- option sets

## Pass 3: build lookup tables

- element id lookup
- page name -> page id
- reusable name -> reusable id
- API connector call id -> call metadata

## Pass 4: normalize workflows

- page workflows
- reusable workflows
- backend workflows

## Pass 5: normalize steps

- sort steps numerically
- classify action types
- resolve ids where possible
- join API Connector metadata

## Pass 6: render expressions

- parse nested AST-like value objects
- recurse into `next`

## Pass 7: redact secrets

- strip `settings.secure`
- redact any private auth values

---

# 20) Suggested output object

```ts
export function parseBubbleExport(json: any) {
  const app = json?.root ?? json;

  const reusables = extractReusables(app);
  const pages = extractPages(app);
  const backendWorkflows = extractBackendWorkflows(app);
  const styles = extractStyles(app);
  const userTypes = extractUserTypes(app);
  const optionSets = extractOptionSets(app);

  const elementIndex = buildElementIndex(app);
  const frontendWorkflows = extractFrontendWorkflows(app);

  const normalizedFrontend = frontendWorkflows.map((wf) => ({
    ...wf,
    steps: extractActions(wf.actions)
  }));

  const normalizedBackend = backendWorkflows.map((wf) => ({
    scope: "api",
    ownerKey: wf.apiKey,
    ownerId: wf.id,
    ownerName: wf.properties?.wf_name ?? wf.name ?? null,
    workflowKey: wf.apiKey,
    workflowId: wf.id,
    triggerType: wf.type,
    properties: wf.properties || {},
    actions: wf.actions || {},
    steps: extractActions(wf.actions)
  }));

  return {
    meta: {
      appId: app._id || null,
      appType: app.type || null,
      appVersion: app.app_version || null,
      lastChangeDate: app.last_change_date || null
    },
    counts: {
      reusables: reusables.length,
      pages: pages.length,
      backendWorkflows: backendWorkflows.length,
      styles: styles.length,
      userTypes: userTypes.length,
      optionSets: optionSets.length
    },
    reusables,
    pages,
    backendWorkflows: normalizedBackend,
    frontendWorkflows: normalizedFrontend,
    styles,
    userTypes,
    optionSets,
    elementIndex
  };
}
```

---

# 21) What is already fully mapped from this file

These are now well-understood enough to build against:

## Reusables
- source: `element_definitions[*]`
- filter: `type === "CustomDefinition"` and skip `length`

## Pages
- source: `pages[*]`
- filter: `type === "Page"`

## Frontend workflows
- `pages[*].workflows[*]`
- `element_definitions[*].workflows[*]`

## Backend workflows
- `api[*]`

## Actions
- all workflow `actions[*]`
- backend workflow `actions[*]`

## API Connector calls
- detected via `action.type.startsWith("apiconnector2-")`
- joined to metadata in `settings.client_safe.apiconnector2`

## Styles
- `styles[*]`

## Data types
- `user_types[*]`

## Option sets
- `option_sets[*]`

---

# 22) What still needs deeper mapping

These are the best next engineering tasks.

## 1. Complete element-id resolution
Needed so `element_id` references become readable names.

## 2. Better expression renderer
Needed to turn nested `TextExpression`, `CurrentWorkflowItem`, `GetElement`, `Message` chains into clean English.

## 3. Better plugin action metadata
Opaque action types like:

- `1745074183379x203385499606843400-AAO`
- `1659259586969x934092730321338400-AAD`

should be matched to plugin definitions if available, or summarized heuristically.

## 4. Full color/style token map
Join:

- `settings.client_safe.color_tokens`
- `settings.client_safe.color_tokens_user`
- `styles[*]`
- inline `var(--color_...)` usage

## 5. Better workflow graphing
Build cross-links for:

- `TriggerCustomEvent`
- `TriggerCustomEventFromReusable`
- `ScheduleCustom`
- `ScheduleAPIEvent`

This lets you generate a real workflow dependency graph.

---

# 23) Short version for the AI code assistant

## Source of truth

- Reusables: `element_definitions[*]` where `type === "CustomDefinition"` and key != `"length"`
- Pages: `pages[*]` where `type === "Page"`
- Backend workflows: `api[*]`
- Frontend workflows:
  - `pages[*].workflows[*]`
  - `element_definitions[*].workflows[*]`
- Actions:
  - `...workflows[*].actions[*]`
  - `api[*].actions[*]`
- Styles: `styles[*]`
- Data types: `user_types[*]`
- Option sets: `option_sets[*]`

## Key gotchas

- pages use `custom_states`
- reusables may use `states` and/or `custom_states`
- `element_definitions.length` is helper noise
- API Connector calls are workflow steps, not top-level workflows
- API Connector steps are detected by `action.type.startsWith("apiconnector2-")`
- many values are AST-style nested objects, not strings
- build an element id lookup table or summaries will be weak
- redact `settings.secure`

## Best next feature

Build these next:

1. element id resolver
2. expression renderer
3. API Connector metadata join
4. workflow graph cross-linking

---

# 24) Final blunt summary

This file is structured enough to support a strong frontend-only Bubble parser.

The cleanest mental model is:

```txt
pages -> workflows -> actions -> properties
element_definitions -> workflows -> actions -> properties
api -> actions -> properties
settings.client_safe.apiconnector2 -> API call metadata
```

If the parser gets these five things right, it will already be genuinely useful:

1. correct extraction of pages and reusables
2. correct extraction of frontend and backend workflows
3. correct classification of API Connector actions
4. element id lookup
5. recursive rendering of nested dynamic expressions
