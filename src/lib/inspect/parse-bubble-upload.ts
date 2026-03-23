const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export enum ParseErrorCode {
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_JSON = "INVALID_JSON",
  INVALID_ROOT = "INVALID_ROOT",
  UNSUPPORTED_FORMAT = "UNSUPPORTED_FORMAT",
  MISSING_REQUIRED_BUCKET = "MISSING_REQUIRED_BUCKET",
}

export interface ParseError {
  ok: false;
  code: ParseErrorCode;
  message: string;
}

export interface ParseSuccess {
  ok: true;
  data: BubbleParsedTree;
}

export type BubbleUploadParseResult = ParseError | ParseSuccess;

export interface BubbleFileLike {
  name: string;
  size: number;
  text(): Promise<string>;
}

export type WorkflowScope = "page" | "reusable" | "api";

export interface ElementRecord {
  scope: "page" | "reusable";
  ownerKey: string;
  ownerName: string;
  localKey: string;
  id: string | null;
  name: string | null;
  type: string | null;
  defaultName: string | null;
  currentParent: string | null;
  path: string;
  reusableDefinitionId: string | null;
  reusableKey: string | null;
}

export interface ApiConnectorCallMeta {
  connectorId: string;
  connectorName: string | null;
  callId: string;
  name: string | null;
  method: string | null;
  url: string | null;
  publishAs: string | null;
  initialized: boolean;
  bodyType: string | null;
  params: Record<string, unknown>;
  urlParams: Record<string, unknown>;
  auth: Record<string, unknown>;
  bodyParams: Record<string, unknown>;
  responseSummary: ApiResponseSummary;
  requestParams: ApiParamMeta[];
  resourceKey: string;
}

export interface BackendWorkflowParam {
  paramId: string | null;
  name: string | null;
  btypeId: string | null;
  displayName: string;
  typeName: string;
  optional: boolean;
  isList: boolean;
  inUrl: boolean;
  sourceShape: "api_event_key_value" | "legacy_param_shape" | "unknown";
}

export interface ApiParamMeta {
  key: string;
  location: "path" | "query" | "body";
  inferredType: string | null;
  optional: boolean;
  private: boolean;
  valuePreview: string | null;
}

export interface ApiResponseSummary {
  topLevelFields: Array<{ path: string; type: string }>;
  fields: ApiResponseField[];
  groups: ApiResponseGroup[];
  truncated: boolean;
  totalFieldEstimate?: number;
  parseError?: string | null;
}

export interface ApiResponseField {
  path: string;
  pathSegments: string[];
  caption: string;
  type: string;
  sampleValue: string | null;
}

export interface ApiResponseGroup {
  key: string;
  label: string;
  fieldCount: number;
  fields: ApiResponseField[];
}

export interface ApiCallDetail extends ApiConnectorCallMeta {
  technicalLabel: string;
}

export interface ApiConnectorGroup {
  connectorId: string;
  connectorName: string | null;
  resources: Array<{
    resourceKey: string;
    calls: ApiCallDetail[];
  }>;
}

export interface WorkflowDisplay {
  displayLabel: string;
  debugLabel: string;
  technicalLabel: string;
  triggerSubtitle: string;
  ownerSubtitle: string;
  branchSummary: string | null;
  triggerType: string | null;
  owner: {
    scope: WorkflowScope;
    key: string;
    id: string | null;
    name: string | null;
  };
  steps: NormalizedStep[];
}

export interface NormalizedStep {
  step: number;
  stepKey: string;
  actionId: string | null;
  actionType: string | null;
  classification: "native" | "api_connector" | "plugin_action" | "unknown";
  summary: string;
  rawPath: string;
  properties: Record<string, unknown>;
  resolvedElement: ElementRecord | null;
  apiConnector: ApiConnectorCallMeta | null;
  scheduleApiTarget: { key: string; id: string | null; name: string | null } | null;
  navigation?: {
    targetPageId: string | null;
    targetPageKey: string | null;
    targetPageName: string | null;
    targetCandidates: Array<{ source: string; pageId: string | null; pageKey: string | null; pageName: string | null }>;
    branches: Array<{ condition: string | null; targetPageId: string | null; targetPageKey: string | null; targetPageName: string | null }>;
  } | null;
  decodedCondition?: string | null;
  decodedArguments?: string[];
}

export interface NormalizedWorkflow {
  scope: WorkflowScope;
  ownerKey: string;
  ownerId: string | null;
  ownerName: string | null;
  workflowKey: string;
  workflowId: string | null;
  triggerType: string | null;
  name: string | null;
  properties: Record<string, unknown>;
  steps: NormalizedStep[];
  rawPath: string;
  display: WorkflowDisplay;
  backendParams: BackendWorkflowParam[];
}

export interface ParsedNode {
  key: string;
  id: string | null;
  name: string | null;
  workflowCount: number;
  baseWorkflowCount: number;
  effectiveWorkflowCount: number;
  effectiveReusableWorkflowCount: number;
  actionCount: number;
  workflows: NormalizedWorkflow[];
}

export interface PageReusableUsage {
  pageKey: string;
  reusableKey: string;
  reusableId: string | null;
  reusableName: string | null;
  instanceCount: number;
  directInstancePaths: string[];
  nestedInstancePaths: string[];
}

export interface GraphNode {
  id: string;
  type: "page" | "reusable" | "workflow" | "backend" | "apiCall";
  label: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type:
    | "page_contains_reusable"
    | "reusable_contains_reusable"
    | "workflow_triggers_workflow"
    | "workflow_schedules_backend"
    | "workflow_calls_api_connector"
    | "workflow_navigates_page";
  from: string;
  to: string;
  sourceWorkflow?: string;
  sourceStep?: string;
  label: string;
}

export interface BubbleParsedTree {
  meta: {
    appId: string | null;
    appType: string | null;
    appVersion: string | null;
    lastChangeDate: string | null;
  };
  counts: {
    pages: number;
    reusables: number;
    backendWorkflows: number;
    frontendWorkflows: number;
    apiConnectorCalls: number;
    actions: number;
    graphNodes: number;
    graphEdges: number;
  };
  summary: {
    pages: Array<{
      key: string;
      name: string | null;
      workflowCount: number;
      baseWorkflowCount: number;
      effectiveWorkflowCount: number;
      effectiveReusableWorkflowCount: number;
      actionCount: number;
    }>;
    reusables: Array<{ key: string; name: string | null; workflowCount: number; actionCount: number }>;
    backendWorkflows: Array<{ key: string; name: string | null; type: string | null; actionCount: number }>;
    apiConnectorCalls: Array<{ connectorId: string; callId: string; name: string | null; method: string | null; url: string | null }>;
  };
  tree: {
    pages: ParsedNode[];
    reusables: ParsedNode[];
    api: ParsedNode[];
    apiConnector: ApiConnectorCallMeta[];
    apiConnectorGroups: ApiConnectorGroup[];
  };
  pages: ParsedNode[];
  reusables: ParsedNode[];
  backendWorkflows: NormalizedWorkflow[];
  frontendWorkflows: NormalizedWorkflow[];
  apiConnector: ApiConnectorCallMeta[];
  apiConnectorGroups: ApiConnectorGroup[];
  elementIndex: {
    byId: Record<string, ElementRecord>;
    byLocalKey: Record<string, ElementRecord>;
  };
  pageReusableMap: Record<string, PageReusableUsage[]>;
  details: {
    allWorkflows: NormalizedWorkflow[];
    graph: {
      nodes: GraphNode[];
      edges: GraphEdge[];
    };
  };
}

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
  "SendPasswordResetEmail",
]);

interface BubbleRootLike {
  pages?: unknown;
  element_definitions?: unknown;
  api?: unknown;
  settings?: unknown;
  _index?: unknown;
  _id?: unknown;
  type?: unknown;
  app_version?: unknown;
  last_change_date?: unknown;
}

interface ReusableDefSummary {
  key: string;
  id: string | null;
  name: string | null;
}

interface ReusableStructure {
  byId: Map<string, ReusableDefSummary>;
  byKey: Map<string, ReusableDefSummary>;
  contains: Map<string, Array<{ reusableKey: string; path: string }>>;
}

interface BackendLookupRecord {
  key: string;
  id: string | null;
  name: string | null;
}

interface PageLookupRecord {
  id: string | null;
  key: string;
  name: string | null;
  path: string | null;
}

export async function loadBubbleExport(file: BubbleFileLike): Promise<BubbleUploadParseResult> {
  if (!file.name.toLowerCase().endsWith(".bubble")) {
    return {
      ok: false,
      code: ParseErrorCode.UNSUPPORTED_FORMAT,
      message: "Only JSON .bubble exports are supported.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      code: ParseErrorCode.FILE_TOO_LARGE,
      message: "File is larger than 20 MB. Please upload a smaller .bubble export.",
    };
  }

  const text = await file.text();
  return parseBubbleExportFromText(text);
}

export function parseBubbleExportFromText(text: string): BubbleUploadParseResult {
  let json: unknown;

  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      code: ParseErrorCode.INVALID_JSON,
      message: "The uploaded file is not valid JSON.",
    };
  }

  return parseBubbleExport(json);
}

export function parseBubbleExport(json: unknown): BubbleUploadParseResult {
  const app = normalizeRoot(json);

  if (!app) {
    return {
      ok: false,
      code: ParseErrorCode.INVALID_ROOT,
      message: "Could not find a valid Bubble app root object.",
    };
  }

  const hasRequired =
    isRecord(app.pages)
    && isRecord(app.element_definitions)
    && isRecord(app.api)
    && isRecord(app.settings);

  if (!hasRequired) {
    return {
      ok: false,
      code: ParseErrorCode.MISSING_REQUIRED_BUCKET,
      message: "The export is missing required buckets (pages, element_definitions, api, settings).",
    };
  }

  const pagesRaw = app.pages as Record<string, unknown>;
  const reusablesRaw = app.element_definitions as Record<string, unknown>;
  const apiRaw = app.api as Record<string, unknown>;
  const settingsRaw = app.settings as Record<string, unknown>;
  const indexRaw = recordOrEmpty(app._index);

  const reusableStructure = buildReusableStructure(reusablesRaw);
  const elementIndex = buildElementIndex(pagesRaw, reusablesRaw, reusableStructure.byId);
  const pageLookup = buildPageLookup(pagesRaw, indexRaw);
  const apiConnector = extractApiConnectorConfig(settingsRaw);
  const apiConnectorGroups = buildApiConnectorGroups(apiConnector);
  const backendLookup = buildBackendWorkflowLookup(apiRaw);

  const pages = extractPages(pagesRaw, elementIndex, apiConnector, backendLookup, pageLookup);
  const reusables = extractReusables(reusablesRaw, elementIndex, apiConnector, backendLookup, pageLookup);

  const frontendWorkflows = stableSortBy(
    [...pages.flatMap((p) => p.workflows), ...reusables.flatMap((r) => r.workflows)],
    (w) => workflowNodeId(w),
  );

  const backendWorkflows = extractBackendWorkflows(
    apiRaw,
    elementIndex,
    apiConnector,
    backendLookup,
    pageLookup,
  );

  const allWorkflows = stableSortBy(
    [...frontendWorkflows, ...backendWorkflows],
    (w) => workflowNodeId(w),
  );

  const totalActions = allWorkflows.reduce((sum, wf) => sum + wf.steps.length, 0);
  const pageReusableMap = buildPageReusableMap(pagesRaw, reusableStructure, elementIndex);
  applyPageWorkflowRollups(pages, reusables, pageReusableMap);
  const graph = buildGraph(pages, reusables, backendWorkflows, apiConnector, pageReusableMap, reusableStructure);

  const parsed: BubbleParsedTree = {
    meta: {
      appId: asString(app._id),
      appType: asString(app.type),
      appVersion: asString(app.app_version),
      lastChangeDate: asString(app.last_change_date),
    },
    counts: {
      pages: pages.length,
      reusables: reusables.length,
      backendWorkflows: backendWorkflows.length,
      frontendWorkflows: frontendWorkflows.length,
      apiConnectorCalls: apiConnector.length,
      actions: totalActions,
      graphNodes: graph.nodes.length,
      graphEdges: graph.edges.length,
    },
    summary: {
      pages: pages.map((p) => ({
        key: p.key,
        name: p.name,
        workflowCount: p.workflowCount,
        baseWorkflowCount: p.baseWorkflowCount,
        effectiveWorkflowCount: p.effectiveWorkflowCount,
        effectiveReusableWorkflowCount: p.effectiveReusableWorkflowCount,
        actionCount: p.actionCount,
      })),
      reusables: reusables.map((r) => ({
        key: r.key,
        name: r.name,
        workflowCount: r.workflowCount,
        actionCount: r.actionCount,
      })),
      backendWorkflows: backendWorkflows.map((wf) => ({
        key: wf.workflowKey,
        name: wf.ownerName,
        type: wf.triggerType,
        actionCount: wf.steps.length,
      })),
      apiConnectorCalls: apiConnector.map((call) => ({
        connectorId: call.connectorId,
        callId: call.callId,
        name: call.name,
        method: call.method,
        url: call.url,
      })),
    },
    tree: {
      pages,
      reusables,
      api: backendWorkflows.map((wf) => ({
        key: wf.workflowKey,
        id: wf.workflowId,
        name: wf.ownerName,
        workflowCount: 1,
        baseWorkflowCount: 1,
        effectiveWorkflowCount: 1,
        effectiveReusableWorkflowCount: 0,
        actionCount: wf.steps.length,
        workflows: [wf],
      })),
      apiConnector,
      apiConnectorGroups,
    },
    pages,
    reusables,
    backendWorkflows,
    frontendWorkflows,
    apiConnector,
    apiConnectorGroups,
    elementIndex,
    pageReusableMap,
    details: {
      allWorkflows,
      graph,
    },
  };

  return { ok: true, data: parsed };
}

function normalizeRoot(json: unknown): BubbleRootLike | null {
  if (!isRecord(json)) return null;
  const rootCandidate = isRecord((json as Record<string, unknown>).root)
    ? (json as Record<string, unknown>).root
    : json;

  return isRecord(rootCandidate) ? (rootCandidate as BubbleRootLike) : null;
}

function buildReusableStructure(reusablesRaw: Record<string, unknown>): ReusableStructure {
  const byId = new Map<string, ReusableDefSummary>();
  const byKey = new Map<string, ReusableDefSummary>();

  for (const [key, def] of sortedEntries(reusablesRaw)) {
    if (key === "length") continue;
    if (!isRecord(def) || asString(def.type) !== "CustomDefinition") continue;

    const summary: ReusableDefSummary = {
      key,
      id: asString(def.id),
      name: asString(def.name),
    };

    byKey.set(key, summary);
    if (summary.id) byId.set(summary.id, summary);
  }

  const contains = new Map<string, Array<{ reusableKey: string; path: string }>>();

  for (const [key, def] of sortedEntries(reusablesRaw)) {
    if (key === "length") continue;
    if (!isRecord(def) || asString(def.type) !== "CustomDefinition") continue;

    const children: Array<{ reusableKey: string; path: string }> = [];
    walkElementsWithPath(recordOrEmpty(def.elements), "elements", (element, path) => {
      const child = resolveCustomElementToReusable(element, byId);
      if (child) {
        children.push({ reusableKey: child.key, path });
      }
    });

    contains.set(key, children);
  }

  return { byId, byKey, contains };
}

function buildElementIndex(
  pagesRaw: Record<string, unknown>,
  reusablesRaw: Record<string, unknown>,
  reusableById: Map<string, ReusableDefSummary>,
): BubbleParsedTree["elementIndex"] {
  const byId: Record<string, ElementRecord> = {};
  const byLocalKey: Record<string, ElementRecord> = {};

  const walkElements = (
    elementsRaw: Record<string, unknown>,
    scope: "page" | "reusable",
    ownerKey: string,
    ownerName: string,
    basePath: string,
  ) => {
    for (const [localKey, elementValue] of sortedEntries(elementsRaw)) {
      if (!isRecord(elementValue)) continue;

      const customId = asString(recordOrEmpty(elementValue.properties).custom_id);
      const reusableRef = customId ? reusableById.get(customId) ?? null : null;

      const path = `${basePath}.${localKey}`;
      const record: ElementRecord = {
        scope,
        ownerKey,
        ownerName,
        localKey,
        id: asString(elementValue.id),
        name: asString(elementValue.name),
        type: asString(elementValue.type),
        defaultName: asString(elementValue.default_name),
        currentParent: asString(elementValue.current_parent),
        path,
        reusableDefinitionId: customId,
        reusableKey: reusableRef?.key ?? null,
      };

      byLocalKey[localKey] = record;
      if (record.id) byId[record.id] = record;

      const nestedElements = recordOrEmpty(elementValue.elements);
      if (Object.keys(nestedElements).length > 0) {
        walkElements(nestedElements, scope, ownerKey, ownerName, path);
      }
    }
  };

  for (const [pageKey, pageValue] of sortedEntries(pagesRaw)) {
    if (!isRecord(pageValue) || asString(pageValue.type) !== "Page") continue;
    walkElements(
      recordOrEmpty(pageValue.elements),
      "page",
      pageKey,
      asString(pageValue.name) ?? pageKey,
      `pages.${pageKey}.elements`,
    );
  }

  for (const [reusableKey, reusableValue] of sortedEntries(reusablesRaw)) {
    if (reusableKey === "length") continue;
    if (!isRecord(reusableValue) || asString(reusableValue.type) !== "CustomDefinition") continue;
    walkElements(
      recordOrEmpty(reusableValue.elements),
      "reusable",
      reusableKey,
      asString(reusableValue.name) ?? reusableKey,
      `element_definitions.${reusableKey}.elements`,
    );
  }

  return { byId, byLocalKey };
}

function extractPages(
  pagesRaw: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
  apiConnector: ApiConnectorCallMeta[],
  backendLookup: Map<string, BackendLookupRecord>,
  pageLookup: Map<string, PageLookupRecord>,
): ParsedNode[] {
  const nodes: ParsedNode[] = [];

  for (const [pageKey, pageValue] of sortedEntries(pagesRaw)) {
    if (!isRecord(pageValue) || asString(pageValue.type) !== "Page") continue;

    const workflows = extractFrontendWorkflows(
      "page",
      pageKey,
      asString(pageValue.id),
      asString(pageValue.name),
      recordOrEmpty(pageValue.workflows),
      elementIndex,
      apiConnector,
      backendLookup,
      pageLookup,
      `pages.${pageKey}.workflows`,
    );

    nodes.push(buildNode(pageKey, asString(pageValue.id), asString(pageValue.name), workflows));
  }

  return nodes;
}

function extractReusables(
  reusablesRaw: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
  apiConnector: ApiConnectorCallMeta[],
  backendLookup: Map<string, BackendLookupRecord>,
  pageLookup: Map<string, PageLookupRecord>,
): ParsedNode[] {
  const nodes: ParsedNode[] = [];

  for (const [key, def] of sortedEntries(reusablesRaw)) {
    if (key === "length") continue;
    if (!isRecord(def) || asString(def.type) !== "CustomDefinition") continue;

    const workflows = extractFrontendWorkflows(
      "reusable",
      key,
      asString(def.id),
      asString(def.name),
      recordOrEmpty(def.workflows),
      elementIndex,
      apiConnector,
      backendLookup,
      pageLookup,
      `element_definitions.${key}.workflows`,
    );

    nodes.push(buildNode(key, asString(def.id), asString(def.name), workflows));
  }

  return nodes;
}

function extractBackendWorkflows(
  apiRaw: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
  apiConnector: ApiConnectorCallMeta[],
  backendLookup: Map<string, BackendLookupRecord>,
  pageLookup: Map<string, PageLookupRecord>,
): NormalizedWorkflow[] {
  const workflows: NormalizedWorkflow[] = [];

  for (const [apiKey, wfValue] of sortedEntries(apiRaw)) {
    if (!isRecord(wfValue)) continue;

    const properties = recordOrEmpty(wfValue.properties);
    const ownerName = asString(properties.wf_name) ?? asString(wfValue.name);
    const backendParams = extractBackendParams(properties.parameters);

    workflows.push(
      buildWorkflow({
        scope: "api",
        ownerKey: apiKey,
        ownerId: asString(wfValue.id),
        ownerName,
        workflowKey: apiKey,
        workflowId: asString(wfValue.id),
        triggerType: asString(wfValue.type),
        name: asString(wfValue.name),
        properties,
        backendParams,
        steps: extractActions(
          recordOrEmpty(wfValue.actions),
          "api",
          apiKey,
        elementIndex,
        apiConnector,
        backendLookup,
        pageLookup,
        null,
        `api.${apiKey}.actions`,
      ),
        rawPath: `api.${apiKey}`,
      }),
    );
  }

  return workflows;
}

function extractFrontendWorkflows(
  scope: "page" | "reusable",
  ownerKey: string,
  ownerId: string | null,
  ownerName: string | null,
  workflowsRaw: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
  apiConnector: ApiConnectorCallMeta[],
  backendLookup: Map<string, BackendLookupRecord>,
  pageLookup: Map<string, PageLookupRecord>,
  rawPath: string,
): NormalizedWorkflow[] {
  const out: NormalizedWorkflow[] = [];

  for (const [workflowKey, workflowValue] of sortedEntries(workflowsRaw)) {
    if (!isRecord(workflowValue)) continue;

    const properties = recordOrEmpty(workflowValue.properties);
    const steps = extractActions(
      recordOrEmpty(workflowValue.actions),
      scope,
      ownerKey,
      elementIndex,
      apiConnector,
      backendLookup,
      pageLookup,
      properties.condition,
      `${rawPath}.${workflowKey}.actions`,
    );

    out.push(
      buildWorkflow({
        scope,
        ownerKey,
        ownerId,
        ownerName,
        workflowKey,
        workflowId: asString(workflowValue.id),
        triggerType: asString(workflowValue.type),
        name: asString(workflowValue.name),
        properties,
        backendParams: [],
        steps,
        rawPath: `${rawPath}.${workflowKey}`,
      }),
    );
  }

  return out;
}

function extractActions(
  actionsRaw: Record<string, unknown>,
  scope: WorkflowScope,
  ownerKey: string,
  elementIndex: BubbleParsedTree["elementIndex"],
  apiConnector: ApiConnectorCallMeta[],
  backendLookup: Map<string, BackendLookupRecord>,
  pageLookup: Map<string, PageLookupRecord>,
  workflowCondition: unknown,
  rawPath: string,
): NormalizedStep[] {
  const sortedActionEntries = sortedEntries(actionsRaw)
    .filter(([, actionValue]) => isRecord(actionValue))
    .sort(([a], [b]) => Number(a) - Number(b));

  return sortedActionEntries.map(([stepKey, actionValue]) => {
    const action = actionValue as Record<string, unknown>;
    const actionType = asString(action.type);
    const properties = recordOrEmpty(action.properties);

    const apiConnectorMeta = actionType ? lookupApiConnectorCall(apiConnector, actionType) : null;
    const resolvedElement = resolveElementReference(properties.element_id, elementIndex);
    const scheduleApiTarget = actionType === "ScheduleAPIEvent"
      ? lookupScheduledApiTarget(properties.api_event, backendLookup)
      : null;
    const navigation = actionType === "ChangePage"
      ? resolveNavigationTargets(properties, elementIndex, pageLookup, workflowCondition)
      : null;
    const decodedCondition = decodeExpression(properties.condition ?? workflowCondition, elementIndex);
    const decodedArguments = decodeArguments(properties, elementIndex);

    const step = Number(stepKey);

    return {
      step: Number.isFinite(step) ? step : 0,
      stepKey,
      actionId: asString(action.id),
      actionType,
      classification: classifyActionType(actionType),
      summary: summarizeAction(
        actionType,
        properties,
        resolvedElement,
        apiConnectorMeta,
        scheduleApiTarget,
        navigation,
      ),
      rawPath: `${rawPath}.${stepKey}`,
      properties,
      resolvedElement,
      apiConnector: apiConnectorMeta,
      scheduleApiTarget,
      navigation,
      decodedCondition,
      decodedArguments,
    };
  });
}

function buildWorkflow(input: {
  scope: WorkflowScope;
  ownerKey: string;
  ownerId: string | null;
  ownerName: string | null;
  workflowKey: string;
  workflowId: string | null;
  triggerType: string | null;
  name: string | null;
  properties: Record<string, unknown>;
  backendParams: BackendWorkflowParam[];
  steps: NormalizedStep[];
  rawPath: string;
}): NormalizedWorkflow {
  const branchSummary = summarizeWorkflowBranches(input.steps);
  const displayLabel = buildWorkflowDisplayLabel(
    input.name,
    input.triggerType,
    input.properties,
    input.steps,
    input.workflowKey,
  );
  const technicalLabel = `${input.scope}:${input.ownerKey}:${input.workflowKey}`;
  const ownerLabel = input.ownerName ?? input.ownerKey;
  const triggerLabel = input.triggerType ?? "UnknownTrigger";
  const triggerSubtitle = `${triggerLabel} · ${input.steps.length} steps`;
  const ownerSubtitle = `${input.scope} · ${ownerLabel}`;

  return {
    scope: input.scope,
    ownerKey: input.ownerKey,
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    workflowKey: input.workflowKey,
    workflowId: input.workflowId,
    triggerType: input.triggerType,
    name: input.name,
    properties: input.properties,
    steps: input.steps,
    rawPath: input.rawPath,
    backendParams: input.backendParams,
    display: {
      displayLabel,
      debugLabel: technicalLabel,
      technicalLabel,
      triggerSubtitle,
      ownerSubtitle,
      branchSummary,
      triggerType: input.triggerType,
      owner: {
        scope: input.scope,
        key: input.ownerKey,
        id: input.ownerId,
        name: input.ownerName,
      },
      steps: input.steps,
    },
  };
}

function buildWorkflowDisplayLabel(
  workflowName: string | null,
  triggerType: string | null,
  properties: Record<string, unknown>,
  steps: NormalizedStep[],
  workflowKey: string,
): string {
  const explicitName = cleanName(workflowName);
  if (explicitName) return explicitName;

  const eventName = cleanName(asString(properties.event_name));
  if (eventName) return `Custom event: ${eventName}`;

  const firstResolvedElement = steps.find((s) => s.resolvedElement)?.resolvedElement;
  const elementLabel = firstResolvedElement
    ? labelElement(firstResolvedElement, firstResolvedElement.id)
    : humanizeElementToken(cleanName(asString(properties.element_id)));

  let semantic: string;

  switch (triggerType) {
    case "ButtonClicked":
      semantic = elementLabel ? `When ${elementLabel} is clicked` : "When button is clicked";
      break;
    case "InputChanged":
      semantic = elementLabel ? `When ${elementLabel} changes` : "When input changes";
      break;
    case "PageLoaded":
      semantic = "On page load";
      break;
    case "ConditionTrue":
      semantic = "When condition becomes true";
      break;
    case "CustomEvent":
      semantic = eventName ? `Custom event: ${eventName}` : "Custom event";
      break;
    default:
      semantic = triggerType ? `Workflow: ${triggerType}` : "Workflow";
      break;
  }

  const suffix = shortId(workflowKey);
  return `${semantic} · ${suffix}`;
}

function buildPageReusableMap(
  pagesRaw: Record<string, unknown>,
  reusableStructure: ReusableStructure,
  elementIndex: BubbleParsedTree["elementIndex"],
): Record<string, PageReusableUsage[]> {
  const result: Record<string, PageReusableUsage[]> = {};

  for (const [pageKey, pageValue] of sortedEntries(pagesRaw)) {
    if (!isRecord(pageValue) || asString(pageValue.type) !== "Page") continue;

    const grouped = new Map<string, { direct: Set<string>; nested: Set<string> }>();

    walkElementsWithPath(recordOrEmpty(pageValue.elements), `pages.${pageKey}.elements`, (element, path) => {
      const reusable = resolveCustomElementToReusable(element, reusableStructure.byId);
      if (!reusable) return;

      ensureReusableGroup(grouped, reusable.key).direct.add(path);

      const nestedPaths = expandReusableChildrenPaths(
        reusable.key,
        reusableStructure.contains,
        `${path} -> ${reusable.key}`,
      );

      for (const nested of nestedPaths) {
        ensureReusableGroup(grouped, nested.reusableKey).nested.add(nested.path);
      }
    });

    const usages: PageReusableUsage[] = [];
    for (const [reusableKey, data] of grouped.entries()) {
      const summary = reusableStructure.byKey.get(reusableKey) ?? null;
      const directPaths = [...data.direct].sort();
      const nestedPaths = [...data.nested].sort();
      usages.push({
        pageKey,
        reusableKey,
        reusableId: summary?.id ?? null,
        reusableName: summary?.name ?? null,
        instanceCount: directPaths.length + nestedPaths.length,
        directInstancePaths: directPaths,
        nestedInstancePaths: nestedPaths,
      });
    }

    result[pageKey] = usages.sort((a, b) => {
      const an = a.reusableName ?? a.reusableKey;
      const bn = b.reusableName ?? b.reusableKey;
      return an.localeCompare(bn);
    });
  }

  normalizePageUsageWithElementIndex(result, elementIndex);

  return result;
}

function normalizePageUsageWithElementIndex(
  pageMap: Record<string, PageReusableUsage[]>,
  elementIndex: BubbleParsedTree["elementIndex"],
): void {
  void elementIndex;
  // Reserved for future enrichment without changing public shape.
  for (const pageUsages of Object.values(pageMap)) {
    pageUsages.forEach((usage) => {
      usage.directInstancePaths = dedupeArray(usage.directInstancePaths);
      usage.nestedInstancePaths = dedupeArray(usage.nestedInstancePaths);
      usage.instanceCount = usage.directInstancePaths.length + usage.nestedInstancePaths.length;
    });
  }
}

function applyPageWorkflowRollups(
  pages: ParsedNode[],
  reusables: ParsedNode[],
  pageReusableMap: Record<string, PageReusableUsage[]>,
): void {
  const reusableByKey = new Map(reusables.map((node) => [node.key, node]));

  for (const page of pages) {
    const baseCount = page.baseWorkflowCount ?? page.workflows.length;
    const usages = pageReusableMap[page.key] ?? [];
    const reusableWorkflowIds = new Set<string>();

    for (const usage of usages) {
      const reusable = reusableByKey.get(usage.reusableKey);
      if (!reusable) continue;
      for (const wf of reusable.workflows) {
        reusableWorkflowIds.add(workflowNodeId(wf));
      }
    }

    const reusableCount = reusableWorkflowIds.size;
    page.baseWorkflowCount = baseCount;
    page.effectiveReusableWorkflowCount = reusableCount;
    page.effectiveWorkflowCount = baseCount + reusableCount;
    page.workflowCount = page.effectiveWorkflowCount;
  }
}

function buildGraph(
  pages: ParsedNode[],
  reusables: ParsedNode[],
  backendWorkflows: NormalizedWorkflow[],
  apiConnector: ApiConnectorCallMeta[],
  pageReusableMap: Record<string, PageReusableUsage[]>,
  reusableStructure: ReusableStructure,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const page of pages) {
    nodes.push({
      id: pageNodeId(page.key),
      type: "page",
      label: page.name ?? page.key,
      meta: { key: page.key },
    });

    for (const wf of page.workflows) {
      nodes.push({
        id: workflowNodeId(wf),
        type: "workflow",
        label: wf.display.displayLabel,
        meta: { ownerScope: wf.scope, ownerKey: wf.ownerKey, workflowKey: wf.workflowKey },
      });
    }
  }

  for (const reusable of reusables) {
    nodes.push({
      id: reusableNodeId(reusable.key),
      type: "reusable",
      label: reusable.name ?? reusable.key,
      meta: { key: reusable.key },
    });

    for (const wf of reusable.workflows) {
      nodes.push({
        id: workflowNodeId(wf),
        type: "workflow",
        label: wf.display.displayLabel,
        meta: { ownerScope: wf.scope, ownerKey: wf.ownerKey, workflowKey: wf.workflowKey },
      });
    }
  }

  for (const wf of backendWorkflows) {
    nodes.push({
      id: backendNodeId(wf.workflowKey),
      type: "backend",
      label: wf.display.displayLabel,
      meta: { key: wf.workflowKey },
    });
  }

  for (const call of apiConnector) {
    nodes.push({
      id: apiCallNodeId(call),
      type: "apiCall",
      label: call.name ?? `${call.connectorId}.${call.callId}`,
      meta: { connectorId: call.connectorId, callId: call.callId, method: call.method, url: call.url },
    });
  }

  for (const [pageKey, usages] of Object.entries(pageReusableMap)) {
    for (const usage of usages) {
      edges.push({
        id: `edge:page_contains_reusable:${pageKey}:${usage.reusableKey}`,
        type: "page_contains_reusable",
        from: pageNodeId(pageKey),
        to: reusableNodeId(usage.reusableKey),
        label: `${usage.instanceCount} instances`,
      });
    }
  }

  for (const [reusableKey, children] of reusableStructure.contains.entries()) {
    for (const child of children) {
      edges.push({
        id: `edge:reusable_contains_reusable:${reusableKey}:${child.reusableKey}:${hashLabel(child.path)}`,
        type: "reusable_contains_reusable",
        from: reusableNodeId(reusableKey),
        to: reusableNodeId(child.reusableKey),
        label: child.path,
      });
    }
  }

  const workflowEventIndex = indexCustomEventWorkflows([...pages, ...reusables]);

  const allWorkflowOwners = [...pages, ...reusables, ...backendWorkflows.map((wf) => ({
    key: wf.ownerKey,
    id: wf.ownerId,
    name: wf.ownerName,
    workflowCount: 1,
    baseWorkflowCount: 1,
    effectiveWorkflowCount: 1,
    effectiveReusableWorkflowCount: 0,
    actionCount: wf.steps.length,
    workflows: [wf],
  }))];

  for (const owner of allWorkflowOwners) {
    for (const workflow of owner.workflows) {
      const fromWorkflow = graphWorkflowSourceId(workflow);

      for (const step of workflow.steps) {
        if (step.actionType === "ChangePage" && step.navigation?.targetPageKey) {
          edges.push({
            id: `edge:workflow_navigates_page:${fromWorkflow}:${step.navigation.targetPageKey}:${step.stepKey}`,
            type: "workflow_navigates_page",
            from: fromWorkflow,
            to: pageNodeId(step.navigation.targetPageKey),
            sourceWorkflow: fromWorkflow,
            sourceStep: step.stepKey,
            label: `Step ${step.step}: navigate to ${step.navigation.targetPageName ?? step.navigation.targetPageKey}`,
          });
        }

        if (step.actionType === "ScheduleAPIEvent" && step.scheduleApiTarget) {
          edges.push({
            id: `edge:workflow_schedules_backend:${fromWorkflow}:${step.scheduleApiTarget.key}:${step.stepKey}`,
            type: "workflow_schedules_backend",
            from: fromWorkflow,
            to: backendNodeId(step.scheduleApiTarget.key),
            sourceWorkflow: fromWorkflow,
            sourceStep: step.stepKey,
            label: `Step ${step.step}: schedule ${step.scheduleApiTarget.name ?? step.scheduleApiTarget.key}`,
          });
        }

        if (step.apiConnector) {
          edges.push({
            id: `edge:workflow_calls_api_connector:${fromWorkflow}:${step.apiConnector.connectorId}.${step.apiConnector.callId}:${step.stepKey}`,
            type: "workflow_calls_api_connector",
            from: fromWorkflow,
            to: apiCallNodeId(step.apiConnector),
            sourceWorkflow: fromWorkflow,
            sourceStep: step.stepKey,
            label: `Step ${step.step}: ${step.apiConnector.method ?? "CALL"}`,
          });
        }

        const customEventName = resolveCustomEventFromStep(step);
        if (!customEventName) continue;

        const target = resolveWorkflowTriggerTarget(workflow, step, customEventName, workflowEventIndex);
        if (!target) continue;

        edges.push({
          id: `edge:workflow_triggers_workflow:${fromWorkflow}:${target}:${step.stepKey}`,
          type: "workflow_triggers_workflow",
          from: fromWorkflow,
          to: target,
          sourceWorkflow: fromWorkflow,
          sourceStep: step.stepKey,
          label: `Step ${step.step}: trigger ${customEventName}`,
        });
      }
    }
  }

  return {
    nodes: dedupeBy(nodes, (n) => n.id),
    edges: dedupeBy(edges, (e) => e.id),
  };
}

function indexCustomEventWorkflows(nodes: ParsedNode[]): Map<string, string> {
  const index = new Map<string, string>();

  for (const node of nodes) {
    for (const wf of node.workflows) {
      if (wf.triggerType !== "CustomEvent") continue;
      const eventName = cleanName(asString(wf.properties.event_name));
      if (!eventName) continue;
      index.set(`${wf.scope}:${wf.ownerKey}:${eventName.toLowerCase()}`, workflowNodeId(wf));
    }
  }

  return index;
}

function resolveWorkflowTriggerTarget(
  sourceWorkflow: NormalizedWorkflow,
  step: NormalizedStep,
  customEventName: string,
  eventIndex: Map<string, string>,
): string | null {
  const sameOwnerKey = `${sourceWorkflow.scope}:${sourceWorkflow.ownerKey}:${customEventName.toLowerCase()}`;
  if (eventIndex.has(sameOwnerKey)) return eventIndex.get(sameOwnerKey) ?? null;

  if (step.actionType === "TriggerCustomEventFromReusable" && step.resolvedElement?.reusableKey) {
    const key = `reusable:${step.resolvedElement.reusableKey}:${customEventName.toLowerCase()}`;
    return eventIndex.get(key) ?? null;
  }

  return null;
}

function resolveCustomEventFromStep(step: NormalizedStep): string | null {
  if (
    step.actionType !== "TriggerCustomEvent"
    && step.actionType !== "TriggerCustomEventFromReusable"
    && step.actionType !== "ScheduleCustom"
  ) {
    return null;
  }

  return cleanName(asString(step.properties.custom_event));
}

function extractBackendParams(parametersRaw: unknown): BackendWorkflowParam[] {
  const bucket = recordOrEmpty(parametersRaw);
  return sortedEntries(bucket)
    .filter(([, value]) => isRecord(value))
    .map(([, value]) => {
      const record = value as Record<string, unknown>;
      const keyName = asString(record.key);
      const legacyName = asString(record.param_name);
      const valueType = asString(record.value);
      const legacyType = asString(record.btype_id);
      const sourceShape = keyName || valueType
        ? "api_event_key_value"
        : (legacyName || legacyType ? "legacy_param_shape" : "unknown");
      const optional = isBubbleTruthy(record.optional);
      const isList = isBubbleTruthy(record.is_list);
      const inUrl = isBubbleTruthy(record.in_url);
      return {
        paramId: asString(record.param_id),
        name: legacyName ?? keyName,
        btypeId: legacyType ?? valueType,
        displayName: keyName ?? legacyName ?? "param",
        typeName: valueType ?? legacyType ?? "unknown",
        optional,
        isList,
        inUrl,
        sourceShape,
      };
    });
}

function extractApiConnectorConfig(settingsRaw: Record<string, unknown>): ApiConnectorCallMeta[] {
  const clientSafe = recordOrEmpty(settingsRaw.client_safe);
  const apiConnectorBucket = recordOrEmpty(clientSafe.apiconnector2);

  const out: ApiConnectorCallMeta[] = [];

  for (const [connectorId, connectorValue] of sortedEntries(apiConnectorBucket)) {
    if (!isRecord(connectorValue)) continue;
    const connectorCalls = recordOrEmpty(connectorValue.calls);

    for (const [callId, callValue] of sortedEntries(connectorCalls)) {
      if (!isRecord(callValue)) continue;

      out.push({
        connectorId,
        connectorName: asString(connectorValue.human),
        callId,
        name: asString(callValue.name),
        method: asString(callValue.method),
        url: asString(callValue.url),
        publishAs: asString(callValue.publish_as),
        initialized: Boolean(callValue.initialized),
        bodyType: asString(callValue.body_type),
        params: recordOrEmpty(callValue.params),
        urlParams: recordOrEmpty(callValue.url_params),
        auth: redactSecrets(recordOrEmpty(connectorValue.auth)),
        bodyParams: recordOrEmpty(callValue.body_params),
        responseSummary: summarizeApiResponseTypes(callValue.types),
        requestParams: extractApiRequestParams(callValue),
        resourceKey: inferApiResourceKey(asString(callValue.url)),
      });
    }
  }

  return out;
}

function buildApiConnectorGroups(calls: ApiConnectorCallMeta[]): ApiConnectorGroup[] {
  const byConnector = new Map<string, Map<string, ApiCallDetail[]>>();

  for (const call of stableSortBy(calls, (c) => `${c.connectorId}:${c.resourceKey}:${c.callId}`)) {
    const connectorKey = call.connectorId;
    const resourceKey = call.resourceKey || "other";
    if (!byConnector.has(connectorKey)) byConnector.set(connectorKey, new Map());
    const byResource = byConnector.get(connectorKey) as Map<string, ApiCallDetail[]>;
    if (!byResource.has(resourceKey)) byResource.set(resourceKey, []);
    byResource.get(resourceKey)?.push({
      ...call,
      technicalLabel: `${call.connectorId}.${call.callId}`,
    });
  }

  return stableSortBy(
    [...byConnector.entries()].map(([connectorId, byResource]) => ({
      connectorId,
      connectorName: calls.find((c) => c.connectorId === connectorId)?.connectorName ?? null,
      resources: stableSortBy(
        [...byResource.entries()].map(([resourceKey, groupedCalls]) => ({
          resourceKey,
          calls: stableSortBy(groupedCalls, (call) => `${call.name ?? call.callId}:${call.callId}`),
        })),
        (item) => item.resourceKey,
      ),
    })),
    (group) => `${group.connectorName ?? group.connectorId}:${group.connectorId}`,
  );
}

function extractApiRequestParams(callValue: Record<string, unknown>): ApiParamMeta[] {
  const out: ApiParamMeta[] = [];
  const pathParams = recordOrEmpty(callValue.url_params);
  const queryParams = recordOrEmpty(callValue.params);
  const bodyParams = recordOrEmpty(callValue.body_params);

  const pushParams = (location: ApiParamMeta["location"], bucket: Record<string, unknown>) => {
    for (const [, value] of sortedEntries(bucket)) {
      if (!isRecord(value)) continue;
      const param = value as Record<string, unknown>;
      out.push({
        key: asString(param.key) ?? "unknown",
        location,
        inferredType: inferParamType(param.value),
        optional: Boolean(param.optional),
        private: Boolean(param.private),
        valuePreview: Boolean(param.private) ? null : previewApiValue(param.value),
      });
    }
  };

  pushParams("path", pathParams);
  pushParams("query", queryParams);
  pushParams("body", bodyParams);

  return stableSortBy(out, (item) => `${item.location}:${item.key}`);
}

function summarizeApiResponseTypes(typesRaw: unknown): ApiResponseSummary {
  const parsedPayload = parseApiTypesPayload(typesRaw);
  if (!parsedPayload.ok) {
    return {
      topLevelFields: [],
      fields: [],
      groups: [],
      truncated: false,
      totalFieldEstimate: 0,
      parseError: parsedPayload.parseError,
    };
  }

  const rows: ApiResponseField[] = [];
  for (const [, rootValue] of sortedEntries(parsedPayload.payload)) {
    if (!isRecord(rootValue)) continue;
    const fieldsRaw = recordOrEmpty(rootValue.fields);
    for (const [fieldKey, fieldValue] of sortedEntries(fieldsRaw)) {
      if (!isRecord(fieldValue)) continue;
      const pathSegments = extractResponsePathSegments(fieldValue, fieldKey);
      const path = pathSegments.length ? pathSegments.join(".") : fieldKey;
      rows.push({
        path,
        pathSegments,
        caption: asString(fieldValue.caption) ?? path,
        type: asString(fieldValue.ret_btype) ?? "unknown",
        sampleValue: previewApiValue(fieldValue.sample_value),
      });
    }
  }

  const sortedRows = stableSortBy(rows, (row) => row.path);
  const maxRows = 60;
  const visibleRows = sortedRows.slice(0, maxRows);
  const groups = buildResponseGroups(visibleRows);

  return {
    topLevelFields: visibleRows.slice(0, 25).map((field) => ({ path: field.path, type: field.type })),
    fields: visibleRows,
    groups,
    truncated: sortedRows.length > maxRows,
    totalFieldEstimate: sortedRows.length,
    parseError: null,
  };
}

function parseApiTypesPayload(typesRaw: unknown): { ok: true; payload: Record<string, unknown> } | { ok: false; parseError: string } {
  if (isRecord(typesRaw)) {
    return { ok: true, payload: typesRaw };
  }
  if (typeof typesRaw === "string") {
    const trimmed = typesRaw.trim();
    if (!trimmed) return { ok: false, parseError: "Empty response metadata" };
    try {
      const parsed = JSON.parse(trimmed);
      if (!isRecord(parsed)) return { ok: false, parseError: "Unsupported response metadata shape" };
      return { ok: true, payload: parsed };
    } catch {
      return { ok: false, parseError: "Invalid response metadata JSON" };
    }
  }
  return { ok: false, parseError: "Unsupported response metadata shape" };
}

function extractResponsePathSegments(fieldValue: Record<string, unknown>, fieldKey: string): string[] {
  const path = fieldValue.path;
  if (Array.isArray(path)) {
    const segments = path
      .map((segment) => (typeof segment === "string" ? segment.trim() : ""))
      .filter(Boolean);
    if (segments.length) return segments;
  }

  if (fieldKey.includes(".")) {
    return fieldKey
      .split(".")
      .map((segment, index) => (index === 0 ? segment.replace(/^_api_c2_/, "") : segment))
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return [fieldKey];
}

function buildResponseGroups(fields: ApiResponseField[]): ApiResponseGroup[] {
  const byGroup = new Map<string, ApiResponseField[]>();
  for (const field of fields) {
    const groupSegments = field.pathSegments.slice(0, 2);
    const key = groupSegments.length ? groupSegments.join(".") : "root";
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)?.push(field);
  }

  return stableSortBy(
    [...byGroup.entries()].map(([key, grouped]) => ({
      key,
      label: key,
      fieldCount: grouped.length,
      fields: stableSortBy(grouped, (field) => field.path),
    })),
    (group) => group.key,
  );
}

function inferApiResourceKey(url: string | null): string {
  if (!url) return "other";
  const cleaned = url
    .replace(/^https?:\/\//, "")
    .split("?")[0]
    .toLowerCase();
  const parts = cleaned.split("/").filter(Boolean);
  const idx = parts.findIndex((part) => part === "v1" || part === "v2");
  if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  return parts[1] ?? parts[0] ?? "other";
}

function inferParamType(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) return "number";
    if (trimmed === "true" || trimmed === "false") return "boolean";
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
    return "text";
  }
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "list";
  if (isRecord(value)) return "object";
  return null;
}

function previewApiValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") {
    const cleaned = value.trim();
    if (!cleaned) return null;
    return cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (isRecord(value)) return "{...}";
  return null;
}

function buildBackendWorkflowLookup(apiRaw: Record<string, unknown>): Map<string, BackendLookupRecord> {
  const out = new Map<string, BackendLookupRecord>();

  for (const [apiKey, wfValue] of sortedEntries(apiRaw)) {
    if (!isRecord(wfValue)) continue;
    const properties = recordOrEmpty(wfValue.properties);
    const item: BackendLookupRecord = {
      key: apiKey,
      id: asString(wfValue.id),
      name: asString(properties.wf_name) ?? asString(wfValue.name),
    };

    out.set(apiKey, item);
    if (item.id) out.set(item.id, item);
  }

  return out;
}

function buildPageLookup(
  pagesRaw: Record<string, unknown>,
  indexRaw: Record<string, unknown>,
): Map<string, PageLookupRecord> {
  const lookup = new Map<string, PageLookupRecord>();
  const idToPath = recordOrEmpty(indexRaw.id_to_path);

  for (const [pageKey, pageValue] of sortedEntries(pagesRaw)) {
    if (!isRecord(pageValue) || asString(pageValue.type) !== "Page") continue;
    const id = asString(pageValue.id);
    const item: PageLookupRecord = {
      id,
      key: pageKey,
      name: asString(pageValue.name),
      path: inferPagePath(pageKey, pageValue, idToPath),
    };

    lookup.set(pageKey, item);
    if (id) lookup.set(id, item);
  }

  return lookup;
}

function inferPagePath(
  pageKey: string,
  pageValue: Record<string, unknown>,
  idToPath: Record<string, unknown>,
): string | null {
  const name = asString(pageValue.name);
  if (name) return name;
  const id = asString(pageValue.id);
  if (id && typeof idToPath[id] === "string") {
    return String(idToPath[id]);
  }
  return pageKey;
}

function parseApiConnectorType(type: string): { connectorId: string; callId: string } | null {
  const match = /^apiconnector2-([^.]+)\.(.+)$/.exec(type);
  if (!match) return null;
  return { connectorId: match[1], callId: match[2] };
}

function lookupApiConnectorCall(calls: ApiConnectorCallMeta[], actionType: string): ApiConnectorCallMeta | null {
  const parsed = parseApiConnectorType(actionType);
  if (!parsed) return null;

  return (
    calls.find((call) => call.connectorId === parsed.connectorId && call.callId === parsed.callId)
    ?? null
  );
}

function lookupScheduledApiTarget(
  apiEvent: unknown,
  backendLookup: Map<string, BackendLookupRecord>,
): BackendLookupRecord | null {
  const eventKey = asString(apiEvent);
  if (!eventKey) return null;
  return backendLookup.get(eventKey) ?? null;
}

function classifyActionType(actionType: string | null): NormalizedStep["classification"] {
  if (!actionType) return "unknown";
  if (actionType.startsWith("apiconnector2-")) return "api_connector";
  if (KNOWN_NATIVE_ACTIONS.has(actionType)) return "native";
  return "plugin_action";
}

function resolveNavigationTargets(
  properties: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
  pageLookup: Map<string, PageLookupRecord>,
  workflowCondition: unknown,
): NonNullable<NormalizedStep["navigation"]> {
  const candidates: NonNullable<NormalizedStep["navigation"]>["targetCandidates"] = [];
  const targetToken = asString(properties.element_id);

  const addCandidate = (
    source: string,
    target: PageLookupRecord | null,
    explicitId: string | null = null,
  ) => {
    if (!target && !explicitId) return;
    candidates.push({
      source,
      pageId: target?.id ?? explicitId,
      pageKey: target?.key ?? null,
      pageName: target?.name ?? null,
    });
  };

  let resolvedByElement: PageLookupRecord | null = null;

  if (targetToken) {
    const direct = pageLookup.get(targetToken) ?? null;
    addCandidate("token", direct, direct ? null : targetToken);

    const ref = resolveElementReference(targetToken, elementIndex);
    if (ref && ref.scope === "page") {
      resolvedByElement = pageLookup.get(ref.ownerKey) ?? null;
      addCandidate("element-owner", resolvedByElement, ref.id);
    }
  }

  const deduped = dedupeBy(candidates, (c) => `${c.pageId ?? ""}:${c.pageKey ?? ""}:${c.source}`);
  const primary = deduped.find((c) => c.pageKey || c.pageId) ?? null;
  const conditionLabel = decodeExpression(properties.condition ?? workflowCondition, elementIndex);

  return {
    targetPageId: primary?.pageId ?? null,
    targetPageKey: primary?.pageKey ?? null,
    targetPageName: primary?.pageName ?? null,
    targetCandidates: deduped,
    branches: [
      {
        condition: conditionLabel,
        targetPageId: primary?.pageId ?? null,
        targetPageKey: primary?.pageKey ?? null,
        targetPageName: primary?.pageName ?? null,
      },
    ],
  };
}

function decodeArguments(
  properties: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
): string[] {
  const out: string[] = [];

  for (const [key, value] of sortedEntries(properties)) {
    if (
      key === "arguments"
      || key.startsWith("_wf_param_")
      || key === "url_parameters"
      || key === "custom_event"
      || key === "api_event"
    ) {
      out.push(`${key}: ${decodeExpression(value, elementIndex)}`);
    }
  }

  return out;
}

function decodeExpression(
  value: unknown,
  elementIndex: BubbleParsedTree["elementIndex"],
): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    const parts = value.map((v) => decodeExpression(v, elementIndex)).filter(Boolean);
    return parts.join(", ");
  }

  if (!isRecord(value)) return null;

  const type = asString(value.type);
  const props = recordOrEmpty(value.properties);
  const next = value.next;

  const renderNext = () => {
    const rendered = decodeExpression(next, elementIndex);
    return rendered ? ` -> ${rendered}` : "";
  };

  if (type === "CurrentUser") return `Current User${renderNext()}`;
  if (type === "CurrentWorkflowItem") {
    const label = asString(props.param_name) ?? asString(props.param_id) ?? "WorkflowItem";
    return `${label}${renderNext()}`;
  }
  if (type === "GetElement") {
    const elementId = asString(props.element_id);
    const resolved = resolveElementReference(elementId, elementIndex);
    const label = labelElement(resolved, elementId);
    return `Element(${label})${renderNext()}`;
  }
  if (type === "GetParamFromUrl") {
    const param = decodeExpression(props.parameter_name, elementIndex) ?? asString(props.parameter_name) ?? "param";
    return `URL param(${param})${renderNext()}`;
  }
  if (type === "PageData") {
    return asString(props.name) ?? "Page data";
  }
  if (type === "TextExpression") {
    const entries = recordOrEmpty(value.entries);
    const parts = sortedEntries(entries)
      .map(([, v]) => decodeExpression(v, elementIndex) ?? "")
      .filter(Boolean);
    return parts.join("");
  }
  if (type === "Message") {
    const name = asString(value.name) ?? "Message";
    const msg = decodeMessageName(name, value, elementIndex);
    return `${msg}${renderNext()}`;
  }
  if (type === "APIEventParameter") {
    const label = asString(props.param_name) ?? asString(props.param_id) ?? "API param";
    return `API Param(${label})`;
  }

  const fallbackProps = Object.keys(props).length > 0
    ? `(${Object.keys(props).slice(0, 3).join(",")})`
    : "";
  return `${type ?? "Expression"}${fallbackProps}${renderNext()}`;
}

function decodeMessageName(
  name: string,
  node: Record<string, unknown>,
  elementIndex: BubbleParsedTree["elementIndex"],
): string {
  const args = decodeExpression(node.args, elementIndex);
  switch (name) {
    case "equals":
      return `equals ${args ?? ""}`.trim();
    case "not_equals":
      return `not equals ${args ?? ""}`.trim();
    case "or_":
      return `or ${args ?? ""}`.trim();
    case "is_false":
      return "is false";
    case "is_true":
      return "is true";
    case "is_empty":
      return "is empty";
    case "get_data":
      return "get data";
    case "get_group_data":
      return "group data";
    default:
      return name;
  }
}

function summarizeWorkflowBranches(steps: NormalizedStep[]): string | null {
  const branches: string[] = [];
  for (const step of steps) {
    if (step.navigation?.branches?.length) {
      const first = step.navigation.branches[0];
      const target = first.targetPageName ?? first.targetPageKey ?? first.targetPageId ?? "unknown";
      if (first.condition) {
        branches.push(`if ${first.condition} -> ${target}`);
      } else {
        branches.push(`-> ${target}`);
      }
    }
  }

  if (!branches.length) return null;
  return branches.slice(0, 2).join(" | ");
}

function summarizeAction(
  actionType: string | null,
  properties: Record<string, unknown>,
  resolvedElement: ElementRecord | null,
  connectorCall: ApiConnectorCallMeta | null,
  scheduleApiTarget: BackendLookupRecord | null,
  navigation: NormalizedStep["navigation"],
): string {
  if (!actionType) return "Unknown action";

  if (connectorCall) {
    const method = connectorCall.method ?? "CALL";
    const name = connectorCall.name ?? `${connectorCall.connectorId}.${connectorCall.callId}`;
    const url = connectorCall.url ?? "(no URL)";
    return `${method} API Connector: ${name} -> ${url}`;
  }

  if (actionType === "ScheduleAPIEvent") {
    const apiEvent = asString(properties.api_event) ?? "unknown_api_event";
    const target = scheduleApiTarget?.name ?? scheduleApiTarget?.key ?? apiEvent;
    return `Schedule backend workflow ${target}`;
  }

  if (actionType === "SetCustomState") {
    const customState = asString(properties.custom_state) ?? "state";
    const elementLabel = labelElement(resolvedElement, asString(properties.element_id));
    return `Set custom state ${customState} on ${elementLabel}`;
  }

  if (actionType === "ChangeThing") {
    return "Change thing";
  }

  if (actionType === "ChangePage") {
    const target = navigation?.targetPageName ?? navigation?.targetPageKey ?? navigation?.targetPageId;
    if (target) return `Navigate to ${target}`;
    return "Navigate to another page";
  }

  if (actionType === "TriggerCustomEvent") {
    return `Trigger custom event ${asString(properties.custom_event) ?? "event"}`;
  }

  if (actionType === "TriggerCustomEventFromReusable") {
    const elementLabel = labelElement(resolvedElement, asString(properties.element_id));
    return `Trigger reusable custom event on ${elementLabel}`;
  }

  if (actionType === "DisplayGroupData") {
    const elementLabel = labelElement(resolvedElement, asString(properties.element_id));
    return `Display data in ${elementLabel}`;
  }

  if (actionType === "ShowElement" || actionType === "HideElement" || actionType === "ToggleElement") {
    const elementLabel = labelElement(resolvedElement, asString(properties.element_id));
    return `${actionType} ${elementLabel}`;
  }

  return actionType;
}

function buildNode(key: string, id: string | null, name: string | null, workflows: NormalizedWorkflow[]): ParsedNode {
  const baseWorkflowCount = workflows.length;
  return {
    key,
    id,
    name,
    workflowCount: baseWorkflowCount,
    baseWorkflowCount,
    effectiveWorkflowCount: baseWorkflowCount,
    effectiveReusableWorkflowCount: 0,
    actionCount: workflows.reduce((sum, wf) => sum + wf.steps.length, 0),
    workflows,
  };
}

function labelElement(record: ElementRecord | null, fallbackId: string | null): string {
  if (!record) return fallbackId ?? "unknown element";
  return record.name ?? record.defaultName ?? record.localKey;
}

function resolveElementReference(
  elementRef: unknown,
  index: BubbleParsedTree["elementIndex"],
): ElementRecord | null {
  const id = asString(elementRef);
  if (!id) return null;

  return index.byId[id] ?? index.byLocalKey[id] ?? null;
}

function resolveCustomElementToReusable(
  element: Record<string, unknown>,
  reusableById: Map<string, ReusableDefSummary>,
): ReusableDefSummary | null {
  if (asString(element.type) !== "CustomElement") return null;
  const customId = asString(recordOrEmpty(element.properties).custom_id);
  if (!customId) return null;
  return reusableById.get(customId) ?? null;
}

function expandReusableChildrenPaths(
  reusableKey: string,
  containsMap: Map<string, Array<{ reusableKey: string; path: string }>>,
  basePath: string,
  visited: Set<string> = new Set(),
): Array<{ reusableKey: string; path: string }> {
  if (visited.has(reusableKey)) return [];
  visited.add(reusableKey);

  const out: Array<{ reusableKey: string; path: string }> = [];
  const children = containsMap.get(reusableKey) ?? [];

  for (const child of children) {
    const childPath = `${basePath} -> ${child.reusableKey} (${child.path})`;
    out.push({ reusableKey: child.reusableKey, path: childPath });
    out.push(...expandReusableChildrenPaths(child.reusableKey, containsMap, childPath, new Set(visited)));
  }

  return out;
}

function ensureReusableGroup(
  grouped: Map<string, { direct: Set<string>; nested: Set<string> }>,
  reusableKey: string,
): { direct: Set<string>; nested: Set<string> } {
  const existing = grouped.get(reusableKey);
  if (existing) return existing;

  const created = { direct: new Set<string>(), nested: new Set<string>() };
  grouped.set(reusableKey, created);
  return created;
}

function walkElementsWithPath(
  elementsRaw: Record<string, unknown>,
  rootPath: string,
  visit: (element: Record<string, unknown>, path: string) => void,
): void {
  for (const [key, value] of sortedEntries(elementsRaw)) {
    if (!isRecord(value)) continue;

    const path = `${rootPath}.${key}`;
    visit(value, path);

    const nested = recordOrEmpty(value.elements);
    if (Object.keys(nested).length > 0) {
      walkElementsWithPath(nested, path, visit);
    }
  }
}

function cleanName(value: string | null): string | null {
  const cleaned = value?.trim();
  if (!cleaned) return null;
  return cleaned;
}

function humanizeElementToken(value: string | null): string | null {
  if (!value) return null;
  if (value === "Current page") return "current page";
  if (/^b[A-Za-z0-9]+$/.test(value)) return "trigger element";
  return value;
}

function shortId(value: string | null): string {
  if (!value) return "unknown";
  return value.length <= 8 ? value : value.slice(0, 6);
}

function workflowNodeId(workflow: Pick<NormalizedWorkflow, "scope" | "ownerKey" | "workflowKey">): string {
  return `workflow:${workflow.scope}:${workflow.ownerKey}:${workflow.workflowKey}`;
}

function graphWorkflowSourceId(workflow: Pick<NormalizedWorkflow, "scope" | "workflowKey" | "ownerKey">): string {
  if (workflow.scope === "api") return backendNodeId(workflow.workflowKey);
  return workflowNodeId(workflow);
}

function pageNodeId(pageKey: string): string {
  return `page:${pageKey}`;
}

function reusableNodeId(reusableKey: string): string {
  return `reusable:${reusableKey}`;
}

function backendNodeId(apiWorkflowKey: string): string {
  return `backend:${apiWorkflowKey}`;
}

function apiCallNodeId(call: Pick<ApiConnectorCallMeta, "connectorId" | "callId">): string {
  return `apiCall:${call.connectorId}.${call.callId}`;
}

function hashLabel(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16);
}

function dedupeArray(items: string[]): string[] {
  return [...new Set(items)].sort();
}

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function redactSecrets(value: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, val] of sortedEntries(value)) {
    if (/token|secret|password|key|auth|username/i.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }

    if (isRecord(val)) {
      out[key] = redactSecrets(val);
      continue;
    }

    out[key] = val;
  }

  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isBubbleTruthy(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (isRecord(value)) return asString(value.type) !== "Empty";
  return Boolean(value);
}

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function sortedEntries(obj: Record<string, unknown>): Array<[string, unknown]> {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

function stableSortBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}

export const bubbleUploadParserConstants = {
  MAX_FILE_SIZE_BYTES,
};
