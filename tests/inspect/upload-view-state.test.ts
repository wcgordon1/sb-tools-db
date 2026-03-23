import { describe, expect, it } from "vitest";
import {
  defaultInspectorViewState,
  getExpandedWorkflow,
  mergeInspectorViewState,
  parseInspectorViewStateFromSearch,
  resolveContextKey,
  serializeInspectorViewStateToSearch,
  setExpandedWorkflow,
} from "@/lib/inspect/upload-view-state";

describe("upload view state", () => {
  it("parses valid query params", () => {
    const state = parseInspectorViewStateFromSearch("?tab=graph&page=home&reusable=global&workflow=page:home:wf1&edge=edge1&pageTab=reusables&graphNode=page:home&graphDepth=2&graphTarget=api:bTHcX.bTHdH&graphTypes=workflow_calls_api_connector");
    expect(state).toEqual({
      tab: "graph",
      selectedPage: "home",
      selectedReusable: "global",
      selectedWorkflow: "page:home:wf1",
      selectedEdge: "edge1",
      selectedGraphNode: "page:home",
      selectedGraphEdge: "edge1",
      graphHopDepth: 2,
      graphPathTargetNode: "api:bTHcX.bTHdH",
      graphEdgeTypes: "workflow_calls_api_connector",
      selectedPageTab: "reusables",
      expandedByContext: {},
      linkedWorkflowFromEdge: null,
    });
  });

  it("falls back to default tab on invalid tab", () => {
    const state = parseInspectorViewStateFromSearch("?tab=bad&page=home");
    expect(state.tab).toBe("page");
    expect(state.selectedPage).toBe("home");
  });

  it("supports reusable top-level tab", () => {
    const state = parseInspectorViewStateFromSearch("?tab=reusable&reusable=bTHKL");
    expect(state.tab).toBe("reusable");
    expect(state.selectedReusable).toBe("bTHKL");
  });

  it("serializes state deterministically", () => {
    const search = serializeInspectorViewStateToSearch({
      tab: "backend",
      selectedPage: "bTHDm",
      selectedReusable: null,
      selectedWorkflow: "api:bTHJC:bTHJC",
      selectedEdge: null,
      selectedGraphNode: null,
      selectedGraphEdge: null,
      graphHopDepth: 1,
      graphPathTargetNode: null,
      graphEdgeTypes: null,
      selectedPageTab: "workflows",
      expandedByContext: {},
      linkedWorkflowFromEdge: null,
    });

    expect(search).toBe("?tab=backend&page=bTHDm&workflow=api%3AbTHJC%3AbTHJC&graphDepth=1&pageTab=workflows");
  });

  it("merges patches", () => {
    const current = defaultInspectorViewState();
    const merged = mergeInspectorViewState(current, { tab: "api", selectedEdge: "x", selectedGraphEdge: "x", graphHopDepth: 2 });
    expect(merged.tab).toBe("api");
    expect(merged.selectedEdge).toBe("x");
    expect(merged.selectedGraphEdge).toBe("x");
    expect(merged.graphHopDepth).toBe(2);
    expect(merged.selectedPage).toBeNull();
    expect(merged.expandedByContext).toEqual({});
    expect(merged.linkedWorkflowFromEdge).toBeNull();
  });

  it("maps legacy edge query param to selectedGraphEdge for compatibility", () => {
    const state = parseInspectorViewStateFromSearch("?tab=graph&edge=edge:legacy:1");
    expect(state.selectedEdge).toBe("edge:legacy:1");
    expect(state.selectedGraphEdge).toBe("edge:legacy:1");
  });

  it("resolves context keys for tabs", () => {
    expect(resolveContextKey("backend", "bTHDm")).toBe("backend");
    expect(resolveContextKey("page", "bTHDm")).toBe("page:bTHDm");
    expect(resolveContextKey("reusable", "bTHDm", "bTHKL")).toBe("reusable:bTHKL");
    expect(resolveContextKey("page", null)).toBe("page:__none__");
  });

  it("sets and gets expanded workflow by context", () => {
    let state = defaultInspectorViewState();
    state = setExpandedWorkflow(state, "page:bTHDm", "page:bTHDm:bTHFT");
    state = setExpandedWorkflow(state, "backend", "api:bTHJC:bTHJC");

    expect(getExpandedWorkflow(state, "page:bTHDm")).toBe("page:bTHDm:bTHFT");
    expect(getExpandedWorkflow(state, "backend")).toBe("api:bTHJC:bTHJC");
    expect(getExpandedWorkflow(state, "page:missing")).toBeNull();
  });
});
