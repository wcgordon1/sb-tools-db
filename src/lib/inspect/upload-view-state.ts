export type UploadInspectorTab = "page" | "reusable" | "backend" | "api" | "graph";
export type UploadPageTab = "workflows" | "reusables";
export type WorkflowPanelContextKey = "backend" | `page:${string}` | `reusable:${string}`;

export interface InspectorViewState {
  tab: UploadInspectorTab;
  selectedPage: string | null;
  selectedReusable: string | null;
  selectedWorkflow: string | null;
  selectedEdge: string | null;
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

  return {
    tab,
    selectedPage: params.get("page"),
    selectedReusable: params.get("reusable"),
    selectedWorkflow: params.get("workflow"),
    selectedEdge: params.get("edge"),
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
