export type GraphNodeType = "page" | "reusable" | "workflow" | "backend" | "apiCall";
export type GraphEdgeType =
  | "page_contains_reusable"
  | "reusable_contains_reusable"
  | "workflow_triggers_workflow"
  | "workflow_schedules_backend"
  | "workflow_calls_api_connector"
  | "workflow_navigates_page";

export interface GraphNodeLike {
  id: string;
  type: GraphNodeType;
  label: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdgeLike {
  id: string;
  type: GraphEdgeType;
  from: string;
  to: string;
  sourceWorkflow?: string;
  sourceStep?: string;
  label: string;
}

export interface GraphExplorerNode extends GraphNodeLike {
  inDegree: number;
  outDegree: number;
}

export interface GraphExplorerEdge extends GraphEdgeLike {
  edgeHumanType: string;
  edgeLabel: string;
}

export interface GraphIndex {
  nodesById: Map<string, GraphExplorerNode>;
  edgesById: Map<string, GraphExplorerEdge>;
  outgoingByNode: Map<string, GraphExplorerEdge[]>;
  incomingByNode: Map<string, GraphExplorerEdge[]>;
  sortedNodes: GraphExplorerNode[];
}

export interface SvgNode {
  id: string;
  x: number;
  y: number;
  hop: number;
}

export interface SvgLayout {
  nodes: SvgNode[];
}

export interface ShortestPathResult {
  nodeIds: string[];
  edgeIds: string[];
}

export const ALL_GRAPH_EDGE_TYPES: GraphEdgeType[] = [
  "page_contains_reusable",
  "reusable_contains_reusable",
  "workflow_triggers_workflow",
  "workflow_schedules_backend",
  "workflow_calls_api_connector",
  "workflow_navigates_page",
];

export const EDGE_TYPE_LABELS: Record<GraphEdgeType, string> = {
  page_contains_reusable: "Page uses reusable",
  reusable_contains_reusable: "Reusable nests reusable",
  workflow_triggers_workflow: "Workflow triggers workflow",
  workflow_schedules_backend: "Workflow schedules backend",
  workflow_calls_api_connector: "Workflow calls API",
  workflow_navigates_page: "Workflow navigates to page",
};

export const NODE_TYPE_LABELS: Record<GraphNodeType, string> = {
  page: "Pages",
  reusable: "Reusables",
  workflow: "Workflows",
  backend: "Backend",
  apiCall: "API Calls",
};

export function buildGraphIndex(input: { nodes: GraphNodeLike[]; edges: GraphEdgeLike[] }): GraphIndex {
  const nodesById = new Map<string, GraphExplorerNode>();
  const edgesById = new Map<string, GraphExplorerEdge>();
  const outgoingByNode = new Map<string, GraphExplorerEdge[]>();
  const incomingByNode = new Map<string, GraphExplorerEdge[]>();

  for (const node of stableSortBy(input.nodes, (n) => `${n.type}:${n.label}:${n.id}`)) {
    nodesById.set(node.id, { ...node, inDegree: 0, outDegree: 0 });
  }

  for (const edge of stableSortBy(input.edges, (e) => `${e.type}:${e.from}:${e.to}:${e.id}`)) {
    if (!nodesById.has(edge.from) || !nodesById.has(edge.to)) continue;
    const next: GraphExplorerEdge = {
      ...edge,
      edgeHumanType: EDGE_TYPE_LABELS[edge.type],
      edgeLabel: edge.label,
    };
    edgesById.set(next.id, next);
    if (!outgoingByNode.has(next.from)) outgoingByNode.set(next.from, []);
    if (!incomingByNode.has(next.to)) incomingByNode.set(next.to, []);
    outgoingByNode.get(next.from)?.push(next);
    incomingByNode.get(next.to)?.push(next);
  }

  for (const node of nodesById.values()) {
    node.outDegree = outgoingByNode.get(node.id)?.length ?? 0;
    node.inDegree = incomingByNode.get(node.id)?.length ?? 0;
  }

  return {
    nodesById,
    edgesById,
    outgoingByNode,
    incomingByNode,
    sortedNodes: stableSortBy([...nodesById.values()], (n) => `${n.type}:${n.label}:${n.id}`),
  };
}

export function filterEdgesByTypes(edges: GraphExplorerEdge[], activeTypes: Set<GraphEdgeType>): GraphExplorerEdge[] {
  if (!activeTypes.size) return [...edges];
  return edges.filter((edge) => activeTypes.has(edge.type));
}

export function buildEgoSubgraph(
  index: GraphIndex,
  centerNodeId: string,
  hopDepth: 1 | 2,
  activeTypes: Set<GraphEdgeType>,
): { nodes: GraphExplorerNode[]; edges: GraphExplorerEdge[]; hopsByNodeId: Map<string, number> } {
  if (!index.nodesById.has(centerNodeId)) return { nodes: [], edges: [], hopsByNodeId: new Map() };

  const allEdges = filterEdgesByTypes([...index.edgesById.values()], activeTypes);
  const adjacency = new Map<string, Set<string>>();
  for (const edge of allEdges) {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, new Set());
    if (!adjacency.has(edge.to)) adjacency.set(edge.to, new Set());
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  }

  const hopsByNodeId = new Map<string, number>([[centerNodeId, 0]]);
  const queue: string[] = [centerNodeId];
  while (queue.length) {
    const current = queue.shift() as string;
    const currentHop = hopsByNodeId.get(current) ?? 0;
    if (currentHop >= hopDepth) continue;
    const neighbors = [...(adjacency.get(current) ?? [])].sort();
    for (const next of neighbors) {
      if (hopsByNodeId.has(next)) continue;
      hopsByNodeId.set(next, currentHop + 1);
      queue.push(next);
    }
  }

  const nodeIds = new Set(hopsByNodeId.keys());
  const nodes = stableSortBy(
    [...nodeIds].map((id) => index.nodesById.get(id)).filter(Boolean) as GraphExplorerNode[],
    (n) => `${n.type}:${n.label}:${n.id}`,
  );
  const edges = stableSortBy(
    allEdges.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
    (e) => `${e.type}:${e.from}:${e.to}:${e.id}`,
  );

  return { nodes, edges, hopsByNodeId };
}

export function layoutEgoGraph(
  nodes: GraphExplorerNode[],
  hopsByNodeId: Map<string, number>,
  centerNodeId: string,
): SvgLayout {
  const centerX = 420;
  const centerY = 260;
  const ringRadius = new Map<number, number>([
    [0, 0],
    [1, 170],
    [2, 300],
  ]);
  const grouped = new Map<number, GraphExplorerNode[]>();
  for (const node of nodes) {
    const hop = hopsByNodeId.get(node.id) ?? 2;
    if (!grouped.has(hop)) grouped.set(hop, []);
    grouped.get(hop)?.push(node);
  }

  const out: SvgNode[] = [];
  for (const [hop, group] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = stableSortBy(group, (n) => `${n.type}:${n.label}:${n.id}`);
    if (hop === 0) {
      out.push({ id: centerNodeId, x: centerX, y: centerY, hop: 0 });
      continue;
    }
    const r = ringRadius.get(hop) ?? 300;
    const step = (Math.PI * 2) / Math.max(1, sorted.length);
    sorted.forEach((node, idx) => {
      const angle = -Math.PI / 2 + (idx * step);
      out.push({
        id: node.id,
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
        hop,
      });
    });
  }

  return { nodes: out };
}

export function shortestDirectedPath(
  index: GraphIndex,
  fromNodeId: string,
  toNodeId: string,
  activeTypes: Set<GraphEdgeType>,
): ShortestPathResult | null {
  if (!index.nodesById.has(fromNodeId) || !index.nodesById.has(toNodeId)) return null;
  if (fromNodeId === toNodeId) return { nodeIds: [fromNodeId], edgeIds: [] };

  const allowed = new Set(filterEdgesByTypes([...index.edgesById.values()], activeTypes).map((e) => e.id));
  const queue: string[] = [fromNodeId];
  const prevNode = new Map<string, string | null>([[fromNodeId, null]]);
  const prevEdge = new Map<string, string>();

  while (queue.length) {
    const current = queue.shift() as string;
    const outgoing = stableSortBy(index.outgoingByNode.get(current) ?? [], (e) => `${e.to}:${e.id}`);
    for (const edge of outgoing) {
      if (!allowed.has(edge.id)) continue;
      if (prevNode.has(edge.to)) continue;
      prevNode.set(edge.to, current);
      prevEdge.set(edge.to, edge.id);
      if (edge.to === toNodeId) {
        const nodeIds: string[] = [];
        const edgeIds: string[] = [];
        let cursor: string | null = toNodeId;
        while (cursor) {
          nodeIds.push(cursor);
          const parent = prevNode.get(cursor) ?? null;
          if (parent) {
            const edgeId = prevEdge.get(cursor);
            if (edgeId) edgeIds.push(edgeId);
          }
          cursor = parent;
        }
        nodeIds.reverse();
        edgeIds.reverse();
        return { nodeIds, edgeIds };
      }
      queue.push(edge.to);
    }
  }

  return null;
}

export function parseGraphTypesParam(value: string | null): Set<GraphEdgeType> {
  if (!value) return new Set();
  const out = new Set<GraphEdgeType>();
  value.split(",").forEach((token) => {
    const t = token.trim() as GraphEdgeType;
    if (ALL_GRAPH_EDGE_TYPES.includes(t)) out.add(t);
  });
  return out;
}

export function serializeGraphTypesParam(types: Set<GraphEdgeType>): string | null {
  if (!types.size) return null;
  return ALL_GRAPH_EDGE_TYPES.filter((t) => types.has(t)).join(",");
}

function stableSortBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
}
