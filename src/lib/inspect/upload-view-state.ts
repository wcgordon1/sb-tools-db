export type UploadInspectorTab = "page" | "reusable" | "backend" | "api" | "graph";
export type UploadPageTab = "workflows" | "reusables";
export type WorkflowPanelContextKey = "backend" | `page:${string}` | `reusable:${string}`;
export type GraphHopDepth = 1 | 2;

export interface InspectorViewState {
  tab: UploadInspectorTab;
  selectedPage: string | null;
  selectedReusable: string | null;
  selectedWorkflow: string | null;
  selectedEdge: string | null;
  selectedGraphNode: string | null;
  selectedGraphEdge: string | null;
  graphHopDepth: GraphHopDepth;
  graphPathTargetNode: string | null;
  graphEdgeTypes: string | null;
  selectedPageTab: UploadPageTab;
  expandedByContext: Record<string, string | null>;
  linkedWorkflowFromEdge: string | null;
}

const DEFAULT_STATE: InspectorViewState = {
  tab: "page",
  selectedPage: null,
  selectedReusable: null,
  selectedWorkflow: null,
  selectedEdge: null,
  selectedGraphNode: null,
  selectedGraphEdge: null,
  graphHopDepth: 1,
  graphPathTargetNode: null,
  graphEdgeTypes: null,
  selectedPageTab: "workflows",
  expandedByContext: {},
  linkedWorkflowFromEdge: null,
};

const TAB_VALUES = new Set<UploadInspectorTab>(["page", "reusable", "backend", "api", "graph"]);
const PAGE_TAB_VALUES = new Set<UploadPageTab>(["workflows", "reusables"]);

export function parseInspectorViewStateFromSearch(search: string): InspectorViewState {
  const params = new URLSearchParams(search);
  const tabRaw = params.get("tab");

  const tab = TAB_VALUES.has(tabRaw as UploadInspectorTab)
    ? (tabRaw as UploadInspectorTab)
    : DEFAULT_STATE.tab;
  const pageTabRaw = params.get("pageTab");
  const selectedPageTab = PAGE_TAB_VALUES.has(pageTabRaw as UploadPageTab)
    ? (pageTabRaw as UploadPageTab)
    : DEFAULT_STATE.selectedPageTab;
  const graphDepthRaw = params.get("graphDepth");
  const graphHopDepth: GraphHopDepth = graphDepthRaw === "2" ? 2 : 1;
  const selectedGraphEdge = params.get("graphEdge") ?? params.get("edge");

  return {
    tab,
    selectedPage: params.get("page"),
    selectedReusable: params.get("reusable"),
    selectedWorkflow: params.get("workflow"),
    selectedEdge: selectedGraphEdge,
    selectedGraphNode: params.get("graphNode"),
    selectedGraphEdge,
    graphHopDepth,
    graphPathTargetNode: params.get("graphTarget"),
    graphEdgeTypes: params.get("graphTypes"),
    selectedPageTab,
    expandedByContext: {},
    linkedWorkflowFromEdge: null,
  };
}

export function serializeInspectorViewStateToSearch(state: InspectorViewState): string {
  const params = new URLSearchParams();

  params.set("tab", state.tab);
  if (state.selectedPage) params.set("page", state.selectedPage);
  if (state.selectedReusable) params.set("reusable", state.selectedReusable);
  if (state.selectedWorkflow) params.set("workflow", state.selectedWorkflow);
  if (state.selectedEdge) params.set("edge", state.selectedEdge);
  if (state.selectedGraphNode) params.set("graphNode", state.selectedGraphNode);
  if (state.selectedGraphEdge) params.set("graphEdge", state.selectedGraphEdge);
  if (state.graphHopDepth) params.set("graphDepth", String(state.graphHopDepth));
  if (state.graphPathTargetNode) params.set("graphTarget", state.graphPathTargetNode);
  if (state.graphEdgeTypes) params.set("graphTypes", state.graphEdgeTypes);
  if (state.selectedPageTab) params.set("pageTab", state.selectedPageTab);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

export function mergeInspectorViewState(
  current: InspectorViewState,
  patch: Partial<InspectorViewState>,
): InspectorViewState {
  const nextExpanded = patch.expandedByContext
    ? { ...current.expandedByContext, ...patch.expandedByContext }
    : current.expandedByContext;

  return {
    ...current,
    ...patch,
    expandedByContext: nextExpanded,
  };
}

export function defaultInspectorViewState(): InspectorViewState {
  return { ...DEFAULT_STATE };
}

export function resolveContextKey(
  tab: UploadInspectorTab,
  selectedPage: string | null,
  selectedReusable: string | null = null,
): WorkflowPanelContextKey {
  if (tab === "backend") return "backend";
  if (tab === "reusable") return `reusable:${selectedReusable ?? "__none__"}`;
  return `page:${selectedPage ?? "__none__"}`;
}

export function getExpandedWorkflow(
  state: InspectorViewState,
  contextKey: WorkflowPanelContextKey,
): string | null {
  return state.expandedByContext[contextKey] ?? null;
}

export function setExpandedWorkflow(
  state: InspectorViewState,
  contextKey: WorkflowPanelContextKey,
  workflowId: string | null,
): InspectorViewState {
  return mergeInspectorViewState(state, {
    expandedByContext: {
      [contextKey]: workflowId,
    },
  });
}
