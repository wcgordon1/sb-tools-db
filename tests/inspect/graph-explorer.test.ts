import { describe, expect, it } from "vitest";
import {
  ALL_GRAPH_EDGE_TYPES,
  EDGE_TYPE_LABELS,
  buildEgoSubgraph,
  buildGraphIndex,
  filterEdgesByTypes,
  parseGraphTypesParam,
  serializeGraphTypesParam,
  shortestDirectedPath,
} from "@/lib/inspect/graph-explorer";

const fixtureGraph = {
  nodes: [
    { id: "page:home", type: "page" as const, label: "home" },
    { id: "reusable:header", type: "reusable" as const, label: "Header" },
    { id: "workflow:page:home:w1", type: "workflow" as const, label: "When page is loaded" },
    { id: "backend:b1", type: "backend" as const, label: "Process order" },
    { id: "api:c1.a1", type: "apiCall" as const, label: "Create charge" },
  ],
  edges: [
    { id: "e1", type: "page_contains_reusable" as const, from: "page:home", to: "reusable:header", label: "1 instances" },
    { id: "e2", type: "workflow_navigates_page" as const, from: "workflow:page:home:w1", to: "page:home", label: "navigate" },
    { id: "e3", type: "workflow_schedules_backend" as const, from: "workflow:page:home:w1", to: "backend:b1", label: "schedule" },
    { id: "e4", type: "workflow_calls_api_connector" as const, from: "workflow:page:home:w1", to: "api:c1.a1", label: "call" },
    { id: "e5", type: "workflow_triggers_workflow" as const, from: "workflow:page:home:w1", to: "workflow:page:home:w1", label: "trigger" },
  ],
};

describe("graph explorer helpers", () => {
  it("builds graph index with degrees and adjacency maps", () => {
    const index = buildGraphIndex(fixtureGraph);
    expect(index.nodesById.size).toBe(5);
    expect(index.edgesById.size).toBe(5);
    expect(index.nodesById.get("workflow:page:home:w1")?.outDegree).toBe(4);
    expect(index.nodesById.get("page:home")?.inDegree).toBe(1);
  });

  it("maps edge types to human labels", () => {
    expect(EDGE_TYPE_LABELS.workflow_calls_api_connector).toBe("Workflow calls API");
    expect(ALL_GRAPH_EDGE_TYPES.length).toBe(6);
  });

  it("filters edges by active type set", () => {
    const index = buildGraphIndex(fixtureGraph);
    const filtered = filterEdgesByTypes(
      [...index.edgesById.values()],
      new Set(["workflow_calls_api_connector"]),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe("workflow_calls_api_connector");
  });

  it("builds deterministic ego subgraph", () => {
    const index = buildGraphIndex(fixtureGraph);
    const ego = buildEgoSubgraph(index, "workflow:page:home:w1", 1, new Set());
    expect(ego.nodes.length).toBeGreaterThanOrEqual(4);
    expect(ego.hopsByNodeId.get("workflow:page:home:w1")).toBe(0);
  });

  it("finds directed shortest path and handles no-path", () => {
    const index = buildGraphIndex(fixtureGraph);
    const found = shortestDirectedPath(index, "workflow:page:home:w1", "api:c1.a1", new Set());
    expect(found?.edgeIds).toEqual(["e4"]);
    const none = shortestDirectedPath(index, "api:c1.a1", "workflow:page:home:w1", new Set());
    expect(none).toBeNull();
  });

  it("parses and serializes graph type query params", () => {
    const parsed = parseGraphTypesParam("workflow_calls_api_connector,bad_token,page_contains_reusable");
    expect(parsed.has("workflow_calls_api_connector")).toBe(true);
    expect(parsed.has("page_contains_reusable")).toBe(true);
    expect(parsed.size).toBe(2);
    expect(serializeGraphTypesParam(parsed)).toBe("page_contains_reusable,workflow_calls_api_connector");
    expect(serializeGraphTypesParam(new Set())).toBeNull();
  });
});
